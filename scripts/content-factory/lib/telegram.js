// lib/announce.ts
var ANNOUNCE_CHANNEL = "@web_vacancy";
function announceText(url) {
  return `\u0427\u0438\u0442\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u0441\u0442\u0430\u0442\u044C\u044E \u043D\u0430 \u043D\u0430\u0448\u0435\u043C \u0441\u0430\u0439\u0442\u0435 \u{1F447}\u{1F3FB}
${url}`;
}

// lib/telegram.ts
var BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN;
var CHAT_ID = process.env.SEO_LAB_CHAT_ID;
var THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : void 0;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN not set");
if (!CHAT_ID) throw new Error("SEO_LAB_CHAT_ID not set");
var API = `https://api.telegram.org/bot${BOT_TOKEN}`;
var CHANNEL = process.env.CONTENT_CHANNEL || ANNOUNCE_CHANNEL;
async function announceToChannel(url) {
  const text = announceText(url);
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHANNEL,
      text,
      disable_web_page_preview: false
    })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram (\u043A\u0430\u043D\u0430\u043B): ${data.description}`);
  return data.result.message_id;
}
async function sendMessage(text, extra = {}) {
  const body = {
    chat_id: CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra
  };
  if (THREAD_ID) body.message_thread_id = THREAD_ID;
  const res = await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${data.description}`);
  return data.result.message_id;
}
async function editMessage(messageId, text) {
  await fetch(`${API}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });
}
export {
  announceToChannel,
  editMessage,
  sendMessage
};
