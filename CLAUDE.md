# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bot do Telegram (MOVE Santana) como função serverless na Vercel. Node 24.x, ESM, **sem dependências externas** (usa `fetch` e `node:test` nativos). Mensagens prontas em pt-BR, sem IA. Instruções de deploy/configuração completas em `GUIA.md`.

## Comandos

- Testes: `npm test` (`node --test`); um teste específico: `node --test --test-name-pattern="<nome>" test/bot.test.js`
- Registrar webhook/menu/descrição no Telegram: `node --env-file=.env scripts/setup.mjs https://SEU-PROJETO.vercel.app`
- Descobrir IDs de conversas (antes de ativar o webhook): `node --env-file=.env scripts/setup.mjs --discover`
- Não há build, lint nem dev server; o deploy é feito pela Vercel (Framework Preset: Other).

## Arquitetura

Todo o bot está em `api/telegram.js` (webhook em `/api/telegram`, `maxDuration` 60s em `vercel.json`):

- `createHandler(env, fetcher)` é uma factory com `env` e `fetch` injetáveis; o `export default` usa `process.env`. Os testes (`test/bot.test.js`) chamam a factory com env e fetcher falsos e inspecionam as chamadas à API do Telegram.
- O fluxo do handler: valida método POST → exige `x-telegram-bot-api-secret-token` (comparação `timingSafeEqual`) → parseia o update → roteia por `callback_query.data` ou pelo comando `/x` da mensagem.
- Em chats não privados, o bot só responde a `/chatid` (para descobrir `PRAYER_CHAT_ID`).
- **Sem estado/banco**: o contexto do pedido de oração vem da resposta (`reply_to_message`) à mensagem do próprio bot com texto exatamente igual a `PRAYER_PROMPT`, enviada com `force_reply`. Alterar `PRAYER_PROMPT` ou a checagem do ID do bot (derivado de `TELEGRAM_BOT_TOKEN`) quebra o fluxo. Texto solto não é encaminhado.
- Pedidos são enviados ao `PRAYER_CHAT_ID` e depois confirmados ao usuário. Se o envio falhar, o handler devolve 500 para o Telegram reentregar (pode gerar duplicados; sem idempotência por design).
- Privacidade: nunca logar conteúdo de pedidos, token ou URLs de requisição (o `catch` loga só mensagem genérica). Enviar apenas primeiro nome e `update_id` como referência.
- URLs configuráveis (`MOVE_URL`, `CHURCH_URL`, `CONTACT_URL`) passam por `link()`, que só aceita `https:`.

`scripts/setup.mjs` usa as mesmas variáveis do `.env` (ver `.env.example`) para chamar `setWebhook`, descrição e comandos do bot.
