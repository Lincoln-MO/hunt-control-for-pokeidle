# Publicação, GitHub Pages e Chrome Web Store

## 1. Antes de tornar o código público

- [ ] Conferir a procedência e as condições aplicáveis **aos trechos efetivamente incorporados de outras fontes** (não às funcionalidades semelhantes em si). Ver [Autoria, referências e licenciamento](CREDITOS_E_LICENCIAMENTO.md).
- [ ] Fazer teste real das automações Pokédex e Top Catch no jogo.
- [ ] Conferir o destinatário exibido pela chave Pix e pelo QR com o aplicativo bancário.
- [ ] Revisar as declarações de dados e permissões conforme o pacote que será enviado à loja.
- [ ] Conferir que nenhuma credencial, token ou dado privado foi incluído no código ou nas imagens.

## 2. Política de Privacidade com GitHub Pages

A Política de Privacidade está disponível em [`POLITICA_DE_PRIVACIDADE.md`](POLITICA_DE_PRIVACIDADE.md) e foi reproduzida em [`index.md`](index.md), a página inicial do GitHub Pages. Mantenha o conteúdo dos dois arquivos sincronizado ao atualizar a política. Para hospedar como página:

1. Entre no repositório do GitHub.
2. Abra **Settings → Pages**.
3. Configure **Deploy from a branch**, branch `main`, pasta `/docs`.
4. Salve, aguarde a publicação e abra o URL público informado pelo GitHub.
5. Abra o endereço em uma **janela anônima** para verificar se o texto inteiro está acessível publicamente.
6. Cole esse URL na seção **Práticas de privacidade → URL da Política de Privacidade** da Chrome Web Store.
7. Confira se as declarações de uso de dados da loja correspondem à versão do código e à política publicada.

Endereço esperado para o repositório `Lincoln-MO/hunt-control-for-pokeidle`, **depois de publicar o GitHub Pages**: `https://lincoln-mo.github.io/hunt-control-for-pokeidle/`. Confirme antes de usar.

## 3. Arquivos de imagens

- `screenshots/reais/`: imagens capturadas do jogo, usadas para documentação fiel do funcionamento.
- `screenshots/loja/`: quatro imagens ilustrativas montadas a partir das capturas, em **1280×800**.
- `screenshots/promocionais/`: peças de divulgação em **440×280** e **1400×560**.

As imagens de apresentação **não substituem a validação de telas reais** e podem mostrar pequenas diferenças da UI. A imagem promocional pequena inclui frases em inglês; revise se quiser uma apresentação integralmente em português. Não incluir artes com nome incorreto do jogo ou funcionalidades inexistentes.

## 4. Chrome Web Store

O ZIP destinado à Chrome Web Store é diferente do repositório: deve conter `manifest.json`, `src/`, `icons/` na **raiz**. Não inclua documentação do GitHub ou screenshots na extensão publicada, salvo necessidade expressa.

Revisar o campo de propósito único, as justificativas de acesso ao host `https://pokeidle.io/*`, as categorias de dados e o e-mail da conta de desenvolvedor, sempre conforme o comportamento efetivo da versão distribuída.
