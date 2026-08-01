// Motor de pontuacao (Score 0-100). Combina os componentes de analise em uma
// nota unica, com pesos fixos conforme especificacao do produto:
//
//   Tendencia   +25
//   Price Action +20
//   EMA (alinhamento) +15
//   RSI          +10
//   MACD         +10
//   ADX          +10
//   ATR          +10
//   -------------------
//   Total       100

const WEIGHTS = {
  trend: 25,
  priceAction: 20,
  ema: 15,
  rsi: 10,
  macd: 10,
  adx: 10,
  atr: 10,
};

function classify(score) {
  if (score >= 90) return 'Excelente';
  if (score >= 80) return 'Muito Bom';
  if (score >= 60) return 'Bom';
  if (score >= 40) return 'Fraco';
  return 'Muito Ruim';
}

function confidenceFromScore(score) {
  if (score >= 90) return 'Muito Alto';
  if (score >= 75) return 'Alto';
  if (score >= 55) return 'Medio';
  return 'Baixo';
}

// --- Pontuacao por componente, cada um retorna { points, direction, reason } -----

function scoreTrend(trend) {
  if (trend === 'ALTA') return { points: WEIGHTS.trend, direction: 'CALL', reason: 'Tendencia de alta confirmada (EMAs e estrutura de mercado)' };
  if (trend === 'BAIXA') return { points: WEIGHTS.trend, direction: 'PUT', reason: 'Tendencia de baixa confirmada (EMAs e estrutura de mercado)' };
  return { points: 0, direction: null, reason: 'Mercado sem tendencia clara (lateral)' };
}

function scorePriceAction(patterns) {
  if (!patterns || patterns.length === 0) {
    return { points: 0, direction: null, reason: 'Nenhum padrao de price action relevante encontrado' };
  }
  const top = patterns[0]; // ja vem ordenado por forca
  const points = Math.round(WEIGHTS.priceAction * top.strength);
  return { points, direction: top.direction === 'NEUTRO' ? null : top.direction, reason: `Padrao identificado: ${top.pattern}` };
}

function scoreEMA(ema20Last, ema50Last, ema200Last, price) {
  if (ema20Last === null || ema50Last === null) return { points: 0, direction: null, reason: 'EMAs insuficientes' };
  const aligned20_50 = ema20Last > ema50Last ? 'CALL' : 'PUT';
  let alignedAll = aligned20_50;
  let fullyAligned = true;
  if (ema200Last !== null) {
    const aligned50_200 = ema50Last > ema200Last ? 'CALL' : 'PUT';
    fullyAligned = aligned20_50 === aligned50_200;
    alignedAll = fullyAligned ? aligned20_50 : null;
  }
  const priceAboveEma20 = price > ema20Last;
  const priceAligned = (aligned20_50 === 'CALL' && priceAboveEma20) || (aligned20_50 === 'PUT' && !priceAboveEma20);

  if (fullyAligned && priceAligned) {
    return { points: WEIGHTS.ema, direction: alignedAll, reason: `EMA20 ${aligned20_50 === 'CALL' ? 'acima' : 'abaixo'} da EMA50${ema200Last !== null ? ' e EMA50 alinhada com EMA200' : ''}, preco confirma` };
  }
  if (aligned20_50 && priceAligned) {
    return { points: Math.round(WEIGHTS.ema * 0.6), direction: aligned20_50, reason: `EMA20 ${aligned20_50 === 'CALL' ? 'acima' : 'abaixo'} da EMA50, mas sem alinhamento total com EMA200` };
  }
  return { points: 0, direction: null, reason: 'EMAs sem alinhamento claro' };
}

function scoreRSI(rsiLast, trendDirection) {
  if (rsiLast === null) return { points: 0, direction: null, reason: 'RSI insuficiente' };
  // Favoravel: RSI confirmando forca na direcao da tendencia, sem estar em extremo de exaustao
  if (trendDirection === 'CALL' && rsiLast > 50 && rsiLast < 75) {
    return { points: WEIGHTS.rsi, direction: 'CALL', reason: `RSI favoravel para alta (${rsiLast.toFixed(1)})` };
  }
  if (trendDirection === 'PUT' && rsiLast < 50 && rsiLast > 25) {
    return { points: WEIGHTS.rsi, direction: 'PUT', reason: `RSI favoravel para baixa (${rsiLast.toFixed(1)})` };
  }
  if (rsiLast >= 75 || rsiLast <= 25) {
    return { points: 0, direction: null, reason: `RSI em zona de exaustao (${rsiLast.toFixed(1)}) - risco de reversao` };
  }
  return { points: Math.round(WEIGHTS.rsi * 0.3), direction: null, reason: `RSI neutro (${rsiLast.toFixed(1)})` };
}

function scoreMACD(histogram, trendDirection) {
  const last = histogram[histogram.length - 1];
  const prev = histogram[histogram.length - 2];
  if (last === null || prev === null) return { points: 0, direction: null, reason: 'MACD insuficiente' };

  const rising = last > prev;
  if (last > 0 && rising) return { points: trendDirection === 'CALL' ? WEIGHTS.macd : Math.round(WEIGHTS.macd * 0.4), direction: 'CALL', reason: 'MACD positivo e em expansao' };
  if (last < 0 && !rising) return { points: trendDirection === 'PUT' ? WEIGHTS.macd : Math.round(WEIGHTS.macd * 0.4), direction: 'PUT', reason: 'MACD negativo e em expansao' };
  return { points: 0, direction: null, reason: 'MACD sem momentum claro' };
}

function scoreADX(adxLast) {
  if (adxLast === null) return { points: 0, direction: null, reason: 'ADX insuficiente' };
  if (adxLast >= 25) return { points: WEIGHTS.adx, direction: null, reason: `ADX indica tendencia com forca (${adxLast.toFixed(1)})` };
  if (adxLast >= 20) return { points: Math.round(WEIGHTS.adx * 0.5), direction: null, reason: `ADX moderado (${adxLast.toFixed(1)})` };
  return { points: 0, direction: null, reason: `ADX baixo (${adxLast.toFixed(1)}) - mercado sem forca direcional` };
}

function scoreATR(atrLast, price) {
  if (atrLast === null) return { points: 0, direction: null, reason: 'ATR insuficiente' };
  const atrPct = (atrLast / price) * 100;
  // Faixa saudavel: volatilidade presente o suficiente para mover o preco, mas nao caotica
  if (atrPct >= 0.02 && atrPct <= 0.15) {
    return { points: WEIGHTS.atr, direction: null, reason: `ATR em faixa saudavel (${atrPct.toFixed(3)}% do preco)` };
  }
  if (atrPct < 0.02) {
    return { points: 0, direction: null, reason: 'Volatilidade muito baixa (mercado parado)' };
  }
  return { points: Math.round(WEIGHTS.atr * 0.3), direction: null, reason: 'Volatilidade elevada (movimento mais imprevisivel)' };
}

/**
 * Calcula o score final e decide a direcao (CALL/PUT) por "votacao ponderada":
 * cada componente que aponta uma direcao contribui seus pontos para o placar
 * daquela direcao. A direcao vencedora e a operacao sugerida.
 */
function calculateScore({ trend, priceActionPatterns, ema20, ema50, ema200, price, rsi, macdHistogram, adx, atr }) {
  const trendResult = scoreTrend(trend);
  const paResult = scorePriceAction(priceActionPatterns);
  const emaResult = scoreEMA(ema20, ema50, ema200, price);
  const rsiResult = scoreRSI(rsi, trendResult.direction || emaResult.direction);
  const macdResult = scoreMACD(macdHistogram, trendResult.direction || emaResult.direction);
  const adxResult = scoreADX(adx);
  const atrResult = scoreATR(atr, price);

  const components = {
    trend: trendResult,
    priceAction: paResult,
    ema: emaResult,
    rsi: rsiResult,
    macd: macdResult,
    adx: adxResult,
    atr: atrResult,
  };

  const totalScore = Object.values(components).reduce((sum, c) => sum + c.points, 0);

  // Votacao de direcao: soma pontos por CALL/PUT entre os componentes direcionais
  let callVotes = 0, putVotes = 0;
  for (const c of Object.values(components)) {
    if (c.direction === 'CALL') callVotes += c.points;
    if (c.direction === 'PUT') putVotes += c.points;
  }
  let operation = null;
  if (callVotes > putVotes && callVotes > 0) operation = 'CALL';
  else if (putVotes > callVotes && putVotes > 0) operation = 'PUT';

  // Probabilidade estimada: heuristica derivada do score (NAO e uma probabilidade
  // estatisticamente calibrada) - serve apenas como indicador relativo de qualidade.
  const probability = Math.round(Math.min(50 + totalScore * 0.42, 95));

  return {
    score: Math.round(totalScore),
    classification: classify(totalScore),
    confidence: confidenceFromScore(totalScore),
    operation,
    probability,
    components,
  };
}

module.exports = { calculateScore, classify, confidenceFromScore, WEIGHTS };
