// 소리: 음성 안내(Web Speech, ko-KR)와 짧은 효과음(Web Audio). 둘 다 끌 수 있다.
// iOS 사파리는 사용자가 화면을 누른 순간 안에서 처음 소리를 내야 잠금이 풀리므로,
// 첫 터치 때 소리 없는 발화·빈 오디오로 미리 풀어 둔다.

let enabled = true;
let koVoice = null;
let ctx = null;
let master = null;
let unlocked = false;

const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function loadVoices() {
  if (!hasSpeech()) return;
  const voices = speechSynthesis.getVoices();
  koVoice = voices.find((v) => /^ko[-_]?KR/i.test(v.lang)) || voices.find((v) => /^ko/i.test(v.lang)) || null;
}

if (hasSpeech()) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}

function ensureAudio() {
  if (ctx) {
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlock() {
  if (unlocked || !enabled) return;
  unlocked = true;
  ensureAudio();
  if (hasSpeech()) {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'ko-KR';
      speechSynthesis.speak(u);
    } catch {
      /* 음성 없음 */
    }
  }
}

export function setEnabled(on) {
  enabled = Boolean(on);
  if (!enabled) stop();
}

export function isEnabled() {
  return enabled;
}

export function hasKoreanVoice() {
  loadVoices();
  return Boolean(koVoice);
}

export function stop() {
  if (hasSpeech()) {
    try {
      speechSynthesis.cancel();
    } catch {
      /* 무시 */
    }
  }
}

export function speak(text) {
  if (!enabled || !hasSpeech() || !text) return;
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    if (!koVoice) loadVoices();
    const u = new SpeechSynthesisUtterance(text.replace(/[()]/g, ' '));
    u.lang = 'ko-KR';
    if (koVoice) u.voice = koVoice;
    u.rate = 1.0;
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  } catch {
    /* 음성 실패는 조용히 넘어감 */
  }
}

function tone({ f, f2 = f, d = 0.15, at = 0, type = 'sine', g = 0.25 }) {
  if (!enabled) return;
  const ac = ensureAudio();
  if (!ac) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + d + 0.02);
}

export const sfx = {
  tap() {
    tone({ f: 520, f2: 640, d: 0.07, g: 0.12 });
  },
  right() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.14, at: i * 0.08, type: 'triangle' }));
  },
  wrong() {
    tone({ f: 330, f2: 220, d: 0.22, g: 0.15 });
  },
  stamp() {
    tone({ f: 140, f2: 70, d: 0.18, type: 'square', g: 0.18 });
  },
};
