// 효과음(WebAudio로 직접 만든 소리)과 음성 안내(Web Speech, ko-KR).
// 둘 다 설정에서 끌 수 있다. 아이패드는 첫 터치 안에서 소리를 깨워야 해서 unlock()을 터치 때 부른다.
let AC = null, master = null;
const opts = { sound: true, voice: true };

export function setAudioOptions(o) {
  Object.assign(opts, o);
  if (master) master.gain.value = opts.sound ? 0.45 : 0;
  if (!opts.voice) stopSpeak();
}

export function unlock() {
  try {
    if (!AC) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = new Ctx();
      master = AC.createGain();
      master.gain.value = opts.sound ? 0.45 : 0;
      master.connect(AC.destination);
      const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource();
      s.buffer = b; s.connect(AC.destination); s.start(0);
    }
    if (AC.state !== 'running') AC.resume().catch(() => {});
  } catch (e) { /* 소리가 없어도 놀이는 된다 */ }
  primeSpeech();
}

function tone({ f, f2, d, at = 0, type = 'triangle', g = 0.13 }) {
  if (!AC || !opts.sound) return;
  const t0 = AC.currentTime + at, osc = AC.createOscillator(), gain = AC.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + d + 0.02);
}

let lastPop = 0;
export const sfx = {
  pop() { const now = performance.now(); if (now - lastPop < 45) return; lastPop = now; tone({ f: 620, f2: 880, d: 0.07, g: 0.07 }); },
  cut() { tone({ f: 900, f2: 300, d: 0.12, type: 'sawtooth', g: 0.05 }); },
  tap() { tone({ f: 520, d: 0.06, g: 0.06 }); },
  right() { [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.14, at: i * 0.08 })); },
  wrong() { tone({ f: 330, f2: 220, d: 0.25, type: 'sine', g: 0.09 }); },
  star() { [784, 1047, 1319, 1568].forEach((f, i) => tone({ f, d: 0.18, at: i * 0.1 })); },
};

// ---- 음성 ----
let koVoice = null, primed = false;
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  koVoice = vs.find((v) => /^ko/i.test(v.lang)) || null;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
function primeSpeech() {
  if (primed || !opts.voice || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.lang = 'ko-KR';
    speechSynthesis.speak(u);
    primed = true;
  } catch (e) { /* 무시 */ }
}

let speakTimer = null;
export function speak(text) {
  if (!opts.voice || !text || !('speechSynthesis' in window)) return;
  clearTimeout(speakTimer);
  try {
    const busy = speechSynthesis.speaking || speechSynthesis.pending;
    if (busy) speechSynthesis.cancel();
    const go = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      if (!koVoice) loadVoices();
      if (koVoice) u.voice = koVoice;
      u.rate = 1.0; u.pitch = 1.05;
      speechSynthesis.speak(u);
    };
    if (busy) speakTimer = setTimeout(go, 120); else go();
  } catch (e) { /* 무시 */ }
}

export function stopSpeak() {
  clearTimeout(speakTimer);
  if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) { /* 무시 */ }
}

export const hasKoreanVoice = () => { loadVoices(); return !!koVoice; };
