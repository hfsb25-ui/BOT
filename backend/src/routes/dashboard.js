const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM history WHERE result IN ('WIN','LOSS')");

    if (rows.length === 0) {
      return res.json({
        totalOperations: 0, wins: 0, losses: 0, winRate: 0, profitFactor: null, maxDrawdown: 0,
        bestAsset: null, worstAsset: null, bestHour: null, statsByPattern: [], assetStats: [], hourStats: [],
      });
    }

    const wins = rows.filter((r) => r.result === 'WIN');
    const losses = rows.filter((r) => r.result === 'LOSS');
    const winRate = (wins.length / rows.length) * 100;

    const grossProfit = wins.reduce((sum, r) => sum + (r.payout ? Number(r.payout) : 0.85), 0);
    const grossLoss = losses.length;
    const profitFactor = grossLoss === 0 ? null : +(grossProfit / grossLoss).toFixed(2);

    const chronological = [...rows].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let equity = 0, peak = 0, maxDrawdown = 0;
    for (const r of chronological) {
      equity += r.result === 'WIN' ? (r.payout ? Number(r.payout) : 0.85) : -1;
      peak = Math.max(peak, equity);
      maxDrawdown = Math.max(maxDrawdown, peak - equity);
    }

    const byAsset = {};
    for (const r of rows) {
      byAsset[r.asset] = byAsset[r.asset] || { asset: r.asset, wins: 0, total: 0 };
      byAsset[r.asset].total += 1;
      if (r.result === 'WIN') byAsset[r.asset].wins += 1;
    }
    const assetStats = Object.values(byAsset).map((a) => ({ ...a, winRate: +((a.wins / a.total) * 100).toFixed(1) }));
    const bestAsset = assetStats.length ? assetStats.reduce((a, b) => (a.winRate >= b.winRate ? a : b)) : null;
    const worstAsset = assetStats.length ? assetStats.reduce((a, b) => (a.winRate <= b.winRate ? a : b)) : null;

    const byHour = {};
    for (const r of rows) {
      const hour = r.time.slice(0, 2);
      byHour[hour] = byHour[hour] || { hour, wins: 0, total: 0 };
      byHour[hour].total += 1;
      if (r.result === 'WIN') byHour[hour].wins += 1;
    }
    const hourStats = Object.values(byHour).map((h) => ({ ...h, winRate: +((h.wins / h.total) * 100).toFixed(1) }));
    const bestHour = hourStats.length ? hourStats.reduce((a, b) => (a.winRate >= b.winRate ? a : b)) : null;

    const byPattern = {};
    for (const r of rows) {
      const key = r.pattern || 'Nao informado';
      byPattern[key] = byPattern[key] || { pattern: key, wins: 0, total: 0 };
      byPattern[key].total += 1;
      if (r.result === 'WIN') byPattern[key].wins += 1;
    }
    const statsByPattern = Object.values(byPattern).map((p) => ({ ...p, winRate: +((p.wins / p.total) * 100).toFixed(1) }));

    res.json({
      totalOperations: rows.length, wins: wins.length, losses: losses.length, winRate: +winRate.toFixed(1),
      profitFactor, maxDrawdown: +maxDrawdown.toFixed(2),
      bestAsset, worstAsset, bestHour, statsByPattern, assetStats, hourStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
