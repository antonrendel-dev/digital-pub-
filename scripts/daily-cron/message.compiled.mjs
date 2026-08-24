// select.ts
var LABEL_ASK = "\u0432\u043E\u043F\u0440\u043E\u0441";

// message.ts
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
var plural = (n, forms) => {
  const m100 = Math.abs(n) % 100;
  const m10 = m100 % 10;
  if (m100 >= 11 && m100 <= 14) return forms[2];
  if (m10 === 1) return forms[0];
  if (m10 >= 2 && m10 <= 4) return forms[1];
  return forms[2];
};
function extractQuestions(task) {
  const desc = task.description || "";
  const m = desc.match(/ВОПРОСЫ[^\n]*\n([\s\S]*?)(?:\n\n|$)/);
  if (!m) return [];
  return m[1].split("\n").map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean).slice(0, 6);
}
function renderOffer(task, score, label) {
  const lines = [`\u2600\uFE0F <b>\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F</b>`, "", `<b>${esc(task.content)}</b>`, `\u0411\u0430\u043B\u043B: ${score}/100`];
  if (label === LABEL_ASK) {
    const qs = extractQuestions(task);
    lines.push("", "\u042D\u0442\u0443 \u0437\u0430\u0434\u0430\u0447\u0443 \u0431\u0435\u0437 \u0442\u0435\u0431\u044F \u043D\u0435 \u043D\u0430\u0447\u0430\u0442\u044C.");
    if (qs.length) {
      lines.push("", "<b>\u0427\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u043E\u0442 \u0442\u0435\u0431\u044F:</b>");
      qs.forEach((q, i) => lines.push(`${i + 1}. ${esc(q)}`));
    }
    lines.push("", "\u041E\u0442\u0432\u0435\u0442\u044C \u2014 \u0438 \u0431\u0435\u0440\u0443\u0441\u044C.");
  } else {
    lines.push("", "\u0414\u0435\u043B\u0430\u044E \u0441\u0430\u043C, \u043D\u0438\u0447\u0435\u0433\u043E \u043E\u0442 \u0442\u0435\u0431\u044F \u043D\u0435 \u043D\u0443\u0436\u043D\u043E.", "", "\u041E\u0442\u0432\u0435\u0447\u0430\u0439 \xAB\u0434\u0435\u043B\u0430\u0439\xBB \u2014 \u0438 \u043D\u0430\u0447\u0438\u043D\u0430\u044E.");
  }
  return lines.join("\n");
}
function renderContinue(lock, days) {
  const d = days === 0 ? "\u0441\u0435\u0433\u043E\u0434\u043D\u044F" : `${days} ${plural(days, ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"])}`;
  return [
    `\u23F3 <b>\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E \u0432\u0447\u0435\u0440\u0430\u0448\u043D\u0435\u0435</b>`,
    "",
    `<b>${esc(lock.title)}</b>`,
    `\u0412 \u0440\u0430\u0431\u043E\u0442\u0435 ${d}.`,
    "",
    "\u041D\u043E\u0432\u0443\u044E \u0437\u0430\u0434\u0430\u0447\u0443 \u043D\u0435 \u0431\u0435\u0440\u0443, \u043F\u043E\u043A\u0430 \u044D\u0442\u0430 \u043D\u0435 \u0432 \xAB\u0413\u043E\u0442\u043E\u0432\u043E\xBB."
  ].join("\n");
}
function renderStale(lock, days) {
  return [
    `\u{1F40C} <b>\u0417\u0430\u0434\u0430\u0447\u0430 \u0437\u0430\u0432\u0438\u0441\u043B\u0430</b>`,
    "",
    `<b>${esc(lock.title)}</b>`,
    `\u0412 \u0440\u0430\u0431\u043E\u0442\u0435 ${days} ${plural(days, ["\u0434\u0435\u043D\u044C", "\u0434\u043D\u044F", "\u0434\u043D\u0435\u0439"])}.`,
    "",
    "\u041A\u043E\u0432\u044B\u0440\u044F\u0435\u043C \u0434\u0430\u043B\u044C\u0448\u0435 \u0438\u043B\u0438 \u0431\u0440\u043E\u0441\u0430\u0435\u043C \u0438 \u0431\u0435\u0440\u0451\u043C \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0443\u044E?"
  ].join("\n");
}
function renderIdle(reason) {
  return [`\u{1F634} <b>\u0417\u0430\u0434\u0430\u0447 \u043D\u0430 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u043D\u0435\u0442</b>`, "", esc(reason), "", "\u0414\u043E\u0441\u043A\u0430 \u0436\u0434\u0451\u0442 \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0438 \u0438\u043B\u0438 \u043F\u043E\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F."].join(
    "\n"
  );
}
function render(decision) {
  switch (decision.kind) {
    case "offer":
      return renderOffer(decision.task, decision.score, decision.label);
    case "continue":
      return renderContinue(decision.lock, decision.days);
    case "stale":
      return renderStale(decision.lock, decision.days);
    case "idle":
      return renderIdle(decision.reason);
  }
}
export {
  extractQuestions,
  render,
  renderContinue,
  renderIdle,
  renderOffer,
  renderStale
};
