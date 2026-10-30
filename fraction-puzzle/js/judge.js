// 정답 판정. 모든 비교는 rational.js의 정수 분자·분모 계산으로만 한다.
//
// 아이가 낸 답(response) 모양
//  make      { cuts, painted, answer? }   cuts: 피자 한 판의 조각 수, painted: 칠한 칸 수(모두 합)
//  compare   { paintA, paintB, sign }      sign: '<' | '=' | '>'
//  op        { marked, answer }            marked: 더 칠한(+) 또는 지운(−) 칸 수
//  line-place { tick }                     깃발이 있는 눈금 번호(0부터)
//  line-cards { place: {카드id: 점 번호} }
// 분수 답은 {w, n, d}(빈칸은 null), 소수 답은 "1.25" 같은 글자.
import { Q, add, sub, mul, div, cmp, eq, isInt, countOf, fromMixed, parseDecimal, toDecimalString, toMixed } from './rational.js';
import { val, totalNum } from './num.js';

export const SIGNS = ['<', '=', '>'];
export const signOf = (a, b) => SIGNS[cmp(val(a), val(b)) + 1];
export const resultOf = (p) => (p.op === '+' ? add(val(p.a), val(p.b)) : sub(val(p.a), val(p.b)));

// 칠해야(지워야) 할 칸 수
export function needCells(p) {
  if (p.kind === 'make') return countOf(val(p.target), p.model === 'pizza' ? p.target.d : p.cells);
  if (p.kind === 'compare') return [countOf(val(p.a), p.cellsA), countOf(val(p.b), p.cellsB)];
  if (p.kind === 'op') return countOf(val(p.b), p.cells);
  return null;
}
// 덧셈·뺄셈에서 처음부터 칠해 둔 칸 수 (앞의 수)
export const givenCells = (p) => (p.kind === 'op' ? countOf(val(p.a), p.cells) : 0);

export function tickOf(line, q) {
  const k = div(sub(q, line.start), line.step);
  return isInt(k) ? k.n : null;
}

// 분수 답 칸 읽기
export function readFrac(ans) {
  if (!ans) return { err: 'empty' };
  const w = ans.w ?? null, n = ans.n ?? null, d = ans.d ?? null;
  if (w === null && n === null && d === null) return { err: 'empty' };
  if (n === null && d === null) return { q: Q(w), w, n: 0, d: 1, whole: true };
  if (n === null || d === null) return { err: 'half' };
  if (d === 0) return { err: 'zero' };
  return { q: fromMixed(w ?? 0, n, d), w: w ?? 0, n, d, whole: false };
}

function judgeWrite(p, ans) {
  const v = val(p.target);
  if (p.write === 'dec') {
    const q = parseDecimal(ans ?? '');
    if (!q) return { ok: false, reason: 'empty' };
    if (eq(q, v)) return { ok: true };
    return { ok: false, reason: 'value', place: eq(q, mul(v, Q(10))) || eq(q, mul(v, Q(1, 10))) };
  }
  const a = readFrac(ans);
  if (a.err) return { ok: false, reason: a.err };
  const same = eq(a.q, v);
  if (p.write === 'frac') return same ? { ok: true } : { ok: false, reason: 'value' };

  const d = p.target.d;
  const T = totalNum(p.target);
  if (p.write === 'improper') {
    if (!a.whole && a.w === 0 && a.d === d && a.n === T) return { ok: true };
    if (same && (a.w > 0 || a.whole)) return { ok: false, reason: 'form' };
    if (same) return { ok: false, reason: 'denom' };
    return { ok: false, reason: 'value' };
  }
  // 대분수(또는 자연수)로 쓰기
  const N = T % d;
  const W = (T - N) / d;
  if (N === 0) {
    if (same && a.whole) return { ok: true };
    if (same) return { ok: false, reason: 'form' };
    return { ok: false, reason: 'value' };
  }
  if (!a.whole && a.w === W && a.n === N && a.d === d) return { ok: true };
  if (same && (a.w === 0 || a.n >= a.d)) return { ok: false, reason: 'form' };
  if (same) return { ok: false, reason: 'denom' };
  return { ok: false, reason: 'value' };
}

function judgeMake(p, res) {
  const v = val(p.target);
  if (p.model === 'pizza' && p.cells === null && res.cuts !== p.target.d) {
    const same = res.cuts >= 1 && res.painted > 0 && eq(Q(res.painted, res.cuts), v);
    return { ok: false, reason: 'cuts', same, got: res.cuts };
  }
  const need = needCells(p);
  if (res.painted !== need) {
    let place = null;
    if (p.model === 'grid100') {
      if (res.painted * 10 === need) place = 'small'; // 0.4인데 4칸만(0.04)
      else if (res.painted === need * 10) place = 'big'; // 0.07인데 70칸(0.7)
    }
    return { ok: false, reason: 'count', need, got: res.painted, place };
  }
  return p.write ? judgeWrite(p, res.answer) : { ok: true };
}

export function compareWhy(p) {
  const { a, b } = p;
  if (p.model === 'bar') {
    if (a.d !== b.d) return 'unit';
    const kind = (x) => (x.w > 0 ? 'mixed' : x.n >= x.d ? 'improper' : 'proper');
    if (kind(a) !== kind(b)) return 'cross';
    return kind(a) === 'proper' ? 'sameD' : kind(a);
  }
  return a.p !== b.p ? 'places' : 'dec';
}

function judgeCompare(p, res) {
  const [na, nb] = needCells(p);
  if (res.paintA !== na) return { ok: false, reason: 'paint', side: 'a', need: na, got: res.paintA };
  if (res.paintB !== nb) return { ok: false, reason: 'paint', side: 'b', need: nb, got: res.paintB };
  const want = signOf(p.a, p.b);
  if (res.sign === want) return { ok: true };
  return { ok: false, reason: 'sign', want, got: res.sign, why: compareWhy(p) };
}

function judgeOp(p, res) {
  const need = needCells(p);
  if (res.marked !== need) return { ok: false, reason: 'mark', need, got: res.marked };
  const want = resultOf(p);
  if (p.answerType === 'dec') {
    const q = parseDecimal(res.answer ?? '');
    if (!q) return { ok: false, reason: 'empty' };
    if (eq(q, want)) return { ok: true };
    if (p.a.p !== p.b.p) {
      // 소수점을 맞추지 않고 끝자리끼리 계산한 경우 (0.5 + 0.27 → 0.32)
      const s = p.op === '+' ? p.a.i + p.b.i : Math.abs(p.a.i - p.b.i);
      if (eq(q, Q(s, 100))) return { ok: false, reason: 'align' };
    }
    return { ok: false, reason: 'value' };
  }
  const a = readFrac(res.answer);
  if (a.err) return { ok: false, reason: a.err };
  if (eq(a.q, want)) {
    if (!a.whole && a.w > 0 && a.n >= a.d) return { ok: false, reason: 'form' };
    return { ok: true };
  }
  const d = p.a.d;
  if (p.op === '+' && !a.whole && a.d === 2 * d) {
    const byParts = a.w === p.a.w + p.b.w && a.n === p.a.n + p.b.n;
    const byTotal = a.w === 0 && a.n === totalNum(p.a) + totalNum(p.b);
    if (byParts || byTotal) return { ok: false, reason: 'denoms' };
  }
  if (p.op === '-' && !a.whole && a.d === d && p.a.n < p.b.n && a.w === p.a.w - p.b.w && a.n === p.b.n - p.a.n) {
    return { ok: false, reason: 'borrow' };
  }
  if (!a.whole && a.d !== d) return { ok: false, reason: 'denom' };
  return { ok: false, reason: 'value' };
}

function judgeLine(p, res) {
  const want = tickOf(p.line, val(p.target));
  if (res.tick === want) return { ok: true };
  return { ok: false, reason: 'position', want, got: res.tick };
}

export const cardPoint = (p, card) => p.points.indexOf(tickOf(p.line, val(card.num)));

function judgeCards(p, res) {
  const place = res.place || {};
  const unplaced = p.cards.filter((c) => place[c.id] === undefined || place[c.id] === null).map((c) => c.id);
  if (unplaced.length) return { ok: false, reason: 'unplaced', ids: unplaced };
  const wrong = p.cards.filter((c) => place[c.id] !== cardPoint(p, c)).map((c) => c.id);
  return wrong.length ? { ok: false, reason: 'cards', ids: wrong } : { ok: true };
}

export function judge(p, res) {
  switch (p.kind) {
    case 'make': return judgeMake(p, res);
    case 'compare': return judgeCompare(p, res);
    case 'op': return judgeOp(p, res);
    case 'line-place': return judgeLine(p, res);
    case 'line-cards': return judgeCards(p, res);
    default: throw new Error(`모르는 문제 종류: ${p.kind}`);
  }
}

// ---------- 모범 답 ----------
function fracAnswer(q, d) {
  const m = toMixed(q, d);
  if (m.n === 0) return { w: m.w, n: null, d: null };
  return { w: m.w || null, n: m.n, d };
}

export function solve(p) {
  switch (p.kind) {
    case 'make': {
      const res = { cuts: p.model === 'pizza' ? p.target.d : p.cells, painted: needCells(p) };
      const v = val(p.target);
      if (p.write === 'dec') res.answer = toDecimalString(v);
      else if (p.write === 'frac') res.answer = fracAnswer(v, 10 ** p.target.p);
      else if (p.write === 'mixed') res.answer = fracAnswer(v, p.target.d);
      else if (p.write === 'improper') res.answer = { w: null, n: totalNum(p.target), d: p.target.d };
      return res;
    }
    case 'compare': {
      const [paintA, paintB] = needCells(p);
      return { paintA, paintB, sign: signOf(p.a, p.b) };
    }
    case 'op': {
      const want = resultOf(p);
      return { marked: needCells(p), answer: p.answerType === 'dec' ? toDecimalString(want) : fracAnswer(want, p.a.d) };
    }
    case 'line-place': return { tick: tickOf(p.line, val(p.target)) };
    case 'line-cards': return { place: Object.fromEntries(p.cards.map((c) => [c.id, cardPoint(p, c)])) };
    default: throw new Error(`모르는 문제 종류: ${p.kind}`);
  }
}
