const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { getCandles } = require('../services/twelveData');

// GET /api/history
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM history ORDER BY date DESC, time DESC LIMIT 500'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history
router.post('/', async (req, res) => {
  const { date, time, asset, operation, score, probability, result, pattern, payout, signal_id, entry_time_utc } = req.body;
  if (!date || !time || !asset || !operation || score === undefined || probability === undefined) {
    return res.status(400).json({ error: 'Campos obrigatorios: date, time, asset, operation, score, probability' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO history (signal_id, date, time, asset, operation, score, probability, result, pattern, payout, created_at, entry_time_utc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [signal_id || null, date, time, asset, operation, score, probability, result || 'PENDING', pattern || null, payout || null, new Date().toISOString(), entry_time_utc || null]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/history/:id
router.patch('/:id', async (req, res) => {
  const { result } = req.body;
  if (!['WIN', 'LOSS', 'PENDING'].includes(result)) {
    return res.status(400).json({ error: "result deve ser 'WIN', 'LOSS' ou 'PENDING'" });
  }
  try {
    await pool.query('UPDATE history SET result = $1 WHERE id = $2', [result, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM history WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/history/resolve-pending
// Verifica todas as operacoes PENDING cujo horario de expiracao (entrada + 5min)
// ja passou, busca o candle correspondente na Twelve Data e decide WIN/LOSS
// comparando o preco de abertura com o de fechamento daquele candle:
//   CALL ganha se close > open · PUT ganha se close < open
router.post('/resolve-pending', async (req, res) => {
  try {
    const { rows: pending } = await pool.query(
      "SELECT * FROM history WHERE result = 'PENDING' AND entry_time_utc IS NOT NULL"
    );

    const now = Date.now();
    const FIVE_MIN_MS = 5 * 60 * 1000;
    const GRACE_MS = 15000; // margem para o candle fechar/ser publicado pela API

    const dueByAsset = {};
    for (const row of pending) {
      const entryMs = new Date(row.entry_time_utc).getTime();
      if (Number.isNaN(entryMs)) continue;
      if (now < entryMs + FIVE_MIN_MS + GRACE_MS) continue; // ainda nao expirou
      dueByAsset[row.asset] = dueByAsset[row.asset] || [];
      dueByAsset[row.asset].push(row);
    }

    const resolved = [];

    for (const asset of Object.keys(dueByAsset)) {
      let candles;
      try {
        candles = await getCandles(asset, '5min', 60);
      } catch (e) {
        continue; // se a API falhar para esse ativo, tenta de novo na proxima chamada
      }

      for (const row of dueByAsset[asset]) {
        const entryMs = new Date(row.entry_time_utc).getTime();
        const match = candles.find((c) => {
          const candleMs = new Date(c.time.replace(' ', 'T') + 'Z').getTime();
          return Math.abs(candleMs - entryMs) < 90000; // tolerancia de 90s
        });
        if (!match) continue; // candle ainda nao disponivel nesta janela

        const isCall = row.operation === 'CALL';
        const won = isCall ? match.close > match.open : match.close < match.open;
        const result = won ? 'WIN' : 'LOSS';

        await pool.query(
          'UPDATE history SET result = $1, entry_price = $2, close_price = $3 WHERE id = $4',
          [result, match.open, match.close, row.id]
        );
        resolved.push({ id: row.id, asset: row.asset, operation: row.operation, result, entryPrice: match.open, closePrice: match.close });
      }
    }

    res.json({ resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
