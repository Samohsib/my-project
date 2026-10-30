// 음성 안내 (Web Speech API, ko-KR). 설정에서 끌 수 있다.
// 아이패드 사파리는 '손가락으로 누른 그 순간'에 한 번 말해야 음성이 풀리므로, 첫 터치 때 조용히 한 번 말해 둔다.

import { data, save } from './store.js';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
let koVoice = null;

function pickVoice() {
  if (!supported) return;
  const vs = speechSynthesis.getVoices();
  koVoice = vs.find((v) => /^ko[-_]KR/i.test(v.lang)) || vs.find((v) => /^ko/i.test(v.lang)) || null;
}
if (supported) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

let unlocked = false;
let pending = null;
function unlock() {
  if (unlocked || !supported || !data.settings.voice) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0; u.lang = 'ko-KR';
    speechSynthesis.speak(u);
    unlocked = true;
  } catch { /* 무시 */ }
}
if (supported) {
  addEventListener('touchend', unlock, { passive: true });
  addEventListener('pointerup', unlock, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) try { speechSynthesis.resume(); } catch { /* 무시 */ } });
}

export const voice = {
  supported,
  get on() { return data.settings.voice; },
  set(on) {
    data.settings.voice = !!on;
    save();
    if (!on) this.stop();
  },
  say(text) {
    if (!supported || !data.settings.voice || !text) return;
    clearTimeout(pending);
    const speakNow = () => {
      try {
        const u = new SpeechSynthesisUtterance(text.replace(/[^\p{L}\p{N}\s.,!?~·:()\-]/gu, ''));
        u.lang = 'ko-KR';
        if (!koVoice) pickVoice();
        if (koVoice) u.voice = koVoice;
        u.rate = 1.0; u.pitch = 1.05;
        speechSynthesis.speak(u);
      } catch { /* 음성이 안 돼도 화면 글은 그대로 보인다 */ }
    };
    // 말하는 중이면 끊고 잠깐 뒤에 새로 말한다 (iOS는 cancel 바로 뒤 speak를 흘려버릴 때가 있다)
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      try { speechSynthesis.cancel(); } catch { /* 무시 */ }
      pending = setTimeout(speakNow, 120);
    } else speakNow();
  },
  stop() { clearTimeout(pending); if (supported) try { speechSynthesis.cancel(); } catch { /* 무시 */ } },
};
