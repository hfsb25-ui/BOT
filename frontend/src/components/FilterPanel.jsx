import React from 'react';

const ALL_ASSETS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/JPY', 'BTC/USD'];
const ALL_PATTERNS = ['Pin Bar', 'Engolfo', 'Martelo', 'Doji', 'Pullback', 'BOS', 'CHOCH', 'Falso Rompimento', 'Liquidez'];

export default function FilterPanel({ filters, onChange }) {
  if (!filters) return null;

  function set(patch) {
    onChange({ ...filters, ...patch });
  }

  function toggleAsset(asset) {
    const list = filters.monitored_assets.includes(asset)
      ? filters.monitored_assets.filter((a) => a !== asset)
      : [...filters.monitored_assets, asset];
    set({ monitored_assets: list });
  }

  function togglePattern(pattern) {
    const list = filters.pattern_filter.includes(pattern)
      ? filters.pattern_filter.filter((p) => p !== pattern)
      : [...filters.pattern_filter, pattern];
    set({ pattern_filter: list });
  }

  return (
    <div className="panel p-5 space-y-5">
      <div>
        <p className="label-eyebrow mb-2">Modo de operacao</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'CALL_ONLY', label: 'Apenas CALL' },
            { id: 'PUT_ONLY', label: 'Apenas PUT' },
            { id: 'CALL_PUT', label: 'CALL e PUT' },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => set({ operation_mode: opt.id })}
              className={`text-xs py-2 rounded-md border transition-colors ${
                filters.operation_mode === opt.id
                  ? 'bg-call/15 border-call/50 text-call'
                  : 'border-base-700 text-slate-400 hover:border-base-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Score minimo: <span className="text-slate-300 font-mono">{filters.min_score}</span></p>
        <input
          type="range" min="0" max="100" value={filters.min_score}
          onChange={(e) => set({ min_score: parseInt(e.target.value) })}
          className="w-full accent-call"
        />
      </div>

      <div>
        <p className="label-eyebrow mb-2">Probabilidade minima: <span className="text-slate-300 font-mono">{filters.min_probability}%</span></p>
        <input
          type="range" min="0" max="100" value={filters.min_probability}
          onChange={(e) => set({ min_probability: parseFloat(e.target.value) })}
          className="w-full accent-call"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="label-eyebrow mb-1.5">Horario inicial</p>
          <input
            type="time" value={filters.allowed_start_time}
            onChange={(e) => set({ allowed_start_time: e.target.value })}
            className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div>
          <p className="label-eyebrow mb-1.5">Horario final</p>
          <input
            type="time" value={filters.allowed_end_time}
            onChange={(e) => set({ allowed_end_time: e.target.value })}
            className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
          />
        </div>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Ativos monitorados</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_ASSETS.map((asset) => (
            <button
              key={asset}
              onClick={() => toggleAsset(asset)}
              className={`text-xs px-2.5 py-1.5 rounded-md border font-mono transition-colors ${
                filters.monitored_assets.includes(asset)
                  ? 'bg-base-700 border-base-600 text-slate-100'
                  : 'border-base-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Tendencia</p>
        <select
          value={filters.trend_filter}
          onChange={(e) => set({ trend_filter: e.target.value })}
          className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="ANY">Qualquer</option>
          <option value="ALTA">Somente Alta</option>
          <option value="BAIXA">Somente Baixa</option>
          <option value="LATERAL">Somente Lateral</option>
        </select>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Padroes graficos aceitos</p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PATTERNS.map((p) => (
            <button
              key={p}
              onClick={() => togglePattern(p)}
              className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                filters.pattern_filter.includes(p)
                  ? 'bg-gold/15 border-gold/50 text-gold'
                  : 'border-base-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-600 mt-1.5">Nenhum selecionado = aceita todos os padroes.</p>
      </div>

      <div>
        <p className="label-eyebrow mb-2">Volatilidade minima (ATR %)</p>
        <input
          type="number" step="0.01" min="0" value={filters.min_volatility}
          onChange={(e) => set({ min_volatility: parseFloat(e.target.value) || 0 })}
          className="w-full bg-base-800 border border-base-700 rounded-md px-2 py-1.5 text-sm font-mono"
        />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox" checked={filters.ignore_news}
          onChange={(e) => set({ ignore_news: e.target.checked })}
          className="accent-call w-4 h-4"
        />
        <span className="text-sm text-slate-300">Ignorar filtro de noticias economicas</span>
      </label>
    </div>
  );
}
