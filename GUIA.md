# MOVE Santana — bot do Telegram na Vercel

Projeto independente em JavaScript/Node.js, sem dependências externas. Não precisa mudar os sites atuais. Os links já estão configurados. O bot usa mensagens prontas, não IA.

## 1. Publicar o projeto

Crie um repositório privado no GitHub e envie todo o conteúdo desta pasta, incluindo api/, scripts/, package.json e vercel.json. Não envie nenhum arquivo .env com dados reais.

Na Vercel, escolha Add New → Project, importe o repositório e selecione Framework Preset: Other. Use a raiz desta pasta como Root Directory. Não configure comando de build nem pasta de saída personalizados. Use Node.js 24.x. A função ficará em https://SEU-PROJETO.vercel.app/api/telegram.

## 2. Configurações privadas

Em Settings → Environment Variables, cadastre para Production:

| Nome | Valor |
| --- | --- |
| TELEGRAM_BOT_TOKEN | Token recebido do BotFather. |
| TELEGRAM_WEBHOOK_SECRET | Segredo aleatório de pelo menos 32 caracteres (letras, números, _ ou -). |
| PRAYER_CHAT_ID | ID do grupo privado da equipe, geralmente negativo, ou ID de uma conversa privada. |
| MOVE_SCHEDULE | Dia e horário do encontro de jovens. |
| CHURCH_SCHEDULE | Dias e horários dos cultos. |
| CHURCH_ADDRESS | Endereço completo. |
| CONTACT_URL | Link HTTPS do contato, como https://t.me/usuario ou https://wa.me/55DDDNUMERO. |

MOVE_URL e CHURCH_URL são opcionais: já usam https://move-santana.vercel.app/ e https://verbo-santana.vercel.app/.

Nunca use prefixo NEXT_PUBLIC_ nos segredos. Não compartilhe o token no chat nem o coloque no GitHub. Gere o segredo localmente com Node.js:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Depois de mudar variáveis, faça Redeploy. A URL de produção do webhook precisa estar acessível sem login ou bloqueio de Deployment Protection; a autenticação da função é feita pelo segredo do Telegram.

## 3. Obter o ID do grupo de oração

Crie um grupo privado da equipe no Telegram. Adicione @movesantana_bot e permita que ele envie mensagens (não precisa ser administrador). Mantenha a privacidade padrão do bot.

No computador, instale Node.js 24 se ainda não tiver. Abra um terminal na pasta deste projeto, copie .env.example para .env e preencha TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET com os mesmos valores da Vercel. Não publique esse arquivo.

Antes de ativar o webhook, envie no grupo:

```text
/chatid@movesantana_bot
```

Execute localmente:

```sh
node --env-file=.env scripts/setup.mjs --discover
```

O comando lista apenas IDs, tipos e nomes das conversas recentes; não mostra o conteúdo dos pedidos. Copie o ID do grupo para PRAYER_CHAT_ID na Vercel e faça Redeploy. Se nenhuma conversa aparecer, envie novamente o comando no grupo.

Alternativa: ative o bot primeiro sem PRAYER_CHAT_ID, conforme o passo 4. Depois envie /chatid@movesantana_bot no grupo. Ele responderá com o ID. Cadastre a variável e faça Redeploy. Enquanto essa variável estiver vazia, o bot informa que o envio de oração ainda não está disponível.

Para receber pedidos numa conversa privada, o responsável deve primeiro iniciar uma conversa com o bot. Use --discover antes de ativar o webhook para obter seu ID.

## 4. Ativar o bot

Com o projeto publicado, o arquivo .env local preenchido e o segredo igual ao da Vercel, execute:

```sh
node --env-file=.env scripts/setup.mjs https://SEU-PROJETO.vercel.app
```

Troque pelo domínio fixo de produção, sem /api/telegram no final. Esse comando registra o webhook, a descrição e o menu de comandos automaticamente. Ele substitui o webhook anterior deste bot, se existir, e preserva atualizações pendentes. Execute novamente se mudar o domínio ou o segredo. A foto de perfil continua sendo configurada em /setuserpic no BotFather.

## 5. Conferir no Telegram

1. Abra @movesantana_bot e envie /start.
2. Confira os links do MOVE e da igreja.
3. Abra Quero visitar vocês e confira horários, endereço e contato.
4. Toque em Pedir oração e responda à mensagem “🙏 Qual é o seu pedido de oração?”.
5. Confira se o pedido chegou ao grupo privado e se a confirmação chegou à pessoa.
6. Confira /cancelar e Voltar ao menu. /cancelar mostra o menu; uma resposta posterior a um pedido antigo ainda pode ser enviada, pois não há sessão armazenada.

Para rodar os testes locais:

```sh
npm test
```

## Como funciona e limites

O contexto do pedido vem da resposta à mensagem do próprio bot, sem banco de dados nem memória de sessão. Textos soltos não são encaminhados. No grupo da equipe, o bot só responde ao comando /chatid; o atendimento ocorre nas conversas privadas.

O bot informa previamente que o pedido e o primeiro nome serão encaminhados. Ele envia texto simples, sem ID pessoal ou username. A equipe recebe a referência da atualização para identificar eventuais repetições. Ele não grava conteúdo em logs ou arquivos, mas os pedidos permanecem no Telegram do grupo: restrinja os membros e combine com a equipe quando apagar as mensagens.

O Telegram pode repetir atualizações após falhas. Esta versão não mantém registro persistente de entregas: um pedido pode aparecer duplicado, especialmente se a entrega ao grupo funcionar mas a confirmação falhar. Não há garantia de entrega exatamente uma vez. Para maior volume, acrescente uma fila e um banco de dados para controle de processamento.

Se o envio ao grupo falhar, não é enviada confirmação de sucesso e a função devolve erro para que o Telegram tente novamente. Consulte os logs da Vercel; eles registram apenas uma mensagem genérica de falha. Verifique token, segredo, ID do grupo e permissão para enviar mensagens. Falhas permanentes exigem corrigir a configuração.

O bot não responde livremente a perguntas nem envia respostas da equipe de volta à pessoa. O botão de contato é o caminho para conversar com um atendente. O uso fica sujeito aos limites e custos do seu plano Vercel; não há necessidade de API de IA.

Referências: https://vercel.com/docs/functions/runtimes/node-js e https://core.telegram.org/bots/api#setwebhook.
