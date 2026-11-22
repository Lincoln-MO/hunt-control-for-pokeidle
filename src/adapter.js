// Conecta o motor atualizado do /hunt ao controlador de automação, sem alterar os cálculos.
(function (root) {
  'use strict';
  const PIH = (root.__pokeidleHunt ??= {});
  async function analisarPokemon(pk, opcoes = {}) {
    if (!pk?.stats || !PIH.calculo?.pronto?.()) return null;
    const jogo = await PIH.carregarJogo();
    const ctx = PIH.calculo.contexto(jogo, pk);
    return PIH.engine.analisar(pk, ctx, { ...PIH.calculo.opcoes(), ordem: 'xp', soLiberadas: true, ...opcoes });
  }
  PIH.analisarPokemon = analisarPokemon;
  PIH.analisarAtivo = async (opcoes = {}) => {
    const pk = PIH.calculo?.pkAtivo?.();
    return pk ? analisarPokemon(pk, opcoes) : null;
  };
})(globalThis);
