const express = require('express');
const router = express.Router();
const { generateSignal } = require('../services/signalGenerator');
const { pool } = require('../config/db');

// GET /api/signal/:asset?minScore=70&minProbability=60
router.get('/:asset', async (req, res) => {
  const asset = decodeURIComponent(req.params.asset);
  const minScore = parseInt(req.query.minScore) || 70;
  const minProbability = parseFloat(req.query.minProbability) || 60;

  try {
    const result = await generateSignal(asset, { minScore, minProbability });

    await pool.query(
      `INSERT INTO signals (created_at, asset, entry_time, expiration, operation, score, classification, probability, confidence, trend, justification, indicators_snapshot, reason_no_trade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        new Date().toISOString(),
        asset,
        result.entryTime || result.time,
        'M5',
        result.status === 'OPPORTUNITY' ? result.operation : 'NO_TRADE',
        result.score,
        result.classification,
        result.probability,
        result.confidence || null,
        result.trend,
        JSON.stringify(result.justification || result.reasons || []),
        JSON.stringify(result.indicatorsSnapshot || {}),
        result.status === 'NO_TRADE' ? JSON.stringify(result.reasons) : null,
      ]
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
