// Run locally with: node --env-file=.env scripts/setup.mjs https://your-project.vercel.app
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('Preencha TELEGRAM_BOT_TOKEN no arquivo .env local.');
async function call(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(`Falha em ${method}; confira token, permissões e configuração.`);
  return data.result;
}
try {
  if (process.argv[2] === '--discover') {
    const info = await call('getWebhookInfo');
    if (info.url) throw new Error('Já há um webhook ativo. Use /chatid@movesantana_bot no grupo e veja a alternativa do guia.');
    const updates = await call('getUpdates', { allowed_updates: ['message'], timeout: 0 });
    const chats = new Map();
    for (const u of updates) if (u.message?.chat) chats.set(u.message.chat.id, u.message.chat);
    for (const chat of chats.values()) console.log(`ID: ${chat.id} | Tipo: ${chat.type} | Nome: ${chat.title || chat.first_name || 'Privado'}`);
    if (!chats.size) console.log('Nenhuma mensagem recente. Envie /chatid@movesantana_bot no grupo e tente novamente.');
  } else {
    const base = new URL(process.argv[2]);
    if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash) throw new Error('Informe apenas o domínio HTTPS do projeto.');
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) throw new Error('Use um segredo aleatório com 32 a 256 letras, números, _ ou -.');
    const commands = [ ['start','💜 Bora começar!'], ['move','🔥 Conheça o MOVE Santana'], ['oracao','🙏 Quero pedir oração'], ['igreja','⛪ Conheça nossa igreja'], ['visitar','🙌 Quero visitar vocês'], ['cancelar','Voltar ao menu'] ];
    await call('setMyCommands', { commands: commands.map(([command, description]) => ({ command, description })) });
    await call('setMyDescription', { description: 'E aí! Bem-vindo ao MOVE Santana 💜🔥 Conheça nosso grupo de jovens e nossa igreja, compartilhe seu pedido de oração e saiba como visitar a gente. Toque em Iniciar e bora conversar!' });
    await call('setMyShortDescription', { short_description: 'Conheça o MOVE Santana 💜 Peça oração, descubra nossa igreja e venha nos visitar!' });
    await call('setWebhook', { url: new URL('/api/telegram', base).href, secret_token: secret, allowed_updates: ['message','callback_query'], max_connections: 1 });
    const info = await call('getWebhookInfo');
    console.log(`Bot configurado. Webhook: ${info.url}. Teste /start no Telegram.`);
    if (info.last_error_message) console.log('O Telegram registrou um erro anterior. Confira getWebhookInfo após testar.');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
