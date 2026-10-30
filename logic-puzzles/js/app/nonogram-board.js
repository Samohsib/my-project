// 네모로직 판: 손가락으로 누르면 칠하고, 쭉 밀면 한 줄을 이어서 칠한다.
// '칠하기'와 'X 표시' 두 가지 손 모드가 있다.

import { h, ordinal } from './dom.js';
import { icon } from './art.js';
import { checkNonogram, nonogramHint } from '../core/nonogram.js';

const CLUE_UNIT = 0.62; // 단서 숫자 하나가 차지하는 폭(칸 크기 기준)

export function createNonogramBoard(api) {
  const { puzzle, state } = api;
  const { w, h: hgt, rows, cols } = puzzle;
  let mode = 'fill';
  let done = false;
  let cell = 40;
  let focus = -1;      // 줄 강조할 칸
  let flash = null;
  let drag = null;
  let lastDone = { rows: [], cols: [] };

  // ----- 판 짜기 -----
  const corner = h('div', { class: 'corner' });
  const colBox = h('div', { class: 'col-clues' });
  const rowBox = h('div', { class: 'row-clues' });
  const cellBox = h('div', { class: 'cells', role: 'grid' });
  const root = h('div', { class: 'nono', style: { '--pic': puzzle.color } }, corner, colBox, rowBox, cellBox);
  const colEls = cols.map((clue, c) => h('div', { class: 'col-clue', 'data-c': c, 'aria-label': `${c + 1}번째 세로줄: ${clue.join(' ')}` }, clue.map((x) => h('span', {}, String(x)))));
  const rowEls = rows.map((clue, r) => h('div', { class: 'row-clue', 'data-r': r, 'aria-label': `${r + 1}번째 가로줄: ${clue.join(' ')}` }, clue.map((x) => h('span', {}, String(x)))));
  colBox.append(...colEls);
  rowBox.append(...rowEls);
  const cellEls = [];
  for (let i = 0; i < w * hgt; i++) {
    const r = Math.floor(i / w), c = i % w;
    let cls = 'nc';
    if ((c + 1) % 5 === 0 && c !== w - 1) cls += ' mr';
    if ((r + 1) % 5 === 0 && r !== hgt - 1) cls += ' mb';
    const el = h('div', { class: cls, 'data-i': i });
    el.dataset.base = cls;
    cellEls.push(el);
    cellBox.append(el);
  }

  // ----- 손가락 입력 -----
  function hit(e, clamp) {
    // 칸 간격 = 칸 크기 + 틈 1px, 시작점은 테두리 안쪽
    const rect = cellBox.getBoundingClientRect();
    let c = Math.floor((e.clientX - rect.left - cellBox.clientLeft) / (cell + 1));
    let r = Math.floor((e.clientY - rect.top - cellBox.clientTop) / (cell + 1));
    if (clamp) { c = Math.max(0, Math.min(w - 1, c)); r = Math.max(0, Math.min(hgt - 1, r)); }
    else if (c < 0 || r < 0 || c >= w || r >= hgt) return -1;
    return r * w + c;
  }

  function applyRange(cur) {
    const r0 = Math.floor(drag.start / w), c0 = drag.start % w;
    const r1 = Math.floor(cur / w), c1 = cur % w;
    if (!drag.axis && (r1 !== r0 || c1 !== c0)) drag.axis = Math.abs(r1 - r0) > Math.abs(c1 - c0) ? 'col' : 'row';
    const range = new Set([drag.start]);
    if (drag.axis === 'row') {
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) range.add(r0 * w + c);
    } else if (drag.axis === 'col') {
      for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) range.add(r * w + c0);
    }
    for (const j of drag.touched) if (!range.has(j)) state.v[j] = drag.orig[j];
    for (const j of range) if (drag.orig[j] === drag.src) state.v[j] = drag.tgt;
    drag.touched = range;
    focus = drag.axis === 'row' ? r0 * w + (cur % w) : drag.axis === 'col' ? r1 * w + c0 : drag.start;
    refresh();
  }

  cellBox.addEventListener('pointerdown', (e) => {
    if (done || drag) return;
    const i = hit(e, false);
    if (i < 0) return;
    e.preventDefault();
    try { cellBox.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    const src = state.v[i];
    const tgt = mode === 'fill' ? (src === 1 ? 0 : 1) : (src === 2 ? 0 : 2);
    drag = { id: e.pointerId, start: i, src, tgt, axis: null, orig: state.v.slice(), touched: new Set(), last: i };
    api.sound.play(tgt === 1 ? 'fill' : 'tap');
    applyRange(i);
  });
  cellBox.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const i = hit(e, true);
    if (i === drag.last) return;
    drag.last = i;
    applyRange(i);
  });
  const end = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const changes = [];
    for (const j of drag.touched) if (state.v[j] !== drag.orig[j]) changes.push({ i: j, v: state.v[j] });
    for (const j of drag.touched) state.v[j] = drag.orig[j]; // 되돌린 다음 한 번에 기록한다 (되돌리기 한 번에 한 획)
    drag = null;
    if (!api.commit(changes)) refresh();
  };
  cellBox.addEventListener('pointerup', end);
  cellBox.addEventListener('pointercancel', end);

  // ----- 도구 -----
  const fillBtn = h('button', { class: 'btn on', 'aria-label': '칠하기', 'aria-pressed': 'true', onclick: () => setMode('fill') }, icon('fill'), '칠하기');
  const crossBtn = h('button', { class: 'btn', 'aria-label': 'X 표시', 'aria-pressed': 'false', onclick: () => setMode('cross') }, icon('cross'), 'X 표시');
  const clearBtn = h('button', { class: 'btn', 'aria-label': '모두 지우기', onclick: clearAll }, icon('erase'), '모두 지우기');
  function setMode(m) {
    if (done) return;
    mode = m;
    api.sound.play('tap');
    fillBtn.classList.toggle('on', m === 'fill');
    crossBtn.classList.toggle('on', m === 'cross');
    fillBtn.setAttribute('aria-pressed', String(m === 'fill'));
    crossBtn.setAttribute('aria-pressed', String(m === 'cross'));
    api.coach(m === 'fill' ? '칠하기 모드예요. 칠할 칸을 누르거나 쭉 밀어요.' : 'X 표시 모드예요. 비워 둘 칸에 X를 쳐 두면 헷갈리지 않아요.');
  }
  function clearAll() {
    if (done) return;
    const changes = [];
    state.v.forEach((v, i) => { if (v) changes.push({ i, v: 0 }); });
    if (!changes.length) return;
    api.sound.play('undo');
    api.commit(changes);
    api.coach('모두 지웠어요. 잘못 지웠으면 되돌리기를 눌러요.');
  }

  // ----- 다시 그리기 -----
  function refresh() {
    const res = checkNonogram(state.v, puzzle);
    const live = flash && flash.until > performance.now() ? flash : null;
    const fr = focus >= 0 ? Math.floor(focus / w) : -1, fc = focus >= 0 ? focus % w : -1;
    for (let i = 0; i < w * hgt; i++) {
      const r = Math.floor(i / w), c = i % w;
      let cls = `${cellEls[i].dataset.base} v${state.v[i]}`;
      if (!done && (r === fr || c === fc)) cls += ' lane';
      if (live && live.cells.has(i)) cls += ` ${live.cls}`;
      cellEls[i].className = cls;
    }
    rowEls.forEach((el, r) => { el.className = `row-clue${res.rowsDone[r] ? ' done' : ''}${(live && live.row === r) || (!live && r === fr && !done) ? ' focus' : ''}`; });
    colEls.forEach((el, c) => { el.className = `col-clue${res.colsDone[c] ? ' done' : ''}${(live && live.col === c) || (!live && c === fc && !done) ? ' focus' : ''}`; });
    // 새로 맞은 줄이 있으면 '띵'
    if (!drag && lastDone.rows.length) {
      const newly = res.rowsDone.some((d, r) => d && !lastDone.rows[r]) || res.colsDone.some((d, c) => d && !lastDone.cols[c]);
      if (newly && !res.solved) api.sound.play('line');
    }
    if (!drag) lastDone = { rows: res.rowsDone, cols: res.colsDone };
    return res;
  }

  // ----- 힌트 -----
  function hint() {
    const res = nonogramHint(state.v, puzzle, focus);
    if (!res) return null;
    if (res.type === 'wrong') {
      return {
        cells: res.cells, cls: 'wrong', tone: 'warn',
        message: '빨갛게 흔들리는 칸이 틀렸어요. 칠한 칸이나 X를 다시 살펴봐요.',
      };
    }
    focus = res.cell;
    const v = res.value === 1 ? 1 : 2;
    if (res.type === 'line') {
      const clue = (res.axis === 'row' ? rows : cols)[res.index].join(' ');
      const where = res.axis === 'row' ? `위에서 ${ordinal(res.index)} 가로줄` : `왼쪽에서 ${ordinal(res.index)} 세로줄`;
      const what = v === 1 ? '이 칸은 꼭 칠해야 해요.' : '이 칸은 비워 두는 칸이라 X를 쳤어요.';
      return {
        changes: [{ i: res.cell, v }], cells: [res.cell], cls: 'hinted',
        row: res.axis === 'row' ? res.index : -1, col: res.axis === 'col' ? res.index : -1,
        message: `${where}(숫자 ${clue})을 보세요. ${what}`,
      };
    }
    return { changes: [{ i: res.cell, v }], cells: [res.cell], cls: 'hinted', message: '이 칸을 칠해 봐요.' };
  }

  function flashCells(res) {
    flash = { cells: new Set(res.cells || []), cls: res.cls, row: res.row ?? -1, col: res.col ?? -1, until: performance.now() + 2600 };
    refresh();
    setTimeout(() => { if (flash && flash.until <= performance.now()) { flash = null; refresh(); } }, 2700);
  }

  // ----- 크기 맞추기 -----
  function layout(aw, ah) {
    if (!aw || !ah) return;
    const mr = Math.max(1, ...rows.map((c) => c.length));
    const mc = Math.max(1, ...cols.map((c) => c.length));
    const pad = 0.5;
    cell = Math.floor(Math.min(aw / (w + mr * CLUE_UNIT + pad), ah / (hgt + mc * CLUE_UNIT + pad), 96));
    const clueW = Math.ceil(cell * (mr * CLUE_UNIT + pad));
    const clueH = Math.ceil(cell * (mc * CLUE_UNIT + pad));
    root.style.setProperty('--cell', `${cell}px`);
    root.style.gridTemplateColumns = `${clueW}px auto`;
    root.style.gridTemplateRows = `${clueH}px auto`;
    const track = `repeat(${w}, ${cell}px)`;
    cellBox.style.gridTemplateColumns = track;
    cellBox.style.gridTemplateRows = `repeat(${hgt}, ${cell}px)`;
    // 단서 칸을 판의 칸과 줄 맞춤 (테두리 3px, 틈 1px)
    colBox.style.gridTemplateColumns = track;
    colBox.style.columnGap = '1px';
    colBox.style.padding = '0 3px';
    rowBox.style.gridTemplateRows = `repeat(${hgt}, ${cell}px)`;
    rowBox.style.rowGap = '1px';
    rowBox.style.padding = '3px 0';
  }

  // 다 푼 그림 작게
  function picture() {
    const px = Math.max(6, Math.floor(180 / Math.max(w, hgt)));
    const pic = h('div', { class: 'pic', style: { gridTemplateColumns: `repeat(${w}, ${px}px)`, gridTemplateRows: `repeat(${hgt}, ${px}px)` } });
    puzzle.solution.forEach((v) => pic.append(h('i', { style: { background: v ? puzzle.color : '#f1eee6' } })));
    return pic;
  }

  return {
    el: root,
    panel(undoBtn, hintBtn) {
      return [h('div', { class: 'seg' }, fillBtn, crossBtn), h('div', { class: 'tools', style: { gridTemplateColumns: 'repeat(3, 1fr)' } }, undoBtn, hintBtn, clearBtn)];
    },
    layout,
    refresh,
    hint,
    flash: flashCells,
    picture,
    intro: () => '숫자를 보고 칸을 칠해요. 다 맞게 칠하면 숨은 그림이 나타나요!',
    check: () => checkNonogram(state.v, puzzle).solved,
    setSolved() {
      done = true;
      focus = -1;
      root.classList.add('solved');
      refresh();
      [fillBtn, crossBtn, clearBtn].forEach((b) => { b.disabled = true; });
    },
    afterUndo(changed) { if (changed.length) focus = changed[0]; refresh(); },
  };
}
