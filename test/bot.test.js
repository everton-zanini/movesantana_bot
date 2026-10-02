import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler, PRAYER_PROMPT} from '../api/telegram.js';
const secret = 'a'.repeat(48);
async function run(body, {authorized = true, failDelivery = false} = {}) {
  const calls = [];
  const handler = createHandler({TELEGRAM_BOT_TOKEN:'123:test',TELEGRAM_WEBHOOK_SECRET:secret,PRAYER_CHAT_ID:'-10099'}, async (url, options) => {
    const payload = JSON.parse(options.body); calls.push({method:url.split('/').at(-1),payload});
    return {ok:true,json:async()=>({ok: !(failDelivery && payload.chat_id === '-10099'),result:{}})};
  });
  const res = {code:0,setHeader(){},status(code){this.code=code;return this;},json(value){this.value=value;return this;}};
  await handler({method:'POST',headers:{'x-telegram-bot-api-secret-token':authorized?secret:'invalid'},body},res);
  return {res,calls};
}
const message = {chat:{id:7,type:'private'},from:{id:7,first_name:'Ana'}};
test('rejects unauthenticated requests without sending messages', async()=>{
  const {res,calls}=await run({update_id:1},{authorized:false}); assert.equal(res.code,401); assert.equal(calls.length,0);
});
test('start shows all four menu options', async()=>{
  const {res,calls}=await run({update_id:2,message:{...message,text:'/start'}});
  assert.equal(res.code,200); assert.equal(calls[0].payload.reply_markup.inline_keyboard.length,4);
});
test('prayer is delivered before acknowledgement', async()=>{
  const {res,calls}=await run({update_id:3,message:{...message,text:'Ore pela minha família',reply_to_message:{from:{id:123,is_bot:true},text:PRAYER_PROMPT}}});
  assert.equal(res.code,200); assert.equal(calls[0].payload.chat_id,'-10099'); assert.equal(calls[1].payload.chat_id,7);
});
test('delivery failure does not acknowledge receipt', async()=>{
  const {res,calls}=await run({update_id:4,message:{...message,text:'Pedido',reply_to_message:{from:{id:123,is_bot:true},text:PRAYER_PROMPT}}},{failDelivery:true});
  assert.equal(res.code,500); assert.equal(calls.length,1);
});
test('ordinary text is never sent to the prayer team', async()=>{
  const {calls}=await run({update_id:5,message:{...message,text:'Olá'}}); assert.equal(calls.length,1); assert.equal(calls[0].payload.chat_id,7);
});
test('callbacks are acknowledged and show visit choices', async()=>{
  const {res,calls}=await run({update_id:6,callback_query:{id:'cb1',data:'visitar',message}});
  assert.equal(res.code,200); assert.equal(calls[0].method,'answerCallbackQuery');
  assert.equal(calls[1].payload.reply_markup.inline_keyboard[0][0].callback_data,'visita_move');
});
test('group chat id command works without forwarding group messages',async()=>{
  const {calls}=await run({update_id:7,message:{chat:{id:-77,type:'supergroup'},text:'/chatid@movesantana_bot'}});
  assert.equal(calls.length,1); assert.equal(calls[0].payload.text,'ID deste grupo: -77');
});
