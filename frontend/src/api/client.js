// Cliente HTTP central para falar com o backend Express.
import axios from 'axios';

// Em producao (Render), VITE_API_URL e definida no build apontando para o backend hospedado.
// Em desenvolvimento local, cai no proxy do Vite (/api -> http://localhost:4000).
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL, timeout: 15000 });

export async function fetchSignal(asset, { minScore, minProbability }) {
  const { data } = await api.get(`/signal/${encodeURIComponent(asset)}`, {
    params: { minScore, minProbability },
  });
  return data;
}

export async function fetchFilters() {
  const { data } = await api.get('/filters');
  return data;
}

export async function updateFilters(filters) {
  const { data } = await api.put('/filters', filters);
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get('/history');
  return data;
}

export async function addHistoryEntry(entry) {
  const { data } = await api.post('/history', entry);
  return data;
}

export async function resolvePendingHistory() {
  const { data } = await api.post('/history/resolve-pending');
  return data;
}

export async function updateHistoryResult(id, result) {
  const { data } = await api.patch(`/history/${id}`, { result });
  return data;
}

export async function deleteHistoryEntry(id) {
  const { data } = await api.delete(`/history/${id}`);
  return data;
}

export async function fetchDashboard() {
  const { data } = await api.get('/dashboard');
  return data;
}

export default api;
