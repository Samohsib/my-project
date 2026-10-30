// localStorage 저장소. 같은 주소(origin)를 쓰는 다른 앱과 섞이지 않게 키 앞에 'logic-puzzles:'를 붙인다.

import { emptyRecords } from '../core/records.js';
import { dateKey } from '../core/dates.js';

const KEY = 'logic-puzzles:v1';

function defaults() {
  return {
    settings: { voice: true, sfx: true },
    rec: emptyRecords(),
    saves: {},       // 풀던 판: 'd|날짜|퍼즐|단계' 또는 'p|퍼즐|단계'
    practiceNo: {},  // 연습 판 번호 (씨앗에 쓴다)
    lastLevel: {},   // 퍼즐마다 마지막으로 고른 단계
  };
}

function load() {
  const base = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const d = JSON.parse(raw);
    return {
      settings: { ...base.settings, ...d.settings },
      rec: { ...base.rec, ...d.rec },
      saves: d.saves || {},
      practiceNo: d.practiceNo || {},
      lastLevel: d.lastLevel || {},
    };
  } catch {
    return base;
  }
}

export const data = load();

// 지난 날의 오늘의 퍼즐 저장은 지운다 (기록은 rec에 남아 있다)
(() => {
  const today = dateKey();
  for (const k of Object.keys(data.saves)) {
    if (k.startsWith('d|') && k.split('|')[1] !== today) delete data.saves[k];
  }
})();

let timer = null;
export function save(now = false) {
  clearTimeout(timer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* 저장 공간이 없어도 놀이는 계속 */ } };
  if (now) write(); else timer = setTimeout(write, 150);
}

export function resetAll() {
  const fresh = defaults();
  fresh.settings = data.settings;
  Object.assign(data, fresh);
  save(true);
}

addEventListener('pagehide', () => save(true));
