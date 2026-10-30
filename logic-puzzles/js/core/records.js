// 기록 계산(순수 함수). 저장은 app/store.js가 맡는다.
//  · solved[퍼즐:단계]  푼 판 수
//  · best[퍼즐:단계]    가장 빨리 푼 시간(초)
//  · daily[날짜][퍼즐:단계] 오늘의 퍼즐 결과 { s: 초, h: 힌트 수 }
//  · bestStreak         가장 길었던 연속 기록

import { addDays, daysBetween } from './dates.js';
import { PUZZLES, UNLOCK_AFTER } from './catalog.js';

export const levelKey = (type, levelId) => `${type}:${levelId}`;

export function emptyRecords() {
  return { solved: {}, best: {}, daily: {}, bestStreak: 0 };
}

// 연속 기록: 오늘의 퍼즐을 하나라도 푼 날이 며칠째 이어지는지.
// 오늘 아직 안 풀었어도 어제까지 이어졌다면 그 기록이 살아 있다.
export function streakInfo(rec, today) {
  const has = (d) => !!rec.daily[d] && Object.keys(rec.daily[d]).length > 0;
  const todayDone = has(today);
  let day = todayDone ? today : addDays(today, -1);
  let current = 0;
  while (has(day)) { current++; day = addDays(day, -1); }
  return { current, todayDone, best: Math.max(rec.bestStreak || 0, current) };
}

export function recordSolve(rec, { type, levelId, mode, date, seconds, hints = 0 }) {
  const key = levelKey(type, levelId);
  rec.solved[key] = (rec.solved[key] || 0) + 1;
  const s = Math.round(seconds);
  const isBest = !(key in rec.best) || s < rec.best[key];
  if (isBest) rec.best[key] = s;
  let firstDailyToday = false;
  if (mode === 'daily') {
    rec.daily[date] = rec.daily[date] || {};
    firstDailyToday = Object.keys(rec.daily[date]).length === 0;
    if (!rec.daily[date][key]) rec.daily[date][key] = { s, h: hints };
  }
  const streak = streakInfo(rec, date);
  rec.bestStreak = Math.max(rec.bestStreak || 0, streak.current);
  return { isBest, firstDailyToday, streak };
}

export function isUnlocked(rec, type, levelId) {
  const levels = PUZZLES[type].levels;
  const idx = levels.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  return (rec.solved[levelKey(type, levels[idx - 1].id)] || 0) >= UNLOCK_AFTER;
}

// 최근 days일 동안 오늘의 퍼즐을 푼 날 (오래된 날부터)
export function recentDays(rec, today, days = 14) {
  const out = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = addDays(today, -k);
    out.push({ date: d, count: rec.daily[d] ? Object.keys(rec.daily[d]).length : 0 });
  }
  return out;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60), r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function koreanDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60), r = s % 60;
  if (!m) return `${r}초`;
  return r ? `${m}분 ${r}초` : `${m}분`;
}

export { daysBetween };
