// 칠하는 판: 피자(원), 막대, 10칸 막대, 10×10 모눈.
// 손가락으로 누르거나 문지르면 칠해지고, 칠한 칸을 다시 문지르면 지워진다.
// 빼기 문제(cross 모드)에서는 칠해 둔 칸을 눌러 ✕ 표시를 한다.
export const EMPTY = 0, GIVEN = 1, PAINT = 2, CROSS = 3;
const NS = 'http://www.w3.org/2000/svg';
const STATE_CLASS = ['', 'given', 'paint', 'cross'];

const GEOM = {
  pizza: { w: 230, h: 230, gap: 26 },
  bar: { w: 640, h: 86, gap: 20 },
  bar10: { w: 640, h: 86, gap: 20 },
  grid100: { w: 300, h: 372, gap: 30 }, // 위: '한 판 모두' 단추(34), 모눈(300), 아래: 줄 단추(30)
};
const MAX_PX = { pizza: 380, bar: 110, bar10: 110, grid100: 470 }; // 한 개가 너무 커지지 않게 (세로 기준)

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

const f1 = (x) => Math.round(x * 10) / 10;

export class Board {
  constructor({ model, units, cells, given = 0, mode = 'paint', tone = 'a', layout = 'auto', interactive = true, onChange = null, states = null, numbers = false, tag = '' }) {
    this.model = model;
    this.units = units;
    this.cells = cells;
    this.mode = mode;
    this.layoutKind = layout;
    this.interactive = interactive;
    this.onChange = onChange;
    this.numbers = numbers;
    this.tone = tone;
    this.root = document.createElement('div');
    this.root.className = `board board-${model} tone-${tone}`;
    if (tag) this.root.dataset.board = tag;
    this.svg = el('svg', { class: 'board-svg', role: 'img' }, this.root);
    this.given = given;
    this.reset(states);
    if (interactive) this.bindTouch();
    this.box = { w: 600, h: 400 };
    this.render();
  }

  reset(states = null) {
    const n = this.units * this.cells;
    this.state = new Int8Array(n);
    if (states) this.state.set(states.slice(0, n));
    else for (let i = 0; i < Math.min(this.given, n); i++) this.state[i] = GIVEN;
  }

  setCells(cells) {
    this.cells = cells;
    this.reset();
    this.render();
    this.changed();
  }

  count(kind = this.mode === 'cross' ? CROSS : PAINT) {
    let c = 0;
    for (const s of this.state) if (s === kind) c++;
    return c;
  }

  changed() { if (this.onChange) this.onChange(this.count(), this); }

  // ---- 배치 ----
  fit(w, h) {
    this.box = { w: Math.max(80, w), h: Math.max(60, h) };
    this.render();
  }

  // 설명 그림의 모눈은 위아래 단추 자리가 필요 없다
  geom() {
    const g = GEOM[this.model];
    return this.model === 'grid100' && !this.interactive ? { ...g, h: 300 } : g;
  }

  arrange() {
    const g = this.geom();
    const n = this.units;
    const options = [];
    if (this.layoutKind === 'row') options.push(n);
    else if (this.layoutKind === 'col') options.push(1);
    else for (let c = 1; c <= n; c++) options.push(c);
    let best = null;
    for (const cols of options) {
      const rows = Math.ceil(n / cols);
      const tw = cols * g.w + (cols - 1) * g.gap;
      const th = rows * g.h + (rows - 1) * g.gap;
      const s = Math.min(this.box.w / (tw + 8), this.box.h / (th + 8), MAX_PX[this.model] / GEOM[this.model].h);
      if (!best || s > best.s + 1e-9) best = { cols, rows, tw, th, s };
    }
    return best;
  }

  unitOrigin(u, a) {
    const g = this.geom();
    const col = u % a.cols, row = Math.floor(u / a.cols);
    return [col * (g.w + g.gap), row * (g.h + g.gap)];
  }

  // ---- 그리기 ----
  render() {
    const svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const a = this.arrange();
    svg.setAttribute('viewBox', `-4 -4 ${f1(a.tw + 8)} ${f1(a.th + 8)}`);
    svg.style.width = `${Math.floor((a.tw + 8) * a.s)}px`;
    svg.style.height = `${Math.floor((a.th + 8) * a.s)}px`;
    this.cellEls = new Array(this.state.length);
    for (let u = 0; u < this.units; u++) {
      const [ox, oy] = this.unitOrigin(u, a);
      const gU = el('g', { transform: `translate(${ox} ${oy})`, class: 'unit', 'data-u': u }, svg);
      if (this.model === 'pizza') this.drawPizza(gU, u);
      else if (this.model === 'grid100') this.drawGrid(gU, u);
      else this.drawBar(gU, u);
    }
    this.refresh();
  }

  cellGroup(parent, i) {
    const g = el('g', { class: 'cell', 'data-i': i }, parent);
    this.cellEls[i] = g;
    return g;
  }

  drawPizza(gU, u) {
    const k = this.cells;
    const cx = 115, cy = 115, R = 104, r = 92;
    el('circle', { cx, cy, r: R, class: 'crust' }, gU);
    for (let c = 0; c < k; c++) {
      const i = u * k + c;
      const g = this.cellGroup(gU, i);
      if (k === 1) {
        el('circle', { cx, cy, r, class: 'shape' }, g);
      } else {
        const a0 = (c / k) * 2 * Math.PI - Math.PI / 2;
        const a1 = ((c + 1) / k) * 2 * Math.PI - Math.PI / 2;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        el('path', {
          class: 'shape',
          d: `M${cx} ${cy} L${f1(cx + r * Math.cos(a0))} ${f1(cy + r * Math.sin(a0))} A${r} ${r} 0 ${large} 1 ${f1(cx + r * Math.cos(a1))} ${f1(cy + r * Math.sin(a1))} Z`,
        }, g);
      }
      // 칠하면 보이는 토핑 (조각 가운데쯤)
      const am = ((c + 0.5) / k) * 2 * Math.PI - Math.PI / 2;
      const dist = k === 1 ? 0 : k <= 2 ? r * 0.5 : r * 0.62;
      const tx = cx + dist * Math.cos(am), ty = cy + dist * Math.sin(am);
      const tr = Math.max(5, Math.min(15, 70 / k + 3));
      el('circle', { cx: f1(tx), cy: f1(ty), r: f1(tr), class: 'top' }, g);
      if (k <= 4) { // 조각이 크면 작은 토핑 둘을 더 (조각 안쪽, 가운데 각도 양옆)
        const half = Math.PI / k;
        [-0.45, 0.45].forEach((t) => {
          const a = am + t * half, rr = r * 0.82;
          el('circle', { cx: f1(cx + rr * Math.cos(a)), cy: f1(cy + rr * Math.sin(a)), r: f1(tr * 0.5), class: 'top' }, g);
        });
      }
      this.cross(g, tx, ty, tr + 6);
      if (this.numbers) el('text', { x: f1(tx), y: f1(ty + 7), class: 'num-label' }, g).textContent = '';
    }
    // 나눈 선
    if (k > 1) for (let c = 0; c < k; c++) {
      const a0 = (c / k) * 2 * Math.PI - Math.PI / 2;
      el('line', { x1: cx, y1: cy, x2: f1(cx + r * Math.cos(a0)), y2: f1(cy + r * Math.sin(a0)), class: 'cut' }, gU);
    }
    el('circle', { cx, cy, r, class: 'rim' }, gU);
  }

  drawBar(gU, u) {
    const { w, h } = GEOM[this.model];
    const k = this.cells;
    const cw = w / k;
    for (let c = 0; c < k; c++) {
      const i = u * k + c;
      const g = this.cellGroup(gU, i);
      el('rect', { x: f1(c * cw), y: 0, width: f1(cw), height: h, class: 'shape' }, g);
      this.cross(g, c * cw + cw / 2, h / 2, Math.min(cw, h) * 0.32);
      if (this.numbers) el('text', { x: f1(c * cw + cw / 2), y: h / 2 + 9, class: 'num-label' }, g);
    }
    el('rect', { x: 0, y: 0, width: w, height: h, rx: 6, class: 'frame' }, gU);
  }

  drawGrid(gU, u) {
    const top = this.interactive ? 34 : 0, size = 300, cs = 30;
    if (this.interactive) {
      const wb = el('g', { class: 'whole-btn', 'data-whole': u }, gU);
      el('rect', { x: 60, y: 0, width: 180, height: 28, rx: 14 }, wb);
      el('text', { x: 150, y: 20 }, wb).textContent = '한 판 모두 (1)';
    }
    for (let c = 0; c < 10; c++) for (let r = 0; r < 10; r++) {
      const i = u * 100 + c * 10 + r;
      const g = this.cellGroup(gU, i);
      el('rect', { x: c * cs, y: top + r * cs, width: cs, height: cs, class: 'shape' }, g);
      this.cross(g, c * cs + cs / 2, top + r * cs + cs / 2, 9);
    }
    for (let c = 1; c < 10; c++) el('line', { x1: c * cs, y1: top, x2: c * cs, y2: top + size, class: 'col-line' }, gU);
    el('rect', { x: 0, y: top, width: size, height: size, class: 'frame' }, gU);
    if (this.interactive) for (let c = 0; c < 10; c++) {
      const t = el('g', { class: 'col-btn', 'data-col': `${u}:${c}` }, gU);
      el('rect', { x: c * cs + 2, y: top + size + 6, width: cs - 4, height: 26, rx: 6 }, t);
      el('text', { x: c * cs + cs / 2, y: top + size + 24 }, t).textContent = '▲';
    }
  }

  cross(g, x, y, s) {
    el('path', { class: 'x', d: `M${f1(x - s)} ${f1(y - s)} L${f1(x + s)} ${f1(y + s)} M${f1(x + s)} ${f1(y - s)} L${f1(x - s)} ${f1(y + s)}` }, g);
  }

  refresh() {
    for (let i = 0; i < this.state.length; i++) {
      const g = this.cellEls[i];
      if (!g) continue;
      const cls = STATE_CLASS[this.state[i]];
      g.setAttribute('class', cls ? `cell ${cls}` : 'cell');
    }
  }

  // 설명 그림용: 칸에 번호 달기
  label(i, textValue) {
    const t = this.cellEls[i]?.querySelector('.num-label');
    if (t) t.textContent = textValue;
  }

  // ---- 손가락 ----
  bindTouch() {
    const svg = this.svg;
    svg.style.touchAction = 'none';
    this.drag = null;
    svg.addEventListener('pointerdown', (e) => this.down(e));
    this._move = (e) => this.move(e);
    this._up = (e) => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    window.addEventListener('pointermove', this._move, { passive: false });
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  destroy() {
    if (this._move) {
      window.removeEventListener('pointermove', this._move);
      window.removeEventListener('pointerup', this._up);
      window.removeEventListener('pointercancel', this._up);
    }
  }

  setEnabled(on) {
    this.interactiveOn = on;
    this.root.classList.toggle('locked', !on);
  }

  down(e) {
    if (this.interactiveOn === false) return;
    const t = e.target;
    const whole = t.closest('[data-whole]');
    const col = t.closest('[data-col]');
    e.preventDefault();
    if (whole) return this.toggleRange(Number(whole.dataset.whole) * 100, 100);
    if (col) {
      const [u, c] = col.dataset.col.split(':').map(Number);
      return this.toggleRange(u * 100 + c * 10, 10);
    }
    const cell = t.closest('.cell');
    if (!cell) return;
    const i = Number(cell.dataset.i);
    const s = this.state[i];
    let action = null;
    if (this.mode === 'paint') action = s === EMPTY ? 'paint' : s === PAINT ? 'erase' : null;
    else action = s === GIVEN ? 'cross' : s === CROSS ? 'uncross' : null;
    if (!action) return;
    this.drag = { id: e.pointerId, action };
    this.apply(i);
  }

  move(e) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    e.preventDefault();
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    const cell = hit && hit.closest && hit.closest('.cell');
    if (!cell || !this.svg.contains(cell)) return;
    this.apply(Number(cell.dataset.i));
  }

  apply(i) {
    const s = this.state[i];
    const a = this.drag.action;
    let next = s;
    if (a === 'paint' && s === EMPTY) next = PAINT;
    else if (a === 'erase' && s === PAINT) next = EMPTY;
    else if (a === 'cross' && s === GIVEN) next = CROSS;
    else if (a === 'uncross' && s === CROSS) next = GIVEN;
    if (next === s) return;
    this.state[i] = next;
    const cls = STATE_CLASS[next];
    this.cellEls[i].setAttribute('class', cls ? `cell ${cls}` : 'cell');
    this.changed();
  }

  // 모눈 한 줄(0.1) 또는 한 판(1)을 한 번에
  toggleRange(start, len) {
    const idx = [];
    for (let i = start; i < start + len && i < this.state.length; i++) idx.push(i);
    if (this.mode === 'paint') {
      const free = idx.filter((i) => this.state[i] !== GIVEN);
      if (!free.length) return;
      const full = free.every((i) => this.state[i] === PAINT);
      free.forEach((i) => { this.state[i] = full ? EMPTY : PAINT; });
    } else {
      const mine = idx.filter((i) => this.state[i] === GIVEN || this.state[i] === CROSS);
      if (!mine.length) return;
      const full = mine.every((i) => this.state[i] === CROSS);
      mine.forEach((i) => { this.state[i] = full ? GIVEN : CROSS; });
    }
    this.refresh();
    this.changed();
  }
}
