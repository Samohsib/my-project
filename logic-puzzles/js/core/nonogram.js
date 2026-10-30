// 네모로직: 줄마다 붙은 숫자(이어 칠한 칸 묶음의 길이)를 보고 칸을 칠한다.
// 정답 그림은 0(빈칸)/1(칠함), 풀이 중 상태는 -1(모름)/0(비움)/1(칠함).
// 플레이어 판은 0(아직 안 건드림)/1(칠함)/2(X표, 비운 칸).

// 한 줄의 단서: 이어진 1의 길이들. 비어 있으면 [].
export function lineClue(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

export function cluesOf(grid, w, h) {
  const rows = [], cols = [];
  for (let r = 0; r < h; r++) rows.push(lineClue(grid.slice(r * w, r * w + w)));
  for (let c = 0; c < w; c++) {
    const col = [];
    for (let r = 0; r < h; r++) col.push(grid[r * w + c]);
    cols.push(lineClue(col));
  }
  return { rows, cols };
}

// ---------- 한 줄 풀기 ----------
// 단서와 지금 아는 칸(-1/0/1)을 받아, 가능한 모든 배치에서 공통인 칸을 확정한다.
// 모순이면 null.
export function solveLine(clue, cells) {
  const n = cells.length, k = clue.length;
  // suffixFilled[p]: p 이후에 칠한 칸(1)이 있는가
  const filledFrom = new Array(n + 1).fill(false);
  for (let p = n - 1; p >= 0; p--) filledFrom[p] = filledFrom[p + 1] || cells[p] === 1;
  // emptyBefore[p]: [0, p) 안의 0(빈칸) 개수 누적 → 구간에 0이 있는지 빠르게 확인
  const zeros = new Array(n + 1).fill(0);
  for (let p = 0; p < n; p++) zeros[p + 1] = zeros[p] + (cells[p] === 0 ? 1 : 0);
  const fits = (s, len) => s + len <= n && zeros[s + len] - zeros[s] === 0 && (s + len === n || cells[s + len] !== 1);

  // feasible(j, p): 묶음 j..k-1을 p 이후에 놓을 수 있는가
  const memo = new Map();
  const feasible = (j, p) => {
    if (p > n) p = n;
    const key = j * (n + 2) + p;
    if (memo.has(key)) return memo.get(key);
    let ok = false;
    if (j === k) ok = !filledFrom[p];
    else {
      for (let s = p; s + clue[j] <= n; s++) {
        if (fits(s, clue[j]) && feasible(j + 1, s + clue[j] + 1)) { ok = true; break; }
        if (cells[s] === 1) break; // 칠한 칸을 건너뛸 수는 없다
      }
    }
    memo.set(key, ok);
    return ok;
  };
  if (!feasible(0, 0)) return null;

  const canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
  const seen = new Set();
  const stack = [[0, 0]];
  while (stack.length) {
    const [j, p0] = stack.pop();
    const p = Math.min(p0, n);
    const key = j * (n + 2) + p;
    if (seen.has(key)) continue;
    seen.add(key);
    if (j === k) { for (let q = p; q < n; q++) canEmpty[q] = true; continue; }
    for (let s = p; s + clue[j] <= n; s++) {
      if (fits(s, clue[j]) && feasible(j + 1, s + clue[j] + 1)) {
        for (let q = p; q < s; q++) canEmpty[q] = true;
        for (let q = s; q < s + clue[j]; q++) canFill[q] = true;
        if (s + clue[j] < n) canEmpty[s + clue[j]] = true;
        stack.push([j + 1, s + clue[j] + 1]);
      }
      if (cells[s] === 1) break;
    }
  }
  const out = cells.slice();
  for (let q = 0; q < n; q++) {
    if (canFill[q] && !canEmpty[q]) out[q] = 1;
    else if (canEmpty[q] && !canFill[q]) out[q] = 0;
    else if (!canFill[q] && !canEmpty[q]) return null;
  }
  return out;
}

// ---------- 줄 풀기만으로 판 전체 풀기 ----------
// 줄 하나씩만 보고(추측 없이) 끝까지 풀리면 해가 하나뿐이다.
export function solveByLines(puzzle, start = null) {
  const { w, h, rows, cols } = puzzle;
  const g = start ? start.slice() : new Array(w * h).fill(-1);
  const dirtyRow = new Array(h).fill(true), dirtyCol = new Array(w).fill(true);
  let progress = true;
  while (progress) {
    progress = false;
    for (let r = 0; r < h; r++) {
      if (!dirtyRow[r]) continue;
      dirtyRow[r] = false;
      const line = g.slice(r * w, r * w + w);
      const res = solveLine(rows[r], line);
      if (!res) return { grid: g, ok: false, solved: false };
      for (let c = 0; c < w; c++) if (res[c] !== line[c]) { g[r * w + c] = res[c]; dirtyCol[c] = true; progress = true; }
    }
    for (let c = 0; c < w; c++) {
      if (!dirtyCol[c]) continue;
      dirtyCol[c] = false;
      const line = [];
      for (let r = 0; r < h; r++) line.push(g[r * w + c]);
      const res = solveLine(cols[c], line);
      if (!res) return { grid: g, ok: false, solved: false };
      for (let r = 0; r < h; r++) if (res[r] !== line[r]) { g[r * w + c] = res[r]; dirtyRow[r] = true; progress = true; }
    }
  }
  return { grid: g, ok: true, solved: g.every((v) => v !== -1) };
}

// ---------- 해 개수 세기 (줄 풀기 + 갈림길에서 나눠 보기) ----------
export function countSolutions(puzzle, limit = 2) {
  let count = 0;
  const rec = (start) => {
    if (count >= limit) return;
    const res = solveByLines(puzzle, start);
    if (!res.ok) return;
    if (res.solved) { count++; return; }
    const i = res.grid.indexOf(-1);
    for (const v of [1, 0]) {
      const next = res.grid.slice();
      next[i] = v;
      rec(next);
      if (count >= limit) return;
    }
  };
  rec(null);
  return count;
}

// ---------- 그림 만들기 ----------
function smoothOnce(grid, w, h, rng) {
  const out = grid.slice();
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let on = 0, tot = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= h || cc >= w) continue;
        tot++; on += grid[rr * w + cc];
      }
      const i = r * w + c;
      if (on * 2 > tot) out[i] = 1;
      else if (on * 2 < tot) out[i] = 0;
      else out[i] = rng.chance(0.5) ? 1 : 0;
    }
  }
  return out;
}

function mirror(grid, w, h) {
  const out = grid.slice();
  for (let r = 0; r < h; r++) for (let c = 0; c < Math.floor(w / 2); c++) out[r * w + (w - 1 - c)] = out[r * w + c];
  return out;
}

const COLORS = ['#ef476f', '#f78c1f', '#e9b500', '#22a06b', '#118ab2', '#6c5ce7', '#d63384', '#0f9d8a'];

// 무작위 그림을 만들고, 줄 풀기만으로 안 풀리면 막힌 칸을 하나씩 뒤집어 고친다.
export function generateNonogram(rng, size, { density = 0.58, smooth = 0, symmetric = 0 } = {}) {
  const w = size, h = size, N = w * h;
  for (let attempt = 0; attempt < 500; attempt++) {
    let grid = Array.from({ length: N }, () => (rng.chance(density) ? 1 : 0));
    for (let s = 0; s < smooth; s++) grid = smoothOnce(grid, w, h, rng);
    const sym = rng.chance(symmetric);
    if (sym) grid = mirror(grid, w, h);
    for (let fix = 0; fix < N; fix++) {
      const filled = grid.reduce((a, b) => a + b, 0);
      if (filled < N * 0.35 || filled > N * 0.75) break;
      const { rows, cols } = cluesOf(grid, w, h);
      if (rows.some((c) => c.length === 0) || cols.some((c) => c.length === 0)) break; // 빈 줄은 재미없다
      const puzzle = { kind: 'nonogram', w, h, rows, cols };
      const res = solveByLines(puzzle);
      if (res.solved) return { ...puzzle, solution: grid, color: rng.pick(COLORS) };
      const stuck = [];
      res.grid.forEach((v, i) => { if (v === -1) stuck.push(i); });
      const i = rng.pick(stuck);
      grid = grid.slice();
      grid[i] ^= 1;
    }
  }
  throw new Error('네모로직 판을 만들지 못했어요');
}

// ---------- 정답 판정 ----------
// 칠한 칸(1)만 본다. 모든 줄의 단서와 맞으면 성공. X표(2)는 빈칸으로 친다.
export function checkNonogram(cells, puzzle) {
  const { w, h, rows, cols } = puzzle;
  const filled = cells.map((v) => (v === 1 ? 1 : 0));
  const now = cluesOf(filled, w, h);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const rowsDone = rows.map((c, r) => same(c, now.rows[r]));
  const colsDone = cols.map((c, k) => same(c, now.cols[k]));
  return { rowsDone, colsDone, solved: rowsDone.every(Boolean) && colsDone.every(Boolean) };
}

// ---------- 힌트 ----------
// 1) 잘못 칠했거나 잘못 X한 칸이 있으면 알려 준다.
// 2) 아니면 줄 하나만 보고 확실히 알 수 있는 칸을 찾아 알려 준다.
export function nonogramHint(cells, puzzle, preferCell = -1) {
  const { w, h, rows, cols, solution } = puzzle;
  const wrong = [];
  cells.forEach((v, i) => {
    if ((v === 1 && solution[i] !== 1) || (v === 2 && solution[i] !== 0)) wrong.push(i);
  });
  if (wrong.length) return { type: 'wrong', cells: wrong };
  const known = cells.map((v) => (v === 1 ? 1 : v === 2 ? 0 : -1));
  const candidatesFound = [];
  const tryLine = (axis, index) => {
    const idx = [];
    if (axis === 'row') for (let c = 0; c < w; c++) idx.push(index * w + c);
    else for (let r = 0; r < h; r++) idx.push(r * w + index);
    const line = idx.map((i) => known[i]);
    const res = solveLine(axis === 'row' ? rows[index] : cols[index], line);
    if (!res) return;
    idx.forEach((i, q) => {
      if (line[q] === -1 && res[q] !== -1) candidatesFound.push({ type: 'line', axis, index, cell: i, value: res[q] });
    });
  };
  for (let r = 0; r < h; r++) tryLine('row', r);
  for (let c = 0; c < w; c++) tryLine('col', c);
  if (candidatesFound.length) {
    // 고른 칸이 있으면 그 칸을, 아니면 칠하는 힌트를 먼저(그림이 빨리 드러난다)
    return candidatesFound.find((x) => x.cell === preferCell)
      || candidatesFound.find((x) => x.value === 1)
      || candidatesFound[0];
  }
  const i = solution.findIndex((v, k) => v === 1 && cells[k] !== 1);
  if (i < 0) return null;
  return { type: 'reveal', cell: i, value: 1 };
}
