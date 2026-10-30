// 숫자를 넣는 판: 스도쿠와 부등호 퍼즐이 함께 쓴다.
// 칸을 누르고 → 숫자 단추를 누른다. 메모를 켜면 작은 후보 숫자를 적는다.

import { h, josa, listWithJosa } from './dom.js';
import { icon, chevron } from './art.js';
import { geometry, checkSudoku, sudokuHint, bit } from '../core/sudoku.js';
import { latinGeometry, checkFutoshiki, futoshikiHint, ineqSymbols } from '../core/futoshiki.js';

const UNIT_NAME = { row: '가로줄', col: '세로줄', box: '굵은 네모' };
const FUTO_GAP = 0.46; // 칸 크기에 대한 부등호 자리 크기

export function createNumberBoard(api) {
  const { puzzle, state } = api;
  const isSudoku = puzzle.kind === 'sudoku';
  const n = puzzle.n, N = n * n;
  const geo = isSudoku ? geometry(n) : latinGeometry(n);
  const fixed = puzzle.givens.map(Boolean);
  const syms = isSudoku ? [] : ineqSymbols(puzzle);
  let sel = state.v.findIndex((v, i) => !v && !fixed[i]);
  let memoMode = false;
  let flash = null; // { cells:Set, cls, unit:Set, until }
  let done = false;

  // ----- 판 그리기 -----
  const cells = [];
  const memoCols = n === 4 ? 2 : 3;
  const makeCell = (i) => {
    const memo = h('span', { class: 'memo', style: { gridTemplateColumns: `repeat(${memoCols}, 1fr)` } });
    for (let v = 1; v <= n; v++) memo.append(h('span', {}));
    const val = h('span', { class: 'val' });
    const r = Math.floor(i / n), c = i % n;
    const el = h('button', { class: 'cell', 'data-i': i, 'aria-label': `${r + 1}번째 줄 ${c + 1}번째 칸` }, val, memo);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); select(i); });
    el.addEventListener('click', (e) => { if (e.detail === 0) select(i); }); // 키보드로 누를 때
    cells[i] = { el, val, memo };
    return el;
  };

  let grid;
  const symEls = [];
  if (isSudoku) {
    grid = h('div', { class: 'ngrid sudoku-grid', role: 'grid', style: { gridTemplateColumns: `repeat(${n / geo.boxW}, 1fr)` } });
    for (const box of geo.boxes) {
      const b = h('div', { class: 'sbox', style: { gridTemplateColumns: `repeat(${geo.boxW}, 1fr)` } });
      for (const i of box) b.append(makeCell(i));
      grid.append(b);
    }
  } else {
    grid = h('div', { class: 'futo-grid', role: 'grid' });
    for (let i = 0; i < N; i++) {
      const el = makeCell(i);
      el.style.gridRow = String(2 * Math.floor(i / n) + 1);
      el.style.gridColumn = String(2 * (i % n) + 1);
      grid.append(el);
    }
    syms.forEach((s, k) => {
      const el = h('div', { class: 'sym', 'data-k': k, 'aria-label': s.sym === '<' || s.sym === '^' ? '오른쪽(아래)이 더 커요' : '왼쪽(위)이 더 커요' }, chevron(s.sym));
      el.style.gridRow = String(s.horizontal ? 2 * s.r + 1 : 2 * s.r + 2);
      el.style.gridColumn = String(s.horizontal ? 2 * s.c + 2 : 2 * s.c + 1);
      grid.append(el);
      symEls[k] = el;
    });
  }

  // ----- 숫자 단추·도구 -----
  const nums = [];
  const pad = h('div', { class: 'pad' });
  pad.style.setProperty('--cols-land', n <= 5 ? n : 3);
  pad.style.setProperty('--cols-port', n);
  for (let v = 1; v <= n; v++) {
    const b = h('button', { class: 'num', 'data-v': v, 'aria-label': `숫자 ${v}`, onclick: () => input(v) }, String(v));
    nums[v] = b;
    pad.append(b);
  }
  const memoBtn = h('button', { class: 'btn', 'aria-label': '메모', 'aria-pressed': 'false', onclick: toggleMemo }, icon('pencil'), h('span', {}, '메모'));
  const eraseBtn = h('button', { class: 'btn', 'aria-label': '지우기', onclick: erase }, icon('erase'), '지우기');

  function toggleMemo() {
    memoMode = !memoMode;
    api.sound.play('tap');
    memoBtn.classList.toggle('on', memoMode);
    memoBtn.setAttribute('aria-pressed', String(memoMode));
    pad.classList.toggle('memo-on', memoMode);
    api.coach(memoMode ? '메모를 켰어요. 숫자를 누르면 작은 글씨로 적혀요. 한 번 더 누르면 지워져요.' : '메모를 껐어요. 이제 숫자를 크게 넣어요.');
  }

  function select(i) {
    if (done) return;
    sel = i;
    api.sound.play('tap');
    refresh();
  }

  function input(v) {
    if (done) return;
    if (sel < 0) { api.coach('먼저 숫자를 넣을 칸을 눌러요.'); return; }
    if (fixed[sel]) { api.coach('처음부터 있던 숫자는 바꿀 수 없어요. 빈칸을 눌러요.'); return; }
    if (memoMode) {
      if (state.v[sel]) { api.coach('숫자가 들어 있는 칸에는 메모를 할 수 없어요. 먼저 지워요.'); return; }
      api.sound.play('tap');
      api.commit([{ i: sel, v: 0, m: state.m[sel] ^ bit(v) }]);
      return;
    }
    if (state.v[sel] === v) { // 같은 숫자를 또 누르면 지운다
      api.sound.play('undo');
      api.commit([{ i: sel, v: 0, m: 0 }]);
      return;
    }
    api.sound.play('put');
    // 숫자를 넣으면 같은 줄(네모)의 메모에서 그 숫자를 지워 준다
    const changes = [{ i: sel, v, m: 0 }];
    for (const p of geo.peers[sel]) if (state.m[p] & bit(v)) changes.push({ i: p, v: state.v[p], m: state.m[p] & ~bit(v) });
    api.commit(changes);
  }

  function erase() {
    if (done || sel < 0 || fixed[sel]) return;
    if (!state.v[sel] && !state.m[sel]) return;
    api.sound.play('undo');
    api.commit([{ i: sel, v: 0, m: 0 }]);
  }

  // ----- 화면 다시 그리기 -----
  function refresh() {
    const res = isSudoku ? checkSudoku(state.v, n) : checkFutoshiki(state.v, puzzle);
    const bad = new Set(res.conflicts);
    const brokenSyms = new Set(res.brokenIneqs || []);
    if (!isSudoku) {
      // 어긴 부등호의 두 칸도 빨갛게
      for (const k of brokenSyms) { bad.add(puzzle.ineqs[k][0]); bad.add(puzzle.ineqs[k][1]); }
    }
    const peers = new Set(sel >= 0 ? geo.peers[sel] : []);
    const selVal = sel >= 0 ? state.v[sel] : 0;
    const live = flash && flash.until > performance.now() ? flash : null;
    const counts = new Array(n + 1).fill(0);
    for (let i = 0; i < N; i++) {
      const v = state.v[i];
      counts[v]++;
      const c = cells[i];
      c.val.textContent = v ? String(v) : '';
      const m = v ? 0 : state.m[i];
      c.memo.childNodes.forEach((s, k) => { s.textContent = m & (1 << k) ? String(k + 1) : ''; });
      let cls = 'cell';
      if (fixed[i]) cls += ' given';
      if (live && live.unit.has(i)) cls += ' unit';
      else if (peers.has(i)) cls += ' peer';
      if (selVal && v === selVal && i !== sel) cls += ' same';
      if (i === sel) cls += ' sel';
      if (bad.has(i)) cls += ' bad';
      if (live && live.cells.has(i)) cls += ` ${live.cls}`;
      c.el.className = cls;
    }
    symEls.forEach((el, k) => {
      // syms와 puzzle.ineqs는 같은 순서다
      el.className = `sym${brokenSyms.has(k) ? ' bad' : ''}`;
    });
    for (let v = 1; v <= n; v++) nums[v].classList.toggle('full', counts[v] >= n);
  }

  // ----- 힌트 -----
  function hint() {
    const hres = isSudoku ? sudokuHint(state.v, puzzle, sel) : futoshikiHint(state.v, puzzle, sel);
    if (!hres) return null;
    if (hres.type === 'wrong') {
      return {
        cells: hres.cells, cls: 'wrong', tone: 'warn',
        message: hres.cells.length > 1
          ? '흔들리는 칸들의 숫자가 틀렸어요. 지우고 다시 생각해 봐요.'
          : '흔들리는 칸의 숫자가 틀렸어요. 지우고 다시 생각해 봐요.',
      };
    }
    const { cell: i, value: v } = hres;
    sel = i;
    const changes = [{ i, v, m: 0 }];
    for (const p of geo.peers[i]) if (state.m[p] & bit(v)) changes.push({ i: p, v: state.v[p], m: state.m[p] & ~bit(v) });
    let unit = [], message;
    if (hres.type === 'naked' && (isSudoku || !hres.usesIneq)) {
      const seen = [...new Set(geo.peers[i].map((p) => state.v[p]).filter(Boolean))].sort((a, b) => a - b);
      unit = geo.peers[i];
      const where = isSudoku ? '가로줄, 세로줄, 굵은 네모' : '가로줄과 세로줄';
      message = `이 칸의 ${where}에 ${listWithJosa(seen, '이/가')} 벌써 있어요. 그래서 이 칸은 ${josa(v, '이에요/예요')}!`;
    } else if (hres.type === 'naked') {
      unit = puzzle.ineqs.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a));
      message = `줄에 있는 숫자와 옆 칸 부등호를 함께 생각하면, 이 칸에 들어갈 수 있는 숫자는 ${v}뿐이에요.`;
    } else if (hres.type === 'hidden') {
      unit = hres.unitType === 'row' ? geo.rows[hres.unitIndex] : hres.unitType === 'col' ? geo.cols[hres.unitIndex] : geo.boxes[hres.unitIndex];
      message = `이 ${UNIT_NAME[hres.unitType]}에서 ${josa(v, '이/가')} 들어갈 수 있는 칸은 여기 하나뿐이에요.`;
    } else {
      message = `이 칸에는 ${josa(v, '이/가')} 들어가요.`;
    }
    return { changes, cells: [i], unit, cls: 'hinted', message };
  }

  function flashCells(res) {
    flash = { cells: new Set(res.cells || []), unit: new Set(res.unit || []), cls: res.cls, until: performance.now() + 2600 };
    refresh();
    setTimeout(() => { if (flash && flash.until <= performance.now()) { flash = null; refresh(); } }, 2700);
  }

  // ----- 크기 맞추기 -----
  function layout(w, hgt) {
    if (!w || !hgt) return;
    if (isSudoku) {
      const size = Math.floor(Math.min(w, hgt, 760));
      const cell = (size - 8 - 4 * (n / geo.boxW - 1)) / n;
      grid.style.width = grid.style.height = `${size}px`;
      grid.style.setProperty('--cell', `${cell}px`);
      grid.style.setProperty('--memo-scale', memoCols === 2 ? '0.34' : '0.26');
      grid.querySelectorAll('.sbox').forEach((b) => { b.style.gridTemplateRows = `repeat(${geo.boxH}, 1fr)`; });
      grid.style.gridTemplateRows = `repeat(${n / geo.boxH}, 1fr)`;
    } else {
      const units = n + (n - 1) * FUTO_GAP;
      const cell = Math.floor(Math.min(w, hgt, 700) / units);
      const gap = Math.floor(cell * FUTO_GAP);
      const tracks = Array.from({ length: 2 * n - 1 }, (_, k) => (k % 2 ? `${gap}px` : `${cell}px`)).join(' ');
      grid.style.gridTemplateColumns = tracks;
      grid.style.gridTemplateRows = tracks;
      grid.style.setProperty('--cell', `${cell}px`);
      grid.style.setProperty('--memo-scale', memoCols === 2 ? '0.3' : '0.24');
    }
  }

  // 키보드 (컴퓨터에서 시험할 때 편하게)
  const onKey = (e) => {
    if (done || e.target.closest?.('input,textarea')) return;
    const v = Number(e.key);
    if (v >= 1 && v <= n) { input(v); e.preventDefault(); return; }
    if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') { erase(); e.preventDefault(); return; }
    if (e.key === 'm' || e.key === 'M') { toggleMemo(); return; }
    const move = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (move) {
      const base = sel < 0 ? 0 : sel;
      const next = base + move;
      if (next >= 0 && next < N && (Math.abs(move) === n || Math.floor(next / n) === Math.floor(base / n))) select(next);
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', onKey);

  const intro = isSudoku
    ? `빈칸을 누르고 숫자를 골라요. 가로줄, 세로줄, 굵은 네모 안에 1부터 ${n}까지 한 번씩!`
    : `빈칸을 누르고 숫자를 골라요. 줄마다 1부터 ${n}까지 한 번씩, 부등호도 지켜요!`;

  return {
    el: grid,
    panel(undoBtn, hintBtn) {
      return [pad, h('div', { class: 'tools' }, memoBtn, eraseBtn, undoBtn, hintBtn)];
    },
    layout,
    refresh,
    hint,
    flash: flashCells,
    intro: () => intro,
    check() {
      return isSudoku ? checkSudoku(state.v, n, puzzle.givens).solved : checkFutoshiki(state.v, puzzle).solved;
    },
    setSolved() {
      done = true;
      sel = -1;
      refresh();
      [memoBtn, eraseBtn, ...nums.filter(Boolean)].forEach((b) => { b.disabled = true; });
    },
    afterUndo(changed) { if (changed.length) { sel = changed[0]; refresh(); } },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}
