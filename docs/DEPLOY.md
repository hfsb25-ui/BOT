# Deploy 100% na nuvem (sem instalar nada na sua maquina)

Este guia coloca o projeto inteiro no ar — backend, frontend e banco de dados —
usando apenas o navegador. Voce nao precisa instalar Node.js, npm, nem rodar
nenhum comando de terminal. Tudo roda em servicos gratuitos que ficam
conectados ao seu repositorio no GitHub: a cada alteracao que voce (ou eu)
enviar ao repositorio, os dois servicos se atualizam sozinhos.

Servicos usados (todos com plano gratuito, sem cartao de credito):

| Servico | Para que | Por que este |
|---------|----------|--------------|
| **GitHub** | guardar o codigo | onde o Render/Neon vao ler o projeto |
| **Neon** (neon.tech) | banco PostgreSQL | plano gratuito permanente (o Postgres gratuito do proprio Render expira em 30 dias e apaga os dados — Neon nao expira) |
| **Render** (render.com) | hospedar o backend (API) e o frontend (site) | le o arquivo `render.yaml` do repositorio e cria os dois servicos automaticamente com um clique |

## Passo 1 — Colocar o codigo no GitHub

Se voce ainda nao tem o codigo em um repositorio:

1. Entre em https://github.com e crie uma conta gratuita (se ainda nao tiver).
2. Clique em **New repository**, de um nome como `trading-analyzer` e deixe como **Private** (recomendado, ja que o projeto tera sua chave de API) ou Public, e clique em **Create repository**.
3. Na pagina do repositorio vazio, clique no link **"uploading an existing file"**.
4. Extraia o `trading-analyzer.zip` que te enviei no computador (duplo clique nele costuma extrair automaticamente) e arraste **todo o conteudo da pasta** (nao a pasta em si, o conteudo dela: `backend/`, `frontend/`, `docs/`, `render.yaml`, `README.md` etc.) para a area de upload do GitHub.
5. Clique em **Commit changes**.

> Isso e a unica etapa "manual" — arrastar arquivos num site, sem terminal e
> sem instalar nada. Se preferir, posso enviar o codigo direto para um
> repositorio novo no seu GitHub por voce: basta conectar o GitHub quando o
> Claude oferecer essa opcao na conversa.

## Passo 2 — Criar o banco de dados gratuito (Neon)

1. Entre em https://neon.tech e crie uma conta gratuita (pode entrar com sua conta do GitHub).
2. Clique em **Create a project**. De qualquer nome, ex. `trading-analyzer`.
3. Na tela do projeto, va em **Connection Details** (ou "Connection string") e copie a string que comeca com `postgresql://...`.
4. Guarde essa string — voce vai colar no Render no proximo passo.

## Passo 3 — Obter a chave da Twelve Data

1. Entre em https://twelvedata.com/pricing e crie uma conta gratuita.
2. No painel, copie sua **API Key**.

## Passo 4 — Publicar no Render com um clique (Blueprint)

1. Entre em https://render.com e crie uma conta gratuita (pode entrar com o GitHub — isso ja autoriza o Render a ler seus repositorios).
2. No painel do Render, clique em **New +** → **Blueprint**.
3. Selecione o repositorio `trading-analyzer` que voce criou no Passo 1.
4. O Render vai detectar o arquivo `render.yaml` automaticamente e mostrar
   dois servicos prontos para criar: `trading-analyzer-backend` (API) e
   `trading-analyzer-frontend` (site). Clique em **Apply** / **Create New Resources**.
5. Antes (ou logo depois) de finalizar, o Render vai pedir para preencher as
   variaveis marcadas como secretas. Preencha no servico **trading-analyzer-backend**:
   - `DATABASE_URL` → cole a connection string do Neon (Passo 2)
   - `TWELVE_DATA_API_KEY` → cole sua chave da Twelve Data (Passo 3)
6. Aguarde o build (geralmente 2-5 minutos). Quando terminar, o Render mostra
   duas URLs publicas, algo como:
   - Backend: `https://trading-analyzer-backend.onrender.com`
   - Frontend: `https://trading-analyzer-frontend.onrender.com`
7. Abra a URL do **frontend** — o site completo estara no ar, conectado ao
   backend e ao banco automaticamente (o `render.yaml` ja conecta as duas
   URLs entre si, voce nao precisa configurar isso manualmente).

## Pronto — e depois?

- **Atualizacoes automaticas**: toda vez que o repositorio no GitHub for
  atualizado (por voce ou por mim, se eu tiver acesso a ele), o Render
  refaz o build e publica a nova versao sozinho — sem voce tocar em nada.
- **O backend "dorme"**: no plano gratuito do Render, o backend entra em
  repouso apos ~15 minutos sem uso e leva de 30 a 60 segundos para acordar
  na proxima requisicao. Isso e normal do plano gratuito; se isso incomodar,
  o proximo passo seria migrar o backend para um plano pago do Render
  (a partir de alguns dolares por mes).
- **O banco (Neon) fica sempre disponivel** no plano gratuito — nao expira
  como o Postgres gratuito nativo do Render, entao seu historico de
  operacoes nao se perde com o tempo.

## Rodando localmente (opcional)

Se um dia voce quiser rodar o projeto na sua maquina para testar mudancas
antes de subir ao GitHub, o guia completo esta em [`docs/SETUP.md`](SETUP.md).
Nao e necessario para manter o site no ar — o site publicado no Render
funciona de forma totalmente independente do seu computador.
