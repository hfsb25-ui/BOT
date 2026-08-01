import React from 'react';
import { formatTime } from '../utils/format';

function ClassificationBadge({ classification, score }) {
  const colors = {
    'Excelente': 'text-call bg-call/15 border-call/40',
    'Muito Bom': 'text-call bg-call/10 border-call/30',
    'Bom': 'text-gold bg-gold/10 border-gold/30',
    'Fraco': 'text-put/80 bg-put/10 border-put/30',
    'Muito Ruim': 'text-put bg-put/15 border-put/40',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${colors[classification] || ''}`}>
      {classification} &middot; {score}/100
    </span>
  );
}

export function OpportunityCard({ signal }) {
  const isCall = signal.operation === 'CALL';

  return (
    <div className={`panel p-6 relative overflow-hidden ${isCall ? 'border-call/30' : 'border-put/30'}`}>
      <div className={`absolute top-0 left-0 w-full h-1 ${isCall ? 'bg-call' : 'bg-put'}`} />
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🟢</span>
          <h2 className="font-semibold text-slate-100">NOVA OPORTUNIDADE</h2>
        </div>
        <ClassificationBadge classification={signal.classification} score={signal.score} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <Field icon="🪙" label="Ativo" value={signal.asset} mono />
        <Field icon="⏰" label="Hora da entrada" value={formatTime(signal.entryTime)} mono />
        <Field icon="⏳" label="Expiracao" value={signal.expiration} mono />
        <Field
          icon="📈"
          label="Operacao"
          value={signal.operation}
          valueClass={isCall ? 'text-call' : 'text-put'}
          mono
        />
        <Field icon="🎯" label="Score" value={`${signal.score}/100`} mono />
        <Field icon="📊" label="Probabilidade" value={`${signal.probability}%`} mono />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🔥</span>
        <span className="text-sm text-slate-400">Nivel de confianca:</span>
        <span className="text-sm font-medium text-slate-200">{signal.confidence}</span>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📌</span>
          <span className="text-sm text-slate-400">Justificativa detalhada</span>
        </div>
        <ul className="space-y-1.5">
          {signal.justification.map((j, i) => (
            <li key={i} className="text-sm text-slate-300 flex gap-2">
              <span className={isCall ? 'text-call' : 'text-put'}>-</span> {j}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-slate-600 mt-5 pt-4 border-t border-base-700">
        Analise tecnica automatizada, nao constitui recomendacao de investimento. Opcoes binarias envolvem alto risco de perda de capital.
      </p>
    </div>
  );
}

export function NoTradeCard({ signal }) {
  return (
    <div className="panel p-6 border-put/20">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔴</span>
        <h2 className="font-semibold text-slate-100">NAO OPERAR AGORA</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <Field icon="🪙" label="Ativo" value={signal.asset} mono />
        <Field icon="⏰" label="Horario" value={formatTime(signal.time)} mono />
        <Field icon="🎯" label="Score" value={`${signal.score}/100`} mono />
        <Field icon="📊" label="Probabilidade" value={`${signal.probability}%`} mono />
      </div>
      <div>
        <p className="text-sm text-slate-400 mb-2">Motivo:</p>
        <ul className="space-y-1.5">
          {signal.reasons.map((r, i) => (
            <li key={i} className="text-sm text-slate-300 flex gap-2">
              <span className="text-put">-</span> {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({ icon, label, value, mono, valueClass }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 flex items-center gap-1 mb-0.5">
        <span>{icon}</span> {label}
      </p>
      <p className={`text-sm font-medium text-slate-100 ${mono ? 'font-mono' : ''} ${valueClass || ''}`}>{value}</p>
    </div>
  );
}
