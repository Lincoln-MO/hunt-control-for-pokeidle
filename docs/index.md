---
title: "Política de Privacidade — Hunt Control for PokeIdle"
---

# Política de Privacidade — Hunt Control for PokeIdle

**Última atualização:** 22 de novembro de 2026  
**Versão da extensão analisada:** 0.1.9  
**Responsável:** Lincoln Martins

## 1. Sobre a extensão e sua finalidade

O **Hunt Control for PokeIdle** é uma extensão independente para o site [PokeIdle.io](https://pokeidle.io/). Seu objetivo é ajudar o jogador a analisar e gerenciar caçadas (*hunts*), comparar desempenho, selecionar destinos, configurar reposição de itens e organizar objetivos de captura nos modos Pokédex e Top Catch.

A extensão funciona na página do PokeIdle.io. Ela não é oficial e não possui vínculo com a equipe responsável pelo jogo.

## 2. Dados acessados e utilizados

Para disponibilizar suas funcionalidades, o Hunt Control processa informações expostas pelo próprio jogo à sessão aberta no navegador, incluindo:

- **Dados e conteúdo do jogo:** Pokémon ativo e seus atributos, hunts e espécies disponíveis, bônus, inventário, ouro, registros e contagens da Pokédex, estado das caçadas e automações e informações necessárias aos cálculos de XP/h, ouro/h, abates/h e risco.
- **Identificação da conta do jogo:** identificador de jogador, usuário ou apelido, quando disponível, utilizado para separar os registros locais do Top Catch entre contas. Se o jogo não fornecer identificação, a extensão pode utilizar uma identificação local genérica.
- **Atividade relacionada às funcionalidades:** seleção de hunt, preferências, regras de reposição, comandos de automação ativados pelo jogador e espécies cuja captura foi confirmada durante o uso do Top Catch.

A extensão observa determinadas mensagens de estado e eventos que o jogo recebe pela conexão WebSocket já aberta no navegador. Essas informações são usadas na própria página para atualizar os indicadores e as automações.

O Hunt Control **não solicita** ao jogador senhas, dados de cartão, informações bancárias, documentos de identidade, dados de saúde ou acesso ao histórico de navegação em outros sites.

## 3. Finalidade do uso

Os dados acima são usados exclusivamente para:

1. Exibir estimativas de desempenho e recomendações de hunts.
2. Permitir seleção manual ou automática de destinos e reposição de consumíveis, quando habilitadas.
3. Organizar objetivos de captura no modo Pokédex e acompanhar capturas no modo Top Catch semanal.
4. Guardar as preferências e o acompanhamento local necessários para o funcionamento dessas ferramentas.

O Hunt Control não utiliza essas informações para publicidade comportamental, venda de dados, avaliação de crédito ou finalidades sem relação com o gerenciamento de caçadas.

## 4. Armazenamento, compartilhamento e comunicação com o jogo

As preferências e os registros de progresso semanal são mantidos no **`localStorage` da origem `pokeidle.io`**, no navegador utilizado. Esse armazenamento é associado ao próprio site do jogo; scripts executados nessa mesma origem podem ter acesso aos dados armazenados ali.

Na versão 0.1.9, a extensão **não dispõe de servidor próprio para receber dados dos jogadores** e não inclui ferramenta de telemetria, análise de uso ou publicidade para envio dessas informações ao desenvolvedor.

A extensão consulta arquivos e recursos hospedados pelo próprio PokeIdle.io para realizar cálculos e exibir informações. Quando o jogador ativa uma automação, a extensão solicita ações pela **conexão WebSocket existente com o servidor do jogo**, como mudança de hunt, compra de itens e configuração de arremessos. Essas ações são recebidas e processadas pelo servidor do PokeIdle.io conforme suas próprias regras. O Hunt Control não cria uma conexão paralela para contornar as validações do servidor.

Nenhuma integração com serviços próprios de análise ou publicidade foi identificada no código da versão documentada. O tratamento dos dados pelo servidor do PokeIdle.io segue as condições e políticas do operador do jogo, que são independentes desta extensão.

## 5. Controles e recursos VIP

As automações ficam **desligadas por padrão** e podem ser habilitadas ou desabilitadas pelo jogador. Preferências de uso podem ser mantidas no armazenamento local para sessões futuras.

Os modos Pokédex e Top Catch dependem dos recursos VIP oferecidos pelo próprio jogo, incluindo **Lançar até Capturar**. O Hunt Control não fornece ou contorna o acesso VIP: utiliza esses recursos apenas quando a conta os tem disponíveis.

## 6. Apoio voluntário por Pix

O Hunt Control pode mostrar uma chave Pix e um QR Code estático para apoio voluntário ao desenvolvimento. O QR Code é exibido com informações presentes no próprio código da extensão e a cópia é realizada localmente. A extensão **não processa pagamentos nem recebe dados bancários do doador**. Se o usuário optar por transferir algum valor, a operação ocorre fora do Hunt Control, no aplicativo ou serviço financeiro escolhido por ele.

## 7. Retenção, reinício semanal e exclusão

- As preferências e os registros são mantidos no armazenamento local da origem `pokeidle.io` até serem removidos pelo usuário, pelo navegador ou pelo próprio código em uma atualização futura.
- O **Top Catch** considera apenas as capturas confirmadas e registradas pela extensão na semana vigente. No domingo, à meia-noite no horário de Brasília, as capturas da semana anterior deixam de bloquear novos objetivos; isso **não garante a exclusão física imediata** dos dados antigos do `localStorage`.
- A simples desinstalação da extensão **pode não remover** os registros mantidos no armazenamento do site.
- Para excluir os registros locais, o usuário pode apagar os dados armazenados para `pokeidle.io` nas configurações do navegador. Essa ação também pode apagar preferências e dados do próprio jogo armazenados no navegador.
- O registro semanal não é sincronizado entre navegadores ou dispositivos pela extensão.

## 8. Segurança e limites de acesso

O código é configurado para operar na origem **`https://pokeidle.io/*`**. Não solicita permissão geral para acessar sites diferentes nem utiliza a API de histórico de navegação do Chrome.

Como o Hunt Control funciona dentro da página do jogo, os recursos e dados dessa página dependem também da segurança e da disponibilidade do PokeIdle.io.

## 9. Uso limitado de dados

O Hunt Control utiliza informações de usuários apenas na medida necessária à finalidade descrita nesta política. Não vende dados pessoais nem utiliza ou transfere essas informações para publicidade direcionada, avaliação de crédito ou outras finalidades não relacionadas à extensão.

A versão 0.1.9 não solicita acesso a dados de APIs de contas Google. Se alguma integração desse tipo for incorporada futuramente, a documentação será revista para refletir os requisitos aplicáveis da **Chrome Web Store User Data Policy**, inclusive os de *Limited Use*.

## 10. Alterações desta política

A política poderá ser atualizada quando houver mudanças relevantes no comportamento da extensão, em suas integrações ou no tratamento de dados. A versão publicada deverá corresponder às declarações feitas na Chrome Web Store.

## 11. Contato

Para dúvidas, solicitações ou questões relacionadas à privacidade, entre em contato pelos canais de suporte ou contato do desenvolvedor informados na **página oficial do Hunt Control na Chrome Web Store**. Caso o repositório público do projeto tenha a seção **Issues** habilitada, ela também poderá ser usada para enviar dúvidas sem informações sensíveis.

---

**Hunt Control for PokeIdle — projeto independente de Lincoln Martins.**
