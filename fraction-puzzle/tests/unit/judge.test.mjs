// 판정 함수 시험: 아이가 자주 하는 실수를 제대로 알아보는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, solve, readFrac } from '../../js/judge.js';
import { explain, plainOf } from '../../js/text.js';
import { F, D } from '../../js/num.js';
import { Q } from '../../js/rational.js';

const pizza = (n, d, extra = {}) => ({ kind: 'make', model: 'pizza', target: F(0, n, d), units: 1, cells: null, ...extra });
const big = (target, write) => ({ kind: 'make', model: 'pizza', target, units: 4, cells: target.d, write });
const fop = (op, a, b, units = 4) => ({ kind: 'op', model: 'bar', op, a, b, units, cells: a.d, answerType: 'frac' });
const dop = (op, a, b, units = 2) => ({ kind: 'op', model: 'grid100', op, a, b, units, cells: 100, answerType: 'dec' });
const fr = (w, n, d) => ({ w, n, d });
const reason = (p, res) => judge(p, res).reason;
const says = (p, res) => explain(p, res, judge(p, res)).map(plainOf).join(' / ');

// ---- 피자 나누고 칠하기 ----
test('피자 3/4: 4조각으로 나누고 3조각 칠하면 정답', () => {
  assert.equal(judge(pizza(3, 4), { cuts: 4, painted: 3 }).ok, true);
});
test('피자 3/4: 8조각에 6조각은 크기는 같지만 분모가 달라 다시', () => {
  const r = judge(pizza(3, 4), { cuts: 8, painted: 6 });
  assert.equal(r.reason, 'cuts');
  assert.equal(r.same, true);
  assert.match(says(pizza(3, 4), { cuts: 8, painted: 6 }), /크기는 같아요/);
});
test('피자 3/4: 3조각으로 나누면 분모 설명', () => {
  const r = judge(pizza(3, 4), { cuts: 3, painted: 3 });
  assert.equal(r.reason, 'cuts');
  assert.equal(r.same, false);
  assert.match(says(pizza(3, 4), { cuts: 3, painted: 3 }), /4조각으로 똑같이 나눈다는 뜻/);
});
test('피자 3/4: 칠한 조각 수가 틀리면 count', () => {
  assert.equal(reason(pizza(3, 4), { cuts: 4, painted: 2 }), 'count');
  assert.equal(reason(pizza(3, 4), { cuts: 4, painted: 4 }), 'count');
  assert.equal(reason(pizza(3, 4), { cuts: 4, painted: 0 }), 'count');
});
test('남은 피자 문제는 남은 조각 수 설명', () => {
  const p = pizza(3, 8, { story: 'rest', eaten: F(0, 5, 8) });
  assert.match(says(p, { cuts: 8, painted: 5 }), /8 − 5 = 3/);
});
test('나누지 않은 피자(1조각)도 안전하게 판정', () => {
  assert.equal(reason(pizza(1, 2), { cuts: 1, painted: 1 }), 'cuts');
  assert.equal(reason(pizza(1, 2), { cuts: 1, painted: 0 }), 'cuts');
});

// ---- 가분수·대분수 ----
test('11/4 → 대분수 2 3/4', () => {
  const p = big(F(0, 11, 4), 'mixed');
  const ok = { cuts: 4, painted: 11 };
  assert.equal(judge(p, { ...ok, answer: fr(2, 3, 4) }).ok, true);
  assert.equal(reason(p, { ...ok, answer: fr(null, 11, 4) }), 'form');
  assert.equal(reason(p, { ...ok, answer: fr(1, 7, 4) }), 'form');
  assert.equal(reason(p, { ...ok, answer: fr(2, 6, 8) }), 'denom');
  assert.equal(reason(p, { ...ok, answer: fr(3, 3, 4) }), 'value');
  assert.equal(reason(p, { ...ok, answer: fr(2, 3, null) }), 'half');
  assert.equal(reason(p, { ...ok, answer: fr(2, 3, 0) }), 'zero');
  assert.equal(reason(p, { ...ok, answer: fr(null, null, null) }), 'empty');
  assert.equal(reason(p, { cuts: 4, painted: 10, answer: fr(2, 3, 4) }), 'count');
});
test('8/4 → 자연수 2 (2 0/4나 가분수는 다시)', () => {
  const p = big(F(0, 8, 4), 'mixed');
  const ok = { cuts: 4, painted: 8 };
  assert.equal(judge(p, { ...ok, answer: fr(2, null, null) }).ok, true);
  assert.equal(reason(p, { ...ok, answer: fr(null, 8, 4) }), 'form');
  assert.equal(reason(p, { ...ok, answer: fr(2, 0, 4) }), 'form');
  assert.match(says(p, { ...ok, answer: fr(null, 8, 4) }), /자연수 2로/);
});
test('2 3/4 → 가분수 11/4', () => {
  const p = big(F(2, 3, 4), 'improper');
  const ok = { cuts: 4, painted: 11 };
  assert.equal(judge(p, { ...ok, answer: fr(null, 11, 4) }).ok, true);
  assert.equal(judge(p, { ...ok, answer: fr(0, 11, 4) }).ok, true, '자연수 칸의 0은 빈칸과 같다');
  assert.equal(reason(p, { ...ok, answer: fr(2, 3, 4) }), 'form');
  assert.equal(reason(p, { ...ok, answer: fr(null, 22, 8) }), 'denom');
  assert.equal(reason(p, { ...ok, answer: fr(null, 10, 4) }), 'value');
  assert.match(says(p, { ...ok, answer: fr(null, 10, 4) }), /2판 × 4조각 \+ 3조각 = 11조각/);
});

// ---- 분수 덧셈·뺄셈 ----
test('2/7 + 3/7 = 5/7, 분모끼리 더한 5/14는 따로 알려 준다', () => {
  const p = fop('+', F(0, 2, 7), F(0, 3, 7), 1);
  assert.equal(judge(p, { marked: 3, answer: fr(null, 5, 7) }).ok, true);
  assert.equal(reason(p, { marked: 3, answer: fr(null, 5, 14) }), 'denoms');
  assert.match(says(p, { marked: 3, answer: fr(null, 5, 14) }), /분모끼리는 더하지 않아요/);
  assert.equal(reason(p, { marked: 2, answer: fr(null, 5, 7) }), 'mark');
});
test('3/5 + 4/5 = 7/5 = 1 2/5 (둘 다 정답), 1 5/5 같은 모양은 받아올림 안내', () => {
  const p = fop('+', F(0, 3, 5), F(0, 4, 5), 2);
  assert.equal(judge(p, { marked: 4, answer: fr(null, 7, 5) }).ok, true);
  assert.equal(judge(p, { marked: 4, answer: fr(1, 2, 5) }).ok, true);
  const q = fop('+', F(1, 3, 5), F(1, 4, 5), 4);
  assert.equal(judge(q, { marked: 9, answer: fr(3, 2, 5) }).ok, true);
  assert.equal(reason(q, { marked: 9, answer: fr(2, 7, 5) }), 'form');
});
test('대분수 덧셈에서 분모끼리 더한 실수 (1 3/5 + 1 4/5 → 2 7/10)', () => {
  const q = fop('+', F(1, 3, 5), F(1, 4, 5), 4);
  assert.equal(reason(q, { marked: 9, answer: fr(2, 7, 10) }), 'denoms');
});
test('3 1/5 − 1 3/5 = 1 3/5, 거꾸로 뺀 2 2/5는 받아내림 안내', () => {
  const p = fop('-', F(3, 1, 5), F(1, 3, 5));
  assert.equal(judge(p, { marked: 8, answer: fr(1, 3, 5) }).ok, true);
  assert.equal(judge(p, { marked: 8, answer: fr(null, 8, 5) }).ok, true);
  assert.equal(reason(p, { marked: 8, answer: fr(2, 2, 5) }), 'borrow');
  assert.match(says(p, { marked: 8, answer: fr(2, 2, 5) }), /1을 빌려 와요/);
});
test('자연수 − 대분수: 3 − 1 2/5 = 1 3/5', () => {
  const p = fop('-', F(3, 0, 5), F(1, 2, 5), 3);
  assert.equal(judge(p, { marked: 7, answer: fr(1, 3, 5) }).ok, true);
  assert.equal(reason(p, { marked: 7, answer: fr(2, 2, 5) }), 'borrow');
});
test('1 − 2/5 = 3/5', () => {
  const p = fop('-', F(1, 0, 5), F(0, 2, 5), 1);
  assert.deepEqual(solve(p), { marked: 2, answer: fr(null, 3, 5) });
  assert.equal(judge(p, { marked: 2, answer: fr(null, 3, 5) }).ok, true);
});
test('분모가 바뀐 답은 denom 안내', () => {
  const p = fop('+', F(0, 1, 6), F(0, 2, 6), 1);
  assert.equal(reason(p, { marked: 2, answer: fr(null, 3, 7) }), 'denom');
  assert.equal(judge(p, { marked: 2, answer: fr(null, 3, 6) }).ok, true);
  assert.equal(judge(p, { marked: 2, answer: fr(null, 1, 2) }).ok, true, '약분한 답도 크기가 같으면 정답');
});

// ---- 분수 크기 비교 ----
test('크기 비교: 같은 분모·단위분수·가분수와 대분수', () => {
  const cmpP = (a, b, units = 1) => ({ kind: 'compare', model: 'bar', a, b, units, cellsA: a.d, cellsB: b.d });
  const p1 = cmpP(F(0, 3, 7), F(0, 5, 7));
  assert.equal(judge(p1, { paintA: 3, paintB: 5, sign: '<' }).ok, true);
  assert.equal(judge(p1, { paintA: 3, paintB: 5, sign: '>' }).why, 'sameD');
  const p2 = cmpP(F(0, 1, 5), F(0, 1, 2));
  assert.equal(judge(p2, { paintA: 1, paintB: 1, sign: '<' }).ok, true);
  assert.equal(judge(p2, { paintA: 1, paintB: 1, sign: '>' }).why, 'unit');
  const p3 = cmpP(F(0, 7, 4), F(1, 3, 4), 2);
  assert.equal(judge(p3, { paintA: 7, paintB: 7, sign: '=' }).ok, true);
  assert.equal(judge(p3, { paintA: 7, paintB: 7, sign: '<' }).why, 'cross');
  assert.equal(judge(p3, { paintA: 6, paintB: 7, sign: '=' }).reason, 'paint');
});

// ---- 소수 ----
test('소수 크기 비교: 0.5 > 0.48 (자릿수 함정), 0.3 = 0.30', () => {
  const cmpD = (a, b) => ({ kind: 'compare', model: 'grid100', a, b, units: 1, cellsA: 100, cellsB: 100 });
  const p = cmpD(D(5, 1), D(48, 2));
  assert.equal(judge(p, { paintA: 50, paintB: 48, sign: '>' }).ok, true);
  const r = judge(p, { paintA: 50, paintB: 48, sign: '<' });
  assert.equal(r.why, 'places');
  assert.match(says(p, { paintA: 50, paintB: 48, sign: '<' }), /0\.5는 0\.50과 같아요/);
  const q = cmpD(D(3, 1), D(30, 2));
  assert.equal(judge(q, { paintA: 30, paintB: 30, sign: '=' }).ok, true);
  assert.equal(judge(q, { paintA: 3, paintB: 30, sign: '=' }).reason, 'paint');
});
test('모눈 칠하기: 0.4를 4칸만 칠하거나 0.07을 70칸 칠하면 자리값 안내', () => {
  const p = { kind: 'make', model: 'grid100', target: D(4, 1), units: 1, cells: 100 };
  assert.equal(judge(p, { cuts: 100, painted: 40 }).ok, true);
  assert.equal(judge(p, { cuts: 100, painted: 4 }).place, 'small');
  assert.match(says(p, { cuts: 100, painted: 4 }), /4줄, 40칸/);
  const q = { kind: 'make', model: 'grid100', target: D(7, 2), units: 1, cells: 100 };
  assert.equal(judge(q, { cuts: 100, painted: 70 }).place, 'big');
});
test('분수 ↔ 소수로 쓰기', () => {
  const toDec = { kind: 'make', model: 'grid100', target: F(0, 37, 100), units: 1, cells: 100, write: 'dec' };
  assert.equal(judge(toDec, { cuts: 100, painted: 37, answer: '0.37' }).ok, true);
  assert.equal(judge(toDec, { cuts: 100, painted: 37, answer: '.37' }).ok, true);
  assert.equal(judge(toDec, { cuts: 100, painted: 37, answer: '3.7' }).place, true);
  assert.equal(reason(toDec, { cuts: 100, painted: 37, answer: '' }), 'empty');
  const toFrac = { kind: 'make', model: 'grid100', target: D(125, 2), units: 2, cells: 100, write: 'frac' };
  assert.equal(judge(toFrac, { cuts: 100, painted: 125, answer: fr(1, 25, 100) }).ok, true);
  assert.equal(judge(toFrac, { cuts: 100, painted: 125, answer: fr(null, 125, 100) }).ok, true);
  assert.equal(reason(toFrac, { cuts: 100, painted: 125, answer: fr(1, 25, 10) }), 'value');
});
test('소수 덧셈: 0.1 + 0.2 = 0.3 (부동소수 오차 없음)', () => {
  const p = { kind: 'op', model: 'bar10', op: '+', a: D(1, 1), b: D(2, 1), units: 1, cells: 10, answerType: 'dec' };
  assert.equal(judge(p, { marked: 2, answer: '0.3' }).ok, true);
  assert.equal(judge(p, { marked: 2, answer: '0.30' }).ok, true);
  assert.equal(judge(p, { marked: 2, answer: '0.30000000000000004' }).ok, false);
});
test('소수 덧셈: 0.5 + 0.27 = 0.77, 끝자리끼리 더한 0.32는 소수점 맞추기 안내', () => {
  const p = dop('+', D(5, 1), D(27, 2), 1);
  assert.equal(judge(p, { marked: 27, answer: '0.77' }).ok, true);
  assert.equal(reason(p, { marked: 27, answer: '0.32' }), 'align');
  assert.match(says(p, { marked: 27, answer: '0.32' }), /소수점끼리 줄을 맞춰서/);
  assert.equal(reason(p, { marked: 27, answer: '0.7' }), 'value');
});
test('소수 받아올림·받아내림: 0.68 + 0.57 = 1.25, 1.23 − 0.58 = 0.65', () => {
  const p = dop('+', D(68, 2), D(57, 2));
  assert.equal(solve(p).answer, '1.25');
  assert.equal(judge(p, { marked: 57, answer: '1.25' }).ok, true);
  assert.equal(reason(p, { marked: 57, answer: '0.125' }), 'value');
  const q = dop('-', D(123, 2), D(58, 2));
  assert.equal(solve(q).answer, '0.65');
  assert.equal(judge(q, { marked: 58, answer: '0.65' }).ok, true);
  assert.equal(reason(q, { marked: 57, answer: '0.65' }), 'mark');
});

// ---- 수직선 ----
test('수직선 깃발: 3/10은 0.1 눈금 3번째, 한 칸 차이면 다시 세기 안내', () => {
  const p = { kind: 'line-place', line: { start: Q(0), step: Q(1, 10), count: 10 }, labels: [{ k: 0, num: F(0, 0, 1) }, { k: 10, num: F(1, 0, 1) }], target: F(0, 3, 10) };
  assert.equal(judge(p, { tick: 3 }).ok, true);
  assert.equal(reason(p, { tick: 4 }), 'position');
  assert.match(says(p, { tick: 4 }), /한 칸 차이예요/);
  assert.match(says(p, { tick: 4 }), /3\/10 = 0\.3/);
});
test('수직선 카드: 모두 놓아야 하고, 바뀐 카드를 알려 준다', () => {
  const p = {
    kind: 'line-cards', line: { start: Q(0), step: Q(1, 10), count: 10 }, labels: [], points: [2, 7],
    cards: [{ id: 0, num: F(0, 2, 10) }, { id: 1, num: D(7, 1) }, { id: 2, num: F(0, 7, 10) }, { id: 3, num: D(2, 1) }],
  };
  assert.equal(judge(p, { place: { 0: 0, 1: 1, 2: 1, 3: 0 } }).ok, true);
  assert.equal(reason(p, { place: { 0: 0, 1: 1, 2: 1 } }), 'unplaced');
  assert.deepEqual(judge(p, { place: { 0: 1, 1: 1, 2: 0, 3: 0 } }).ids, [0, 2]);
});

// ---- 답 칸 읽기 ----
test('답 칸 읽기', () => {
  assert.deepEqual(readFrac(fr(2, null, null)).q, Q(2));
  assert.deepEqual(readFrac(fr(null, 3, 4)).q, Q(3, 4));
  assert.deepEqual(readFrac(fr(1, 1, 2)).q, Q(3, 2));
  assert.equal(readFrac(fr(null, null, null)).err, 'empty');
  assert.equal(readFrac(null).err, 'empty');
  assert.equal(readFrac(fr(null, 3, null)).err, 'half');
  assert.equal(readFrac(fr(1, 3, 0)).err, 'zero');
});
