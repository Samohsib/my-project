// 시험용 '따로 만든' 풀이기들.
// 앱 안의 풀이기(js/core/*)와 코드를 나누지 않고 가장 단순한 방법으로 다시 짰다.
// 그래야 생성기와 앱 풀이기가 같은 실수를 해도 시험에서 걸러진다.
// 모두 해를 limit개까지만 센다.

// ---------- 스도쿠: 칸마다 1..n을 넣어 보는 되추적 ----------
export function countSudoku(givens, n, boxH, boxW, limit = 2) {
  const g = givens.slice();
  const ok = (i, v) => {
    const r = Math.floor(i / n), c = i % n;
    for (let k = 0; k < n; k++) {
      if (k !== c && g[r * n + k] === v) return false;
      if (k !== r && g[k * n + c] === v) return false;
    }
    const br = r - (r % boxH), bc = c - (c % boxW);
    for (let rr = br; rr < br + boxH; rr++) for (let cc = bc; cc < bc + boxW; cc++) {
      if ((rr !== r || cc !== c) && g[rr * n + cc] === v) return false;
    }
    return true;
  };
  for (let i = 0; i < n * n; i++) if (g[i] && !ok(i, g[i])) return { count: 0, solutions: [] };
  const solutions = [];
  const rec = () => {
    if (solutions.length >= limit) return;
    // 넣을 수 있는 숫자가 가장 적은 빈칸부터
    let best = -1, bestVals = null;
    for (let i = 0; i < n * n; i++) {
      if (g[i]) continue;
      const vals = [];
      for (let v = 1; v <= n; v++) if (ok(i, v)) vals.push(v);
      if (!vals.length) return;
      if (!bestVals || vals.length < bestVals.length) { best = i; bestVals = vals; }
    }
    if (best < 0) { solutions.push(g.slice()); return; }
    for (const v of bestVals) { g[best] = v; rec(); g[best] = 0; if (solutions.length >= limit) return; }
  };
  rec();
  return { count: solutions.length, solutions };
}

// ---------- 부등호: 칸 순서대로 되추적 ----------
export function countFutoshiki(givens, n, ineqs, limit = 2) {
  const g = givens.slice();
  const ok = (i) => {
    const v = g[i], r = Math.floor(i / n), c = i % n;
    for (let k = 0; k < n; k++) {
      if (k !== c && g[r * n + k] === v) return false;
      if (k !== r && g[k * n + c] === v) return false;
    }
    for (const [lo, hi] of ineqs) {
      if ((lo === i || hi === i) && g[lo] && g[hi] && !(g[lo] < g[hi])) return false;
    }
    return true;
  };
  for (let i = 0; i < n * n; i++) if (g[i] && !ok(i)) return { count: 0, solutions: [] };
  const solutions = [];
  const rec = (i) => {
    if (solutions.length >= limit) return;
    if (i === n * n) { solutions.push(g.slice()); return; }
    if (givens[i]) { rec(i + 1); return; }
    for (let v = 1; v <= n; v++) {
      g[i] = v;
      if (ok(i)) rec(i + 1);
      if (solutions.length >= limit) break;
    }
    g[i] = 0;
  };
  rec(0);
  return { count: solutions.length, solutions };
}

// ---------- 네모로직: 가로줄마다 가능한 칠하기를 모두 만들어 위에서부터 쌓기 ----------
function runs(line) {
  const out = []; let k = 0;
  for (const v of line) { if (v) k++; else if (k) { out.push(k); k = 0; } }
  if (k) out.push(k);
  return out;
}

function rowPatterns(clue, w) {
  const out = [];
  const build = (j, start, acc) => {
    if (j === clue.length) { const line = acc.slice(); for (let q = start; q < w; q++) line[q] = 0; out.push(line); return; }
    const rest = clue.slice(j + 1).reduce((a, b) => a + b + 1, 0);
    for (let s = start; s + clue[j] + rest <= w; s++) {
      const line = acc.slice();
      for (let q = start; q < s; q++) line[q] = 0;
      for (let q = s; q < s + clue[j]; q++) line[q] = 1;
      if (s + clue[j] < w) line[s + clue[j]] = 0;
      build(j + 1, s + clue[j] + 1, line);
    }
  };
  build(0, 0, new Array(w).fill(0));
  return out;
}

// 세로줄의 위쪽 일부(prefix)가 단서와 아직 어긋나지 않는지
function columnPrefixOk(prefix, clue, total) {
  const done = []; let open = 0;
  for (const v of prefix) { if (v) open++; else if (open) { done.push(open); open = 0; } }
  for (let k = 0; k < done.length; k++) if (done[k] !== clue[k]) return false;
  const j = done.length;
  if (open) { if (j >= clue.length || open > clue[j]) return false; }
  // 남은 칸에 남은 묶음이 들어갈 자리가 있는지
  const left = total - prefix.length;
  let need;
  if (open) {
    const rest = clue.slice(j + 1);
    need = (clue[j] - open) + rest.reduce((a, b) => a + b + 1, 0);
  } else {
    const rest = clue.slice(j);
    need = rest.length ? rest.reduce((a, b) => a + b + 1, 0) - 1 : 0;
  }
  return need <= left;
}

export function countNonogram(rows, cols, w, h, limit = 2) {
  const patterns = rows.map((clue) => rowPatterns(clue, w));
  const picked = [];
  const solutions = [];
  const rec = (r) => {
    if (solutions.length >= limit) return;
    if (r === h) {
      for (let c = 0; c < w; c++) {
        const col = picked.map((row) => row[c]);
        const got = runs(col);
        if (got.length !== cols[c].length || got.some((x, k) => x !== cols[c][k])) return;
      }
      solutions.push(picked.flat());
      return;
    }
    for (const p of patterns[r]) {
      picked.push(p);
      let fine = true;
      for (let c = 0; c < w && fine; c++) fine = columnPrefixOk(picked.map((row) => row[c]), cols[c], h);
      if (fine) rec(r + 1);
      picked.pop();
      if (solutions.length >= limit) return;
    }
  };
  rec(0);
  return { count: solutions.length, solutions };
}
