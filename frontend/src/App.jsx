import React, { useEffect, useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import PairCard from './components/PairCard';
import CandleChart from './components/CandleChart';
import { OpportunityCard, NoTradeCard } from './components/SignalCard';
import HistoryTable from './components/HistoryTable';
import Dashboard from './components/Dashboard';
import { fetchFilters, updateFilters, fetchSignal, addHistoryEntry, resolvePendingHistory } from './api/client';
import { formatTime, formatLocalDate } from './utils/format';
import { playAlertSound, notifyOpportunity, requestNotificationPermission } from './utils/alerts';

// Reavalia o resultado contra os filtros que dependem de varios criterios ao mesmo
// tempo (modo de operacao, tendencia, padroes, volatilidade). O backend ja filtra
// por score/probabilidade minimos; o resto e reavaliado aqui.
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
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Estado de cada par monitorado: { status: 'idle'|'loading'|'opportunity'|'no_trade'|'error', data, lastUpdated, error }
  const [pairStates, setPairStates] = useState({});
  const [refreshingAll, setRefreshingAll] = useState(false);

  const [autoMonitor, setAutoMonitor] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState(60000);
  const [opportunityFeed, setOpportunityFeed] = useState([]);
  const [resultsFeed, setResultsFeed] = useState([]);
  const alertedKeysRef = useRef(new Set());
  const pollingRef = useRef(false);

  useEffect(() => {
    fetchFilters().then((f) => {
      setFilters(f);
      if (f.monitored_assets?.length) setSelectedAsset(f.monitored_assets[0]);
    });
  }, []);

  // Verifica automaticamente se operacoes PENDING ja expiraram e, se sim, se
  // teriam dado WIN ou LOSS - roda sozinho o tempo todo enquanto o site estiver
  // aberto, independente da aba, pra voce acompanhar a assertividade em tempo real.
  useEffect(() => {
    async function checkResults() {
      try {
        const { resolved } = await resolvePendingHistory();
        if (resolved?.length) {
          setResultsFeed((feed) => [...resolved.map((r) => ({ ...r, checkedAt: new Date().toISOString() })), ...feed].slice(0, 30));
        }
      } catch (e) {
        console.error('Falha ao verificar resultados pendentes', e);
      }
    }
    checkResults();
    const id = setInterval(checkResults, 30000);
    return () => clearInterval(id);
  }, []);

  const handleFilterChange = useCallback(async (newFilters) => {
    setFilters(newFilters);
    try {
      await updateFilters(newFilters);
    } catch (e) {
      console.error('Falha ao salvar filtros', e);
    }
  }, []);

  // Roda a analise de UM par e atualiza o card dele. `alert` liga o som/notificacao
  // (usado so pelo monitoramento automatico, para nao "apitar" toda vez que o
  // usuario clica manualmente em atualizar).
  const runAnalysisForAsset = useCallback(async (asset, { alert = false } = {}) => {
    if (!filters) return null;
    setPairStates((prev) => ({ ...prev, [asset]: { ...(prev[asset] || {}), status: 'loading' } }));
    try {
      const raw = await fetchSignal(asset, { minScore: filters.min_score, minProbability: filters.min_probability });
      const result = applyClientFilters(raw, filters);
      const now = new Date().toISOString();
      setPairStates((prev) => ({
        ...prev,
        [asset]: { status: result.status === 'OPPORTUNITY' ? 'opportunity' : 'no_trade', data: result, lastUpdated: now },
      }));

      if (alert && result.status === 'OPPORTUNITY') {
        const key = `${result.asset}-${result.entryTime}`;
        if (!alertedKeysRef.current.has(key)) {
          alertedKeysRef.current.add(key);
          playAlertSound();
          notifyOpportunity(result, formatTime(result.entryTime));
          setOpportunityFeed((feed) => [result, ...feed].slice(0, 20));
        }
      }
      return result;
    } catch (e) {
      const message = e.response?.data?.error || e.message;
      setPairStates((prev) => ({ ...prev, [asset]: { status: 'error', error: message, lastUpdated: new Date().toISOString() } }));
      return null;
    }
  }, [filters]);

  // Atualiza todos os pares monitorados, um de cada vez (evita estourar o limite
  // de requisicoes da Twelve Data ao disparar tudo de uma vez).
  const refreshAllPairs = useCallback(async () => {
    if (!filters?.monitored_assets?.length) return;
    setRefreshingAll(true);
    for (const asset of filters.monitored_assets) {
      await runAnalysisForAsset(asset);
    }
    setRefreshingAll(false);
  }, [filters, runAnalysisForAsset]);

  // Monitoramento automatico: repete a verificacao de todos os pares no intervalo
  // escolhido e dispara alerta (som + notificacao) quando encontra oportunidade nova.
  useEffect(() => {
    if (!autoMonitor || !filters?.monitored_assets?.length) return;
    let cancelled = false;

    async function pollOnce() {
      if (pollingRef.current) return;
      pollingRef.current = true;
      for (const asset of filters.monitored_assets) {
        if (cancelled) break;
        await runAnalysisForAsset(asset, { alert: true });
      }
      pollingRef.current = false;
    }

    pollOnce();
    const id = setInterval(pollOnce, pollIntervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [autoMonitor, filters, pollIntervalMs, runAnalysisForAsset]);

  function toggleAutoMonitor() {
    if (!autoMonitor) requestNotificationPermission();
    setAutoMonitor((v) => !v);
  }

  const selectedState = selectedAsset ? pairStates[selectedAsset] : null;

  async function saveToHistory() {
    if (!selectedState || selectedState.status !== 'opportunity') return;
    const signal = selectedState.data;
    await addHistoryEntry({
      date: formatLocalDate(signal.entryTime),
      time: formatTime(signal.entryTime),
      entry_time_utc: signal.entryTime,
      asset: signal.asset,
      operation: signal.operation,
      score: signal.score,
      probability: signal.probability,
      result: 'PENDING',
      pattern: signal.priceActionPatterns?.[0]?.pattern || null,
    });
    alert('Operacao registrada no historico como PENDING. O sistema vai verificar sozinho se deu WIN ou LOSS assim que a vela fechar.');
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
              {/* Controles: atualizar tudo + monitoramento automatico */}
              <div className="panel p-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={refreshAllPairs}
                  disabled={refreshingAll || !filters}
                  className="text-sm px-3.5 py-1.5 rounded-md bg-call text-base-950 font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {refreshingAll ? 'Atualizando...' : '⟳ Atualizar todos os pares'}
                </button>

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
                  a cada
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
              </div>

              {/* Legenda simples */}
              <p className="text-[12px] text-slate-500">
                🟢 Verde = oportunidade de <strong>compra (CALL)</strong> &nbsp;·&nbsp;
                🔴 Vermelho = oportunidade de <strong>venda (PUT)</strong> &nbsp;·&nbsp;
                ⚪ Cinza = sem oportunidade no momento. Clique em qualquer par para ver os detalhes completos abaixo.
              </p>

              {/* Grade com todos os pares monitorados */}
              {filters && (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filters.monitored_assets.map((asset) => (
                    <PairCard
                      key={asset}
                      asset={asset}
                      state={pairStates[asset]}
                      isSelected={asset === selectedAsset}
                      onSelect={setSelectedAsset}
                      onRefresh={(a) => runAnalysisForAsset(a)}
                    />
                  ))}
                </div>
              )}

              {filters && filters.monitored_assets.length === 0 && (
                <div className="panel p-8 text-center text-slate-500">
                  Nenhum ativo marcado. Marque ao menos um em "Ativos monitorados", no painel de filtros à esquerda.
                </div>
              )}

              {/* Detalhe completo do par selecionado */}
              {selectedAsset && (
                <div>
                  <p className="label-eyebrow mb-2">Detalhes de {selectedAsset}</p>
                  {!selectedState && (
                    <div className="panel p-8 text-center text-slate-500">
                      Clique no ícone ⟳ do card de {selectedAsset} para rodar a análise.
                    </div>
                  )}
                  {selectedState?.status === 'error' && (
                    <div className="panel p-4 border-put/40 text-put text-sm">{selectedState.error}</div>
                  )}
                  {(selectedState?.status === 'opportunity' || selectedState?.status === 'no_trade') && (
                    <div className="panel p-4 mb-4">
                      <p className="label-eyebrow mb-3">Histórico de velas (M5)</p>
                      <CandleChart candles={selectedState.data.candles} />
                    </div>
                  )}
                  {selectedState?.status === 'opportunity' && (
                    <>
                      <OpportunityCard signal={selectedState.data} />
                      <button
                        onClick={saveToHistory}
                        className="text-sm px-4 py-2 mt-3 rounded-md border border-base-700 text-slate-300 hover:border-call/50 hover:text-call"
                      >
                        + Registrar esta operacao no historico
                      </button>
                    </>
                  )}
                  {selectedState?.status === 'no_trade' && <NoTradeCard signal={selectedState.data} />}
                </div>
              )}

              {/* Feed de alertas encontrados durante o monitoramento automatico nesta sessao */}
              {opportunityFeed.length > 0 && (
                <div className="panel p-4">
                  <p className="label-eyebrow mb-3">Alertas recentes desta sessao</p>
                  <ul className="space-y-2">
                    {opportunityFeed.map((op, i) => (
                      <li key={i}>
                        <button
                          onClick={() => setSelectedAsset(op.asset)}
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

              {/* Feed de resultados verificados automaticamente (WIN/LOSS) */}
              {resultsFeed.length > 0 && (
                <div className="panel p-4">
                  <p className="label-eyebrow mb-3">Assertividade verificada automaticamente</p>
                  <ul className="space-y-2">
                    {resultsFeed.map((r, i) => (
                      <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-base-800">
                        <span className="font-mono text-slate-200">{r.asset}</span>
                        <span className={`font-mono font-medium ${r.operation === 'CALL' ? 'text-call' : 'text-put'}`}>{r.operation}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.result === 'WIN' ? 'bg-call/15 text-call' : 'bg-put/15 text-put'}`}>
                          {r.result === 'WIN' ? '✅ WIN' : '❌ LOSS'}
                        </span>
                        <span className="text-slate-500 font-mono text-[11px]">{formatTime(r.checkedAt)}</span>
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
