import React from 'react';

export default function AssetSelector({ assets, selected, onSelect, onRefresh, loading }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {assets.map((asset) => (
        <button
          key={asset}
          onClick={() => onSelect(asset)}
          className={`text-sm font-mono px-3 py-1.5 rounded-md border transition-colors ${
            selected === asset
              ? 'bg-base-700 border-call/50 text-call'
              : 'border-base-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {asset}
        </button>
      ))}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto text-sm px-3.5 py-1.5 rounded-md bg-call text-base-950 font-medium hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Analisando...' : 'Analisar agora'}
      </button>
    </div>
  );
}
