import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { runBacktest } from '../api/client';

function StatCard({ label, value, sub }) {
  return (
    <div className="panel p-4">
      <p className="label-eyebrow mb-1.5">{label}</p>
      <p className="text-2xl font-mono font-semibold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Backtest() {
  const [asset, setAsset] = useState('EUR/USD');
  const [candleCount, setCandleCount] = useState(500);
  const [minScore, setMinScore] = useState(70);
  const [minProbability, setMinProbability] = useState(60);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const data = await runBacktest(asset.trim().toUpperCase(), { candles: candleCount, minScore, minProbability });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="panel p-5 space-y-4">
        <div>
          <p className="label-eyebrow mb-1">Backtest</p>
          <p className="text-sm text-slate-400">
            Roda o mesmo motor de score em cima de candles históricos, sem nunca olhar o futuro em cada ponto —
            simula exatamente o que a análise ao vivo teria dito naquele momento, e confere com o que realmente
            aconteceu na vela seguinte. É a forma mais rápida de saber se o score realmente prevê alguma coisa.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Ativo</label>
            <input
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Candles (M5)</label>
            <input
              type="number" min={230} max={1500} step={10}
              value={candleCount}
              onChange={(e) => setCandleCount(parseInt(e.target.value) || 500)}
              className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Score mínimo</label>
            <input
              type="number" min={0} max={100}
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
              className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Probabilidade mínima</label>
            <input
              type="number" min={0} max={100}
              value={minProbability}
              onChange={(e) => setMinProbability(parseInt(e.target.value) || 0)}
              className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
            />
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="text-sm px-4 py-2 rounded-md bg-call text-base-950 font-medium hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Rodando backtest... (pode levar alguns segundos)' : '▶ Rodar backtest'}
        </button>

        <p className="text-[11px] text-slate-600">
          Mais candles = resultado mais confiável, mas mais lento e mais pesado pro limite de requisições da
          Twelve Data (é só uma chamada por backtest, mas o plano gratuito tem limite de tamanho de resposta).
        </p>
      </div>

      {error && <div className="panel p-4 border-put/40 text-put text-sm">{error}</div>}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Sinais avaliados" value={result.totalTrades} />
            <StatCard label="Win Rate geral" value={`${result.winRate}%`} sub={`${result.wins}W / ${result.losses}L`} />
            <StatCard label="CALL" value={result.callWinRate !== null ? `${result.callWinRate}%` : '—'} sub={`${result.callCount} sinais`} />
            <StatCard label="PUT" value={result.putWinRate !== null ? `${result.putWinRate}%` : '—'} sub={`${result.putCount} sinais`} />
          </div>

          {result.scoreBandStats.length > 0 && (
            <div className="panel p-5">
              <p className="label-eyebrow mb-4">Win rate por faixa de score</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={result.scoreBandStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B2530" />
                  <XAxis dataKey="band" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} unit="%" />
                  <Tooltip
                    contentStyle={{ background: '#131A22', border: '1px solid #28333F', borderRadius: 8 }}
                    formatter={(value, name, item) => [`${value}% (${item.payload.total} sinais)`, 'Win rate']}
                  />
                  <Bar dataKey="winRate" fill="#2DD4A7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-[11px] text-slate-600">
            Período simulado: {result.period.from} até {result.period.to} ({result.candlesAnalyzed} candles).
            Resultado passado não garante resultado futuro — use isso para calibrar os filtros da aba Análise,
            não como promessa de lucro.
          </p>
        </div>
      )}
    </div>
  );
}
