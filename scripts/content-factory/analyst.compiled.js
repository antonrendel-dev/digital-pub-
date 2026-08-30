// analyst.ts
import { spawn } from "child_process";
import fs4 from "fs";
import path4 from "path";

// lib/model.ts
var DEFAULT_MODEL = {
  claude: "claude-opus-5",
  // Не gpt-5.5: у неё в каталоге моделей multi_agent_version = null, то есть
  // субагенты и роли недоступны. У gpt-5.6-sol — v2. Заводу это критично:
  // именно ролью передаётся dpub-content-standard.
  codex: "gpt-5.6-sol"
};
function modelFor(cli) {
  const explicit = process.env.CONTENT_FACTORY_MODEL;
  const explicitCli = process.env.CONTENT_FACTORY_CLI;
  if (explicit && (!explicitCli || explicitCli === cli)) return explicit;
  return DEFAULT_MODEL[cli] ?? DEFAULT_MODEL.claude;
}
var FACTORY_MODEL = modelFor(process.env.CONTENT_FACTORY_CLI || "claude");

// lib/agent-cli.ts
import { spawnSync } from "child_process";
import { existsSync } from "fs";
import os from "os";
import path from "path";
var WRITING_TOOLS = ["write", "edit", "bash", "notebookedit"];
function sandboxFor(allowedTools) {
  const tools = allowedTools.toLowerCase().split(",").map((t) => t.trim());
  return tools.some((t) => WRITING_TOOLS.includes(t)) ? "workspace-write" : "read-only";
}
var PROFILES = {
  claude(prompt, { model, agent, allowedTools, promptViaStdin }) {
    const args = ["-p"];
    if (model) args.push("--model", model);
    if (agent) {
      args.push("--agent", agent);
      if (allowedTools) args.push("--allowedTools", allowedTools);
    }
    if (!promptViaStdin) args.push(prompt);
    return { cmd: "claude", args };
  },
  codex(prompt, { model, agent, allowedTools, promptViaStdin }) {
    const args = ["exec"];
    if (model) args.push("--model", model);
    if (agent) args.push("--profile", agent);
    if (allowedTools) args.push("--sandbox", sandboxFor(allowedTools));
    if (!promptViaStdin) args.push(prompt);
    return { cmd: process.env.CONTENT_FACTORY_CLI_BIN || "codex", args };
  }
};
var CLI_PREFERENCE = ["claude", "codex"];
function cliInstalled(name) {
  const bin = name === "codex" ? process.env.CONTENT_FACTORY_CLI_BIN || "codex" : name;
  const res = spawnSync("sh", ["-c", `command -v ${bin}`], { stdio: "ignore" });
  return res.status === 0;
}
function resolveAgentCli() {
  const explicit = process.env.CONTENT_FACTORY_CLI;
  if (explicit) return explicit;
  for (const name of CLI_PREFERENCE) {
    if (cliInstalled(name)) return name;
  }
  return "claude";
}
var AGENT_CLI = resolveAgentCli();
function isCliLevelFailure(message) {
  const m = message.toLowerCase();
  return m.includes("requires a newer version") || m.includes("unknown model") || m.includes("model not found") || m.includes("unsupported model") || m.includes("enoent") || m.includes("command not found") || m.includes("not recognized");
}
function fallbackCli(current) {
  const other = CLI_PREFERENCE.find((n) => n !== current);
  if (!other) return null;
  return cliInstalled(other) ? other : null;
}
function buildAgentCommand(prompt, opts = {}, cli = AGENT_CLI) {
  const profile = PROFILES[cli];
  if (!profile) {
    throw new Error(
      `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 CONTENT_FACTORY_CLI=\xAB${cli}\xBB. \u0414\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435: ${Object.keys(PROFILES).join(", ")}`
    );
  }
  return profile(prompt, opts);
}
function supportsAgentProfiles(cli = AGENT_CLI, agent) {
  if (cli === "claude") return true;
  if (cli === "codex") {
    if (!agent) return true;
    const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
    return existsSync(path.join(home, `${agent}.config.toml`));
  }
  return false;
}

// lib/agent-role.ts
import fs from "fs";
import os2 from "os";
import path2 from "path";
var AGENTS_DIR = process.env.CLAUDE_AGENTS_DIR ?? path2.join(os2.homedir(), ".claude", "agents");
function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) return { front: "", body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { front: "", body: raw };
  return { front: raw.slice(3, end), body: raw.slice(end + 4).trim() };
}
function parseSkills(front) {
  const skills = [];
  let inSkills = false;
  for (const line of front.split("\n")) {
    if (/^skills:\s*$/.test(line)) {
      inSkills = true;
      continue;
    }
    if (inSkills) {
      const m = line.match(/^\s+-\s+(.+?)\s*$/);
      if (m) skills.push(m[1]);
      else if (line.trim() !== "") break;
    }
  }
  return skills;
}
function loadAgentRole(agent) {
  const file = path2.join(AGENTS_DIR, `${agent}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { front, body } = splitFrontmatter(raw);
  if (!body.trim()) return null;
  return { instructions: body, skills: parseSkills(front) };
}
function withRole(prompt, role) {
  return `\u0422\u044B \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0448\u044C \u0432 \u0440\u043E\u043B\u0438, \u043E\u043F\u0438\u0441\u0430\u043D\u043D\u043E\u0439 \u043D\u0438\u0436\u0435. \u0421\u043B\u0435\u0434\u0443\u0439 \u0435\u0439 \u043D\u0430 \u043F\u0440\u043E\u0442\u044F\u0436\u0435\u043D\u0438\u0438 \u0432\u0441\u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430.

===== \u0420\u041E\u041B\u042C =====
${role.instructions}
===== \u041A\u041E\u041D\u0415\u0426 \u0420\u041E\u041B\u0418 =====

===== \u0417\u0410\u0414\u0410\u0427\u0410 =====
${prompt}`;
}
var ROLE_TAG_RE = /^\s*\[(?:WRITER|ANALYST|SEO|EDITOR|MARKETER|REVIEWER)\]\s*/;
function stripRoleTag(text) {
  return text.replace(ROLE_TAG_RE, "");
}

// lib/agent-transcript.ts
import fs2 from "fs";
import path3 from "path";
var RUNS_ROOT = path3.join(process.cwd(), "logs", "factory-runs");
var KEEP_DAYS = 30;
var runDirectory = null;
var counter = 0;
function slugify(label) {
  return label.toLowerCase().replace(/[^a-zа-я0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "run";
}
function startRun(label) {
  if (runDirectory) return runDirectory;
  try {
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const dir = path3.join(RUNS_ROOT, `${stamp}-${slugify(label)}`);
    fs2.mkdirSync(dir, { recursive: true });
    runDirectory = dir;
    pruneOldRuns();
    return dir;
  } catch {
    return null;
  }
}
function recordExchange(agent, stage, prompt, answer) {
  if (!runDirectory) return;
  try {
    counter += 1;
    const name = `${String(counter).padStart(2, "0")}-${agent}-${slugify(stage ?? "\u0431\u0435\u0437-\u0448\u0430\u0433\u0430")}.md`;
    const body = `# ${agent} \xB7 ${stage ?? "\u0448\u0430\u0433 \u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D"}

_${(/* @__PURE__ */ new Date()).toISOString()}_

## \u041F\u0440\u043E\u043C\u043F\u0442

${prompt}

## \u041E\u0442\u0432\u0435\u0442

${answer}
`;
    fs2.writeFileSync(path3.join(runDirectory, name), body, "utf8");
  } catch {
  }
}
function pruneOldRuns() {
  try {
    const edge = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1e3;
    for (const entry of fs2.readdirSync(RUNS_ROOT)) {
      const dir = path3.join(RUNS_ROOT, entry);
      if (fs2.statSync(dir).mtimeMs < edge) fs2.rmSync(dir, { recursive: true, force: true });
    }
  } catch {
  }
}

// lib/pool.ts
import fs3 from "fs";

// lib/topic-gate.ts
var MIN_WORDSTAT_VOLUME = 300;
var MAX_WORDSTAT_VOLUME = 1600;
var byVolumeDesc = (a, b) => (b.wordstatVolume ?? 0) - (a.wordstatVolume ?? 0);
var isMeasured = (t) => typeof t.wordstatVolume === "number";
function inCorridor(volume) {
  return volume >= MIN_WORDSTAT_VOLUME && volume <= MAX_WORDSTAT_VOLUME;
}
function wordstatIsAlive(topics) {
  return topics.some((t) => isMeasured(t) && t.wordstatVolume > 0);
}
function splitByVolume(topics) {
  const unmeasured = topics.filter((t) => !isMeasured(t));
  const measured = topics.filter(isMeasured);
  if (!wordstatIsAlive(measured)) return { passed: measured, offTarget: [], unmeasured };
  return {
    passed: measured.filter((t) => inCorridor(t.wordstatVolume)).sort(byVolumeDesc),
    offTarget: measured.filter((t) => !inCorridor(t.wordstatVolume)).sort(byVolumeDesc),
    unmeasured
  };
}
function renumberByVolume(topics) {
  const sorted = [...topics].sort(byVolumeDesc);
  sorted.forEach((t, i) => t.id = i + 1);
  return sorted;
}
var TRAFFIC_MID_VOLUME = 700;
function trafficLabelFromVolume(volume) {
  if (typeof volume !== "number") return "\u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0440\u0430";
  if (volume < MIN_WORDSTAT_VOLUME) return "\u043D\u0438\u0437\u043A\u0438\u0439";
  if (volume < TRAFFIC_MID_VOLUME) return "\u0441\u0440\u0435\u0434\u043D\u0438\u0439";
  return "\u0432\u044B\u0441\u043E\u043A\u0438\u0439";
}
var QUEUE_REFILL_THRESHOLD = 10;

// lib/pool.ts
var VACANCY_TOKENS = ["\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438", "\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044F", "\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u044E", "\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439"];
var WORK_TOKENS = ["\u0440\u0430\u0431\u043E\u0442\u0430", "\u0440\u0430\u0431\u043E\u0442\u0443", "\u0440\u0430\u0431\u043E\u0442\u044B", "\u0440\u0430\u0431\u043E\u0442\u0435"];
var INFO_MARKERS = ["\u043A\u0430\u043A ", "\u0433\u0434\u0435 ", "\u0447\u0442\u043E ", "\u0447\u0435\u043C ", "\u0437\u0430\u0447\u0435\u043C", "\u043F\u043E\u0447\u0435\u043C\u0443", "\u0441\u043A\u043E\u043B\u044C\u043A\u043E", "\u043D\u0443\u0436\u043D\u043E \u043B\u0438"];
var BRAND_TOKENS = [
  "\u0430\u0432\u0438\u0442\u043E",
  "\u044F\u043D\u0434\u0435\u043A\u0441",
  "hh",
  "\u0445\u0435\u0434\u0445\u0430\u043D\u0442\u0435\u0440",
  "headhunter",
  "superjob",
  "\u0441\u0443\u043F\u0435\u0440\u0434\u0436\u043E\u0431",
  "\u043A\u0432\u043E\u0440\u043A"
];
function isListingIntent(phrase) {
  const lower = phrase.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  if (words.some((w) => BRAND_TOKENS.includes(w))) return true;
  const hasVacancy = words.some((w) => VACANCY_TOKENS.includes(w));
  const workAtEdge = WORK_TOKENS.includes(words[0]) || WORK_TOKENS.includes(words[words.length - 1]);
  if (!hasVacancy && !workAtEdge) return false;
  return !INFO_MARKERS.some((m) => lower.includes(m));
}
var normalize = (s) => s.toLowerCase().replace(/ё/g, "\u0435").replace(/[^а-яa-z0-9]+/g, " ").trim();
function buildPhrasePool(seeds, exclude = [], limit = 150) {
  const taken = new Set(exclude.map(normalize));
  const pool = /* @__PURE__ */ new Map();
  const offer = (phrase, volume, owned) => {
    if (owned || !inCorridor(volume)) return;
    if (isListingIntent(phrase) || taken.has(normalize(phrase))) return;
    const known = pool.get(phrase);
    if (known === void 0 || volume > known) pool.set(phrase, volume);
  };
  for (const [seed, data] of Object.entries(seeds)) {
    offer(seed, data.volume, Boolean(data.relevantUrl));
    for (const n of data.nested ?? []) offer(n.phrase, n.count, false);
  }
  return [...pool].map(([phrase, volume]) => ({ phrase, volume })).sort((a, b) => b.volume - a.volume).slice(0, limit);
}
function loadPhrasePool(file, exclude = [], limit = 150) {
  if (!fs3.existsSync(file)) {
    console.warn(`[pool] \u0417\u0430\u043C\u0435\u0440\u044B \u0412\u043E\u0440\u0434\u0441\u0442\u0430\u0442\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B: ${file}. \u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u043F\u043E\u0439\u0434\u0451\u0442 \u0431\u0435\u0437 \u043F\u0443\u043B\u0430.`);
    return [];
  }
  const raw = JSON.parse(fs3.readFileSync(file, "utf-8"));
  return buildPhrasePool(raw.seeds ?? {}, exclude, limit);
}
function renderPoolBlock(pool) {
  if (!pool.length) return "";
  return `
\u041F\u0423\u041B \u0417\u0410\u041C\u0415\u0420\u0415\u041D\u041D\u042B\u0425 \u0424\u0420\u0410\u0417 (\u042F\u043D\u0434\u0435\u043A\u0441.\u0412\u043E\u0440\u0434\u0441\u0442\u0430\u0442, \u0432\u0441\u0435 \u0443\u0436\u0435 \u0432 \u043A\u043E\u0440\u0438\u0434\u043E\u0440\u0435 ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/\u043C\u0435\u0441).
\u0411\u0435\u0440\u0438 \u043A\u043B\u044E\u0447\u0438 \u041E\u0422\u0421\u042E\u0414\u0410. \u0426\u0438\u0444\u0440\u0430 \u0440\u044F\u0434\u043E\u043C \u0441 \u0444\u0440\u0430\u0437\u043E\u0439 \u2014 \u044D\u0442\u043E \u0437\u0430\u043C\u0435\u0440, \u0430 \u043D\u0435 \u043E\u0446\u0435\u043D\u043A\u0430, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0432\u0437\u044F\u0442\u0430\u044F
\u0438\u0437 \u043F\u0443\u043B\u0430 \u0442\u0435\u043C\u0430 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u0433\u0435\u0439\u0442 \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u0438. \u041F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0442\u044C \u043A\u043B\u044E\u0447 \u0441\u0430\u043C \u043C\u043E\u0436\u043D\u043E
\u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0432 \u043F\u0443\u043B\u0435 \u043D\u0435\u0442 \u043D\u0438\u0447\u0435\u0433\u043E \u043F\u043E \u043D\u0443\u0436\u043D\u043E\u0439 \u0442\u0435\u043C\u0435 \u2014 \u0438 \u0442\u043E\u0433\u0434\u0430 \u0442\u0430\u043A \u0438 \u043D\u0430\u043F\u0438\u0448\u0438 \u0432 \u043F\u043E\u043B\u0435 source.
` + pool.map((p) => `- ${p.phrase} \u2014 ${p.volume.toLocaleString("ru-RU")}/\u043C\u0435\u0441`).join("\n");
}

// lib/telegram.js
var BOT_TOKEN = process.env.CONTENT_BOT_TOKEN || process.env.BOT_TOKEN;
var CHAT_ID = process.env.SEO_LAB_CHAT_ID;
var THREAD_ID = process.env.SEO_LAB_TOPIC_ID ? Number(process.env.SEO_LAB_TOPIC_ID) : void 0;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN not set");
if (!CHAT_ID) throw new Error("SEO_LAB_CHAT_ID not set");
var API = `https://api.telegram.org/bot${BOT_TOKEN}`;
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

// lib/yandex.js
var YANDEX_SEARCH_API_KEY = process.env.YANDEX_SEARCH_API_KEY || "";
var YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID || "";
var YANDEX_WEBMASTER_TOKEN = process.env.YANDEX_WEBMASTER_TOKEN || "";
var WEBMASTER_USER_ID = process.env.YANDEX_WEBMASTER_USER_ID || "1225208489";
var WEBMASTER_HOST = process.env.YANDEX_WEBMASTER_HOST || "https:d-pub.ru:443";
async function fetchWordstatPhrase(keyword, numPhrases = 20) {
  if (!YANDEX_SEARCH_API_KEY || !YANDEX_FOLDER_ID) {
    console.log("[yandex] Wordstat: YANDEX_SEARCH_API_KEY / YANDEX_FOLDER_ID \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u044B, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E");
    return { total: null, nested: [] };
  }
  try {
    const res = await fetch("https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${YANDEX_SEARCH_API_KEY}`,
        "X-Folder-Id": YANDEX_FOLDER_ID
      },
      body: JSON.stringify({ phrase: keyword, num_phrases: numPhrases })
    });
    if (res.status === 429) {
      console.warn(`[yandex] Wordstat: \u043A\u0432\u043E\u0442\u0430 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D\u0430 \u043D\u0430 "${keyword}"`);
      return { total: null, nested: [] };
    }
    if (!res.ok) throw new Error(`Wordstat HTTP ${res.status}`);
    const data = await res.json();
    return {
      // results[0].count — частотность вложенной фразы, а не запрошенной,
      // подставлять её вместо totalCount нельзя.
      total: data.totalCount === void 0 ? 0 : Number(data.totalCount),
      nested: (data.results ?? []).map((r) => ({ phrase: r.phrase, count: Number(r.count) }))
    };
  } catch (e) {
    console.warn(`[yandex] Wordstat \u0434\u043B\u044F "${keyword}" \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:`, e.message);
    return { total: null, nested: [] };
  }
}
async function fetchWordstatVolume(keyword) {
  return (await fetchWordstatPhrase(keyword, 1)).total;
}
async function fetchWebmasterQueries(limit = 100) {
  if (!YANDEX_WEBMASTER_TOKEN) {
    console.log("[yandex] Webmaster: YANDEX_WEBMASTER_TOKEN \u043D\u0435 \u0437\u0430\u0434\u0430\u043D, \u043F\u0440\u043E\u043F\u0443\u0441\u043A\u0430\u044E");
    return [];
  }
  try {
    const url = `https://api.webmaster.yandex.net/v4/user/${WEBMASTER_USER_ID}/hosts/${WEBMASTER_HOST}/search-queries/popular?order_by=TOTAL_SHOWS&query_indicator=TOTAL_SHOWS&query_indicator=TOTAL_CLICKS&limit=${limit}`;
    const res = await fetch(url, { headers: { Authorization: `OAuth ${YANDEX_WEBMASTER_TOKEN}` } });
    if (!res.ok) throw new Error(`Webmaster HTTP ${res.status}`);
    const data = await res.json();
    return (data.queries ?? []).map((q) => ({
      query: q.query_text,
      shows: q.indicators.TOTAL_SHOWS ?? 0,
      clicks: q.indicators.TOTAL_CLICKS ?? 0
    }));
  } catch (e) {
    console.warn("[yandex] Webmaster \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D:", e.message);
    return [];
  }
}
var RELEVANT_TERMS = [
  "\u0432\u0430\u043A\u0430\u043D",
  "\u0440\u0430\u0431\u043E\u0442",
  "\u0443\u0434\u0430\u043B",
  "\u0437\u0430\u0440\u043F\u043B\u0430\u0442",
  "\u0440\u0435\u0437\u044E\u043C\u0435",
  "\u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E",
  "\u0444\u0440\u0438\u043B\u0430\u043D\u0441",
  "\u043D\u0430\u0439\u043C",
  "\u043D\u0430\u043D\u044F",
  "\u0441\u043E\u0438\u0441\u043A\u0430\u0442",
  "\u0432\u0430\u043A\u0430\u043D\u0441",
  "digital",
  "\u0434\u0438\u0434\u0436\u0438\u0442\u0430\u043B",
  "\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433",
  "\u043C\u0430\u0440\u043A\u0435\u0442\u0438\u043D\u0433",
  "\u0434\u0438\u0437\u0430\u0439\u043D",
  "smm",
  "\u0441\u043C\u043C",
  "\u0442\u0430\u0440\u0433\u0435\u0442",
  "\u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442",
  "\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A",
  "\u043A\u043E\u043D\u0442\u0435\u043D\u0442",
  "\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442",
  "\u043C\u0435\u043D\u0435\u0434\u0436\u0435\u0440",
  "\u0434\u0438\u0440\u0435\u043A\u0442"
];
var DOMAIN_SPAM = /https?:|www\.|\S+\.(ru|su|com|net|org|io|me|ai|рф)\b/i;
function isRelevantQuery(q) {
  if (DOMAIN_SPAM.test(q)) return false;
  const lower = q.toLowerCase();
  return RELEVANT_TERMS.some((t) => lower.includes(t));
}
async function fetchWebmasterOpportunities(topN = 20) {
  const all = await fetchWebmasterQueries(100);
  return all.filter((q) => q.shows > 0 && isRelevantQuery(q.query)).sort((a, b) => {
    const gapA = a.shows - a.clicks * 5;
    const gapB = b.shows - b.clicks * 5;
    return gapB - gapA;
  }).slice(0, topN);
}

// analyst.ts
var DATA_DIR = path4.join(import.meta.dirname, "data");
var ARTICLES_DIR = path4.join(import.meta.dirname, "../../content/articles");
var VOLUMES_FILE = path4.join(DATA_DIR, "semantics-volumes.json");
var POOL_SIZE = 150;
var TOPICS_REQUESTED = 30;
var TOPICS_FOR_JOBSEEKERS = Math.round(TOPICS_REQUESTED * 0.9);
function getPublishedArticleTitles() {
  if (!fs4.existsSync(ARTICLES_DIR)) return [];
  return fs4.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx")).flatMap((f) => {
    const raw = fs4.readFileSync(path4.join(ARTICLES_DIR, f), "utf-8");
    const m = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
    return m ? [m[1]] : [];
  });
}
function getAllPlannedTopics() {
  if (!fs4.existsSync(DATA_DIR)) return [];
  return fs4.readdirSync(DATA_DIR).filter((f) => f.startsWith("topics_") && f.endsWith(".json")).flatMap((f) => {
    const { topics } = JSON.parse(fs4.readFileSync(path4.join(DATA_DIR, f), "utf-8"));
    return topics.map((t) => ({ title: t.title, keyword: t.keyword }));
  });
}
var AGENT_TOOLS = "Read,Skill,Glob,Grep";
function askClaudeOnce(prompt, agent, cli) {
  return new Promise((resolve, reject) => {
    let effectivePrompt = prompt;
    let agentFlag;
    if (agent) {
      if (supportsAgentProfiles(cli, agent)) {
        agentFlag = agent;
      } else {
        const role = loadAgentRole(agent);
        if (role) {
          effectivePrompt = withRole(prompt, role);
          if (role.skills.length > 0) {
            console.log(
              `    \u26A0 ${agent}: \u0440\u043E\u043B\u044C \u043F\u0435\u0440\u0435\u0434\u0430\u043D\u0430 \u0442\u0435\u043A\u0441\u0442\u043E\u043C, \u0441\u043A\u0438\u043B\u043B\u044B \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B (${role.skills.join(", ")})`
            );
          }
        } else {
          console.log(`    \u26A0 ${agent}: \u043F\u0440\u043E\u0444\u0438\u043B\u044C \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D, \u0430\u0433\u0435\u043D\u0442 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0431\u0435\u0437 \u0440\u043E\u043B\u0438`);
        }
      }
    }
    const { cmd, args } = buildAgentCommand(
      "",
      {
        model: modelFor(cli),
        agent: agentFlag,
        allowedTools: AGENT_TOOLS,
        promptViaStdin: true
      },
      cli
    );
    const child = spawn(cmd, args, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    child.stdin.write(effectivePrompt);
    child.stdin.end();
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => out += d.toString());
    child.stderr.on("data", (d) => err += d.toString());
    child.on("close", (code) => {
      if (code === 0) resolve(stripRoleTag(out.trim()));
      else reject(new Error(err || `claude \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`));
    });
    child.on("error", reject);
  });
}
async function askClaude(prompt, agent) {
  try {
    const answer = await askClaudeOnce(prompt, agent, AGENT_CLI);
    recordExchange(agent ?? "\u0431\u0435\u0437-\u0440\u043E\u043B\u0438", null, prompt, answer);
    return answer;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const spare = isCliLevelFailure(message) ? fallbackCli(AGENT_CLI) : null;
    if (!spare) throw e;
    console.log(
      `    \u26A0 ${AGENT_CLI} \u043D\u0435 \u0441\u043C\u043E\u0433 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C\u0441\u044F (${message.slice(0, 160)}). \u041F\u0435\u0440\u0435\u0445\u043E\u0436\u0443 \u043D\u0430 ${spare}.`
    );
    const answer = await askClaudeOnce(prompt, agent, spare);
    recordExchange(agent ?? "\u0431\u0435\u0437-\u0440\u043E\u043B\u0438", `\u0437\u0430\u043F\u0430\u0441\u043D\u043E\u0439 CLI ${spare}`, prompt, answer);
    return answer;
  }
}
var REFORMULATION_ROUNDS = 2;
async function reformulateTopics(offTarget) {
  const fixed = [];
  let pending = offTarget;
  for (let round = 1; round <= REFORMULATION_ROUNDS && pending.length; round++) {
    console.log(`[analyst] \u041F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430, \u043A\u0440\u0443\u0433 ${round}: ${pending.length} \u0442\u0435\u043C`);
    const raw = await askClaude(
      `\u0422\u044B SEO-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E job board d-pub.ru (\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0438 \u0440\u0435\u0437\u044E\u043C\u0435 digital-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432).

\u041D\u0438\u0436\u0435 \u0442\u0435\u043C\u044B, \u043A\u043B\u044E\u0447\u0438 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u041D\u0415 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u0432 \u0440\u0430\u0431\u043E\u0447\u0438\u0439 \u043A\u043E\u0440\u0438\u0434\u043E\u0440 ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME} \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432/\u043C\u0435\u0441 \u043F\u043E \u042F\u043D\u0434\u0435\u043A\u0441.\u0412\u043E\u0440\u0434\u0441\u0442\u0430\u0442\u0443. \u041F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u0443\u0439 \u041A\u0410\u0416\u0414\u0423\u042E \u0442\u0430\u043A, \u0447\u0442\u043E\u0431\u044B \u043A\u043B\u044E\u0447 \u043F\u043E\u043F\u0430\u043B \u0432 \u043A\u043E\u0440\u0438\u0434\u043E\u0440, \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0432 \u0438\u0441\u0445\u043E\u0434\u043D\u0443\u044E \u043F\u043E\u043B\u044C\u0437\u0443 \u0434\u043B\u044F \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044F.

\u041A\u043E\u0440\u0438\u0434\u043E\u0440 \u0441 \u0434\u0432\u0443\u0445 \u0441\u0442\u043E\u0440\u043E\u043D:
- \u041D\u0438\u0436\u0435 ${MIN_WORDSTAT_VOLUME}/\u043C\u0435\u0441 \u2014 \u0441\u043F\u0440\u043E\u0441\u0430 \u043D\u0435\u0442, \u0441\u0442\u0430\u0442\u044C\u044F \u043F\u0438\u0448\u0435\u0442\u0441\u044F \u0432 \u043D\u0438\u043A\u0443\u0434\u0430. \u041D\u0443\u0436\u043D\u0430 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u0428\u0418\u0420\u0415.
- \u0412\u044B\u0448\u0435 ${MAX_WORDSTAT_VOLUME}/\u043C\u0435\u0441 \u2014 \u044D\u0442\u043E \u0412\u0427-\u0437\u0430\u043F\u0440\u043E\u0441, \u0442\u0430\u043C hh.ru \u0438 superjob, \u043C\u044B \u043D\u0435 \u0440\u0430\u043D\u0436\u0438\u0440\u0443\u0435\u043C\u0441\u044F. \u041D\u0443\u0436\u043D\u0430 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430 \u0423\u0416\u0415.

\u041A\u0430\u043A \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C:
- \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0443\u0437\u043A\u0438\u0439 \u043A\u043B\u044E\u0447 \u0440\u0430\u0441\u0448\u0438\u0440\u044F\u0435\u043C: \xAB\u043A\u043E\u043D\u0442\u0440\u043E\u0444\u0444\u0435\u0440 \u0441\u0442\u043E\u0438\u0442 \u043B\u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C\xBB (2/\u043C\u0435\u0441) \u2192 \xAB\u043F\u0435\u0440\u0435\u0433\u043E\u0432\u043E\u0440\u044B \u043E \u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0435\xBB ; \xAB\u043F\u0440\u043E\u0431\u0435\u043B \u0432 \u0440\u0435\u0437\u044E\u043C\u0435 \u043A\u0430\u043A \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C\xBB (2/\u043C\u0435\u0441) \u2192 \xAB\u043A\u0430\u043A \u0441\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0440\u0435\u0437\u044E\u043C\u0435\xBB
- \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0448\u0438\u0440\u043E\u043A\u0438\u0439 \u043A\u043B\u044E\u0447 \u0441\u0443\u0436\u0430\u0435\u043C \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u0438\u0435\u043C \u2014 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u0435\u0439, \u0443\u0440\u043E\u0432\u043D\u0435\u043C, \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u043C \u0440\u0430\u0431\u043E\u0442\u044B, \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u043E\u043C: \xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\xBB (12000/\u043C\u0435\u0441) \u2192 \xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433 \u043C\u0430\u0440\u043A\u0435\u0442\u043F\u043B\u0435\u0439\u0441\u043E\u0432\xBB ; \xAB\u0440\u0435\u0437\u044E\u043C\u0435 \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u0430\xBB (5000/\u043C\u0435\u0441) \u2192 \xAB\u0440\u0435\u0437\u044E\u043C\u0435 \u0434\u0436\u0443\u043D\u0438\u043E\u0440 \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u0430 \u0431\u0435\u0437 \u043E\u043F\u044B\u0442\u0430\xBB
- \u0420\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0448\u0430\u0431\u043B\u043E\u043D\u044B: \xAB\u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 <\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F>\xBB, \xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 <\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F>\xBB, \xAB\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F <X>\xBB, \xAB\u043A\u0430\u043A \u0441\u0442\u0430\u0442\u044C <X>\xBB, \xAB<X> \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435\xBB, \xAB\u0440\u0435\u0437\u044E\u043C\u0435 <X>\xBB, \xAB\u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E <X>\xBB, \xAB\u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 <X>\xBB
- \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438 \u043F\u0435\u0440\u0435\u043F\u0438\u0448\u0438 \u043F\u043E\u0434 \u043D\u043E\u0432\u044B\u0439 \u043A\u043B\u044E\u0447, \u0442\u0435\u043C\u0430 \u0441\u0442\u0430\u0442\u044C\u0438 \u043C\u043E\u0436\u0435\u0442 \u0441\u0442\u0430\u0442\u044C \u0448\u0438\u0440\u0435 \u0438\u043B\u0438 \u0443\u0436\u0435 \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u0439
- \u041A\u043B\u044E\u0447 \u2014 2-4 \u0441\u043B\u043E\u0432\u0430, \u0431\u0435\u0437 \xAB\u043A\u0430\u043A\xBB, \xAB\u0441\u0442\u043E\u0438\u0442 \u043B\u0438\xBB, \xAB\u0447\u0442\u043E \u0434\u0435\u043B\u0430\u0442\u044C \u0435\u0441\u043B\u0438\xBB
- \u041D\u0435 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0439 \u043A\u043B\u044E\u0447, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0432 \u0441\u043F\u0438\u0441\u043A\u0435 \u043D\u0438\u0436\u0435

\u0422\u0415\u041C\u042B \u041D\u0410 \u041F\u0415\u0420\u0415\u0424\u041E\u0420\u041C\u0423\u041B\u0418\u0420\u041E\u0412\u041A\u0423:
${pending.map((t) => `id ${t.id}: "${t.title}" [\u043A\u043B\u044E\u0447: ${t.keyword} \u2014 ${t.wordstatVolume}/\u043C\u0435\u0441]`).join("\n")}

\u041E\u0442\u0432\u0435\u0442 \u0441\u0442\u0440\u043E\u0433\u043E \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON \u043C\u0430\u0441\u0441\u0438\u0432\u0430, \u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430:
[{"id": <\u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 id>, "title": "\u043D\u043E\u0432\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A", "keyword": "\u043D\u043E\u0432\u044B\u0439 \u043A\u043B\u044E\u0447"}]`,
      "analyst"
    );
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[analyst] \u041F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430: Claude \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON, \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u044E \u0442\u0435\u043C\u044B \u043A\u0430\u043A \u0435\u0441\u0442\u044C");
      break;
    }
    const rewrites = JSON.parse(jsonMatch[0]);
    const byId = new Map(rewrites.map((r) => [r.id, r]));
    for (const t of pending) {
      const r = byId.get(t.id);
      if (!r) continue;
      t.title = r.title;
      t.keyword = r.keyword;
      t.wordstatVolume = await fetchWordstatVolume(r.keyword);
      t.trafficEst = trafficLabelFromVolume(t.wordstatVolume);
    }
    const split = splitByVolume(pending);
    fixed.push(...split.passed);
    pending = [...split.offTarget, ...split.unmeasured];
    console.log(
      `[analyst] \u041A\u0440\u0443\u0433 ${round}: \u0434\u043E\u0436\u0430\u0442\u043E ${split.passed.length}, \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${pending.length}`
    );
  }
  return { fixed, weak: pending };
}
async function generateTopics() {
  const publishedTitles = getPublishedArticleTitles();
  const plannedTopics = getAllPlannedTopics();
  console.log("[analyst] \u0422\u044F\u043D\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u044B-\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0438\u0437 Webmaster...");
  const opportunities = await fetchWebmasterOpportunities(20);
  if (opportunities.length > 0) {
    console.log(`[analyst] Webmaster: ${opportunities.length} \u0446\u0435\u043B\u0435\u0432\u044B\u0445 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0441 \u043F\u043E\u043A\u0430\u0437\u0430\u043C\u0438`);
  }
  const publishedBlock = publishedTitles.length > 0 ? `
\u0423\u0416\u0415 \u041E\u041F\u0423\u0411\u041B\u0418\u041A\u041E\u0412\u0410\u041D\u041D\u042B\u0415 \u0421\u0422\u0410\u0422\u042C\u0418 (\u0441\u0442\u0440\u043E\u0433\u043E \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u044F\u0442\u044C, \u043D\u0435 \u043F\u0435\u0440\u0435\u0441\u0435\u043A\u0430\u0442\u044C\u0441\u044F \u043F\u043E \u0442\u0435\u043C\u0435):
` + publishedTitles.map((t) => `- ${t}`).join("\n") : "";
  const plannedBlock = plannedTopics.length > 0 ? `
\u0423\u0416\u0415 \u0417\u0410\u041F\u041B\u0410\u041D\u0418\u0420\u041E\u0412\u0410\u041D\u041D\u042B\u0415 \u0422\u0415\u041C\u042B (\u043D\u0435 \u0434\u0443\u0431\u043B\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u0438 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A, \u043D\u0438 \u043A\u043B\u044E\u0447):
` + plannedTopics.map((t) => `- ${t.title} [\u043A\u043B\u044E\u0447: ${t.keyword}]`).join("\n") : "";
  const pool = loadPhrasePool(
    VOLUMES_FILE,
    [
      ...plannedTopics.map((t) => t.keyword),
      ...plannedTopics.map((t) => t.title),
      ...publishedTitles
    ],
    POOL_SIZE
  );
  console.log(`[analyst] \u041F\u0443\u043B \u0437\u0430\u043C\u0435\u0440\u0435\u043D\u043D\u044B\u0445 \u0444\u0440\u0430\u0437: ${pool.length}`);
  const poolBlock = renderPoolBlock(pool);
  const opportunityBlock = opportunities.length > 0 ? `
\u0420\u0415\u0410\u041B\u042C\u041D\u042B\u0415 \u0417\u0410\u041F\u0420\u041E\u0421\u042B \u042F\u041D\u0414\u0415\u041A\u0421\u0410, \u0413\u0414\u0415 \u0421\u0410\u0419\u0422 \u0423\u0416\u0415 \u041F\u041E\u041A\u0410\u0417\u042B\u0412\u0410\u0415\u0422\u0421\u042F, \u041D\u041E \u041D\u0415 \u0412 \u0422\u041E\u041F\u0415 (\u0434\u0430\u043D\u043D\u044B\u0435 \u0412\u0435\u0431\u043C\u0430\u0441\u0442\u0435\u0440\u0430 \u0437\u0430 \u043D\u0435\u0434\u0435\u043B\u044E).
\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0438\u0437\u0438\u0440\u0443\u0439 5-7 \u0442\u0435\u043C, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u0440\u044F\u043C\u043E \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u044E\u0442 \u044D\u0442\u0438 \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u2014 \u0442\u0430\u043A \u043C\u044B \u0434\u043E\u0436\u043C\u0451\u043C \u043F\u043E\u0447\u0442\u0438-\u0440\u0430\u043D\u0436\u0438\u0440\u0443\u044E\u0449\u0438\u0439\u0441\u044F \u0442\u0440\u0430\u0444\u0438\u043A:
` + opportunities.map((o) => `- "${o.query}" \u2014 ${o.shows} \u043F\u043E\u043A\u0430\u0437\u043E\u0432, ${o.clicks} \u043A\u043B\u0438\u043A\u043E\u0432`).join("\n") : "";
  const raw = await askClaude(
    `\u0422\u044B SEO-\u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A \u0438 \u043A\u043E\u043D\u0442\u0435\u043D\u0442-\u0441\u0442\u0440\u0430\u0442\u0435\u0433 \u0434\u043B\u044F \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E job board d-pub.ru \u2014 \u0430\u0433\u0440\u0435\u0433\u0430\u0442\u043E\u0440\u0430 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439 \u0434\u043B\u044F digital-\u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u0432 (\u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\u0438, \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u044B, SMM, \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0438, \u043A\u043E\u043F\u0438\u0440\u0430\u0439\u0442\u0435\u0440\u044B, \u0442\u0430\u0440\u0433\u0435\u0442\u043E\u043B\u043E\u0433\u0438) \u0438\u0437 Telegram-\u043A\u0430\u043D\u0430\u043B\u043E\u0432.

\u0413\u041B\u0410\u0412\u041D\u0410\u042F \u0430\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F \u2014 \u0421\u041E\u0418\u0421\u041A\u0410\u0422\u0415\u041B\u0418 (\u0438\u0449\u0443\u0442 \u0440\u0430\u0431\u043E\u0442\u0443 \u0432 digital). \u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E \u0434\u0430\u043D\u043D\u044B\u043C\u0438: \u0441\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B (\xAB\u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 X\xBB, \xAB\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F X\xBB, \xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 X\xBB, \xAB\u043A\u0430\u043A \u0441\u0442\u0430\u0442\u044C X\xBB, \xAB\u0440\u0435\u0437\u044E\u043C\u0435/\u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E X\xBB) \u0438\u043C\u0435\u044E\u0442 \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u044C \u0432 \u0441\u043E\u0442\u043D\u0438-\u0442\u044B\u0441\u044F\u0447\u0438 \u0432 \u043C\u0435\u0441\u044F\u0446, \u0430 HR-\u0437\u0430\u043F\u0440\u043E\u0441\u044B (\xAB\u043A\u0430\u043A \u043D\u0430\u043D\u044F\u0442\u044C X\xBB, \xAB\u0433\u0434\u0435 \u043D\u0430\u0439\u0442\u0438 \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u0430\xBB) \u2014 0-23/\u043C\u0435\u0441. \u041F\u043E\u044D\u0442\u043E\u043C\u0443 HR-\u0442\u0435\u043C\u044B \u043F\u043E\u0447\u0442\u0438 \u043D\u0435 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u043C.
${publishedBlock}${plannedBlock}${poolBlock}${opportunityBlock}

\u0421\u043E\u0441\u0442\u0430\u0432\u044C \u0441\u043F\u0438\u0441\u043E\u043A ${TOPICS_REQUESTED} \u041D\u041E\u0412\u042B\u0425 \u0442\u0435\u043C \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u0435\u0439 \u043D\u0430 \u0431\u043B\u043E\u0433 \u2014 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0445, \u043D\u0435 \u043F\u0435\u0440\u0435\u0441\u0435\u043A\u0430\u044E\u0449\u0438\u0445\u0441\u044F \u0441 \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0435\u043D\u043D\u044B\u043C \u0432\u044B\u0448\u0435. \u0414\u043B\u044F \u043A\u0430\u0436\u0434\u043E\u0439 \u0442\u0435\u043C\u044B \u0443\u043A\u0430\u0436\u0438:
- \u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438 (\u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u044B\u0439, \u0441 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u043E\u043C)
- \u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u043A\u043B\u044E\u0447 (1-2 \u0441\u043B\u043E\u0432\u0430/\u0444\u0440\u0430\u0437\u044B, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0438\u0449\u0443\u0442)
- \u0410\u0443\u0434\u0438\u0442\u043E\u0440\u0438\u044F: \u0421\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C / HR / \u041E\u0431\u0430
- \u0422\u0438\u043F \u043A\u043E\u043D\u0442\u0435\u043D\u0442\u0430: \u0413\u0430\u0439\u0434 / \u041A\u043E\u043D\u0441\u043F\u0435\u043A\u0442 / \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435 / \u041A\u0435\u0439\u0441 / \u0427\u0435\u043A\u043B\u0438\u0441\u0442
- \u041F\u0440\u0438\u043C\u0435\u0440\u043D\u044B\u0439 \u0442\u0440\u0430\u0444\u0438\u043A-\u043F\u043E\u0442\u0435\u043D\u0446\u0438\u0430\u043B: \u043D\u0438\u0437\u043A\u0438\u0439 (<200/\u043C\u0435\u0441) / \u0441\u0440\u0435\u0434\u043D\u0438\u0439 (200-800/\u043C\u0435\u0441) / \u0432\u044B\u0441\u043E\u043A\u0438\u0439 (>800/\u043C\u0435\u0441)

\u0422\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u044F \u043A \u0442\u0435\u043C\u0430\u043C:
- \u0412\u0435\u0447\u043D\u043E\u0437\u0435\u043B\u0451\u043D\u044B\u0435 (\u043D\u0435 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u044B \u043A \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u043E\u0439 \u0434\u0430\u0442\u0435)
- \u041F\u0440\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u0435, \u0440\u0435\u0448\u0430\u044E\u0442 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u0443\u044E \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443
- \u041A\u043B\u044E\u0447 \u0431\u0435\u0440\u0438 \u0438\u0437 \u041F\u0423\u041B\u0410 \u0417\u0410\u041C\u0415\u0420\u0415\u041D\u041D\u042B\u0425 \u0424\u0420\u0410\u0417 \u0432\u044B\u0448\u0435 \u2014 \u043E\u043D \u0432\u0435\u0441\u044C \u0443\u0436\u0435 \u0432 \u043A\u043E\u0440\u0438\u0434\u043E\u0440\u0435 ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/\u043C\u0435\u0441, \u0438 \u0442\u0430\u043A\u0430\u044F \u0442\u0435\u043C\u0430 \u043F\u0440\u043E\u0445\u043E\u0434\u0438\u0442 \u0433\u0435\u0439\u0442 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u043E. \u0412 \u043F\u043E\u043B\u0435 source \u043F\u0438\u0448\u0438 "\u043F\u0443\u043B". \u041F\u0440\u0438\u0434\u0443\u043C\u044B\u0432\u0430\u0442\u044C \u043A\u043B\u044E\u0447 \u0441\u0430\u043C \u043C\u043E\u0436\u043D\u043E, \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0432 \u043F\u0443\u043B\u0435 \u043D\u0435\u0442 \u043D\u0438\u0447\u0435\u0433\u043E \u043F\u043E \u043D\u0443\u0436\u043D\u043E\u0439 \u0442\u0435\u043C\u0435: \u0442\u043E\u0433\u0434\u0430 source \u2014 "\u0441\u0432\u043E\u0439", \u0438 \u043A\u043B\u044E\u0447 \u0432\u0441\u0451 \u0440\u0430\u0432\u043D\u043E \u0434\u043E\u043B\u0436\u0435\u043D \u043F\u043E\u043F\u0430\u0441\u0442\u044C \u0432 \u043A\u043E\u0440\u0438\u0434\u043E\u0440, \u0438\u043D\u0430\u0447\u0435 \u0442\u0435\u043C\u0430 \u0443\u0439\u0434\u0451\u0442 \u043D\u0430 \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0443. \u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0443\u0437\u043A\u0438\u0435 (\xAB\u043A\u043E\u043D\u0442\u0440\u043E\u0444\u0444\u0435\u0440 \u0441\u0442\u043E\u0438\u0442 \u043B\u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C\xBB, \xAB\u043F\u0440\u043E\u0431\u0435\u043B \u0432 \u0440\u0435\u0437\u044E\u043C\u0435 \u043A\u0430\u043A \u043E\u0431\u044A\u044F\u0441\u043D\u0438\u0442\u044C\xBB \u2014 1-2 \u0437\u0430\u043F\u0440\u043E\u0441\u0430/\u043C\u0435\u0441) \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0439. \u0413\u043E\u043B\u044B\u0435 \u0412\u0427-\u0437\u0430\u043F\u0440\u043E\u0441\u044B (\xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u043C\u0430\u0440\u043A\u0435\u0442\u043E\u043B\u043E\u0433\xBB, \xAB\u0440\u0435\u0437\u044E\u043C\u0435 \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u0430\xBB \u2014 \u0442\u044B\u0441\u044F\u0447\u0438 \u0432 \u043C\u0435\u0441\u044F\u0446) \u0442\u043E\u0436\u0435 \u043D\u0435 \u043F\u0440\u0435\u0434\u043B\u0430\u0433\u0430\u0439: \u0442\u0430\u043C hh.ru \u0438 superjob, \u043C\u044B \u043D\u0435 \u0440\u0430\u043D\u0436\u0438\u0440\u0443\u0435\u043C\u0441\u044F
- \u041A\u043B\u044E\u0447 \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u043C \u0437\u0430 \u0441\u043F\u0438\u0441\u043A\u043E\u043C \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0439 (\xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 \u0442\u0430\u0440\u0433\u0435\u0442\u043E\u043B\u043E\u0433\xBB, \xAB\u0440\u0430\u0431\u043E\u0442\u0430 \u0434\u0438\u0437\u0430\u0439\u043D\u0435\u0440\u043E\u043C \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u043E\xBB) \u2014 \u0442\u0430\u043A\u043E\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u0430\u044F \u0434\u0436\u043E\u0431-\u0431\u043E\u0440\u0434\u0430, \u0438 \u0441\u0442\u0430\u0442\u044C\u044F \u043E\u0442\u0431\u0438\u0440\u0430\u0435\u0442 \u0442\u0440\u0430\u0444\u0438\u043A \u0443 \u043D\u0430\u0448\u0435\u0439 \u0436\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B
- \u041C\u0438\u043D\u0438\u043C\u0443\u043C ${TOPICS_FOR_JOBSEEKERS} \u0438\u0437 ${TOPICS_REQUESTED} \u0442\u0435\u043C \u2014 \u0434\u043B\u044F \u0441\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u0435\u0439, \u0441 \u043A\u043B\u044E\u0447\u0430\u043C\u0438 \u043F\u043E \u0448\u0430\u0431\u043B\u043E\u043D\u0430\u043C: \xAB\u0437\u0430\u0440\u043F\u043B\u0430\u0442\u0430 <\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F>\xBB, \xAB\u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u044F <X>\xBB, \xAB\u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 <X>\xBB, \xAB\u043A\u0430\u043A \u0441\u0442\u0430\u0442\u044C <X>\xBB, \xAB<X> \u0441 \u043D\u0443\u043B\u044F\xBB, \xAB\u0440\u0435\u0437\u044E\u043C\u0435 <X>\xBB, \xAB\u043F\u043E\u0440\u0442\u0444\u043E\u043B\u0438\u043E <X>\xBB, \xAB\u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043E\u0432\u0430\u043D\u0438\u0435 <X>\xBB, \xAB\u0442\u0435\u0441\u0442\u043E\u0432\u043E\u0435 \u0437\u0430\u0434\u0430\u043D\u0438\u0435 <X>\xBB
- \u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 2-3 \u0442\u0435\u043C\u044B \u0434\u043B\u044F HR \u2014 \u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u043A\u043B\u044E\u0447 \u0440\u0435\u0430\u043B\u044C\u043D\u043E \u0438\u0449\u0443\u0442 (\u043D\u0435 \xAB\u043A\u0430\u043A \u043D\u0430\u043D\u044F\u0442\u044C X\xBB)
- \u0412\u043A\u043B\u044E\u0447\u0438 3-4 \u0442\u0435\u043C\u044B \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 "\u043A\u043E\u043D\u0441\u043F\u0435\u043A\u0442 \u0437\u0430\u0440\u0443\u0431\u0435\u0436\u043D\u043E\u0433\u043E \u043C\u0430\u0442\u0435\u0440\u0438\u0430\u043B\u0430" (\u043F\u0435\u0440\u0435\u0441\u043A\u0430\u0437 \u0437\u0430\u0440\u0443\u0431\u0435\u0436\u043D\u044B\u0445 best practices)
- \u041D\u0435 \u0434\u0443\u0431\u043B\u0438\u0440\u0443\u0439 \u0442\u043E \u0447\u0442\u043E \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u043D\u0430 hh.ru \u0438\u043B\u0438 superjob
- \u041A\u0430\u0436\u0434\u0430\u044F \u0442\u0435\u043C\u0430 \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441 \u2014 \u043D\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0434\u0432\u0443\u0445 \u0442\u0435\u043C \u043F\u043E \u043E\u0434\u043D\u043E\u0439 \u0442\u0435\u043C\u0435 \u0441 \u0440\u0430\u0437\u043D\u044B\u043C\u0438 \u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0430\u043C\u0438

\u041E\u0442\u0432\u0435\u0442 \u0441\u0442\u0440\u043E\u0433\u043E \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON \u043C\u0430\u0441\u0441\u0438\u0432\u0430, \u0431\u0435\u0437 \u043B\u0438\u0448\u043D\u0435\u0433\u043E \u0442\u0435\u043A\u0441\u0442\u0430:
[
  {
    "id": 1,
    "title": "...",
    "keyword": "...",
    "audience": "\u0421\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C|HR|\u041E\u0431\u0430",
    "type": "\u0413\u0430\u0439\u0434|\u041A\u043E\u043D\u0441\u043F\u0435\u043A\u0442|\u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435|\u041A\u0435\u0439\u0441|\u0427\u0435\u043A\u043B\u0438\u0441\u0442",
    "source": "\u043F\u0443\u043B|\u0441\u0432\u043E\u0439"
  }
]`,
    "analyst"
  );
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Claude \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B JSON");
  const topics = JSON.parse(jsonMatch[0]);
  const measured = new Map(pool.map((p) => [p.phrase.toLowerCase(), p.volume]));
  const fromPool = topics.filter((t) => measured.has(t.keyword.toLowerCase()));
  const toMeasure = topics.filter((t) => !measured.has(t.keyword.toLowerCase()));
  fromPool.forEach((t) => t.wordstatVolume = measured.get(t.keyword.toLowerCase()));
  console.log(
    `[analyst] \u0418\u0437 \u043F\u0443\u043B\u0430 ${fromPool.length} \u0442\u0435\u043C (\u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u044C \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430), \u0441\u043D\u0438\u043C\u0430\u044E Wordstat \u043F\u043E ${toMeasure.length}...`
  );
  await Promise.all(
    toMeasure.map(async (t) => {
      t.wordstatVolume = await fetchWordstatVolume(t.keyword);
    })
  );
  topics.forEach((t) => t.trafficEst = trafficLabelFromVolume(t.wordstatVolume));
  if (toMeasure.length && !wordstatIsAlive(toMeasure)) {
    console.log("[analyst] Wordstat: \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430, \u0433\u0435\u0439\u0442 \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D");
    return { topics, weak: [] };
  }
  const { passed, offTarget, unmeasured } = splitByVolume(topics);
  console.log(
    `[analyst] \u0413\u0435\u0439\u0442 ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/\u043C\u0435\u0441: \u043F\u0440\u043E\u0448\u043B\u043E ${passed.length}, \u043D\u0430 \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043A\u0443 ${offTarget.length}, \u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0440\u0430 ${unmeasured.length}`
  );
  const { fixed, weak } = await reformulateTopics(offTarget);
  weak.forEach((t) => t.offTarget = true);
  unmeasured.forEach((t) => t.offTarget = true);
  return {
    topics: renumberByVolume([...passed, ...fixed, ...weak, ...unmeasured]),
    weak: [...weak, ...unmeasured]
  };
}
function formatTopicsMessage(topics, weak, date) {
  const audienceEmoji = { \u0421\u043E\u0438\u0441\u043A\u0430\u0442\u0435\u043B\u044C: "\u{1F464}", HR: "\u{1F4BC}", \u041E\u0431\u0430: "\u{1F465}" };
  const typeEmoji = {
    \u0413\u0430\u0439\u0434: "\u{1F4D8}",
    \u041A\u043E\u043D\u0441\u043F\u0435\u043A\u0442: "\u{1F4F9}",
    \u0421\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u0435: "\u2696\uFE0F",
    \u041A\u0435\u0439\u0441: "\u{1F4A1}",
    \u0427\u0435\u043A\u043B\u0438\u0441\u0442: "\u2705"
  };
  const trafficEmoji = { \u043D\u0438\u0437\u043A\u0438\u0439: "\u{1F4C9}", \u0441\u0440\u0435\u0434\u043D\u0438\u0439: "\u{1F4CA}", \u0432\u044B\u0441\u043E\u043A\u0438\u0439: "\u{1F680}" };
  const lines = topics.map((t) => {
    const vol = t.wordstatVolume && t.wordstatVolume > 0 ? ` \xB7 \u{1F4C8} ${t.wordstatVolume.toLocaleString("ru-RU")}/\u043C\u0435\u0441` : "";
    return `${t.id}. ${t.offTarget ? "\u26A0\uFE0F " : ""}${typeEmoji[t.type] ?? ""} <b>${t.title}</b>
   \u{1F511} <i>${t.keyword}</i> \xB7 ${audienceEmoji[t.audience] ?? ""} ${t.audience} \xB7 ${trafficEmoji[t.trafficEst] ?? ""} ${t.trafficEst}${vol}`;
  });
  const gateBlock = weak.length ? `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u26A0\uFE0F <b>\u041D\u0435 \u043F\u043E\u043F\u0430\u043B\u0438 \u0432 \u043A\u043E\u0440\u0438\u0434\u043E\u0440 ${MIN_WORDSTAT_VOLUME}-${MAX_WORDSTAT_VOLUME}/\u043C\u0435\u0441 \u043F\u043E\u0441\u043B\u0435 \u0434\u0432\u0443\u0445 \u043F\u0435\u0440\u0435\u0444\u043E\u0440\u043C\u0443\u043B\u0438\u0440\u043E\u0432\u043E\u043A: ${weak.length}</b>
\u041E\u0434\u043E\u0431\u0440\u044F\u0442\u044C \u043D\u0430 \u0441\u0432\u043E\u0439 \u0440\u0438\u0441\u043A:
` + weak.slice(0, 10).map(
    (t) => `   ${t.wordstatVolume == null ? "\u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0440\u0430" : `${t.wordstatVolume}/\u043C\u0435\u0441`} \u2014 <i>${t.keyword}</i>`
  ).join("\n") : "";
  return `\u{1F4CA} <b>\u041A\u043E\u043D\u0442\u0435\u043D\u0442-\u043F\u043B\u0430\u043D \u2014 ${date}</b>

` + lines.join("\n\n") + gateBlock + `

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u0427\u0442\u043E\u0431\u044B \u043E\u0434\u043E\u0431\u0440\u0438\u0442\u044C \u0442\u0435\u043C\u044B, \u043E\u0442\u0432\u0435\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u043E\u0439:
<code>/content_approve 1 3 7</code>`;
}
function currentQueue() {
  if (!fs4.existsSync(DATA_DIR)) return { size: 0, file: null };
  const files = fs4.readdirSync(DATA_DIR).filter((f) => f.startsWith("topics_") && f.endsWith(".json")).sort();
  const seen = /* @__PURE__ */ new Set();
  let size = 0;
  for (const f of files) {
    const raw = JSON.parse(fs4.readFileSync(path4.join(DATA_DIR, f), "utf-8"));
    for (const t of raw.topics) {
      const key = `${t.id}|${t.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (t.approved && !t.published) size++;
    }
  }
  return { size, file: files.at(-1) ?? null };
}
async function main() {
  const queue = currentQueue();
  if (queue.size >= QUEUE_REFILL_THRESHOLD) {
    console.log(`[analyst] \u041E\u0447\u0435\u0440\u0435\u0434\u044C ${queue.size} >= ${QUEUE_REFILL_THRESHOLD}, \u0431\u0430\u0442\u0447 \u043D\u0435 \u043D\u0443\u0436\u0435\u043D`);
    if (queue.size <= QUEUE_REFILL_THRESHOLD + 5) {
      await sendMessage(
        `\u{1F4E6} <b>\u041E\u0447\u0435\u0440\u0435\u0434\u044C \u0442\u0435\u043C \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u043A \u043A\u043E\u043D\u0446\u0443</b>

\u041E\u0441\u0442\u0430\u043B\u043E\u0441\u044C <b>${queue.size}</b> \u043E\u0434\u043E\u0431\u0440\u0435\u043D\u043D\u044B\u0445 \u043D\u0435\u043E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043D\u044B\u0445 \u0442\u0435\u043C \u2014 \u043F\u0440\u0438\u043C\u0435\u0440\u043D\u043E \u0441\u0442\u043E\u043B\u044C\u043A\u043E \u0436\u0435 \u0434\u043D\u0435\u0439 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0439.

\u0421\u043E\u0431\u0435\u0440\u0443 \u043D\u043E\u0432\u044B\u0439 \u0431\u0430\u0442\u0447 \u0441\u0430\u043C, \u043A\u043E\u0433\u0434\u0430 \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u043C\u0435\u043D\u044C\u0448\u0435 ${QUEUE_REFILL_THRESHOLD}. \u041D\u0443\u0436\u0435\u043D \u0440\u0430\u043D\u044C\u0448\u0435 \u2014 <code>/content_plan</code>.`
      );
    }
    return;
  }
  console.log(`[analyst] \u041E\u0447\u0435\u0440\u0435\u0434\u044C ${queue.size}, \u0441\u043E\u0431\u0438\u0440\u0430\u044E \u043D\u043E\u0432\u044B\u0439 \u0431\u0430\u0442\u0447`);
  const runDir = startRun("\u0442\u0435\u043C\u044B-\u043D\u0430-\u043C\u0435\u0441\u044F\u0446");
  if (runDir) console.log(`[analyst] \u041F\u0435\u0440\u0435\u043F\u0438\u0441\u043A\u0430 \u0430\u0433\u0435\u043D\u0442\u043E\u0432: ${runDir}`);
  console.log("[analyst] \u0413\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u044E \u0442\u0435\u043C\u044B...");
  const { topics, weak } = await generateTopics();
  fs4.mkdirSync(DATA_DIR, { recursive: true });
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const filePath = path4.join(DATA_DIR, `topics_${date}.json`);
  fs4.writeFileSync(filePath, JSON.stringify({ date, topics }, null, 2));
  console.log(`[analyst] \u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ${filePath}`);
  const dateRu = (/* @__PURE__ */ new Date()).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const msg = formatTopicsMessage(topics, weak, dateRu);
  await sendMessage(msg);
  console.log("[analyst] \u041E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 Telegram \u2713");
}
main().catch((e) => {
  console.error("[analyst] \u041E\u0448\u0438\u0431\u043A\u0430:", e);
  process.exit(1);
});
