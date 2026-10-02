import { timingSafeEqual } from 'node:crypto';

export const PRAYER_PROMPT = '🙏 Qual é o seu pedido de oração?';
const menu = { inline_keyboard: [
  [{ text: '🔥 Conhecer o MOVE', callback_data: 'move' }],
  [{ text: '🙏 Pedir oração', callback_data: 'oracao' }],
  [{ text: '⛪ Conhecer nossa igreja', callback_data: 'igreja' }],
  [{ text: '🙌 Quero visitar vocês', callback_data: 'visitar' }]
] };
const back = [{ text: '🏠 Voltar ao menu', callback_data: 'start' }];

export function createHandler(env = process.env, fetcher = fetch) {
  async function telegram(method, payload) {
    const response = await fetcher(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(10000)
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error('Telegram request failed');
    return data.result;
  }
  const send = (chat, text, markup = menu) => telegram('sendMessage', {
    chat_id: chat, text, reply_markup: markup, link_preview_options: { is_disabled: true }
  });
  function link(text, url) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') throw new Error('Invalid configured URL');
    return { text, url: parsed.href };
  }
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) return res.status(503).json({ ok: false });
    const received = req.headers['x-telegram-bot-api-secret-token'];
    const expected = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);
    if (typeof received !== 'string' || Buffer.byteLength(received) !== expected.length ||
      !timingSafeEqual(Buffer.from(received), expected)) return res.status(401).json({ ok: false });
    let update;
    try { update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ ok: false }); }
    if (!update || !Number.isInteger(update.update_id)) return res.status(400).json({ ok: false });
    try {
      const callback = update.callback_query;
      const message = callback?.message || update.message;
      if (!message) return res.status(200).json({ ok: true });
      if (message.chat.type !== 'private') {
        if (/^\/chatid(?:@[a-zA-Z0-9_]+)?$/.test(message.text || '')) {
          await telegram('sendMessage', { chat_id: message.chat.id, text: `ID deste grupo: ${message.chat.id}` });
        }
        return res.status(200).json({ ok: true });
      }
      const chat = message.chat.id;
      if (callback) await telegram('answerCallbackQuery', { callback_query_id: callback.id });
      const text = update.message?.text;
      const command = text?.match(/^\/([a-z_]+)(?:@[a-zA-Z0-9_]+)?(?:\s|$)/)?.[1];
      const action = callback?.data || command;
      // A reply to our bot's exact prompt carries the context across serverless instances.
      const reply = update.message?.reply_to_message;
      const prayer = text && !command && reply?.from?.is_bot &&
        reply.from.id === Number(env.TELEGRAM_BOT_TOKEN.split(':')[0]) && reply.text === PRAYER_PROMPT;
      if (prayer) {
        if (!env.PRAYER_CHAT_ID) {
          await send(chat, '💜 O envio de pedidos ainda não está disponível. Você pode encontrar nossa equipe pelo site da igreja.');
        } else {
          const name = (update.message.from?.first_name || 'Visitante').slice(0,100);
          await telegram('sendMessage', { chat_id: env.PRAYER_CHAT_ID,
            text: `🙏 Pedido de oração — MOVE Santana\nNome: ${name}\nReferência: ${update.update_id}\n\n${text.slice(0,3400)}`,
            link_preview_options: { is_disabled: true } });
          await send(chat, 'Recebemos seu pedido 💜 Ele foi entregue à nossa equipe de oração. Obrigado por compartilhar com a gente!');
        }
      } else if (action === 'oracao') {
        if (!env.PRAYER_CHAT_ID) await send(chat, '💜 O envio de pedidos ainda não está disponível. Fale com nossa equipe pelo site da igreja.');
        else {
          await send(chat, '💜 Pode compartilhar só o que se sentir à vontade para contar. Seu pedido e seu primeiro nome serão enviados à equipe de oração. Evite dados pessoais de outras pessoas.\n\nResponda à próxima mensagem para enviar. Para sair, use /cancelar.', { inline_keyboard: [back] });
          await send(chat, PRAYER_PROMPT, { force_reply: true, selective: true, input_field_placeholder: 'Escreva seu pedido aqui 💜' });
        }
      } else if (action === 'move') {
        await send(chat, 'Bora conhecer o MOVE Santana? 🔥💜\nNo nosso site você encontra mais sobre o grupo. Vem com a gente!', { inline_keyboard: [[link('🔥 Explorar o MOVE', env.MOVE_URL || 'https://move-santana.vercel.app/')], [{ text: '🙌 Quero visitar vocês', callback_data: 'visitar' }], back] });
      } else if (action === 'igreja') {
        await send(chat, 'O MOVE faz parte da Verbo Santana ⛪💜\nConheça mais sobre nossa igreja e venha caminhar com a gente!', { inline_keyboard: [[link('⛪ Conhecer a Verbo Santana', env.CHURCH_URL || 'https://verbo-santana.vercel.app/')], [{ text: '🙌 Quero visitar vocês', callback_data: 'visitar' }], back] });
      } else if (action === 'visitar') {
        await send(chat, 'Bora se conhecer pessoalmente? 💜\nVocê quer visitar um encontro do MOVE ou um culto da igreja?', { inline_keyboard: [[{ text: '🔥 Visitar o MOVE', callback_data: 'visita_move' }], [{ text: '⛪ Visitar a igreja', callback_data: 'visita_igreja' }], back] });
      } else if (action === 'visita_move' || action === 'visita_igreja') {
        const schedule = action === 'visita_move' ? env.MOVE_SCHEDULE : env.CHURCH_SCHEDULE;
        const rows = [];
        if (env.CONTACT_URL) rows.push([link('💬 Falar com a equipe', env.CONTACT_URL)]);
        rows.push([link('📍 Ver informações no site', action === 'visita_move' ? (env.MOVE_URL || 'https://move-santana.vercel.app/') : (env.CHURCH_URL || 'https://verbo-santana.vercel.app/'))], back);
        await send(chat, `Vai ser muito bom receber você! 💜\n\n📅 ${schedule || 'Confira os horários com a equipe ou no site.'}\n📍 ${env.CHURCH_ADDRESS || 'Confira o endereço no site da igreja.'}\n\nPrimeira vez? Nossa equipe pode ajudar você a chegar e se sentir em casa 😊`, { inline_keyboard: rows });
      } else if (['start', 'menu', 'cancelar'].includes(action)) {
        await send(chat, 'E aí! Que bom ter você por aqui 💜\nSou o bot do MOVE Santana! Bora conhecer nosso grupo e nossa igreja?\n\nEscolha uma opção 👇');
      } else {
        await send(chat, 'Bora lá 💜 Escolha uma opção abaixo. Para enviar uma oração, toque em “Pedir oração” e responda à mensagem que aparecer.');
      }
      return res.status(200).json({ ok: true });
    } catch {
      // Never log prayer contents, tokens, or Telegram request URLs.
      console.error('Falha ao processar atualização do Telegram.');
      return res.status(500).json({ ok: false });
    }
  };
}

export default createHandler();
