-- Schema PostgreSQL (compativel com bancos gratuitos hospedados como Neon ou Supabase).
-- Aplicado automaticamente pelo backend a cada inicializacao (CREATE TABLE IF NOT EXISTS
-- e idempotente, entao e seguro rodar toda vez que o servico sobe no Render).

CREATE TABLE IF NOT EXISTS signals (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  asset TEXT NOT NULL,
  entry_time TEXT NOT NULL,
  expiration TEXT NOT NULL DEFAULT 'M5',
  operation TEXT NOT NULL,
  score INTEGER NOT NULL,
  classification TEXT NOT NULL,
  probability REAL NOT NULL,
  confidence TEXT,
  trend TEXT,
  justification TEXT,
  indicators_snapshot TEXT,
  reason_no_trade TEXT
);

CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  signal_id INTEGER REFERENCES signals(id),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  asset TEXT NOT NULL,
  operation TEXT NOT NULL,
  score INTEGER NOT NULL,
  probability REAL NOT NULL,
  result TEXT NOT NULL DEFAULT 'PENDING',
  pattern TEXT,
  payout REAL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS filter_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  operation_mode TEXT NOT NULL DEFAULT 'CALL_PUT',
  min_score INTEGER NOT NULL DEFAULT 70,
  min_probability REAL NOT NULL DEFAULT 60,
  allowed_start_time TEXT DEFAULT '08:00',
  allowed_end_time TEXT DEFAULT '21:00',
  monitored_assets TEXT NOT NULL DEFAULT '["EUR/USD","GBP/USD","USD/JPY"]',
  min_volatility REAL DEFAULT 0,
  trend_filter TEXT NOT NULL DEFAULT 'ANY',
  pattern_filter TEXT NOT NULL DEFAULT '[]',
  ignore_news BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO filter_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Colunas usadas pela verificacao automatica de resultado (WIN/LOSS): o horario
-- exato (UTC) da entrada, para casar com o candle certo depois que a vela fecha,
-- e os precos de abertura/fechamento daquele candle, guardados para transparencia.
ALTER TABLE history ADD COLUMN IF NOT EXISTS entry_time_utc TEXT;
ALTER TABLE history ADD COLUMN IF NOT EXISTS entry_price REAL;
ALTER TABLE history ADD COLUMN IF NOT EXISTS close_price REAL;
