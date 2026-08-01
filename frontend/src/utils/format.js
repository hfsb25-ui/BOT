// Formata um horario ISO (vindo do backend, sempre em UTC) para HH:MM no fuso
// horario local do navegador do usuario - assim "11:05" aparece como 11:05 na
// hora de quem esta vendo a tela, nao na hora UTC do servidor.
export function formatTime(iso) {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// Data local (YYYY-MM-DD) a partir de um ISO, no fuso do navegador.
// 'en-CA' e um truque comum para obter o formato ISO de data (YYYY-MM-DD) via toLocaleDateString.
export function formatLocalDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-CA');
  } catch {
    return iso;
  }
}
