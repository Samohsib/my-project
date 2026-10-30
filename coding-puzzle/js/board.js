// 판 그리기와 로봇 움직임 보여 주기
import {
  svgEl, robotSVG, VIEW_FOR_DIR, THEMES, obstacleSVG, floorSVG, starSVG, flagSVG,
} from './art.js';
import { BLOCKED_CHARS, DIRS } from './engine.js';

const CELL = 100;
const center = v => v * CELL + CELL / 2;
const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function tween(ms, fn) {
  return new Promise(resolve => {
    if (ms <= 0) { fn(1); resolve(); return; }
    const t0 = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      if (t < 1) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export class Board {
  constructor(el) {
    this.el = el;
    this.svg = null;
  }

  load(world, theme, rows) {
    this.world = world;
    this.theme = theme;
    const W = world.w * CELL, H = world.h * CELL;
    const t = THEMES[theme];
    const svg = svgEl('svg', {
      viewBox: `-12 -12 ${W + 24} ${H + 24}`, class: `board-svg theme-${theme}`,
      preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': '퍼즐 판',
    });
    // 바탕
    let bg = `<rect x="-12" y="-12" width="${W + 24}" height="${H + 24}" rx="28" fill="${t.bg2}"/>`;
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        if ((x + y) % 2) bg += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${t.bg}"/>`;
      }
    }
    svg.appendChild(svgEl('g', { class: 'bg' }, bg));
    // 칸
    const tiles = svgEl('g', { class: 'tiles' });
    const things = svgEl('g', { class: 'things' });
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const ch = rows[y][x];
        const at = `translate(${x * CELL},${y * CELL})`;
        if (BLOCKED_CHARS.includes(ch)) {
          (ch === '~' ? tiles : things).appendChild(svgEl('g', { transform: at, class: 'obstacle' }, obstacleSVG(ch, theme)));
        } else {
          tiles.appendChild(svgEl('g', { transform: at }, floorSVG(theme)));
        }
      }
    }
    svg.appendChild(tiles);
    // 깃발, 별
    if (world.flag) {
      svg.appendChild(svgEl('g', { class: 'flag', transform: `translate(${world.flag[0] * CELL},${world.flag[1] * CELL})` }, flagSVG()));
    }
    this.starEls = world.stars.map(([x, y], i) => {
      const g = svgEl('g', { class: 'star', 'data-star': i, transform: `translate(${x * CELL},${y * CELL})` }, starSVG());
      svg.appendChild(g);
      return g;
    });
    svg.appendChild(things);
    // 로봇: 앞에 갈 칸을 알려 주는 화살표 + 몸
    this.arrow = svgEl('g', { class: 'rb-arrow' },
      `<path d="M-15 -55 L0 -71 L15 -55" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
       <path d="M-15 -55 L0 -71 L15 -55" fill="none" stroke="#f97316" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
    this.robot = svgEl('g', { class: 'robot' });
    this.shadow = svgEl('ellipse', { cx: 0, cy: 34, rx: 26, ry: 7, fill: 'rgba(0,0,0,.2)' });
    this.body = svgEl('g', { class: 'rb-body' });
    this.robot.append(this.shadow, this.arrow, this.body);
    svg.appendChild(this.robot);
    this.fx = svgEl('g', { class: 'fx' });
    svg.appendChild(this.fx);

    this.el.replaceChildren(svg);
    this.svg = svg;
    this.reset();
  }

  reset() {
    const s = this.world.start;
    this.state = { x: s.x, y: s.y, d: s.d };
    this.angle = s.d * 90;
    this.view = null;
    this.starEls.forEach(g => { g.style.opacity = ''; g.removeAttribute('data-got'); g.querySelector('.star-art').removeAttribute('transform'); });
    this.fx.replaceChildren();
    this.draw(center(s.x), center(s.y), 1, 0);
  }

  setView(d) {
    const v = VIEW_FOR_DIR[d];
    if (v !== this.view) { this.body.innerHTML = robotSVG(v); this.view = v; }
  }

  draw(px, py, sx = 1, hop = 0) {
    this.setView(this.state.d);
    this.robot.setAttribute('transform', `translate(${px.toFixed(1)},${py.toFixed(1)})`);
    this.body.setAttribute('transform', `translate(0,${(-hop).toFixed(1)}) scale(${(0.9 * sx).toFixed(3)},0.9)`);
    this.arrow.setAttribute('transform', `rotate(${this.angle})`);
  }

  // 기록 하나(event)를 그림으로 보여 준다. ms: 걸리는 시간
  async show(ev, ms) {
    const from = { ...this.state };
    switch (ev.kind) {
      case 'move': {
        const x0 = center(from.x), y0 = center(from.y);
        const x1 = center(ev.x), y1 = center(ev.y);
        this.state = { x: ev.x, y: ev.y, d: ev.d };
        await tween(ms, t => {
          const e = ease(t);
          this.draw(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, 1, Math.sin(Math.PI * t) * 14);
        });
        if (ev.star != null) this.collect(ev.star, ms);
        break;
      }
      case 'turn': {
        const a0 = this.angle;
        const a1 = a0 + (ev.turn === 'L' ? -90 : 90);
        let swapped = false;
        await tween(ms, t => {
          const e = ease(t);
          this.angle = a0 + (a1 - a0) * e;
          if (!swapped && t >= 0.5) { this.state = { ...this.state, d: ev.d }; swapped = true; }
          this.draw(center(from.x), center(from.y), Math.max(0.25, Math.abs(Math.cos(Math.PI * t))), Math.sin(Math.PI * t) * 6);
        });
        this.angle = a1;
        this.state = { x: ev.x, y: ev.y, d: ev.d };
        this.draw(center(ev.x), center(ev.y));
        break;
      }
      case 'bump': {
        const [dx, dy] = DIRS[from.d];
        const x0 = center(from.x), y0 = center(from.y);
        await tween(ms * 0.45, t => this.draw(x0 + dx * 26 * t, y0 + dy * 26 * t));
        this.boom(x0 + dx * 50, y0 + dy * 50);
        await tween(ms * 0.55, t => {
          const shake = Math.sin(t * Math.PI * 6) * 6 * (1 - t);
          this.draw(x0 + dx * 26 * (1 - t) + shake, y0 + dy * 26 * (1 - t));
        });
        break;
      }
      case 'check': {
        this.ask(ev.result, ms);
        await tween(ms, () => {});
        break;
      }
      default:
        break;
    }
  }

  collect(i, ms) {
    const g = this.starEls[i];
    if (!g || g.dataset.got) return;
    g.dataset.got = '1';
    const art = g.querySelector('.star-art');
    tween(Math.max(260, ms), t => {
      const s = 1 + t * 0.8;
      art.setAttribute('transform', `translate(${50 - 50 * s},${50 - 50 * s - t * 40}) scale(${s})`);
      g.style.opacity = String(1 - t);
    });
  }

  boom(x, y) {
    const g = svgEl('g', { transform: `translate(${x},${y})`, class: 'boom' },
      `<path d="M0 -34 L9 -12 L32 -18 L16 0 L32 18 L9 12 L0 34 L-9 12 L-32 18 L-16 0 L-32 -18 L-9 -12 Z" fill="#fde047" stroke="#ea580c" stroke-width="4" stroke-linejoin="round"/>
       <text x="0" y="8" text-anchor="middle" font-size="22" font-weight="900" fill="#b91c1c">쾅!</text>`);
    this.fx.appendChild(g);
  }

  // 만약 블록: 로봇 머리 위에 생각 풍선
  ask(result, ms) {
    const { x, y } = this.state;
    const g = svgEl('g', { transform: `translate(${center(x)},${center(y) - 78})`, class: 'think' },
      `<rect x="-30" y="-24" width="60" height="40" rx="16" fill="#fff" stroke="#334155" stroke-width="3"/>
       <circle cx="-6" cy="24" r="5" fill="#fff" stroke="#334155" stroke-width="2.5"/>
       <text x="0" y="6" text-anchor="middle" font-size="28" font-weight="900" fill="${result ? '#16a34a' : '#dc2626'}">${result ? '✓' : '✗'}</text>`);
    this.fx.appendChild(g);
    setTimeout(() => g.remove(), Math.max(350, ms * 1.4));
  }

  clearFx() { this.fx.replaceChildren(); }
}
