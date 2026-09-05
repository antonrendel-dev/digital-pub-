// lib/telegram.ts
import fs from "fs";
import path from "path";

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
async function announceToChannel(url, imagePath) {
  if (imagePath && !fs.existsSync(imagePath)) {
    console.warn(`    \u26A0 \u043E\u0431\u043B\u043E\u0436\u043A\u0430 \u0434\u043B\u044F \u0430\u043D\u043E\u043D\u0441\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430: ${imagePath} \u2014 \u0448\u043B\u044E \u0441\u0441\u044B\u043B\u043A\u043E\u0439`);
  }
  if (imagePath && fs.existsSync(imagePath)) {
    try {
      return await announceWithPhoto(url, imagePath);
    } catch (e) {
      console.warn(`    \u26A0 \u0430\u043D\u043E\u043D\u0441 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u043E\u0439 \u043D\u0435 \u0443\u0448\u0451\u043B (${e.message}), \u0448\u043B\u044E \u0441\u0441\u044B\u043B\u043A\u043E\u0439`);
    }
  }
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
async function announceWithPhoto(url, imagePath) {
  const form = new FormData();
  form.append("chat_id", CHANNEL);
  form.append("caption", announceText(url));
  form.append("photo", new Blob([fs.readFileSync(imagePath)]), path.basename(imagePath));
  const res = await fetch(`${API}/sendPhoto`, { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram (\u043A\u0430\u043D\u0430\u043B, \u0444\u043E\u0442\u043E): ${data.description}`);
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
async function checkChannelAccess() {
  try {
    const me = await (await fetch(`${API}/getMe`)).json();
    if (!me.ok || !me.result) return "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u0442\u044C \u0431\u043E\u0442\u0430 (getMe)";
    const url = `${API}/getChatMember?chat_id=${encodeURIComponent(CHANNEL)}&user_id=${me.result.id}`;
    const d = await (await fetch(url)).json();
    if (!d.ok) return `\u043D\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u0430 \u043A ${CHANNEL}: ${d.description}`;
    const r = d.result;
    if (r.status !== "administrator")
      return `\u0431\u043E\u0442 \u0432 ${CHANNEL} \u0441\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u043E\u043C \xAB${r.status}\xBB, \u043D\u0443\u0436\u0435\u043D \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440`;
    if (r.can_post_messages === false) return `\u0431\u043E\u0442 \u0432 ${CHANNEL} \u0431\u0435\u0437 \u043F\u0440\u0430\u0432\u0430 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438`;
    return null;
  } catch (e) {
    return `\u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043A\u0430\u043D\u0430\u043B\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430: ${e.message}`;
  }
}
export {
  announceToChannel,
  checkChannelAccess,
  editMessage,
  sendMessage
};
