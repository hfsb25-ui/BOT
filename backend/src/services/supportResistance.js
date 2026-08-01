// Deteccao de niveis de suporte e resistencia a partir de topos/fundos (swing highs/lows)
// e agrupamento de niveis proximos (clustering por tolerancia percentual).

/**
 * Encontra swing highs e swing lows: candles cujo high/low e maior/menor que os
 * `lookback` candles antes e depois dele.
 */
function findSwings(candles, lookback = 3) {
  const swingHighs = [];
  const swingLows = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    const current = candles[i];
    const isHigh = window.every((c) => c.high <= current.high);
    const isLow = window.every((c) => c.low >= current.low);
    if (isHigh) swingHighs.push({ index: i, price: current.high, time: current.time });
    if (isLow) swingLows.push({ index: i, price: current.low, time: current.time });
  }
  return { swingHighs, swingLows };
}

/**
 * Agrupa niveis proximos (dentro de `tolerancePct`) em um unico nivel, somando
 * o numero de toques -- niveis com mais toques sao mais relevantes.
 */
function clusterLevels(points, type, tolerancePct = 0.0008) {
  const sorted = [...points].sort((a, b) => a.price - b.price);
  const clusters = [];

  for (const p of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(p.price - last.avgPrice) / last.avgPrice <= tolerancePct) {
      last.touches.push(p);
      last.avgPrice = last.touches.reduce((s, t) => s + t.price, 0) / last.touches.length;
    } else {
      clusters.push({ avgPrice: p.price, touches: [p] });
    }
  }

  return clusters
    .map((c) => ({ type, price: c.avgPrice, touches: c.touches.length }))
    .sort((a, b) => b.touches - a.touches);
}

/**
 * Retorna os niveis de suporte e resistencia mais relevantes (ate `maxLevels` de cada),
 * combinados numa unica lista ordenada por proximidade ao preco atual.
 */
function detectSupportResistance(candles, { lookback = 3, maxLevels = 4 } = {}) {
  const { swingHighs, swingLows } = findSwings(candles, lookback);
  const resistances = clusterLevels(swingHighs, 'resistance').slice(0, maxLevels);
  const supports = clusterLevels(swingLows, 'support').slice(0, maxLevels);
  const currentPrice = candles[candles.length - 1].close;

  const levels = [...resistances, ...supports].sort(
    (a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
  );

  return { levels, swingHighs, swingLows, resistances, supports };
}

module.exports = { findSwings, clusterLevels, detectSupportResistance };
