// 스도쿠: 판 만들기, 풀기, 정답 판정, 힌트.
// 칸 번호는 i = 줄 * n + 칸. 값 0은 빈칸, 1..n은 숫자.
// 후보 숫자는 비트로 나타낸다: 숫자 v → 1 << (v - 1)

const BOX = { 4: [2, 2], 6: [2, 3], 9: [3, 3] }; // [굵은 네모의 줄 수, 칸 수]

const geoCache = new Map();

export function geometry(n) {
  if (geoCache.has(n)) return geoCache.get(n);
  if (!BOX[n]) throw new Error(`지원하지 않는 크기: ${n}`);
  const [boxH, boxW] = BOX[n];
  const N = n * n;
  const rows = [], cols = [], boxes = [];
  for (let k = 0; k < n; k++) { rows.push([]); cols.push([]); boxes.push([]); }
  const boxOf = new Array(N);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      const b = Math.floor(r / boxH) * (n / boxW) + Math.floor(c / boxW);
      rows[r].push(i); cols[c].push(i); boxes[b].push(i); boxOf[i] = b;
    }
  }
  const units = [...rows, ...cols, ...boxes];
  const peers = [];
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / n), c = i % n;
    const set = new Set([...rows[r], ...cols[c], ...boxes[boxOf[i]]]);
    set.delete(i);
    peers.push([...set]);
  }
  const geo = { n, N, boxH, boxW, rows, cols, boxes, boxOf, units, peers, all: (1 << n) - 1 };
  geoCache.set(n, geo);
  return geo;
}

export const bit = (v) => 1 << (v - 1);
export function popcount(m) { let c = 0; while (m) { m &= m - 1; c++; } return c; }
export function bitsToValues(m) {
  const out = [];
  for (let v = 1; m; v++, m >>= 1) if (m & 1) out.push(v);
  return out;
}
const lowValue = (m) => 31 - Math.clz32(m & -m) + 1; // 가장 작은 후보 숫자

// 지금 판에서 칸 i에 들어갈 수 있는 숫자들(비트)
export function candidates(grid, geo, i) {
  let used = 0;
  for (const p of geo.peers[i]) if (grid[p]) used |= bit(grid[p]);
  return geo.all & ~used;
}

// ---------- 빈 판을 무작위로 꽉 채우기 (정답 만들기) ----------
function fillRandom(grid, geo, rng) {
  let best = -1, bestMask = 0, bestCount = 99;
  for (let i = 0; i < geo.N; i++) {
    if (grid[i]) continue;
    const m = candidates(grid, geo, i);
    const c = popcount(m);
    if (c === 0) return false;
    if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c === 1) break; }
  }
  if (best < 0) return true;
  for (const v of rng.shuffle(bitsToValues(bestMask))) {
    grid[best] = v;
    if (fillRandom(grid, geo, rng)) return true;
  }
  grid[best] = 0;
  return false;
}

// ---------- 해 개수 세기 (limit개까지만) ----------
export function countSolutions(givens, n, limit = 2) {
  const geo = geometry(n);
  const grid = givens.slice();
  // 처음부터 겹치는 숫자가 있으면 해가 없다
  for (let i = 0; i < geo.N; i++) {
    if (grid[i] && (candidates(grid, geo, i) & bit(grid[i])) === 0) return 0;
  }
  let count = 0;
  (function rec() {
    if (count >= limit) return;
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < geo.N; i++) {
      if (grid[i]) continue;
      const m = candidates(grid, geo, i);
      const c = popcount(m);
      if (c === 0) return;
      if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c === 1) break; }
    }
    if (best < 0) { count++; return; }
    for (let m = bestMask; m; m &= m - 1) {
      grid[best] = lowValue(m);
      rec();
      if (count >= limit) break;
    }
    grid[best] = 0;
  })();
  return count;
}

// ---------- 사람처럼 풀기: '여기엔 이 숫자뿐'(naked) + '이 숫자는 여기뿐'(hidden)만 써서 ----------
// 추측 없이 이 두 방법만으로 끝까지 풀리면 해가 하나뿐이고, 아이도 논리로 풀 수 있다.
export function solveWithSingles(givens, n) {
  const geo = geometry(n);
  const g = givens.slice();
  const cand = new Array(geo.N).fill(0);
  for (let i = 0; i < geo.N; i++) {
    if (!g[i]) cand[i] = candidates(g, geo, i);
    else if ((candidates(g, geo, i) & bit(g[i])) === 0) return { grid: g, solved: false, ok: false };
  }
  const place = (i, v) => {
    g[i] = v; cand[i] = 0;
    const b = bit(v);
    for (const p of geo.peers[i]) cand[p] &= ~b;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < geo.N; i++) {
      if (g[i]) continue;
      const m = cand[i];
      if (m === 0) return { grid: g, solved: false, ok: false };
      if ((m & (m - 1)) === 0) { place(i, lowValue(m)); changed = true; }
    }
    for (const unit of geo.units) {
      let once = 0, twice = 0, placed = 0;
      for (const i of unit) {
        if (g[i]) { placed |= bit(g[i]); continue; }
        twice |= once & cand[i];
        once |= cand[i];
      }
      if ((once | placed) !== geo.all) return { grid: g, solved: false, ok: false };
      let hidden = once & ~twice & ~placed;
      while (hidden) {
        const b = hidden & -hidden; hidden &= hidden - 1;
        const i = unit.find((j) => !g[j] && (cand[j] & b));
        if (i !== undefined) { place(i, lowValue(b)); changed = true; }
      }
    }
  }
  const solved = g.every((v) => v > 0);
  return { grid: g, solved, ok: true };
}

// ---------- 판 만들기 ----------
// 꽉 찬 정답에서 점대칭으로 두 칸씩 지우되, 위의 '사람처럼 풀기'로 풀리는 동안만 지운다.
export function generateSudoku(rng, n, targetGivens) {
  const geo = geometry(n);
  const solution = new Array(geo.N).fill(0);
  fillRandom(solution, geo, rng);
  const puzzle = solution.slice();
  const order = [];
  for (let i = 0; i < geo.N; i++) if (i <= geo.N - 1 - i) order.push(i);
  rng.shuffle(order);
  let givens = geo.N;
  for (const i of order) {
    const j = geo.N - 1 - i;
    const cells = i === j ? [i] : [i, j];
    if (givens - cells.length < targetGivens) continue;
    const saved = cells.map((k) => puzzle[k]);
    for (const k of cells) puzzle[k] = 0;
    if (solveWithSingles(puzzle, n).solved) givens -= cells.length;
    else cells.forEach((k, t) => { puzzle[k] = saved[t]; });
  }
  return { kind: 'sudoku', n, boxH: geo.boxH, boxW: geo.boxW, givens: puzzle, solution };
}

// ---------- 정답 판정 ----------
// 규칙으로 판정한다: 빈칸이 없고, 모든 가로줄·세로줄·굵은 네모에 같은 숫자가 두 번 나오지 않으면 성공.
export function checkSudoku(grid, n, givens = null) {
  const geo = geometry(n);
  const conflicts = new Set();
  for (const unit of geo.units) {
    const seen = new Map();
    for (const i of unit) {
      const v = grid[i];
      if (!v) continue;
      if (seen.has(v)) { conflicts.add(i); conflicts.add(seen.get(v)); }
      else seen.set(v, i);
    }
  }
  let complete = true, valid = true;
  for (let i = 0; i < geo.N; i++) {
    const v = grid[i];
    if (!Number.isInteger(v) || v < 0 || v > n) valid = false;
    if (!v) complete = false;
    if (givens && givens[i] && givens[i] !== v) valid = false;
  }
  return { complete, conflicts: [...conflicts], solved: complete && valid && conflicts.size === 0 };
}

// ---------- 힌트 ----------
// 1) 틀린 숫자가 있으면 그 칸을 알려 준다.
// 2) 아니면 지금 논리로 바로 알 수 있는 칸 하나를 찾아 이유와 함께 알려 준다.
export function sudokuHint(grid, puzzle, preferCell = -1) {
  const { n, solution } = puzzle;
  const geo = geometry(n);
  const wrong = [];
  for (let i = 0; i < geo.N; i++) if (grid[i] && grid[i] !== solution[i]) wrong.push(i);
  if (wrong.length) return { type: 'wrong', cells: wrong };

  const empties = [];
  for (let i = 0; i < geo.N; i++) if (!grid[i]) empties.push(i);
  if (!empties.length) return null;

  const nakedAt = (i) => {
    const m = candidates(grid, geo, i);
    return popcount(m) === 1 ? { type: 'naked', cell: i, value: lowValue(m) } : null;
  };
  const hiddenAt = (i) => {
    const m = candidates(grid, geo, i);
    const r = Math.floor(i / n), c = i % n;
    const tries = [['box', geo.boxes[geo.boxOf[i]], geo.boxOf[i]], ['row', geo.rows[r], r], ['col', geo.cols[c], c]];
    for (const v of bitsToValues(m)) {
      for (const [unitType, unit, index] of tries) {
        const spots = unit.filter((j) => !grid[j] && (candidates(grid, geo, j) & bit(v)));
        if (spots.length === 1) return { type: 'hidden', cell: i, value: v, unitType, unitIndex: index };
      }
    }
    return null;
  };

  if (preferCell >= 0 && !grid[preferCell]) {
    const h = nakedAt(preferCell) || hiddenAt(preferCell);
    if (h) return h;
  }
  for (const i of empties) { const h = nakedAt(i); if (h) return h; }
  for (const i of empties) { const h = hiddenAt(i); if (h) return h; }
  const i = preferCell >= 0 && !grid[preferCell] ? preferCell : empties[0];
  return { type: 'reveal', cell: i, value: solution[i] };
}
