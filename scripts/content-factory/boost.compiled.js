// boost.ts
import fs2 from "fs";
import os3 from "os";
import path3 from "path";
import { fileURLToPath } from "url";

// lib/ask-agent.ts
import { spawn } from "child_process";

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

// lib/ask-agent.ts
var AGENT_TOOLS = "Read,Skill,Glob,Grep";
var CLAUDE_RETRY_DELAYS_MS = [3e4, 12e4, 3e5];
var isQuotaExhausted = (message) => /out of (extra )?usage|usage limit reached|rate limit/i.test(message);
function runOnce(prompt, agent, cli, modelFor2) {
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
        model: modelFor2(cli),
        agent: agentFlag,
        allowedTools: AGENT_TOOLS,
        promptViaStdin: true
      },
      cli
    );
    const child = spawn(cmd, args, { env: process.env, stdio: ["pipe", "pipe", "pipe"] });
    child.stdin.write(effectivePrompt);
    child.stdin.end();
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => out += d.toString());
    child.stderr.on("data", (d) => err += d.toString());
    child.on("close", (code) => {
      if (code === 0) resolve(stripRoleTag(out.trim()));
      else
        reject(
          new Error(err.trim() || out.trim().slice(-500) || `${cmd} \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F \u0441 \u043A\u043E\u0434\u043E\u043C ${code}`)
        );
    });
    child.on("error", reject);
  });
}
async function runWithFallback(prompt, agent, modelFor2) {
  try {
    return await runOnce(prompt, agent, AGENT_CLI, modelFor2);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const spare = isCliLevelFailure(message) ? fallbackCli(AGENT_CLI) : null;
    if (!spare) throw e;
    console.log(
      `    \u26A0 ${AGENT_CLI} \u043D\u0435 \u0441\u043C\u043E\u0433 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C\u0441\u044F (${message.slice(0, 160)}). \u041F\u0435\u0440\u0435\u0445\u043E\u0436\u0443 \u043D\u0430 ${spare}.`
    );
    return await runOnce(prompt, agent, spare, modelFor2);
  }
}
async function askAgent(prompt, opts) {
  const delays = opts.retryDelaysMs ?? CLAUDE_RETRY_DELAYS_MS;
  const total = delays.length + 1;
  let last;
  for (let attempt = 1; attempt <= total; attempt++) {
    try {
      const answer = await runWithFallback(prompt, opts.agent, opts.modelFor);
      opts.record?.(opts.agent ?? "\u0431\u0435\u0437-\u0440\u043E\u043B\u0438", prompt, answer);
      return answer;
    } catch (e) {
      last = e;
      const message = e instanceof Error ? e.message : String(e);
      if (isQuotaExhausted(message)) throw e;
      if (attempt === total) break;
      const pause = delays[attempt - 1];
      console.log(
        `    \u26A0 \u043F\u043E\u043F\u044B\u0442\u043A\u0430 ${attempt}/${total} \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C (${message.slice(0, 160)}). \u0416\u0434\u0443 ${Math.round(pause / 1e3)} \u0441.`
      );
      await new Promise((r) => setTimeout(r, pause));
    }
  }
  throw last;
}

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

// lib/boost-plan.ts
var BOOST_MIN_POSITION = 11;
var BOOST_MAX_POSITION = 30;
function slugFromArticleUrl(url) {
  const m = url.match(/\/articles\/([a-z0-9-]+)\/?$/i);
  return m ? m[1] : null;
}
function selectCandidates(rows) {
  const take = [];
  const skip = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows) {
    if (row.position < BOOST_MIN_POSITION || row.position > BOOST_MAX_POSITION) continue;
    if (!row.url) {
      skip.push({ ...row, why: "\u043D\u0435\u0442 \u0446\u0435\u043B\u0435\u0432\u043E\u0433\u043E URL \u0432 \u0422\u043E\u043F\u0432\u0438\u0437\u043E\u0440\u0435" });
      continue;
    }
    const slug = slugFromArticleUrl(row.url);
    if (!slug) {
      skip.push({ ...row, why: "\u043F\u043E\u0441\u0430\u0434\u043E\u0447\u043D\u0430\u044F \u043D\u0435 \u0441\u0442\u0430\u0442\u044C\u044F \u2014 \u0442\u0435\u043B\u043E \u043B\u0435\u0436\u0438\u0442 \u0432 \u043A\u043E\u0434\u0435, \u043D\u0435 \u0432 MDX" });
      continue;
    }
    if (seen.has(slug)) {
      skip.push({ ...row, why: `\u0441\u0442\u0430\u0442\u044C\u044F ${slug} \u0443\u0436\u0435 \u0432\u0437\u044F\u0442\u0430 \u043F\u043E \u0434\u0440\u0443\u0433\u043E\u043C\u0443 \u043A\u043B\u044E\u0447\u0443` });
      continue;
    }
    seen.add(slug);
    take.push({ key: row.key, position: row.position, url: row.url, slug });
  }
  take.sort((a, b) => a.position - b.position);
  return { take, skip };
}
function parseRows(tsv) {
  const rows = [];
  for (const line of tsv.split("\n")) {
    const parts = line.split("	");
    if (parts.length < 2) continue;
    const position = Number(parts[1]);
    if (!parts[0] || !Number.isFinite(position)) continue;
    rows.push({ key: parts[0].trim(), position, url: (parts[2] ?? "").trim() });
  }
  return rows;
}
function containsKey(text, key) {
  const norm = (s) => s.toLowerCase().replace(/ё/g, "\u0435").replace(/[-–—]/g, " ");
  const haystack = norm(text);
  return norm(key).split(/\s+/).filter(Boolean).every((word) => haystack.includes(word.length > 4 ? word.slice(0, 5) : word));
}
var words = (text) => text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
var headings = (text) => (text.match(/^#{2,3}\s+.+$/gm) ?? []).length;
function validateRewrite(before, after, key) {
  const v = [];
  const wBefore = words(before);
  const wAfter = words(after);
  if (wAfter < wBefore * 0.95) {
    v.push({
      rule: "SHRANK",
      detail: `\u043E\u0431\u044A\u0451\u043C \u0443\u043F\u0430\u043B \u0441 ${wBefore} \u0434\u043E ${wAfter} \u0441\u043B\u043E\u0432 \u2014 \u0434\u043E\u0436\u0438\u043C \u043D\u0435 \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u043A\u0440\u0430\u0449\u0430\u0442\u044C \u0441\u0442\u0430\u0442\u044C\u044E`
    });
  }
  const hBefore = headings(before);
  const hAfter = headings(after);
  if (hAfter < hBefore) {
    v.push({
      rule: "LOST_HEADINGS",
      detail: `\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 \u0431\u044B\u043B\u043E ${hBefore}, \u0441\u0442\u0430\u043B\u043E ${hAfter} \u2014 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E\u0442\u0435\u0440\u044F\u043D\u0430`
    });
  }
  const firstWords = after.split(/\s+/).slice(0, 60).join(" ");
  const inHeading = (after.match(/^#{2,3}\s+.+$/gm) ?? []).some((h) => containsKey(h, key));
  if (!inHeading && !containsKey(firstWords, key)) {
    v.push({
      rule: "KEY_NOT_PLACED",
      detail: `\u043A\u043B\u044E\u0447 \xAB${key}\xBB \u043D\u0435 \u0441\u0442\u043E\u0438\u0442 \u043D\u0438 \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435, \u043D\u0438 \u0432 \u043F\u0435\u0440\u0432\u044B\u0445 60 \u0441\u043B\u043E\u0432\u0430\u0445`
    });
  }
  return v;
}

// ../../lib/faq-schema.ts
var FAQ_HEADING = /^##\s+.*(вопрос|FAQ).*$/im;
var MIN_FAQ_ITEMS = 2;
function parseFaq(markdown) {
  const heading = markdown.match(FAQ_HEADING);
  if (!heading) return [];
  const block = markdown.slice(markdown.indexOf(heading[0]) + heading[0].length);
  const items = [];
  const re = /###\s+(.+?)\n+([\s\S]+?)(?=\n\s*###|\n\s*##\s|\s*$)/g;
  let m;
  while (m = re.exec(block)) {
    const question = m[1].trim();
    const answer = m[2].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[(.+?)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
    if (question && answer && !answer.startsWith("|") && !answer.startsWith("-")) {
      items.push({ question, answer });
    }
  }
  return items;
}
function faqSchemaLine(markdown) {
  const items = parseFaq(markdown);
  if (items.length < MIN_FAQ_ITEMS) return "";
  return `
faqSchema: '${JSON.stringify(items).replace(/'/g, "''")}'`;
}

// ../../lib/article-metadata-gate.ts
var BRAND_SUFFIX = " | \u0414\u0438\u0434\u0436\u0438\u0442\u0430\u043B \u041F\u0430\u0431";
var TITLE_LIMIT = 65;
var DESC_MIN = 140;
var DESC_MAX = 175;
var SOURCE_OR_YEAR = /(hh\.ru|SuperJob|Вордстат|Метрика|Росстат|Habr|202\d)/i;
var ECHO_WORDS = 4;
function normalizeFaqHeading(markdown) {
  if (parseFaq(markdown).length >= MIN_FAQ_ITEMS) return markdown;
  const headings2 = [...markdown.matchAll(/^##\s+(.+)$/gm)];
  const last = headings2[headings2.length - 1];
  if (!last || !last[1].trim().endsWith("?")) return markdown;
  const tail = markdown.slice(last.index + last[0].length);
  const questions = (tail.match(/^###\s+.+$/gm) ?? []).filter((h) => h.trim().endsWith("?"));
  if (questions.length < MIN_FAQ_ITEMS) return markdown;
  const replaced = markdown.slice(0, last.index) + "## \u0427\u0430\u0441\u0442\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B" + markdown.slice(last.index + last[0].length);
  return parseFaq(replaced).length >= MIN_FAQ_ITEMS ? replaced : markdown;
}
function echoedWords(title, description) {
  const t = title.toLowerCase().split(/\s+/).slice(0, ECHO_WORDS);
  const d = description.toLowerCase().split(/\s+/).slice(0, ECHO_WORDS);
  let same = 0;
  while (same < t.length && t[same] === d[same]) same++;
  return same;
}
function checkArticleMetadata(meta) {
  const violations = [];
  const titleLen = (meta.metaTitle + BRAND_SUFFIX).length;
  if (titleLen > TITLE_LIMIT) {
    violations.push({
      rule: "TITLE_LIMIT",
      detail: `${titleLen} \u0437\u043D\u0430\u043A\u043E\u0432 \u0441 \u0431\u0440\u0435\u043D\u0434\u043E\u043C \u043F\u0440\u0438 \u043F\u043E\u0440\u043E\u0433\u0435 ${TITLE_LIMIT} \u2014 \u0443\u043A\u043E\u0440\u043E\u0442\u0438 metaTitle \u043D\u0430 ${titleLen - TITLE_LIMIT}`
    });
  }
  const descLen = meta.metaDescription.length;
  if (descLen < DESC_MIN || descLen > DESC_MAX) {
    violations.push({
      rule: "DESC_RANGE",
      detail: `${descLen} \u0437\u043D\u0430\u043A\u043E\u0432 \u043F\u0440\u0438 \u043A\u043E\u0440\u0438\u0434\u043E\u0440\u0435 ${DESC_MIN}\u2013${DESC_MAX}`
    });
  }
  if (parseFaq(meta.markdown).length < MIN_FAQ_ITEMS) {
    violations.push({
      rule: "FAQ_MISSING",
      detail: `\u0440\u0430\u0437\u0434\u0435\u043B \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0434\u0430\u0451\u0442 \u043C\u0435\u043D\u044C\u0448\u0435 ${MIN_FAQ_ITEMS} \u043F\u0430\u0440 \xAB\u0432\u043E\u043F\u0440\u043E\u0441 \u2014 \u043E\u0442\u0432\u0435\u0442\xBB, \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0430 \u043D\u0435 \u0441\u043E\u0431\u0435\u0440\u0451\u0442\u0441\u044F`
    });
  }
  if (!SOURCE_OR_YEAR.test(meta.metaDescription)) {
    violations.push({
      rule: "DESC_NO_SOURCE",
      detail: "\u0432 description \u043D\u0435\u0442 \u043D\u0438 \u0433\u043E\u0434\u0430, \u043D\u0438 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \u0434\u0430\u043D\u043D\u044B\u0445"
    });
  }
  if (echoedWords(meta.metaTitle, meta.metaDescription) >= ECHO_WORDS) {
    violations.push({
      rule: "DESC_ECHOES_TITLE",
      detail: `description \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0442\u0435\u043C\u0438 \u0436\u0435 ${ECHO_WORDS} \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u0447\u0442\u043E \u0438 title`
    });
  }
  return violations;
}

// ../../lib/strip-service-tail.ts
var SERVICE_TAIL = /\n\s*-{3,}\s*\n+\s*(?:\*\*)?(?:Служебное|Скиллы:|Использован[а-яё]*\s+скилл|Готово для проверки|Мастер-промпт)[\s\S]*$/i;
var SERVICE_MARKER = /Готово для проверки|Использован[а-яё]*\s+скилл|Служебное, вне тела|мастер-промпт v\d/i;
function stripServiceTail(markdown) {
  return markdown.replace(SERVICE_TAIL, "\n").trimEnd() + "\n";
}
function hasServiceText(text) {
  return SERVICE_MARKER.test(text);
}

// boost.ts
var ARTICLES_DIR = path3.join(
  path3.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "content",
  "articles"
);
function parseArgs(argv) {
  const get = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  return {
    input: get("input"),
    slug: get("slug"),
    key: get("key"),
    limit: Number(get("limit") ?? 3),
    dryRun: argv.includes("--dry-run")
  };
}
function splitMdx(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error("\u0432\u043E \u0433\u043B\u0430\u0432\u0435 \u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0442 frontmatter");
  return { frontmatter: m[1], body: raw.slice(m[0].length) };
}
function field(frontmatter, name) {
  return frontmatter.match(new RegExp(`^${name}: "(.*)"$`, "m"))?.[1] ?? "";
}
function buildPrompt(key, position, title, body) {
  return `\u0421\u0442\u0430\u0442\u044C\u044F \u0443\u0436\u0435 \u0441\u0442\u043E\u0438\u0442 \u043D\u0430 \u043F\u043E\u0437\u0438\u0446\u0438\u0438 ${position} \u043F\u043E \u043A\u043B\u044E\u0447\u0443 \xAB${key}\xBB \u0432 \u042F\u043D\u0434\u0435\u043A\u0441\u0435. \u042D\u0442\u043E \u0431\u043B\u0438\u0436\u0435 \u043A \u0442\u043E\u043F-10, \u0447\u0435\u043C \u0431\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E \u043D\u0430\u0448\u0438\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0437\u0430\u0434\u0430\u0447\u0430 \u2014 \u043D\u0435 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u0442\u044C \u0435\u0451 \u0437\u0430\u043D\u043E\u0432\u043E, \u0430 \u0443\u0441\u0438\u043B\u0438\u0442\u044C \u043F\u043E\u0434 \u044D\u0442\u043E\u0442 \u043A\u043B\u044E\u0447.

\u041E\u0411\u042F\u0417\u0410\u0422\u0415\u041B\u042C\u041D\u041E \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0439 \u0441\u043A\u0438\u043B\u043B dpub-content-standard: \u043F\u0440\u0430\u0432\u043A\u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E\u0442\u0441\u044F \u043F\u043E \u043D\u0435\u043C\u0443.

\u0427\u0422\u041E \u041D\u0423\u0416\u041D\u041E:
- \u043A\u043B\u044E\u0447 \xAB${key}\xBB \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u0442\u043E\u044F\u0442\u044C \u0431\u0443\u043A\u0432\u0430\u043B\u044C\u043D\u043E \u0432 \u043E\u0434\u043D\u043E\u043C \u0438\u0437 H2 \u0438\u043B\u0438 \u0432 \u043F\u0435\u0440\u0432\u044B\u0445 60 \u0441\u043B\u043E\u0432\u0430\u0445;
- \u043E\u0431\u044A\u0451\u043C \u043D\u0435 \u0443\u043C\u0435\u043D\u044C\u0448\u0430\u0442\u044C: \u0441\u0442\u0430\u0442\u044C\u044F \u0443\u0436\u0435 \u0440\u0430\u043D\u0436\u0438\u0440\u0443\u0435\u0442\u0441\u044F, \u0442\u0435\u0440\u044F\u0442\u044C \u0435\u0439 \u0435\u0441\u0442\u044C \u0447\u0442\u043E;
- \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0442\u044C, \u0440\u0430\u0437\u0434\u0435\u043B \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C;
- \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043D\u0435\u0434\u043E\u0441\u0442\u0430\u044E\u0449\u0435\u0435 \u043F\u043E \u0441\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u0443: \u0430\u0442\u043E\u043C\u0430\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 \u0432 \u043D\u0430\u0447\u0430\u043B\u0435 \u0431\u043B\u043E\u043A\u043E\u0432, \u0442\u0430\u0431\u043B\u0438\u0446\u0443, \u0435\u0441\u043B\u0438 \u0435\u0451 \u043D\u0435\u0442, \u0437\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u0441\u044C, \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442;
- \u043D\u043E\u0432\u044B\u0445 \u0447\u0438\u0441\u0435\u043B \u043D\u0435 \u0432\u044B\u0434\u0443\u043C\u044B\u0432\u0430\u0442\u044C. \u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0442\u043E, \u0447\u0442\u043E \u0443\u0436\u0435 \u0435\u0441\u0442\u044C \u0432 \u0442\u0435\u043A\u0441\u0442\u0435, \u043B\u0438\u0431\u043E \u043E\u0442\u0440\u0430\u0441\u043B\u0435\u0432\u0430\u044F \u043D\u043E\u0440\u043C\u0430 \u0441 \u044F\u0432\u043D\u043E\u0439 \u0430\u0442\u0440\u0438\u0431\u0443\u0446\u0438\u0435\u0439.

\u0417\u0410\u0413\u041E\u041B\u041E\u0412\u041E\u041A \u0421\u0422\u0410\u0422\u042C\u0418: ${title}

\u0422\u0415\u041A\u0423\u0429\u0415\u0415 \u0422\u0415\u041B\u041E:
${body}

\u0412\u0435\u0440\u043D\u0438 \u0422\u041E\u041B\u042C\u041A\u041E \u0438\u0441\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u044B\u0439 Markdown \u0442\u0435\u043B\u0430 \u0441\u0442\u0430\u0442\u044C\u0438 \u2014 \u0431\u0435\u0437 frontmatter, \u0431\u0435\u0437 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0439, \u0431\u0435\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u043F\u0440\u0430\u0432\u043E\u043A.`;
}
async function boostOne(c, dryRun) {
  const file = path3.join(ARTICLES_DIR, `${c.slug}.mdx`);
  if (!fs2.existsSync(file)) return `${c.slug}: \u0444\u0430\u0439\u043B\u0430 \u043D\u0435\u0442, \u043F\u0440\u043E\u043F\u0443\u0441\u043A`;
  const raw = fs2.readFileSync(file, "utf8");
  const { frontmatter, body } = splitMdx(raw);
  const title = field(frontmatter, "metaTitle") || field(frontmatter, "title");
  if (dryRun) {
    const w = body.split(/\s+/).filter(Boolean).length;
    return `${c.slug}: \u043F\u043E\u0437. ${c.position}, \u043A\u043B\u044E\u0447 \xAB${c.key}\xBB, \u0441\u0435\u0439\u0447\u0430\u0441 ${w} \u0441\u043B\u043E\u0432 \u2014 \u0432\u0437\u044F\u043B \u0431\u044B \u0432 \u0440\u0430\u0431\u043E\u0442\u0443`;
  }
  const answer = await askAgent(buildPrompt(c.key, c.position, title, body), {
    agent: "writer",
    modelFor
  });
  const start = answer.indexOf("## ");
  const next = normalizeFaqHeading(stripServiceTail(start > 0 ? answer.slice(start) : answer));
  const problems = validateRewrite(body, next, c.key);
  const meta = checkArticleMetadata({
    metaTitle: field(frontmatter, "metaTitle") || field(frontmatter, "title"),
    metaDescription: field(frontmatter, "metaDescription") || field(frontmatter, "description"),
    markdown: next
  });
  const all = [...problems, ...meta];
  if (parseFaq(next).length < MIN_FAQ_ITEMS) {
    all.push({ rule: "FAQ_MISSING", detail: "\u0440\u0430\u0437\u0434\u0435\u043B \u0432\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043B \u0441\u043E\u0431\u0438\u0440\u0430\u0442\u044C\u0441\u044F" });
  }
  if (hasServiceText(next)) {
    all.push({ rule: "SERVICE_TEXT", detail: "\u0432 \u0442\u0435\u043B\u0435 \u043E\u0441\u0442\u0430\u043B\u0441\u044F \u0441\u043B\u0443\u0436\u0435\u0431\u043D\u044B\u0439 \u0445\u0432\u043E\u0441\u0442 \u043F\u0440\u0438\u0451\u043C\u043A\u0438" });
  }
  if (all.length) {
    const dump = path3.join(os3.tmpdir(), `boost-rejected-${c.slug}.md`);
    fs2.writeFileSync(dump, next);
    return `${c.slug}: \u041D\u0415 \u041F\u0420\u0418\u041D\u042F\u0422\u041E \u2014 ${all.map((p) => `${p.rule} (${p.detail})`).join("; ")}
[boost] \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D: ${dump}`;
  }
  const fmWithoutFaq = frontmatter.replace(/^faqSchema: '.*'$/m, "").replace(/\n{2,}/g, "\n").trim();
  const line = faqSchemaLine(next).replace(/^\n/, "");
  fs2.writeFileSync(file, `---
${fmWithoutFaq}
${line}
---
${next}`);
  const wBefore = body.split(/\s+/).filter(Boolean).length;
  const wAfter = next.split(/\s+/).filter(Boolean).length;
  return `${c.slug}: \u043F\u0440\u0438\u043D\u044F\u0442\u043E, ${wBefore} \u2192 ${wAfter} \u0441\u043B\u043E\u0432, \u043A\u043B\u044E\u0447 \xAB${c.key}\xBB (\u043F\u043E\u0437. ${c.position})`;
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  let candidates = [];
  if (args.slug && args.key) {
    candidates = [
      { slug: args.slug, key: args.key, position: 0, url: `/articles/${args.slug}` }
    ];
  } else if (args.input) {
    const { take, skip } = selectCandidates(parseRows(fs2.readFileSync(args.input, "utf8")));
    candidates = take.slice(0, args.limit);
    for (const s of skip) console.log(`[boost] \u043F\u0440\u043E\u043F\u0443\u0441\u043A: \xAB${s.key}\xBB \u043F\u043E\u0437. ${s.position} \u2014 ${s.why}`);
    if (take.length > candidates.length) {
      console.log(`[boost] \u0432 \u0440\u0430\u0431\u043E\u0442\u0443 \u0432\u0437\u044F\u0442\u043E ${candidates.length} \u0438\u0437 ${take.length} (--limit)`);
    }
  } else {
    console.error("\u041D\u0443\u0436\u0435\u043D \u043B\u0438\u0431\u043E --input=\u0444\u0430\u0439\u043B.tsv, \u043B\u0438\u0431\u043E \u043F\u0430\u0440\u0430 --slug= \u0438 --key=");
    process.exit(2);
  }
  if (!candidates.length) {
    console.log("[boost] \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442\u043E\u0432 \u043D\u0435\u0442");
    return;
  }
  for (const c of candidates) {
    console.log(`[boost] ${c.slug}: \u043A\u043B\u044E\u0447 \xAB${c.key}\xBB, \u043F\u043E\u0437\u0438\u0446\u0438\u044F ${c.position}`);
    console.log(`[boost] ${await boostOne(c, args.dryRun)}`);
  }
}
main().catch((e) => {
  console.error("[boost] \u041E\u0448\u0438\u0431\u043A\u0430:", e);
  process.exit(1);
});
