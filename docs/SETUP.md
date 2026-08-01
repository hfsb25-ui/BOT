# Rodando localmente (opcional — para desenvolvimento)

> Se voce so quer o site no ar sem instalar nada, use o guia
> [`docs/DEPLOY.md`](DEPLOY.md) — ele publica tudo na nuvem direto do GitHub.
> Este guia aqui e so para quem quer editar o codigo e testar mudancas
> na propria maquina antes de enviar ao GitHub.

## Pre-requisitos

- Node.js 18 ou superior
- Uma connection string de um banco PostgreSQL (pode ser o mesmo banco gratuito
  do Neon usado em producao, ou um Postgres local se voce ja tiver um instalado)
- Uma chave de API da [Twelve Data](https://twelvedata.com/pricing)

## 1. Backend

```bash
cd backend
cp .env.example .env
```

Edite o `.env` e preencha `DATABASE_URL` (string do Neon ou de outro Postgres)
e `TWELVE_DATA_API_KEY`.

```bash
npm install
npm run dev
```

O schema do banco e aplicado automaticamente na primeira vez que o servidor
sobe (nao ha um passo separado de "migrar banco"). Teste em
`http://localhost:4000/api/health`.

## 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`. Em desenvolvimento local, o Vite redireciona
`/api/*` automaticamente para `http://localhost:4000` (configurado em
`vite.config.js`) — nenhuma variavel de ambiente extra e necessaria.

## Troubleshooting

| Problema | Causa provavel | Solucao |
|----------|-----------------|---------|
| `DATABASE_URL nao configurada` | `.env` sem a variavel preenchida | Preencha `DATABASE_URL` com uma connection string valida de Postgres |
| Erro de SSL ao conectar no banco | Provedor exige SSL (Neon, Supabase) | Confirme que a string termina com `?sslmode=require`; o `config/db.js` ja ativa SSL automaticamente quando o host nao e `localhost` |
| `Falha ao buscar candles: ... run out of API credits` | Limite de requisicoes da Twelve Data excedido | Aguarde o reset do limite (plano free) ou faca upgrade |
| Frontend nao carrega dados (`Network Error`) | Backend nao esta rodando | Confirme que `npm run dev` do backend esta ativo |
