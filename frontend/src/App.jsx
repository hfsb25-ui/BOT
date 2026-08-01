import React, { useEffect, useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import AssetSelector from './components/AssetSelector';
import { OpportunityCard, NoTradeCard } from './components/SignalCard';
import HistoryTable from './components/HistoryTable';
import Dashboard from './components/Dashboard';
import { fetchFilters, updateFilters, fetchSignal, addHistoryEntry } from './api/client';
import { formatTime, formatLocalDate } from './utils/format';
import { playAlertSound, notifyOpportunity, requestNotificationPermission } from './utils/alerts';

// Aplica os filtros que dependem do resultado completo do sinal (o backend ja aplica
// minScore/minProbability; o resto - modo de operacao, tendencia, padroes, volatilidade -
// e reavaliado aqui porque depende de coisas que so fazem sentido no client, como
// combinar varios criterios). Usada tanto na analise manual quanto no monitoramento automatico.
function applyClientFilters(result, filters) {
  if (result.status !== 'OPPORTUNITY') return result;

  if (filters.operation_mode === 'CALL_ONLY' && result.operation !== 'CALL') {
    return { ...result, status: 'NO_TRADE', reasons: ['Filtro configurado para aceitar apenas operacoes CALL'], time: result.entryTime };
  }
  if (filters.operation_mode === 'PUT_ONLY' && result.operation !== 'PUT') {
    return { ...result, status: 'NO_TRADE', reasons: ['Filtro configurado para aceitar apenas operacoes PUT'], time: result.entryTime };
  }
  if (filters.trend_filter !== 'ANY' && result.trend !== filters.trend_filter) {
    return { ...result, status: 'NO_TRADE', reasons: [`Filtro exige tendencia ${filters.trend_filter}, mercado esta em ${result.trend}`], time: result.entryTime };
  }
  if (filters.pattern_filter?.length > 0) {
    const foundNames = (result.priceActionPatterns || []).map((p) => p.pattern);
    const matches = filters.pattern_filter.some((accepted) => foundNames.some((f) => f.includes(accepted)));
    if (!matches) {
      return { ...result, status: 'NO_TRADE', reasons: ['Padrao de price action encontrado nao esta na lista de padroes aceitos pelo filtro'], time: result.entryTime };
    }
  }
  if (filters.min_volatility > 0) {
    const snap = result.indicatorsSnapshot;
    const atrPct = snap?.atr && snap?.price ? (snap.atr / snap.price) * 100 : null;
    if (atrPct !== null && atrPct < filters.min_volatility) {
      return { ...result, status: 'NO_TRADE', reasons: [`Volatilidade atual (${atrPct.toFixed(3)}%) abaixo do minimo configurado no filtro (${filters.min_volatility}%)`], time: result.entryTime };
    }
  }
  return result;
}

export default function App() {
  const [tab, setTab] = useState('analise');
  const [filters, setFilters] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Monitoramento automatico + alertas ---------------------------------
  const [autoMonitor, setAutoMonitor] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(60000);
  const [opportunityFeed, setOpportunityFeed] = useState([]);
  const alertedKeysRef = useRef(new Set());
  const pollingRef = useRef(false);

  useEffect(() => {
    fetchFilters().then((f) => {
      setFilters(f);
      if (f.monitored_assets?.length) setSelectedAsset(f.monitored_assets[0]);
    });
  }, []);

  const handleFilterChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    try {
      await updateFilters(newFilters);
    } catch (e) {
      console.error('Falha ao salvar filtros', e);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!filters) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await fetchSignal(selectedAsset, {
        minScore: filters.min_score,
        minProbability: filters.min_probability,
      });
      setSignal(applyClientFilters(raw, filters));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAsset]);

  // Loop de monitoramento: enquanto autoMonitor estiver ligado, verifica todos os
  // ativos monitorados a cada `pollIntervalMs` e dispara alerta quando uma nova
  // oportunidade (ainda nao alertada) aparecer.
  useEffect(() => {
    if (!autoMonitor || !filters || !filters.monitored_assets?.length) return;
    let cancelled = false;

    async function pollOnce() {
      if (pollingRef.current) return;
      pollingRef.current = true;
      for (const asset of filters.monitored_assets) {
        if (cancelled) break;
        try {
          const raw = await fetchSignal(asset, { minScore: filters.min_score, minProbability: filters.min_probability });
          const result = applyClientFilters(raw, filters);
          if (result.status === 'OPPORTUNITY') {
            const key = `${result.asset}-${result.entryTime}`;
            if (!alertedKeysRef.current.has(key)) {
              alertedKeysRef.current.add(key);
              playAlertSound();
              notifyOpportunity(result, formatTime(result.entryTime));
              setOpportunityFeed((feed) => [result, ...feed].slice(0, 20));
              setSelectedAsset(result.asset);
              setSignal(result);
            }
          }
        } catch (e) {
          console.error('Falha ao monitorar', asset, e.message);
        }
      }
      pollingRef.current = false;
    }

    pollOnce();
    const id = setInterval(pollOnce, pollIntervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [autoMonitor, filters, pollIntervalMs]);

  function toggleAutoMonitor() {
    if (!autoMonitor) requestNotificationPermission();
    setAutoMonitor((v) => !v);
  }

  async function saveToHistory() {
    if (!signal || signal.status !== 'OPPORTUNITY') return;
    await addHistoryEntry({
      date: formatLocalDate(signal.entryTime),
      time: formatTime(signal.entryTime),
      asset: signal.asset,
      operation: signal.operation,
      score: signal.score,
      probability: signal.probability,
      result: 'PENDING',
      pattern: signal.priceActionPatterns?.[0]?.pattern || null,
    });
    alert('Operacao registrada no historico como PENDING. Atualize o resultado (WIN/LOSS) na aba Historico apos a expiracao.');
  }

  return (
    <div className="min-h-screen">
      <Header activeTab={tab} onChangeTab={setTab} />
      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'analise' && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            <aside>
              <FilterPanel filters={filters} onChange={handleFilterChange} />
            </aside>
            <section className="space-y-5">
              {filters && (
                <AssetSelector
                  assets={filters.monitored_assets}
                  selected={selectedAsset}
                  onSelect={setSelectedAsset}
                  onRefresh={runAnalysis}
                  loading={loading}
                />
              )}

              {/* Monitoramento automatico */}
              <div className="panel p-4 flex flex-wrap items-center gap-4">
                <button
                  onClick={toggleAutoMonitor}
                  className={`flex items-center gap-2 text-sm px-3.5 py-1.5 rounded-md font-medium transition-colors ${
                    autoMonitor ? 'bg-call/15 text-call border border-call/40' : 'bg-base-800 text-slate-300 border border-base-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${autoMonitor ? 'bg-call animate-pulse' : 'bg-slate-600'}`} />
                  {autoMonitor ? 'Monitorando automaticamente' : 'Ligar monitoramento automatico'}
                </button>

                <label className="flex items-center gap-2 text-sm text-slate-400">
                  Verificar a cada
                  <select
                    value={pollIntervalMs}
                    onChange={(e) => setPollIntervalMs(parseInt(e.target.value))}
                    className="bg-base-800 border border-base-700 rounded-md px-2 py-1 text-sm text-slate-200"
                  >
                    <option value={30000}>30s</option>
                    <option value={60000}>60s</option>
                    <option value={120000}>2min</option>
                  </select>
                </label>

                {autoMonitor && (
                  <span className="text-[11px] text-slate-500">
                    Verificando {filters?.monitored_assets?.length || 0} ativo(s) · alerta sonoro + notificacao ao encontrar oportunidade
                  </span>
                )}
              </div>

              {error && (
                <div className="panel p-4 border-put/40 text-put text-sm">{error}</div>
              )}

              {!signal && !error && (
                <div className="panel p-10 text-center text-slate-500">
                  Selecione um ativo e clique em "Analisar agora", ou ligue o monitoramento automatico acima.
                </div>
              )}

              {signal?.status === 'OPPORTUNITY' && (
                <>
                  <OpportunityCard signal={signal} />
                  <button
                    onClick={saveToHistory}
                    className="text-sm px-4 py-2 rounded-md border border-base-700 text-slate-300 hover:border-call/50 hover:text-call"
                  >
                    + Registrar esta operacao no historico
                  </button>
                </>
              )}

              {signal?.status === 'NO_TRADE' && <NoTradeCard signal={signal} />}

              {/* Feed de alertas encontrados durante o monitoramento automatico nesta sessao */}
              {opportunityFeed.length > 0 && (
                <div className="panel p-4">
                  <p className="label-eyebrow mb-3">Alertas recentes desta sessao</p>
                  <ul className="space-y-2">
                    {opportunityFeed.map((op, i) => (
                      <li key={i}>
                        <button
                          onClick={() => { setSelectedAsset(op.asset); setSignal(op); }}
                          className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-md bg-base-800 hover:bg-base-700 transition-colors"
                        >
                          <span className="font-mono text-slate-200">{op.asset}</span>
                          <span className={`font-mono font-medium ${op.operation === 'CALL' ? 'text-call' : 'text-put'}`}>{op.operation}</span>
                          <span className="text-slate-400 font-mono">{formatTime(op.entryTime)}</span>
                          <span className="text-slate-400 font-mono">{op.score}/100</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'historico' && <HistoryTable />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
