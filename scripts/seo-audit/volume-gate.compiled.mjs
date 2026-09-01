const KEY_TYPES = /* @__PURE__ */ new Set([
  "left-top10",
  "position-drop",
  "near-top10",
  "zero-clicks",
  "wrong-page"
]);
const MIN_VOLUME = 50;
function withVolume(f, volume) {
  return { ...f, title: `${f.title} \xB7 ${volume}/\u043C\u0435\u0441` };
}
function applyVolumeGate(findings, volumes) {
  const kept = [];
  const dropped = [];
  for (const f of findings) {
    if (!KEY_TYPES.has(f.type)) {
      kept.push(f);
      continue;
    }
    const volume = volumes[f.key];
    if (volume === void 0) {
      kept.push(f);
      continue;
    }
    if (volume < MIN_VOLUME) dropped.push({ finding: f, volume });
    else kept.push(withVolume(f, volume));
  }
  return { kept, dropped };
}
function keysToMeasure(findings) {
  return [...new Set(findings.filter((f) => KEY_TYPES.has(f.type)).map((f) => f.key))];
}
export {
  KEY_TYPES,
  MIN_VOLUME,
  applyVolumeGate,
  keysToMeasure
};
