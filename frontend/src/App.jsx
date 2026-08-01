import React, { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import FilterPanel from './components/FilterPanel';
import AssetSelector from './components/AssetSelector';
import { OpportunityCard, NoTradeCard } from './components/SignalCard';
import HistoryTable from './components/HistoryTable';
import Dashboard from './components/Dashboard';
import { fetchFilters, updateFilters, fetchSignal, addHistoryEntry } from './api/client';

export default function App() {
  const [tab, setTab] = useState('analise');
  const [filters, setFilters] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFilters().then((f) => {
      setFilters(f);
      if (f.monitored_assets?.length) setSelectedAsset(f.monitored_assets[0]);
    });
  }, []);

  // Salva os filtros no backend sempre que mudam (filtros funcionando "em tempo real")
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
      const result = await fetchSignal(selectedAsset, {
        minScore: filters.min_score,
        minProbability: filters.min_probability,
      });

      // Aplica filtros adicionais no client: modo de operacao, tendencia e padroes aceitos
      if (result.status === 'OPPORTUNITY') {
        if (filters.operation_mode === 'CALL_ONLY' && result.operation !== 'CALL') {
          result.status = 'NO_TRADE';
          result.reasons = ['Filtro configurado para aceitar apenas operacoes CALL'];
          result.time = result.entryTime;
        } else if (filters.operation_mode === 'PUT_ONLY' && result.operation !== 'PUT') {
          result.status = 'NO_TRADE';
          result.reasons = ['Filtro configurado para aceitar apenas operacoes PUT'];
          result.time = result.entryTime;
        } else if (filters.trend_filter !== 'ANY' && result.trend !== filters.trend_filter) {
          result.status = 'NO_TRADE';
          result.reasons = [`Filtro exige tendencia ${filters.trend_filter}, mercado esta em ${result.trend}`];
          result.time = result.entryTime;
        } else if (filters.pattern_filter?.length > 0) {
          const foundNames = (result.priceActionPatterns || []).map((p) => p.pattern);
          const matches = filters.pattern_filter.some((accepted) => foundNames.some((f) => f.includes(accepted)));
          if (!matches) {
            result.status = 'NO_TRADE';
            result.reasons = ['Padrao de price action encontrado nao esta na lista de padroes aceitos pelo filtro'];
            result.time = result.entryTime;
          }
        }
      }

      setSignal(result);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAsset]);

  async function saveToHistory() {
    if (!signal || signal.status !== 'OPPORTUNITY') return;
    const now = new Date();
    await addHistoryEntry({
      date: now.toISOString().slice(0, 10),
      time: signal.entryTime,
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

              {error && (
                <div className="panel p-4 border-put/40 text-put text-sm">{error}</div>
              )}

              {!signal && !error && (
                <div className="panel p-10 text-center text-slate-500">
                  Selecione um ativo e clique em "Analisar agora" para rodar a analise de contexto de mercado.
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
            </section>
          </div>
        )}

        {tab === 'historico' && <HistoryTable />}
        {tab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
