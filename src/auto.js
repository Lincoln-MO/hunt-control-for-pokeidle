// Auto Hunt — fica sempre na melhor hunt (ou zera a Pokédex) e repõe bolas, poções e revives.
//
// As decisões por trás de cada regra estão em docs/skillz/decisions/2026-10-17-auto-hunt.md e,
// para o Modo Pokédex, em docs/skillz/decisions/2026-10-17-zerar-pokedex.md.
// Em resumo: a melhor hunt é o topo do ranking do /hunt, com as mesmas preferências do painel
// (D-01, D-08, D-10), e a troca acontece sempre que o topo muda (D-09). A compra segue
// "abaixo de X, compra até Y" por item, sem passar da reserva de ouro (D-06), e reage assim que
// o estoque cai (D-16). Os Termos do pokeidle.io (seção 5) permitem automação que siga as
// regras de quem joga na mão, por isso: nada de trocar com as travas do servidor fechadas, no
// centro ou no Safari (D-07), e um freio fixo no envio (D-14). Quando algo não dá certo, não há
// aviso: tenta de novo depois (D-04).
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  if (!PIH.on || !PIH.enviar) return;

  const CHAVE_CFG = 'hunt-control:auto:v1';
  const CHAVE_SEMANA = 'hunt-control:topcatch:v1:';
  const FUSO_TOP_CATCH = 'America/Sao_Paulo'; // Domingo, 00h de Brasília
  const AVALIAR_A_CADA_MS = 30_000;
  const INTERVALO_MIN_MS = 3000; // entre dois comandos quaisquer
  const MAX_POR_HORA = 60; // o Modo Pokédex troca de hunt, de pokémon e religa o arremesso a cada espécie
  const PORTA_HUNT_MS = 12_000; // o servidor recusa trocar nos 10 s seguintes à última entrada
  const FOLGA_TRAVA_MS = 500; // margem sobre a trava de combate, contra atraso de rede
  // Troca enviada e a hunt não mudou (o servidor recusou): tenta de novo depois de 5 s, 10 s,
  // 20 s, 40 s e, daí em diante, 60 s, para não gastar o freio quando ele insiste em recusar.
  const ESPERA_HUNT_MIN_MS = 5000;
  const ESPERA_HUNT_MAX_MS = 60_000;
  const ESPERA_COMPRA_MS = 15_000; // compra enviada e o estoque não subiu: tenta de novo depois disto
  const ESPERA_AJUSTE_MS = 10_000; // troca de pokémon ou de automação enviada: espera antes de repetir
  const CHECAR_A_CADA_MS = 1000; // o estado chega várias vezes por segundo; estoque e Pokédex são olhados no máx. 1×/s

  // Os sprites das bolas, os mesmos do cliente (`SPRITE_BOLA` no app.js do jogo). Caminho sem
  // barra inicial vive em /assets/.
  const SPRITE_BOLA = {
    1: 'site/assets/ui/ball-poke.png',
    2: 'site/assets/ui/ball-great.png',
    3: '/img/ball-super.png',
    4: 'site/assets/ui/ball-ultra.png',
    5: '/img/ball-beast.png',
  };
  const ICONE_GENERICO = 'site/assets/ui/menu-bolsa.png';
  const srcIcone = (rel) => (String(rel).startsWith('/') ? rel : `/assets/${rel}`);

  // modo: 'melhor' | 'pokedex'. pokedexAntes: o arremesso e o pokémon em campo de antes do Modo
  // Pokédex mexer neles, para devolver quando ele sair (D-09); fica salvo para sobreviver a um F5.
  const PADRAO = { huntLigada: false, estoqueLigado: false, modo: 'melhor', selecao: 'auto', huntFixa: null, reservaOuro: 80000000, regras: {}, pokedexAntes: null };
  const lerJson = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
  const salvo = lerJson(CHAVE_CFG, {});
  const cfg = { ...PADRAO, ...salvo, regras: { ...(salvo?.regras && typeof salvo.regras === 'object' ? salvo.regras : {}) } };
  cfg.huntLigada = cfg.huntLigada === true;
  cfg.estoqueLigado = cfg.estoqueLigado === true;
  if (!['melhor', 'pokedex', 'topcatch'].includes(cfg.modo)) cfg.modo = 'melhor';
  if (!['auto', 'manual'].includes(cfg.selecao)) cfg.selecao = 'auto';
  cfg.reservaOuro = Math.max(0, Number.isFinite(Number(cfg.reservaOuro)) ? Number(cfg.reservaOuro) : PADRAO.reservaOuro);
  const gravarCfg = () => { try { localStorage.setItem(CHAVE_CFG, JSON.stringify(cfg)); } catch { /* sem armazenamento */ } };

  const nf = new Intl.NumberFormat('pt-BR');
  const num = (v) => nf.format(Math.round(Number(v) || 0));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const regiao = (r) => (r ? r[0].toUpperCase() + r.slice(1) : '');
  const duracao = (ms) => {
    const min = Math.floor(ms / 60_000);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
  };

  // ---- o que o jogo diz ------------------------------------------------------------------
  let welcome = null;
  let eu = null;
  let loja = null; // o catálogo da loja, montado depois da primeira carga
  let huntAtual = null;
  let entrouEm = 0; // quando a hunt atual começou (relógio local)
  // As travas vêm no relógio do servidor. Cada estado que chega com um `servidorAgora` novo
  // acerta a diferença para o relógio daqui.
  let desvio = 0;
  let ultimoServidorAgora = null;
  const agoraServidor = () => Date.now() + desvio;
  let ultimaChecagem = 0;
  let huntDesejada = null; // a hunt para onde ir, se não for a atual
  let tentativasHunt = 0; // trocas enviadas para a hunt desejada sem a hunt mudar
  let alvoDasTentativas = null;
  let alarmeTrava = null; // dispara quando a trava de 3 s vence

  // O campo da hunt: quais selvagens estão vivos, pelos pacotes `campo.init` e `campo` (as
  // chaves curtas são as do jogo, como em geo.js: `s` slot, `x` morto, `fora` slots que saíram).
  // `viuSelvagem`: só depois de ver selvagem nesta hunt o campo vazio quer dizer "entre ondas";
  // no Modo Economia do jogo o servidor não manda selvagem nenhum, e o campo vazio não diz nada.
  const vivos = new Map(); // slot → vivo?
  let viuSelvagem = false;
  const naoSelvagem = (m) => m.bn || m.ti !== undefined || m.cura || m.tm || m.depot || m.tr;
  function aplicarCampo(m) {
    for (const x of m?.mobs ?? []) {
      if (naoSelvagem(x)) continue;
      viuSelvagem = true;
      if (x.x) vivos.set(x.s, false);
      else if (x.x === false || !vivos.has(x.s)) vivos.set(x.s, true);
    }
    for (const slot of m?.fora ?? []) vivos.delete(slot);
  }
  const campoSemVivo = () => viuSelvagem && ![...vivos.values()].some(Boolean);


  // ---- envio, com freio ------------------------------------------------------------------
  const enviados = []; // horários dos envios da última hora
  function enviar(msg) {
    const agora = Date.now();
    while (enviados.length && agora - enviados[0] > 3_600_000) enviados.shift();
    if (enviados.length >= MAX_POR_HORA) return false;
    if (enviados.length && agora - enviados.at(-1) < INTERVALO_MIN_MS) return false;
    if (!PIH.enviar(msg)) return false; // conexão fechada: tenta depois
    enviados.push(agora);
    return true;
  }

  const proxima = new Map(); // chave do comando → quando pode repetir
  /** Envia, e não repete o mesmo tipo de comando antes de `esperaMs`. */
  function enviarComEspera(chave, msg, esperaMs) {
    if ((proxima.get(chave) ?? 0) > Date.now()) return false;
    if (!enviar(msg)) return false;
    proxima.set(chave, Date.now() + esperaMs);
    return true;
  }

  // ---- a loja ----------------------------------------------------------------------------
  /** Tudo o que o Market vende, na ordem dele: bolas compráveis, poções e revives. */
  function catalogoDaLoja(jogo) {
    const bolas = (welcome?.catalogoBolas ?? [])
      .filter((b) => b.compravel && b.priceGold > 0)
      .sort((a, b) => a.priceGold - b.priceGold)
      .map((b) => ({
        chave: `ball:${b.id}`, kind: 'ball', id: b.id, nome: b.nome, preco: b.priceGold, grupo: 'Bolas',
        icone: srcIcone(SPRITE_BOLA[b.id] ?? SPRITE_BOLA[1]),
      }));
    // Os itens "nossos" do jogo (Golden Potion…) chegam pelo welcome e entram no mesmo mapa,
    // como no cliente oficial; o ícone deles vem junto, os outros saem do items-icons.json.
    const porId = new Map();
    for (const i of jogo?.itens ?? []) porId.set(i.id, i);
    for (const i of welcome?.itensNossos ?? []) porId.set(i.id, i);
    const itens = [...porId.values()]
      .filter((i) => (i.category === 'heal' || i.category === 'revive') && Number(i.npcPrice) > 0)
      .sort((a, b) => (a.category === b.category ? a.npcPrice - b.npcPrice : a.category === 'heal' ? -1 : 1))
      .map((i) => ({
        chave: `item:${i.id}`, kind: 'item', id: i.id, nome: i.name, preco: Number(i.npcPrice),
        grupo: i.category === 'heal' ? 'Poções' : 'Revives',
        icone: srcIcone(jogo?.icones?.[i.id] ?? i.icon ?? ICONE_GENERICO),
      }));
    return [...bolas, ...itens];
  }
  const tenho = (p) => Number((p.kind === 'ball' ? eu?.balls : eu?.items)?.[p.id]) || 0;

  /**
   * A primeira compra que as regras pedem agora, ou null. `pendente` é a compra já enviada e
   * ainda não entregue: o item dela fica de fora e o custo dela já sai do ouro livre, para a
   * reserva valer mesmo antes do estado novo chegar.
   */
  function decidirCompra(loja, pendente = null) {
    let ouroLivre = (Number(eu?.gold) || 0) - (Number(cfg.reservaOuro) || 0) - (pendente?.custo ?? 0);
    for (const p of loja) {
      const r = cfg.regras[p.chave];
      if (!(r?.min > 0)) continue;
      if (p.chave === pendente?.item.chave) continue;
      const tem = tenho(p);
      if (tem >= r.min) continue;
      const qty = Math.min(r.alvo - tem, Math.floor(ouroLivre / p.preco));
      if (qty < 1) continue; // sem ouro acima da reserva para este: tenta o próximo item
      return { item: p, tinha: tem, custo: qty * p.preco, msg: { t: 'shop.buy', kind: p.kind, id: p.id, qty } };
    }
    return null;
  }

  // ---- a compra, assim que o estoque cai (D-16) ------------------------------------------
  let aguardando = null; // { item, tinha, custo, ate }: a compra enviada, até o estoque dela subir

  async function comprarSePreciso() {
    if (!cfg.estoqueLigado || !welcome || !eu) return;
    loja ??= catalogoDaLoja(await PIH.carregarJogo());
    // O estoque subiu (a compra passou) ou a espera venceu (o servidor recusou): a fila anda.
    if (aguardando && (tenho(aguardando.item) > aguardando.tinha || Date.now() >= aguardando.ate)) aguardando = null;
    const compra = decidirCompra(loja, aguardando);
    if (compra && enviar(compra.msg)) {
      aguardando = { item: compra.item, tinha: compra.tinha, custo: compra.custo, ate: Date.now() + ESPERA_COMPRA_MS };
    }
  }

  // ---- Modo Pokédex ----------------------------------------------------------------------
  // Vai de hunt em hunt capturando o que falta na Pokédex (D-01 a D-09 do log do modo). Quem
  // arremessa é o "Lançar até Capturar" do jogo (VIP); a extensão escolhe a hunt, põe em campo o
  // melhor pokémon da equipe para ela e religa o arremesso, que para sozinho a cada captura.
  let dex = null; // shared/pokedex.mjs do jogo
  let jogoCaptura = null;
  let plano = null; // { total, pegas, fila: [{ slug, nome, nivel, regiao, pk, kph, faltam }], atual }
  let falhaPlano = null; // mostra o erro no painel, em vez de ficar montando a fila para sempre
  let ultimoRetratoDex = null; // assinatura das contagens da Pokédex
  let ultimasContagensDex = null; // comparação de contagens para confirmar novas capturas
  let capturaDoAutoArmada = false; // captura esperada na hunt da fila, com arremesso VIP ativo
  let ateCapturarAnterior = null;
  let confirmacaoCaptura = null; // desligou "Lançar até capturar", aguarda atualização da Pokédex
  let replanejamentoPendente = false;
  const GRACA_CAPTURA_MS = 9_000;
  const LIMITE_AJUSTE_AUTO_MS = 65_000; // nunca deixar o modo VIP em falso funcionamento sem retorno do servidor
  let ajusteAutoPendente = null; // confirmação de configuração oficial: { desejaAte, desejaSemParar, primeiroEnvio, tentativas }
  let situacaoAuto = ''; // estado mostrado no painel durante a transição de arremesso
  // A confirmação de chegada pode ser a última mensagem `estado` por algum tempo. Antes,
  // o rearme dependia de outro estado ou do próximo planejamento (até 30 segundos depois).
  // Este vigia apenas tenta confirmar/ativar o arremesso na hunt JÁ confirmada pelo jogo;
  // os freios de 3 s, 10 s e 60 comandos/h continuam sendo aplicados em enviar().
  let relogioArremesso = null;
  function pararVigiaArremesso() {
    if (relogioArremesso !== null) clearTimeout(relogioArremesso);
    relogioArremesso = null;
  }
  function vigiarArremesso(espera = 1500) {
    if (relogioArremesso !== null || !cfg.huntLigada || !modoCaptura()) return;
    relogioArremesso = setTimeout(() => {
      relogioArremesso = null;
      if (!cfg.huntLigada || !modoCaptura() || confirmacaoCaptura || replanejamentoPendente) return;
      // Nunca armar em uma hunt diferente do objetivo. Em trânsito, o estado de
      // arremesso só pode ser desligado; ligar ocorre após o `estado.huntSlug` correto.
      if (!plano?.atual || !eu?.automation) return;
      tentarPokedex();
    }, Math.max(250, espera));
  }
  function pedirReplanejamento() {
    if (replanejamentoPendente) return;
    replanejamentoPendente = true;
    setTimeout(() => {
      replanejamentoPendente = false;
      if (modoCaptura() && !confirmacaoCaptura) avaliar();
    }, 350);
  }
  function retratoDex() {
    if (!dex || eu?.pokedex == null) return null;
    // Usar as contagens oficiais, não só o conjunto de espécies já registradas:
    // o arremesso VIP também pode capturar outra cópia de uma espécie que já possuímos.
    const entradas = dex.normalizarEntradasPokedex?.(eu.pokedex) ?? eu.pokedex;
    return Object.entries(entradas).map(([k, v]) => [String(k), Number(v?.c) || 0])
      .filter(([, c]) => c > 0).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, c]) => `${k}:${c}`).join('|');
  }


  const ehVip = () => !!eu?.loja?.vip;
  const modoCaptura = () => ['pokedex', 'topcatch'].includes(cfg.modo) && ehVip();
  const modoTopCatch = () => cfg.modo === 'topcatch' && ehVip();

  // ---- Top Catch da semana ---------------------------------------------------------------
  // O jogo oferece a Pokédex cumulativa, não um histórico semanal de capturas feitas pela
  // extensão. Guardamos apenas capturas novas CONFIRMADAS durante o uso da automação VIP,
  // associadas à chave oficial da Pokédex (formas de Outland mantêm identidade própria).
  // A virada é domingo à meia-noite no fuso de Brasília, usando o horário do servidor quando
  // disponível. A fila reordena se o jogador trocar o Pokémon ativo; os concluídos não mudam.
  let semanaAtiva = null;
  let contaAtiva = null;
  let concluidosSemana = new Map();
  function chaveConta() {
    const id = eu?.playerId ?? eu?.userId ?? eu?.trainerId ?? eu?.conta?.id ?? eu?.usuario?.id ?? eu?.id
      ?? eu?.username ?? eu?.nick ?? eu?.nome ?? eu?.name
      ?? welcome?.playerId ?? welcome?.userId ?? welcome?.id ?? 'conta-local';
    return String(id).slice(0, 100);
  }
  function inicioDaSemana(t = agoraServidor()) {
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO_TOP_CATCH, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    }).formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    const diaDaSemana = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[partes.weekday] ?? 0;
    // A data do domingo, não um timestamp UTC: funciona até em mudanças de mês e ano.
    return new Date(Date.UTC(Number(partes.year), Number(partes.month) - 1, Number(partes.day) - diaDaSemana))
      .toISOString().slice(0, 10);
  }
  const chaveArmazenamentoSemana = (conta) => `${CHAVE_SEMANA}${encodeURIComponent(conta)}`;
  function sincronizarSemana() {
    if (!eu) return false;
    const conta = chaveConta();
    const semana = inicioDaSemana();
    if (semanaAtiva === semana && contaAtiva === conta) return false;
    semanaAtiva = semana;
    contaAtiva = conta;
    const salvo = lerJson(chaveArmazenamentoSemana(conta), null);
    concluidosSemana = new Map(salvo?.semana === semana && Array.isArray(salvo?.concluidos)
      ? salvo.concluidos.filter(([chave]) => typeof chave === 'string') : []);
    // A chave muda no domingo; registros da semana passada não bloqueiam capturas novas.
    capturaDoAutoArmada = false;
    return true;
  }
  function registrarTopCatch(chave, nome, slug) {
    if (!semanaAtiva || !contaAtiva || concluidosSemana.has(chave)) return false;
    concluidosSemana.set(chave, { nome: String(nome || chave), slug: String(slug || ''), em: agoraServidor() });
    try { localStorage.setItem(chaveArmazenamentoSemana(contaAtiva), JSON.stringify({
      semana: semanaAtiva, concluidos: [...concluidosSemana],
    })); } catch { /* sem armazenamento */ }
    return true;
  }
  function contagensDex() {
    if (!dex || eu?.pokedex == null) return null;
    const entradas = dex.normalizarEntradasPokedex?.(eu.pokedex) ?? eu.pokedex;
    return new Map(Object.entries(entradas).map(([k, v]) => [String(k), Number(v?.c) || 0]));
  }
  function registrarCapturaConfirmada(antes, depois, slug, armado) {
    if (!armado || !cfg.huntLigada || !modoCaptura() || !antes || !depois || !slug) return false;
    const alvo = plano?.atual;
    if (!alvo || alvo.slug !== slug) return false;
    sincronizarSemana();
    // Só conta espécies desta hunt, e apenas quando a contagem oficial aumentou.
    // Uma captura já feita antes de ativar a extensão não conta, mesmo que esteja na Pokédex.
    let novo = false;
    for (const e of huntPorSlug(slug)?.especies ?? []) {
      const chave = chaveDex(e.pokeId);
      if (chave == null || (depois.get(chave) ?? 0) <= (antes.get(chave) ?? 0)) continue;
      const nome = jogoCaptura?.especies?.get(e.pokeId)?.name ?? alvo.pendentes.find((p) => p.chave === chave)?.nome ?? alvo.nome;
      if (registrarTopCatch(chave, nome, slug)) novo = true;
    }
    return novo;
  }
  // Com o jogo parado na janela de fundo, o relógio semanal também é observado por timer.
  setInterval(() => {
    if (sincronizarSemana() && cfg.huntLigada && modoTopCatch()) {
      plano = null;
      pedirReplanejamento();
      atualizarProgresso();
    }
  }, 10_000);

  const huntPorSlug = (slug) => (welcome?.hunts ?? []).find((h) => h.slug === slug) ?? null;
  /** A chave da espécie na Pokédex, pelo módulo do jogo; null se ela não conta na Pokédex. */
  const chaveDex = (pokeId) => {
    const k = dex.chavePokedex(pokeId);
    return k == null ? null : String(k);
  };

  /** As chaves da Pokédex com pelo menos uma captura. */
  function capturadas() {
    const entradas = dex.normalizarEntradasPokedex?.(eu?.pokedex) ?? eu?.pokedex ?? {};
    const pegas = new Set();
    for (const [k, v] of Object.entries(entradas)) if (Number(v?.c) > 0) pegas.add(String(k));
    return pegas;
  }
  const faltando = (hunt, pegas) => (hunt?.especies ?? []).filter((e) => {
    const k = chaveDex(e.pokeId);
    return k != null && !pegas.has(k);
  });

  /**
   * A fila: hunts liberadas com espécie faltando que algum pokémon da equipe mata (D-03), cada
   * uma com o pokémon que mata mais rápido ali (D-04), das mais rápidas para as mais lentas (D-05).
   */
  async function planejarPokedex() {
    const jogo = await PIH.carregarJogo();
    dex ??= jogo.mod.pokedex;
    jogoCaptura = jogo;
    if (typeof dex?.chavePokedex !== 'function') throw new Error('Módulo da Pokédex indisponível. Recarregue a extensão e o jogo.');
    if (eu?.pokedex == null) throw new Error('O jogo ainda não enviou os dados da Pokédex. Abra a Pokédex no jogo e tente novamente.');
    sincronizarSemana();
    const pegas = modoTopCatch() ? new Set(concluidosSemana.keys()) : capturadas();
    const equipeToda = (eu?.pokemons ?? []).filter((p) => p.slot != null && p.stats);
    const emCampo = equipeToda.find((p) => p.id === eu?.activeId);
    const equipe = emCampo ? [emCampo] : [];
    if (!equipe.length) throw new Error('Pokémon ativo não identificado. Selecione um Pokémon em campo antes de iniciar a Pokédex.');
    const melhorPorHunt = new Map();
    // A prioridade de captura é: vantagem no ataque, depois dano neutro, por último
    // resistência. Dentro de cada classe, hunt de nível menor e menor risco primeiro.
    const classe = (l) => Number(l.efetividade) >= 1.5 ? 0 : Number(l.efetividade) >= 0.95 ? 1 : 2;
    const pontuar = (l) => [classe(l), Number(l.hitPct) || 0, -(Number(l.kph) || 0)];
    const melhor = (a,b) => { const x=pontuar(a), y=pontuar(b); for(let i=0;i<x.length;i++) if(x[i]!==y[i])return x[i]<y[i];return false; };
    for (const pk of equipe) {
      let r = null;
      try { r = await PIH.analisarPokemon?.(pk, { soLiberadas: true }); }
      catch (err) { console.warn('[hunt-control]', pk.nome, err); }
      for (const l of r?.linhas ?? []) {
        if (l.inviavel || l.umHit || !(l.kph > 0)) continue;
        const m = melhorPorHunt.get(l.slug);
        if (!m || melhor(l, m.linha)) melhorPorHunt.set(l.slug, { pk, kph: l.kph, linha: l });
      }
    }
    // O progresso conta todas as espécies das hunts liberadas, mesmo as que a equipe ainda não mata.
    const nivel = Number(eu?.level) || 0;
    const todas = new Set();
    for (const h of welcome?.hunts ?? []) {
      if ((h.nivel ?? 0) > nivel) continue;
      for (const e of h.especies ?? []) {
        const k = chaveDex(e.pokeId);
        if (k != null) todas.add(k);
      }
    }
    // A mesma espécie pode existir em duas ou mais hunts. Escolhemos apenas a
    // primeira opção viável, seguindo a prioridade de vantagem, nível e risco.
    // Assim, capturar um Pokémon o remove de TODA a fila, não apenas da hunt atual.
    const comparacao = (a, b) => (a.classe - b.classe) || (a.nivel - b.nivel)
      || (a.risco - b.risco) || (b.kph - a.kph);
    const candidatas = [...melhorPorHunt.values()].map(({ pk, kph, linha }) => ({
      slug: linha.slug, nome: linha.nome, nivel: linha.nivel, regiao: linha.regiao, pk, kph,
      classe: classe(linha), risco: Number(linha.hitPct) || 0,
      hunt: linha.hunt ?? huntPorSlug(linha.slug),
    })).sort(comparacao);
    const usadas = new Set(pegas); // Pokédex: já registrado; Top Catch: já pego nesta semana pela extensão
    const fila = [];
    for (const h of candidatas) {
      const pendentes = [];
      for (const e of faltando(h.hunt, pegas)) {
        const chave = chaveDex(e.pokeId);
        if (chave == null || usadas.has(chave)) continue;
        usadas.add(chave);
        pendentes.push({ chave, nome: String(jogo?.especies?.get(e.pokeId)?.name ?? h.nome) });
      }
      if (!pendentes.length) continue;
      const { hunt, ...dados } = h;
      fila.push({ ...dados, pendentes, faltam: pendentes.length });
    }
    const atual = fila[0] ?? null;
    const chavesPendentes = new Set(fila.flatMap((h) => h.pendentes.map((e) => e.chave)));
    return { tipo: cfg.modo, semana: semanaAtiva, total: todas.size,
      pegas: [...todas].filter((k) => pegas.has(k)).length,
      restantes: chavesPendentes.size, fila, atual, atualizadoEm: Date.now() };
  }

  function atualizarSituacaoAuto(texto) {
    if (situacaoAuto !== texto) {
      situacaoAuto = texto;
      atualizarProgresso();
    }
  }

  /**
   * O jogo torna “Lançar até Capturar” e “Lançar sem Parar” mutuamente exclusivos.
   * Basta ativar um deles: o próprio jogo desativa o outro, em uma única operação.
   * Confirmamos o estado final pelo pacote `estado`, não pelo WebSocket.send().
   */
  function garantirModoArremesso(ateCapturar, semParar, descricao) {
    if (!eu?.automation || !cfg.huntLigada || !modoCaptura()) return false;
    const auto = eu.automation;
    const atualAte = !!auto.autoBallAteCapturar;
    const atualSemParar = !!auto.autoBallSemParar;
    const conforme = atualAte === ateCapturar && atualSemParar === semParar;
    if (conforme) {
      ajusteAutoPendente = null;
      pararVigiaArremesso();
      atualizarSituacaoAuto(ateCapturar ? 'Lançar até Capturar confirmado pelo jogo.' :
        semParar ? 'Lançar sem Parar confirmado pelo jogo.' : 'Ambos os arremessos desativados pelo jogo.');
      return true;
    }
    if (!ajusteAutoPendente || ajusteAutoPendente.desejaAte !== ateCapturar || ajusteAutoPendente.desejaSemParar !== semParar) {
      ajusteAutoPendente = { desejaAte: ateCapturar, desejaSemParar: semParar, primeiroEnvio: 0, tentativas: 0 };
    }
    const pendente = ajusteAutoPendente;
    if (pendente.primeiroEnvio && Date.now() - pendente.primeiroEnvio >= LIMITE_AJUSTE_AUTO_MS) {
      cfg.huntLigada = false;
      huntDesejada = null;
      capturaDoAutoArmada = false;
      confirmacaoCaptura = null;
      falhaPlano = 'O jogo não confirmou a configuração de arremesso VIP. Automação pausada; confira os controles em Automações.';
      ajusteAutoPendente = null;
      pararVigiaArremesso();
      gravarCfg();
      const b = root.document?.querySelector('.pih-auto [data-auto="huntLigada"]');
      if (b) b.checked = false;
      atualizarSituacaoAuto('');
      atualizarProgresso();
      return false;
    }
    // Não precisamos desligar “Sem Parar” em uma chamada separada: o jogo já
    // faz isso quando recebe “Até Capturar” ativo. As flags expressam o estado
    // desejado e são confirmadas no próximo pacote de estado.
    if (!ateCapturar) capturaDoAutoArmada = false;
    atualizarSituacaoAuto(descricao + ' Aguardando confirmação do jogo…');
    if (enviarComEspera('arremesso', { t: 'auto.set', ...auto,
      autoBallAteCapturar: ateCapturar, autoBallSemParar: semParar }, ESPERA_AJUSTE_MS)) {
      if (!pendente.primeiroEnvio) pendente.primeiroEnvio = Date.now();
      pendente.tentativas++;
    }
    // Se o intervalo de segurança impedir o envio agora, não depender de outro
    // evento WebSocket para repetir. A tentativa continua limitada pelos freios.
    vigiarArremesso(1500);
    return false;
  }

  /** Na hunt da fila: ativa "Lançar até Capturar" (o jogo desativa "Sem Parar"). */
  function tentarPokedex() {
    if (!cfg.huntLigada || !modoCaptura()) { ajusteAutoPendente = null; atualizarSituacaoAuto(''); restaurarAntes(); return; }
    if (confirmacaoCaptura || falhaPlano || replanejamentoPendente) return;
    const alvo = plano?.atual;
    if (!alvo || !dex || !eu || !eu.automation) return;
    if (eu.noCentro || eu.safari?.dentro || eu.casa?.dentro || eu.boss?.arena) return;
    // Salvar a escolha anterior antes de qualquer mudança (inclusive desligar Sem Parar).
    if (!cfg.pokedexAntes) {
      cfg.pokedexAntes = {
        ateCapturar: !!eu.automation.autoBallAteCapturar,
        semParar: !!eu.automation.autoBallSemParar,
        // Não sobrescrever a escolha manual do Pokémon principal.
        activeId: null,
      };
      gravarCfg();
    }
    // Enquanto troca de hunt, não deixar Sem Parar capturando espécies que não são o alvo.
    // Só ligar Até Capturar quando a hunt e o Pokémon ativo já são os selecionados.
    if (huntAtual !== alvo.slug || eu.activeId !== alvo.pk.id) {
      garantirModoArremesso(false, false, 'Preparando hunt da fila: desativando arremesso contínuo.');
      if (huntAtual === alvo.slug && eu.activeId !== alvo.pk.id) {
        enviarComEspera('ativo', { t: 'team.active', pokemonId: alvo.pk.id }, ESPERA_AJUSTE_MS);
      }
      return;
    }
    // Não reiniciar a hunt se a Pokédex/Top Catch já apontar a captura desta espécie.
    const concluidos = modoTopCatch() ? new Set(concluidosSemana.keys()) : capturadas();
    if (!alvo.pendentes.some(({ chave }) => !concluidos.has(chave))) {
      plano.atual = null;
      pedirReplanejamento();
      return;
    }
    garantirModoArremesso(true, false, 'Ativando Lançar até Capturar (o jogo desativa Lançar sem Parar).');
  }

  /** Saiu do Modo Pokédex: devolve o arremesso e o pokémon em campo de antes, um comando por vez. */
  function restaurarAntes() {
    const a = cfg.pokedexAntes;
    if (!a || !eu?.automation) return;
    const auto = eu.automation;
    if (!!auto.autoBallAteCapturar !== a.ateCapturar || !!auto.autoBallSemParar !== a.semParar) {
      // Restaurar o modo original em um único comando; o jogo garante exclusividade.
      enviarComEspera('arremesso', { t: 'auto.set', ...auto,
        autoBallAteCapturar: a.ateCapturar, autoBallSemParar: a.semParar }, ESPERA_AJUSTE_MS);
      return;
    }
    if (a.activeId != null && eu.activeId !== a.activeId && eu.pokemons?.some((p) => p.id === a.activeId)) {
      enviarComEspera('ativo', { t: 'team.active', pokemonId: a.activeId }, ESPERA_AJUSTE_MS);
      return;
    }
    cfg.pokedexAntes = null;
    gravarCfg();
  }

  // ---- a hunt ----------------------------------------------------------------------------

  async function decidirHunt() {
    if (['pokedex', 'topcatch'].includes(cfg.modo) && !ehVip()) {
      cfg.huntLigada = false; cfg.modo = 'melhor'; cfg.selecao = 'auto';
      gravarCfg(); huntDesejada = null; plano = null; capturaDoAutoArmada = false; return;
    }
    if (confirmacaoCaptura) { huntDesejada = null; return; }
    if (modoCaptura()) {
      plano = await planejarPokedex();
      falhaPlano = null;
      ultimoRetratoDex = retratoDex();
      ultimasContagensDex ??= contagensDex();
      atualizarProgresso();
      if (plano.atual) {
        huntDesejada = plano.atual.slug !== huntAtual ? plano.atual.slug : null;
        return;
      }
      // A Pokédex terminou ou não encontrou alvos viáveis: não troca para outra hunt automaticamente.
      huntDesejada = null;
      restaurarAntes();
      return;
    } else {
      plano = null;
    }
    // Escolha manual persiste por slug; o ranking pode mudar sem deslocar o alvo.
    if (cfg.selecao === 'manual') {
      const escolhida = huntPorSlug(cfg.huntFixa);
      const liberada = escolhida && (Number(escolhida.nivel) || 0) <= (Number(eu?.level) || 0);
      huntDesejada = liberada && cfg.huntFixa !== huntAtual ? cfg.huntFixa : null;
      return;
    }
    const r = await PIH.analisarAtivo?.({ soLiberadas: true });
    // Prefere a primeira hunt viável, mesmo que a linha 1 seja arriscada ou impossível.
    const topo = r?.linhas?.find((l) => !l.inviavel && l.kph > 0);
    huntDesejada = topo && topo.slug !== huntAtual ? topo.slug : null;
  }

  /**
   * A saída da hunt está liberada agora? A mesma regra do jogo (`huntSaidaLivreAgora` no cliente
   * dele): livre na hora entre ondas (nenhum selvagem vivo) e logo depois do respawn, antes do
   * primeiro golpe da onda nova; fora disso, só 3 s depois do último dano trocado.
   */
  function saidaLivre() {
    if (campoSemVivo()) return true;
    if ((Number(eu.combateOndaSeq) || 0) < (Number(eu.ondaSeq) || 0)) return true;
    return agoraServidor() >= (Number(eu.centroLivreEm) || 0) + FOLGA_TRAVA_MS;
  }

  /** Manda a troca pendente se nada a impede agora. Roda a cada estado e a cada pacote de campo. */
  function tentarTrocarHunt() {
    if (!cfg.huntLigada || !huntDesejada || !eu || !huntAtual) return;
    if (huntDesejada === huntAtual) { huntDesejada = null; tentativasHunt = 0; return; }
    // Não trocar de hunt com arremesso VIP contínuo ou "até capturar" ainda ativo.
    // A sequência de desligamento deve ser confirmada antes do comando hunt.select.
    if (modoCaptura() && eu.automation &&
        (eu.automation.autoBallSemParar || eu.automation.autoBallAteCapturar)) {
      if (!cfg.pokedexAntes) {
        cfg.pokedexAntes = { ateCapturar: !!eu.automation.autoBallAteCapturar,
          semParar: !!eu.automation.autoBallSemParar, activeId: null };
        gravarCfg();
      }
      garantirModoArremesso(false, false, 'Pausando arremesso antes de trocar de hunt.');
      return;
    }
    if (eu.noCentro || eu.safari?.dentro || eu.casa?.dentro || eu.boss?.arena) return;
    if (Date.now() - entrouEm < PORTA_HUNT_MS) return;
    if (!saidaLivre()) {
      // Ninguém avisa quando os 3 s vencem (nessa hora não chega abate, ouro nem XP): um alarme avisa.
      const falta = (Number(eu.centroLivreEm) || 0) + FOLGA_TRAVA_MS - agoraServidor();
      if (falta > 0 && falta < 10_000 && !alarmeTrava) {
        alarmeTrava = setTimeout(() => { alarmeTrava = null; tentarTrocarHunt(); }, falta + 50);
      }
      return;
    }
    if (alvoDasTentativas !== huntDesejada) { alvoDasTentativas = huntDesejada; tentativasHunt = 0; }
    const espera = Math.min(ESPERA_HUNT_MAX_MS, ESPERA_HUNT_MIN_MS * 2 ** tentativasHunt);
    if (enviarComEspera(`hunt:${huntDesejada}`, { t: 'hunt.select', slug: huntDesejada }, espera)) tentativasHunt++;
  }

  // ---- o ciclo ---------------------------------------------------------------------------
  // A hunt é reavaliada a cada 30 s (rodar o ranking custa); a compra roda aqui também, como
  // rede de segurança para quando nenhum estado chegar.
  let avaliando = false;
  async function avaliar() {
    if (!welcome || !eu || avaliando) return;
    if (!cfg.huntLigada && !cfg.estoqueLigado) { restaurarAntes(); return; }
    avaliando = true;
    try {
      if (cfg.huntLigada) { await decidirHunt(); tentarTrocarHunt(); tentarPokedex(); }
      else { huntDesejada = null; plano = null; restaurarAntes(); }
      if (cfg.estoqueLigado) await comprarSePreciso();
    } catch (err) {
      console.error('[auto-hunt]', err);
      if (cfg.huntLigada && ['pokedex', 'topcatch'].includes(cfg.modo)) {
        falhaPlano = err?.message || 'Erro ao montar a fila da Pokédex';
        plano = null;
        huntDesejada = null; // nunca trocar para destino anterior em caso de erro de cálculo
        atualizarProgresso();
      }
    } finally {
      avaliando = false;
    }
  }
  setInterval(avaliar, AVALIAR_A_CADA_MS);

  // ---- o bloco no painel "Onde caçar?" (D-11) --------------------------------------------
  // Feito com as classes do próprio jogo (`.painel`, `.painel-cab`, `.btn-painel-toggle`,
  // `.auto-linha`, `.auto-chip`, `.auto-dica`, `.selo-vip`) para ser igual ao painel de
  // Automações e mudar junto quando o jogo mudar o visual. O interruptor é o
  // `input[type=checkbox]` global dele.
  let configAberta = false;

  const CHEVRON = '<svg class="ico-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>';

  function linhaItem(p) {
    const r = cfg.regras[p.chave] ?? { min: 0, alvo: 0 };
    const tem = tenho(p);
    const ativo = r.min > 0;
    return `<div class="pih-auto-item${ativo ? '' : ' pih-auto-off'}">
      <span class="auto-chip${ativo ? ' on' : ''}${tem ? '' : ' vazio'}" title="${esc(p.nome)} · ${num(p.preco)} de ouro">
        <img src="${esc(p.icone)}" alt="" width="18" height="18" loading="lazy"><span class="q">${num(tem)}</span>
      </span>
      <span class="pih-auto-nome">${esc(p.nome)}<small>${num(p.preco)} de ouro</small></span>
      <label class="pih-auto-campo"><span>abaixo de</span><input type="number" min="0" inputmode="numeric" data-regra="${p.chave}" data-campo="min" value="${r.min}"></label>
      <label class="pih-auto-campo"><span>compra até</span><input type="number" min="0" inputmode="numeric" data-regra="${p.chave}" data-campo="alvo" value="${r.alvo}"></label>
    </div>`;
  }

  function listaLoja(itens) {
    const grupos = [];
    for (const p of itens) {
      if (grupos.at(-1)?.nome !== p.grupo) grupos.push({ nome: p.grupo, itens: [] });
      grupos.at(-1).itens.push(p);
    }
    return grupos.map((g) => `<div class="pih-auto-grupo">
      <div class="auto-rotulo">${esc(g.nome)}</div>
      ${g.itens.map(linhaItem).join('')}
    </div>`).join('');
  }

  /** O progresso do Modo Pokédex (D-08). */
  function htmlProgresso() {
    if (!ehVip()) return '<p class="auto-dica">Os modos Pokédex e Top Catch usam o "Lançar até Capturar" do jogo, disponível com VIP.</p>';
    const aviso = falhaPlano ? `<p class="auto-dica pih-auto-erro" role="alert">${esc(falhaPlano)}</p>` : '';
    if (confirmacaoCaptura) return `${aviso}<p class="auto-dica">O jogo desligou “Lançar até capturar”. Conferindo a captura no registro oficial…</p>`;
    if (falhaPlano && !plano) return aviso;
    if (!plano) return `<p class="auto-dica">${cfg.huntLigada ? `Montando a fila do ${cfg.modo === 'topcatch' ? 'Top Catch semanal' : 'Pokédex'}…` : 'Ative Gerenciar hunt para montar a fila.'}</p>`;
    const pct = plano.total ? Math.round((plano.pegas / plano.total) * 100) : 0;
    // O painel exibe até três ESPÉCIES, mesmo quando uma hunt contém várias espécies.
    const proximosObjetivos = plano.fila.flatMap((h) => h.pendentes.map((e) => ({ ...e, hunt: h }))).slice(0, 3);
    const objetivo = proximosObjetivos[0];
    const a = objetivo?.hunt;
    const tempo = a && huntAtual === a.slug ? ` · há ${duracao(Date.now() - entrouEm)}` : '';
    const proxs = proximosObjetivos.slice(1);
    const top = cfg.modo === 'topcatch';
    return `<div class="pih-auto-dex-topo"><b>${top ? 'Top Catch da Semana' : 'Pokédex'}: ${num(plano.pegas)} de ${num(plano.total)}</b> <span class="pih-dim">${top ? `semana iniciada em ${esc(plano.semana)} (Brasília)` : 'nas hunts liberadas'}</span></div>
      <div class="pih-auto-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i><span>${pct}%</span></div>
      ${a
        ? `<div>Agora: <b>${esc(objetivo.nome)}</b> <span class="pih-dim">— ${esc(a.nome)} · ${esc(regiao(a.regiao))} · Nv ${num(a.nivel)}</span>${tempo}</div>`
        : '<div>Nenhuma espécie pendente nas hunts viáveis para este Pokémon.</div>'}
      ${proxs.length ? `<div class="pih-dim">Próximas 2: ${proxs.map((e) => `${esc(e.nome)} (${esc(e.hunt.nome)})`).join(' · ')}</div>` : ''}
      <div class="pih-dim">${num(plano.restantes)} espécie(s) pendente(s) nas hunts viáveis. ${top ? 'Contam apenas capturas confirmadas durante o uso da automação nesta semana; o histórico antigo não é excluído.' : 'Já capturadas na Pokédex ficam fora da fila.'}</div>
      ${cfg.huntLigada && situacaoAuto && a ? `<div class="pih-dim">Arremesso VIP: ${esc(situacaoAuto)}</div>` : ''}
      ${aviso}`;
  }

  /** Redesenha só o progresso, se o painel estiver aberto. */
  function atualizarProgresso() {
    const el = root.document?.querySelector('.pih-auto [data-auto="statusDex"]');
    if (el) el.innerHTML = htmlProgresso();
  }

  function sincronizarVipPainel() {
    const bloco = root.document?.querySelector('.pih-auto');
    if (!bloco) return;
    const vip = ehVip();
    for (const modo of ['pokedex', 'topcatch']) {
      const botao = bloco.querySelector(`[data-modo="${modo}"]`);
      if (!botao) continue;
      botao.disabled = !vip;
      botao.title = vip ? 'Usa o Lançar até Capturar do VIP' : 'Requer VIP ativo no jogo';
      botao.setAttribute('aria-disabled', String(!vip));
    }
    const aviso = bloco.querySelector('[data-auto="vip-aviso"]');
    if (aviso) aviso.hidden = vip;
    if (!vip && !['pokedex', 'topcatch'].includes(cfg.modo)) {
      bloco.querySelectorAll('[data-modo]').forEach((b) => b.classList.toggle('on', b.dataset.modo === cfg.selecao));
      const chk = bloco.querySelector('[data-auto="huntLigada"]');
      if (chk) chk.checked = cfg.huntLigada;
      const pd = bloco.querySelector('[data-auto="pokedex"]');
      if (pd) pd.hidden = true;
      const rotulo = bloco.querySelector('[data-auto="rotulo"]');
      if (rotulo) rotulo.textContent = (cfg.huntLigada || cfg.estoqueLigado) ? 'em uso' : 'desligadas';
    }
  }

  function blocoModo() {
    const vip = ehVip();
    const cfgManual = cfg.modo === 'melhor' && cfg.selecao === 'manual';
    const inPokedex = cfg.modo === 'pokedex';
    const inTopCatch = cfg.modo === 'topcatch';
    return `<div class="pih-auto-modo pih-auto-modos">
      <span class="auto-rotulo">Modo da hunt</span>
      <span class="pih-seg">
        <button type="button" data-modo="auto" class="${!inPokedex && !inTopCatch && !cfgManual ? 'on' : ''}">Melhor XP</button>
        <button type="button" data-modo="manual" class="${cfgManual ? 'on' : ''}">Fixa na lista</button>
        <button type="button" data-modo="pokedex" class="${inPokedex ? 'on' : ''}"${vip ? '' : ' disabled aria-disabled="true" title="Requer VIP ativo: Lançar até Capturar"'}>Pokédex · VIP</button>
        <button type="button" data-modo="topcatch" class="${inTopCatch ? 'on' : ''}"${vip ? '' : ' disabled aria-disabled="true" title="Requer VIP ativo: Lançar até Capturar"'}>Top Catch · VIP</button>
      </span>
      </div>
      <p class="pih-vip-aviso" data-auto="vip-aviso"${vip ? ' hidden' : ''}>Os modos Pokédex e Top Catch exigem VIP ativo e a função oficial “Lançar até Capturar”.</p>
      <div class="pih-auto-destino" data-auto="destino">${cfgManual ? (cfg.huntFixa ? `Hunt escolhida: <b>${esc(huntPorSlug(cfg.huntFixa)?.nome ?? cfg.huntFixa)}</b>` : 'Clique em uma hunt da lista para fixar o destino.') : 'Clique em uma hunt da lista para marcá-la; a troca só será aplicada no modo Fixa na lista.'}</div>
      <div class="pih-auto-pokedex" data-auto="pokedex"${inPokedex || inTopCatch ? '' : ' hidden'}>
        <div data-auto="statusDex">${htmlProgresso()}</div>
      </div>`;
  }

  /** O HTML do bloco Auto Hunt. `jogo` (o catálogo carregado) pode faltar no começo. */
  function blocoPainel(jogo) {
    const itens = jogo ? catalogoDaLoja(jogo) : [];
    const algum = cfg.estoqueLigado || cfg.huntLigada;
    return `<div class="painel pih-auto${configAberta ? '' : ' recolhida'}">
      <div class="painel-cab">
        <h3>Controle de automações <span class="cnt" data-auto="rotulo">${algum ? 'em uso' : 'desligadas'}</span></h3>
        <button type="button" class="btn-painel-toggle" data-auto="configurar" aria-expanded="${configAberta}" title="Configurar estoque">${CHEVRON}</button>
      </div>
      <label class="auto-linha"><input type="checkbox" data-auto="huntLigada" ${cfg.huntLigada ? 'checked' : ''}> Gerenciar hunt automaticamente</label>
      <label class="auto-linha"><input type="checkbox" data-auto="estoqueLigado" ${cfg.estoqueLigado ? 'checked' : ''}> Repor bolas, poções e revives automaticamente</label>
      ${blocoModo()}
      <div class="pih-auto-config" ${configAberta ? '' : 'hidden'}>
        <p class="auto-dica">Estoque independente da troca de hunt. Abaixo de X, compre até Y. Defina 0 para ignorar o item.</p>
        <label class="pih-auto-reserva"><span>Guardar sempre</span>
          <input type="number" min="0" step="100" inputmode="numeric" data-auto="reserva" value="${cfg.reservaOuro}"><span>de ouro</span></label>
        ${itens.length ? listaLoja(itens) : '<p class="auto-dica">Carregando a loja do jogo…</p>'}
      </div>
    </div>`;
  }

  /** Liga os controles do bloco depois que o painel foi desenhado. */
  function ligarPainel(painel) {
    const bloco = painel.querySelector('.pih-auto');
    if (!bloco) return;
    // Sem `onerror` no HTML: a CSP do jogo bloqueia manipulador inline.
    for (const img of bloco.querySelectorAll('.auto-chip img')) {
      img.addEventListener('error', () => { img.src = srcIcone(ICONE_GENERICO); }, { once: true });
    }
    const atualizarRotulo = () => {
      const r = bloco.querySelector('[data-auto="rotulo"]');
      if (r) r.textContent = (cfg.huntLigada || cfg.estoqueLigado) ? 'em uso' : 'desligadas';
    };
    for (const nome of ['huntLigada', 'estoqueLigado']) {
      const liga = bloco.querySelector(`[data-auto="${nome}"]`);
      liga?.addEventListener('change', () => {
        cfg[nome] = liga.checked;
        if (nome === 'huntLigada' && !liga.checked) { huntDesejada = null; confirmacaoCaptura = null; falhaPlano = null; capturaDoAutoArmada = false; ajusteAutoPendente = null; situacaoAuto = ''; pararVigiaArremesso(); }
        gravarCfg(); atualizarRotulo(); atualizarProgresso();
        setTimeout(avaliar, 300);
      });
    }
    for (const b of bloco.querySelectorAll('[data-modo]')) {
      b.addEventListener('click', () => {
        if (b.disabled || (['pokedex', 'topcatch'].includes(b.dataset.modo) && !ehVip())) return;
        const selecionado = b.dataset.modo;
        if (selecionado === 'pokedex' || selecionado === 'topcatch') cfg.modo = selecionado;
        else { cfg.modo = 'melhor'; cfg.selecao = selecionado; }
        gravarCfg(); plano = null; falhaPlano = null; huntDesejada = null; confirmacaoCaptura = null;
        capturaDoAutoArmada = false; ateCapturarAnterior = null; ajusteAutoPendente = null; situacaoAuto = '';
        pararVigiaArremesso();
        ultimasContagensDex = contagensDex(); ultimoRetratoDex = retratoDex();
        for (const outro of bloco.querySelectorAll('[data-modo]')) outro.classList.toggle('on', outro === b);
        const pd = bloco.querySelector('[data-auto="pokedex"]');
        if (pd) pd.hidden = !['pokedex', 'topcatch'].includes(cfg.modo);
        atualizarDestino(bloco); atualizarProgresso();
        setTimeout(avaliar, 300);
      });
    }
    const botao = bloco.querySelector('[data-auto="configurar"]');
    botao?.addEventListener('click', () => {
      configAberta = !configAberta;
      bloco.classList.toggle('recolhida', !configAberta);
      bloco.querySelector('.pih-auto-config').hidden = !configAberta;
      botao.setAttribute('aria-expanded', String(configAberta));
      botao.title = configAberta ? 'Recolher' : 'Configurar compras';
    });
    const reserva = bloco.querySelector('[data-auto="reserva"]');
    reserva?.addEventListener('change', () => {
      cfg.reservaOuro = Math.max(0, Math.round(Number(reserva.value) || 0));
      reserva.value = cfg.reservaOuro;
      gravarCfg();
    });
    for (const el of bloco.querySelectorAll('[data-regra]')) {
      el.addEventListener('change', () => {
        const r = (cfg.regras[el.dataset.regra] ??= { min: 0, alvo: 0 });
        r[el.dataset.campo] = Math.max(0, Math.round(Number(el.value) || 0));
        el.value = r[el.dataset.campo];
        if (r.alvo < r.min) {
          r.alvo = r.min;
          const alvo = bloco.querySelector(`[data-regra="${el.dataset.regra}"][data-campo="alvo"]`);
          if (alvo) alvo.value = r.alvo;
        }
        gravarCfg();
        // O chip acende quando o item passa a ser reposto, como na escolha das Automações.
        const linha = el.closest('.pih-auto-item');
        linha?.classList.toggle('pih-auto-off', !(r.min > 0));
        linha?.querySelector('.auto-chip')?.classList.toggle('on', r.min > 0);
        if (r.min > 0 && cfg.estoqueLigado) comprarSePreciso().catch((err) => console.error('[auto-hunt]', err));
      });
    }
  }

  function atualizarDestino(painel) {
    const el = painel?.querySelector('[data-auto="destino"]');
    if (!el) return;
    const h = huntPorSlug(cfg.huntFixa);
    el.innerHTML = cfg.modo === 'melhor' && cfg.selecao === 'manual'
      ? (cfg.huntFixa ? `Hunt fixa: <b>${esc(h?.nome ?? cfg.huntFixa)}</b> · a troca respeita as travas do jogo.` : 'Escolha uma hunt clicando na tabela abaixo.')
      : (cfg.huntFixa ? `Marcada: <b>${esc(h?.nome ?? cfg.huntFixa)}</b> · ativa apenas no modo Fixa na lista.` : 'Clique em uma hunt da lista para marcá-la.');
  }
  function selecionarHunt(slug) {
    if (!huntPorSlug(slug)) return false;
    cfg.huntFixa = slug;
    gravarCfg();
    if (cfg.huntLigada && cfg.modo === 'melhor' && cfg.selecao === 'manual') {
      huntDesejada = null; setTimeout(avaliar, 200);
    }
    return true;
  }

  // Registrar eventos só após a inicialização completa: on() reenvia o estado retido.
  PIH.on('welcome', (m) => { welcome = m; loja = null; });
  PIH.on('campo.init', (m) => {
    vivos.clear();
    viuSelvagem = false;
    aplicarCampo(m);
    tentarTrocarHunt();
  });
  PIH.on('campo', (m) => {
    aplicarCampo(m);
    tentarTrocarHunt(); // chega várias vezes por segundo: é ele que pega a janela entre ondas
  });
  PIH.on('estado', (e) => {
    const anterior = eu;
    eu = e;
    // O modo de captura depende do VIP oficial. Nenhum deles desbloqueia um recurso pago.
    if (['pokedex', 'topcatch'].includes(cfg.modo) && !ehVip()) {
      cfg.huntLigada = false;
      cfg.modo = 'melhor';
      cfg.selecao = 'auto';
      cfg.pokedexAntes = null;
      ajusteAutoPendente = null; situacaoAuto = '';
      pararVigiaArremesso();
      huntDesejada = null;
      plano = null;
      falhaPlano = null;
      confirmacaoCaptura = null;
      capturaDoAutoArmada = false;
      gravarCfg();
    }
    sincronizarVipPainel();
    if (e?.servidorAgora && e.servidorAgora !== ultimoServidorAgora) {
      ultimoServidorAgora = e.servidorAgora;
      desvio = e.servidorAgora - Date.now();
    }
    const novaSemanaOuConta = sincronizarSemana();
    const mudouHunt = (e?.huntSlug ?? null) !== huntAtual;
    if (mudouHunt) {
      huntAtual = e?.huntSlug ?? null;
      entrouEm = Date.now();
      tentativasHunt = 0;
      capturaDoAutoArmada = false;
      // Na chegada à próxima hunt, repetir a verificação mesmo que o servidor
      // não envie outro `estado` depois da troca. Isso resolve o rearme omitido.
      if (cfg.huntLigada && modoCaptura()) vigiarArremesso(500);
    }
    // Mudança do principal: recalcular a ordem (efetividade/risco) sem limpar capturas semanais.
    const mudouPrincipal = anterior?.activeId != null && e?.activeId !== anterior.activeId;
    if (novaSemanaOuConta || mudouPrincipal) {
      if (novaSemanaOuConta) {
        ultimasContagensDex = contagensDex(); // não confundir novo login com captura
        ultimoRetratoDex = retratoDex();
      }
      if (modoTopCatch() && cfg.huntLigada) {
        // Não usar plano do Pokémon anterior para tentar trocá-lo de volta.
        plano = null; huntDesejada = null;
        confirmacaoCaptura = null;
        capturaDoAutoArmada = false;
        pedirReplanejamento();
      }
    }
    if (dex && modoCaptura()) {
      const atualDex = retratoDex();
      const contagensAtuais = contagensDex();
      const agoraLigado = typeof eu?.automation?.autoBallAteCapturar === 'boolean'
        ? eu.automation.autoBallAteCapturar : null;
      const mudouDex = ultimoRetratoDex != null && atualDex != null && atualDex !== ultimoRetratoDex;
      if (mudouDex) {
        // O gatilho de sucesso é o aumento de contagem do servidor, não só o fim dos arremessos.
        // A verificação de hunt, sessão ativa e espécie evita marcar capturas antigas.
        const armado = capturaDoAutoArmada && plano?.atual?.slug === huntAtual;
        registrarCapturaConfirmada(ultimasContagensDex, contagensAtuais, huntAtual, armado);
        confirmacaoCaptura = null;
        falhaPlano = null;
        pedirReplanejamento();
      }
      ultimoRetratoDex = atualDex;
      ultimasContagensDex = contagensAtuais;
      if (cfg.huntLigada && capturaDoAutoArmada && ateCapturarAnterior === true && agoraLigado === false && !mudouDex) {
        const alvo = plano?.atual;
        if (alvo && huntAtual === alvo.slug) {
          confirmacaoCaptura = {
            desde: Date.now(), assinatura: atualDex, slug: huntAtual,
            antes: contagensAtuais, armado: capturaDoAutoArmada,
          };
          huntDesejada = null;
          atualizarProgresso();
          setTimeout(() => {
            if (!confirmacaoCaptura || confirmacaoCaptura.slug !== huntAtual) return;
            const novoDex = retratoDex();
            if (novoDex != null && novoDex !== confirmacaoCaptura.assinatura) {
              registrarCapturaConfirmada(confirmacaoCaptura.antes, contagensDex(), confirmacaoCaptura.slug, confirmacaoCaptura.armado);
              ultimoRetratoDex = novoDex;
              ultimasContagensDex = contagensDex();
              confirmacaoCaptura = null;
              falhaPlano = null;
              capturaDoAutoArmada = false;
              pedirReplanejamento();
            } else {
              confirmacaoCaptura = null;
              cfg.huntLigada = false; // pode ser parada manual, não presumir captura
              capturaDoAutoArmada = false;
              huntDesejada = null;
              falhaPlano = 'O jogo parou “Lançar até capturar”, mas não confirmou captura nova. Caça pausada para evitar avançar incorretamente.';
              gravarCfg(); atualizarProgresso();
              const b = root.document?.querySelector('.pih-auto [data-auto="huntLigada"]');
              if (b) b.checked = false;
            }
          }, GRACA_CAPTURA_MS);
        }
      }
      if (agoraLigado === true && eu?.automation?.autoBallSemParar === false && cfg.huntLigada && plano?.atual?.slug === huntAtual) {
        capturaDoAutoArmada = true;
      } else if (agoraLigado === false && !confirmacaoCaptura) {
        capturaDoAutoArmada = false;
      }
      ateCapturarAnterior = agoraLigado;
      if (ajusteAutoPendente && eu?.automation) {
        const p = ajusteAutoPendente;
        if (!!eu.automation.autoBallAteCapturar === p.desejaAte && !!eu.automation.autoBallSemParar === p.desejaSemParar) {
          ajusteAutoPendente = null;
          atualizarSituacaoAuto(p.desejaAte ? 'Lançar até Capturar confirmado pelo jogo.' : 'Lançar sem Parar desligado pelo jogo.');
        }
      }
    } else {
      ateCapturarAnterior = null;
      capturaDoAutoArmada = false;
      ultimasContagensDex = contagensDex();
      ultimoRetratoDex = retratoDex();
    }
    tentarTrocarHunt();
    if (Date.now() - ultimaChecagem >= CHECAR_A_CADA_MS) {
      ultimaChecagem = Date.now();
      tentarPokedex();
      comprarSePreciso().catch((err) => console.error('[auto-hunt]', err));
    } else if (mudouHunt && cfg.huntLigada && modoCaptura() && !replanejamentoPendente) {
      // A mudança de hunt é crítica para o rearme: não pode ficar presa ao
      // throttling de 1 s que usamos para economizar verificações de estoque.
      tentarPokedex();
    }
  });


  PIH.auto = {
    blocoPainel, ligarPainel, atualizarDestino, selecionarHunt, avaliar, cfg,
    _interno: { catalogoDaLoja, decidirCompra, tentarTrocarHunt, comprarSePreciso, planejarPokedex, tentarPokedex,
      inicioDaSemana, sincronizarSemana, concluidosSemana: () => [...concluidosSemana],
      plano: () => plano, falha: () => falhaPlano },
  };
})(globalThis);
