# Extensão do navegador — Analisador M5

Mostra os sinais do Analisador Inteligente direto na tela, em qualquer site
(inclusive na corretora), sem precisar deixar a aba do site principal aberta.
Roda em segundo plano e te avisa por notificação do navegador quando encontra
uma oportunidade.

> ⚠️ **Só considera pares SEM "OTC" no nome.** Pares marcados como OTC em
> corretoras de opções binárias são preços sintéticos gerados pela própria
> corretora — não têm relação com o mercado real que esta extensão analisa
> (ver `docs/ARCHITECTURE.md` do projeto principal). A extensão ignora
> automaticamente qualquer ativo com "OTC" no nome e mostra um aviso na
> tela se algum dos seus ativos monitorados for pulado por esse motivo.

## Instalação (sem loja de extensões — modo desenvolvedor)

1. Abra `chrome://extensions` (Chrome/Edge/Brave) ou `about:debugging#/runtime/this-firefox` (Firefox).
2. Ative o **"Modo do desenvolvedor"** (canto superior direito, no Chrome).
3. Clique em **"Carregar sem compactação"** (Chrome) ou **"Carregar add-on temporário"** (Firefox).
4. Selecione a pasta `extension/` deste projeto.
5. O ícone "M5" deve aparecer na barra de extensões do navegador.

## Configuração

1. Clique no ícone da extensão → **"Configurar URL do backend"**.
2. Cole a URL pública do seu backend no Render — a mesma que o site usa
   (ex: `https://trading-analyzer-backend-xxxx.onrender.com`, sem barra no final).
3. Clique em **Salvar**. A extensão já busca os pares monitorados
   automaticamente (usa a mesma configuração de filtros do site — não
   precisa configurar os ativos de novo).

## Como usar

- Uma bolinha "M5" aparece flutuando no canto inferior direito de qualquer
  página (inclusive a da corretora). Clique nela para abrir o painel com o
  status de cada par.
- A extensão verifica os pares automaticamente a cada 1 minuto (intervalo
  mínimo permitido pelo Chrome para extensões) e dispara uma notificação do
  sistema quando encontra uma oportunidade nova.
- Clique no ícone da extensão na barra do navegador pra ver o status atual
  ou forçar uma verificação manual.

## Limitações

- O intervalo mínimo de verificação em segundo plano é de 1 minuto (limite
  do Chrome para extensões, não é configurável para menos).
- Assim como o site, depende do backend estar acordado — o plano gratuito
  do Render "dorme" após 15 min sem uso; a primeira verificação após um
  período parado pode demorar de 30 a 60 segundos para responder.
- Não publicada na Chrome Web Store / Firefox Add-ons — é de uso pessoal,
  carregada manualmente via modo desenvolvedor. Publicar numa loja exigiria
  passar por um processo de revisão separado.
