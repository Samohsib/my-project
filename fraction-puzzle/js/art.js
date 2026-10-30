// 이 앱만의 캐릭터와 그림 (모두 직접 그린 SVG)
//  조각이: 네 조각으로 나뉜 동그란 파이 몸통의 분수 친구
//  콕이  : 소수점처럼 작고 동그란 소수 친구 (머리에 노란 점 더듬이)

const EYES = {
  happy: (x, y) => `<circle cx="${x}" cy="${y}" r="8.5" fill="#fff"/><circle cx="${x + 1.5}" cy="${y + 1.5}" r="4.4" fill="#2d2350"/><circle cx="${x}" cy="${y - 0.8}" r="1.6" fill="#fff"/>`,
  think: (x, y) => `<circle cx="${x}" cy="${y}" r="8.5" fill="#fff"/><circle cx="${x + 3}" cy="${y - 2.5}" r="4.4" fill="#2d2350"/><circle cx="${x + 1.8}" cy="${y - 4.4}" r="1.6" fill="#fff"/>`,
  oops: (x, y) => `<circle cx="${x}" cy="${y}" r="8.5" fill="#fff"/><circle cx="${x}" cy="${y + 2}" r="4" fill="#2d2350"/>`,
  joy: (x, y) => `<path d="M${x - 7} ${y + 2} Q${x} ${y - 8} ${x + 7} ${y + 2}" stroke="#2d2350" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
};
const MOUTH = {
  happy: '<path d="M51 71 Q60 80 69 71" stroke="#2d2350" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  think: '<path d="M53 74 Q60 71 67 74" stroke="#2d2350" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  oops: '<ellipse cx="60" cy="74" rx="5" ry="6" fill="#2d2350"/><ellipse cx="60" cy="76" rx="3" ry="2.6" fill="#ff7b8a"/>',
  joy: '<path d="M49 69 Q60 86 71 69 Z" fill="#2d2350"/><path d="M53 75 Q60 82 67 75 Z" fill="#ff7b8a"/>',
};

export function jogak(mood = 'happy', cls = 'mascot') {
  const m = EYES[mood] ? mood : 'happy';
  return `<svg class="${cls}" viewBox="0 0 120 124" aria-hidden="true">
  <ellipse cx="60" cy="118" rx="30" ry="4.5" fill="rgba(0,0,0,.12)"/>
  <ellipse cx="44" cy="110" rx="11" ry="6.5" fill="#c4572a"/>
  <ellipse cx="76" cy="110" rx="11" ry="6.5" fill="#c4572a"/>
  <path d="M15 62 Q4 58 7 47" stroke="#c4572a" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M105 62 Q116 58 113 47" stroke="#c4572a" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="60" cy="62" r="48" fill="#eb9a45"/>
  <circle cx="60" cy="62" r="40.5" fill="#ffd77a"/>
  <path d="M60 62 L60 21.5 A40.5 40.5 0 0 1 100.5 62 Z" fill="#ff9466"/>
  <path d="M60 21.5 V36 M60 88 V102.5 M19.5 62 H32 M88 62 H100.5" stroke="#eb9a45" stroke-width="3" stroke-linecap="round"/>
  <circle cx="84" cy="40" r="4" fill="#e0533d" opacity=".8"/><circle cx="32" cy="88" r="3.4" fill="#e0533d" opacity=".55"/>
  <circle cx="90" cy="84" r="3" fill="#e0533d" opacity=".55"/>
  ${EYES[m](45, 56)}${EYES[m](75, 56)}
  <circle cx="35" cy="70" r="5.5" fill="#ff7b7b" opacity=".45"/><circle cx="85" cy="70" r="5.5" fill="#ff7b7b" opacity=".45"/>
  ${MOUTH[m]}
</svg>`;
}

export function kok(mood = 'happy', cls = 'mascot') {
  const m = EYES[mood] ? mood : 'happy';
  return `<svg class="${cls}" viewBox="0 0 120 124" aria-hidden="true">
  <ellipse cx="60" cy="118" rx="28" ry="4.5" fill="rgba(0,0,0,.12)"/>
  <path d="M60 26 Q58 12 70 8" stroke="#0b7285" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <circle cx="72" cy="8" r="7" fill="#ffd43b" stroke="#f59f00" stroke-width="2"/>
  <ellipse cx="45" cy="111" rx="10" ry="6" fill="#0b7285"/><ellipse cx="75" cy="111" rx="10" ry="6" fill="#0b7285"/>
  <circle cx="60" cy="66" r="44" fill="#22b8cf"/>
  <circle cx="60" cy="66" r="44" fill="none" stroke="#0c8599" stroke-width="3"/>
  <ellipse cx="44" cy="40" rx="12" ry="7" fill="#fff" opacity=".35" transform="rotate(-25 44 40)"/>
  ${EYES[m](46, 64)}${EYES[m](74, 64)}
  <circle cx="35" cy="78" r="5.5" fill="#ff8fab" opacity=".5"/><circle cx="85" cy="78" r="5.5" fill="#ff8fab" opacity=".5"/>
  <g transform="translate(0 8)">${MOUTH[m]}</g>
</svg>`;
}

// 단원마다 쓰는 작은 그림
const PIE = (cx, cy, r, k, n, fill) => {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff4dc" stroke="#c4572a" stroke-width="3"/>`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / k) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / k) * 2 * Math.PI - Math.PI / 2;
    s += `<path d="M${cx} ${cy} L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)} Z" fill="${fill}" stroke="#c4572a" stroke-width="2"/>`;
  }
  for (let i = 0; i < k; i++) {
    const a = (i / k) * 2 * Math.PI - Math.PI / 2;
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + r * Math.cos(a)).toFixed(1)}" y2="${(cy + r * Math.sin(a)).toFixed(1)}" stroke="#c4572a" stroke-width="2"/>`;
  }
  return s;
};

export const ICONS = {
  pizza: `<svg viewBox="0 0 64 64">${PIE(32, 32, 26, 8, 3, '#ff9f43')}</svg>`,
  pizzas: `<svg viewBox="0 0 64 64">${PIE(20, 34, 16, 4, 4, '#ff9f43')}${PIE(46, 34, 16, 4, 3, '#ff9f43')}</svg>`,
  scale: `<svg viewBox="0 0 64 64"><rect x="6" y="14" width="52" height="12" rx="3" fill="#fff" stroke="#5b3fd1" stroke-width="2.5"/><rect x="6" y="14" width="39" height="12" rx="3" fill="#b9a8ff"/><rect x="6" y="38" width="52" height="12" rx="3" fill="#fff" stroke="#5b3fd1" stroke-width="2.5"/><rect x="6" y="38" width="26" height="12" rx="3" fill="#b9a8ff"/><path d="M19 14 V26 M32 14 V26 M45 14 V26 M32 38 V50" stroke="#5b3fd1" stroke-width="2"/></svg>`,
  plusminus: `<svg viewBox="0 0 64 64"><rect x="6" y="22" width="52" height="20" rx="4" fill="#fff" stroke="#14804a" stroke-width="2.5"/><rect x="6" y="22" width="21" height="20" rx="4" fill="#4d96ff"/><rect x="27" y="22" width="18" height="20" fill="#ff9f1c"/><path d="M19 22 V42 M32 22 V42 M45 22 V42" stroke="#14804a" stroke-width="2"/><text x="32" y="16" font-size="15" text-anchor="middle" fill="#14804a" font-weight="900">+ −</text></svg>`,
  grid: `<svg viewBox="0 0 64 64"><rect x="8" y="8" width="48" height="48" fill="#fff" stroke="#0f6fa3" stroke-width="2.5"/><rect x="8" y="8" width="28.8" height="48" fill="#7cc8f0"/><rect x="36.8" y="8" width="4.8" height="24" fill="#7cc8f0"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${8 + 4.8 * (i + 1)} 8 V56 M8 ${8 + 4.8 * (i + 1)} H56" stroke="#0f6fa3" stroke-width=".8"/>`).join('')}</svg>`,
  scale2: `<svg viewBox="0 0 64 64"><text x="32" y="28" font-size="18" text-anchor="middle" fill="#b0306f" font-weight="900">0.5</text><text x="32" y="56" font-size="18" text-anchor="middle" fill="#b0306f" font-weight="900">0.48</text><path d="M14 36 H50" stroke="#b0306f" stroke-width="2.5" stroke-dasharray="3 3"/></svg>`,
  plusminus2: `<svg viewBox="0 0 64 64"><text x="50" y="26" font-size="17" text-anchor="end" fill="#006b6b" font-weight="900">0.37</text><text x="50" y="44" font-size="17" text-anchor="end" fill="#006b6b" font-weight="900">+0.25</text><path d="M12 49 H54" stroke="#006b6b" stroke-width="2.5"/><text x="50" y="62" font-size="13" text-anchor="end" fill="#006b6b" font-weight="900">?</text></svg>`,
  line: `<svg viewBox="0 0 64 64"><path d="M4 40 H60" stroke="#8a5a00" stroke-width="3" stroke-linecap="round"/>${Array.from({ length: 11 }, (_, i) => `<path d="M${6 + i * 5.2} ${i % 5 ? 35 : 31} V45" stroke="#8a5a00" stroke-width="${i % 5 ? 1.5 : 2.5}"/>`).join('')}<path d="M37.2 40 V12" stroke="#e8590c" stroke-width="2.5"/><path d="M37.2 12 L52 17 L37.2 22 Z" fill="#ff6b3d"/></svg>`,
  challenge: `<svg viewBox="0 0 64 64"><path d="M32 6 L39.5 23 L58 24.5 L44 36.5 L48.5 55 L32 45 L15.5 55 L20 36.5 L6 24.5 L24.5 23 Z" fill="#ffd43b" stroke="#e67700" stroke-width="3" stroke-linejoin="round"/></svg>`,
};

export const STAR = (on) => `<svg class="star ${on ? 'on' : ''}" viewBox="0 0 24 24"><path d="M12 2.5 L14.8 8.6 L21.5 9.3 L16.4 13.8 L17.9 20.4 L12 17 L6.1 20.4 L7.6 13.8 L2.5 9.3 L9.2 8.6 Z"/></svg>`;
export const HEART = (on) => `<svg class="heart ${on ? 'on' : ''}" viewBox="0 0 24 24"><path d="M12 21 C5 15.5 2 12 2 8 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8 C22 12 19 15.5 12 21 Z"/></svg>`;
