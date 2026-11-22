# Hunt Control for PokeIdle · versão 0.1.7 (teste local)

Adaptação pessoal por **Lincoln Martins**, a partir de arquivos fornecidos pelo usuário de **/hunt for PokeIdle 1.0.23** (Liang) e **Auto Hunt for PokeIdle 1.1.1** (Zennex). Preserve o reconhecimento dos autores originais. **O direito de republicar o código depende da licença e/ou autorização dos autores**; esta entrega não atesta permissão para publicar o fork no GitHub.

## Como instalar

1. Extraia o ZIP em uma **nova pasta**, sem sobrescrever suas extensões antigas.
2. Para evitar dois observadores/automatizadores concorrendo pelo mesmo WebSocket, **desative /hunt e Auto Hunt originais** durante o teste.
3. No IdleDeck, carregue a pasta local e clique em **Recarregar da pasta**. No Chrome, use `chrome://extensions` > Modo do desenvolvedor > Carregar sem compactação.
4. Recarregue a página do jogo e abra o botão **Auto Hunt** acima do Pokémon ativo.
5. **As automações começam DESLIGADAS**. Ligue somente a que deseja.

## Correções da 0.1.7 — Configuração de arremesso VIP

- Nos modos **Pokédex VIP** e **Top Catch VIP**, ativa **Lançar até Capturar** em um comando. O próprio jogo desativa **Lançar sem Parar** automaticamente. Antes de mudar de hunt, pausa os arremessos e aguarda a confirmação do servidor, para não capturar na hunt errada.
- Os comandos usam o protocolo oficial `auto.set`, aguardam o retorno do estado do jogo e são reenviados com intervalo e limite de segurança se não forem aplicados. Depois de 65 segundos de tentativas sem retorno confirmado, a automação pausa com aviso.
- Uma vez capturada a espécie, a extensão espera o aumento das contagens oficiais da Pokédex, replaneja e só então rearma a função VIP na próxima hunt. Um desligamento sem registro oficial **não** é considerado captura.
- Arremesso contínuo anterior é restaurado quando o usuário desativa o modo de captura (desde que o jogo aceite a alteração).
- **Testes locais não substituem validação ao vivo.** A configuração dos botões depende da aceitação de comandos pelo servidor atual.

## Mudanças na versão 0.1.6 — Top Catch da Semana

- **Dois modos de captura independentes**:
  - **Pokédex · VIP**: ignora espécies já capturadas uma vez em qualquer data, usando a Pokédex oficial do jogo.
  - **Top Catch · VIP**: permite capturar novamente espécies já registradas na Pokédex, mas só uma vez por semana na lista do Hunt Control. Não modifica a Pokédex permanente nem concede recompensas do servidor.
- **Virada da semana**: domingo às **00:00, horário de Brasília (America/Sao_Paulo)**; utiliza a diferença de relógio fornecida pelo servidor quando há `servidorAgora`. Se a virada oficial do jogo usar outro fuso horário, este horário da extensão precisa ser ajustado.
- **Registro local**: salva a lista das espécies capturadas durante o uso da automação VIP no armazenamento da extensão/página, separada por conta (quando o servidor disponibiliza identificador). Registros da semana anterior deixam de bloquear a nova semana. Capturas feitas antes da instalação desta versão **não podem ser reconstruídas retroativamente**.
- **Confirmação**: a espécie só entra nos concluídos quando a contagem oficial da Pokédex aumenta enquanto o modo de captura e o arremesso VIP estão ativos na hunt correspondente. O desligamento de “Lançar até Capturar” é um gatilho para aguardar confirmação, não prova suficiente de sucesso.
- **Identidade da espécie**: utiliza `chavePokedex` do jogo, que diferencia entradas de Outland como Rhydon e Brute Rhydon. Espécies com a mesma chave em várias hunts entram em apenas uma hunt por vez.
- **Ordem da fila**: a rota é calculada para o **Pokémon ativo** (vantagem de tipo, nível da hunt, risco e abates/h). Trocar de Pokémon principal refaz a prioridade sem apagar a lista de concluídos da semana e sem tentar forçar o Pokémon anterior de volta ao campo.
- **Painel compacto**: mostra apenas o Pokémon atual e até duas espécies seguintes. Sem tabela extra de concluídos ou botão expansível.
- **VIP e proteções**: as duas automações de captura exigem VIP ativo e usam comandos oficiais do jogo, respeitando o intervalo e as travas do servidor. Compras automáticas continuam independentes.

**Limitações:** A lista semanal é um acompanhamento **local** do Hunt Control, não consulta o placar oficial semanal do PokeIdle, não sincroniza automaticamente entre navegadores ou dispositivos e não detecta capturas manuais realizadas com o modo de captura desligado. Em hunts com várias espécies, a função VIP pode pegar repetidamente uma espécie já concluída até capturar outra diferente.

**Situação:** testes locais de contagens, persistência, reset semanal, troca de Pokémon ativo, variantes de Outland, bloqueio de VIP e regressão da Pokédex. **Necessário validar em uma conta real antes de publicar.**

## Mudanças na versão 0.1.5

- **Fila compacta da Pokédex**: exibe somente o objetivo atual e **duas próximas hunts**, sem lista completa ou botão de expansão.
- **Contagem ligada à Pokédex oficial**: espécies registradas com captura no estado da conta são excluídas; a fila é refeita logo após uma atualização de captura confirmada pelo jogo.
- **Sem caça repetida**: se uma mesma espécie aparece em várias hunts viáveis, a fila atribui aquela espécie a uma única hunt na rota. Uma captura confirmada a exclui de todas as opções.
- Se a função oficial **Lançar até Capturar** parar sem uma nova captura confirmada, o gerenciador da Pokédex pausa em vez de avançar sem certeza.
- Mantidos os requisitos de VIP, os freios de envio e a reposição de estoque independente.
- Testes simulados: exclusão de capturas anteriores, deduplicação entre hunts, atualização após captura, pausa sem confirmação e restrição de VIP.
- **Sobre a semana**: o jogo fornece à extensão um registro da Pokédex da conta. A exclusão usa as capturas oficiais registradas, inclusive as feitas na semana, mas não afirma ler um histórico semanal separado se o jogo não o expuser.

## Mudanças na versão 0.1.4

- Corrigido o **modo Pokédex VIP** que ficava indefinidamente em **"Montando a fila da Pokédex..."**: o módulo `pokedex` já constava do bundle oficial embutido, mas sua função `chavePokedex` não estava exposta à automação.
- O painel agora apresenta uma **mensagem de erro legível** se a montagem da fila falhar, em vez de ficar carregando sem explicação; nenhuma troca é enviada com plano inválido.
- O modo Pokédex espera a Pokédex e os dados das automações oficiais estarem disponíveis antes de fazer ações dependentes deles.
- Testes locais em WebSocket simulado: geração da fila, exclusão de espécies já capturadas, prioridade de vantagem de tipo, ativação de `autoBallAteCapturar`, bloqueio sem VIP e paralisação quando o VIP expira.
- **Teste dentro de conta real do jogo pendente.** Não considerar a publicação pronta apenas pelos testes simulados.

## Mudanças na versão 0.1.3

- Autor exibido no manifesto e no painel alterado para **Lincoln Martins**.
- Chave Pix antiga substituída por chave aleatória em `src/pix.js`. Atualizados Pix Copia e Cola (BR Code), checksum CRC-16 e o QR usado no painel e em Prey.
- Antes de publicar, **verifique o destinatário e o QR no aplicativo do seu banco**; esta verificação não foi feita em uma instituição financeira.

## Mudanças na versão 0.1.2

- O catálogo da loja agora carrega `assets/items.json` e `assets/items-icons.json` diretamente do jogo, recuperando todas as poções e os revives vendidos pelo NPC (não apenas a Golden Potion enviada no `welcome`).
- Painel Auto Hunt aumentado e redimensionável; a tabela de hunts possui área de rolagem própria com altura para aproximadamente 10 linhas.
- Modal Pix em cartão centralizado com botão **×**, fechamento ao clicar fora e tecla **Esc**.
- Pokédex exige VIP realmente ativo: botão bloqueado sem VIP; ao perder VIP, interrompe a gestão da hunt em modo Pokédex e desmarca o modo sem emitir novos comandos; a reposição de estoque pode continuar independente.
- Conservados os cálculos da `/hunt` e os ícones enviados anteriormente.

## Mudanças na versão 0.1.1

- Substituídos os ícones provisórios pelos arquivos de pixel art enviados pelo usuário, sem alterar as automações da 0.1.0.
- Mantido o botão **Auto Hunt** no jogo.

## O que mudou

- Botão no jogo: **Auto Hunt**. Novos ícones em pixel art enviados pelo usuário, nos tamanhos 16, 32, 48 e 128 (com originais adicionais em 64, 256 e 512).

- Conserva o motor de cálculos e o ranking da `/hunt` 1.0.23: XP/h, Ouro/h, risco, modos e geografia.
- Clique em uma linha da tabela para selecionar a hunt (dourado); seleção salva por `slug`.
- **Gerenciar hunt** separado de **Repor estoque**.
- Gestão de hunt com 4 modos: melhor XP, fixa na lista, completar Pokédex (requer VIP) e Top Catch semanal (requer VIP).
- Para completar Pokédex: prioriza alvos faltantes que tomem dano super-efetivo de um Pokémon da equipe, depois neutros, depois resistentes; primeiro níveis baixos, menor risco e abates/h maiores. Só envia as ações oficiais com as travas de troca e limites de mensagens da implementação original.
- Botões Shiny Wishlist e ✨ SHINY ✨ promocional ocultos; cálculo do modo Shiny do ranking preservado.
- Apoio com QR Pix e cópia da chave/BR Code atualizados, sem Livepix do autor antigo.

## Limites e riscos

- **NÃO TESTADO EM CONTA REAL**: análise de sintaxe, testes simulados e visualização local da interface. A API/estado do PokéIdle pode mudar; monitore e desative automações se houver comportamento incorreto.
- A escolha de modo Pokédex depende da função oficial VIP "Lançar até Capturar"; esta extensão **não libera VIP**.
- Nenhum envio cria conexão externa; somente comandos permitidos, usando WebSocket já aberto e sujeito às restrições do servidor.
- Não garante mais XP ou compras. O jogo pode aplicar travas, limites, cooldowns, reinícios e alterar a mecânica.
- **PRIVACIDADE**: a chave Pix de doações agora é uma chave aleatória. Ela ficará visível no pacote publicado, pois os usuários precisam dela para doar. Confira o QR e o destinatário com um aplicativo bancário antes da publicação.
- O código base inclui módulos incorporados e derivados das duas extensões; audite autoria, dependências e licenças antes de publicação.

## Organização

`src/auto.js`: estoque + hunt + Pokédex. `src/adapter.js`: ponte para o motor atualizado. `src/hook.js`: escuta e envio oficial. `src/ui.js` e `.css`: interface. `src/pix.js`: chave Pix aleatória e BR Code atualizados. Outros arquivos preservam cálculos e recursos da /hunt original.

## Correção 0.1.9 — rearmar "Lançar até Capturar" após mudança de hunt

- A chegada confirmada à próxima hunt agora ativa uma verificação imediata do modo VIP, sem esperar pela checagem periódica de estoque ou por outro pacote de estado.
- Quando o intervalo de segurança de comandos impede a ativação, um temporizador local de 1,5 s verifica novamente, mantendo as pausas e os limites de envio.
- A automação só ativa **Lançar até Capturar** depois de confirmar pelo estado que o Pokémon está na hunt da fila; jamais ativa "Lançar sem Parar" durante o Top Catch e a Pokédex.
- Quando o gerenciamento é desligado ou o VIP expira, o temporizador de ativação é cancelado.
- A confirmação da captura continua exigindo mudança na contagem oficial da Pokédex; desligamento isolado do VIP não marca objetivo concluído.
