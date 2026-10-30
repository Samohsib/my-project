// 유리수 계산: 분자·분모를 정수로만 다룬다.
// 0.1 + 0.2 같은 부동소수 계산은 하지 않는다. 나눗셈 대신 곱셈과 비교(교차곱)로 판정한다.

function int(x, name) {
  if (!Number.isSafeInteger(x)) throw new TypeError(`${name}는 정수여야 해요: ${x}`);
  return x;
}

export function gcd(a, b) {
  a = Math.abs(int(a, 'a'));
  b = Math.abs(int(b, 'b'));
  while (b) [a, b] = [b, a % b];
  return a;
}

// 기약분수로 정리한 유리수 {n, d} (d > 0)
export function Q(n, d = 1) {
  int(n, '분자');
  int(d, '분모');
  if (d === 0) throw new RangeError('분모는 0이 될 수 없어요');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return Object.freeze({ n: n / g + 0, d: d / g }); // +0: -0을 0으로
}

export function add(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
export function sub(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
export function mul(a, b) { return Q(a.n * b.n, a.d * b.d); }
// a를 b로 나눈 몫(유리수). b는 0이 아니어야 한다.
export function div(a, b) {
  if (b.n === 0) throw new RangeError('0으로 나눌 수 없어요');
  return Q(a.n * b.d, a.d * b.n);
}

export function cmp(a, b) {
  const x = a.n * b.d - b.n * a.d;
  return x > 0 ? 1 : x < 0 ? -1 : 0;
}
export const eq = (a, b) => a.n === b.n && a.d === b.d;
export const isInt = (a) => a.d === 1;

// 대분수 w와 n/d → 유리수
export function fromMixed(w, n, d) { return Q(w * d + n, d); }

// 유리수를 분모 d인 대분수 {w, n, d}로 (0 이상만). d가 q.d의 배수가 아니면 null
export function toMixed(q, d) {
  if (q.n < 0 || d % q.d !== 0) return null;
  const total = q.n * (d / q.d);
  return { w: Math.floor(total / d), n: total % d, d };
}

// 유리수 q에 k를 곱한 값이 정수이면 그 정수, 아니면 null (칸 수 세기에 쓴다)
export function countOf(q, perUnit) {
  const x = mul(q, Q(perUnit));
  return isInt(x) ? x.n : null;
}

const POW10 = [1, 10, 100, 1000, 10000, 100000, 1000000];

// "1.25", "0.5", ".5", "3." 같은 글자를 유리수로. 숫자가 아니면 null
export function parseDecimal(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d*)(?:\.(\d*))?$/.exec(str.trim());
  if (!m) return null;
  const whole = m[1] || '';
  const frac = m[2] || '';
  if (whole.length + frac.length === 0) return null;
  if (frac.length >= POW10.length) return null;
  const scale = POW10[frac.length];
  const i = Number(whole || '0') * scale + Number(frac || '0');
  return Q(i, scale);
}

// 유리수를 소수 글자로. places를 주면 그 자리까지(모자라면 0을 채움), 안 주면 필요한 만큼만.
// 소수로 끝나지 않거나(1/3) 자리가 모자라면 null
export function toDecimalString(q, places) {
  if (q.n < 0) return null;
  let p = 0;
  while (p < POW10.length && POW10[p] % q.d !== 0) p++;
  if (p >= POW10.length) return null;
  if (places === undefined) places = p;
  if (places < p) return null;
  const i = q.n * (POW10[places] / q.d);
  const s = String(i).padStart(places + 1, '0');
  return places === 0 ? s : `${s.slice(0, -places)}.${s.slice(-places)}`;
}
