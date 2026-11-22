# Histórico de alterações — Hunt Control

Este histórico resume a evolução das versões fornecidas. A versão do código incluído permanece **0.1.9**. A revisão posterior do README, das referências e da declaração de direitos autorais foi **somente documental**, sem mudanças na execução da extensão. Nem todas as etapas foram verificadas em uma conta real do PokeIdle.

## [0.1.9] — Rearme do arremesso VIP

- Adicionada nova verificação após chegada à próxima hunt para reativar **Lançar até Capturar**.
- Tentativa reagendada quando o intervalo de segurança entre comandos impede a ativação imediata.
- Confirmação de destino antes de reativar o arremesso; cancelamento das tentativas quando VIP ou automação ficam desativados.

## [0.1.8] — Apresentação do autor

- Removida a expressão de crédito técnico adjacente ao nome do desenvolvedor no cabeçalho, mantendo **Lincoln Martins** como publicador visível.
- Créditos técnicos permanecem na documentação.

## [0.1.7] — Configuração VIP

- Ajustada a ativação de **Lançar até Capturar** para respeitar a exclusividade com **Lançar sem Parar**.
- Mantidas verificações de retorno do servidor e confirmação adicional de captura.

## [0.1.6] — Top Catch da Semana

- Introduzido o modo **Top Catch · VIP**, independente da captura permanente da Pokédex.
- Registro local semanal por espécie e conta quando identificador está disponível.
- Reinício da lista no domingo às 00:00, em horário de Brasília.
- Priorização da fila conforme o Pokémon ativo; variantes da Pokédex tratadas por suas chaves próprias.
- Interface compacta com objetivo atual e duas próximas espécies.

## [0.1.5] — Fila da Pokédex

- Fila compacta, remoção de espécies já registradas e deduplicação de espécies entre hunts.
- Atualização mediante novos registros de captura confirmados pelo jogo.

## [0.1.4] — Leitura da Pokédex

- Corrigido o acesso ao módulo da Pokédex para a montagem da rota.
- Adicionadas mensagens de erro de planejamento e proteções relacionadas ao VIP.

## [0.1.3] — Autoria e apoio

- Exibição de **Lincoln Martins** como autor.
- Atualizada chave Pix de apoio e conteúdo do QR Code.

## [0.1.2] — Catálogo, janela e apoio

- Ampliação do catálogo de consumíveis e revives lidos dos dados do jogo.
- Janela maior, redimensionável, tabela de hunts com rolagem própria.
- Modal de Pix com botão de fechar; validação da condição VIP.

## [0.1.1] — Identidade visual

- Atualizados os ícones de pixel art fornecidos para o projeto.

## [0.1.0] — Primeira integração

- Reunião de análise de hunts, seleção manual, automação de caça e reposição de estoque em uma extensão.
