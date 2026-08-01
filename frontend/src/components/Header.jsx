import React from 'react';

export default function Header({ activeTab, onChangeTab }) {
  const tabs = [
    { id: 'analise', label: 'Analise' },
    { id: 'historico', label: 'Historico' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'backtest', label: 'Backtest' },
  ];

  return (
    <header className="border-b border-base-700 bg-base-900/60 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-call to-base-700 flex items-center justify-center font-mono font-bold text-base-950">
            M5
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 leading-tight">Analisador Inteligente</h1>
            <p className="text-[11px] text-slate-500 leading-tight">Opcoes binarias &middot; Timeframe M5</p>
          </div>
        </div>
        <nav className="flex gap-1 bg-base-800 rounded-lg p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => onChangeTab(t.id)}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === t.id ? 'bg-base-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
