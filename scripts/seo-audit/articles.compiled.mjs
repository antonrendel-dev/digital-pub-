const CHARS_PER_MINUTE = 1200;
const NOT_READ_SECONDS = 30;
const READ_SHARE = 0.15;
const TOP_POSITION = 10;
const PER_GROUP = 3;
function readShare(seconds, chars) {
  if (!chars || chars <= 0) return 0;
  const expected = chars / CHARS_PER_MINUTE * 60;
  return expected > 0 ? seconds / expected : 0;
}
function isRead(row) {
  return row.seconds >= NOT_READ_SECONDS && row.share >= READ_SHARE;
}
function isInTop(row) {
  return row.position !== null && row.position <= TOP_POSITION;
}
function groupArticles(rows) {
  const groups = [
    {
      title: "\u0412 \u0442\u043E\u043F\u0435, \u043D\u043E \u043D\u0435 \u0447\u0438\u0442\u0430\u044E\u0442",
      action: "\u0447\u0438\u043D\u0438\u0442\u044C \u0442\u0435\u043A\u0441\u0442",
      rows: rows.filter((r) => isInTop(r) && !isRead(r))
    },
    {
      title: "\u0427\u0438\u0442\u0430\u044E\u0442, \u043D\u043E \u043D\u0435 \u0432 \u0442\u043E\u043F\u0435",
      action: "\u0447\u0438\u043D\u0438\u0442\u044C \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A",
      rows: rows.filter((r) => !isInTop(r) && isRead(r))
    },
    {
      title: "\u041D\u0438 \u0442\u043E\u0433\u043E, \u043D\u0438 \u0434\u0440\u0443\u0433\u043E\u0433\u043E",
      action: "\u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0442\u044C \u0441\u043F\u0440\u043E\u0441",
      rows: rows.filter((r) => !isInTop(r) && !isRead(r))
    }
  ];
  for (const group of groups) group.rows.sort((a, b) => b.visits - a.visits);
  return groups.filter((g) => g.rows.length > 0);
}
function displayShare(share) {
  return Math.round(Math.min(share, 1) * 100);
}
export {
  CHARS_PER_MINUTE,
  NOT_READ_SECONDS,
  PER_GROUP,
  READ_SHARE,
  TOP_POSITION,
  displayShare,
  groupArticles,
  isInTop,
  isRead,
  readShare
};
