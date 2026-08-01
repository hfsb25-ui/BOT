// Servidor principal Express - Analisador Inteligente para Opcoes Binarias (M5)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./config/db');

const app = express();

const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : '*' }));
app.use(express.json());

const signalsRouter = require('./routes/signals');
const historyRouter = require('./routes/history');
const dashboardRouter = require('./routes/dashboard');
const filtersRouter = require('./routes/filters');
const backtestRouter = require('./routes/backtest');

app.use('/api/signal', signalsRouter);
app.use('/api/history', historyRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/filters', filtersRouter);
app.use('/api/backtest', backtestRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

const PORT = process.env.PORT || 4000;

// Aplica o schema no banco (idempotente) antes de aceitar requisicoes.
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Analisador Inteligente (backend) rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar o schema do banco:', err.message);
    process.exit(1);
  });
