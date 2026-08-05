function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

function render() {
  chrome.storage.local.get(['pairStates', 'lastPolledAt', 'skippedOtc'], (data) => {
    const list = document.getElementById('list');
    const lastPolled = document.getElementById('lastPolled');

    lastPolled.textContent = data.lastPolledAt
      ? `Ultima verificacao: ${formatTime(data.lastPolledAt)}`
      : 'Nunca verificado ainda';

    const entries = Object.entries(data.pairStates || {});
    if (entries.length === 0) {
      list.innerHTML = '<p id="empty">Nenhum par monitorado (nao-OTC) configurado. Ajuste em "Ativos monitorados" no site.</p>';
      return;
    }

    list.innerHTML = entries.map(([asset, d]) => {
      let cls = 'neutral', text = 'sem oportunidade';
      if (d.status === 'OPPORTUNITY') {
        cls = d.operation === 'CALL' ? 'call' : 'put';
        text = `${d.operation} · ${d.score}/100`;
      }
      return `<div class="row"><span>${asset}</span><span class="badge ${cls}">${text}</span></div>`;
    }).join('');
  });
}

document.getElementById('pollNow').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'POLL_NOW' }, () => render());
});

document.getElementById('openOptions').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

render();
