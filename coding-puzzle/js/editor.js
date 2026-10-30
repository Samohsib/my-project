// 블록 편집기
//  - 블록 상자의 블록을 누르면(탭) 노란 줄(넣을 곳)에 들어간다.
//  - 블록을 끌어다 원하는 곳에 놓을 수도 있다. 프로그램 밖으로 끌어내면 빠진다.
//  - 손가락(터치)·펜·마우스 모두 Pointer Events 하나로 처리한다.
import { BLOCK_ICONS } from './art.js';
import { CONDITIONS, REPEAT_MIN, REPEAT_MAX, countBlocks } from './engine.js';

export const LABELS = {
  F: '앞으로', L: '왼쪽으로 돌기', R: '오른쪽으로 돌기', rep: '번 반복', P: '나만의 블록', if: '만약',
};
const PALETTE_ORDER = ['F', 'L', 'R', 'rep', 'if', 'P'];
const CONTAINER_SLOTS = { rep: ['body'], if: ['then', 'else'] };
const DRAG_START = 9;      // 이만큼(px) 움직이면 끌기 시작
const MAX_BLOCKS = 60;
const UNDO_MAX = 60;

let uid = 0;
const newId = () => `b${++uid}`;

const clone = o => JSON.parse(JSON.stringify(o));

function withIds(list) {
  return (list || []).map(b => {
    const nb = { ...b, id: newId() };
    for (const slot of CONTAINER_SLOTS[b.k] || []) nb[slot] = withIds(b[slot]);
    return nb;
  });
}

function h(tag, cls, html) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

export class Editor {
  // root: 편집기 전체, palette/workspace: 그 안의 영역
  constructor({ palette, workspace, pick, onChange, onMessage, sfx }) {
    this.paletteEl = palette;
    this.ws = workspace;
    this.pick = pick;           // (제목, [{value,label}], 지금 값) → Promise<value|null>
    this.onChange = onChange;   // 프로그램이 바뀌면
    this.onMessage = onMessage; // 아이에게 한마디
    this.sfx = sfx;
    this.locked = false;
    this.drag = null;
    this.bindPointer();
  }

  load(level, saved) {
    this.level = level;
    this.allowFn = level.blocks.includes('P');
    const prog = saved || { main: [], fn: [] };
    this.prog = { main: withIds(prog.main), fn: this.allowFn ? withIds(prog.fn) : [] };
    this.undoStack = [];
    this.cursor = { list: 'main', index: this.prog.main.length };
    this.renderPalette();
    this.render();
  }

  get program() { return this.prog; }
  get count() { return countBlocks(this.prog); }
  get canUndo() { return this.undoStack.length > 0; }

  // ── 프로그램 다루기 ──
  listOf(ref) {
    if (ref === 'main') return this.prog.main;
    if (ref === 'fn') return this.prog.fn;
    const [id, slot] = ref.split(':');
    const f = this.find(id);
    return f ? f.block[slot] : null;
  }

  find(id, list = null, ref = null) {
    if (!list) return this.find(id, this.prog.main, 'main') || this.find(id, this.prog.fn, 'fn');
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === id) return { block: b, list, index: i, ref };
      for (const slot of CONTAINER_SLOTS[b.k] || []) {
        const r = this.find(id, b[slot], `${b.id}:${slot}`);
        if (r) return r;
      }
    }
    return null;
  }

  // ref 목록을 품고 있는 블록 id들 (안쪽 → 바깥), 그리고 맨 바깥이 main인지 fn인지
  ancestry(ref) {
    const ids = [];
    while (ref !== 'main' && ref !== 'fn') {
      const id = ref.split(':')[0];
      ids.push(id);
      const f = this.find(id);
      if (!f) break;
      ref = f.ref;
    }
    return { ids, root: ref };
  }

  snapshot() {
    this.undoStack.push(clone(this.prog));
    if (this.undoStack.length > UNDO_MAX) this.undoStack.shift();
  }

  changed() {
    this.render();
    this.onChange?.();
  }

  makeBlock(kind) {
    const b = { id: newId(), k: kind };
    if (kind === 'rep') { b.n = 3; b.body = []; }
    if (kind === 'if') { b.c = (this.level.conds || ['wall'])[0]; b.then = []; b.else = []; }
    return b;
  }

  // 놓을 수 있는지 확인. 안 되면 아이에게 할 말을 돌려준다
  whyNot(block, ref) {
    const { ids, root } = this.ancestry(ref);
    if (ids.includes(block.id)) return '블록을 자기 안에 넣을 수는 없어요.';
    const hasP = b => b.k === 'P' || (CONTAINER_SLOTS[b.k] || []).some(s => b[s].some(hasP));
    if (root === 'fn' && hasP(block)) return '나만의 블록 안에는 ★ 나만의 블록을 넣을 수 없어요.';
    return null;
  }

  insert(kind, ref = this.cursor.list, index = this.cursor.index) {
    if (this.count >= MAX_BLOCKS) { this.onMessage?.('블록이 너무 많아요! 반복을 써서 줄여 볼까요?'); return false; }
    const list = this.listOf(ref);
    if (!list) return false;
    const b = this.makeBlock(kind);
    const no = this.whyNot(b, ref);
    if (no) { this.onMessage?.(no); return false; }
    this.snapshot();
    index = Math.max(0, Math.min(index, list.length));
    list.splice(index, 0, b);
    // 반복·만약을 넣으면 그 안으로 넣을 곳이 옮겨 간다
    this.cursor = CONTAINER_SLOTS[kind] ? { list: `${b.id}:${CONTAINER_SLOTS[kind][0]}`, index: 0 } : { list: ref, index: index + 1 };
    this.changed();
    this.flash(b.id);
    return true;
  }

  remove(id) {
    const f = this.find(id);
    if (!f) return;
    this.snapshot();
    f.list.splice(f.index, 1);
    const { ids } = this.ancestry(this.cursor.list);
    if (ids.includes(id) || !this.listOf(this.cursor.list)) this.cursor = { list: 'main', index: this.prog.main.length };
    else if (this.cursor.list === f.ref && this.cursor.index > f.index) this.cursor.index--;
    this.changed();
  }

  // index: 옮기는 블록을 뺀 뒤의 목록에서 몇 번째 자리인지
  move(id, ref, index) {
    const f = this.find(id);
    if (!f) return false;
    const no = this.whyNot(f.block, ref);
    if (no) { this.onMessage?.(no); return false; }
    if (f.ref === ref && f.index === index) { this.render(); return false; } // 제자리
    this.snapshot();
    f.list.splice(f.index, 1);
    const list = this.listOf(ref);
    index = Math.max(0, Math.min(index, list.length));
    list.splice(index, 0, f.block);
    this.cursor = { list: ref, index: index + 1 };
    this.changed();
    this.flash(id);
    return true;
  }

  setProp(id, key, value) {
    const f = this.find(id);
    if (!f || f.block[key] === value) return;
    this.snapshot();
    f.block[key] = value;
    this.changed();
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.prog = this.undoStack.pop();
    this.cursor = { list: 'main', index: this.prog.main.length };
    this.changed();
    return true;
  }

  clearAll() {
    if (!this.count) return;
    this.snapshot();
    this.prog = { main: [], fn: [] };
    this.cursor = { list: 'main', index: 0 };
    this.changed();
  }

  setCursor(ref, index) {
    const list = this.listOf(ref);
    if (!list) return;
    this.cursor = { list: ref, index: Math.max(0, Math.min(index, list.length)) };
    this.placeCaret();
  }

  setLocked(v) {
    this.locked = v;
    this.paletteEl.classList.toggle('locked', v);
    this.ws.classList.toggle('locked', v);
    if (v) this.cancelDrag();
  }

  // ── 그리기 ──
  blockFace(kind, b) {
    const ico = `<span class="ico">${BLOCK_ICONS[kind]}</span>`;
    // 블록 상자에서는 짧게
    if (!b && kind === 'rep') return `${ico}<span class="lbl">반복하기</span>`;
    if (!b && kind === 'if') return `${ico}<span class="lbl">만약 ~이면</span>`;
    if (kind === 'rep') {
      const n = b ? b.n : 3;
      return `${ico}<button class="num" type="button" aria-label="반복 횟수 ${n}번, 눌러서 바꾸기"${b ? '' : ' tabindex="-1"'}>${n}</button><span class="lbl">${LABELS.rep}</span>`;
    }
    if (kind === 'if') {
      const c = b ? b.c : (this.level.conds || ['wall'])[0];
      return `${ico}<span class="lbl">만약</span><button class="cond" type="button" aria-label="조건 바꾸기"${b ? '' : ' tabindex="-1"'}>${CONDITIONS[c]}</button>`;
    }
    return `${ico}<span class="lbl">${LABELS[kind]}</span>`;
  }

  renderPalette() {
    const items = PALETTE_ORDER.filter(k => this.level.blocks.includes(k));
    const wrap = h('div', 'pal-items');
    for (const k of items) {
      const el = h('div', `blk pal-item k-${k}`, `<div class="head">${this.blockFace(k, null)}</div>`);
      el.dataset.kind = k;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `${k === 'rep' ? '반복' : k === 'if' ? '만약' : LABELS[k]} 블록 넣기`);
      wrap.appendChild(el);
    }
    this.paletteEl.replaceChildren(h('div', 'pal-title', '블록 상자'), wrap,
      h('div', 'pal-tip', '누르면 노란 줄에 들어가요.<br>끌어다 놓아도 돼요.'));
  }

  render() {
    const top = this.ws.scrollTop;
    const sections = [['main', '▶ 실행하면']];
    if (this.allowFn) sections.push(['fn', '★ 나만의 블록은']);
    const frag = document.createDocumentFragment();
    for (const [ref, title] of sections) {
      const sec = h('div', `ws-section sec-${ref}`);
      sec.appendChild(h('div', 'ws-head', `${title}${ref === 'fn' ? ` <small>(블록 ${countBlocksIn(this.prog.fn)}개)</small>` : ''}`));
      sec.appendChild(this.listEl(this.prog[ref], ref, true));
      frag.appendChild(sec);
    }
    this.ws.replaceChildren(frag);
    this.ws.scrollTop = top;
    this.placeCaret();
  }

  listEl(list, ref, root = false) {
    const el = h('div', `list${root ? ' root' : ''}`);
    el.dataset.list = ref;
    for (const b of list) el.appendChild(this.blockEl(b));
    const end = h('div', 'end', root && !list.length
      ? (ref === 'fn' ? '나만의 블록에 넣을 블록을 여기에' : '블록을 여기에 쌓아요')
      : '');
    end.dataset.list = ref;
    el.appendChild(end);
    return el;
  }

  blockEl(b) {
    const el = h('div', `blk k-${b.k}`);
    el.dataset.id = b.id;
    const head = h('div', 'head', this.blockFace(b.k, b));
    const x = h('button', 'x', '<span>✕</span>');
    x.type = 'button';
    x.setAttribute('aria-label', '블록 빼기');
    head.appendChild(x);
    el.appendChild(head);
    if (b.k === 'rep') {
      el.appendChild(this.listEl(b.body, `${b.id}:body`));
      el.appendChild(h('div', 'foot'));
    }
    if (b.k === 'if') {
      el.appendChild(this.listEl(b.then, `${b.id}:then`));
      el.appendChild(h('div', 'else-head', '<span class="lbl">아니면</span>'));
      el.appendChild(this.listEl(b.else, `${b.id}:else`));
      el.appendChild(h('div', 'foot'));
    }
    // 버튼들
    x.addEventListener('click', e => {
      e.stopPropagation();
      if (this.locked) return;
      this.sfx?.remove();
      this.remove(b.id);
    });
    head.querySelector('.num')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (this.locked) return;
      this.sfx?.tap();
      const opts = [];
      for (let n = REPEAT_MIN; n <= REPEAT_MAX; n++) opts.push({ value: n, label: String(n) });
      const v = await this.pick('몇 번 반복할까요?', opts, b.n, 'nums');
      if (v != null) this.setProp(b.id, 'n', v);
    });
    head.querySelector('.cond')?.addEventListener('click', async e => {
      e.stopPropagation();
      if (this.locked) return;
      this.sfx?.tap();
      const opts = (this.level.conds || ['wall']).map(c => ({ value: c, label: CONDITIONS[c] }));
      const v = await this.pick('어떤 조건으로 할까요?', opts, b.c, 'conds');
      if (v != null) this.setProp(b.id, 'c', v);
    });
    return el;
  }

  listDom(ref) {
    return this.ws.querySelector(`.list[data-list="${ref}"]`);
  }

  placeCaret() {
    this.ws.querySelectorAll('.caret').forEach(c => c.remove());
    this.ws.querySelectorAll('.end.at').forEach(c => c.classList.remove('at'));
    const listEl = this.listDom(this.cursor.list);
    if (!listEl) return;
    const kids = [...listEl.children].filter(c => c.classList.contains('blk'));
    // 맨 끝이면 끝 칸을 노랗게, 블록 사이면 노란 줄을 끼워 넣는다
    if (this.cursor.index >= kids.length) {
      const end = listEl.querySelector(':scope > .end');
      end?.classList.add('at');
      this.keepVisible(end);
      return;
    }
    const caret = h('div', 'caret', '<span>여기에 넣어요</span>');
    listEl.insertBefore(caret, kids[this.cursor.index]);
    this.keepVisible(caret);
  }

  keepVisible(el) {
    if (!el || !this.ws.contains(el)) return;
    const wr = this.ws.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.bottom > wr.bottom - 8) this.ws.scrollTop += r.bottom - wr.bottom + 24;
    else if (r.top < wr.top + 8) this.ws.scrollTop -= wr.top - r.top + 24;
  }

  flash(id) {
    const el = this.ws.querySelector(`.blk[data-id="${id}"]`);
    if (!el) return;
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 400);
  }

  // ── 실행 중 빛내기 ──
  highlight(ev, total) {
    this.clearHighlight();
    if (!ev) return;
    ev.stack.forEach((id, i) => {
      const el = this.ws.querySelector(`.blk[data-id="${id}"]`);
      if (!el) return;
      el.classList.add(i === ev.stack.length - 1 ? 'hl' : 'hl-outer');
      if (i === ev.stack.length - 1) this.keepVisible(el.querySelector('.head'));
    });
    for (const [id, i] of Object.entries(ev.loops || {})) {
      const head = this.ws.querySelector(`.blk[data-id="${id}"] > .head`);
      const f = this.find(id);
      if (head && f) head.appendChild(h('span', 'badge loop', `${i}/${f.block.n}`));
    }
    if (ev.kind === 'check') {
      const head = this.ws.querySelector(`.blk[data-id="${ev.id}"] > .head`);
      if (head) head.appendChild(h('span', `badge ${ev.result ? 'yes' : 'no'}`, ev.result ? '맞아요 ✓' : '아니에요 ✗'));
    }
    if (ev.kind === 'bump') {
      this.ws.querySelector(`.blk[data-id="${ev.id}"]`)?.classList.add('hl-bad');
    }
  }

  clearHighlight() {
    this.ws.querySelectorAll('.hl, .hl-outer, .hl-bad').forEach(e => e.classList.remove('hl', 'hl-outer', 'hl-bad'));
    this.ws.querySelectorAll('.badge').forEach(e => e.remove());
  }

  // ── 누르기 · 끌기 ──
  bindPointer() {
    const onDown = e => {
      if (this.locked || this.drag) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('button')) return; // 블록 안의 버튼은 따로
      const pal = e.target.closest('.pal-item');
      const blk = !pal && e.target.closest('.blk');
      const end = !pal && !blk && e.target.closest('.end');
      if (!pal && !blk && !end) return;
      if (pal || blk) e.preventDefault();
      const src = pal || blk || end;
      this.drag = {
        pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
        kind: pal ? pal.dataset.kind : null, id: blk ? blk.dataset.id : null,
        endRef: end ? end.dataset.list : null, src, started: false,
      };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };
    const onMove = e => {
      const d = this.drag;
      if (!d || e.pointerId !== d.pointerId) return;
      d.x = e.clientX; d.y = e.clientY;
      if (!d.started) {
        if (d.endRef) return;
        if (Math.hypot(d.x - d.x0, d.y - d.y0) < DRAG_START) return;
        this.startDrag();
      }
      e.preventDefault();
      this.moveDrag();
    };
    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    const onUp = e => {
      const d = this.drag;
      if (!d || e.pointerId !== d.pointerId) return;
      finish();
      if (d.started) this.endDrag();
      else this.tap(d);
      this.drag = null;
    };
    const onCancel = e => {
      if (!this.drag || e.pointerId !== this.drag.pointerId) return;
      finish();
      this.cancelDrag();
    };
    this.paletteEl.addEventListener('pointerdown', onDown);
    this.ws.addEventListener('pointerdown', onDown);
    // 아이패드에서 길게 누르면 뜨는 메뉴 막기
    for (const el of [this.paletteEl, this.ws]) el.addEventListener('contextmenu', e => e.preventDefault());
  }

  tap(d) {
    if (d.kind) {               // 블록 상자의 블록 → 노란 줄에 넣기
      if (this.insert(d.kind)) this.sfx?.drop();
      return;
    }
    if (d.id) {                 // 쌓아 둔 블록 → 그 뒤로 노란 줄 옮기기
      const f = this.find(d.id);
      if (f) { this.sfx?.tap(); this.setCursor(f.ref, f.index + 1); }
      return;
    }
    if (d.endRef) { this.sfx?.tap(); this.setCursor(d.endRef, Infinity); }
  }

  startDrag() {
    const d = this.drag;
    d.started = true;
    const r = d.src.getBoundingClientRect();
    d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
    const ghost = d.src.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('hl', 'hl-outer', 'pop');
    ghost.style.width = `${r.width}px`;
    document.body.appendChild(ghost);
    d.ghost = ghost;
    if (d.id) d.src.classList.add('dragging-src');
    document.body.classList.add('dragging');
    this.sfx?.tap();
    const scroll = () => {
      if (!this.drag || !this.drag.started) return;
      const wr = this.ws.getBoundingClientRect();
      const { x, y } = this.drag;
      if (x > wr.left && x < wr.right) {
        if (y < wr.top + 48 && y > wr.top - 40) this.ws.scrollTop -= 9;
        else if (y > wr.bottom - 48 && y < wr.bottom + 40) this.ws.scrollTop += 9;
      }
      this.drag.raf = requestAnimationFrame(scroll);
    };
    d.raf = requestAnimationFrame(scroll);
  }

  // 손가락 아래에서 놓을 곳 찾기
  dropTarget(x, y) {
    const under = document.elementFromPoint(x, y);
    if (!under || !this.ws.contains(under)) return null;
    let list = under.closest('.list');
    if (!list) {
      // 칸 사이 빈 곳: 가장 가까운 맨 바깥 목록
      const sec = under.closest('.ws-section') || this.ws.querySelector('.ws-section');
      list = sec?.querySelector('.list.root');
      if (!list) return null;
    }
    const ref = list.dataset.list;
    const kids = [...list.children].filter(c => c.classList.contains('blk') && !c.classList.contains('dragging-src'));
    // 끌고 있는 블록은 빼고 센다
    let index = 0;
    for (const k of kids) {
      const r = k.querySelector(':scope > .head').getBoundingClientRect();
      if (y > r.top + r.height / 2) index++;
    }
    return { ref, index, list, kids };
  }

  moveDrag() {
    const d = this.drag;
    d.ghost.style.transform = `translate(${d.x - d.dx}px, ${d.y - d.dy}px)`;
    const t = this.dropTarget(d.x, d.y);
    d.target = t;
    this.ws.querySelectorAll('.drop-mark').forEach(m => m.remove());
    const block = d.id ? this.find(d.id)?.block : this.makeBlockPreview(d.kind);
    const bad = t && block ? this.whyNot(block, t.ref) : null;
    d.ghost.classList.toggle('trash', !!d.id && !t);
    d.ghost.classList.toggle('bad', !!bad);
    if (t && !bad) {
      t.list.insertBefore(h('div', 'drop-mark'), t.kids[t.index] || t.list.querySelector(':scope > .end'));
    }
  }

  makeBlockPreview(kind) {
    return { id: '__new', k: kind, body: [], then: [], else: [] };
  }

  endDrag() {
    const d = this.drag;
    const t = d.target;
    this.cleanupDrag();
    if (d.kind) {
      if (t && this.insert(d.kind, t.ref, t.index)) this.sfx?.drop();
      return;
    }
    if (d.id) {
      if (!t) { this.sfx?.remove(); this.remove(d.id); return; }
      if (this.move(d.id, t.ref, t.index)) this.sfx?.drop();
    }
  }

  cleanupDrag() {
    const d = this.drag;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    d.ghost?.remove();
    d.src?.classList.remove('dragging-src');
    document.body.classList.remove('dragging');
    this.ws.querySelectorAll('.drop-mark').forEach(m => m.remove());
  }

  cancelDrag() {
    if (!this.drag) return;
    this.cleanupDrag();
    this.drag = null;
  }
}

function countBlocksIn(list) {
  return countBlocks({ main: list, fn: [] });
}
