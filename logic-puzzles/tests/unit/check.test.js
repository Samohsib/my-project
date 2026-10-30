// 정답 판정 단위 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzle } from '../../js/core/catalog.js';
import { checkSudoku } from '../../js/core/sudoku.js';
import { checkFutoshiki } from '../../js/core/futoshiki.js';
import { checkNonogram } from '../../js/core/nonogram.js';

test('스도쿠: 정답은 성공, 빈칸이 있으면 아직, 겹치면 빨간 칸', () => {
  const p = makePuzzle('sudoku', '4', 'check-1');
  assert.deepEqual(checkSudoku(p.solution, 4, p.givens), { complete: true, conflicts: [], solved: true });

  const partial = p.solution.slice();
  const blank = p.givens.indexOf(0);
  partial[blank] = 0;
  const r1 = checkSudoku(partial, 4, p.givens);
  assert.equal(r1.complete, false);
  assert.equal(r1.solved, false);
  assert.deepEqual(r1.conflicts, []);

  // 같은 줄의 두 빈칸 숫자를 바꾸면 세로줄에서 겹친다
  const swapped = p.solution.slice();
  const row = Math.floor(blank / 4);
  const other = [0, 1, 2, 3].map((c) => row * 4 + c).find((i) => i !== blank);
  [swapped[blank], swapped[other]] = [swapped[other], swapped[blank]];
  const r2 = checkSudoku(swapped, 4);
  assert.equal(r2.complete, true);
  assert.equal(r2.solved, false);
  assert.ok(r2.conflicts.includes(blank) && r2.conflicts.includes(other));
});

test('스도쿠: 규칙으로 판정한다 (손으로 만든 9×9 정답)', () => {
  const rows = [
    '534678912', '672195348', '198342567',
    '859761423', '426853791', '713924856',
    '961537284', '287419635', '345286179',
  ];
  const grid = rows.join('').split('').map(Number);
  assert.equal(checkSudoku(grid, 9).solved, true);
  const bad = grid.slice(); bad[0] = 6; // 첫 줄에 6이 두 번
  const r = checkSudoku(bad, 9);
  assert.equal(r.solved, false);
  assert.ok(r.conflicts.includes(0) && r.conflicts.includes(3));
});

test('스도쿠: 처음 주어진 숫자를 바꾸면 성공이 아니다', () => {
  const p = makePuzzle('sudoku', '6', 'check-2');
  const g = p.givens.findIndex(Boolean);
  const changed = p.solution.slice();
  changed[g] = 0;
  assert.equal(checkSudoku(changed, 6, p.givens).solved, false);
});

test('부등호: 정답은 성공, 부등호를 어기면 그 부등호를 알려 준다', () => {
  const p = makePuzzle('futoshiki', '4', 'check-3');
  assert.equal(checkFutoshiki(p.solution, p).solved, true);
  const [lo, hi] = p.ineqs[0];
  const g = new Array(16).fill(0);
  g[lo] = 4; g[hi] = 1;
  const r = checkFutoshiki(g, p);
  assert.equal(r.solved, false);
  assert.equal(r.complete, false);
  assert.deepEqual(r.brokenIneqs, [0]);
});

test('부등호: 가로줄에 같은 숫자가 두 번이면 빨간 칸', () => {
  const p = makePuzzle('futoshiki', '5', 'check-4');
  const g = p.solution.slice();
  g[1] = g[0];
  const r = checkFutoshiki(g, p);
  assert.equal(r.solved, false);
  assert.ok(r.conflicts.includes(0) && r.conflicts.includes(1));
});

test('네모로직: 칠한 칸만 보고 판정, X표는 빈칸으로 친다', () => {
  const p = makePuzzle('nonogram', '5', 'check-5');
  assert.equal(checkNonogram(p.solution, p).solved, true);
  const withX = p.solution.map((v) => (v ? 1 : 2));
  assert.equal(checkNonogram(withX, p).solved, true);

  const missing = p.solution.slice();
  const i = missing.indexOf(1);
  missing[i] = 0;
  const r = checkNonogram(missing, p);
  assert.equal(r.solved, false);
  assert.equal(r.rowsDone[Math.floor(i / 5)], false);
  assert.equal(r.colsDone[i % 5], false);

  const extra = p.solution.slice();
  const j = extra.indexOf(0);
  extra[j] = 1;
  assert.equal(checkNonogram(extra, p).solved, false);
});

test('네모로직: 다 맞은 줄은 따로 표시된다', () => {
  const p = { w: 3, h: 2, rows: [[3], [1]], cols: [[1], [2], [1]] };
  const r = checkNonogram([1, 1, 1, 0, 0, 0], p);
  assert.deepEqual(r.rowsDone, [true, false]);
  assert.deepEqual(r.colsDone, [true, false, true]);
  assert.equal(checkNonogram([1, 1, 1, 0, 1, 0], p).solved, true);
});
