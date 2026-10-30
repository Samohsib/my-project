// 문제 만들기. DOM을 쓰지 않는 순수 모듈이라 Node에서 그대로 시험할 수 있다.
//
// 문제 종류(kind)
//  make     : 피자·막대·모눈을 나누고 칠해서 수 만들기 (+ 다른 모양으로 써 보기)
//  compare  : 두 수를 칠해 보고 >, =, < 고르기
//  op       : 더하는 만큼 더 칠하기 / 빼는 만큼 지우기 → 답 쓰기
//  line-place : 수직선에서 깃발 옮기기
//  line-cards : 분수 카드와 소수 카드를 수직선의 같은 점에 놓기
//
// 모델(model): pizza(원), bar(분모만큼 나눈 막대), bar10(10칸 막대=소수 한 자리), grid100(10×10 모눈=소수 두 자리)
import { Q, add, sub, cmp, eq, countOf } from './rational.js';
import { F, D, val } from './num.js';
import { makeRng } from './rng.js';

export const PER_STAGE = 3; // 한 판에 문제 3개
export const MAX_DEN = 12; // 피자는 12조각까지
export const MAX_UNITS = 4; // 피자·막대·모눈은 한 문제에 4개까지

export const floorQ = (q) => (q.n - (q.n % q.d)) / q.d; // 0 이상만
export const ceilQ = (q) => floorQ(q) + (q.n % q.d ? 1 : 0);

export function cellsPerUnit(model, num) {
  if (model === 'bar10') return 10;
  if (model === 'grid100') return 100;
  return num.d;
}

// ---------- 작은 도우미 ----------
const any = (...gens) => (r) => r.pick(gens)(r);
function twoDistinct(r, lo, hi) {
  const a = r.int(lo, hi);
  let b = r.int(lo, hi - 1);
  if (b >= a) b++;
  return [a, b];
}
const nonTen = (r, lo, hi) => {
  let k;
  do k = r.int(lo, hi); while (k % 10 === 0);
  return k;
};
const swap = (r, a, b) => (r.chance(0.5) ? [a, b] : [b, a]);

// ---------- 1. 분수 피자 ----------
const pizzaProper = (ds, unitOnly = false) => (r) => {
  const d = r.pick(ds);
  return { kind: 'make', model: 'pizza', target: F(0, unitOnly ? 1 : r.int(1, d - 1), d), units: 1, cells: null };
};
const pizzaRest = (ds) => (r) => {
  const d = r.pick(ds);
  const eaten = r.int(1, d - 1);
  return { kind: 'make', model: 'pizza', story: 'rest', eaten: F(0, eaten, d), target: F(0, d - eaten, d), units: 1, cells: null };
};

// ---------- 2. 가분수와 대분수 ----------
function bigFrac(r, ds, maxW, form) {
  const d = r.pick(ds);
  const w = r.int(1, maxW);
  const n = r.int(1, d - 1);
  const f = form === 'any' ? r.pick(['improper', 'mixed']) : form;
  return { d, w, f, target: f === 'mixed' ? F(w, n, d) : F(0, w * d + n, d) };
}
const pizzaBig = (ds, maxW, form) => (r) => {
  const { w, target } = bigFrac(r, ds, maxW, form);
  return { kind: 'make', model: 'pizza', target, units: Math.min(MAX_UNITS, w + 2), cells: null };
};
const pizzaConvert = (ds, maxW, from) => (r) => {
  const { d, w, f, target } = bigFrac(r, ds, maxW, from);
  return { kind: 'make', model: 'pizza', target, units: Math.min(MAX_UNITS, w + 2), cells: d, write: f === 'mixed' ? 'improper' : 'mixed' };
};
const pizzaWhole = (ds, maxK) => (r) => {
  const d = r.pick(ds);
  const k = r.int(1, maxK);
  return { kind: 'make', model: 'pizza', target: F(0, k * d, d), units: Math.min(MAX_UNITS, k + 1), cells: d, write: 'mixed' };
};

// ---------- 3. 분수 크기 비교 ----------
function cmpP(model, a, b) {
  return {
    kind: 'compare', model, a, b,
    units: Math.max(ceilQ(val(a)), ceilQ(val(b))),
    cellsA: cellsPerUnit(model, a), cellsB: cellsPerUnit(model, b),
  };
}
const cmpSameD = (ds) => (r) => {
  const d = r.pick(ds);
  const [a, b] = twoDistinct(r, 1, d - 1);
  return cmpP('bar', F(0, a, d), F(0, b, d));
};
const cmpUnitF = (ds) => (r) => {
  const [i, j] = twoDistinct(r, 0, ds.length - 1);
  return cmpP('bar', F(0, 1, ds[i]), F(0, 1, ds[j]));
};
const cmpMixed = (ds, maxW) => (r) => {
  const d = r.pick(ds);
  const one = () => F(r.int(1, maxW), r.int(1, d - 1), d);
  const a = one();
  let b = one();
  while (a.w === b.w && a.n === b.n) b = one();
  return cmpP('bar', a, b);
};
const cmpImproper = (ds) => (r) => {
  const d = r.pick(ds);
  const [s, t] = twoDistinct(r, d + 1, 3 * d - 1);
  return cmpP('bar', F(0, s, d), F(0, t, d));
};
const cmpCross = (ds, eqChance) => (r) => {
  const d = r.pick(ds);
  const w = r.int(1, 2);
  const n = r.int(1, d - 1);
  const T = w * d + n;
  let T2 = T;
  if (!r.chance(eqChance)) {
    do T2 = r.int(d + 1, 3 * d - 1); while (T2 === T);
  }
  const [a, b] = swap(r, F(w, n, d), F(0, T2, d));
  return cmpP('bar', a, b);
};

// ---------- 4. 분수 덧셈과 뺄셈 ----------
function opP(model, op, a, b) {
  const res = op === '+' ? add(val(a), val(b)) : sub(val(a), val(b));
  return {
    kind: 'op', model, op, a, b,
    units: op === '+' ? ceilQ(res) : ceilQ(val(a)),
    cells: cellsPerUnit(model, a),
    answerType: model === 'bar' ? 'frac' : 'dec',
  };
}
const addProper = (ds, carry) => (r) => {
  const d = r.pick(ds);
  if (carry) {
    const a = r.int(1, d - 1);
    return opP('bar', '+', F(0, a, d), F(0, r.int(Math.max(1, d - a), d - 1), d));
  }
  const a = r.int(1, d - 2);
  return opP('bar', '+', F(0, a, d), F(0, r.int(1, d - 1 - a), d));
};
const subProper = (ds) => (r) => {
  const d = r.pick(ds);
  const a = r.int(2, d - 1);
  return opP('bar', '-', F(0, a, d), F(0, r.int(1, a - 1), d));
};
const wholeMinus = (ds, maxW) => (r) => {
  const d = r.pick(ds);
  const wa = r.int(1, maxW);
  const wb = r.int(0, wa - 1);
  return opP('bar', '-', F(wa, 0, d), F(wb, r.int(1, d - 1), d));
};
const addMixed = (ds, carry) => (r) => {
  const d = r.pick(ds);
  const cap = carry ? 2 : 3; // 답이 4보다 작게
  const wa = r.int(1, cap - 1);
  const wb = r.int(0, cap - wa);
  let na, nb;
  if (carry) { na = r.int(1, d - 1); nb = r.int(Math.max(1, d - na), d - 1); }
  else { na = r.int(1, d - 2); nb = r.int(1, d - 1 - na); }
  const [a, b] = swap(r, F(wa, na, d), F(wb, nb, d));
  return opP('bar', '+', a, b);
};
const subMixed = (ds, borrow) => (r) => {
  const d = r.pick(ds);
  const wa = r.int(1, 3);
  const wb = r.int(0, wa - 1);
  let na, nb;
  if (borrow) { na = r.int(1, d - 2); nb = r.int(na + 1, d - 1); }
  else { na = r.int(2, d - 1); nb = r.int(1, na - 1); }
  return opP('bar', '-', F(wa, na, d), F(wb, nb, d));
};

// ---------- 5. 소수 칠하기 ----------
// style: tenth(0.7) / ab(0.37) / small(0.07) / round(0.4를 모눈에)
function decNum(r, model, maxW, style, show) {
  const w = r.int(0, maxW);
  let k, p;
  if (model === 'bar10') { k = r.int(1, 9); p = 1; }
  else if (style === 'small') { k = r.int(1, 9); p = 2; }
  else if (style === 'round') { k = r.int(1, 9); p = 1; }
  else { k = nonTen(r, 11, 99); p = 2; }
  const per = p === 1 ? 10 : 100;
  return { w, num: show === 'frac' ? F(w, k, per) : D(w * per + k, p) };
}
const decMake = (model, { maxW = 0, styles = ['ab'], show = 'dec', write = null } = {}) => (r) => {
  const style = r.pick(styles);
  const { w, num } = decNum(r, model, maxW, style, show);
  return { kind: 'make', model, target: num, units: w + 1, cells: model === 'bar10' ? 10 : 100, write };
};

// ---------- 6. 소수 크기 비교 ----------
const cmpTenths = (maxW) => (r) => {
  let a, b;
  do { a = nonTen(r, 1, maxW * 10 + 9); b = nonTen(r, 1, maxW * 10 + 9); } while (a === b);
  return cmpP('bar10', D(a, 1), D(b, 1));
};
const cmpHund = (style) => (r) => {
  let a, b;
  if (style === 'sameTenth') {
    const t = r.int(0, 9);
    const [x, y] = twoDistinct(r, 1, 9);
    a = D(t * 10 + x, 2); b = D(t * 10 + y, 2);
  } else if (style === 'trap') { // 0.5와 0.48: 자릿수가 많다고 큰 게 아니다
    const x = r.int(2, 9);
    a = D(x, 1); b = D(nonTen(r, 11, 10 * x - 1), 2);
  } else if (style === 'equal') { // 0.3 = 0.30
    const x = r.int(1, 9);
    a = D(x, 1); b = D(10 * x, 2);
  } else if (style === 'ones') {
    const x = 100 + nonTen(r, 1, 99);
    let y;
    do y = (r.chance(0.5) ? 100 : 0) + nonTen(r, 1, 99); while (y === x);
    a = D(x, 2); b = D(y, 2);
  } else { // small: 0.09와 0.1
    a = D(r.int(1, 9), 2); b = D(r.int(1, 9), 1);
  }
  [a, b] = swap(r, a, b);
  return cmpP('grid100', a, b);
};

// ---------- 7. 소수 덧셈과 뺄셈 ----------
const tAdd = (carry) => (r) => {
  let a, b;
  if (carry) { a = r.int(1, 9); b = r.int(Math.max(1, 10 - a), 9); }
  else { a = r.int(1, 8); b = r.int(1, 9 - a); }
  return opP('bar10', '+', D(a, 1), D(b, 1));
};
const tSub = (borrow) => (r) => {
  if (borrow) {
    const x = r.int(0, 8);
    return opP('bar10', '-', D(10 + x, 1), D(r.int(x + 1, 9), 1));
  }
  const a = r.int(2, 9);
  return opP('bar10', '-', D(a, 1), D(r.int(1, a - 1), 1));
};
const hAdd = (carry, mixedPlaces = false) => (r) => {
  let a, b;
  if (mixedPlaces) { // 0.5 + 0.27: 자리를 맞추는 연습
    [a, b] = swap(r, D(r.int(1, 9), 1), D(nonTen(r, 11, 99), 2));
  } else {
    let x, y;
    do { x = nonTen(r, 11, 99); y = nonTen(r, 11, 99); } while (carry ? x + y < 100 : x + y >= 100);
    a = D(x, 2); b = D(y, 2);
  }
  return opP('grid100', '+', a, b);
};
const hSub = (borrowOne) => (r) => {
  let x, y;
  if (borrowOne) { // 1.23 - 0.58
    do { x = nonTen(r, 1, 98); y = nonTen(r, 11, 99); } while (y <= x);
    return opP('grid100', '-', D(100 + x, 2), D(y, 2));
  }
  do { x = nonTen(r, 12, 99); y = nonTen(r, 1, 98); } while (y >= x);
  return opP('grid100', '-', D(x, 2), D(y, 2));
};
const hBig = (op) => (r) => {
  let x, y;
  if (op === '+') {
    do { x = 100 * r.int(1, 2) + nonTen(r, 1, 99); y = 100 * r.int(0, 1) + nonTen(r, 1, 99); } while (x + y >= 300);
  } else {
    do { x = 100 * r.int(1, 2) + nonTen(r, 1, 99); y = 100 * r.int(0, 1) + nonTen(r, 1, 99); } while (y >= x);
  }
  return opP('grid100', op, D(x, 2), D(y, 2));
};

// ---------- 8. 수직선 잇기 ----------
const INT = (k) => F(k, 0, 1); // 수직선의 자연수 눈금 이름

function lineP(kind, start, step, count, labels, extra) {
  return { kind, line: { start, step, count }, labels, ...extra };
}
const lineTenths = (maxW, target, label) => (r) => {
  const count = 10 * (maxW + 1);
  const labels = [];
  for (let k = 0; k <= maxW + 1; k++) labels.push({ k: 10 * k, num: INT(k) });
  const half = maxW === 0;
  if (half) labels.push({ k: 5, num: label === 'frac' ? F(0, 5, 10) : D(5, 1) });
  let t;
  do t = r.int(1, count - 1); while (t % 10 === 0 || (half && t === 5));
  const tt = target === 'any' ? r.pick(['frac', 'dec']) : target;
  const num = tt === 'frac' ? F(Math.floor(t / 10), t % 10, 10) : D(t, 1);
  return lineP('line-place', Q(0), Q(1, 10), count, labels, { target: num });
};
const lineHund = () => (r) => {
  const a = r.int(0, 9);
  const labels = [
    { k: 0, num: a === 0 ? INT(0) : D(a, 1) },
    { k: 5, num: D(a * 10 + 5, 2) },
    { k: 10, num: a === 9 ? INT(1) : D(a + 1, 1) },
  ];
  let t;
  do t = r.int(1, 9); while (t === 5);
  const num = r.chance(0.5) ? D(a * 10 + t, 2) : F(0, a * 10 + t, 100);
  return lineP('line-place', Q(a, 10), Q(1, 100), 10, labels, { target: num });
};
const lineDen = (ds, maxW) => (r) => {
  const d = r.pick(ds);
  const count = d * (maxW + 1);
  const labels = [];
  for (let k = 0; k <= maxW + 1; k++) labels.push({ k: d * k, num: INT(k) });
  let t;
  do t = r.int(1, count - 1); while (t % d === 0);
  const num = t > d && r.chance(0.5) ? F(0, t, d) : F(Math.floor(t / d), t % d, d);
  return lineP('line-place', Q(0), Q(1, d), count, labels, { target: num });
};
const lineCards = (style) => (r) => {
  let start, step, count, labels, ticks, mk;
  if (style === 'hund') {
    const a = r.int(0, 9);
    start = Q(a, 10); step = Q(1, 100); count = 10;
    labels = [{ k: 0, num: a === 0 ? INT(0) : D(a, 1) }, { k: 10, num: a === 9 ? INT(1) : D(a + 1, 1) }];
    ticks = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    mk = (t) => [F(0, a * 10 + t, 100), D(a * 10 + t, 2)];
  } else if (style === 'two') {
    start = Q(0); step = Q(1, 10); count = 20;
    labels = [0, 1, 2].map((k) => ({ k: 10 * k, num: INT(k) }));
    const pool = [];
    for (let t = 1; t < 20; t++) if (t % 10) pool.push(t);
    ticks = r.shuffle(pool).slice(0, 3);
    if (ticks.every((t) => t < 10)) ticks[0] += 10; // 1보다 큰 수가 꼭 하나는 있게
    mk = (t) => [t > 10 && r.chance(0.5) ? F(0, t, 10) : F(Math.floor(t / 10), t % 10, 10), D(t, 1)];
  } else {
    start = Q(0); step = Q(1, 10); count = 10;
    labels = [{ k: 0, num: INT(0) }, { k: 10, num: INT(1) }];
    ticks = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    mk = (t) => [F(0, t, 10), D(t, 1)];
  }
  ticks.sort((x, y) => x - y);
  const cards = r.shuffle(ticks.flatMap((t) => mk(t))).map((num, id) => ({ id, num }));
  return lineP('line-cards', start, step, count, labels, { points: ticks, cards });
};

// ---------- 단원 ----------
const D_SMALL = [3, 4, 5, 6, 7, 8];

export const UNITS = [
  {
    id: 'pizza', title: '분수 피자', icon: 'pizza', color: '#ff8a3d',
    about: '피자를 똑같이 나누고 칠해서 분수를 만들어요.', std: '[4수01-09]',
    levels: [
      pizzaProper([2, 3, 4], true),
      pizzaProper([5, 6, 8], true),
      pizzaProper([3, 4]),
      pizzaProper([5, 6]),
      pizzaProper([6, 8]),
      pizzaProper([7, 9, 10]),
      pizzaProper([8, 10, 12]),
      pizzaRest([4, 5, 6, 8]),
      any(pizzaProper([9, 10, 11, 12]), pizzaRest([6, 8, 10, 12])),
      any(pizzaProper([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), pizzaRest([3, 5, 7, 9, 11]), pizzaProper([7, 9, 11, 12], true)),
    ],
  },
  {
    id: 'mixed', title: '가분수와 대분수', icon: 'pizzas', color: '#f25f5c',
    about: '피자 여러 판으로 가분수와 대분수를 만들고 바꿔 써요.', std: '[4수01-10]',
    levels: [
      pizzaBig([2, 3, 4], 1, 'improper'),
      pizzaBig([2, 3, 4], 1, 'mixed'),
      pizzaConvert([2, 3, 4], 1, 'improper'),
      pizzaConvert([2, 3, 4, 5], 1, 'mixed'),
      pizzaBig([3, 4, 5, 6], 2, 'any'),
      pizzaConvert([3, 4, 5, 6], 2, 'improper'),
      pizzaConvert([3, 4, 5, 6], 2, 'mixed'),
      any(pizzaWhole([2, 3, 4, 5], 3), pizzaConvert([3, 4, 5, 6], 2, 'improper')),
      pizzaConvert([4, 5, 6, 7, 8], 2, 'any'),
      any(pizzaBig(D_SMALL, 2, 'any'), pizzaConvert(D_SMALL, 2, 'any'), pizzaWhole(D_SMALL, 3)),
    ],
  },
  {
    id: 'fcompare', title: '분수 크기 비교', icon: 'scale', color: '#7b61ff',
    about: '막대를 칠해 보고 어느 분수가 더 큰지 알아봐요.', std: '[4수01-11]',
    levels: [
      cmpSameD([3, 4, 5, 6]),
      cmpSameD([6, 7, 8, 9, 10]),
      cmpUnitF([2, 3, 4, 5, 6]),
      cmpUnitF([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      cmpMixed([3, 4, 5, 6], 2),
      cmpImproper([2, 3, 4, 5]),
      cmpCross([2, 3, 4, 5], 0.3),
      any(cmpSameD([5, 6, 7, 8, 9, 10, 11, 12]), cmpUnitF([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
      any(cmpMixed(D_SMALL, 2), cmpImproper(D_SMALL), cmpCross(D_SMALL, 0.3)),
      any(cmpSameD(D_SMALL), cmpUnitF([2, 3, 4, 5, 6, 8, 10, 12]), cmpMixed(D_SMALL, 2), cmpCross(D_SMALL, 0.4)),
    ],
  },
  {
    id: 'faddsub', title: '분수 덧셈·뺄셈', icon: 'plusminus', color: '#2bb673',
    about: '분모가 같은 분수를 막대로 더하고 빼요.', std: '[4수01-15]',
    levels: [
      addProper(D_SMALL, false),
      subProper(D_SMALL),
      addProper(D_SMALL, true),
      wholeMinus(D_SMALL, 1),
      addMixed(D_SMALL, false),
      subMixed(D_SMALL, false),
      addMixed(D_SMALL, true),
      wholeMinus(D_SMALL, 3),
      subMixed(D_SMALL, true),
      any(addProper([3, 4, 5, 6, 7, 8, 9, 10], true), addMixed([3, 4, 5, 6, 7, 8, 9, 10], true),
        subMixed([3, 4, 5, 6, 7, 8, 9, 10], true), wholeMinus([3, 4, 5, 6, 7, 8, 9, 10], 3)),
    ],
  },
  {
    id: 'decimal', title: '소수 칠하기', icon: 'grid', color: '#1e9bd7',
    about: '막대와 모눈을 칠하며 소수 한 자리, 두 자리를 알아봐요.', std: '[4수01-12] [4수01-13]',
    levels: [
      decMake('bar10'),
      decMake('bar10', { show: 'frac', write: 'dec' }),
      decMake('bar10', { maxW: 1 }),
      decMake('grid100'),
      decMake('grid100', { show: 'frac', write: 'dec' }),
      decMake('grid100', { styles: ['small', 'round'] }),
      decMake('grid100', { maxW: 1, styles: ['ab', 'small'] }),
      decMake('grid100', { styles: ['ab', 'small', 'round'], write: 'frac' }),
      any(decMake('grid100', { maxW: 1, styles: ['ab', 'small', 'round'] }),
        decMake('grid100', { maxW: 1, show: 'frac', write: 'dec' })),
      any(decMake('bar10', { maxW: 1, show: 'frac', write: 'dec' }),
        decMake('grid100', { maxW: 1, styles: ['ab', 'small', 'round'], write: 'frac' }),
        decMake('grid100', { maxW: 1, styles: ['small', 'round'] })),
    ],
  },
  {
    id: 'dcompare', title: '소수 크기 비교', icon: 'scale2', color: '#e8559b',
    about: '모눈을 칠해 보고 어느 소수가 더 큰지 알아봐요.', std: '[4수01-14]',
    levels: [
      cmpTenths(0),
      cmpTenths(1),
      cmpHund('sameTenth'),
      cmpHund('trap'),
      any(cmpHund('equal'), cmpHund('trap')),
      cmpHund('ones'),
      cmpHund('small'),
      any(cmpHund('sameTenth'), cmpHund('trap'), cmpHund('equal'), cmpHund('small')),
      any(cmpHund('trap'), cmpHund('ones'), cmpHund('small')),
      any(cmpTenths(1), cmpHund('trap'), cmpHund('equal'), cmpHund('ones'), cmpHund('small')),
    ],
  },
  {
    id: 'daddsub', title: '소수 덧셈·뺄셈', icon: 'plusminus2', color: '#00a6a6',
    about: '막대와 모눈으로 소수를 더하고 빼요.', std: '[4수01-16]',
    levels: [
      tAdd(false),
      tSub(false),
      tAdd(true),
      tSub(true),
      hAdd(false),
      hSub(false),
      hAdd(true),
      hAdd(false, true),
      hSub(true),
      any(hBig('+'), hBig('-'), hAdd(true, false), hSub(true)),
    ],
  },
  {
    id: 'line', title: '수직선 잇기', icon: 'line', color: '#f2a516',
    about: '수직선에서 분수와 소수가 같은 자리에 있는 것을 찾아요.', std: '[4수01-12] [4수01-13] (수직선 표현은 확인 필요)',
    levels: [
      lineTenths(0, 'frac', 'dec'),
      lineTenths(0, 'dec', 'frac'),
      lineCards('tenths'),
      lineTenths(1, 'frac', 'dec'),
      lineTenths(1, 'dec', 'frac'),
      lineCards('two'),
      lineHund(),
      lineDen(D_SMALL, 0),
      lineCards('hund'),
      any(lineTenths(1, 'any', 'dec'), lineHund(), lineDen(D_SMALL, 1), lineCards('two'), lineCards('hund')),
    ],
  },
];

export const unitById = (id) => UNITS.find((u) => u.id === id);

// 같은 문제인지 가리는 열쇠 (카드 순서·번호는 상관없다)
export function problemKey(p) {
  const { unit, level, ...rest } = p;
  if (rest.cards) rest.cards = rest.cards.map((c) => c.num).sort((a, b) => cmp(val(a), val(b)) || (a.t < b.t ? -1 : 1));
  return JSON.stringify(rest);
}

export function makeProblem(unitId, level, r) {
  const u = unitById(unitId);
  if (!u) throw new Error(`없는 단원: ${unitId}`);
  const gen = u.levels[level];
  if (!gen) throw new Error(`없는 판: ${unitId} ${level}`);
  return { unit: unitId, level, ...gen(r) };
}

// 한 판(문제 3개, 서로 다르게)
export function makeStage(unitId, level, seed = Date.now()) {
  const r = makeRng(seed);
  const out = [];
  const seen = new Set();
  for (let tries = 0; out.length < PER_STAGE && tries < 200; tries++) {
    const p = makeProblem(unitId, level, r);
    const k = problemKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  while (out.length < PER_STAGE) out.push(makeProblem(unitId, level, r));
  return out;
}

// 도전 모드: 모든 단원에서 섞어서 (각 단원의 3판~마지막 판 수준)
export function makeChallenge(seed = Date.now(), n = 10) {
  const r = makeRng(seed);
  const out = [];
  const seen = new Set();
  let order = [];
  for (let tries = 0; out.length < n && tries < 500; tries++) {
    if (!order.length) order = r.shuffle(UNITS.map((u) => u.id));
    const uid = order.pop();
    const u = unitById(uid);
    const p = makeProblem(uid, r.int(2, u.levels.length - 1), r);
    const k = problemKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// ---------- 문제 점검 (시험에서 씀) ----------
function checkFrac(f, errs, where) {
  if (!Number.isInteger(f.w) || !Number.isInteger(f.n) || !Number.isInteger(f.d)) errs.push(`${where}: 정수가 아님`);
  if (f.d < 1) errs.push(`${where}: 분모 < 1`);
  if (f.w < 0 || f.n < 0) errs.push(`${where}: 음수`);
  if (f.w > 0 && f.n >= f.d) errs.push(`${where}: 대분수의 분수 부분이 진분수가 아님`);
}
function checkDec(x, errs, where) {
  if (!Number.isInteger(x.i) || x.i <= 0) errs.push(`${where}: 소수가 0 이하`);
  if (x.p !== 1 && x.p !== 2) errs.push(`${where}: 소수 자릿수 ${x.p}`);
}
function checkNum(x, errs, where) {
  if (x.t === 'f') checkFrac(x, errs, where);
  else if (x.t === 'd') checkDec(x, errs, where);
  else errs.push(`${where}: 수 모양이 아님`);
}

export function tickValue(line, k) { return add(line.start, Q(line.step.n * k, line.step.d)); }

export function validate(p) {
  const errs = [];
  const unitsOk = (u) => Number.isInteger(u) && u >= 1 && u <= MAX_UNITS;
  const fracModel = p.model === 'pizza' || p.model === 'bar';
  const decModel = p.model === 'bar10' || p.model === 'grid100';
  const modelOk = (x) => (x.t === 'f' && (fracModel || x.d === 10 || x.d === 100)) || (x.t === 'd' && decModel);
  if (p.kind === 'make') {
    checkNum(p.target, errs, 'target');
    if (!modelOk(p.target)) errs.push('모델과 수 모양이 안 맞음');
    if (!unitsOk(p.units)) errs.push(`units ${p.units}`);
    const v = val(p.target);
    if (v.n <= 0) errs.push('0 이하');
    if (cmp(v, Q(p.units)) > 0) errs.push('칠할 칸이 모자람');
    if (p.model === 'pizza') {
      if (p.target.t !== 'f' || p.target.d < 2 || p.target.d > MAX_DEN) errs.push('피자 분모 범위');
      if (p.cells !== null && p.cells !== p.target.d) errs.push('피자 조각 수');
    } else if (p.cells !== (p.model === 'bar10' ? 10 : 100)) errs.push('칸 수');
    if (countOf(v, p.model === 'pizza' ? p.target.d : p.cells) === null) errs.push('칸으로 나타낼 수 없음');
    if (p.write && !['mixed', 'improper', 'dec', 'frac'].includes(p.write)) errs.push('write');
    if (p.write === 'mixed' && !(p.target.w === 0 && p.target.n >= p.target.d)) errs.push('대분수로 바꿀 가분수가 아님');
    if (p.write === 'improper' && !(p.target.w > 0 && p.target.n > 0)) errs.push('가분수로 바꿀 대분수가 아님');
    if (p.write === 'dec' && p.target.t !== 'f') errs.push('소수로 쓸 분수가 아님');
    if (p.write === 'frac' && p.target.t !== 'd') errs.push('분수로 쓸 소수가 아님');
    if (p.model === 'pizza' && p.target.t === 'f' && p.units > 1 && p.target.w === 0 && p.target.n < p.target.d) errs.push('진분수인데 피자가 여러 판');
    if (p.story === 'rest' && !eq(add(val(p.eaten), v), Q(1))) errs.push('먹은 양 + 남은 양 ≠ 1');
  } else if (p.kind === 'compare') {
    checkNum(p.a, errs, 'a'); checkNum(p.b, errs, 'b');
    if (!modelOk(p.a) || !modelOk(p.b)) errs.push('모델과 수 모양이 안 맞음');
    if (!unitsOk(p.units)) errs.push(`units ${p.units}`);
    const va = val(p.a), vb = val(p.b);
    if (cmp(va, Q(p.units)) > 0 || cmp(vb, Q(p.units)) > 0) errs.push('막대가 모자람');
    if (p.model === 'bar') {
      const unit = p.a.n === 1 && p.b.n === 1 && p.a.w === 0 && p.b.w === 0;
      if (p.a.d !== p.b.d && !unit) errs.push('분모가 다른데 단위분수도 아님');
      if (p.a.d > MAX_DEN || p.b.d > MAX_DEN) errs.push('분모가 너무 큼');
    }
    if (eq(va, vb) && JSON.stringify(p.a) === JSON.stringify(p.b)) errs.push('똑같은 두 수');
    if (countOf(va, p.cellsA) === null || countOf(vb, p.cellsB) === null) errs.push('칸으로 나타낼 수 없음');
  } else if (p.kind === 'op') {
    checkNum(p.a, errs, 'a'); checkNum(p.b, errs, 'b');
    if (!modelOk(p.a) || !modelOk(p.b)) errs.push('모델과 수 모양이 안 맞음');
    if (p.model === 'bar' && p.a.d !== p.b.d) errs.push('분모가 다름');
    const res = p.op === '+' ? add(val(p.a), val(p.b)) : sub(val(p.a), val(p.b));
    if (res.n <= 0) errs.push('답이 0 이하');
    if (!unitsOk(p.units)) errs.push(`units ${p.units}`);
    if (cmp(p.op === '+' ? res : val(p.a), Q(p.units)) > 0) errs.push('막대가 모자람');
    if (countOf(val(p.a), p.cells) === null || countOf(val(p.b), p.cells) === null) errs.push('칸으로 나타낼 수 없음');
    if (p.model !== 'bar' && (p.a.t !== 'd' || p.b.t !== 'd')) errs.push('소수 계산인데 소수가 아님');
  } else if (p.kind === 'line-place' || p.kind === 'line-cards') {
    const { line } = p;
    if (!Number.isInteger(line.count) || line.count < 2 || line.count > 20) errs.push(`눈금 수 ${line.count}`);
    const labelKs = new Set(p.labels.map((l) => l.k));
    p.labels.forEach((l) => { if (!eq(val(l.num), tickValue(line, l.k))) errs.push(`눈금 이름이 틀림 ${l.k}`); });
    const targets = p.kind === 'line-place' ? [p.target] : p.cards.map((c) => c.num);
    targets.forEach((num, i) => {
      checkNum(num, errs, `target${i}`);
      let hits = 0;
      for (let k = 0; k <= line.count; k++) if (eq(tickValue(line, k), val(num))) {
        hits++;
        if (k === 0 || k === line.count) errs.push('끝 눈금이 답');
        if (labelKs.has(k)) errs.push('이름이 붙은 눈금이 답');
      }
      if (hits !== 1) errs.push(`답 눈금이 ${hits}개`);
    });
    if (p.kind === 'line-cards') {
      if (new Set(p.points).size !== p.points.length) errs.push('점이 겹침');
      p.cards.forEach((c) => {
        const at = p.points.filter((k) => eq(tickValue(line, k), val(c.num))).length;
        if (at !== 1) errs.push(`카드 ${c.id}가 갈 점이 ${at}개`);
      });
      const fr = p.cards.filter((c) => c.num.t === 'f').length;
      if (fr !== p.points.length || p.cards.length !== 2 * p.points.length) errs.push('카드 수');
    }
  } else errs.push(`모르는 종류 ${p.kind}`);
  return errs;
}
