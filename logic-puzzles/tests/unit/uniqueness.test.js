// 생성기가 내는 판은 해가 정확히 하나여야 한다. 단계마다 수백 판을 만들어 따로 만든 풀이기로 센다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLES, makePuzzle, practiceSeed } from '../../js/core/catalog.js';
import { countSudoku, countFutoshiki, countNonogram } from '../helpers/reference-solvers.js';
import { countSolutions as appCountSudoku, checkSudoku } from '../../js/core/sudoku.js';
import { countSolutions as appCountFutoshiki, checkFutoshiki } from '../../js/core/futoshiki.js';
import { countSolutions as appCountNonogram, checkNonogram, cluesOf } from '../../js/core/nonogram.js';

const BOARDS_PER_LEVEL = Number(process.env.BOARDS || 300);

function eachBoard(type, levelId, fn) {
  for (let k = 0; k < BOARDS_PER_LEVEL; k++) fn(makePuzzle(type, levelId, practiceSeed(type, levelId, k)), k);
}

for (const level of PUZZLES.sudoku.levels) {
  test(`스도쿠 ${level.label}: ${BOARDS_PER_LEVEL}판 모두 해가 하나`, () => {
    eachBoard('sudoku', level.id, (p, k) => {
      const ref = countSudoku(p.givens, p.n, p.boxH, p.boxW, 2);
      assert.equal(ref.count, 1, `${k}번째 판의 해가 ${ref.count}개`);
      assert.deepEqual(ref.solutions[0], p.solution, `${k}번째 판: 정답이 생성기 정답과 다름`);
      assert.equal(appCountSudoku(p.givens, p.n, 2), 1);
      assert.ok(checkSudoku(p.solution, p.n, p.givens).solved);
      p.givens.forEach((v, i) => { if (v) assert.equal(v, p.solution[i]); });
      const blanks = p.givens.filter((v) => !v).length;
      assert.ok(blanks > 0);
    });
  });
}

for (const level of PUZZLES.futoshiki.levels) {
  test(`부등호 ${level.label}: ${BOARDS_PER_LEVEL}판 모두 해가 하나`, () => {
    eachBoard('futoshiki', level.id, (p, k) => {
      const ref = countFutoshiki(p.givens, p.n, p.ineqs, 2);
      assert.equal(ref.count, 1, `${k}번째 판의 해가 ${ref.count}개`);
      assert.deepEqual(ref.solutions[0], p.solution);
      assert.equal(appCountFutoshiki(p, 2), 1);
      assert.ok(checkFutoshiki(p.solution, p).solved);
      for (const [lo, hi] of p.ineqs) {
        assert.ok(p.solution[lo] < p.solution[hi]);
        const d = Math.abs(lo - hi);
        assert.ok(d === 1 || d === p.n, '부등호는 이웃한 칸 사이에만');
        if (d === 1) assert.equal(Math.floor(lo / p.n), Math.floor(hi / p.n), '가로 부등호는 같은 줄 안에서');
      }
    });
  });
}

for (const level of PUZZLES.nonogram.levels) {
  test(`네모로직 ${level.label}: ${BOARDS_PER_LEVEL}판 모두 해가 하나`, () => {
    eachBoard('nonogram', level.id, (p, k) => {
      const ref = countNonogram(p.rows, p.cols, p.w, p.h, 2);
      assert.equal(ref.count, 1, `${k}번째 판의 해가 ${ref.count}개`);
      assert.deepEqual(ref.solutions[0], p.solution);
      assert.equal(appCountNonogram(p, 2), 1);
      assert.deepEqual(cluesOf(p.solution, p.w, p.h), { rows: p.rows, cols: p.cols });
      assert.ok(checkNonogram(p.solution, p).solved);
    });
  });
}

test('따로 만든 풀이기도 해가 여럿인 판은 여럿이라고 센다', () => {
  // 4×4 스도쿠 빈 판, 부등호 없는 4×4, 대각선 두 칸만 칠한 2×2 네모로직은 모두 해가 여럿이다
  assert.equal(countSudoku(new Array(16).fill(0), 4, 2, 2, 2).count, 2);
  assert.equal(countFutoshiki(new Array(16).fill(0), 4, [], 2).count, 2);
  assert.equal(countNonogram([[1], [1]], [[1], [1]], 2, 2, 2).count, 2);
});
