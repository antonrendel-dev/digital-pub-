// scheduler.ts
import { spawn } from "child_process";
import fs2 from "fs";
import path from "path";

// lib/telegram.js
var ANNOUNCE_CHANNEL = "@web_vacancy";
var BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN;
var CHAT_ID = process.env.SEO_LAB_CHAT_ID;
var THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : void 0;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN not set");
if (!CHAT_ID) throw new Error("SEO_LAB_CHAT_ID not set");
var API = `https://api.telegram.org/bot${BOT_TOKEN}`;
var CHANNEL = process.env.CONTENT_CHANNEL || ANNOUNCE_CHANNEL;
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

// lib/alert.ts
import fs from "fs";
var FACTORY_DIR = "/home/claude/projects/digital-pub-/scripts/content-factory";
var LOG_PATH = "/home/claude/projects/digital-pub-/logs/content-factory.log";
var FLAG_PATH = `${FACTORY_DIR}/data/.alert-sent`;
var FLAG_TTL_MS = 10 * 60 * 1e3;
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function readLogTail(lines = 10, logPath = LOG_PATH) {
  try {
    const all = fs.readFileSync(logPath, "utf-8").split("\n");
    return all.slice(-lines - 1).join("\n").trim();
  } catch {
    return "";
  }
}
function markAlertSent() {
  try {
    fs.writeFileSync(FLAG_PATH, String(Date.now()));
  } catch {
  }
}
function alertSentRecently(ttlMs = FLAG_TTL_MS) {
  try {
    const at = Number(fs.readFileSync(FLAG_PATH, "utf-8"));
    return Number.isFinite(at) && Date.now() - at < ttlMs;
  } catch {
    return false;
  }
}
function formatFailure(p, logTail = readLogTail()) {
  const err = p.error instanceof Error ? p.error.message : String(p.error);
  const lines = [`\u274C <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u043F\u0440\u043E\u0433\u043E\u043D \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D</b>`, ""];
  if (p.topicId != null || p.topicTitle) {
    const num = p.topicId != null ? `#${p.topicId}` : "";
    const title = p.topicTitle ? `${num ? ": " : ""}${escapeHtml(p.topicTitle)}` : "";
    lines.push(`\u{1F4CC} \u0422\u0435\u043C\u0430 ${num}${title}`.replace(/\s+/g, " ").trim());
  }
  lines.push(`\u2699\uFE0F \u0423\u043F\u0430\u043B\u043E \u043D\u0430: ${escapeHtml(p.stage || "\u0441\u0442\u0430\u0440\u0442, \u0434\u043E \u043F\u0435\u0440\u0432\u043E\u0433\u043E \u0448\u0430\u0433\u0430")}`);
  lines.push(`\u{1F527} \u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A: ${escapeHtml(p.source)}`);
  if (p.attempt) lines.push(`\u{1F501} \u041F\u043E\u043F\u044B\u0442\u043A\u0430 ${p.attempt.current} \u0438\u0437 ${p.attempt.total}`);
  lines.push("", `<b>\u041E\u0448\u0438\u0431\u043A\u0430</b>`, `<pre>${escapeHtml(err.slice(0, 600))}</pre>`);
  if (logTail) {
    lines.push(`<b>\u0425\u0432\u043E\u0441\u0442 \u043B\u043E\u0433\u0430</b>`, `<pre>${escapeHtml(logTail.slice(-1200))}</pre>`);
  }
  if (p.topicStaysInQueue) {
    lines.push("", `\u2705 \u0422\u0435\u043C\u0430 \u043E\u0441\u0442\u0430\u043B\u0430\u0441\u044C \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438 \u2014 \u0437\u0430\u0432\u0442\u0440\u0430 \u0437\u0430\u0432\u043E\u0434 \u0432\u043E\u0437\u044C\u043C\u0451\u0442 \u0435\u0451 \u0436\u0435.`);
  }
  return lines.join("\n");
}
async function sendFailureAlert(p) {
  const text = formatFailure(p);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendMessage(text);
      markAlertSent();
      return true;
    } catch (e) {
      console.error(`[alert] \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D (\u043F\u043E\u043F\u044B\u0442\u043A\u0430 ${attempt}/3): ${e.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 15e3));
    }
  }
  return false;
}

// lib/topic-gate.ts
var isMeasured = (t) => typeof t.wordstatVolume === "number";
function isReadyToWrite(t) {
  return Boolean(t.approved) && !t.published && isMeasured(t);
}

// scheduler.ts
var DATA_DIR = path.join(import.meta.dirname, "data");
var SCRIPTS_DIR = import.meta.dirname;
function getLatestTopicsFile() {
  const files = fs2.readdirSync(DATA_DIR).filter((f) => f.startsWith("topics_") && f.endsWith(".json")).sort().reverse();
  return files.length ? path.join(DATA_DIR, files[0]) : null;
}
function getNextApprovedTopic(topicsFile) {
  const { topics } = JSON.parse(fs2.readFileSync(topicsFile, "utf-8"));
  const next = topics.find(isReadyToWrite);
  if (!next) {
    const blocked = topics.filter((t) => t.approved && !t.published);
    if (blocked.length) {
      console.warn(
        `[scheduler] \u041E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C ${blocked.length}, \u043D\u043E \u043D\u0438 \u043E\u0434\u043D\u043E\u0439 \u0441 \u0437\u0430\u043C\u0435\u0440\u043E\u043C \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u0438. \u041F\u0435\u0440\u0432\u0430\u044F: #${blocked[0].id} "${blocked[0].keyword}". \u041F\u0440\u043E\u0433\u043D\u0430\u0442\u044C \u0437\u0430\u043C\u0435\u0440 \u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C.`
      );
    }
  }
  return next || null;
}
function countApprovedUnpublished(topicsFile) {
  const { topics } = JSON.parse(fs2.readFileSync(topicsFile, "utf-8"));
  return topics.filter((t) => t.approved && !t.published).length;
}
function runWriter(topicId) {
  return new Promise((resolve, reject) => {
    const writerPath = path.join(SCRIPTS_DIR, "writer.compiled.js");
    const child = spawn("node", [writerPath, String(topicId)], {
      cwd: SCRIPTS_DIR,
      env: process.env,
      stdio: "inherit"
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`writer \u0432\u044B\u0448\u0435\u043B \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`));
    });
    child.on("error", reject);
  });
}
var startedTopic = null;
async function main() {
  const topicsFile = getLatestTopicsFile();
  if (!topicsFile) {
    await sendMessage(
      `\u26A0\uFE0F <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u043D\u0435\u0442 \u0442\u0435\u043C</b>

\u0417\u0430\u043F\u0443\u0441\u0442\u0438 <code>/content_plan</code> \u0447\u0442\u043E\u0431\u044B \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0441\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u043B \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B.`
    );
    console.log("[scheduler] \u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0441 \u0442\u0435\u043C\u0430\u043C\u0438");
    return;
  }
  const nextTopic = getNextApprovedTopic(topicsFile);
  if (!nextTopic) {
    await sendMessage(
      `\u{1F4ED} <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u043D\u0435\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C</b>

\u0412\u0441\u0435 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0435 \u0442\u0435\u043C\u044B \u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u044B \u0438\u043B\u0438 \u0442\u0435\u043C \u043D\u0435\u0442.

\u041E\u0434\u043E\u0431\u0440\u0438 \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439:
<code>/content_approve 3 4 5 6 7</code>

\u0418\u043B\u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u044E \u043D\u043E\u0432\u044B\u0445:
<code>/content_plan</code>`
    );
    console.log("[scheduler] \u041D\u0435\u0442 \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u043D\u0435\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0442\u0435\u043C");
    return;
  }
  startedTopic = { id: nextTopic.id, title: nextTopic.title };
  const remaining = countApprovedUnpublished(topicsFile);
  console.log(`[scheduler] \u0417\u0430\u043F\u0443\u0441\u043A\u0430\u044E \u0442\u0435\u043C\u0443 #${nextTopic.id}: "${nextTopic.title}"`);
  console.log(`[scheduler] \u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u0442\u0435\u043C: ${remaining}`);
  if (remaining <= 6) {
    await sendMessage(
      `\u26A0\uFE0F <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u0437\u0430\u0432\u043E\u0434: \u0442\u0435\u043C \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C \u043C\u0430\u043B\u043E (${remaining})</b>

\u0417\u0430\u043F\u0443\u0441\u0442\u0438 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u0438 \u043E\u0434\u043E\u0431\u0440\u0438 \u043D\u043E\u0432\u044B\u0435 \u0442\u0435\u043C\u044B:
<code>/content_plan</code>`
    );
  }
  await runWriter(nextTopic.id);
}
main().catch(async (e) => {
  console.error("[scheduler] \u041E\u0448\u0438\u0431\u043A\u0430:", e);
  if (!alertSentRecently()) {
    await sendFailureAlert({
      source: "scheduler",
      stage: startedTopic ? "\u0437\u0430\u043F\u0443\u0441\u043A writer" : "\u0432\u044B\u0431\u043E\u0440 \u0442\u0435\u043C\u044B",
      topicId: startedTopic?.id ?? null,
      topicTitle: startedTopic?.title ?? null,
      error: e,
      topicStaysInQueue: Boolean(startedTopic)
    });
  } else {
    console.log("[scheduler] \u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0439 \u043E\u0442\u0431\u043E\u0439\u043D\u0438\u043A \u0443\u0436\u0435 \u0443\u0448\u0451\u043B \u0438\u0437 writer, \u043D\u0435 \u0434\u0443\u0431\u043B\u0438\u0440\u0443\u044E");
  }
  process.exit(1);
});
