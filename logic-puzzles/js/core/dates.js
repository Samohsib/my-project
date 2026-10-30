// 날짜를 'YYYY-MM-DD' 글자로 다룬다. 기기의 현지 날짜(아이패드라면 한국 시간)를 쓴다.

const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function fromDayNumber(n) {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key, n) {
  return fromDayNumber(toDayNumber(key) + n);
}

// b가 a보다 며칠 뒤인지
export function daysBetween(a, b) {
  return toDayNumber(b) - toDayNumber(a);
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function koreanDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일 (${weekday(key)})`;
}
