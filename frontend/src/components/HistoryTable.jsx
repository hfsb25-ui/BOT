import React, { useEffect, useState, useCallback } from 'react';
import { fetchHistory, updateHistoryResult, deleteHistoryEntry } from '../api/client';

const AUTO_REFRESH_MS = 30000;

export default function HistoryTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega ao abrir a aba e continua se atualizando sozinho enquanto ela estiver
  // aberta, ja que resultados PENDING podem virar WIN/LOSS automaticamente a
  // qualquer momento (ver verificacao automatica que roda em segundo plano).
  useEffect(() => {
    load();
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function setResult(id, result) {
    await updateHistoryResult(id, result);
    load();
  }

  async function remove(id) {
    await deleteHistoryEntry(id);
    load();
  }

  if (loading) return <p className="text-slate-500 text-sm">Carregando historico...</p>;

  if (rows.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-slate-400">Nenhuma operacao registrada ainda.</p>
        <p className="text-slate-600 text-sm mt-1">Operacoes sao adicionadas ao historico a partir de uma oportunidade gerada na aba Analise.</p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-base-700 text-left text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Hora</th>
            <th className="px-4 py-3 font-medium">Ativo</th>
            <th className="px-4 py-3 font-medium">Operacao</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Prob.</th>
            <th className="px-4 py-3 font-medium">Entrada → Fechamento</th>
            <th className="px-4 py-3 font-medium">Resultado</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/40">
              <td className="px-4 py-3 font-mono text-slate-400">{r.date}</td>
              <td className="px-4 py-3 font-mono text-slate-400">{r.time}</td>
              <td className="px-4 py-3 font-mono text-slate-200">{r.asset}</td>
              <td className={`px-4 py-3 font-mono font-medium ${r.operation === 'CALL' ? 'text-call' : 'text-put'}`}>{r.operation}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{r.score}</td>
              <td className="px-4 py-3 font-mono text-slate-300">{r.probability}%</td>
              <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                {r.entry_price && r.close_price ? `${Number(r.entry_price).toFixed(5)} → ${Number(r.close_price).toFixed(5)}` : '—'}
              </td>
              <td className="px-4 py-3">
                {r.result === 'PENDING' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-600">aguardando...</span>
                    <button onClick={() => setResult(r.id, 'WIN')} className="text-xs px-2 py-1 rounded bg-call/15 text-call hover:bg-call/25">WIN</button>
                    <button onClick={() => setResult(r.id, 'LOSS')} className="text-xs px-2 py-1 rounded bg-put/15 text-put hover:bg-put/25">LOSS</button>
                  </div>
                ) : (
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.result === 'WIN' ? 'text-call bg-call/15' : 'text-put bg-put/15'}`}>
                    {r.result}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => remove(r.id)} className="text-slate-600 hover:text-put text-xs">remover</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-slate-600 px-4 py-2 border-t border-base-800">
        Resultados PENDING sao verificados automaticamente assim que a vela correspondente fecha (a cada 30s, em segundo plano). Voce tambem pode marcar manualmente se quiser.
      </p>
    </div>
  );
}
