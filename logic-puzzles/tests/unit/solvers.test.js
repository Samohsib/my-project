// 앱 안 풀이기·힌트 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePuzzle, PUZZLES } from '../../js/core/catalog.js';
import { solveLine } from '../../js/core/nonogram.js';
import { sudokuHint, solveWithSingles } from '../../js/core/sudoku.js';
import { futoshikiHint, solveLogically } from '../../js/core/futoshiki.js';
import { nonogramHint } from '../../js/core/nonogram.js';

test('네모로직 한 줄 풀기: 잘 알려진 경우들', () => {
  // 10칸에 8: 가운데 6칸은 꼭 칠한다
  assert.deepEqual(solveLine([8], new Array(10).fill(-1)), [-1, -1, 1, 1, 1, 1, 1, 1, -1, -1]);
  // 5칸에 2 1: 두 번째 칸만 꼭 칠하고, 나머지는 알 수 없다
  assert.deepEqual(solveLine([2, 1], new Array(5).fill(-1)), [-1, 1, -1, -1, -1]);
  // 5칸에 2 2: 놓는 방법이 하나뿐이다
  assert.deepEqual(solveLine([2, 2], new Array(5).fill(-1)), [1, 1, 0, 1, 1]);
  // 꽉 차는 경우
  assert.deepEqual(solveLine([2, 1], new Array(4).fill(-1)), [1, 1, 0, 1]);
  // 빈 줄
  assert.deepEqual(solveLine([], [-1, -1, -1]), [0, 0, 0]);
  // 이미 칠한 칸이 있으면 그 주변이 정해진다
  assert.deepEqual(solveLine([1], [-1, 1, -1]), [0, 1, 0]);
  // 모순
  assert.equal(solveLine([3], [-1, 0, -1, -1]), null);
  assert.equal(solveLine([1], [1, -1, 1]), null);
});

test('스도쿠·부등호: 생성된 판은 추측 없이 논리만으로 풀린다', () => {
  for (const l of PUZZLES.sudoku.levels) {
    for (let k = 0; k < 30; k++) {
      const p = makePuzzle('sudoku', l.id, `logic-${k}`);
      const r = solveWithSingles(p.givens, p.n);
      assert.ok(r.solved);
      assert.deepEqual(r.grid, p.solution);
    }
  }
  for (const l of PUZZLES.futoshiki.levels) {
    for (let k = 0; k < 30; k++) {
      const p = makePuzzle('futoshiki', l.id, `logic-${k}`);
      const r = solveLogically(p);
      assert.ok(r.solved);
      assert.deepEqual(r.grid, p.solution);
    }
  }
});

function solveWithHints(type, p, hintFn) {
  const isNono = type === 'nonogram';
  const grid = isNono ? new Array(p.w * p.h).fill(0) : p.givens.slice();
  for (let step = 0; step < 400; step++) {
    const h = hintFn(grid, p);
    if (!h) return { grid, steps: step };
    assert.notEqual(h.type, 'wrong');
    assert.notEqual(h.type, 'reveal', '논리 힌트가 늘 있어야 한다');
    if (isNono) {
      assert.equal(h.value, p.solution[h.cell], '힌트가 정답과 같아야 한다');
      grid[h.cell] = h.value === 1 ? 1 : 2;
      if (p.solution.every((v, i) => (v === 1) === (grid[i] === 1))) return { grid, steps: step + 1 };
    } else {
      assert.equal(h.value, p.solution[h.cell], '힌트가 정답과 같아야 한다');
      grid[h.cell] = h.value;
    }
  }
  throw new Error('힌트만으로 끝나지 않음');
}

test('힌트만 계속 눌러도 끝까지 풀린다 (힌트는 늘 정답)', () => {
  for (let k = 0; k < 20; k++) {
    for (const l of PUZZLES.sudoku.levels) {
      const p = makePuzzle('sudoku', l.id, `hint-${k}`);
      assert.deepEqual(solveWithHints('sudoku', p, sudokuHint).grid, p.solution);
    }
    for (const l of PUZZLES.futoshiki.levels) {
      const p = makePuzzle('futoshiki', l.id, `hint-${k}`);
      assert.deepEqual(solveWithHints('futoshiki', p, futoshikiHint).grid, p.solution);
    }
    for (const l of PUZZLES.nonogram.levels) {
      const p = makePuzzle('nonogram', l.id, `hint-${k}`);
      solveWithHints('nonogram', p, nonogramHint);
    }
  }
});

test('틀린 칸이 있으면 힌트가 먼저 그 칸을 알려 준다', () => {
  const s = makePuzzle('sudoku', '4', 'wrong-1');
  const g = s.givens.slice();
  const i = g.indexOf(0);
  g[i] = (s.solution[i] % 4) + 1;
  assert.deepEqual(sudokuHint(g, s), { type: 'wrong', cells: [i] });

  const f = makePuzzle('futoshiki', '4', 'wrong-2');
  const fg = f.givens.slice();
  const j = fg.indexOf(0);
  fg[j] = (f.solution[j] % 4) + 1;
  assert.deepEqual(futoshikiHint(fg, f), { type: 'wrong', cells: [j] });

  const n = makePuzzle('nonogram', '5', 'wrong-3');
  const cells = new Array(25).fill(0);
  const e = n.solution.indexOf(0), full = n.solution.indexOf(1);
  cells[e] = 1; cells[full] = 2;
  assert.deepEqual(nonogramHint(cells, n), { type: 'wrong', cells: [Math.min(e, full), Math.max(e, full)] });
});

test('고른 칸을 알 수 있으면 그 칸 힌트를 준다', () => {
  const p = makePuzzle('sudoku', '4', 'prefer-1');
  const g = p.solution.slice();
  g[5] = 0; // 나머지가 다 차 있으면 이 칸은 바로 알 수 있다
  assert.deepEqual(sudokuHint(g, p, 5), { type: 'naked', cell: 5, value: p.solution[5] });
});
