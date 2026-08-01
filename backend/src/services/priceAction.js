// Deteccao de padroes de Price Action a partir dos ultimos candles.
// Cada funcao retorna null quando o padrao nao esta presente, ou um objeto
// { pattern, direction, strength } quando detectado. `direction` indica o
// vies do padrao: 'CALL' (alta) ou 'PUT' (baixa).

function bodySize(c) { return Math.abs(c.close - c.open); }
function range(c) { return c.high - c.low; }
function upperWick(c) { return c.high - Math.max(c.open, c.close); }
function lowerWick(c) { return Math.min(c.open, c.close) - c.low; }
function isBullish(c) { return c.close > c.open; }
function isBearish(c) { return c.close < c.open; }

// --- Padroes de candle unico ------------------------------------------------

function detectDoji(candle) {
  const r = range(candle);
  if (r === 0) return null;
  const body = bodySize(candle);
  if (body / r <= 0.1) {
    return { pattern: 'Doji', direction: 'NEUTRO', strength: 0.4 };
  }
  return null;
}

function detectPinBar(candle) {
  const r = range(candle);
  if (r === 0) return null;
  const body = bodySize(candle);
  const upper = upperWick(candle);
  const lower = lowerWick(candle);

  // Pin bar de alta: pavio inferior longo (rejeicao de venda), corpo pequeno no topo
  if (lower >= r * 0.6 && body <= r * 0.35 && lower > upper * 2) {
    return { pattern: 'Pin Bar', direction: 'CALL', strength: 0.8 };
  }
  // Pin bar de baixa: pavio superior longo (rejeicao de compra)
  if (upper >= r * 0.6 && body <= r * 0.35 && upper > lower * 2) {
    return { pattern: 'Pin Bar', direction: 'PUT', strength: 0.8 };
  }
  return null;
}

function detectHammer(candle, prevCandle) {
  const r = range(candle);
  if (r === 0) return null;
  const body = bodySize(candle);
  const lower = lowerWick(candle);
  const upper = upperWick(candle);

  // Martelo: aparece apos queda, pavio inferior >= 2x o corpo, pavio superior pequeno
  if (prevCandle && isBearish(prevCandle) && lower >= body * 2 && upper <= body * 0.5 && body > 0) {
    return { pattern: 'Martelo', direction: 'CALL', strength: 0.75 };
  }
  // Estrela cadente (martelo invertido em topo): apos alta, pavio superior longo
  if (prevCandle && isBullish(prevCandle) && upper >= body * 2 && lower <= body * 0.5 && body > 0) {
    return { pattern: 'Estrela Cadente', direction: 'PUT', strength: 0.75 };
  }
  return null;
}

function detectEngulfing(prevCandle, candle) {
  if (!prevCandle) return null;
  const prevBody = bodySize(prevCandle);
  const body = bodySize(candle);
  if (prevBody === 0 || body === 0) return null;

  // Engolfo de alta: candle atual bullish, corpo engole totalmente o corpo do anterior (bearish)
  if (isBearish(prevCandle) && isBullish(candle) &&
      candle.open <= prevCandle.close && candle.close >= prevCandle.open &&
      body > prevBody) {
    return { pattern: 'Engolfo de Alta', direction: 'CALL', strength: 0.85 };
  }
  // Engolfo de baixa
  if (isBullish(prevCandle) && isBearish(candle) &&
      candle.open >= prevCandle.close && candle.close <= prevCandle.open &&
      body > prevBody) {
    return { pattern: 'Engolfo de Baixa', direction: 'PUT', strength: 0.85 };
  }
  return null;
}

// --- Padroes de estrutura (varios candles) ------------------------------------

// Pullback: preco corrige contra a tendencia principal e mostra sinais de retomada.
function detectPullback(candles, trend) {
  if (candles.length < 6) return null;
  const recent = candles.slice(-6);
  const closesArr = recent.map((c) => c.close);

  if (trend === 'ALTA') {
    // houve uma correcao (queda) nos ultimos candles e o ultimo fecha em alta retomando o movimento
    const dipHappened = closesArr[0] > Math.min(...closesArr.slice(1, 4));
    const resumed = closesArr[5] > closesArr[4] && isBullish(recent[5]);
    if (dipHappened && resumed) return { pattern: 'Pullback', direction: 'CALL', strength: 0.7 };
  }
  if (trend === 'BAIXA') {
    const rallyHappened = closesArr[0] < Math.max(...closesArr.slice(1, 4));
    const resumed = closesArr[5] < closesArr[4] && isBearish(recent[5]);
    if (rallyHappened && resumed) return { pattern: 'Pullback', direction: 'PUT', strength: 0.7 };
  }
  return null;
}

// BOS (Break of Structure): rompimento de uma maxima/minima estrutural na direcao da tendencia,
// confirmando continuidade.
function detectBOS(candles, swingHighs, swingLows, trend) {
  if (candles.length < 3) return null;
  const last = candles[candles.length - 1];

  if (trend === 'ALTA' && swingHighs.length > 0) {
    const lastSwingHigh = swingHighs[swingHighs.length - 1].price;
    if (last.close > lastSwingHigh) {
      return { pattern: 'BOS (Rompimento de Estrutura)', direction: 'CALL', strength: 0.75 };
    }
  }
  if (trend === 'BAIXA' && swingLows.length > 0) {
    const lastSwingLow = swingLows[swingLows.length - 1].price;
    if (last.close < lastSwingLow) {
      return { pattern: 'BOS (Rompimento de Estrutura)', direction: 'PUT', strength: 0.75 };
    }
  }
  return null;
}

// CHOCH (Change of Character): primeira quebra de estrutura contra a tendencia vigente,
// sinal de possivel reversao (usado aqui como alerta, nao gera sinal isolado forte).
function detectCHOCH(candles, swingHighs, swingLows, trend) {
  if (candles.length < 3) return null;
  const last = candles[candles.length - 1];

  if (trend === 'BAIXA' && swingHighs.length > 0) {
    const lastSwingHigh = swingHighs[swingHighs.length - 1].price;
    if (last.close > lastSwingHigh) {
      return { pattern: 'CHOCH (Mudanca de Carater)', direction: 'CALL', strength: 0.55 };
    }
  }
  if (trend === 'ALTA' && swingLows.length > 0) {
    const lastSwingLow = swingLows[swingLows.length - 1].price;
    if (last.close < lastSwingLow) {
      return { pattern: 'CHOCH (Mudanca de Carater)', direction: 'PUT', strength: 0.55 };
    }
  }
  return null;
}

// Falso rompimento: preco rompe um nivel de suporte/resistencia mas fecha de volta dentro do range.
function detectFalseBreakout(candles, srLevels) {
  if (candles.length < 2 || srLevels.length === 0) return null;
  const last = candles[candles.length - 1];
  const tolerance = (last.high - last.low) * 0.15;

  for (const level of srLevels) {
    // Rompeu resistencia com o pavio mas fechou abaixo dela -> falso rompimento de alta (vies PUT)
    if (level.type === 'resistance' && last.high > level.price + tolerance && last.close < level.price) {
      return { pattern: 'Falso Rompimento', direction: 'PUT', strength: 0.7 };
    }
    // Rompeu suporte com o pavio mas fechou acima dele -> falso rompimento de baixa (vies CALL)
    if (level.type === 'support' && last.low < level.price - tolerance && last.close > level.price) {
      return { pattern: 'Falso Rompimento', direction: 'CALL', strength: 0.7 };
    }
  }
  return null;
}

// Zona de liquidez: pavios longos e repetidos proximos de um mesmo nivel, indicando
// acumulo de ordens (stop hunt) antes de um movimento.
function detectLiquidityGrab(candles, srLevels) {
  if (candles.length < 3 || srLevels.length === 0) return null;
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const tolerance = (last.high - last.low) * 0.2;

  for (const level of srLevels) {
    const sweepLow = Math.min(last.low, prev.low);
    const sweepHigh = Math.max(last.high, prev.high);

    if (level.type === 'support' && sweepLow < level.price - tolerance &&
        last.close > level.price && lowerWick(last) > bodySize(last)) {
      return { pattern: 'Liquidez (Stop Hunt)', direction: 'CALL', strength: 0.65 };
    }
    if (level.type === 'resistance' && sweepHigh > level.price + tolerance &&
        last.close < level.price && upperWick(last) > bodySize(last)) {
      return { pattern: 'Liquidez (Stop Hunt)', direction: 'PUT', strength: 0.65 };
    }
  }
  return null;
}

/**
 * Roda todos os detectores e retorna a lista de padroes encontrados nos ultimos candles,
 * ordenados por forca (strength) decrescente.
 */
function analyzePriceAction(candles, { trend, swingHighs, swingLows, srLevels }) {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const found = [];

  const pin = detectPinBar(last); if (pin) found.push(pin);
  const doji = detectDoji(last); if (doji) found.push(doji);
  const hammer = detectHammer(last, prev); if (hammer) found.push(hammer);
  const engulf = detectEngulfing(prev, last); if (engulf) found.push(engulf);
  const pullback = detectPullback(candles, trend); if (pullback) found.push(pullback);
  const bos = detectBOS(candles, swingHighs, swingLows, trend); if (bos) found.push(bos);
  const choch = detectCHOCH(candles, swingHighs, swingLows, trend); if (choch) found.push(choch);
  const falseBreak = detectFalseBreakout(candles, srLevels); if (falseBreak) found.push(falseBreak);
  const liquidity = detectLiquidityGrab(candles, srLevels); if (liquidity) found.push(liquidity);

  found.sort((a, b) => b.strength - a.strength);
  return found;
}

module.exports = {
  detectDoji,
  detectPinBar,
  detectHammer,
  detectEngulfing,
  detectPullback,
  detectBOS,
  detectCHOCH,
  detectFalseBreakout,
  detectLiquidityGrab,
  analyzePriceAction,
};
