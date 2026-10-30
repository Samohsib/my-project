// 짧은 효과음 (Web Audio로 직접 만든 소리, 파일 없음). 설정에서 끌 수 있다.

import { data, save } from './store.js';

let ctx = null, master = null;
function ensure() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
  return ctx;
}
addEventListener('pointerdown', () => { if (data.settings.sfx) ensure(); }, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });

function tone({ f = 600, f2 = null, d = 0.1, at = 0, type = 'sine', g = 0.5 }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), v = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  v.gain.setValueAtTime(0.0001, t0);
  v.gain.exponentialRampToValueAtTime(g, t0 + 0.01);
  v.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(v); v.connect(master);
  o.start(t0); o.stop(t0 + d + 0.02);
}

const SOUNDS = {
  tap() { tone({ f: 520, d: 0.06, g: 0.25 }); },
  put() { tone({ f: 660, f2: 880, d: 0.08, g: 0.3 }); },
  fill() { tone({ f: 420, f2: 520, d: 0.05, g: 0.22, type: 'triangle' }); },
  undo() { tone({ f: 500, f2: 360, d: 0.09, g: 0.25 }); },
  hint() { [660, 880].forEach((f, i) => tone({ f, d: 0.12, at: i * 0.08, type: 'triangle', g: 0.3 })); },
  oops() { tone({ f: 320, f2: 220, d: 0.2, g: 0.25 }); },
  line() { tone({ f: 880, d: 0.08, g: 0.2, type: 'triangle' }); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, d: 0.18, at: i * 0.1, type: 'triangle', g: 0.4 })); },
};

export const sound = {
  get on() { return data.settings.sfx; },
  set(on) { data.settings.sfx = !!on; save(); },
  play(name) { if (data.settings.sfx && SOUNDS[name]) try { SOUNDS[name](); } catch { /* 무시 */ } },
};
