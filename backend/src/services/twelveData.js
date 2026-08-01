// Servico responsavel por toda a comunicacao com a API da Twelve Data.
// Documentacao: https://twelvedata.com/docs
const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const BASE_URL = 'https://api.twelvedata.com';
const API_KEY = process.env.TWELVE_DATA_API_KEY;

// Cache curto (25s) para nao estourar o rate limit do plano gratuito da Twelve Data
// ao servir varias requisicoes do frontend para o mesmo ativo em sequencia.
const cache = new NodeCache({ stdTTL: 25 });

if (!API_KEY || API_KEY === 'coloque_sua_chave_aqui') {
  console.warn('[twelveData] ATENCAO: TWELVE_DATA_API_KEY nao configurada no .env');
}

/**
 * Busca candles (OHLC) de um ativo no timeframe informado.
 * @param {string} symbol - ex: 'EUR/USD'
 * @param {string} interval - ex: '5min'
 * @param {number} outputsize - quantidade de candles (min. 210 para EMA200 ficar estavel)
 */
async function getCandles(symbol, interval = '5min', outputsize = 210) {
  const cacheKey = `candles:${symbol}:${interval}:${outputsize}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${BASE_URL}/time_series`, {
      params: {
        symbol,
        interval,
        outputsize,
        apikey: API_KEY,
        order: 'ASC', // do candle mais antigo para o mais recente
      },
      timeout: 10000,
    });

    if (data.status === 'error') {
      throw new Error(`Twelve Data: ${data.message}`);
    }

    // Normaliza para o formato interno usado pelos servicos de analise
    const candles = (data.values || []).map((c) => ({
      time: c.datetime,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: c.volume ? parseFloat(c.volume) : null,
    }));

    cache.set(cacheKey, candles);
    return candles;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`Falha ao buscar candles de ${symbol}: ${msg}`);
  }
}

/**
 * Retorna a cotacao/preco atual de um ativo (usado para exibir preco em tempo real na UI).
 */
async function getQuote(symbol) {
  const cacheKey = `quote:${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${BASE_URL}/quote`, {
    params: { symbol, apikey: API_KEY },
    timeout: 10000,
  });

  cache.set(cacheKey, data, 10);
  return data;
}

module.exports = { getCandles, getQuote };
