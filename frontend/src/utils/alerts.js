// Alerta sonoro (bip triplo) via Web Audio API - nao depende de nenhum arquivo
// de audio externo, entao funciona direto no navegador sem downloads extras.
export function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    [0, 0.18, 0.36].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.15);
      osc.start(start + offset);
      osc.stop(start + offset + 0.16);
    });
  } catch (e) {
    console.warn('Nao foi possivel tocar o alerta sonoro:', e);
  }
}

// Pede permissao de notificacao do navegador (precisa ser chamado a partir de
// uma acao do usuario, ex: clique em um botao - por isso fica em uma funcao
// separada, chamada quando o usuario liga o monitoramento automatico).
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Mostra uma notificacao do navegador (aparece mesmo com a aba em segundo plano,
// desde que o navegador esteja aberto e a permissao tenha sido concedida).
export function notifyOpportunity(signal, formattedTime) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(`🟢 Oportunidade: ${signal.asset}`, {
      body: `${signal.operation} às ${formattedTime} · Score ${signal.score}/100 · ${signal.classification}`,
      tag: `${signal.asset}-${signal.entryTime}`,
    });
  } catch (e) {
    console.warn('Nao foi possivel exibir a notificacao:', e);
  }
}
