import React, { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchDashboard } from '../api/client';
import { formatTime } from '../utils/format';

function StatCard({ label, value, sub }) {
  return (
    <div className="panel p-4">
      <p className="label-eyebrow mb-1.5">{label}</p>
      <p className="text-2xl font-mono font-semibold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

const AUTO_REFRESH_MS = 60000;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchDashboard()
      .then((data) => {
        setStats(data);
        setLastUpdated(new Date().toISOString());
      })
      .finally(() => setLoading(false));
  }, []);

  // Busca ao entrar na aba e depois se atualiza sozinho a cada 60s enquanto
  // a aba Dashboard estiver aberta (o intervalo para automaticamente ao trocar de aba).
  useEffect(() => {
    load();
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!stats) return <p className="text-slate-500 text-sm">Carregando estatisticas...</p>;

  const header = (
    <div className="flex items-center justify-between mb-4">
      <p className="text-xs text-slate-500">
        {lastUpdated ? `Atualizado às ${formatTime(lastUpdated)} · atualiza sozinho a cada 60s` : ''}
      </p>
      <button
        onClick={load}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-md border border-base-700 text-slate-300 hover:border-call/50 hover:text-call disabled:opacity-50"
      >
        {loading ? 'Atualizando...' : '⟳ Atualizar agora'}
      </button>
    </div>
  );

  if (stats.totalOperations === 0) {
    return (
      <div>
        {header}
        <div className="panel p-8 text-center">
          <p className="text-slate-400">Ainda nao ha operacoes concluidas (WIN/LOSS) para gerar estatisticas.</p>
        </div>
      </div>
    );
  }

  const patternData = stats.statsByPattern.map((p) => ({ name: p.pattern, winRate: p.winRate }));

  return (
    <div>
      {header}
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W / ${stats.losses}L`} />
          <StatCard label="Profit Factor" value={stats.profitFactor ?? '—'} />
          <StatCard label="Drawdown Maximo" value={stats.maxDrawdown} sub="em unidades de stake" />
          <StatCard label="Total de Operacoes" value={stats.totalOperations} />
          <StatCard label="Melhor Ativo" value={stats.bestAsset?.asset ?? '—'} sub={stats.bestAsset ? `${stats.bestAsset.winRate}% win rate` : ''} />
          <StatCard label="Pior Ativo" value={stats.worstAsset?.asset ?? '—'} sub={stats.worstAsset ? `${stats.worstAsset.winRate}% win rate` : ''} />
          <StatCard label="Melhor Horario" value={stats.bestHour ? `${stats.bestHour.hour}h` : '—'} sub={stats.bestHour ? `${stats.bestHour.winRate}% win rate` : ''} />
        </div>

        {patternData.length > 0 && (
          <div className="panel p-5">
            <p className="label-eyebrow mb-4">Win rate por padrao de price action</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={patternData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B2530" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} unit="%" />
                <Tooltip contentStyle={{ background: '#131A22', border: '1px solid #28333F', borderRadius: 8 }} />
                <Bar dataKey="winRate" fill="#2DD4A7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
