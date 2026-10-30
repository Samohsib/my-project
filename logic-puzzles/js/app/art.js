// 그림은 모두 여기서 SVG로 직접 그린다 (바깥 그림·글꼴 없음).
// 길잡이 캐릭터: 부엉이 '토리' — 배에 퍼즐 칸 무늬가 있는 보라색 부엉이.

import { svg } from './dom.js';

const EYES = {
  normal: `
    <circle cx="43" cy="50" r="16" fill="#fff"/><circle cx="77" cy="50" r="16" fill="#fff"/>
    <circle cx="45" cy="52" r="8" fill="#26213f"/><circle cx="79" cy="52" r="8" fill="#26213f"/>
    <circle cx="48" cy="48.5" r="3" fill="#fff"/><circle cx="82" cy="48.5" r="3" fill="#fff"/>`,
  happy: `
    <circle cx="43" cy="50" r="16" fill="#fff"/><circle cx="77" cy="50" r="16" fill="#fff"/>
    <path d="M34 54 Q43 42 52 54" stroke="#26213f" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M68 54 Q77 42 86 54" stroke="#26213f" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  think: `
    <circle cx="43" cy="50" r="16" fill="#fff"/><circle cx="77" cy="50" r="16" fill="#fff"/>
    <circle cx="47" cy="46" r="8" fill="#26213f"/><circle cx="81" cy="46" r="8" fill="#26213f"/>
    <circle cx="49.5" cy="43" r="3" fill="#fff"/><circle cx="83.5" cy="43" r="3" fill="#fff"/>
    <path d="M30 32 L52 36" stroke="#4b3cc4" stroke-width="4" stroke-linecap="round"/>`,
  oops: `
    <circle cx="43" cy="50" r="16" fill="#fff"/><circle cx="77" cy="50" r="16" fill="#fff"/>
    <circle cx="43" cy="52" r="6" fill="#26213f"/><circle cx="77" cy="52" r="6" fill="#26213f"/>`,
};

let owlCount = 0;
export function owl(mood = 'normal', cls = 'owl') {
  const clip = `belly-${++owlCount}`;
  return svg(`
<svg viewBox="0 0 120 124" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="${clip}"><ellipse cx="60" cy="84" rx="27" ry="24"/></clipPath></defs>
  <ellipse cx="60" cy="118" rx="34" ry="5" fill="#26213f" opacity=".12"/>
  <path d="M26 38 L22 8 L48 24 Z" fill="#6c5ce7"/>
  <path d="M94 38 L98 8 L72 24 Z" fill="#6c5ce7"/>
  <path d="M60 16 C30 16 17 40 17 66 C17 96 36 112 60 112 C84 112 103 96 103 66 C103 40 90 16 60 16 Z" fill="#6c5ce7"/>
  <path d="M19 64 C8 76 10 96 25 101 C29 88 29 75 19 64 Z" fill="#4b3cc4"/>
  <path d="M101 64 C112 76 110 96 95 101 C91 88 91 75 101 64 Z" fill="#4b3cc4"/>
  <ellipse cx="60" cy="84" rx="27" ry="24" fill="#f1edff"/>
  <g clip-path="url(#${clip})" stroke="#cdc4ff" stroke-width="2.4">
    <path d="M51 58 V110 M69 58 V110 M30 76 H90 M30 92 H90"/>
  </g>
  <rect x="52.5" y="77.5" width="15" height="13" rx="2" fill="#ffd166"/>
  ${EYES[mood] || EYES.normal}
  <path d="M53 63 Q60 60 67 63 L60 73 Z" fill="#ffb23e"/>
  <circle cx="28" cy="68" r="5.5" fill="#ff8fb1" opacity=".55"/><circle cx="92" cy="68" r="5.5" fill="#ff8fb1" opacity=".55"/>
  <ellipse cx="48" cy="112" rx="8" ry="4.5" fill="#ffb23e"/><ellipse cx="72" cy="112" rx="8" ry="4.5" fill="#ffb23e"/>
</svg>`, cls);
}

// 단추 그림 (선 굵기는 currentColor를 따른다)
const I = (d, extra = '') => `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICONS = {
  back: I('<path d="M20 6 L10 16 L20 26"/>'),
  undo: I('<path d="M11 8 L5 14 L11 20"/><path d="M5 14 H19 A8 8 0 0 1 19 30 H14"/>'),
  hint: I('<path d="M16 4 A8 8 0 0 1 21 18 C20 19 19.5 20.5 19.5 22 H12.5 C12.5 20.5 12 19 11 18 A8 8 0 0 1 16 4 Z"/><path d="M13 26 H19"/><path d="M14.5 29.5 H17.5"/>'),
  pencil: I('<path d="M6 26 L7.5 20 L21 6.5 L25.5 11 L12 24.5 Z"/><path d="M18.5 9 L23 13.5"/>'),
  erase: I('<path d="M12 27 H27"/><path d="M5 19 L16 8 L24 16 L15 25 H11 Z"/><path d="M11 13 L19 21"/>'),
  soundOn: I('<path d="M5 12 H10 L17 6 V26 L10 20 H5 Z"/><path d="M21 11 A6 6 0 0 1 21 21"/><path d="M24.5 7.5 A11 11 0 0 1 24.5 24.5"/>'),
  soundOff: I('<path d="M5 12 H10 L17 6 V26 L10 20 H5 Z"/><path d="M22 12 L28 20"/><path d="M28 12 L22 20"/>'),
  calendar: I('<rect x="5" y="7" width="22" height="20" rx="4"/><path d="M5 13 H27"/><path d="M11 4 V9"/><path d="M21 4 V9"/><path d="M11 19 L14.5 22.5 L21 16"/>'),
  dice: I('<rect x="5" y="5" width="22" height="22" rx="6"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/><circle cx="21" cy="21" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><circle cx="21" cy="11" r="1.6" fill="currentColor"/><circle cx="11" cy="21" r="1.6" fill="currentColor"/>'),
  lock: I('<rect x="7" y="14" width="18" height="14" rx="3"/><path d="M11 14 V10 A5 5 0 0 1 21 10 V14"/>'),
  check: I('<path d="M7 17 L13 23 L25 9"/>'),
  chart: I('<path d="M6 26 H27"/><path d="M9 26 V17"/><path d="M15 26 V9"/><path d="M21 26 V14"/>'),
  book: I('<path d="M16 9 C12 6 8 6 5 7 V25 C8 24 12 24 16 27 C20 24 24 24 27 25 V7 C24 6 20 6 16 9 Z"/><path d="M16 9 V27"/>'),
  clock: I('<circle cx="16" cy="17" r="11"/><path d="M16 11 V17 L20 20"/><path d="M13 3 H19"/>'),
  fill: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="6" y="6" width="20" height="20" rx="3" fill="currentColor"/></svg>`,
  cross: I('<rect x="6" y="6" width="20" height="20" rx="3" stroke-width="2.4"/><path d="M11 11 L21 21"/><path d="M21 11 L11 21"/>'),
  refresh: I('<path d="M26 16 A10 10 0 1 1 22 8"/><path d="M23 3 V9 H17"/>'),
  next: I('<path d="M6 16 H25"/><path d="M18 9 L25 16 L18 23"/>'),
  home: I('<path d="M5 15 L16 6 L27 15"/><path d="M8 13 V26 H24 V13"/><path d="M13.5 26 V19 H18.5 V26"/>'),
};

export function icon(name, cls) { return svg(ICONS[name], cls); }

export const flame = (cls) => svg(`
<svg viewBox="0 0 64 64" aria-hidden="true">
  <path d="M32 4 C36 16 50 22 50 40 A18 18 0 0 1 14 40 C14 30 20 24 24 18 C25 26 28 28 31 29 C29 20 30 12 32 4 Z" fill="#ff8a1f"/>
  <path d="M32 26 C34 33 42 36 42 45 A10 10 0 0 1 22 45 C22 39 26 36 28 32 C29 37 31 38 33 38 C32 34 31 30 32 26 Z" fill="#ffd166"/>
</svg>`, cls);

// 기호 '<' 하나를 돌려서 네 방향을 만든다. 뾰족한 쪽이 작은 수.
export function chevron(sym) {
  const rot = { '<': 0, '>': 180, '^': 90, v: -90 }[sym];
  return svg(`<svg viewBox="0 0 20 20" aria-hidden="true" style="transform:rotate(${rot}deg)"><path d="M14 3 L5 10 L14 17" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
}

// 첫 화면 카드 그림
export function puzzleArt(type, cls = 'art') {
  if (type === 'sudoku') {
    const nums = { 0: 1, 3: 4, 5: 3, 6: 2, 9: 2, 12: 3, 15: 1 };
    let cells = '';
    for (let i = 0; i < 16; i++) {
      const r = Math.floor(i / 4), c = i % 4;
      const x = 6 + c * 27 + (c >= 2 ? 4 : 0), y = 6 + r * 27 + (r >= 2 ? 4 : 0);
      cells += `<rect x="${x}" y="${y}" width="25" height="25" rx="4" fill="${i === 10 ? '#e2eeff' : '#fff'}"/>`;
      if (nums[i]) cells += `<text x="${x + 12.5}" y="${y + 19}" text-anchor="middle" font-size="18" font-weight="900" fill="${i === 6 ? '#2f7de1' : '#26213f'}" font-family="sans-serif">${nums[i]}</text>`;
    }
    return svg(`<svg viewBox="0 0 122 122" aria-hidden="true"><rect x="1" y="1" width="120" height="120" rx="14" fill="#26213f"/>${cells}<rect x="60.5" y="64.5" width="27" height="27" rx="5" fill="none" stroke="#2f7de1" stroke-width="3"/></svg>`, cls);
  }
  if (type === 'nonogram') {
    // 작은 보석 그림 (단서가 그림과 꼭 맞는다)
    const pic = ['00100', '01110', '11111', '01110', '00100'];
    let cells = '';
    pic.forEach((row, r) => [...row].forEach((v, c) => {
      cells += `<rect x="${34 + c * 17}" y="${34 + r * 17}" width="16" height="16" rx="2" fill="${v === '1' ? '#1f9d6b' : '#fff'}"/>`;
    }));
    const colClues = ['1', '3', '5', '3', '1'];
    const rowClues = ['1', '3', '5', '3', '1'];
    let clues = '';
    colClues.forEach((t, c) => { clues += `<text x="${42 + c * 17}" y="27" text-anchor="middle" font-size="12" font-weight="900" fill="#26213f" font-family="sans-serif">${t}</text>`; });
    rowClues.forEach((t, r) => { clues += `<text x="25" y="${46 + r * 17}" text-anchor="middle" font-size="12" font-weight="900" fill="#26213f" font-family="sans-serif">${t}</text>`; });
    return svg(`<svg viewBox="0 0 122 122" aria-hidden="true"><rect x="1" y="1" width="120" height="120" rx="14" fill="#dcf5ea"/><rect x="32" y="32" width="88" height="88" rx="6" fill="#26213f"/>${cells}${clues}</svg>`, cls);
  }
  // 부등호
  const box = (x, y, t, given) => `<rect x="${x}" y="${y}" width="34" height="34" rx="8" fill="${given ? '#f3f0e8' : '#fff'}" stroke="#26213f" stroke-width="3"/>${t ? `<text x="${x + 17}" y="${y + 25}" text-anchor="middle" font-size="22" font-weight="900" fill="${given ? '#26213f' : '#ea7a1c'}" font-family="sans-serif">${t}</text>` : ''}`;
  const lt = (x, y, rot) => `<path d="M${x + 5} ${y - 7} L${x - 4} ${y} L${x + 5} ${y + 7}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="#26213f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg(`<svg viewBox="0 0 122 122" aria-hidden="true"><rect x="1" y="1" width="120" height="120" rx="14" fill="#ffeedd"/>
    ${box(10, 12, '1', true)}${lt(61, 29, 0)}${box(78, 12, '3', false)}
    ${lt(27, 61, 90)}${lt(95, 61, -90)}
    ${box(10, 76, '2', false)}${lt(61, 93, 180)}${box(78, 76, '', false)}</svg>`, cls);
}
