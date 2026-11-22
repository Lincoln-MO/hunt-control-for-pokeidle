# Hunt Control for PokeIdle

**Extensão de navegador para análise e gerenciamento de hunts no [PokeIdle.io](https://pokeidle.io/).**  
Versão do código neste repositório: **0.1.9** · Manifest V3 · Desenvolvedor: **Lincoln Martins**.

> **Estado:** versão em validação. O funcionamento no jogo depende da interface, dos eventos e das regras atuais do servidor.
>
> **Aviso sobre redistribuição:** este projeto incorpora/adapta componentes relacionados a `/hunt for PokeIdle`, de Liang, e `Auto Hunt for PokeIdle`, de Zennex. **A autorização ou licença de redistribuição desses componentes ainda precisa ser verificada.** Não considere a presença do código neste pacote uma concessão de licença de terceiros. Veja [Créditos e licenciamento](docs/CREDITOS_E_LICENCIAMENTO.md) antes de torná-lo público.

![Captura real do ranking de hunts](screenshots/reais/02_ranking_melhor_xp.png)

## Funcionalidades

- **Análise de hunts:** compara locais de caça por XP/h, ouro/h, abates por hora, tempo estimado e risco, conforme os dados disponíveis no jogo.
- **Melhor XP:** recomenda caçadas segundo os cálculos do painel.
- **Fixa na lista:** permite marcar uma hunt e mantê-la como destino da automação, respeitando as travas do jogo.
- **Reposição de itens:** configura estoque mínimo, quantidade de reposição e reserva de ouro para Poké Balls, poções e revives, independentemente da troca de hunt.
- **Pokédex · VIP:** cria uma rota para espécies ainda não registradas na Pokédex, priorizando capturas mais viáveis para o Pokémon em campo.
- **Top Catch · VIP:** acompanha localmente capturas distintas realizadas pela automação na semana; reorganiza a fila ao trocar de Pokémon e reinicia a semana de referência no domingo às 00:00, horário de Brasília.
- **Apoio voluntário:** botão de apoio com Pix, opcional e separado das funções de caça.

### Modos de captura e limites

Os modos **Pokédex** e **Top Catch** exigem VIP ativo no jogo e utilizam a opção oficial **Lançar até Capturar**. Uma alteração de estado isolada não é tratada como prova suficiente de captura: a extensão também compara os registros de captura retornados pelo jogo.

O **Top Catch** não lê retroativamente o placar semanal oficial nem sincroniza a lista entre navegadores. O registro de capturas da extensão é local; capturas manuais ou realizadas antes da ativação podem não constar nesse acompanhamento. O reinício semanal local pode divergir da virada oficial do servidor caso o fuso horário seja diferente.

## Capturas de tela

| Tela | Captura real |
|---|---|
| Botão no Pokémon em campo | [Abrir](screenshots/reais/01_entrada_no_jogo.png) |
| Ranking e modo Melhor XP | [Abrir](screenshots/reais/02_ranking_melhor_xp.png) |
| Configuração de estoque | [Abrir](screenshots/reais/03_reposicao_de_estoque.png) |
| Hunt fixa | [Abrir](screenshots/reais/04_hunt_fixa.png) |
| Top Catch da Semana | [Abrir](screenshots/reais/05_top_catch_semanal.png) |

As pastas [`screenshots/loja`](screenshots/loja) e [`screenshots/promocionais`](screenshots/promocionais) contêm **artes de apresentação adaptadas** a partir de capturas, que podem apresentar diferenças de escala, composição ou pequenos detalhes em relação ao jogo. Use as **capturas reais** como referência técnica do produto.

## Instalação manual (Chrome)

1. Baixe ou clone o repositório em uma pasta no computador.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta que contém `manifest.json`.
4. Abra `https://pokeidle.io/`, recarregue o jogo e clique em **Auto Hunt** no painel do Pokémon ativo.
5. Configure e ative **somente** as automações desejadas. Elas iniciam desativadas.

**Evite executar simultaneamente** outras extensões que controlem as mesmas funções do jogo, pois podem enviar comandos conflitantes.

## Estrutura

```text
hunt-control-for-pokeidle/
├── src/                  # Scripts e estilos da extensão
├── icons/                # Ícones nos tamanhos usados pelo navegador
├── screenshots/
│   ├── reais/            # Capturas originais do PokeIdle
│   ├── loja/             # Imagens de apresentação para Chrome Web Store
│   └── promocionais/     # Banners em dimensões exigidas pela loja
├── docs/
│   ├── index.md          # Política de Privacidade; página inicial do GitHub Pages
│   ├── CREDITOS_E_LICENCIAMENTO.md
│   ├── PUBLICACAO_E_PRIVACIDADE.md
│   └── NOTAS_DE_DESENVOLVIMENTO.md
├── manifest.json
├── README.md
├── CHANGELOG.md
└── .gitignore
```

## Privacidade

O Hunt Control acessa informações do jogo para calcular hunts e executar automações. Configurações e progresso semanal são armazenados em `localStorage` da origem `pokeidle.io`. Não foi identificada telemetria ou infraestrutura própria do desenvolvedor para receber dados dos jogadores na versão 0.1.9. Veja a **[Política de Privacidade](docs/index.md)**.

A política pode ser publicada pelo GitHub Pages usando **Settings → Pages → Deploy from a branch → main /docs**. Depois de habilitada, a página deve ficar disponível em `https://lincoln-mo.github.io/hunt-control-for-pokeidle/` (confirme o endereço exibido pelo GitHub antes de informar na Chrome Web Store).

## Histórico e documentação

- [CHANGELOG.md](CHANGELOG.md): alterações organizadas por versão.
- [Notas detalhadas de desenvolvimento](docs/NOTAS_DE_DESENVOLVIMENTO.md): documento original do pacote 0.1.9.
- [Créditos e licenciamento](docs/CREDITOS_E_LICENCIAMENTO.md): componentes reutilizados e condições pendentes de verificação.
- [Publicação e privacidade](docs/PUBLICACAO_E_PRIVACIDADE.md): checklist para GitHub Pages e Chrome Web Store.

## Autoria e vínculo com o jogo

**Hunt Control** é desenvolvido e mantido por **Lincoln Martins**. Projeto independente, **não oficial**, sem vínculo com a equipe do PokeIdle.io. A autoria das melhorias do Hunt Control não elimina direitos de terceiros sobre eventuais componentes incorporados.
