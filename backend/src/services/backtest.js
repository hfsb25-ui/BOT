// Backtest: simula o mesmo motor de score (computeSignal) em cima de candles
// historicos, candle a candle, sem nunca olhar o futuro - a cada passo, so usa
// os candles ate aquele ponto (igual a analise ao vivo faria "naquele momento").
// Depois compara com o candle seguinte pra saber se teria dado WIN ou LOSS.
const { getCandles } = require('./twelveData');
const { computeSignal } = require('./signalGenerator');

// Minimo de candles de "aquecimento" antes de comecar a simular sinais - o
// mesmo raciocinio da analise ao vivo, pra EMA200 e os demais indicadores
// terem dados suficientes pra nao distorcer o resultado.
const WARMUP = 210;
const MAX_CANDLES = 1500;

function scoreBand(score) {
  if (score >= 90) return '90-100';
  if (score >= 80) return '80-89';
  if (score >= 60) return '60-79';
  if (score >= 40) return '40-59';
  return '0-39';
}

async function runBacktest(asset, { totalCandles = 500, minScore = 0, minProbability = 0 } = {}) {
  const outputsize = Math.min(Math.max(totalCandles, WARMUP + 20), MAX_CANDLES);
  const candles = await getCandles(asset, '5min', outputsize);

  if (candles.length < WARMUP + 10) {
    throw new Error('Candles insuficientes para rodar o backtest deste ativo (tente aumentar a quantidade ou verifique o simbolo).');
  }

  const trades = [];

  // Para cada ponto i (representando "agora, com o candle i acabando de fechar"),
  // roda o motor de score usando so os candles ate ali, e confere o candle
  // seguinte (i+1) - que seria a entrada e expiracao no mundo real (M5).
  for (let i = WARMUP - 1; i < candles.length - 1; i++) {
    const slice = candles.slice(0, i + 1);
    const { scoreResult } = computeSignal(slice);

    if (!scoreResult.operation) continue;
    if (scoreResult.score < minScore || scoreResult.probability < minProbability) continue;

    const nextCandle = candles[i + 1];
    const isCall = scoreResult.operation === 'CALL';
    const won = isCall ? nextCandle.close > nextCandle.open : nextCandle.close < nextCandle.open;

    trades.push({
      time: candles[i].time,
      operation: scoreResult.operation,
      score: scoreResult.score,
      probability: scoreResult.probability,
      won,
    });
  }

  const total = trades.length;
  const wins = trades.filter((t) => t.won).length;
  const winRate = total ? +((wins / total) * 100).toFixed(1) : 0;

  const byBand = {};
  for (const t of trades) {
    const band = scoreBand(t.score);
    byBand[band] = byBand[band] || { band, total: 0, wins: 0 };
    byBand[band].total += 1;
    if (t.won) byBand[band].wins += 1;
  }
  const scoreBandStats = Object.values(byBand)
    .map((b) => ({ ...b, winRate: +((b.wins / b.total) * 100).toFixed(1) }))
    .sort((a, b) => a.band.localeCompare(b.band));

  const callTrades = trades.filter((t) => t.operation === 'CALL');
  const putTrades = trades.filter((t) => t.operation === 'PUT');
  const callWins = callTrades.filter((t) => t.won).length;
  const putWins = putTrades.filter((t) => t.won).length;

  return {
    asset,
    candlesAnalyzed: candles.length,
    period: { from: candles[WARMUP - 1]?.time, to: candles[candles.length - 1]?.time },
    totalTrades: total,
    wins,
    losses: total - wins,
    winRate,
    scoreBandStats,
    callCount: callTrades.length,
    callWinRate: callTrades.length ? +((callWins / callTrades.length) * 100).toFixed(1) : null,
    putCount: putTrades.length,
    putWinRate: putTrades.length ? +((putWins / putTrades.length) * 100).toFixed(1) : null,
  };
}

module.exports = { runBacktest };
