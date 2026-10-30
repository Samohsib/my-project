// 작은 DOM 도우미

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

// SVG 글자 → 요소
export function svg(markup, cls) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  const el = t.content.firstElementChild;
  if (cls) el.classList.add(...cls.split(' '));
  return el;
}

// 한국어 조사: 숫자 끝소리에 따라 이/가, 은/는, 을/를
const BATCHIM_DIGIT = [true, true, false, true, false, false, true, true, true, false]; // 영 일 이 삼 사 오 육 칠 팔 구
export function josa(word, pair) {
  const s = String(word);
  const last = s[s.length - 1];
  let batchim;
  if (/[0-9]/.test(last)) batchim = BATCHIM_DIGIT[Number(last)];
  else {
    const code = last.charCodeAt(0) - 0xac00;
    batchim = code >= 0 && code <= 11171 ? code % 28 !== 0 : false;
  }
  const [withB, withoutB] = pair.split('/');
  return s + (batchim ? withB : withoutB);
}

const ORD = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
export const ordinal = (k) => `${ORD[k] || k + 1} 번째`;

export function listWithJosa(values, pair) {
  if (!values.length) return '';
  const head = values.slice(0, -1).join(', ');
  const last = josa(values[values.length - 1], pair);
  return head ? `${head}, ${last}` : last;
}
