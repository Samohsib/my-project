// 문제 만들기·저장 단위 시험
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './helpers.mjs';
import { STAGES, buildCatalog, questionsForStage, makeRound, stageProgress, bookPages, josa, hasBatchim, neighborsOf, ROUND_SIZE } from '../js/quiz.js';
import { createStore, STORE_KEY } from '../js/store.js';

const data = loadAll();
const cat = buildCatalog(data);

// 시험용으로 늘 같은 순서를 내는 난수
function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test('조사: 받침에 따라 을/를, 은/는, 이에요/예요', () => {
  assert.equal(josa('경복궁', '을/를'), '경복궁을');
  assert.equal(josa('서울특별시', '을/를'), '서울특별시를');
  assert.equal(josa('한강', '은/는'), '한강은');
  assert.equal(josa('제주도', '은/는'), '제주도는');
  assert.equal(josa('충청북도', '이에요/예요'), '충청북도예요');
  assert.equal(josa('지리산', '이에요/예요'), '지리산이에요');
  assert.equal(hasBatchim('ABC'), false);
});

test('단계마다 문제 수와 모양이 맞다', () => {
  assert.equal(STAGES.length, 4);
  const counts = STAGES.map((s) => questionsForStage(s.n, cat).length);
  assert.deepEqual(counts, [16, cat.cities.length, cat.places.length, cat.mountains.length + cat.rivers.length]);
  const stampIds = new Set();
  for (const s of STAGES) {
    for (const q of questionsForStage(s.n, cat)) {
      assert.ok(q.prompt && q.prompt.length > 4, q.key);
      assert.ok(q.hint, `${q.key} 힌트 없음`);
      assert.ok(q.fact, `${q.key} 설명 없음`);
      assert.ok(q.accept.includes(q.answer), q.key);
      assert.ok(!stampIds.has(q.stampId), `도장 id 중복 ${q.stampId}`);
      stampIds.add(q.stampId);
    }
  }
});

test('2단계 도청 문제는 도시 이름을 미리 알려 주지 않고, 힌트로 알려 준다', () => {
  const qs = questionsForStage(2, cat);
  const andong = qs.find((q) => q.answer === 'andong');
  assert.equal(andong.prompt.includes('안동'), false);
  assert.match(andong.prompt, /경상북도청/);
  assert.match(andong.hint, /안동시/);
  assert.equal(andong.focus, true, '도청 문제는 그 도를 먼저 보여 줌');
  const muan = qs.find((q) => q.answer === 'muan');
  assert.match(muan.prompt, /무안/);
  assert.equal(muan.focus, false);
  assert.equal(qs.find((q) => q.answer === 'pohang').focus, false);
});

test('이웃 시·도 계산 (경계 꼭짓점 공유)', () => {
  const nb = neighborsOf(data.sido.features);
  assert.deepEqual([...nb['11']].sort(), ['28', '41']); // 서울: 인천, 경기
  assert.deepEqual(nb['50'], []); // 제주: 섬
  for (const c of ['30', '43', '44']) assert.ok(nb['36'].includes(c), `세종-${c}`);
  for (const c of ['47', '48']) assert.ok(nb['27'].includes(c), `대구-${c}`);
  assert.ok(nb['12'].includes('52') && nb['12'].includes('48'), '전남광주: 전북, 경남');
  // 서로 이웃이어야 한다 (대칭)
  for (const [a, list] of Object.entries(nb)) for (const b of list) assert.ok(nb[b].includes(a), `${a}-${b}`);
});

test('한 판: 8문제, 아직 못 받은 도장부터 낸다', () => {
  const all = questionsForStage(1, cat);
  const stamps = {};
  for (const q of all.slice(3)) stamps[q.stampId] = { stage: 1 };
  const round = makeRound(1, cat, stamps, seeded());
  assert.equal(round.length, ROUND_SIZE);
  const fresh = new Set(all.slice(0, 3).map((q) => q.stampId));
  assert.deepEqual(new Set(round.slice(0, 3).map((q) => q.stampId)), fresh);
  assert.equal(new Set(round.map((q) => q.key)).size, ROUND_SIZE, '한 판 안에 같은 문제 없음');
  // 같은 씨앗이면 같은 판
  assert.deepEqual(makeRound(1, cat, {}, seeded(3)).map((q) => q.key), makeRound(1, cat, {}, seeded(3)).map((q) => q.key));
});

test('도장 현황과 도장 수첩 칸 수가 맞다', () => {
  const total = STAGES.reduce((n, s) => n + questionsForStage(s.n, cat).length, 0);
  const pages = bookPages(cat);
  assert.equal(pages.length, 17); // 시·도 16 + 강
  const slots = pages.flatMap((p) => p.slots.map((s) => s.stampId));
  assert.equal(slots.length, total);
  assert.equal(new Set(slots).size, total);
  const q = questionsForStage(3, cat)[0];
  assert.deepEqual(stageProgress(3, cat, { [q.stampId]: {} }), { got: 1, total: cat.places.length });
});

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

test('저장: 도장을 모으고 다시 열어도 남는다', () => {
  const mem = memoryStorage();
  const a = createStore(mem);
  assert.equal(a.addStamp('region:seoul', 1, true), true);
  assert.equal(a.addStamp('region:seoul', 1, false), false, '같은 도장은 한 번만');
  assert.equal(a.countStamps(), 1);
  const b = createStore(mem);
  assert.equal(b.hasStamp('region:seoul'), true);
  assert.equal(b.stamps['region:seoul'].firstTry, true);
});

test('저장: 소리 설정은 도장 지우기를 해도 남고, 망가진 기록은 무시한다', () => {
  const mem = memoryStorage();
  const s = createStore(mem);
  s.setSound(false);
  s.addStamp('jirisan', 4, false);
  s.reset();
  assert.equal(s.countStamps(), 0);
  assert.equal(createStore(mem).sound, false);

  const broken = createStore(memoryStorage({ [STORE_KEY]: '{망가짐' }));
  assert.equal(broken.countStamps(), 0);
  assert.equal(broken.sound, true);

  const none = createStore(null); // 저장이 막힌 브라우저
  assert.equal(none.addStamp('x', 1, true), true);
  assert.equal(none.hasStamp('x'), true);
});
