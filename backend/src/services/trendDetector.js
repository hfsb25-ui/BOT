// Deteccao de tendencia combinando alinhamento de EMAs (20/50/200) com a
// estrutura de topos e fundos (higher highs/higher lows).

function detectTrendFromEMAs(ema20Last, ema50Last, ema200Last) {
  if (ema20Last === null || ema50Last === null) return 'INDEFINIDO';
  if (ema200Last !== null) {
    if (ema20Last > ema50Last && ema50Last > ema200Last) return 'ALTA';
    if (ema20Last < ema50Last && ema50Last < ema200Last) return 'BAIXA';
  } else {
    if (ema20Last > ema50Last) return 'ALTA';
    if (ema20Last < ema50Last) return 'BAIXA';
  }
  return 'LATERAL';
}

function detectTrendFromStructure(swingHighs, swingLows) {
  if (swingHighs.length < 2 || swingLows.length < 2) return 'INDEFINIDO';
  const lastHighs = swingHighs.slice(-2);
  const lastLows = swingLows.slice(-2);
  const higherHighs = lastHighs[1].price > lastHighs[0].price;
  const higherLows = lastLows[1].price > lastLows[0].price;
  const lowerHighs = lastHighs[1].price < lastHighs[0].price;
  const lowerLows = lastLows[1].price < lastLows[0].price;

  if (higherHighs && higherLows) return 'ALTA';
  if (lowerHighs && lowerLows) return 'BAIXA';
  return 'LATERAL';
}

/**
 * Combina o alinhamento de EMAs com a estrutura de mercado para uma classificacao
 * final de tendencia. Quando os dois metodos divergem, classifica como LATERAL
 * (contexto ambiguo, mais seguro para nao operar).
 */
function detectTrend({ ema20, ema50, ema200, swingHighs, swingLows }) {
  const last = ema20.length - 1;
  const emaTrend = detectTrendFromEMAs(ema20[last], ema50[last], ema200 ? ema200[last] : null);
  const structureTrend = detectTrendFromStructure(swingHighs, swingLows);

  if (emaTrend === structureTrend) return emaTrend;
  if (emaTrend === 'INDEFINIDO') return structureTrend;
  if (structureTrend === 'INDEFINIDO') return emaTrend;
  return 'LATERAL'; // divergencia entre EMA e estrutura = contexto indefinido
}

module.exports = { detectTrendFromEMAs, detectTrendFromStructure, detectTrend };
