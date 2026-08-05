// Injeta uma bolinha flutuante em qualquer pagina (inclusive a da corretora),
// que abre um painel com o status atual de cada par monitorado. Os dados vem
// do chrome.storage.local, atualizado pelo background.js a cada verificacao.

function buildOverlay() {
  if (document.getElementById('analisador-m5-overlay')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'analisador-m5-overlay';
  wrapper.innerHTML = `
    <div id="analisador-m5-panel">
      <h4>Analisador M5</h4>
      <div id="analisador-m5-list"><p id="analisador-m5-empty">Aguardando primeira verificacao...</p></div>
      <div id="analisador-m5-otc-warning"></div>
    </div>
    <div id="analisador-m5-bubble" title="Analisador M5">M5</div>
  `;
  document.documentElement.appendChild(wrapper);

  const bubble = wrapper.querySelector('#analisador-m5-bubble');
  const panel = wrapper.querySelector('#analisador-m5-panel');
  bubble.addEventListener('click', () => panel.classList.toggle('open'));
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function render(pairStates, skippedOtc) {
  const list = document.getElementById('analisador-m5-list');
  const warning = document.getElementById('analisador-m5-otc-warning');
  if (!list) return;

  const entries = Object.entries(pairStates || {});
  if (entries.length === 0) {
    list.innerHTML = '<p id="analisador-m5-empty">Nenhum par monitorado (nao-OTC) configurado.</p>';
  } else {
    list.innerHTML = entries.map(([asset, data]) => {
      let badgeClass = 'neutral', badgeText = 'sem oportunidade', extra = '';
      if (data.status === 'OPPORTUNITY') {
        badgeClass = data.operation === 'CALL' ? 'call' : 'put';
        badgeText = `${data.operation} · ${data.score}/100`;
        extra = ` · ${formatTime(data.entryTime)}`;
      }
      return `<div class="m5-row"><span class="asset">${asset}${extra}</span><span class="badge ${badgeClass}">${badgeText}</span></div>`;
    }).join('');
  }

  if (skippedOtc && skippedOtc.length > 0) {
    warning.textContent = `⚠ Ignorando ${skippedOtc.length} par(es) OTC (dados sinteticos, sem analise): ${skippedOtc.join(', ')}`;
  } else {
    warning.textContent = '';
  }
}

buildOverlay();

chrome.storage.local.get(['pairStates', 'skippedOtc'], (data) => render(data.pairStates, data.skippedOtc));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.pairStates || changes.skippedOtc) {
    chrome.storage.local.get(['pairStates', 'skippedOtc'], (data) => render(data.pairStates, data.skippedOtc));
  }
});
