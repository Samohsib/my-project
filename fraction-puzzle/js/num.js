// 화면에 보이는 수: 분수(대분수 포함)와 소수.
// 분수 {t:'f', w, n, d}: w는 자연수 부분(없으면 0). 6/8처럼 약분하지 않은 모양 그대로 둔다.
// 소수 {t:'d', i, p}: i ÷ 10^p. 0.30처럼 끝자리 0도 모양 그대로 둔다.
import { Q, fromMixed, toDecimalString } from './rational.js';

export const F = (w, n, d) => ({ t: 'f', w, n, d });
export const D = (i, p) => ({ t: 'd', i, p });

const P10 = [1, 10, 100, 1000];

export function val(x) {
  return x.t === 'f' ? fromMixed(x.w, x.n, x.d) : Q(x.i, P10[x.p]);
}

// 분수 전체를 분자 하나로 (대분수 2 3/4 → 11)
export const totalNum = (f) => f.w * f.d + f.n;

export function fracKind(f) {
  if (f.n === 0) return '자연수';
  if (f.w > 0) return '대분수';
  return f.n < f.d ? '진분수' : '가분수';
}

export function text(x) {
  if (x.t === 'd') return toDecimalString(val(x), x.p);
  if (x.n === 0) return String(x.w);
  return x.w > 0 ? `${x.w} ${x.n}/${x.d}` : `${x.n}/${x.d}`;
}

export function html(x, cls = '') {
  if (x.t === 'd') return `<span class="num dec ${cls}">${text(x)}</span>`;
  if (x.n === 0) return `<span class="num ${cls}">${x.w}</span>`;
  const whole = x.w > 0 ? `<span class="whole">${x.w}</span>` : '';
  return `<span class="num frac ${cls}">${whole}<span class="fr"><span class="nu">${x.n}</span><span class="de">${x.d}</span></span></span>`;
}

// ---- 한국어로 읽기 (음성 안내용) ----
const DIG = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

export function koInt(n) {
  if (n === 0) return '영';
  const units = ['', '십', '백', '천'];
  let s = '';
  const digits = String(n).split('').map(Number);
  digits.forEach((dg, idx) => {
    const pos = digits.length - 1 - idx;
    if (dg === 0) return;
    s += (dg === 1 && pos > 0 ? '' : DIG[dg]) + units[pos];
  });
  return s;
}

export function say(x) {
  if (typeof x === 'number') return koInt(x);
  if (x.t === 'd') {
    const s = text(x);
    const [a, b] = s.split('.');
    return b === undefined ? koInt(Number(a)) : `${koInt(Number(a))} 점 ${b.split('').map((c) => DIG[+c]).join('')}`;
  }
  if (x.n === 0) return koInt(x.w);
  const fr = `${koInt(x.d)} 분의 ${koInt(x.n)}`;
  return x.w > 0 ? `${koInt(x.w)}${josa(koInt(x.w), '과/와')} ${fr}` : fr;
}

// 받침에 따라 조사 고르기: josa('삼', '은/는') → '은'
export function josa(spoken, pair) {
  const [withB, withoutB] = pair.split('/');
  const c = spoken.charCodeAt(spoken.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return withoutB;
  const jong = (c - 0xac00) % 28;
  if (jong === 0) return withoutB;
  if (withB === '으로' && jong === 8) return withoutB; // ㄹ 받침은 '로'
  return withB;
}

// 수(분수·소수·정수) 뒤에 붙는 조사
export const jo = (x, pair) => josa(say(x), pair);
