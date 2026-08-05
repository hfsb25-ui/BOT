# Analisador Inteligente para Opcoes Binarias (M5)

Aplicacao web completa para analise de contexto de mercado no timeframe M5,
com deteccao de tendencia, price action, suporte/resistencia, indicadores
tecnicos e um sistema de **Score (0-100)** que so aponta uma oportunidade
quando o contexto realmente favorece uma direcao — nunca sinais aleatorios.

> ⚠️ **Aviso importante**: esta ferramenta faz analise tecnica automatizada
> com fins educacionais/informativos. Ela **nao e recomendacao de investimento**
> e nao garante resultados. Opcoes binarias sao instrumentos de altissimo risco,
> nos quais e possivel perder todo o capital investido rapidamente.

## 🚀 Colocar no ar (sem instalar nada)

Siga [`docs/DEPLOY.md`](docs/DEPLOY.md) — publica o backend, o frontend e o
banco de dados na nuvem, direto de um repositorio no GitHub, usando apenas
o navegador (Render + Neon, ambos gratuitos).

## Extensão de navegador (opcional)

Quer ver os sinais direto na tela enquanto estiver na corretora, sem deixar
o site principal aberto? Veja [`extension/README.md`](extension/README.md) —
instala em 2 minutos, sem loja de extensões, e só considera pares reais
(ignora pares OTC automaticamente).

## Stack

| Camada     | Tecnologia |
|------------|------------|
| Frontend   | React 18 + Vite + Tailwind CSS |
| Backend    | Node.js + Express |
| Banco      | PostgreSQL (hospedado — ex: Neon) |
| Dados de mercado | [Twelve Data API](https://twelvedata.com/) |
| Graficos   | Recharts |
| Deploy     | Render (Blueprint `render.yaml`, auto-deploy a partir do GitHub) |

## Estrutura do projeto

```
trading-analyzer/
├── render.yaml         # Blueprint de deploy (backend + frontend no Render)
├── backend/             # API Express, motor de analise, acesso ao Postgres
│   └── src/
│       ├── services/    # indicadores, price action, S/R, tendencia, score
│       ├── routes/      # /api/signal, /api/history, /api/dashboard, /api/filters
│       ├── db/          # schema.sql (Postgres)
│       └── server.js
├── frontend/            # Interface React + Tailwind
│   └── src/
│       ├── components/
│       └── api/
└── docs/
    ├── DEPLOY.md        # publicar na nuvem (sem instalar nada) — comece aqui
    ├── ARCHITECTURE.md  # como o pipeline de analise funciona
    ├── API.md           # todos os endpoints
    └── SETUP.md         # rodar localmente (opcional, para desenvolvimento)
```

## Documentacao

- [`docs/DEPLOY.md`](docs/DEPLOY.md) — **comece aqui**: publicar tudo na nuvem via GitHub, sem terminal.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — pipeline de analise, formula do score, logica de deteccao de padroes.
- [`docs/API.md`](docs/API.md) — endpoints do backend.
- [`docs/SETUP.md`](docs/SETUP.md) — rodar localmente (opcional).
