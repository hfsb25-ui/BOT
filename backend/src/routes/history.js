const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

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
  const { date, time, asset, operation, score, probability, result, pattern, payout, signal_id } = req.body;
  if (!date || !time || !asset || !operation || score === undefined || probability === undefined) {
    return res.status(400).json({ error: 'Campos obrigatorios: date, time, asset, operation, score, probability' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO history (signal_id, date, time, asset, operation, score, probability, result, pattern, payout, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [signal_id || null, date, time, asset, operation, score, probability, result || 'PENDING', pattern || null, payout || null, new Date().toISOString()]
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

module.exports = router;
