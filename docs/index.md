# Política de Privacidade — Hunt Control for PokeIdle

**Última atualização:** 22 de novembro de 2026  
**Responsável:** Lincoln Martins

## 1. Finalidade

O Hunt Control for PokeIdle é uma extensão independente que auxilia jogadores do PokeIdle.io a analisar e gerenciar caçadas (*hunts*), selecionar destinos, configurar reposição de itens e organizar capturas nos modos Pokédex e Top Catch.

## 2. Informações utilizadas

Para realizar essas funções, a extensão acessa informações que o jogo disponibiliza à página aberta em `https://pokeidle.io/`, como:

- atributos e identificação do Pokémon ativo, hunts disponíveis e estimativas de combate;
- inventário, ouro disponível, Pokédex e estado da automação do jogo;
- identificador ou nome da conta no jogo, quando fornecido, para separar registros locais do Top Catch;
- preferências de interface, automação, estoques, seleção de hunts e progresso semanal registrado pelo próprio Hunt Control.

A extensão não solicita senhas, credenciais bancárias, documentos de identidade nem acesso ao histórico de navegação de outros sites.

## 3. Armazenamento e compartilhamento

As preferências e os registros de progresso da extensão são armazenados localmente no navegador, usando `localStorage` associado à origem `pokeidle.io`. Esse armazenamento é pertencente à página do jogo e pode ser acessado por scripts dessa mesma origem.

Na versão **0.1.9**, o Hunt Control não possui um servidor próprio para receber dados dos usuários, não implementa serviço de publicidade e não envia telemetria ou dados de análise para o desenvolvedor. Para funcionar, consulta recursos disponibilizados pelo próprio PokeIdle.io e, quando o usuário ativa uma automação, envia ações à conexão já estabelecida entre o navegador e o servidor do jogo. O tratamento realizado pelo servidor do PokeIdle é regido pelas regras do próprio jogo.

## 4. Funcionamento das automações

As automações são opcionais e iniciam desligadas. Quando ativadas pelo jogador, podem solicitar, por meio da conexão oficial do jogo, seleção de hunts, compras de itens e configuração de lançamentos automáticos. Recursos de captura dependentes de VIP só são utilizados quando a conta dispõe dessa funcionalidade.

## 5. Apoio voluntário por Pix

A extensão pode exibir uma chave Pix e um QR Code de apoio voluntário ao desenvolvimento. A exibição e a cópia desses dados ocorrem no navegador; o Hunt Control não processa pagamentos nem recebe informações bancárias do doador. Caso o usuário decida realizar uma transferência, o processamento ocorre fora da extensão, no aplicativo ou serviço financeiro escolhido pelo usuário.

## 6. Retenção e exclusão

Os dados locais permanecem no armazenamento da origem `pokeidle.io` até que o usuário os remova por meio das ferramentas de limpeza de dados do site no navegador. A remoção da extensão, isoladamente, pode não apagar os registros mantidos no `localStorage` do domínio do jogo. Os registros de captura da semana anterior deixam de ser considerados pela fila do Top Catch após o início de uma nova semana, embora registros anteriores possam continuar no armazenamento até serem apagados.

## 7. Alterações

Esta política poderá ser atualizada para refletir mudanças nas funcionalidades ou no tratamento de dados. Qualquer alteração relevante deverá ser divulgada na página oficial da extensão.

## 8. Contato

Para dúvidas relacionadas à extensão ou a esta política, utilize o contato do desenvolvedor informado na página do Hunt Control na Chrome Web Store.

## 9. Política de uso limitado

O uso de informações recebidas das APIs do Google, caso aplicável a alguma funcionalidade, seguirá a Política de Dados do Usuário da Chrome Web Store, incluindo os requisitos de **Limited Use**. A versão 0.1.9 não solicita acesso a contas nem a dados de APIs do Google.

---

*Hunt Control é um projeto independente e não é uma extensão oficial do PokeIdle.io.*
