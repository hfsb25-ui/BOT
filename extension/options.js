const input = document.getElementById('backendUrl');
const status = document.getElementById('status');

chrome.storage.sync.get('backendUrl', (data) => {
  if (data.backendUrl) input.value = data.backendUrl;
});

document.getElementById('save').addEventListener('click', async () => {
  const url = input.value.trim().replace(/\/+$/, '');
  if (!url) {
    status.textContent = 'Cole a URL do backend antes de salvar.';
    status.style.color = '#FB6B5B';
    return;
  }
  await chrome.storage.sync.set({ backendUrl: url });
  chrome.runtime.sendMessage({ type: 'POLL_NOW' });
  status.textContent = 'Salvo! Verificando os pares agora...';
  status.style.color = '#2DD4A7';
});
