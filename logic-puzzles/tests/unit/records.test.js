// 기록·연속 기록·단계 열림 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyRecords, recordSolve, streakInfo, isUnlocked, formatTime, koreanDuration, recentDays } from '../../js/core/records.js';
import { UNLOCK_AFTER } from '../../js/core/catalog.js';

const solve = (rec, date, extra = {}) => recordSolve(rec, { type: 'sudoku', levelId: '4', mode: 'daily', date, seconds: 60, ...extra });

test('연속 기록: 이어진 날을 센다', () => {
  const rec = emptyRecords();
  assert.deepEqual(streakInfo(rec, '2026-10-30'), { current: 0, todayDone: false, best: 0 });
  solve(rec, '2026-10-28');
  solve(rec, '2026-10-29');
  // 오늘 아직 안 풀었어도 어제까지 이어졌으면 살아 있다
  assert.deepEqual(streakInfo(rec, '2026-10-30'), { current: 2, todayDone: false, best: 2 });
  const r = solve(rec, '2026-10-30');
  assert.equal(r.firstDailyToday, true);
  assert.equal(r.streak.current, 3);
  assert.equal(streakInfo(rec, '2026-10-30').todayDone, true);
  // 하루를 건너뛰면 다시 0부터
  assert.equal(streakInfo(rec, '2026-11-01').current, 0);
  assert.equal(streakInfo(rec, '2026-11-01').best, 3);
  solve(rec, '2026-11-01');
  assert.equal(streakInfo(rec, '2026-11-01').current, 1);
  assert.equal(rec.bestStreak, 3);
});

test('연속 기록: 연습 판은 연속 기록에 들어가지 않지만 푼 판 수와 최고 기록에는 들어간다', () => {
  const rec = emptyRecords();
  recordSolve(rec, { type: 'nonogram', levelId: '5', mode: 'practice', date: '2026-10-30', seconds: 30 });
  assert.equal(streakInfo(rec, '2026-10-30').current, 0);
  assert.equal(rec.solved['nonogram:5'], 1);
  assert.equal(rec.best['nonogram:5'], 30);
});

test('같은 날 오늘의 퍼즐을 여러 개 풀어도 하루로 센다', () => {
  const rec = emptyRecords();
  assert.equal(solve(rec, '2026-10-30').firstDailyToday, true);
  assert.equal(solve(rec, '2026-10-30', { type: 'futoshiki' }).firstDailyToday, false);
  assert.equal(streakInfo(rec, '2026-10-30').current, 1);
});

test('최고 기록은 더 빠를 때만 바뀐다', () => {
  const rec = emptyRecords();
  assert.equal(solve(rec, '2026-10-30', { mode: 'practice', seconds: 80 }).isBest, true);
  assert.equal(solve(rec, '2026-10-30', { mode: 'practice', seconds: 95 }).isBest, false);
  assert.equal(solve(rec, '2026-10-30', { mode: 'practice', seconds: 41.6 }).isBest, true);
  assert.equal(rec.best['sudoku:4'], 42);
  assert.equal(rec.solved['sudoku:4'], 3);
});

test('단계는 앞 단계를 풀어야 열린다', () => {
  const rec = emptyRecords();
  assert.equal(isUnlocked(rec, 'sudoku', '4'), true);
  assert.equal(isUnlocked(rec, 'sudoku', '6'), false);
  for (let k = 0; k < UNLOCK_AFTER; k++) solve(rec, '2026-10-30', { mode: 'practice' });
  assert.equal(isUnlocked(rec, 'sudoku', '6'), true);
  assert.equal(isUnlocked(rec, 'sudoku', '9'), false);
  assert.equal(isUnlocked(rec, 'nonogram', '7'), false);
});

test('시간 글자', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(75.9), '1:15');
  assert.equal(formatTime(3725), '62:05');
  assert.equal(koreanDuration(42), '42초');
  assert.equal(koreanDuration(120), '2분');
  assert.equal(koreanDuration(83), '1분 23초');
});

test('최근 기록 달력', () => {
  const rec = emptyRecords();
  solve(rec, '2026-10-29');
  const days = recentDays(rec, '2026-10-30', 3);
  assert.deepEqual(days, [
    { date: '2026-10-28', count: 0 },
    { date: '2026-10-29', count: 1 },
    { date: '2026-10-30', count: 0 },
  ]);
});
