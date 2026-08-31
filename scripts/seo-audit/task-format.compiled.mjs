const MAX_NEW_TASKS_PER_RUN = 12;
const DEDUP_PREFIX = "SEO-\u041A\u0420\u041E\u041D-\u041C\u0415\u0422\u041A\u0410:";
function describeFinding(f) {
  return [
    `\u0411\u0410\u041B\u041B: ${f.score.total}/100  (\u0441\u043F\u0440\u043E\u0441 ${f.score.s}/30 \xB7 \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u044C ${f.score.g}/25 \xB7 \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 ${f.score.r}/25 \xB7 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u043E\u0441\u0442\u044C ${f.score.a}/20)`,
    `\u041F\u043E\u0447\u0435\u043C\u0443: \u0437\u0430\u0432\u0435\u0434\u0435\u043D\u043E SEO-\u043A\u0440\u043E\u043D\u043E\u043C \u043F\u043E \u0441\u0440\u0430\u0432\u043D\u0435\u043D\u0438\u044E \u0441\u043D\u0430\u043F\u0448\u043E\u0442\u043E\u0432, \u0434\u043E\u0436\u0438\u043C \u0443\u0436\u0435 \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u043E\u0433\u043E`,
    "\u2500".repeat(40),
    "",
    f.detail,
    "",
    `\u041A\u043B\u044E\u0447 \u0438\u043B\u0438 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430: ${f.key}`,
    `\u0422\u0438\u043F \u043D\u0430\u0445\u043E\u0434\u043A\u0438: ${f.type}`,
    "",
    `${DEDUP_PREFIX} ${f.dedupKey}`,
    "(\u043C\u0435\u0442\u043A\u0430 \u043D\u0443\u0436\u043D\u0430 \u043A\u0440\u043E\u043D\u0443, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0437\u0430\u0432\u043E\u0434\u0438\u0442\u044C \u044D\u0442\u0443 \u0436\u0435 \u0437\u0430\u0434\u0430\u0447\u0443 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u2014 \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0442\u044C)"
  ].join("\n");
}
function extractDedupKeys(tasks) {
  const keys = /* @__PURE__ */ new Set();
  const re = new RegExp(`${DEDUP_PREFIX}\\s*(.+)`);
  for (const t of tasks) {
    const m = (t.description || "").match(re);
    if (m) keys.add(m[1].trim());
  }
  return keys;
}
function matchesFinding(finding, task) {
  const desc = task.description || "";
  if (desc.includes(`${DEDUP_PREFIX} ${finding.dedupKey}`)) return "mark";
  const needle = finding.key.toLowerCase().trim();
  if (needle.length < 4) return null;
  const hay = `${task.content || ""} ${desc}`.toLowerCase();
  return hay.includes(needle) ? "text" : null;
}
function mergeNote(finding, date) {
  return [
    "",
    "\u2500".repeat(40),
    `\u041E\u0411\u041D\u041E\u0412\u041B\u0415\u041D\u0418\u0415 SEO-\u041A\u0420\u041E\u041D\u0410 ${date}`,
    finding.title,
    finding.detail,
    `\u0411\u0430\u043B\u043B \u043D\u0430\u0445\u043E\u0434\u043A\u0438: ${finding.score.total}/100`,
    `${DEDUP_PREFIX} ${finding.dedupKey}`
  ].join("\n");
}
const MIN_GROUP_SIZE = 3;
const GROUP_TITLES = {
  "left-top10": (n) => `${n} \u043A\u043B\u044E\u0447\u0435\u0439 \u0432\u044B\u0448\u043B\u0438 \u0438\u0437 \u0442\u043E\u043F-10 \u2014 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u0447\u043A\u043E\u0439`,
  "position-drop": (n) => `${n} \u043A\u043B\u044E\u0447\u0435\u0439 \u043F\u0440\u043E\u0441\u0435\u043B\u0438 \u0432 \u0442\u043E\u043F-100 \u2014 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u0447\u043A\u043E\u0439`,
  "near-top10": (n) => `${n} \u043A\u043B\u044E\u0447\u0435\u0439 \u0432 \u0448\u0430\u0433\u0435 \u043E\u0442 \u0442\u043E\u043F-10 \u2014 \u043F\u0430\u0447\u043A\u0430 \u043D\u0430 \u0434\u043E\u0436\u0438\u043C`,
  "pageviews-drop": (n) => `\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B \u0443\u043F\u0430\u043B\u0438 \u0443 ${n} \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u2014 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u0447\u043A\u043E\u0439`,
  "zero-clicks": (n) => `${n} \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432 \u0441 \u043F\u043E\u043A\u0430\u0437\u0430\u043C\u0438 \u0438 \u043D\u0443\u043B\u0451\u043C \u043A\u043B\u0438\u043A\u043E\u0432 \u2014 \u043F\u0430\u0447\u043A\u0430 \u043D\u0430 \u0441\u043D\u0438\u043F\u043F\u0435\u0442\u044B`,
  "wrong-page": (n) => `${n} \u043A\u043B\u044E\u0447\u0435\u0439 \u043E\u0442\u0432\u0435\u0447\u0430\u044E\u0442 \u043D\u0435 \u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435\u0439 \u2014 \u0440\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u0447\u043A\u043E\u0439`,
  // Статьи в пачки собираются по типу правки: переписать текст и подобрать
  // ключ — разные работы, и садиться за них удобнее по отдельности.
  "article-not-read": (n) => `${n} \u0441\u0442\u0430\u0442\u0435\u0439 \u0432 \u0442\u043E\u043F\u0435, \u043D\u043E \u0438\u0445 \u043D\u0435 \u0447\u0438\u0442\u0430\u044E\u0442 \u2014 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u0442\u044C \u0442\u0435\u043A\u0441\u0442`,
  "article-not-ranked": (n) => `${n} \u0441\u0442\u0430\u0442\u0435\u0439 \u0447\u0438\u0442\u0430\u044E\u0442, \u043D\u043E \u0438\u0445 \u043D\u0435\u0442 \u0432 \u0442\u043E\u043F\u0435 \u2014 \u043F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u043A\u043B\u044E\u0447\u0438`
};
function groupTitle(type, count) {
  return GROUP_TITLES[type](count);
}
function groupFindings(findings) {
  const byType = /* @__PURE__ */ new Map();
  for (const f of findings) {
    const list = byType.get(f.type);
    if (list) list.push(f);
    else byType.set(f.type, [f]);
  }
  const groups = [];
  for (const [type, list] of byType) {
    if (list.length >= MIN_GROUP_SIZE) {
      groups.push({
        type,
        title: groupTitle(type, list.length),
        findings: list,
        score: list.reduce((a, b) => b.score.total > a.score.total ? b : a).score
      });
    } else {
      for (const f of list) groups.push({ type, title: f.title, findings: [f], score: f.score });
    }
  }
  return groups.sort((a, b) => b.score.total - a.score.total);
}
const GROUP_PREFIX = "SEO-\u041A\u0420\u041E\u041D-\u041F\u0410\u0427\u041A\u0410:";
function describeGroup(g) {
  if (g.findings.length === 1) return describeFinding(g.findings[0]);
  const s = g.score;
  return [
    `\u0411\u0410\u041B\u041B: ${s.total}/100  (\u0441\u043F\u0440\u043E\u0441 ${s.s}/30 \xB7 \u0433\u043E\u0442\u043E\u0432\u043D\u043E\u0441\u0442\u044C ${s.g}/25 \xB7 \u0440\u0430\u0437\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0430 ${s.r}/25 \xB7 \u0430\u0432\u0442\u043E\u043D\u043E\u043C\u043D\u043E\u0441\u0442\u044C ${s.a}/20)`,
    `\u041F\u043E\u0447\u0435\u043C\u0443: \u0437\u0430\u0432\u0435\u0434\u0435\u043D\u043E SEO-\u043A\u0440\u043E\u043D\u043E\u043C, \u043F\u0430\u0447\u043A\u0430 \u043E\u0434\u043D\u043E\u0442\u0438\u043F\u043D\u044B\u0445 \u043D\u0430\u0445\u043E\u0434\u043E\u043A \u2014 ${g.findings.length} \u0448\u0442., \u0431\u0430\u043B\u043B \u043F\u043E \u0441\u0430\u043C\u043E\u0439 \u0442\u044F\u0436\u0451\u043B\u043E\u0439`,
    "\u2500".repeat(40),
    "",
    g.findings[0].detail,
    "",
    `\u0421\u041F\u0418\u0421\u041E\u041A (${g.findings.length}):`,
    ...g.findings.map((f, i) => `${i + 1}. ${f.title}`),
    "",
    `${GROUP_PREFIX} ${g.type}`,
    ...g.findings.map((f) => `${DEDUP_PREFIX} ${f.dedupKey}`),
    "(\u043C\u0435\u0442\u043A\u0438 \u043D\u0443\u0436\u043D\u044B \u043A\u0440\u043E\u043D\u0443, \u0447\u0442\u043E\u0431\u044B \u043D\u0435 \u0437\u0430\u0432\u043E\u0434\u0438\u0442\u044C \u044D\u0442\u0438 \u0437\u0430\u0434\u0430\u0447\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u043D\u043E \u2014 \u043D\u0435 \u0443\u0434\u0430\u043B\u044F\u0442\u044C)"
  ].join("\n");
}
function matchesGroup(type, task) {
  return (task.description || "").includes(`${GROUP_PREFIX} ${type}`);
}
export {
  DEDUP_PREFIX,
  GROUP_PREFIX,
  MAX_NEW_TASKS_PER_RUN,
  MIN_GROUP_SIZE,
  describeFinding,
  describeGroup,
  extractDedupKeys,
  groupFindings,
  groupTitle,
  matchesFinding,
  matchesGroup,
  mergeNote
};
