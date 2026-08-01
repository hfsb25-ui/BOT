const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

function serialize(row) {
  return {
    ...row,
    monitored_assets: JSON.parse(row.monitored_assets),
    pattern_filter: JSON.parse(row.pattern_filter),
    ignore_news: !!row.ignore_news,
  };
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM filter_settings WHERE id = 1');
    res.json(serialize(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  const {
    operation_mode, min_score, min_probability, allowed_start_time, allowed_end_time,
    monitored_assets, min_volatility, trend_filter, pattern_filter, ignore_news,
  } = req.body;

  try {
    await pool.query(
      `UPDATE filter_settings SET
         operation_mode = $1, min_score = $2, min_probability = $3, allowed_start_time = $4,
         allowed_end_time = $5, monitored_assets = $6, min_volatility = $7, trend_filter = $8,
         pattern_filter = $9, ignore_news = $10
       WHERE id = 1`,
      [
        operation_mode, min_score, min_probability, allowed_start_time, allowed_end_time,
        JSON.stringify(monitored_assets || []), min_volatility || 0, trend_filter || 'ANY',
        JSON.stringify(pattern_filter || []), !!ignore_news,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM filter_settings WHERE id = 1');
    res.json(serialize(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
