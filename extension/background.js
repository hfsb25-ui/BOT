// Service worker da extensao: roda em segundo plano, verifica os pares
// monitorados (usando a MESMA configuracao de filtros do site) e dispara
// notificacao quando encontra uma oportunidade nova - independente de qual
// aba/site voce estiver com o navegador aberto.
//
// So considera pares SEM "OTC" no nome: pares OTC sao precos sinteticos
// gerados pela propria corretora e nao tem relacao com o mercado real que
// o backend analisa (ver docs/DEPLOY.md do projeto principal para o motivo).

const ALARM_NAME = 'analisador-m5-poll';
const DEFAULT_INTERVAL_MINUTES = 1; // menor intervalo permitido pela API de alarms do Chrome

async function getSettings() {
  const { backendUrl } = await chrome.storage.sync.get('backendUrl');
  return { backendUrl: (backendUrl || '').replace(/\/+$/, '') };
}

function isOtcAsset(asset) {
  return /otc/i.test(asset);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function pollSignals() {
  const { backendUrl } = await getSettings();
  if (!backendUrl) return; // extensao ainda nao configurada (ver options.html)

  let filters;
  try {
    filters = await fetchJson(`${backendUrl}/api/filters`);
  } catch (e) {
    console.error('[Analisador M5] Falha ao buscar filtros:', e.message);
    return;
  }

  const assets = (filters.monitored_assets || []).filter((a) => !isOtcAsset(a));
  const skippedOtc = (filters.monitored_assets || []).filter(isOtcAsset);

  const { alertedKeys = [] } = await chrome.storage.local.get('alertedKeys');
  const alertedSet = new Set(alertedKeys);
  const pairStates = {};

  for (const asset of assets) {
    try {
      const result = await fetchJson(
        `${backendUrl}/api/signal/${encodeURIComponent(asset)}?minScore=${filters.min_score}&minProbability=${filters.min_probability}`
      );
      pairStates[asset] = result;

      if (result.status === 'OPPORTUNITY') {
        const key = `${result.asset}-${result.entryTime}`;
        if (!alertedSet.has(key)) {
          alertedSet.add(key);
          const timeLabel = new Date(result.entryTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          chrome.notifications.create(key, {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: `${result.asset} - ${result.operation} ${timeLabel}`,
            message: `Expiracao: M5 · Score ${result.score}/100 · Probabilidade ${result.probability}%`,
            priority: 2,
          });
        }
      }
    } catch (e) {
      console.error(`[Analisador M5] Falha ao analisar ${asset}:`, e.message);
    }
  }

  // Mantem so as ultimas 50 chaves alertadas (evita crescer pra sempre)
  const trimmedKeys = Array.from(alertedSet).slice(-50);
  await chrome.storage.local.set({
    alertedKeys: trimmedKeys,
    pairStates,
    skippedOtc,
    lastPolledAt: new Date().toISOString(),
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: DEFAULT_INTERVAL_MINUTES });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: DEFAULT_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) pollSignals();
});

// Permite forcar uma verificacao manual a partir do popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'POLL_NOW') {
    pollSignals().then(() => sendResponse({ ok: true }));
    return true; // resposta assincrona
  }
});
