// 명령 해석기 단위 시험: 로봇 움직임 · 반복 · 나만의 블록(함수) · 조건
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMap, run, parseProgram, formatProgram, countBlocks, starsFor, twoStarLimit,
  testCondition, isBlocked, kindsUsed, MAX_EVENTS,
} from '../js/engine.js';

const P = parseProgram;
// 가운데 넓은 마당: 로봇은 (1,1)에서 오른쪽을 본다
const OPEN = parseMap([
  '.....',
  '.>...',
  '.....',
  '.....',
]);

test('지도 읽기: 출발점·방향·별·깃발·막힌 칸', () => {
  const w = parseMap([
    '#*.~',
    'v.FT',
  ]);
  assert.equal(w.w, 4);
  assert.equal(w.h, 2);
  assert.deepEqual(w.start, { x: 0, y: 1, d: 2 });
  assert.deepEqual(w.stars, [[1, 0]]);
  assert.deepEqual(w.flag, [2, 1]);
  assert.ok(isBlocked(w, 0, 0));   // 바위
  assert.ok(isBlocked(w, 3, 0));   // 물
  assert.ok(isBlocked(w, 3, 1));   // 나무
  assert.ok(isBlocked(w, -1, 0));  // 지도 밖
  assert.ok(isBlocked(w, 0, 2));
  assert.ok(!isBlocked(w, 2, 1));  // 깃발 칸은 지나갈 수 있다
  assert.throws(() => parseMap(['...']), /출발점/);
});

test('앞으로: 보는 방향으로 한 칸씩 간다', () => {
  const r = run(OPEN, P('F F'));
  assert.equal(r.reason, 'notDone');
  assert.deepEqual([r.final.x, r.final.y, r.final.d], [3, 1, 1]);
  assert.deepEqual(r.events.map(e => e.kind), ['move', 'move']);
});

test('돌기: 왼쪽·오른쪽은 제자리에서 방향만 바꾼다', () => {
  assert.equal(run(OPEN, P('L')).final.d, 0);       // 오른쪽 → 위
  assert.equal(run(OPEN, P('R')).final.d, 2);       // 오른쪽 → 아래
  assert.equal(run(OPEN, P('L L')).final.d, 3);     // 뒤로 돌기
  assert.equal(run(OPEN, P('R R R R')).final.d, 1); // 한 바퀴
  const r = run(OPEN, P('L F'));
  assert.deepEqual([r.final.x, r.final.y], [1, 0]);
  assert.equal(r.events[0].turn, 'L');
});

test('벽이나 지도 밖으로 가면 쾅! 하고 멈춘다', () => {
  const w = parseMap(['>.#']);
  const r = run(w, P('F F F F'));
  assert.equal(r.reason, 'wall');
  assert.equal(r.ok, false);
  assert.deepEqual([r.final.x, r.final.y], [1, 0]);
  const last = r.events.at(-1);
  assert.equal(last.kind, 'bump');
  assert.deepEqual([last.tx, last.ty], [2, 0]);
  // 지도 밖
  assert.equal(run(parseMap(['.<.']), P('F F')).reason, 'wall');
});

test('별은 지나가면 줍고, 다 주우면 그 순간 성공한다', () => {
  const w = parseMap(['>*.*.']);
  const r = run(w, P('F F F F'));
  assert.equal(r.reason, 'win');
  assert.equal(r.final.got, 2);
  // 마지막 별을 주운 세 번째 앞으로에서 끝났으니 네 번째는 하지 않는다
  assert.equal(r.events.length, 3);
  assert.equal(r.events[0].star, 0);
  assert.equal(r.events[2].star, 1);
});

test('별과 깃발이 있으면 별을 다 줍고 깃발에 서야 성공', () => {
  const w = parseMap(['>F*']);
  const r1 = run(w, P('F'));
  assert.equal(r1.reason, 'notDone');
  assert.equal(r1.onFlag, true);
  assert.equal(r1.starsLeft, 1);
  const r2 = run(w, P('F F L L F'));
  assert.equal(r2.reason, 'win');
});

test('같은 별은 두 번 줍지 않는다', () => {
  const w = parseMap(['.*<F']);
  const r = run(w, P('F F L L F F F'));
  assert.equal(r.reason, 'win');
  assert.equal(r.final.got, 1);
  assert.equal(r.events.filter(e => e.star != null).length, 1);
});

test('반복: 안에 든 블록을 정한 횟수만큼', () => {
  const r = run(OPEN, P('3(F)'));
  assert.deepEqual([r.final.x, r.final.y], [4, 1]);
  assert.equal(r.events.length, 3);
  const sq = run(OPEN, P('4(F R)'));
  assert.deepEqual([sq.final.x, sq.final.y, sq.final.d], [1, 1, 1]); // 네모 한 바퀴
});

test('반복 안에 반복', () => {
  const r = run(OPEN, P('2(3(L) F)'));   // 왼쪽 세 번 = 오른쪽 한 번
  assert.deepEqual([r.final.x, r.final.y, r.final.d], [0, 2, 3]); // 아래로 한 칸, 왼쪽으로 한 칸
  assert.equal(r.events.filter(e => e.kind === 'turn').length, 6);
  assert.equal(r.events.filter(e => e.kind === 'move').length, 2);
});

test('반복 기록: 지금 몇 번째인지 블록 id로 알려 준다', () => {
  const prog = { main: [{ id: 'r', k: 'rep', n: 3, body: [{ id: 'f', k: 'R' }] }], fn: [] };
  const r = run(OPEN, prog);
  assert.deepEqual(r.events.map(e => e.loops.r), [1, 2, 3]);
  assert.deepEqual(r.events[0].stack, ['r', 'f']);
  assert.equal(r.events[0].id, 'f');
});

test('나만의 블록: 부르면 안에 넣은 블록을 한다', () => {
  const r = run(OPEN, P('P P / F L'));
  assert.deepEqual([r.final.x, r.final.y, r.final.d], [2, 0, 3]);
  // 반복 안에서 부르기, 나만의 블록 안의 반복
  const r2 = run(OPEN, P('2(P) / 2(F) R'));
  assert.equal(r2.events.filter(e => e.kind === 'move').length, 4);
  assert.deepEqual([r2.final.x, r2.final.y], [3, 3]);
  // 안이 비어 있으면 아무 일도 안 한다
  assert.equal(run(OPEN, P('P F')).events.length, 1);
});

test('나만의 블록 기록에는 부른 블록과 안쪽 블록 id가 함께 담긴다', () => {
  const prog = { main: [{ id: 'call', k: 'P' }], fn: [{ id: 'in', k: 'F' }] };
  const e = run(OPEN, prog).events[0];
  assert.deepEqual(e.stack, ['call', 'in']);
});

test('나만의 블록이 자기를 부르면 끝없이 돌지 않고 멈춘다', () => {
  const r = run(OPEN, P('P / L P'));
  assert.equal(r.reason, 'tooDeep');
});

test('너무 오래 걸리면 멈춘다', () => {
  const r = run(OPEN, P('20(20(20(L)))'));
  assert.equal(r.reason, 'tooLong');
  assert.equal(r.events.length, MAX_EVENTS);
});

test('블록이 하나도 없으면 empty', () => {
  assert.equal(run(OPEN, { main: [], fn: [] }).reason, 'empty');
});

test('조건: 앞이 막혔으면 / 뚫렸으면 / 왼쪽·오른쪽이 뚫렸으면', () => {
  const w = parseMap([
    '.#.',
    '#>#',
    '...',
  ]);
  const s = { ...w.start, got: new Set() };   // 오른쪽을 보고 있다
  assert.equal(testCondition(w, s, 'wall'), true);   // 앞(오른쪽) 바위
  assert.equal(testCondition(w, s, 'open'), false);
  assert.equal(testCondition(w, s, 'left'), false);  // 왼쪽(위) 바위
  assert.equal(testCondition(w, s, 'right'), true);  // 오른쪽(아래) 빈칸
  const down = { ...s, d: 2 };
  assert.equal(testCondition(w, down, 'open'), true);
  assert.equal(testCondition(w, down, 'left'), false); // 아래를 볼 때 왼쪽은 오른편 = 바위
  assert.equal(testCondition(w, down, 'right'), false);
});

test('만약 블록: 조건이 맞으면 첫 칸, 아니면 아니면 칸', () => {
  const w = parseMap(['>.#']);
  const r = run(w, P('3(?wall(L)(F))'));
  // 뚫림 → 앞으로, 바위 → 왼쪽(위), 지도 밖 → 또 왼쪽
  assert.deepEqual(r.events.map(e => e.kind), ['check', 'move', 'check', 'turn', 'check', 'turn']);
  assert.deepEqual(r.events.filter(e => e.kind === 'check').map(e => e.result), [false, true, true]);
  assert.deepEqual([r.final.x, r.final.y, r.final.d], [1, 0, 3]);
  // 아니면 칸을 비워 두면 아무것도 안 한다
  const r2 = run(w, P('?open(F)() ?open(F)() ?open(F)()'));
  assert.equal(r2.events.filter(e => e.kind === 'move').length, 1);
});

test('만약 + 반복으로 꼬불꼬불 길 따라가기', () => {
  const w = parseMap([
    '>..T',
    'TT.T',
    'TT.F',
  ]);
  const r = run(w, P('10(?wall(R)(F))'));
  assert.equal(r.reason, 'notDone'); // 마지막 모퉁이는 왼쪽이라 실패
  const r2 = run(w, P('10(?left(L)() ?right(R)() F)'));
  assert.equal(r2.reason, 'win');
});

test('블록 세기: 안에 든 블록과 나만의 블록 안까지 모두 센다', () => {
  assert.equal(countBlocks(P('F L R')), 3);
  assert.equal(countBlocks(P('3(F L)')), 3);
  assert.equal(countBlocks(P('2(3(F) R)')), 4);
  assert.equal(countBlocks(P('?wall(R)(F F)')), 4);
  assert.equal(countBlocks(P('P P / 2(F)')), 4);
  assert.equal(countBlocks({ main: [], fn: [] }), 0);
});

test('별 매기기: best 이하 3개, 조금 넘으면 2개, 그 밖엔 1개', () => {
  assert.equal(starsFor(4, 5), 3);
  assert.equal(starsFor(5, 5), 3);
  assert.equal(starsFor(7, 5), 2);
  assert.equal(starsFor(8, 5), 1);
  assert.equal(twoStarLimit(10), 13);
  assert.equal(starsFor(13, 10), 2);
  assert.equal(starsFor(14, 10), 1);
});

test('짧은 글 ↔ 프로그램', () => {
  const text = '2(F ?wall(R)(F L)) P / 3(F) L';
  const p = P(text);
  assert.equal(formatProgram(p), text);
  assert.equal(p.main[0].k, 'rep');
  assert.equal(p.main[0].body[1].c, 'wall');
  assert.deepEqual(P('?left(L)').main[0].else, []);
  assert.throws(() => P('3(F'), /\)/);
  assert.throws(() => P('X'), /모르는/);
  assert.throws(() => P('?wobble(F)'), /조건/);
});

test('쓰인 블록 종류 찾기', () => {
  const { kinds, conds } = kindsUsed(P('2(?right(R)()) P / F'));
  assert.deepEqual([...kinds].sort(), ['F', 'P', 'R', 'fnDef', 'if', 'rep']);
  assert.deepEqual([...conds], ['right']);
});

test('중간 상태에서 이어서 돌리기(from)', () => {
  const r = run(OPEN, P('F'), { from: { x: 0, y: 3, d: 0, got: new Set() } });
  assert.deepEqual([r.final.x, r.final.y], [0, 2]);
});
