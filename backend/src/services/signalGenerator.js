// Orquestra todo o pipeline de analise para um ativo: busca candles, calcula
// indicadores, detecta tendencia/price action/S-R, calcula o score e monta
// o objeto final de sinal (oportunidade ou "nao operar").

const { getCandles } = require('./twelveData');
const { calculateEMA, calculateRSI, calculateMACD, calculateATR, calculateADX, calculateBollinger, calculateStochastic } = require('./indicators');
const { detectSupportResistance } = require('./supportResistance');
const { detectTrend } = require('./trendDetector');
const { analyzePriceAction } = require('./priceAction');
const { calculateScore } = require('./scoreEngine');

function last(arr) { return arr[arr.length - 1]; }

// Retorna o proximo horario "redondo" multiplo de 5 minutos (ex: 11:00, 11:05, 11:10),
// que e quando a proxima vela M5 comeca - o horario certo para sugerir uma entrada.
function nextM5Boundary() {
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const now = Date.now();
  return new Date(Math.ceil(now / FIVE_MIN_MS) * FIVE_MIN_MS);
}

async function generateSignal(asset, { minScore = 70, minProbability = 60 } = {}) {
  const candles = await getCandles(asset, '5min', 210);
  if (candles.length < 60) {
    throw new Error('Candles insuficientes retornados pela Twelve Data para este ativo/plano.');
  }

  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const ema200 = candles.length >= 200 ? calculateEMA(candles, 200) : new Array(candles.length).fill(null);
  const rsi = calculateRSI(candles, 14);
  const macd = calculateMACD(candles, 12, 26, 9);
  const atr = calculateATR(candles, 14);
  const adxResult = calculateADX(candles, 14);
  const bollinger = calculateBollinger(candles, 20, 2);
  const stochastic = calculateStochastic(candles, 14, 3);

  const { levels, swingHighs, swingLows } = detectSupportResistance(candles, { lookback: 3, maxLevels: 4 });
  const trend = detectTrend({ ema20, ema50, ema200, swingHighs, swingLows });
  const priceActionPatterns = analyzePriceAction(candles, { trend, swingHighs, swingLows, srLevels: levels });

  const price = last(candles).close;
  const scoreResult = calculateScore({
    trend,
    priceActionPatterns,
    ema20: last(ema20),
    ema50: last(ema50),
    ema200: last(ema200),
    price,
    rsi: last(rsi),
    macdHistogram: macd.histogram,
    adx: last(adxResult.adx),
    atr: last(atr),
  });

  const entryTime = nextM5Boundary().toISOString();

  const justification = Object.values(scoreResult.components)
    .filter((c) => c.points > 0)
    .map((c) => c.reason);

  const indicatorsSnapshot = {
    price,
    ema20: last(ema20), ema50: last(ema50), ema200: last(ema200),
    rsi: last(rsi),
    macd: { line: last(macd.macdLine), signal: last(macd.signalLine), histogram: last(macd.histogram) },
    atr: last(atr),
    adx: last(adxResult.adx), plusDI: last(adxResult.plusDI), minusDI: last(adxResult.minusDI),
    bollinger: { upper: last(bollinger.upper), middle: last(bollinger.middle), lower: last(bollinger.lower) },
    stochastic: { k: last(stochastic.percentK), d: last(stochastic.percentD) },
    supportResistance: levels,
  };

  const meetsThreshold = scoreResult.score >= minScore && scoreResult.probability >= minProbability && scoreResult.operation !== null;

  if (!meetsThreshold) {
    const reasons = [];
    if (scoreResult.operation === null) reasons.push('Sinais dos indicadores nao convergem para uma direcao clara (CALL x PUT empatados ou sem votos)');
    if (scoreResult.score < minScore) reasons.push(`Score (${scoreResult.score}) abaixo do minimo configurado (${minScore})`);
    if (scoreResult.probability < minProbability) reasons.push(`Probabilidade estimada (${scoreResult.probability}%) abaixo do minimo configurado (${minProbability}%)`);
    if (trend === 'LATERAL' || trend === 'INDEFINIDO') reasons.push('Mercado sem tendencia definida no momento');

    return {
      status: 'NO_TRADE',
      asset,
      time: entryTime,
      trend,
      score: scoreResult.score,
      classification: scoreResult.classification,
      probability: scoreResult.probability,
      reasons,
      indicatorsSnapshot,
    };
  }

  return {
    status: 'OPPORTUNITY',
    asset,
    entryTime,
    expiration: 'M5',
    operation: scoreResult.operation,
    score: scoreResult.score,
    classification: scoreResult.classification,
    probability: scoreResult.probability,
    confidence: scoreResult.confidence,
    trend,
    priceActionPatterns,
    justification,
    indicatorsSnapshot,
  };
}

module.exports = { generateSignal };
