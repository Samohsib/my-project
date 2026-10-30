// 맞히기 판정 단위 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './helpers.mjs';
import { project } from '../js/geo.js';
import { regionAt, nearestTarget, nearestLine, hitTest, judge, hintLevel, tolInMapUnits } from '../js/judge.js';
import { buildCatalog, questionsForStage } from '../js/quiz.js';

const cat = buildCatalog(loadAll());
const layers = {
  regions: cat.regions.map((r) => ({ code: r.code, geometry: r.geometry })),
  cities: cat.cities.map((c) => ({ id: c.id, xy: project(c.ll) })),
  mountains: cat.mountains.map((m) => ({ id: m.id, xy: project(m.ll) })),
  rivers: cat.rivers.map((r) => ({ id: r.id, xys: r.lines.map((l) => l.map(project)) })),
};
// 아이패드 가로 화면, 확대 안 한 상태의 손가락 허용 거리 (22px, 지도 1단위 ≈ 0.7px)
const TOL = tolInMapUnits(22, 0.7, 1);

test('tolInMapUnits: 확대할수록 지도 단위 허용 거리가 줄어든다', () => {
  assert.equal(tolInMapUnits(22, 1, 1), 22);
  assert.equal(tolInMapUnits(22, 1, 2), 11);
  assert.ok(Math.abs(TOL - 31.43) < 0.01);
});

test('regionAt: 각 시·도 안쪽 점을 누르면 그 시·도', () => {
  for (const r of cat.regions) {
    assert.equal(regionAt(project(r.label), layers.regions, 0), r.code, r.name);
  }
});

test('regionAt: 먼 바다는 아무것도 아니고, 해안 바로 앞 바다는 가까운 시·도로 친다', () => {
  assert.equal(regionAt(project([125.0, 33.6]), layers.regions, TOL), null, '제주 서쪽 먼 바다');
  assert.equal(regionAt(project([130.5, 35.0]), layers.regions, TOL), null, '대한해협 먼 바다');
  // 부산 해운대 앞바다 (해안선에서 1km 남짓)
  assert.equal(regionAt(project([129.17, 35.145]), layers.regions, TOL), '26');
  // 허용 거리 0 이면 바다는 그냥 바다
  assert.equal(regionAt(project([129.17, 35.145]), layers.regions, 0), null);
});

test('regionAt: 아주 작은 독도 표시를 눌러도 경상북도', () => {
  assert.equal(regionAt(project([131.8667, 37.2417]), layers.regions, TOL), '47');
  // 독도 동그라미 표시 가장자리쯤 (9px 바깥)
  const [x, y] = project([131.8667, 37.2417]);
  assert.equal(regionAt([x + 9 / 0.7, y], layers.regions, TOL), '47');
});

test('nearestTarget: 허용 거리 안에서 가장 가까운 점, 밖이면 null', () => {
  const ts = [{ id: 'a', xy: [0, 0] }, { id: 'b', xy: [10, 0] }];
  assert.equal(nearestTarget([3, 0], ts, 5), 'a');
  assert.equal(nearestTarget([6, 0], ts, 5), 'b');
  assert.equal(nearestTarget([30, 0], ts, 5), null);
  assert.equal(nearestTarget([3, 0], [], 5), null);
});

test('nearestLine: 강줄기 가까이를 누르면 그 강', () => {
  const lines = [{ id: 'r1', xys: [[[0, 0], [100, 0]]] }, { id: 'r2', xys: [[[0, 50], [100, 50]]] }];
  assert.equal(nearestLine([50, 4], lines, 10), 'r1');
  assert.equal(nearestLine([50, 44], lines, 10), 'r2');
  assert.equal(nearestLine([50, 25], lines, 10), null);
});

test('hitTest: 문제 종류에 따라 다른 층을 본다', () => {
  const seoul = project(cat.byCode['11'].label);
  assert.equal(hitTest('region', seoul, layers, TOL), '11');
  const andong = project(cat.cities.find((c) => c.id === 'andong').ll);
  assert.equal(hitTest('city', andong, layers, TOL), 'andong');
  const halla = project(cat.mountains.find((m) => m.id === 'hallasan').ll);
  assert.equal(hitTest('nature', halla, layers, TOL), 'hallasan');
  assert.throws(() => hitTest('모름', seoul, layers, TOL));
});

test('judge: 맞음 / 틀림 / 아무것도 아님', () => {
  const q = { accept: ['47'] };
  assert.equal(judge(q, '47'), 'correct');
  assert.equal(judge(q, '48'), 'wrong');
  assert.equal(judge(q, null), 'none');
  assert.equal(judge(q, undefined), 'none');
  // 답이 여럿인 문제
  const multi = { accept: ['gwangju', 'muan', 'suncheon'] };
  assert.equal(judge(multi, 'muan'), 'correct');
  assert.equal(judge(multi, 'mokpo'), 'wrong');
});

test('hintLevel: 틀린 횟수에 따라 0~3 단계', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 10].map(hintLevel), [0, 1, 2, 3, 3, 3]);
});

test('1단계 모든 문제: 답 시·도를 누르면 맞음, 다른 시·도를 누르면 틀림', () => {
  for (const q of questionsForStage(1, cat)) {
    const right = hitTest(q.mode, project(cat.byCode[q.answer].label), layers, TOL);
    assert.equal(judge(q, right), 'correct', q.key);
    const otherCode = q.answer === '41' ? '51' : '41';
    const wrong = hitTest(q.mode, project(cat.byCode[otherCode].label), layers, TOL);
    assert.equal(judge(q, wrong), 'wrong', q.key);
  }
});

test('2단계 모든 문제: 도시 점을 (조금 빗나가게) 눌러도 맞음', () => {
  for (const q of questionsForStage(2, cat)) {
    const c = cat.cities.find((x) => x.id === q.answer);
    const [x, y] = project(c.ll);
    assert.equal(judge(q, hitTest(q.mode, [x + 3, y - 2], layers, TOL)), 'correct', q.key);
  }
});

test('3단계 모든 문제: 명소·특산물 자리를 누르면 그 시·도로 맞음', () => {
  for (const q of questionsForStage(3, cat)) {
    assert.equal(judge(q, hitTest(q.mode, project(q.pin), layers, TOL)), 'correct', q.key);
  }
});

test('4단계 모든 문제: 산 표시와 강줄기를 누르면 맞음', () => {
  for (const q of questionsForStage(4, cat)) {
    if (q.kind === '산') {
      const m = cat.mountains.find((x) => x.id === q.answer);
      assert.equal(judge(q, hitTest(q.mode, project(m.ll), layers, TOL)), 'correct', q.key);
    } else {
      // 산 표시와 겹치지 않는 강줄기 점을 하나 골라 누른다
      const river = layers.rivers.find((r) => r.id === q.answer);
      const pts = river.xys.flat();
      const free = pts.find((p) => nearestTarget(p, layers.mountains, TOL) == null
        && layers.rivers.every((o) => o.id === q.answer || o.xys.every((l) => l.every((v) => Math.hypot(v[0] - p[0], v[1] - p[1]) > TOL))));
      assert.ok(free, `${q.key}: 누를 수 있는 강줄기 점이 없음`);
      assert.equal(judge(q, hitTest(q.mode, free, layers, TOL)), 'correct', q.key);
    }
  }
});
