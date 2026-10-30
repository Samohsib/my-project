// 지도 그리기와 손가락 다루기: 한 손가락 누르기(맞히기), 끌기(이동), 두 손가락 벌리기(확대).

import { project, VIEW } from './geo.js';
import { REGION_COLORS } from './art.js';

const NS = 'http://www.w3.org/2000/svg';
const TAP_MOVE_PX = 10; // 이만큼 넘게 움직이면 누르기가 아니라 끌기
const TAP_MAX_MS = 700;
export const TAP_TOLERANCE_PX = 22; // 손가락 끝 허용 거리
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
}

function pathD(rings) {
  return rings
    .map((ring) => 'M' + ring.map((p) => project(p).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z')
    .join('');
}

function lineD(line) {
  return 'M' + line.map((p) => project(p).map((v) => v.toFixed(1)).join(',')).join('L');
}

export class MapView {
  constructor(host, cat) {
    this.host = host;
    this.cat = cat;
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
    this.pointers = new Map();
    this.gesture = null;
    this.tapHandlers = [];
    this.scaled = []; // 확대해도 화면 크기가 같아야 하는 표시들
    this.build();
    this.bindPointer();
  }

  build() {
    const svg = el('svg', {
      viewBox: `0 0 ${VIEW.width} ${VIEW.height}`,
      preserveAspectRatio: 'xMidYMid meet',
      class: 'map-svg',
      role: 'img',
      'aria-label': '대한민국 지도',
    });
    this.svg = svg;
    this.vp = el('g', { class: 'viewport' }, svg);
    this.gRegions = el('g', { class: 'regions' }, this.vp);
    this.gRivers = el('g', { class: 'rivers' }, this.vp);
    this.gFx = el('g', { class: 'fx' }, this.vp);
    this.gLabels = el('g', { class: 'labels' }, this.vp);
    this.gMountains = el('g', { class: 'mountains' }, this.vp);
    this.gCities = el('g', { class: 'cities' }, this.vp);
    this.gPins = el('g', { class: 'pins' }, this.vp);

    this.regionEls = {};
    for (const r of this.cat.regions) {
      const rings = r.geometry.coordinates.flat();
      const p = el('path', {
        d: pathD(rings),
        class: 'region',
        fill: REGION_COLORS[r.code] || '#eee',
        'data-code': r.code,
        'vector-effect': 'non-scaling-stroke',
      }, this.gRegions);
      this.regionEls[r.code] = p;
    }

    // 독도·울릉도는 아주 작아서 이름표를 늘 붙여 둔다
    this.addScaled(this.gLabels, [131.8667, 37.2417], (g) => {
      el('circle', { r: 9, class: 'islet-ring' }, g);
      const t = el('text', { y: -14, class: 'islet-label' }, g);
      t.textContent = '독도';
    });
    this.addScaled(this.gLabels, [130.86, 37.5], (g) => {
      const t = el('text', { y: -16, class: 'islet-label' }, g);
      t.textContent = '울릉도';
    });

    this.regionLabels = {};
    for (const r of this.cat.regions) {
      this.regionLabels[r.code] = this.addScaled(this.gLabels, r.label, (g) => {
        const t = el('text', { class: 'region-label', y: 5 }, g);
        t.textContent = r.short;
      }, 'region-label-g');
    }

    this.riverEls = {};
    for (const r of this.cat.rivers) {
      const g = el('g', { class: 'river', 'data-id': r.id }, this.gRivers);
      for (const line of r.lines) {
        el('path', { d: lineD(line), class: 'river-casing', 'vector-effect': 'non-scaling-stroke' }, g);
        el('path', { d: lineD(line), class: 'river-line', 'vector-effect': 'non-scaling-stroke' }, g);
      }
      this.riverEls[r.id] = g;
    }

    this.cityEls = {};
    for (const c of this.cat.cities) {
      this.cityEls[c.id] = this.addScaled(this.gCities, c.ll, (g) => {
        el('circle', { r: 11, class: 'city-halo' }, g);
        el('circle', { r: 7, class: 'city-dot' }, g);
        const t = el('text', { class: 'marker-name', y: -14 }, g);
        t.textContent = c.name;
      }, 'city', { 'data-id': c.id });
    }

    this.mountainEls = {};
    for (const m of this.cat.mountains) {
      this.mountainEls[m.id] = this.addScaled(this.gMountains, m.ll, (g) => {
        el('path', { d: 'M0,-15 L14,10 L-14,10 Z', class: 'mountain-tri' }, g);
        el('path', { d: 'M0,-15 L5,-6 L1,-8 L-3,-5 L-5,-6 Z', class: 'mountain-snow' }, g);
        const t = el('text', { class: 'marker-name', y: -20 }, g);
        t.textContent = m.name;
      }, 'mountain', { 'data-id': m.id });
    }

    this.host.appendChild(svg);
    this.applyTransform();
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.applyTransform()).observe(this.host);
  }

  addScaled(parent, ll, draw, cls = '', attrs = {}) {
    const [x, y] = project(ll);
    const g = el('g', { class: cls, ...attrs }, parent);
    draw(g);
    const item = { g, x, y };
    this.scaled.push(item);
    return g;
  }

  // ---- 보이기 설정 ----
  setLayers({ labels = false, cities = false, mountains = false, rivers = false } = {}) {
    this.svg.classList.toggle('show-labels', labels);
    this.svg.classList.toggle('show-cities', cities);
    this.svg.classList.toggle('show-mountains', mountains);
    this.svg.classList.toggle('show-rivers', rivers);
  }

  clearMarks() {
    this.svg.querySelectorAll('.is-right, .is-wrong, .is-hint, .is-focus, .is-named, .is-pulse').forEach((n) => {
      n.classList.remove('is-right', 'is-wrong', 'is-hint', 'is-focus', 'is-named', 'is-pulse');
    });
    this.gRegions.classList.remove('dim', 'dim-soft');
    this.gPins.replaceChildren();
    this.gFx.replaceChildren();
  }

  elementFor(kind, id) {
    if (kind === 'region') return this.regionEls[id];
    if (kind === 'city') return this.cityEls[id];
    if (kind === 'mountain') return this.mountainEls[id];
    if (kind === 'river') return this.riverEls[id];
    return null;
  }

  mark(kind, id, cls, ms = 0) {
    const node = this.elementFor(kind, id);
    if (!node) return;
    node.classList.add(cls);
    // 힌트·초점은 테두리 대신 나머지 시·도를 흐리게 해서 보여 준다 (섬이 많은 곳도 깔끔하게)
    if (kind === 'region' && (cls === 'is-hint' || cls === 'is-pulse')) this.gRegions.classList.add('dim');
    if (kind === 'region' && cls === 'is-focus') this.gRegions.classList.add('dim-soft');
    if (kind === 'region' && (cls === 'is-hint' || cls === 'is-pulse' || cls === 'is-right')) this.raise(node);
    if (ms) setTimeout(() => node.classList.remove(cls), ms);
  }

  // 강조한 시·도를 맨 위로 올려 테두리가 가려지지 않게
  raise(node) {
    node.parentNode.appendChild(node);
  }

  showPin(ll, label) {
    const g = this.addScaled(this.gPins, ll, (gg) => {
      el('path', { d: 'M0,0 C-6,-10 -13,-14 -13,-24 A13,13 0 1 1 13,-24 C13,-14 6,-10 0,0 Z', class: 'pin' }, gg);
      el('circle', { cy: -24, r: 5, fill: '#fff' }, gg);
      const t = el('text', { class: 'pin-label', y: -44 }, gg);
      t.textContent = label;
    }, 'pin-g');
    this.applyTransform();
    return g;
  }

  // ---- 확대·이동 ----
  pxPerUnit() {
    const m = this.svg.getScreenCTM();
    return m ? m.a : 1;
  }

  toSvgPoint(clientX, clientY) {
    const m = this.svg.getScreenCTM();
    if (!m) return [0, 0];
    const inv = m.inverse();
    return [inv.a * clientX + inv.c * clientY + inv.e, inv.b * clientX + inv.d * clientY + inv.f];
  }

  // 화면 좌표 → 지도 좌표 (확대·이동을 되돌림)
  toMapPoint(clientX, clientY) {
    const [sx, sy] = this.toSvgPoint(clientX, clientY);
    return [(sx - this.tx) / this.zoom, (sy - this.ty) / this.zoom];
  }

  // 지도 좌표 → 화면 좌표 (시험에서 누를 곳을 찾을 때 씀)
  toClientPoint([mx, my]) {
    const m = this.svg.getScreenCTM();
    const sx = mx * this.zoom + this.tx;
    const sy = my * this.zoom + this.ty;
    return [m.a * sx + m.c * sy + m.e, m.b * sx + m.d * sy + m.f];
  }

  clamp() {
    const W = VIEW.width;
    const H = VIEW.height;
    const slackX = W * 0.3;
    const slackY = H * 0.3;
    this.tx = Math.min(slackX, Math.max(W - W * this.zoom - slackX, this.tx));
    this.ty = Math.min(slackY, Math.max(H - H * this.zoom - slackY, this.ty));
  }

  applyTransform() {
    this.clamp();
    this.vp.setAttribute('transform', `translate(${this.tx.toFixed(2)} ${this.ty.toFixed(2)}) scale(${this.zoom.toFixed(4)})`);
    // 표시(점·이름표)는 기기 크기·확대와 상관없이 늘 같은 화면 픽셀 크기로 보이게 한다
    const k = 1 / (this.zoom * Math.max(0.3, this.pxPerUnit()));
    for (const { g, x, y } of this.scaled) g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)})`);
    this.svg.style.setProperty('--zoom', this.zoom.toFixed(3));
    this.host.dataset.zoom = this.zoom.toFixed(2);
  }

  zoomAt(svgPt, newZoom) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
    const mx = (svgPt[0] - this.tx) / this.zoom;
    const my = (svgPt[1] - this.ty) / this.zoom;
    this.zoom = z;
    this.tx = svgPt[0] - mx * z;
    this.ty = svgPt[1] - my * z;
    this.applyTransform();
  }

  zoomBy(f) {
    this.zoomAt([VIEW.width / 2, VIEW.height / 2], this.zoom * f);
  }

  resetView() {
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
    this.applyTransform();
  }

  onTap(fn) {
    this.tapHandlers.push(fn);
  }

  emitTap(clientX, clientY) {
    const xy = this.toMapPoint(clientX, clientY);
    const tol = TAP_TOLERANCE_PX / (this.pxPerUnit() * this.zoom);
    for (const fn of this.tapHandlers) fn({ xy, tol, clientX, clientY });
  }

  bindPointer() {
    const svg = this.svg;
    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* 무시 */
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.gesture = {
          type: 'tap', x0: e.clientX, y0: e.clientY, t0: performance.now(),
          tx0: this.tx, ty0: this.ty, id: e.pointerId,
        };
      } else if (this.pointers.size === 2) {
        this.startPinch();
      }
    });

    svg.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = this.gesture;
      if (!g) return;
      if (g.type === 'pinch' && this.pointers.size >= 2) {
        this.updatePinch();
      } else if (g.type === 'tap' || g.type === 'pan') {
        const dx = e.clientX - g.x0;
        const dy = e.clientY - g.y0;
        if (g.type === 'tap' && Math.hypot(dx, dy) > TAP_MOVE_PX) g.type = 'pan';
        if (g.type === 'pan') {
          const k = this.pxPerUnit();
          this.tx = g.tx0 + dx / k;
          this.ty = g.ty0 + dy / k;
          this.applyTransform();
        }
      }
    });

    const end = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const g = this.gesture;
      this.pointers.delete(e.pointerId);
      if (g && g.type === 'tap' && e.type === 'pointerup' && performance.now() - g.t0 < TAP_MAX_MS) {
        this.emitTap(e.clientX, e.clientY);
      }
      if (this.pointers.size === 1 && g && g.type === 'pinch') {
        // 두 손가락 중 하나를 떼면 남은 손가락으로 이어서 이동 (누르기로 치지 않음)
        const [[id, p]] = [...this.pointers.entries()];
        this.gesture = { type: 'pan', x0: p.x, y0: p.y, tx0: this.tx, ty0: this.ty, id };
      } else if (this.pointers.size === 0) {
        this.gesture = null;
      }
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const pt = this.toSvgPoint(e.clientX, e.clientY);
      this.zoomAt(pt, this.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    }, { passive: false });
  }

  startPinch() {
    const [a, b] = [...this.pointers.values()];
    const mid = this.toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.gesture = {
      type: 'pinch',
      dist0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      zoom0: this.zoom,
      mapMid: [(mid[0] - this.tx) / this.zoom, (mid[1] - this.ty) / this.zoom],
    };
  }

  updatePinch() {
    const g = this.gesture;
    const [a, b] = [...this.pointers.values()];
    const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const mid = this.toSvgPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (g.zoom0 * dist) / g.dist0));
    this.tx = mid[0] - g.mapMid[0] * this.zoom;
    this.ty = mid[1] - g.mapMid[1] * this.zoom;
    this.applyTransform();
  }
}
