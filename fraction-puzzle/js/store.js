// 진행 기록과 설정을 localStorage에 저장한다. 저장이 막힌 브라우저(사생활 보호 모드)에서도 놀이는 된다.
const KEY = 'fraction-puzzle:v1';

const fresh = () => ({ stars: {}, challengeBest: 0, challengePlays: 0, settings: { voice: true, sound: true } });

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw);
    const f = fresh();
    return { ...f, ...d, settings: { ...f.settings, ...(d.settings || {}) }, stars: d.stars || {} };
  } catch (e) {
    return fresh();
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 저장 못 해도 계속 */ }
}

export const store = {
  stars(unitId, level) { return (data.stars[unitId] || [])[level] || 0; },
  unitStars(unitId) { return (data.stars[unitId] || []).reduce((s, x) => s + (x || 0), 0); },
  setStars(unitId, level, n) {
    const arr = data.stars[unitId] || (data.stars[unitId] = []);
    if ((arr[level] || 0) < n) { arr[level] = n; save(); return true; }
    return false;
  },
  unlocked(unitId, level) { return level === 0 || this.stars(unitId, level - 1) > 0; },
  get challengeBest() { return data.challengeBest; },
  recordChallenge(score) {
    data.challengePlays++;
    const best = score > data.challengeBest;
    if (best) data.challengeBest = score;
    save();
    return best;
  },
  get settings() { return data.settings; },
  setSetting(k, v) { data.settings[k] = v; save(); },
  resetProgress() { const s = data.settings; data = fresh(); data.settings = s; save(); },
};
