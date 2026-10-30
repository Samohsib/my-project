// 부등호 퍼즐: 가로줄·세로줄에 1..n이 한 번씩, 칸 사이 부등호를 지킨다.
// 부등호는 [작은 칸, 큰 칸] 쌍으로 저장한다. 두 칸은 늘 가로나 세로로 이웃한다.

import { bit, popcount, bitsToValues } from './sudoku.js';

const lowValue = (m) => 31 - Math.clz32(m & -m) + 1;
const highValue = (m) => 32 - Math.clz32(m);
const below = (v) => (1 << (v - 1)) - 1; // v보다 작은 숫자들
const above = (v, all) => all & ~((1 << v) - 1); // v보다 큰 숫자들

const geoCache = new Map();
export function latinGeometry(n) {
  if (geoCache.has(n)) return geoCache.get(n);
  const N = n * n, rows = [], cols = [];
  for (let k = 0; k < n; k++) { rows.push([]); cols.push([]); }
  for (let i = 0; i < N; i++) { rows[Math.floor(i / n)].push(i); cols[i % n].push(i); }
  const peers = [];
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / n), c = i % n;
    peers.push([...rows[r], ...cols[c]].filter((j) => j !== i));
  }
  const geo = { n, N, rows, cols, units: [...rows, ...cols], peers, all: (1 << n) - 1 };
  geoCache.set(n, geo);
  return geo;
}

// 이웃한 두 칸 쌍 전부 (가로 쌍 다음 세로 쌍)
export function adjacentPairs(n) {
  const out = [];
  for (let r = 0; r < n; r++) for (let c = 0; c + 1 < n; c++) out.push([r * n + c, r * n + c + 1]);
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c < n; c++) out.push([r * n + c, (r + 1) * n + c]);
  return out;
}

function randomLatin(n, rng) {
  const geo = latinGeometry(n);
  const g = new Array(geo.N).fill(0);
  (function rec(i) {
    if (i === geo.N) return true;
    let used = 0;
    for (const p of geo.peers[i]) if (g[p]) used |= bit(g[p]);
    for (const v of rng.shuffle(bitsToValues(geo.all & ~used))) {
      g[i] = v;
      if (rec(i + 1)) return true;
    }
    g[i] = 0;
    return false;
  })(0);
  return g;
}

// ---------- 논리로 후보 줄이기 ----------
// 규칙 세 가지만 쓴다(아이가 쓰는 생각과 같다):
//  · 이미 정해진 숫자는 같은 줄의 다른 칸 후보에서 뺀다.
//  · 한 줄에서 어떤 숫자가 들어갈 곳이 한 칸뿐이면 거기에 넣는다.
//  · 작은 칸 < 큰 칸이면, 작은 칸은 큰 칸의 가장 큰 후보보다 작아야 하고, 큰 칸은 작은 칸의 가장 작은 후보보다 커야 한다.
// useHidden=false, useIneq=false로 일부 규칙만 쓸 수도 있다(힌트 설명용).
export function propagate(puzzle, grid, { useHidden = true, useIneq = true } = {}) {
  const { n, ineqs } = puzzle;
  const geo = latinGeometry(n);
  const cand = new Array(geo.N);
  for (let i = 0; i < geo.N; i++) cand[i] = grid[i] ? bit(grid[i]) : geo.all;
  const done = new Array(geo.N).fill(false);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < geo.N; i++) {
      const m = cand[i];
      if (m === 0) return { cand, ok: false, solved: false };
      if (!done[i] && (m & (m - 1)) === 0) {
        done[i] = true;
        for (const p of geo.peers[i]) if (cand[p] & m) { cand[p] &= ~m; changed = true; }
      }
    }
    if (useHidden) {
      for (const unit of geo.units) {
        let once = 0, twice = 0;
        for (const i of unit) { twice |= once & cand[i]; once |= cand[i]; }
        if (once !== geo.all) return { cand, ok: false, solved: false };
        let hidden = once & ~twice;
        while (hidden) {
          const b = hidden & -hidden; hidden &= hidden - 1;
          const i = unit.find((j) => cand[j] & b);
          if (cand[i] !== b) { cand[i] = b; changed = true; }
        }
      }
    }
    if (useIneq) {
      for (const [lo, hi] of ineqs) {
        if (!cand[lo] || !cand[hi]) return { cand, ok: false, solved: false };
        const a = cand[lo] & below(highValue(cand[hi]));
        const b = cand[hi] & above(lowValue(cand[lo]), geo.all);
        if (a !== cand[lo] || b !== cand[hi]) { cand[lo] = a; cand[hi] = b; changed = true; }
      }
    }
  }
  const ok = cand.every((m) => m !== 0);
  return { cand, ok, solved: ok && cand.every((m) => (m & (m - 1)) === 0) };
}

export function solveLogically(puzzle) {
  const r = propagate(puzzle, puzzle.givens);
  return { ...r, grid: r.cand.map((m) => (m && (m & (m - 1)) === 0 ? lowValue(m) : 0)) };
}

// ---------- 해 개수 세기 ----------
export function countSolutions(puzzle, limit = 2) {
  const { n, ineqs } = puzzle;
  const geo = latinGeometry(n);
  const g = puzzle.givens.slice();
  const less = Array.from({ length: geo.N }, () => []); // less[i]: i보다 커야 하는 칸들
  const more = Array.from({ length: geo.N }, () => []); // more[i]: i보다 작아야 하는 칸들
  for (const [lo, hi] of ineqs) { less[lo].push(hi); more[hi].push(lo); }
  const allowed = (i) => {
    let m = geo.all;
    for (const p of geo.peers[i]) if (g[p]) m &= ~bit(g[p]);
    for (const h of less[i]) if (g[h]) m &= below(g[h]);
    for (const l of more[i]) if (g[l]) m &= above(g[l], geo.all);
    return m;
  };
  for (let i = 0; i < geo.N; i++) if (g[i] && !(allowed(i) & bit(g[i]))) return 0;
  let count = 0;
  (function rec() {
    if (count >= limit) return;
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < geo.N; i++) {
      if (g[i]) continue;
      const m = allowed(i), c = popcount(m);
      if (c === 0) return;
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; }
    }
    if (best < 0) { count++; return; }
    for (const v of bitsToValues(bestMask)) {
      g[best] = v;
      rec();
      if (count >= limit) break;
    }
    g[best] = 0;
  })();
  return count;
}

// ---------- 판 만들기 ----------
// 정답 라틴 방진에서 출발해, 모든 숫자와 모든 부등호를 준 상태에서 하나씩 빼 본다.
// 위 '논리로 후보 줄이기'만으로 끝까지 풀리는 동안만 뺀다 → 해가 하나뿐이고 추측이 필요 없다.
export function generateFutoshiki(rng, n, { minGivens = 0, minIneqs = 0 } = {}) {
  const solution = randomLatin(n, rng);
  const givens = solution.slice();
  const pairs = adjacentPairs(n).map(([a, b]) => (solution[a] < solution[b] ? [a, b] : [b, a]));
  const keep = new Array(pairs.length).fill(true);
  const make = () => ({ kind: 'futoshiki', n, givens, ineqs: pairs.filter((_, k) => keep[k]), solution });

  let givenCount = givens.length;
  for (const i of rng.shuffle([...givens.keys()])) {
    if (givenCount <= minGivens) break;
    const v = givens[i];
    givens[i] = 0;
    if (solveLogically(make()).solved) givenCount--;
    else givens[i] = v;
  }
  let ineqCount = pairs.length;
  for (const k of rng.shuffle([...pairs.keys()])) {
    if (ineqCount <= minIneqs) break;
    keep[k] = false;
    if (solveLogically(make()).solved) ineqCount--;
    else keep[k] = true;
  }
  return make();
}

// ---------- 정답 판정 ----------
export function checkFutoshiki(grid, puzzle) {
  const { n, ineqs, givens } = puzzle;
  const geo = latinGeometry(n);
  const conflicts = new Set();
  for (const unit of geo.units) {
    const seen = new Map();
    for (const i of unit) {
      const v = grid[i];
      if (!v) continue;
      if (seen.has(v)) { conflicts.add(i); conflicts.add(seen.get(v)); } else seen.set(v, i);
    }
  }
  const brokenIneqs = [];
  ineqs.forEach(([lo, hi], k) => {
    if (grid[lo] && grid[hi] && !(grid[lo] < grid[hi])) brokenIneqs.push(k);
  });
  let complete = true, valid = true;
  for (let i = 0; i < geo.N; i++) {
    const v = grid[i];
    if (!Number.isInteger(v) || v < 0 || v > n) valid = false;
    if (!v) complete = false;
    if (givens && givens[i] && givens[i] !== v) valid = false;
  }
  return {
    complete,
    conflicts: [...conflicts],
    brokenIneqs,
    solved: complete && valid && conflicts.size === 0 && brokenIneqs.length === 0,
  };
}

// ---------- 힌트 ----------
export function futoshikiHint(grid, puzzle, preferCell = -1) {
  const { n, solution } = puzzle;
  const geo = latinGeometry(n);
  const wrong = [];
  for (let i = 0; i < geo.N; i++) if (grid[i] && grid[i] !== solution[i]) wrong.push(i);
  if (wrong.length) return { type: 'wrong', cells: wrong };
  const empties = [];
  for (let i = 0; i < geo.N; i++) if (!grid[i]) empties.push(i);
  if (!empties.length) return null;
  if (preferCell >= 0 && !grid[preferCell]) {
    empties.splice(empties.indexOf(preferCell), 1);
    empties.unshift(preferCell);
  }
  const single = (m) => m && (m & (m - 1)) === 0;

  // 줄 규칙만으로 알 수 있는 칸
  const latinOnly = propagate(puzzle, grid, { useHidden: false, useIneq: false });
  for (const i of empties) if (single(latinOnly.cand[i])) return { type: 'naked', cell: i, value: lowValue(latinOnly.cand[i]), usesIneq: false };
  // 줄 규칙 + 부등호로 후보가 하나 남는 칸
  const noHidden = propagate(puzzle, grid, { useHidden: false });
  for (const i of empties) if (single(noHidden.cand[i])) return { type: 'naked', cell: i, value: lowValue(noHidden.cand[i]), usesIneq: true };
  // 한 줄에서 그 숫자가 갈 곳이 한 칸뿐인 경우
  for (const i of empties) {
    const r = Math.floor(i / n), c = i % n;
    for (const v of bitsToValues(noHidden.cand[i])) {
      for (const [unitType, unit, index] of [['row', geo.rows[r], r], ['col', geo.cols[c], c]]) {
        if (unit.filter((j) => noHidden.cand[j] & bit(v)).length === 1) return { type: 'hidden', cell: i, value: v, unitType, unitIndex: index };
      }
    }
  }
  return { type: 'reveal', cell: empties[0], value: solution[empties[0]] };
}

// 화면에 그리기 좋게: 가로 쌍은 '<' 또는 '>', 세로 쌍은 '^'(위가 작다) 또는 'v'(아래가 작다)
export function ineqSymbols(puzzle) {
  const { n, ineqs } = puzzle;
  return ineqs.map(([lo, hi]) => {
    const a = Math.min(lo, hi), b = Math.max(lo, hi);
    const horizontal = b - a === 1;
    const sym = horizontal ? (lo === a ? '<' : '>') : (lo === a ? '^' : 'v');
    return { a, b, r: Math.floor(a / n), c: a % n, horizontal, sym };
  });
}
