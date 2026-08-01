# Arquitetura

## Visao geral do pipeline

Quando o usuario clica em "Analisar agora" (ou quando um job agendado roda),
o backend executa o seguinte pipeline, no arquivo
`backend/src/services/signalGenerator.js`:

```
1. Buscar candles (Twelve Data, 5min, 210 candles)
        │
2. Calcular indicadores: EMA20/50/200, RSI, MACD, ATR, ADX, Bollinger, Stochastic
        │
3. Detectar swing highs/lows -> niveis de suporte e resistencia
        │
4. Detectar tendencia (combina alinhamento de EMAs + estrutura de topos/fundos)
        │
5. Detectar padroes de Price Action (Pin Bar, Engolfo, Martelo, Doji,
   Pullback, BOS, CHOCH, Falso Rompimento, Liquidez)
        │
6. Calcular Score (0-100) e decidir CALL / PUT / nenhuma direcao
        │
7. Comparar Score e Probabilidade com os minimos configurados no filtro
        │
8. Retornar "OPORTUNIDADE" (com justificativa) ou "NAO OPERAR" (com motivo)
```

Cada etapa e um servico isolado e testavel (`services/*.js`), o que permite
trocar a fonte de dados (ex. outra corretora) ou ajustar regras sem tocar
no restante do sistema.

## Por que nao gerar sinais aleatorios

O sistema **nunca sorteia** CALL/PUT. A direcao sugerida sempre nasce de uma
"votacao ponderada": cada componente de analise (tendencia, price action,
EMA, RSI, MACD) que aponta uma direcao contribui os pontos daquele
componente para o placar de CALL ou de PUT. A direcao com mais pontos
vence. Se nao houver maioria clara, `operation` fica `null` e o sistema
retorna automaticamente **NAO OPERAR**, independentemente do score numerico.

Componentes sem direcao propria (ADX e ATR) so validam a **qualidade do
contexto** (ha tendencia com forca? a volatilidade e saudavel?), mas nunca
votam em CALL/PUT sozinhos.

## Formula do Score (0-100)

| Componente     | Peso maximo | O que avalia |
|----------------|-------------|---------------|
| Tendencia      | 25          | EMAs alinhadas + estrutura de topos/fundos concordam |
| Price Action   | 20          | Forca do melhor padrao encontrado (Pin Bar, Engolfo, etc.) |
| EMA            | 15          | Alinhamento EMA20/EMA50/EMA200 e posicao do preco |
| RSI            | 10          | RSI favorece a direcao sem estar em exaustao (>75 ou <25) |
| MACD           | 10          | Histograma do MACD com momentum na direcao |
| ADX            | 10          | Forca da tendencia (ADX >= 25 = tendencia forte) |
| ATR            | 10          | Volatilidade dentro de uma faixa saudavel (nem parada, nem caotica) |
| **Total**      | **100**     | |

### Classificacao

| Faixa   | Classificacao |
|---------|----------------|
| 0–39    | Muito Ruim |
| 40–59   | Fraco |
| 60–79   | Bom |
| 80–89   | Muito Bom |
| 90–100  | Excelente |

### Sobre a "Probabilidade estimada"

A probabilidade exibida (`indicators_snapshot.probability`) e uma
**heuristica derivada do score** (`probabilidade = min(50 + score * 0.42, 95)`),
usada apenas como um indicador relativo de qualidade entre sinais — **nao e
uma probabilidade estatisticamente calibrada** por backtests. Para virar uma
probabilidade real, seria necessario rodar o sistema por um periodo,
registrar milhares de operacoes no historico e calibrar a formula contra o
win rate observado por faixa de score (ver `docs/API.md` → `/api/dashboard`
para os dados que alimentariam essa calibracao).

## Deteccao de tendencia

`services/trendDetector.js` combina dois metodos independentes:

1. **Alinhamento de EMAs**: EMA20 > EMA50 > EMA200 = Alta; invertido = Baixa.
2. **Estrutura de mercado**: compara os dois ultimos swing highs e os dois
   ultimos swing lows. Topos e fundos ascendentes = Alta; descendentes = Baixa.

Se os dois metodos concordam, a tendencia e confirmada. Se divergem, o
sistema classifica como **Lateral** — um contexto ambiguo e propositalmente
tratado como "sem tendencia clara" para evitar operar em incerteza.

## Deteccao de Price Action

Cada padrao em `services/priceAction.js` retorna `{ pattern, direction, strength }`.
`strength` (0 a 1) pondera o quanto aquele padrao contribui para o score:

- **Engolfo** (0.85) e **Pin Bar** (0.8): padroes de reversao/rejeicao fortes.
- **Martelo / Estrela Cadente** (0.75) e **BOS** (0.75): confirmam continuidade
  ou reversao com boa confiabilidade.
- **Pullback** (0.7) e **Falso Rompimento** (0.7): contexto favoravel, mas
  dependente da tendencia vigente.
- **Liquidez / Stop Hunt** (0.65) e **CHOCH** (0.55): sinais de alerta,
  contribuem menos isoladamente pois indicam possivel reversao ainda nao
  confirmada.
- **Doji** (0.4): indecisao, pontua pouco e nao define direcao.

## Suporte e Resistencia

`services/supportResistance.js` identifica *swing highs/lows* (um candle cujo
high/low e o mais extremo dentro de uma janela de N candles ao redor) e depois
agrupa (clusteriza) niveis proximos entre si (tolerancia de ~0.08%) somando
o numero de toques — niveis tocados mais vezes sao considerados mais fortes
e aparecem primeiro na lista.

## Historico e Dashboard

O historico (`history` no SQLite) guarda cada operacao que o usuario decidiu
registrar a partir de uma oportunidade, com resultado inicial `PENDING`. Apos
a expiracao do M5, o usuario marca `WIN` ou `LOSS` na interface. O endpoint
`/api/dashboard` (em `routes/dashboard.js`) agrega esses registros para
calcular Win Rate, Profit Factor, Drawdown maximo, melhor/pior ativo, melhor
horario e estatisticas por padrao de price action.

A tabela `signals` (separada de `history`) loga **toda analise gerada**,
inclusive as que resultaram em "Nao Operar" — util para auditoria e para,
no futuro, medir a taxa de acerto real de cada faixa de score.

## Decisoes de design e limitacoes conhecidas

- **PostgreSQL hospedado** (ex: Neon) foi escolhido em vez de SQLite porque
  hospedagens gratuitas como o Render nao mantêm arquivos locais entre
  deploys/reinicios — um banco em arquivo (SQLite) perderia os dados a cada
  atualizacao do servico. Um Postgres hospedado (`pool.query` via `pg` em
  `config/db.js`) resolve isso e ainda permite rodar o backend em varias
  instâncias no futuro, se necessario.
- **Filtro de noticias economicas**: o painel tem o toggle "Ignorar
  noticias", mas este MVP nao inclui integracao com um provedor de calendario
  economico (ex. Forex Factory, Investing.com). O campo esta pronto na
  arquitetura para receber essa integracao futuramente.
- Os pesos do score (25/20/15/10/10/10/10) sao os especificados no briefing
  do produto. Eles podem ser recalibrados com base em dados reais de
  `/api/dashboard` ao longo do tempo.
