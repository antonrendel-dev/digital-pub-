const DROP_THRESHOLD = 5;
const NEAR_TOP = [11, 30];
const PAGEVIEW_DROP_PCT = 50;
const PAGEVIEW_FLOOR = 10;
const ZERO_CLICK_SHOWS = 30;
const ARTICLE_MIN_VISITS = 10;
const ARTICLE_READ_SHARE = 0.15;
const ARTICLE_MIN_SECONDS = 30;
const wrongPageDemand = (shows) => Math.min(25, 5 + Math.floor(shows / 10));
const pos = (v) => typeof v === "number" ? v : 101;
const known = (v) => typeof v === "number";
function scoreOf(s, g, r, a) {
  return { s, g, r, a, total: s + g + r + a };
}
function buildFindings(prev, curr) {
  const out = [];
  const prevPos = prev?.topvisor?.ok ? prev.topvisor.data?.positions ?? {} : {};
  const currPos = curr?.topvisor?.ok ? curr.topvisor.data?.positions ?? {} : {};
  for (const [key, raw] of Object.entries(currPos)) {
    const now = pos(raw);
    const was = pos(prevPos[key]);
    const hadBefore = Object.prototype.hasOwnProperty.call(prevPos, key);
    if (hadBefore && known(prevPos[key]) && was <= 10 && now > 10) {
      out.push({
        type: "left-top10",
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u0432\u044B\u0448\u0435\u043B \u0438\u0437 \u0442\u043E\u043F-10: ${was} \u2192 ${known(raw) ? now : ">100"}`,
        detail: `\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u043E \u044D\u0442\u043E\u043C\u0443 \u0437\u0430\u043F\u0440\u043E\u0441\u0443 \u0443\u0436\u0435 \u0431\u044B\u043B\u0430 \u0432 \u0434\u0435\u0441\u044F\u0442\u043A\u0435, \u0437\u043D\u0430\u0447\u0438\u0442 \u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0438 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u043B\u0438. \u0420\u0430\u0437\u043E\u0431\u0440\u0430\u0442\u044C\u0441\u044F, \u0447\u0442\u043E \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u043E\u0441\u044C: \u043A\u043E\u043D\u043A\u0443\u0440\u0435\u043D\u0442, \u043A\u0430\u043D\u043D\u0438\u0431\u0430\u043B\u0438\u0437\u0430\u0446\u0438\u044F \u0438\u043B\u0438 \u043F\u0440\u0430\u0432\u043A\u0430 \u043D\u0430 \u043D\u0430\u0448\u0435\u0439 \u0441\u0442\u043E\u0440\u043E\u043D\u0435.`,
        dedupKey: `left-top10:${key}`,
        score: scoreOf(20, 20, 0, 18)
      });
      continue;
    }
    if (hadBefore && known(prevPos[key]) && known(raw) && now - was >= DROP_THRESHOLD) {
      out.push({
        type: "position-drop",
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u043F\u0440\u043E\u0441\u0435\u043B \u043D\u0430 ${now - was}: ${was} \u2192 ${now}`,
        detail: `\u041F\u0430\u0434\u0435\u043D\u0438\u0435 \u0432\u043D\u0443\u0442\u0440\u0438 \u0442\u043E\u043F-100. \u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443, \u0441\u0432\u0435\u0436\u0435\u0441\u0442\u044C \u0434\u0430\u043D\u043D\u044B\u0445 \u0438 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0443.`,
        dedupKey: `position-drop:${key}`,
        score: scoreOf(12, 18, 0, 18)
      });
      continue;
    }
    if (known(raw) && now >= NEAR_TOP[0] && now <= NEAR_TOP[1]) {
      out.push({
        type: "near-top10",
        key,
        title: `\u041A\u043B\u044E\u0447 \xAB${key}\xBB \u043D\u0430 ${now} \u2014 \u043A\u0430\u043D\u0434\u0438\u0434\u0430\u0442 \u043D\u0430 \u0434\u043E\u0436\u0438\u043C`,
        detail: `\u0412 \u043A\u043E\u0440\u0438\u0434\u043E\u0440\u0435 ${NEAR_TOP[0]}\u2013${NEAR_TOP[1]} \u043F\u0440\u0438\u0440\u043E\u0441\u0442 \u0434\u0430\u0451\u0442 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u044B\u0432\u0430\u043D\u0438\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B: \u043E\u0431\u044A\u0451\u043C, \u0432\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F, FAQ, \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0430. \u041D\u043E\u0432\u0430\u044F \u0441\u0442\u0430\u0442\u044C\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0434\u0435\u043B\u0438\u0442 \u0432\u044B\u0434\u0430\u0447\u0443.`,
        dedupKey: `near-top10:${key}`,
        score: scoreOf(18, 15, 0, 18)
      });
    }
  }
  for (const a of curr?.articles?.ok ? curr.articles.data?.rows ?? [] : []) {
    if (a.visits < ARTICLE_MIN_VISITS) continue;
    const read = a.seconds >= ARTICLE_MIN_SECONDS && a.share >= ARTICLE_READ_SHARE;
    const inTop = a.position !== null && a.position <= 10;
    const percent = Math.round(Math.min(a.share, 1) * 100);
    if (inTop && !read) {
      out.push({
        type: "article-not-read",
        key: a.slug,
        title: `\u0421\u0442\u0430\u0442\u044C\u044F \xAB${a.slug}\xBB \u043D\u0430 ${a.position} \u043C\u0435\u0441\u0442\u0435, \u043D\u043E \u0435\u0451 \u043D\u0435 \u0447\u0438\u0442\u0430\u044E\u0442`,
        detail: `${a.visits} \u0432\u0438\u0437\u0438\u0442\u043E\u0432 \u0437\u0430 90 \u0434\u043D\u0435\u0439, \u043F\u0440\u043E\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442 ${percent}% \u0442\u0435\u043A\u0441\u0442\u0430. \u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0435\u0441\u0442\u044C, \u0437\u043D\u0430\u0447\u0438\u0442 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u2014 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0430 \u0432 \u0441\u0430\u043C\u043E\u043C \u0442\u0435\u043A\u0441\u0442\u0435: \u043F\u0435\u0440\u0432\u044B\u0439 \u044D\u043A\u0440\u0430\u043D \u043D\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u0437\u0430\u043F\u0440\u043E\u0441, \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043D\u0435 \u0434\u0435\u0440\u0436\u0438\u0442 \u0438\u043B\u0438 \u043E\u0431\u044A\u0451\u043C \u043D\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u0435\u0442 \u043E\u0431\u0435\u0449\u0430\u043D\u0438\u044E. \u041F\u0440\u0430\u0432\u0438\u0442\u0441\u044F \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u044B\u0432\u0430\u043D\u0438\u0435\u043C, \u043D\u0435 \u043A\u043B\u044E\u0447\u0430\u043C\u0438.`,
        dedupKey: `article-not-read:${a.slug}`,
        score: scoreOf(16, 18, 8, 16)
      });
    } else if (!inTop && read) {
      out.push({
        type: "article-not-ranked",
        key: a.slug,
        title: `\u0421\u0442\u0430\u0442\u044C\u044E \xAB${a.slug}\xBB \u0447\u0438\u0442\u0430\u044E\u0442 \u043D\u0430 ${percent}%, \u043D\u043E \u0435\u0451 \u043D\u0435\u0442 \u0432 \u0442\u043E\u043F-10`,
        detail: `${a.visits} \u0432\u0438\u0437\u0438\u0442\u043E\u0432 \u0437\u0430 90 \u0434\u043D\u0435\u0439. \u0422\u0435\u043A\u0441\u0442 \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 \u2014 \u0437\u043D\u0430\u0447\u0438\u0442 \u043D\u0430\u043F\u0438\u0441\u0430\u043D \u0445\u043E\u0440\u043E\u0448\u043E, \u0430 \u043D\u0435 \u043D\u0430\u0445\u043E\u0434\u044F\u0442 \u0435\u0433\u043E \u0438\u0437-\u0437\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 \u0438 \u043A\u043B\u044E\u0447\u0435\u0439. \u041F\u043E\u0434\u043E\u0431\u0440\u0430\u0442\u044C \u043A\u043B\u044E\u0447 \u0441 \u0447\u0430\u0441\u0442\u043E\u0442\u043D\u043E\u0441\u0442\u044C\u044E \u043E\u0442 300 \u0438 \u043F\u0435\u0440\u0435\u043F\u0438\u0441\u0430\u0442\u044C title \u043F\u043E\u0434 \u043D\u0435\u0433\u043E; \u0442\u0435\u043A\u0441\u0442 \u043D\u0435 \u0442\u0440\u043E\u0433\u0430\u0442\u044C.`,
        dedupKey: `article-not-ranked:${a.slug}`,
        score: scoreOf(18, 20, 6, 18)
      });
    }
  }
  const prevPages = new Map(
    (prev?.metrika?.ok ? prev.metrika.data?.topPages ?? [] : []).map((p) => [p.path, p.pageviews])
  );
  for (const p of curr?.metrika?.ok ? curr.metrika.data?.topPages ?? [] : []) {
    const before = prevPages.get(p.path);
    if (before == null || before < PAGEVIEW_FLOOR) continue;
    const dropPct = Math.round((before - p.pageviews) / before * 100);
    if (dropPct >= PAGEVIEW_DROP_PCT) {
      out.push({
        type: "pageviews-drop",
        key: p.path,
        title: `\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u044B ${p.path} \u0443\u043F\u0430\u043B\u0438 \u043D\u0430 ${dropPct}%: ${before} \u2192 ${p.pageviews}`,
        detail: `\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441\u0430\u0446\u0438\u044E, \u043F\u043E\u0437\u0438\u0446\u0438\u0438 \u043F\u043E \u043A\u043B\u044E\u0447\u0430\u043C \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0438 \u043D\u0435 \u0441\u043B\u043E\u043C\u0430\u043B\u0430\u0441\u044C \u043B\u0438 \u043E\u043D\u0430.`,
        dedupKey: `pageviews-drop:${p.path}`,
        score: scoreOf(15, 18, 0, 18)
      });
    }
  }
  for (const q of curr?.webmaster?.ok ? curr.webmaster.data?.queries ?? [] : []) {
    if (q.shows >= ZERO_CLICK_SHOWS && q.clicks === 0) {
      out.push({
        type: "zero-clicks",
        key: q.query,
        title: `\xAB${q.query}\xBB: ${q.shows} \u043F\u043E\u043A\u0430\u0437\u043E\u0432, \u043D\u043E\u043B\u044C \u043A\u043B\u0438\u043A\u043E\u0432`,
        detail: `\u041D\u0430\u0441 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u044E\u0442, \u043D\u043E \u043D\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442. \u0421\u043C\u043E\u0442\u0440\u0435\u0442\u044C title \u0438 description \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0440\u0430\u043D\u0436\u0438\u0440\u0443\u0435\u0442\u0441\u044F, \u0438 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u0435 \u0438\u043D\u0442\u0435\u043D\u0442\u0443.`,
        dedupKey: `zero-clicks:${q.query}`,
        score: scoreOf(10, 15, 0, 18)
      });
    }
  }
  const targets = curr?.topvisor?.ok ? curr.topvisor.data?.targets ?? {} : {};
  const pages = curr?.webmaster?.ok ? curr.webmaster.data?.pages ?? {} : {};
  const strip = (u) => u.replace("https://d-pub.ru", "").replace(/\/$/, "") || "/";
  const norm = (s) => s.toLowerCase().replace(/ё/g, "\u0435").replace(/\s+/g, " ").trim();
  const factByQuery = new Map(Object.entries(pages).map(([q, v]) => [norm(q), v]));
  for (const [key, target] of Object.entries(targets)) {
    const fact = factByQuery.get(norm(key));
    if (!fact) continue;
    const want = strip(target);
    const actual = strip(fact.url);
    if (want === actual) continue;
    out.push({
      type: "wrong-page",
      key,
      title: `\xAB${key}\xBB: \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 ${actual}, \u0430 \u0446\u0435\u043B\u044C\u044E \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0430 ${want}`,
      detail: `\u041F\u043E\u0438\u0441\u043A \u0432\u044B\u0431\u0440\u0430\u043B \u0434\u0440\u0443\u0433\u0443\u044E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u2014 ${fact.shows} \u043F\u043E\u043A\u0430\u0437\u043E\u0432 \u043D\u0430 ${actual}. \u041B\u0438\u0431\u043E \u0446\u0435\u043B\u0435\u0432\u0430\u044F \u0441\u043B\u0430\u0431\u0435\u0435 \u0441\u0432\u043E\u0435\u0433\u043E \u0436\u0435 \u0441\u043E\u0441\u0435\u0434\u0430 \u0438 \u0435\u0451 \u043D\u0430\u0434\u043E \u0443\u0441\u0438\u043B\u0438\u0432\u0430\u0442\u044C, \u043B\u0438\u0431\u043E \u0446\u0435\u043B\u044C \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0430 \u043D\u0435\u0432\u0435\u0440\u043D\u043E \u0438 \u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u0443\u0436\u043D\u043E \u0440\u0430\u0437\u043C\u0435\u0442\u043A\u0443, \u0430 \u043D\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.`,
      dedupKey: `wrong-page:${key}`,
      score: scoreOf(wrongPageDemand(fact.shows), 20, 0, 18)
    });
  }
  return out.sort((a, b) => b.score.total - a.score.total);
}
function filterKnown(findings, existingDedupKeys) {
  const seen = new Set(existingDedupKeys);
  return findings.filter((f) => !seen.has(f.dedupKey));
}
const THRESHOLDS = {
  DROP_THRESHOLD,
  NEAR_TOP,
  PAGEVIEW_DROP_PCT,
  PAGEVIEW_FLOOR,
  ZERO_CLICK_SHOWS
};
export {
  THRESHOLDS,
  buildFindings,
  filterKnown
};
