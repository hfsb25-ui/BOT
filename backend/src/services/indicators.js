// Biblioteca propria de indicadores tecnicos (sem dependencia externa de TA-lib),
// escrita para trabalhar com arrays de candles no formato { open, high, low, close }.
// Todas as funcoes retornam arrays alinhados ao array de candles (com null nos indices
// iniciais onde nao ha dados suficientes para calcular).

function closes(candles) { return candles.map((c) => c.close); }
function highs(candles) { return candles.map((c) => c.high); }
function lows(candles) { return candles.map((c) => c.low); }

// --- Medias Moveis -----------------------------------------------------

function sma(values, period) {
  const out = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function ema(values, period) {
  const out = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prevEma = null;
  for (let i = 0; i < values.length; i++) {
    if (i === period - 1) {
      // semente: media simples dos primeiros `period` valores
      const seed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
      prevEma = seed;
      out[i] = seed;
    } else if (i >= period) {
      prevEma = values[i] * k + prevEma * (1 - k);
      out[i] = prevEma;
    }
  }
  return out;
}

function calculateEMA(candles, period) {
  return ema(closes(candles), period);
}

// --- RSI -----------------------------------------------------------------

function calculateRSI(candles, period = 14) {
  const price = closes(candles);
  const out = new Array(price.length).fill(null);
  if (price.length <= period) return out;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = price[i] - price[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < price.length; i++) {
    const diff = price[i] - price[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// --- MACD ------------------------------------------------------------------

function calculateMACD(candles, fast = 12, slow = 26, signalPeriod = 9) {
  const price = closes(candles);
  const emaFast = ema(price, fast);
  const emaSlow = ema(price, slow);
  const macdLine = price.map((_, i) => (emaFast[i] !== null && emaSlow[i] !== null) ? emaFast[i] - emaSlow[i] : null);

  // EMA do macdLine, ignorando os nulls iniciais
  const firstValid = macdLine.findIndex((v) => v !== null);
  const signalLine = new Array(price.length).fill(null);
  if (firstValid !== -1) {
    const macdValid = macdLine.slice(firstValid);
    const sig = ema(macdValid, signalPeriod);
    sig.forEach((v, idx) => { signalLine[firstValid + idx] = v; });
  }

  const histogram = price.map((_, i) => (macdLine[i] !== null && signalLine[i] !== null) ? macdLine[i] - signalLine[i] : null);
  return { macdLine, signalLine, histogram };
}

// --- ATR (Average True Range) ----------------------------------------------

function trueRange(candles) {
  const tr = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) { tr[i] = candles[i].high - candles[i].low; continue; }
    const c = candles[i], prevClose = candles[i - 1].close;
    tr[i] = Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  }
  return tr;
}

function calculateATR(candles, period = 14) {
  const tr = trueRange(candles);
  const out = new Array(candles.length).fill(null);
  let sum = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period) { sum += tr[i]; if (i === period - 1) out[i] = sum / period; continue; }
    out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
  }
  return out;
}

// --- ADX (Average Directional Index) ----------------------------------------

function calculateADX(candles, period = 14) {
  const len = candles.length;
  const plusDM = new Array(len).fill(0);
  const minusDM = new Array(len).fill(0);
  const tr = trueRange(candles);

  for (let i = 1; i < len; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
  }

  const smooth = (arr) => {
    const out = new Array(len).fill(null);
    let sum = 0;
    for (let i = 0; i < len; i++) {
      if (i < period) { sum += arr[i]; if (i === period - 1) out[i] = sum; continue; }
      out[i] = out[i - 1] - out[i - 1] / period + arr[i];
    }
    return out;
  };

  const smoothTR = smooth(tr);
  const smoothPlusDM = smooth(plusDM);
  const smoothMinusDM = smooth(minusDM);

  const plusDI = new Array(len).fill(null);
  const minusDI = new Array(len).fill(null);
  const dx = new Array(len).fill(null);

  for (let i = period - 1; i < len; i++) {
    if (!smoothTR[i]) continue;
    plusDI[i] = 100 * (smoothPlusDM[i] / smoothTR[i]);
    minusDI[i] = 100 * (smoothMinusDM[i] / smoothTR[i]);
    const diSum = plusDI[i] + minusDI[i];
    dx[i] = diSum === 0 ? 0 : 100 * (Math.abs(plusDI[i] - minusDI[i]) / diSum);
  }

  const adx = new Array(len).fill(null);
  const firstDx = dx.findIndex((v) => v !== null);
  if (firstDx !== -1 && firstDx + period <= len) {
    const seedSlice = dx.slice(firstDx, firstDx + period).filter((v) => v !== null);
    let prevAdx = seedSlice.reduce((a, b) => a + b, 0) / seedSlice.length;
    adx[firstDx + period - 1] = prevAdx;
    for (let i = firstDx + period; i < len; i++) {
      prevAdx = (prevAdx * (period - 1) + dx[i]) / period;
      adx[i] = prevAdx;
    }
  }

  return { adx, plusDI, minusDI };
}

// --- Bandas de Bollinger -----------------------------------------------------

function calculateBollinger(candles, period = 20, stdDevMultiplier = 2) {
  const price = closes(candles);
  const middle = sma(price, period);
  const upper = new Array(price.length).fill(null);
  const lower = new Array(price.length).fill(null);

  for (let i = period - 1; i < price.length; i++) {
    const slice = price.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
  }
  return { upper, middle, lower };
}

// --- Estocastico -------------------------------------------------------------

function calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
  const h = highs(candles), l = lows(candles), c = closes(candles);
  const percentK = new Array(candles.length).fill(null);

  for (let i = kPeriod - 1; i < candles.length; i++) {
    const highSlice = h.slice(i - kPeriod + 1, i + 1);
    const lowSlice = l.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    percentK[i] = highestHigh === lowestLow ? 50 : ((c[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
  }

  const validK = percentK.filter((v) => v !== null);
  const firstValid = percentK.findIndex((v) => v !== null);
  const percentD = new Array(candles.length).fill(null);
  if (firstValid !== -1) {
    const dValues = sma(validK, dPeriod);
    dValues.forEach((v, idx) => { percentD[firstValid + idx] = v; });
  }

  return { percentK, percentD };
}

module.exports = {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateADX,
  calculateBollinger,
  calculateStochastic,
  trueRange,
};
