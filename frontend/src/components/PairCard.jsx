import React from 'react';
import { formatTime } from '../utils/format';

// Selo de status do par, em linguagem simples (nada de jargao tecnico aqui).
function StatusBadge({ state }) {
  if (!state || state.status === 'idle') {
    return <span className="text-xs px-2.5 py-1 rounded-full bg-base-800 text-slate-600">Ainda nao analisado</span>;
  }
  if (state.status === 'loading') {
    return <span className="text-xs px-2.5 py-1 rounded-full bg-base-700 text-slate-400 animate-pulse">Analisando...</span>;
  }
  if (state.status === 'error') {
    return <span className="text-xs px-2.5 py-1 rounded-full bg-put/15 text-put">Erro ao analisar</span>;
  }
  if (state.status === 'opportunity') {
    const isCall = state.data.operation === 'CALL';
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isCall ? 'bg-call/15 text-call' : 'bg-put/15 text-put'}`}>
        {isCall ? '🟢 Comprar (CALL)' : '🔴 Vender (PUT)'} · {state.data.score}/100
      </span>
    );
  }
  return <span className="text-xs px-2.5 py-1 rounded-full bg-base-700 text-slate-400">⚪ Sem oportunidade agora</span>;
}

export default function PairCard({ asset, state, onRefresh, onSelect, isSelected }) {
  return (
    <div
      onClick={() => onSelect(asset)}
      className={`panel p-4 text-left cursor-pointer transition-colors ${
        isSelected ? 'border-call/50 ring-1 ring-call/30' : 'hover:border-base-600'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono font-semibold text-slate-100">{asset}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRefresh(asset); }}
          title="Atualizar este par agora"
          className="text-slate-500 hover:text-call text-sm w-7 h-7 flex items-center justify-center rounded-md hover:bg-base-800"
        >
          {state?.status === 'loading' ? '⏳' : '⟳'}
        </button>
      </div>

      <StatusBadge state={state} />

      <p className="text-[11px] text-slate-600 mt-3">
        {state?.lastUpdated ? `Atualizado às ${formatTime(state.lastUpdated)}` : 'Clique em ⟳ para analisar'}
      </p>
    </div>
  );
}
