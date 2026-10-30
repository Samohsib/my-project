// 소리: 효과음(WebAudio로 직접 만든 음)과 음성 안내(Web Speech, ko-KR)
// 아이패드 사파리는 손가락으로 처음 누를 때 소리를 켜 줘야 해서 unlock()을 첫 터치에 부른다.
import { store } from './store.js';

let ctx = null;
let master = null;

function ensureAudio() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
  return ctx;
}

function tone({ f = 440, f2 = null, d = 0.12, type = 'sine', g = 0.5, at = 0 }) {
  if (!store.settings.sfx) return;
  const c = ensureAudio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const v = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + 0.015);
  v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(v); v.connect(master);
  o.start(t); o.stop(t + d + 0.03);
}

export const sfx = {
  tap() { tone({ f: 620, f2: 820, d: 0.07, type: 'triangle', g: 0.35 }); },
  drop() { tone({ f: 420, f2: 300, d: 0.09, type: 'triangle', g: 0.4 }); },
  remove() { tone({ f: 300, f2: 180, d: 0.12, type: 'sine', g: 0.35 }); },
  step() { tone({ f: 520, d: 0.05, type: 'square', g: 0.08 }); },
  turn() { tone({ f: 700, f2: 560, d: 0.06, type: 'triangle', g: 0.2 }); },
  check() { tone({ f: 880, d: 0.06, type: 'sine', g: 0.2 }); },
  star() { [880, 1175, 1568].forEach((f, i) => tone({ f, d: 0.14, at: i * 0.07, type: 'triangle', g: 0.4 })); },
  bump() { tone({ f: 160, f2: 70, d: 0.25, type: 'sawtooth', g: 0.25 }); },
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ f, d: 0.2, at: i * 0.1, type: 'triangle', g: 0.45 })); },
  fail() { [392, 330].forEach((f, i) => tone({ f, d: 0.22, at: i * 0.16, type: 'sine', g: 0.35 })); },
};

// ── 음성 안내 ──
let koVoice = null;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  koVoice = vs.find(v => /^ko[-_]?KR/i.test(v.lang)) || vs.find(v => /^ko/i.test(v.lang)) || null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

export function speak(text) {
  if (!store.settings.voice || !('speechSynthesis' in window) || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[★☆⭐🚩]/g, ''));
    u.lang = 'ko-KR';
    if (!koVoice) loadVoices();
    if (koVoice) u.voice = koVoice;
    u.rate = 1.0;
    u.pitch = 1.08;
    speechSynthesis.speak(u);
  } catch (e) { /* 음성이 없어도 계속 */ }
}

export function stopSpeak() {
  if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
}

// 첫 터치 때 소리·음성 잠금 풀기
let unlocked = false;
export function unlock() {
  ensureAudio();
  if (unlocked || !('speechSynthesis' in window) || !store.settings.voice) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.lang = 'ko-KR';
    speechSynthesis.speak(u);
    unlocked = true;
  } catch (e) {}
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if ('speechSynthesis' in window) try { speechSynthesis.resume(); } catch (e) {}
  });
}
