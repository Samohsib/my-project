// 매일 새 판: 같은 날짜 씨앗이면 같은 판, 다른 날이면 다른 판.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, PUZZLE_IDS, dailyPuzzle, dailySeed, makePuzzle, practiceSeed } from '../../js/core/catalog.js';
import { makeRng } from '../../js/core/rng.js';
import { addDays, dateKey, daysBetween } from '../../js/core/dates.js';

const allLevels = () => PUZZLE_IDS.flatMap((t) => PUZZLES[t].levels.map((l) => [t, l.id]));
const body = (p) => JSON.stringify({ g: p.givens, i: p.ineqs, r: p.rows, c: p.cols, s: p.solution });

test('같은 날짜면 퍼즐·단계마다 늘 같은 판이 나온다', () => {
  for (const date of ['2026-10-30', '2027-01-01', '2028-02-29']) {
    for (const [t, l] of allLevels()) {
      const a = dailyPuzzle(date, t, l);
      // 다른 판을 몇 개 만든 뒤에 다시 만들어도 같아야 한다(숨은 상태가 없어야 한다)
      makePuzzle(t, l, 'something-else');
      const b = dailyPuzzle(date, t, l);
      assert.equal(body(a), body(b), `${date} ${t} ${l}`);
    }
  }
});

test('날짜가 다르면 판이 달라진다 (30일 동안 겹치지 않음)', () => {
  for (const [t, l] of allLevels()) {
    const seen = new Set();
    for (let d = 0; d < 30; d++) seen.add(body(dailyPuzzle(addDays('2026-10-01', d), t, l)));
    assert.equal(seen.size, 30, `${t} ${l}`);
  }
});

test('오늘의 퍼즐 씨앗과 연습 씨앗은 서로 다르다', () => {
  assert.notEqual(dailySeed('2026-10-30', 'sudoku', '4'), practiceSeed('sudoku', '4', 0));
  assert.notEqual(body(dailyPuzzle('2026-10-30', 'sudoku', '4')), body(makePuzzle('sudoku', '4', practiceSeed('sudoku', '4', 0))));
});

test('난수 생성기: 같은 씨앗 같은 수열, 다른 씨앗 다른 수열', () => {
  const seq = (s) => { const r = makeRng(s); return Array.from({ length: 20 }, () => r.next()); };
  assert.deepEqual(seq('2026-10-30'), seq('2026-10-30'));
  assert.notDeepEqual(seq('2026-10-30'), seq('2026-10-31'));
  for (const x of seq('범위')) assert.ok(x >= 0 && x < 1);
  const sh = makeRng('섞기').shuffle([...Array(50).keys()]);
  assert.deepEqual([...sh].sort((a, b) => a - b), [...Array(50).keys()]);
});

test('오늘의 판 지문이 바뀌지 않았다 (생성기를 고치면 이 값도 함께 바뀐다)', () => {
  // 생성기가 실수로 바뀌면 같은 날 아이 판과 아빠 판이 달라진다. 일부러 고쳤을 때만 이 값을 새로 적는다.
  const p = dailyPuzzle('2026-10-30', 'sudoku', '4');
  assert.equal(p.givens.join(''), FINGERPRINT_SUDOKU4);
});

test('날짜 계산', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(daysBetween('2026-10-01', '2026-10-30'), 29);
  assert.equal(dateKey(new Date(2026, 9, 30, 23, 59)), '2026-10-30');
});

const FINGERPRINT_SUDOKU4 = '4201000000002014';
