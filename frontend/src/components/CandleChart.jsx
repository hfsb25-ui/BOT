import React from 'react';

const CALL_COLOR = '#2DD4A7';
const PUT_COLOR = '#FB6B5B';
const EMA20_COLOR = '#E8B95C';
const EMA50_COLOR = '#93A4B8';

// O campo `time` vem da Twelve Data como "YYYY-MM-DD HH:MM:SS" - extrai so o HH:MM
// sem depender de parsing de Date (evita problemas de fuso/formato entre navegadores).
function timeLabel(t) {
  const s = String(t);
  const part = s.split(/[ T]/)[1];
  return (part || s).slice(0, 5);
}

// Grafico de velas (candlestick) em SVG puro, com EMA20/EMA50 sobrepostas.
// Recebe os candles ja recortados pelo backend (ver signalGenerator.js).
export default function CandleChart({ candles }) {
  if (!candles || candles.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">Sem dados de velas para exibir.</p>;
  }

  const width = 720;
  const height = 260;
  const padL = 50, padR = 12, padT = 12, padB = 24;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const values = candles.flatMap((c) => [c.high, c.low, c.ema20, c.ema50].filter((v) => v !== null && v !== undefined));
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = maxV - minV || 1;

  const n = candles.length;
  const slot = chartW / n;
  const bodyW = Math.max(2, slot * 0.6);

  const yFor = (v) => padT + (1 - (v - minV) / range) * chartH;
  const xFor = (i) => padL + i * slot + slot / 2;

  function linePath(key) {
    let d = '';
    candles.forEach((c, i) => {
      if (c[key] === null || c[key] === undefined) return;
      d += `${d === '' ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(c[key]).toFixed(1)} `;
    });
    return d;
  }

  const labelStep = Math.max(1, Math.floor(n / 6));
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map((t) => minV + t * range);
  const decimals = maxV < 10 ? 4 : 2;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {gridLevels.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={yFor(v)} y2={yFor(v)} stroke="#1B2530" strokeWidth="1" />
            <text x={2} y={yFor(v) + 3} fontSize="9" fill="#64748b" fontFamily="monospace">{v.toFixed(decimals)}</text>
          </g>
        ))}

        {candles.map((c, i) => {
          const up = c.close >= c.open;
          const color = up ? CALL_COLOR : PUT_COLOR;
          const x = xFor(i);
          const top = yFor(Math.max(c.open, c.close));
          const bottom = yFor(Math.min(c.open, c.close));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={yFor(c.high)} y2={yFor(c.low)} stroke={color} strokeWidth="1" />
              <rect x={x - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
            </g>
          );
        })}

        <path d={linePath('ema20')} fill="none" stroke={EMA20_COLOR} strokeWidth="1.5" opacity="0.9" />
        <path d={linePath('ema50')} fill="none" stroke={EMA50_COLOR} strokeWidth="1.5" opacity="0.75" />

        {candles.map((c, i) => (
          i % labelStep === 0 ? (
            <text key={i} x={xFor(i)} y={height - 6} fontSize="9" fill="#64748b" fontFamily="monospace" textAnchor="middle">
              {timeLabel(c.time)}
            </text>
          ) : null
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block" style={{ background: EMA20_COLOR }} />EMA20</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block" style={{ background: EMA50_COLOR }} />EMA50</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block" style={{ background: CALL_COLOR }} />Vela de alta</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 inline-block" style={{ background: PUT_COLOR }} />Vela de baixa</span>
      </div>
    </div>
  );
}
