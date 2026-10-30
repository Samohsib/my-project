// 수직선: 깃발 옮기기(flag), 카드 놓기(cards), 설명 그림(static)
import { html } from './num.js';
import { pointName } from './text.js';

const pct = (k, count) => `${(k / count) * 100}%`;

export class NumberLine {
  constructor({ line, labels, mode = 'flag', points = [], cards = [], onChange = null, marks = [] }) {
    this.line = line;
    this.mode = mode;
    this.points = points;
    this.cards = cards;
    this.onChange = onChange;
    this.tick = 0;
    this.place = {};
    this.selected = null;
    const root = (this.root = document.createElement('div'));
    root.className = `nline nline-${mode}`;
    const track = (this.track = document.createElement('div'));
    track.className = 'nl-track';
    root.appendChild(track);
    const axis = document.createElement('div');
    axis.className = 'nl-axis';
    track.appendChild(axis);
    const labelKs = new Map(labels.map((l) => [l.k, l.num]));
    for (let k = 0; k <= line.count; k++) {
      const t = document.createElement('div');
      t.className = `nl-tick${labelKs.has(k) ? ' big' : ''}`;
      t.style.left = pct(k, line.count);
      track.appendChild(t);
      if (labelKs.has(k)) this.addLabel(k, html(labelKs.get(k)), 'nl-label');
    }
    marks.forEach((m) => this.addMark(m));
    if (mode === 'flag') this.makeFlag();
    if (mode === 'cards') this.makeCards();
  }

  addLabel(k, inner, cls) {
    const l = document.createElement('div');
    l.className = cls;
    l.style.left = pct(k, this.line.count);
    l.innerHTML = inner;
    this.track.appendChild(l);
    return l;
  }

  // 설명 그림: 정답 자리(초록)와 내가 고른 자리(빨강)
  addMark({ k, cls, inner }) {
    const m = document.createElement('div');
    m.className = `nl-mark ${cls}`;
    m.style.left = pct(k, this.line.count);
    m.innerHTML = `<div class="pin"></div><div class="tag">${inner}</div>`;
    this.track.appendChild(m);
  }

  // ---- 깃발 ----
  makeFlag() {
    const f = (this.flag = document.createElement('div'));
    f.className = 'nl-flag';
    f.innerHTML = '<svg viewBox="0 0 40 70"><path d="M8 4 V68" stroke="#7a3d00" stroke-width="4" stroke-linecap="round"/><path d="M10 6 L38 15 L10 25 Z" fill="#ff6b3d" stroke="#c2410c" stroke-width="2" stroke-linejoin="round"/></svg>';
    this.track.appendChild(f);
    this.setTick(0);
    this.track.style.touchAction = 'none';
    this.track.addEventListener('pointerdown', (e) => {
      if (this.locked) return;
      e.preventDefault();
      this.dragId = e.pointerId;
      try { this.track.setPointerCapture(e.pointerId); } catch (err) { /* 일부 브라우저 */ }
      f.classList.add('drag');
      this.follow(e);
    });
    this.track.addEventListener('pointermove', (e) => { if (this.dragId === e.pointerId) { e.preventDefault(); this.follow(e); } });
    const end = (e) => {
      if (this.dragId !== e.pointerId) return;
      this.dragId = null;
      f.classList.remove('drag');
      this.setTick(this.nearest(e.clientX));
      if (this.onChange) this.onChange(this.tick);
    };
    this.track.addEventListener('pointerup', end);
    this.track.addEventListener('pointercancel', end);
  }

  nearest(clientX) {
    const r = this.track.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    return Math.round((x / r.width) * this.line.count);
  }

  follow(e) {
    const r = this.track.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), r.width);
    this.flag.style.left = `${(x / r.width) * 100}%`;
    const k = this.nearest(e.clientX);
    this.track.querySelectorAll('.nl-tick.hot').forEach((t) => t.classList.remove('hot'));
    this.track.querySelectorAll('.nl-tick')[k]?.classList.add('hot');
  }

  setTick(k) {
    this.tick = k;
    this.flag.style.left = pct(k, this.line.count);
    this.flag.dataset.tick = k;
    this.track.querySelectorAll('.nl-tick.hot').forEach((t) => t.classList.remove('hot'));
  }

  // ---- 카드 ----
  makeCards() {
    this.slots = this.points.map((k, i) => {
      const pt = document.createElement('div');
      pt.className = 'nl-point';
      pt.style.left = pct(k, this.line.count);
      pt.dataset.point = i;
      pt.innerHTML = `<div class="slot slot-f" data-slot="f"></div><div class="dot"></div><div class="pname">${pointName(i)}</div><div class="slot slot-d" data-slot="d"></div>`;
      pt.addEventListener('click', () => this.tapPoint(i));
      this.track.appendChild(pt);
      return pt;
    });
    const tray = (this.tray = document.createElement('div'));
    tray.className = 'nl-tray';
    this.root.appendChild(tray);
    this.cardEls = {};
    this.cards.forEach((c) => {
      const b = document.createElement('div');
      b.className = `card card-${c.num.t}`;
      b.dataset.card = c.id;
      b.innerHTML = html(c.num);
      b.style.touchAction = 'none';
      b.addEventListener('pointerdown', (e) => this.cardDown(e, c.id));
      tray.appendChild(b);
      this.cardEls[c.id] = b;
    });
  }

  cardDown(e, id) {
    if (this.locked) return;
    e.preventDefault();
    const b = this.cardEls[id];
    const start = { x: e.clientX, y: e.clientY };
    const r0 = b.getBoundingClientRect();
    let moved = false;
    const move = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 8) return;
      if (!moved) {
        moved = true;
        b.classList.add('flying');
        b.style.width = `${r0.width}px`;
        b.style.height = `${r0.height}px`;
        document.body.appendChild(b);
      }
      b.style.left = `${r0.left + dx}px`;
      b.style.top = `${r0.top + dy}px`;
      ev.preventDefault();
    };
    const up = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!moved) return this.tapCard(id);
      b.classList.remove('flying');
      b.style.left = b.style.top = b.style.width = b.style.height = '';
      const i = this.dropPoint(ev.clientX, ev.clientY);
      if (i === null) this.toTray(id);
      else this.putCard(id, i);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  dropPoint(x, y) {
    const tr = this.track.getBoundingClientRect();
    if (y < tr.top - 60 || y > tr.bottom + 60) return null;
    let best = null, bd = Infinity;
    this.slots.forEach((pt, i) => {
      const r = pt.getBoundingClientRect();
      const d = Math.abs(x - (r.left + r.width / 2));
      if (d < bd) { bd = d; best = i; }
    });
    const step = tr.width / this.line.count;
    return bd <= Math.max(40, step * 1.5) ? best : null;
  }

  tapCard(id) {
    if (this.place[id] !== undefined) { this.toTray(id); return; }
    this.selected = this.selected === id ? null : id;
    Object.entries(this.cardEls).forEach(([cid, el]) => el.classList.toggle('picked', Number(cid) === this.selected));
  }

  tapPoint(i) {
    if (this.locked || this.selected === null) return;
    const id = this.selected;
    this.selected = null;
    this.cardEls[id].classList.remove('picked');
    this.putCard(id, i);
  }

  putCard(id, i) {
    const card = this.cards.find((c) => c.id === id);
    const slot = this.slots[i].querySelector(card.num.t === 'f' ? '.slot-f' : '.slot-d');
    const old = slot.firstElementChild;
    if (old && Number(old.dataset.card) !== id) this.toTray(Number(old.dataset.card), false);
    slot.appendChild(this.cardEls[id]);
    this.place[id] = i;
    this.changed();
  }

  toTray(id, notify = true) {
    delete this.place[id];
    this.tray.appendChild(this.cardEls[id]);
    if (notify) this.changed();
  }

  changed() {
    if (this.onChange) this.onChange(this.place);
  }

  setEnabled(on) {
    this.locked = !on;
    this.root.classList.toggle('locked', !on);
  }
}
