// 진행 기록(도장, 설정)을 localStorage 에 저장한다.
// 사파리 개인정보 보호 모드 등에서 저장이 막혀도 앱은 그대로 돌아가게 한다.

export const STORE_KEY = 'korea-map:v1';

function defaults() {
  return { stamps: {}, sound: true, rounds: 0 };
}

function safeStorage() {
  try {
    const s = globalThis.localStorage;
    const probe = '__korea-map-probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function createStore(storage = safeStorage()) {
  let state = defaults();
  try {
    const raw = storage && storage.getItem(STORE_KEY);
    if (raw) state = { ...defaults(), ...JSON.parse(raw) };
  } catch {
    state = defaults();
  }

  function save() {
    try {
      if (storage) storage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      /* 저장 공간이 없거나 막힘: 이번 실행 동안만 기억 */
    }
  }

  return {
    get stamps() {
      return state.stamps;
    },
    get sound() {
      return state.sound;
    },
    hasStamp(id) {
      return Boolean(state.stamps[id]);
    },
    // 새 도장이면 true
    addStamp(id, stage, firstTry) {
      if (state.stamps[id]) {
        if (firstTry && !state.stamps[id].firstTry) {
          state.stamps[id].firstTry = true;
          save();
        }
        return false;
      }
      state.stamps[id] = { stage, at: new Date().toISOString().slice(0, 10), firstTry: Boolean(firstTry) };
      save();
      return true;
    },
    countStamps() {
      return Object.keys(state.stamps).length;
    },
    setSound(on) {
      state.sound = Boolean(on);
      save();
    },
    finishRound() {
      state.rounds += 1;
      save();
    },
    reset() {
      const sound = state.sound;
      state = { ...defaults(), sound };
      save();
    },
  };
}
