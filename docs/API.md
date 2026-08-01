# API Reference — Backend

Base URL local: `http://localhost:4000/api`

Todas as respostas sao JSON. Erros retornam `{ "error": "mensagem" }` com
status HTTP apropriado (400, 404 ou 500).

---

## `GET /api/signal/:asset`

Roda o pipeline completo de analise para um ativo e retorna uma
oportunidade ou o motivo para nao operar. Toda chamada e logada na tabela
`signals` do banco.

**Parametros de URL**
- `asset` — par a ser analisado, ex. `EUR/USD` (usar `encodeURIComponent`).

**Query params**
- `minScore` (opcional, padrao `70`) — score minimo para considerar oportunidade.
- `minProbability` (opcional, padrao `60`) — probabilidade minima (%).

**Resposta — oportunidade encontrada** (`status: "OPPORTUNITY"`)

> `entryTime` e `time` sao sempre um horario ISO (UTC) arredondado para o
> proximo multiplo de 5 minutos (ex: `...T14:35:00.000Z`), ja que a proxima
> vela M5 comeca nesse instante. O frontend converte para o fuso horario
> local do navegador na exibicao.

```json
{
  "status": "OPPORTUNITY",
  "asset": "EUR/USD",
  "entryTime": "2026-08-01T14:35:00.000Z",
  "expiration": "M5",
  "operation": "CALL",
  "score": 93,
  "classification": "Excelente",
  "probability": 84,
  "confidence": "Muito Alto",
  "trend": "ALTA",
  "priceActionPatterns": [
    { "pattern": "Pullback", "direction": "CALL", "strength": 0.7 }
  ],
  "justification": [
    "Tendencia de alta confirmada (EMAs e estrutura de mercado)",
    "Padrao identificado: Pullback",
    "EMA20 acima da EMA50 e EMA50 alinhada com EMA200, preco confirma",
    "RSI favoravel para alta (61.2)",
    "MACD positivo e em expansao",
    "ADX indica tendencia com forca (29.4)",
    "ATR em faixa saudavel (0.045% do preco)"
  ],
  "indicatorsSnapshot": { "...": "valores de EMA, RSI, MACD, ATR, ADX, Bollinger, Stochastic, S/R" }
}
```

**Resposta — sem contexto favoravel** (`status: "NO_TRADE"`)
```json
{
  "status": "NO_TRADE",
  "asset": "EUR/USD",
  "time": "2026-08-01T14:35:00.000Z",
  "trend": "LATERAL",
  "score": 42,
  "classification": "Fraco",
  "probability": 67,
  "reasons": [
    "Sinais dos indicadores nao convergem para uma direcao clara (CALL x PUT empatados ou sem votos)",
    "Mercado sem tendencia definida no momento"
  ],
  "indicatorsSnapshot": { "...": "..." }
}
```

---

## `GET /api/history`

Retorna as ultimas 500 operacoes registradas, mais recentes primeiro.

## `POST /api/history`

Registra uma operacao no historico (normalmente a partir de uma
oportunidade exibida na tela).

**Body**
```json
{
  "date": "2026-08-01",
  "time": "2026-08-01T14:35:00.000Z",
  "asset": "EUR/USD",
  "operation": "CALL",
  "score": 93,
  "probability": 84,
  "result": "PENDING",
  "pattern": "Pullback",
  "payout": 0.87,
  "signal_id": 12
}
```
`result`, `pattern`, `payout` e `signal_id` sao opcionais.

## `PATCH /api/history/:id`

Atualiza o resultado real de uma operacao apos a expiracao.

**Body**: `{ "result": "WIN" }` (ou `"LOSS"`, `"PENDING"`)

## `POST /api/history/resolve-pending`

Verifica todas as operacoes com `result: "PENDING"` cujo horario de expiracao
(entrada + 5 minutos) ja passou. Para cada uma, busca o candle correspondente
na Twelve Data e decide o resultado comparando abertura e fechamento daquele
candle: **CALL** ganha se `close > open`; **PUT** ganha se `close < open`.
Atualiza o registro no banco (`result`, `entry_price`, `close_price`) e
retorna a lista do que foi resolvido nesta chamada.

O frontend chama este endpoint sozinho a cada 30s enquanto o site estiver
aberto — nao e necessario chamar manualmente.

```json
{
  "resolved": [
    { "id": 42, "asset": "EUR/USD", "operation": "CALL", "result": "WIN", "entryPrice": 1.10234, "closePrice": 1.10256 }
  ]
}
```

## `GET /api/backtest/:asset`

Simula o motor de score em cima de candles historicos (sem nunca usar dados
"do futuro" em cada ponto simulado) e confere cada sinal gerado contra o
candle seguinte, para calcular a taxa de acerto real do sistema.

**Query params**
- `candles` (opcional, padrao `500`, max `1500`) — quantidade de candles M5 buscados.
- `minScore` (opcional, padrao `0`) — so conta como sinal se o score for maior ou igual.
- `minProbability` (opcional, padrao `0`) — idem para a probabilidade.

```json
{
  "asset": "EUR/USD",
  "candlesAnalyzed": 500,
  "period": { "from": "2026-07-20 10:00:00", "to": "2026-08-01 14:30:00" },
  "totalTrades": 87,
  "wins": 52,
  "losses": 35,
  "winRate": 59.8,
  "scoreBandStats": [
    { "band": "60-79", "total": 40, "wins": 22, "winRate": 55.0 },
    { "band": "80-89", "total": 30, "wins": 19, "winRate": 63.3 },
    { "band": "90-100", "total": 17, "wins": 11, "winRate": 64.7 }
  ],
  "callCount": 45,
  "callWinRate": 60.0,
  "putCount": 42,
  "putWinRate": 59.5
}
```

---

## `DELETE /api/history/:id`

Remove um registro do historico.

---

## `GET /api/dashboard`

Retorna estatisticas agregadas calculadas em cima de todas as operacoes com
resultado `WIN` ou `LOSS` (operacoes `PENDING` sao ignoradas no calculo).

```json
{
  "totalOperations": 128,
  "wins": 79,
  "losses": 49,
  "winRate": 61.7,
  "profitFactor": 1.35,
  "maxDrawdown": 6.4,
  "bestAsset": { "asset": "EUR/USD", "wins": 34, "total": 50, "winRate": 68.0 },
  "worstAsset": { "asset": "USD/JPY", "wins": 10, "total": 22, "winRate": 45.5 },
  "bestHour": { "hour": "10", "wins": 12, "total": 15, "winRate": 80.0 },
  "statsByPattern": [
    { "pattern": "Engolfo de Alta", "wins": 15, "total": 20, "winRate": 75.0 }
  ],
  "assetStats": ["..."],
  "hourStats": ["..."]
}
```

> `profitFactor` usa `payout` de cada operacao (padrao 0.85 quando nao
> informado) contra 1 unidade de perda por LOSS. `maxDrawdown` e calculado
> em unidades de stake, andando cronologicamente pelo historico.

---

## `GET /api/filters`

Retorna a configuracao de filtros atualmente salva (unica linha persistida
no banco, restaurada ao recarregar a pagina).

## `PUT /api/filters`

Atualiza a configuracao de filtros. Body no mesmo formato do retorno de
`GET /api/filters`:

```json
{
  "operation_mode": "CALL_PUT",
  "min_score": 70,
  "min_probability": 60,
  "allowed_start_time": "08:00",
  "allowed_end_time": "21:00",
  "monitored_assets": ["EUR/USD", "GBP/USD"],
  "min_volatility": 0,
  "trend_filter": "ANY",
  "pattern_filter": [],
  "ignore_news": false
}
```

---

## `GET /api/health`

Healthcheck simples: `{ "status": "ok", "time": "..." }`.
