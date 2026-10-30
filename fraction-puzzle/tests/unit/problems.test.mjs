// 문제 생성기 시험: 단원·판마다 무작위로 많이 만들어서
//  1) 늘 범위 안인지  2) 모범 답이 맞다고 판정되는지  3) 정답이 하나뿐인지  4) 틀린 답에 설명이 나오는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNITS, makeProblem, makeStage, makeChallenge, validate, problemKey, PER_STAGE, MAX_UNITS } from '../../js/problems.js';
import { judge, solve, signOf, resultOf, readFrac } from '../../js/judge.js';
import { explain, prompt, plainOf, speechOf } from '../../js/text.js';
import { val, totalNum } from '../../js/num.js';
import { Q, cmp, eq, parseDecimal, toDecimalString } from '../../js/rational.js';
import { makeRng } from '../../js/rng.js';

const SEEDS = 60; // 판마다 만들어 보는 횟수 (문제 수 = SEEDS × 3)
const UNIQUE_SEEDS = 6; // 정답이 하나뿐인지 모두 세어 보는 횟수 (오래 걸려서 조금만)

const stagesOf = (unitId, level, n = SEEDS) => {
  const out = [];
  for (let s = 0; s < n; s++) out.push(...makeStage(unitId, level, 1000 * level + s * 7 + unitId.length));
  return out;
};

// ---------- 단원별 범위 규칙 ----------
const isDec = (x, maxP = 2) => x.t === 'd' && x.p >= 1 && x.p <= maxP;
const lt = (q, k) => cmp(q, Q(k)) < 0;
const RULES = {
  pizza(p) {
    assert.equal(p.kind, 'make');
    assert.equal(p.model, 'pizza');
    assert.equal(p.units, 1);
    assert.equal(p.cells, null, '피자는 아이가 직접 나눈다');
    const t = p.target;
    assert.ok(t.w === 0 && t.n >= 1 && t.n < t.d, '진분수');
    assert.ok(t.d >= 2 && t.d <= 12);
  },
  mixed(p) {
    assert.equal(p.kind, 'make');
    assert.equal(p.model, 'pizza');
    assert.ok(cmp(val(p.target), Q(1)) >= 0, '1과 같거나 큰 수 (가분수·대분수)');
    assert.ok(p.target.d >= 2 && p.target.d <= 8);
    assert.ok(p.units <= MAX_UNITS);
  },
  fcompare(p) {
    assert.equal(p.kind, 'compare');
    assert.equal(p.model, 'bar');
    const unitFr = (x) => x.w === 0 && x.n === 1;
    assert.ok(p.a.d === p.b.d || (unitFr(p.a) && unitFr(p.b)), '분모가 같거나 단위분수끼리');
    assert.ok(cmp(val(p.a), Q(3)) <= 0 && cmp(val(p.b), Q(3)) <= 0);
  },
  faddsub(p) {
    assert.equal(p.kind, 'op');
    assert.equal(p.model, 'bar');
    assert.equal(p.a.d, p.b.d, '분모가 같은 분수');
    assert.ok(p.a.d >= 3 && p.a.d <= 10);
    const r = resultOf(p);
    assert.ok(r.n > 0 && lt(r, 5));
    if (p.op === '-') assert.ok(cmp(val(p.a), val(p.b)) > 0);
  },
  decimal(p) {
    assert.equal(p.kind, 'make');
    assert.ok(['bar10', 'grid100'].includes(p.model));
    const t = p.target;
    if (t.t === 'f') assert.ok(t.d === 10 || t.d === 100, '분모 10 또는 100');
    else assert.ok(isDec(t));
    if (p.model === 'bar10') assert.ok(t.t === 'f' ? t.d === 10 : t.p === 1, '막대는 소수 한 자리');
    assert.ok(lt(val(t), 2));
  },
  dcompare(p) {
    assert.equal(p.kind, 'compare');
    assert.ok(isDec(p.a) && isDec(p.b));
    if (p.model === 'bar10') assert.ok(p.a.p === 1 && p.b.p === 1);
    assert.ok(lt(val(p.a), 2) && lt(val(p.b), 2));
  },
  daddsub(p) {
    assert.equal(p.kind, 'op');
    assert.ok(isDec(p.a) && isDec(p.b), '소수 두 자리 수까지');
    const r = resultOf(p);
    assert.ok(r.n > 0 && lt(r, 4));
    assert.ok(toDecimalString(r, 2) !== null, '답도 소수 두 자리 안');
  },
  line(p) {
    assert.ok(p.kind === 'line-place' || p.kind === 'line-cards');
    assert.ok(p.line.count >= 2 && p.line.count <= 20);
    const nums = p.kind === 'line-place' ? [p.target] : p.cards.map((c) => c.num);
    nums.forEach((x) => {
      if (x.t === 'd') assert.ok(isDec(x));
      else assert.ok(x.d <= 100);
      assert.ok(lt(val(x), 2));
    });
  },
};

// ---------- 정답이 하나뿐인지 모두 세어 보기 ----------
// 자연수 칸에 0을 쓴 것은 비워 둔 것과 같으므로 0은 넣지 않는다
function* fracAnswers(maxN, ds) {
  for (const w of [null, 1, 2, 3, 4, 5]) for (const n of [null, ...Array.from({ length: maxN + 1 }, (_, i) => i)]) for (const d of [null, ...ds]) yield { w, n, d };
}
function* decAnswers(maxH) {
  for (let i = 0; i <= maxH; i++) {
    yield toDecimalString(Q(i, 100), 2);
    if (i % 10 === 0) yield toDecimalString(Q(i, 100), 1);
  }
}

function countPassing(p) {
  const good = solve(p);
  const pass = [];
  if (p.kind === 'make') {
    const cutsList = p.model === 'pizza' && p.cells === null ? Array.from({ length: 12 }, (_, i) => i + 1) : [good.cuts];
    let paintOk = 0;
    for (const cuts of cutsList) for (let painted = 0; painted <= p.units * cuts; painted++) {
      if (judge(p, { cuts, painted, answer: good.answer }).ok) paintOk++;
    }
    assert.equal(paintOk, 1, '칠하는 방법(조각 수·칠한 수)은 하나뿐');
    if (!p.write) return 1;
    const answers = p.write === 'dec' ? decAnswers(400)
      : p.write === 'frac' ? fracAnswers(200, [1, 2, 4, 5, 10, 20, 25, 50, 100])
      : fracAnswers(totalNum(p.target) + 6, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16]);
    for (const answer of answers) if (judge(p, { ...good, answer }).ok) pass.push(answer);
    if (p.write === 'mixed' || p.write === 'improper') assert.equal(pass.length, 1, `${p.write}로 쓰는 답은 하나뿐: ${JSON.stringify(pass)}`);
    return pass;
  }
  if (p.kind === 'compare') {
    const ok = ['<', '=', '>'].filter((sign) => judge(p, { ...good, sign }).ok);
    assert.deepEqual(ok, [signOf(p.a, p.b)]);
    return ok;
  }
  if (p.kind === 'op') {
    let markOk = 0;
    for (let m = 0; m <= p.units * p.cells; m++) if (judge(p, { marked: m, answer: good.answer }).ok) markOk++;
    assert.equal(markOk, 1, '칠하거나 지우는 칸 수는 하나뿐');
    const answers = p.answerType === 'dec' ? decAnswers(450) : fracAnswers(45, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 20]);
    for (const answer of answers) if (judge(p, { ...good, answer }).ok) pass.push(answer);
    return pass;
  }
  if (p.kind === 'line-place') {
    for (let tick = 0; tick <= p.line.count; tick++) if (judge(p, { tick }).ok) pass.push(tick);
    assert.equal(pass.length, 1, '깃발 자리는 하나뿐');
    return pass;
  }
  if (p.kind === 'line-cards') {
    const n = p.cards.length, k = p.points.length;
    let ok = 0;
    for (let code = 0; code < k ** n; code++) {
      const place = {};
      let c = code;
      p.cards.forEach((card) => { place[card.id] = c % k; c = Math.floor(c / k); });
      if (judge(p, { place }).ok) ok++;
    }
    assert.equal(ok, 1, '카드 놓는 방법은 하나뿐');
    return [ok];
  }
  throw new Error(p.kind);
}

// 정답으로 받아 주는 답이 여럿이면(가분수 7/5와 대분수 1 2/5, 0.5와 0.50처럼 모양만 다름) 모두 같은 값이어야 한다
function sameValue(p, pass) {
  const byValue = p.kind === 'op' || (p.kind === 'make' && (p.write === 'dec' || p.write === 'frac'));
  if (!byValue) return;
  assert.ok(pass.length >= 1, '정답이 적어도 하나는 있어야 함');
  const want = p.kind === 'op' ? resultOf(p) : val(p.target);
  for (const a of pass) {
    const q = typeof a === 'string' ? parseDecimal(a) : readFrac(a).q;
    assert.ok(eq(q, want), `정답 값이 하나가 아님: ${JSON.stringify(a)}`);
  }
}

// ---------- 틀린 답 만들기 (설명이 잘 나오는지 보려고) ----------
function wrongs(p) {
  const g = solve(p);
  const out = [];
  if (p.kind === 'make') {
    out.push({ ...g, painted: g.painted + 1 });
    if (g.painted > 0) out.push({ ...g, painted: g.painted - 1 });
    out.push({ ...g, painted: 0 });
    if (p.model === 'pizza' && p.cells === null) {
      out.push({ ...g, cuts: g.cuts + 1 });
      out.push({ ...g, cuts: g.cuts * 2, painted: g.painted * 2 });
    }
    if (p.model === 'grid100') out.push({ ...g, painted: Math.floor(g.painted / 10) }, { ...g, painted: g.painted * 10 });
    if (p.write === 'mixed') out.push({ ...g, answer: { w: null, n: totalNum(p.target), d: p.target.d } }, { ...g, answer: { w: 9, n: 1, d: 2 } }, { ...g, answer: { w: 1, n: null, d: 3 } }, { ...g, answer: { w: 1, n: 1, d: 0 } });
    if (p.write === 'improper') out.push({ ...g, answer: { w: p.target.w, n: p.target.n, d: p.target.d } }, { ...g, answer: { w: null, n: totalNum(p.target) * 2, d: p.target.d * 2 } }, { ...g, answer: { w: null, n: 1, d: 1 } });
    if (p.write === 'dec') out.push({ ...g, answer: '' }, { ...g, answer: '9.99' });
    if (p.write === 'frac') out.push({ ...g, answer: { w: null, n: 1, d: 3 } }, { ...g, answer: null });
  } else if (p.kind === 'compare') {
    ['<', '=', '>'].forEach((sign) => out.push({ ...g, sign }));
    out.push({ ...g, paintA: g.paintA + 1 }, { ...g, paintB: 0 });
  } else if (p.kind === 'op') {
    out.push({ ...g, marked: g.marked + 1 }, { ...g, marked: 0 });
    if (p.answerType === 'frac') {
      out.push({ ...g, answer: { w: p.a.w + p.b.w || null, n: p.a.n + p.b.n, d: 2 * p.a.d } });
      out.push({ ...g, answer: { w: Math.abs(p.a.w - p.b.w), n: Math.abs(p.a.n - p.b.n), d: p.a.d } });
      out.push({ ...g, answer: { w: null, n: 1, d: 99 } }, { ...g, answer: { w: null, n: null, d: null } });
    } else {
      out.push({ ...g, answer: '9.99' }, { ...g, answer: '' }, { ...g, answer: toDecimalString(Q(p.a.i + p.b.i, 100), 2) });
    }
  } else if (p.kind === 'line-place') {
    out.push({ tick: g.tick + 1 }, { tick: g.tick - 1 }, { tick: 0 });
  } else {
    const ids = Object.keys(g.place);
    const swapped = { ...g.place, [ids[0]]: g.place[ids[1]], [ids[1]]: g.place[ids[0]] };
    out.push({ place: swapped }, { place: {} });
  }
  return out;
}

const BAD = /undefined|NaN|null|\[object/;

// ---------- 시험 ----------
test('단원 8개, 단원마다 10판 이상', () => {
  assert.equal(UNITS.length, 8);
  for (const u of UNITS) {
    assert.ok(u.levels.length >= 10, u.id);
    assert.ok(u.title && u.about && u.std);
  }
});

let total = 0;
for (const u of UNITS) {
  u.levels.forEach((_, level) => {
    test(`${u.title} ${level + 1}판: 범위 안·모범 답 정답·설명 나옴 (${SEEDS * PER_STAGE}문제)`, () => {
      for (const p of stagesOf(u.id, level)) {
        total++;
        assert.deepEqual(validate(p), [], JSON.stringify(p));
        RULES[u.id](p);
        assert.equal(judge(p, solve(p)).ok, true, `모범 답이 틀림: ${JSON.stringify(p)}`);
        const ptxt = plainOf(prompt(p));
        assert.ok(ptxt.length > 5 && !BAD.test(ptxt), ptxt);
        assert.ok(!BAD.test(speechOf(prompt(p))));
        for (const res of wrongs(p)) {
          const r = judge(p, res);
          if (r.ok) continue;
          const lines = explain(p, res, r);
          assert.ok(lines.length >= 1, `설명 없음 ${r.reason}`);
          lines.forEach((l) => assert.ok(!BAD.test(plainOf(l)) && plainOf(l).length > 3, `${r.reason}: ${plainOf(l)}`));
        }
      }
    });
    test(`${u.title} ${level + 1}판: 정답이 하나뿐`, () => {
      for (const p of stagesOf(u.id, level, UNIQUE_SEEDS)) sameValue(p, countPassing(p));
    });
  });
}

test('한 판의 문제 3개는 서로 다르다', () => {
  for (const u of UNITS) u.levels.forEach((_, lv) => {
    for (let s = 0; s < 30; s++) {
      const st = makeStage(u.id, lv, s);
      assert.equal(st.length, PER_STAGE);
      assert.equal(new Set(st.map(problemKey)).size, PER_STAGE, `${u.id} ${lv} ${s}`);
    }
  });
});

test('같은 씨앗이면 같은 판이 나온다', () => {
  assert.deepEqual(makeStage('faddsub', 6, 99), makeStage('faddsub', 6, 99));
  assert.notDeepEqual(makeStage('faddsub', 6, 99), makeStage('faddsub', 6, 100));
});

test('도전 모드: 10문제가 여러 단원에서 섞여 나온다', () => {
  for (let s = 0; s < 200; s++) {
    const ps = makeChallenge(s, 10);
    assert.equal(ps.length, 10);
    assert.ok(new Set(ps.map((p) => p.unit)).size >= 6);
    assert.equal(new Set(ps.map(problemKey)).size, 10);
    ps.forEach((p) => {
      assert.deepEqual(validate(p), []);
      assert.ok(judge(p, solve(p)).ok);
    });
  }
});

test('판이 올라가면 어려워진다: 분수 피자 1판은 단위분수, 마지막 판은 분모가 큰 것도', () => {
  const r = makeRng(5);
  for (let k = 0; k < 100; k++) {
    const p = makeProblem('pizza', 0, r);
    assert.equal(p.target.n, 1);
    assert.ok(p.target.d <= 4);
  }
  const ds = new Set();
  for (let k = 0; k < 300; k++) ds.add(makeProblem('pizza', 9, r).target.d);
  assert.ok(Math.max(...ds) >= 11);
});

test('함정 문제도 나온다 (0.5와 0.48, 0.3과 0.30, 받아내림)', () => {
  const r = makeRng(11);
  const seen = { trap: false, eq: false, borrow: false };
  for (let k = 0; k < 300; k++) {
    const c = makeProblem('dcompare', 4, r);
    if (c.a.p !== c.b.p) {
      const [one, two] = c.a.p === 1 ? [c.a, c.b] : [c.b, c.a];
      if (two.i > one.i && cmp(val(two), val(one)) < 0) seen.trap = true;
      if (eq(val(one), val(two))) seen.eq = true;
    }
    const s = makeProblem('faddsub', 8, r);
    if (s.a.n < s.b.n) seen.borrow = true;
  }
  assert.deepEqual(seen, { trap: true, eq: true, borrow: true });
});

test(`만들어 본 문제 수 확인`, () => {
  assert.ok(total >= 80 * SEEDS * PER_STAGE, `${total}`);
});
