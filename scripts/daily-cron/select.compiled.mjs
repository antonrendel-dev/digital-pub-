// select.ts
var LABEL_AUTO = "\u0430\u0432\u0442\u043E";
var LABEL_ASK = "\u0432\u043E\u043F\u0440\u043E\u0441";
var LABEL_TONY = "\u0442\u043E\u043D\u0438";
var OFFERABLE = [LABEL_AUTO, LABEL_ASK];
var SECTION_DONE = "6grWxXVqjwQ7c8wh";
var STALE_AFTER_DAYS = 3;
function parseScore(task) {
  const m = (task.description || "").match(/^\s*БАЛЛ:\s*(\d{1,3})\s*\/\s*100/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 100 ? n : null;
}
function labelOf(task) {
  const found = (task.labels || []).find((l) => [LABEL_AUTO, LABEL_ASK, LABEL_TONY].includes(l));
  return found ?? null;
}
function isLive(task) {
  return !task.checked && task.section_id !== SECTION_DONE && !task.parent_id;
}
function candidates(tasks) {
  return tasks.filter(isLive).map((task) => ({ task, score: parseScore(task) ?? -1, label: labelOf(task) ?? "" })).filter((c) => c.score >= 0 && OFFERABLE.includes(c.label)).sort((a, b) => b.score - a.score);
}
function needScoring(tasks) {
  return tasks.filter((t) => isLive(t) && parseScore(t) === null);
}
function daysBetween(fromIso, nowIso) {
  const ms = new Date(nowIso).getTime() - new Date(fromIso).getTime();
  return Math.floor(ms / 864e5);
}
function decide(tasks, lock, nowIso) {
  if (lock) {
    const current = tasks.find((t) => t.id === lock.taskId);
    const stillOpen = current && isLive(current);
    if (stillOpen) {
      const days = daysBetween(lock.startedAt, nowIso);
      return days >= STALE_AFTER_DAYS ? { kind: "stale", lock, days } : { kind: "continue", lock, days };
    }
  }
  const list = candidates(tasks);
  if (!list.length)
    return { kind: "idle", reason: "\u043D\u0435\u0442 \u0437\u0430\u0434\u0430\u0447 \u0441 \u0431\u0430\u043B\u043B\u043E\u043C \u0438 \u043C\u0435\u0442\u043A\u043E\u0439 \xAB\u0430\u0432\u0442\u043E\xBB \u0438\u043B\u0438 \xAB\u0432\u043E\u043F\u0440\u043E\u0441\xBB" };
  const top = list[0];
  return { kind: "offer", task: top.task, score: top.score, label: top.label };
}
export {
  LABEL_ASK,
  LABEL_AUTO,
  LABEL_TONY,
  OFFERABLE,
  SECTION_DONE,
  STALE_AFTER_DAYS,
  candidates,
  daysBetween,
  decide,
  isLive,
  labelOf,
  needScoring,
  parseScore
};
