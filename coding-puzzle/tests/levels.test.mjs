// 모든 판 시험
//  1) 지도가 올바른지 (출발점 하나, 목표가 있는지, 모든 줄 길이가 같은지)
//  2) 적어 둔 정답 프로그램을 해석기로 돌리면 정말 깨지는지
//  3) 정답의 블록 수가 '별 3개' 기준(best)과 같은지 → 별 3개를 실제로 받을 수 있다
//  4) 정답이 그 판에서 쓸 수 있는 블록·조건만 쓰는지
//  5) 1장(순서만): 너비 우선 탐색으로 구한 최소 걸음 수 = best (더 짧은 답이 없다)
//  6) 자동 풀이기로 best보다 블록이 적은 답이 없는지 (다 찾아볼 수 있는 판만)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, CHAPTERS } from '../js/levels.js';
import {
  parseMap, run, parseProgram, countBlocks, kindsUsed, starsFor, isBlocked, DIRS,
  REPEAT_MIN, REPEAT_MAX,
} from '../js/engine.js';
import { solve } from '../tools/solver.mjs';

test('판이 40개 이상이고 id가 겹치지 않는다', () => {
  assert.ok(LEVELS.length >= 40, `판 수: ${LEVELS.length}`);
  const ids = new Set(LEVELS.map(l => l.id));
  assert.equal(ids.size, LEVELS.length);
});

test('장마다 판이 있고, 장 번호 순서대로 놓여 있다', () => {
  let prev = 0;
  for (const lv of LEVELS) {
    const ch = Number(lv.id.split('-')[0]);
    assert.ok(ch >= prev, `${lv.id} 순서`);
    prev = ch;
  }
  for (const c of CHAPTERS) assert.ok(LEVELS.some(l => l.id.startsWith(c.n + '-')), `${c.n}장`);
});

for (const lv of LEVELS) {
  test(`${lv.id} ${lv.title}: 정답으로 깨지고 별 3개를 받는다`, () => {
    // 지도 모양
    const widths = new Set(lv.map.map(r => r.length));
    assert.equal(widths.size, 1, '줄 길이가 모두 같아야 해요');
    assert.ok(lv.map.length <= 8 && lv.map[0].length <= 9, '아이패드 화면에 맞는 크기');
    const starts = lv.map.join('').match(/[\^>v<]/g) || [];
    assert.equal(starts.length, 1, '출발점은 하나');
    const world = parseMap(lv.map);
    assert.ok(world.stars.length > 0 || world.flag, '별이나 깃발이 있어야 해요');
    assert.ok((lv.map.join('').match(/F/g) || []).length <= 1, '깃발은 하나까지');

    // 정답 돌려 보기
    const prog = parseProgram(lv.solution);
    const r = run(world, prog);
    assert.equal(r.reason, 'win', `정답이 안 풀려요: ${lv.solution} → ${r.reason}`);
    assert.equal(r.ok, true);

    // 블록 수 = 별 3개 기준
    const n = countBlocks(prog);
    assert.equal(n, lv.best, `정답 블록 수 ${n}, 적어 둔 best ${lv.best}`);
    assert.equal(starsFor(n, lv.best), 3);

    // 쓸 수 있는 블록만
    const { kinds, conds } = kindsUsed(prog);
    for (const k of kinds) {
      if (k === 'fnDef') { assert.ok(lv.blocks.includes('P'), '나만의 블록을 못 쓰는 판'); continue; }
      assert.ok(lv.blocks.includes(k), `${k} 블록은 이 판에서 못 써요`);
    }
    for (const c of conds) assert.ok((lv.conds || []).includes(c), `${c} 조건은 이 판에서 못 써요`);

    // 반복 횟수는 고를 수 있는 범위 안
    const walk = list => list.forEach(b => {
      if (b.k === 'rep') { assert.ok(b.n >= REPEAT_MIN && b.n <= REPEAT_MAX); walk(b.body); }
      if (b.k === 'if') { walk(b.then); walk(b.else); }
    });
    walk(prog.main); walk(prog.fn);

    // 힌트와 이름
    assert.ok(lv.title && lv.hint, '이름과 힌트');
  });
}

// 1장은 앞으로·돌기만 있으니 '블록 수 = 로봇이 한 일의 수'.
// 그래서 (자리, 방향, 주운 별) 상태로 너비 우선 탐색을 하면 진짜 최소 블록 수가 나온다.
function bfsMinActions(world) {
  const full = (1 << world.stars.length) - 1;
  const starAt = new Map(world.stars.map(([x, y], i) => [`${x},${y}`, i]));
  const key = s => `${s.x},${s.y},${s.d},${s.m}`;
  let frontier = [{ ...world.start, m: 0 }];
  const seen = new Set(frontier.map(key));
  for (let steps = 1; steps <= 60; steps++) {
    const next = [];
    for (const s of frontier) {
      const cands = [{ ...s, d: (s.d + 3) % 4 }, { ...s, d: (s.d + 1) % 4 }];
      const nx = s.x + DIRS[s.d][0], ny = s.y + DIRS[s.d][1];
      if (!isBlocked(world, nx, ny)) {
        const i = starAt.get(`${nx},${ny}`);
        const m = i == null ? s.m : s.m | (1 << i);
        const moved = { x: nx, y: ny, d: s.d, m };
        const onFlag = !world.flag || (nx === world.flag[0] && ny === world.flag[1]);
        if (m === full && onFlag) return steps;
        cands.push(moved);
      }
      for (const c of cands) { const k = key(c); if (!seen.has(k)) { seen.add(k); next.push(c); } }
    }
    frontier = next;
  }
  return Infinity;
}

for (const lv of LEVELS.filter(l => l.id.startsWith('1-'))) {
  test(`${lv.id}: 너비 우선 탐색 최소 걸음 = best`, () => {
    assert.equal(bfsMinActions(parseMap(lv.map)), lv.best);
  });
}

// 자동 풀이기: best-1개 이하로 푸는 프로그램이 정말 없는지 빠짐없이 찾아본다.
// (프로그램 수가 너무 많아지는 판은 시간이 오래 걸려서 tools/solver.mjs로 따로 돌려 본다)
const EXHAUSTIVE = LEVELS.filter(l => !l.id.startsWith('1-') && l.best - 1 <= 5 && !l.blocks.includes('P'));
for (const lv of EXHAUSTIVE) {
  test(`${lv.id}: 블록 ${lv.best - 1}개 이하로는 못 푼다 (자동 풀이기)`, () => {
    const r = solve(lv, { budget: lv.best - 1, maxStmt: 5, timeLimitMs: 60000 });
    assert.equal(r.found, false, r.found ? `더 짧은 답: ${r.text}` : '');
    assert.equal(r.complete, true, '시간 안에 다 찾아보지 못했어요');
  });
}
