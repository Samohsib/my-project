// 진행 기록 저장 (localStorage). 사파리 개인정보 보호 모드 등에서 저장이 막혀도 앱은 돌아가게 한다.
const KEY = 'coding-puzzle-v1';

const defaults = () => ({
  stars: {},       // 판 id → 받은 별 수(1~3)
  best: {},        // 판 id → 깬 프로그램 중 가장 적은 블록 수
  programs: {},    // 판 id → 마지막으로 짜던 프로그램
  seen: {},        // 본 안내 (장 소개 등)
  settings: { voice: true, sfx: true, speed: 'normal', unlockAll: false },
  last: null,      // 마지막으로 한 판
});

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
  } catch (e) {
    return defaults();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 못 해도 계속 */ }
}

export const store = {
  get settings() { return data.settings; },
  setSetting(k, v) { data.settings[k] = v; save(); },
  starsOf(id) { return data.stars[id] || 0; },
  bestOf(id) { return data.best[id] ?? null; },
  totalStars() { return Object.values(data.stars).reduce((a, b) => a + b, 0); },
  // 깼을 때: 더 좋은 기록만 남긴다. 처음 깼는지 돌려준다
  recordClear(id, stars, blocks) {
    const first = !data.stars[id];
    data.stars[id] = Math.max(data.stars[id] || 0, stars);
    data.best[id] = Math.min(data.best[id] ?? Infinity, blocks);
    save();
    return first;
  },
  programOf(id) { return data.programs[id] || null; },
  saveProgram(id, prog) { data.programs[id] = prog; save(); },
  seen(key) { return !!data.seen[key]; },
  markSeen(key) { data.seen[key] = true; save(); },
  get last() { return data.last; },
  set last(id) { data.last = id; save(); },
  resetAll() {
    const settings = data.settings;
    data = defaults();
    data.settings = { ...settings, unlockAll: false };
    save();
  },
};
