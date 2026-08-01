const express = require('express');
const router = express.Router();
const { runBacktest } = require('../services/backtest');

// GET /api/backtest/:asset?candles=500&minScore=70&minProbability=60
router.get('/:asset', async (req, res) => {
  const asset = decodeURIComponent(req.params.asset);
  const totalCandles = parseInt(req.query.candles) || 500;
  const minScore = parseInt(req.query.minScore) || 0;
  const minProbability = parseFloat(req.query.minProbability) || 0;

  try {
    const result = await runBacktest(asset, { totalCandles, minScore, minProbability });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
