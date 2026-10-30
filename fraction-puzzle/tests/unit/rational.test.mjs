// 유리수 계산 시험: 부동소수 오차 없이 정확한지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Q, gcd, add, sub, mul, div, cmp, eq, fromMixed, toMixed, parseDecimal, toDecimalString, countOf } from '../../js/rational.js';
import { makeRng } from '../../js/rng.js';

test('gcd', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(-4, 6), 2);
  assert.equal(gcd(0, 5), 5);
  assert.equal(gcd(7, 13), 1);
});

test('Q는 기약분수로 정리하고 분모를 양수로 둔다', () => {
  assert.deepEqual(Q(6, 8), { n: 3, d: 4 });
  assert.deepEqual(Q(3, -6), { n: -1, d: 2 });
  assert.deepEqual(Q(0, 5), { n: 0, d: 1 });
  assert.deepEqual(Q(10, 10), { n: 1, d: 1 });
});

test('분모 0과 정수가 아닌 값은 거부한다', () => {
  assert.throws(() => Q(1, 0), RangeError);
  assert.throws(() => Q(0.5, 2), TypeError);
  assert.throws(() => Q(1, 0.1), TypeError);
  assert.throws(() => div(Q(1), Q(0)), RangeError);
});

test('0.1 + 0.2 = 0.3 이 정확히 맞는다 (부동소수와 다름)', () => {
  assert.notEqual(0.1 + 0.2, 0.3); // 부동소수는 틀린다
  assert.ok(eq(add(parseDecimal('0.1'), parseDecimal('0.2')), parseDecimal('0.3')));
  assert.equal(toDecimalString(add(parseDecimal('0.1'), parseDecimal('0.2'))), '0.3');
  assert.equal(toDecimalString(sub(parseDecimal('1.1'), parseDecimal('0.97'))), '0.13');
  assert.equal(toDecimalString(add(parseDecimal('2.58'), parseDecimal('1.36'))), '3.94');
});

test('분수 덧셈·뺄셈·곱셈·나눗셈', () => {
  assert.deepEqual(add(Q(2, 7), Q(3, 7)), Q(5, 7));
  assert.deepEqual(add(Q(3, 5), Q(4, 5)), Q(7, 5));
  assert.deepEqual(sub(Q(1), Q(2, 5)), Q(3, 5));
  assert.deepEqual(mul(Q(2, 3), Q(3, 4)), Q(1, 2));
  assert.deepEqual(div(Q(3, 10), Q(1, 100)), Q(30));
});

test('cmp: 크기 비교', () => {
  assert.equal(cmp(Q(1, 2), Q(1, 3)), 1);
  assert.equal(cmp(Q(1, 5), Q(1, 2)), -1);
  assert.equal(cmp(Q(7, 4), fromMixed(1, 3, 4)), 0);
  assert.equal(cmp(parseDecimal('0.5'), parseDecimal('0.48')), 1);
  assert.equal(cmp(parseDecimal('0.3'), parseDecimal('0.30')), 0);
});

test('대분수 ↔ 가분수', () => {
  assert.deepEqual(fromMixed(2, 3, 4), Q(11, 4));
  assert.deepEqual(toMixed(Q(11, 4), 4), { w: 2, n: 3, d: 4 });
  assert.deepEqual(toMixed(Q(2), 4), { w: 2, n: 0, d: 4 });
  assert.deepEqual(toMixed(Q(1, 2), 8), { w: 0, n: 4, d: 8 });
  assert.equal(toMixed(Q(1, 3), 4), null);
});

test('소수 글자 읽기', () => {
  assert.deepEqual(parseDecimal('1.25'), Q(5, 4));
  assert.deepEqual(parseDecimal('.5'), Q(1, 2));
  assert.deepEqual(parseDecimal('3.'), Q(3));
  assert.deepEqual(parseDecimal('0.50'), Q(1, 2));
  assert.deepEqual(parseDecimal('007'), Q(7));
  for (const bad of ['', '.', '1.2.3', 'abc', '-1', '1,5', ' ', null, undefined, '1e2']) {
    assert.equal(parseDecimal(bad), null, `거부해야 함: ${bad}`);
  }
});

test('소수 글자 쓰기', () => {
  assert.equal(toDecimalString(Q(37, 100)), '0.37');
  assert.equal(toDecimalString(Q(3, 10)), '0.3');
  assert.equal(toDecimalString(Q(3, 10), 2), '0.30');
  assert.equal(toDecimalString(Q(105, 100)), '1.05');
  assert.equal(toDecimalString(Q(2)), '2');
  assert.equal(toDecimalString(Q(1, 4)), '0.25');
  assert.equal(toDecimalString(Q(1, 3)), null);
  assert.equal(toDecimalString(Q(37, 100), 1), null);
});

test('소수 0.00~20.00 모두 글자 ↔ 유리수가 되돌아온다', () => {
  for (let i = 0; i <= 2000; i++) {
    const s = toDecimalString(Q(i, 100), 2);
    assert.deepEqual(parseDecimal(s), Q(i, 100));
    assert.equal(s, `${Math.floor(i / 100)}.${String(i % 100).padStart(2, '0')}`);
  }
});

test('칸 수 세기 (countOf)', () => {
  assert.equal(countOf(Q(3, 4), 4), 3);
  assert.equal(countOf(Q(3, 4), 8), 6);
  assert.equal(countOf(Q(3, 4), 6), null);
  assert.equal(countOf(parseDecimal('1.37'), 100), 137);
  assert.equal(countOf(parseDecimal('0.4'), 100), 40);
});

test('무작위 분수 1000쌍: 덧셈 뒤 빼면 제자리, 비교는 반대칭', () => {
  const r = makeRng(2024);
  for (let k = 0; k < 1000; k++) {
    const a = Q(r.int(0, 300), r.int(1, 100));
    const b = Q(r.int(0, 300), r.int(1, 100));
    assert.ok(eq(sub(add(a, b), b), a));
    assert.equal(cmp(a, b) + cmp(b, a), 0);
    assert.equal(cmp(add(a, b), a) >= 0, true);
    const m = toMixed(a, a.d * 3);
    assert.ok(eq(fromMixed(m.w, m.n, m.d), a));
  }
});
