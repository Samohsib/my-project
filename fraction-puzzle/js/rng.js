// 씨앗(seed)으로 되풀이할 수 있는 난수. 문제를 고를 때만 쓰고, 계산에는 쓰지 않는다.
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const chance = (p) => next() < p;
  const shuffle = (arr) => {
    const b = arr.slice();
    for (let k = b.length - 1; k > 0; k--) {
      const j = Math.floor(next() * (k + 1));
      [b[k], b[j]] = [b[j], b[k]];
    }
    return b;
  };
  return { next, int, pick, chance, shuffle };
}
