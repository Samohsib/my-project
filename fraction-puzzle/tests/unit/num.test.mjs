// 화면 글자·한국어 읽기·조사 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, D, val, text, say, josa, jo, koInt, fracKind, totalNum } from '../../js/num.js';
import { Q, eq } from '../../js/rational.js';

test('수 모양 그대로 글자로', () => {
  assert.equal(text(F(0, 3, 4)), '3/4');
  assert.equal(text(F(2, 1, 3)), '2 1/3');
  assert.equal(text(F(3, 0, 5)), '3');
  assert.equal(text(F(0, 6, 8)), '6/8');
  assert.equal(text(D(37, 2)), '0.37');
  assert.equal(text(D(30, 2)), '0.30');
  assert.equal(text(D(5, 1)), '0.5');
  assert.equal(text(D(105, 2)), '1.05');
});

test('값', () => {
  assert.ok(eq(val(F(2, 3, 4)), Q(11, 4)));
  assert.ok(eq(val(D(30, 2)), val(D(3, 1))));
  assert.equal(totalNum(F(2, 3, 4)), 11);
});

test('분수 이름', () => {
  assert.equal(fracKind(F(0, 3, 4)), '진분수');
  assert.equal(fracKind(F(0, 7, 4)), '가분수');
  assert.equal(fracKind(F(0, 4, 4)), '가분수');
  assert.equal(fracKind(F(1, 3, 4)), '대분수');
  assert.equal(fracKind(F(2, 0, 4)), '자연수');
});

test('한자어 수 읽기', () => {
  const cases = { 0: '영', 1: '일', 10: '십', 11: '십일', 20: '이십', 100: '백', 105: '백오', 1234: '천이백삼십사' };
  for (const [n, s] of Object.entries(cases)) assert.equal(koInt(Number(n)), s);
});

test('분수·소수 읽기', () => {
  assert.equal(say(F(0, 3, 4)), '사 분의 삼');
  assert.equal(say(F(1, 2, 5)), '일과 오 분의 이');
  assert.equal(say(F(2, 1, 3)), '이와 삼 분의 일');
  assert.equal(say(D(37, 2)), '영 점 삼칠');
  assert.equal(say(D(105, 2)), '일 점 영오');
  assert.equal(say(D(5, 1)), '영 점 오');
  assert.equal(say(7), '칠');
});

test('받침에 맞는 조사', () => {
  assert.equal(josa('삼', '은/는'), '은');
  assert.equal(josa('사', '은/는'), '는');
  assert.equal(josa('일', '으로/로'), '로');
  assert.equal(josa('삼', '으로/로'), '으로');
  assert.equal(josa('오', '이에요/예요'), '예요');
  assert.equal(jo(F(0, 3, 4), '이/가'), '이'); // 사 분의 삼이
  assert.equal(jo(F(0, 2, 5), '이/가'), '가'); // 오 분의 이가
  assert.equal(jo(D(5, 1), '은/는'), '는'); // 영 점 오는
  assert.equal(jo(D(1, 1), '이에요/예요'), '이에요'); // 영 점 일이에요
  assert.equal(jo(4, '이니까/니까'), '니까');
});
