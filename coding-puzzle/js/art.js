// 그림 모음: 로봇 '반짝이', 판의 칸들, 별, 깃발, 블록 아이콘을 모두 SVG로 직접 그린다.
// 판 SVG는 한 칸을 100×100으로 놓고 그린다.

const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag, attrs = {}, html = '') {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  return el;
}

// ── 로봇 반짝이 ── (가운데 0,0 / 발끝 y≈38)
// 보는 방향마다 모습이 다르다: 아래(얼굴), 위(등), 오른쪽(옆), 왼쪽(옆을 뒤집어서)
const STAR_PATH = (cx, cy, r) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
};

const ROBOT_COMMON = {
  antenna: `<line x1="0" y1="-31" x2="0" y2="-43" stroke="#475569" stroke-width="3.5" stroke-linecap="round"/>
    <path class="rb-tip" d="${STAR_PATH(0, -47, 8)}" fill="#fde047" stroke="#ca8a04" stroke-width="2" stroke-linejoin="round"/>`,
  feet: `<rect x="-17" y="28" width="14" height="10" rx="4.5" fill="#334155"/>
    <rect x="3" y="28" width="14" height="10" rx="4.5" fill="#334155"/>`,
};

const ROBOT_VIEWS = {
  // 아래를 볼 때: 얼굴이 보인다
  down: `
    ${ROBOT_COMMON.antenna}
    <rect x="-27" y="-21" width="7" height="13" rx="3.5" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
    <rect x="20" y="-21" width="7" height="13" rx="3.5" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
    <rect x="-23" y="-33" width="46" height="35" rx="13" fill="#f8fafc" stroke="#334155" stroke-width="3.5"/>
    <rect x="-17" y="-27" width="34" height="23" rx="8" fill="#1e293b"/>
    <ellipse class="rb-eye" cx="-7.5" cy="-17" rx="4" ry="5.5" fill="#67e8f9"/>
    <ellipse class="rb-eye" cx="7.5" cy="-17" rx="4" ry="5.5" fill="#67e8f9"/>
    <path d="M-5 -10 Q0 -6 5 -10" stroke="#67e8f9" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="-14" cy="-8" r="2.6" fill="#f9a8d4" opacity=".8"/><circle cx="14" cy="-8" r="2.6" fill="#f9a8d4" opacity=".8"/>
    <rect x="-27" y="5" width="9" height="17" rx="4.5" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5"/>
    <rect x="18" y="5" width="9" height="17" rx="4.5" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5"/>
    <rect x="-19" y="1" width="38" height="29" rx="10" fill="#2dd4bf" stroke="#0f766e" stroke-width="3.5"/>
    <path d="${STAR_PATH(0, 15, 7)}" fill="#fef08a" stroke="#ca8a04" stroke-width="1.8" stroke-linejoin="round"/>
    ${ROBOT_COMMON.feet}`,
  // 위를 볼 때: 등이 보인다
  up: `
    ${ROBOT_COMMON.antenna}
    <rect x="-27" y="-21" width="7" height="13" rx="3.5" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
    <rect x="20" y="-21" width="7" height="13" rx="3.5" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
    <rect x="-23" y="-33" width="46" height="35" rx="13" fill="#e2e8f0" stroke="#334155" stroke-width="3.5"/>
    <path d="M-11 -21 H11 M-11 -15 H11 M-11 -9 H11" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="-27" y="5" width="9" height="17" rx="4.5" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5"/>
    <rect x="18" y="5" width="9" height="17" rx="4.5" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5"/>
    <rect x="-19" y="1" width="38" height="29" rx="10" fill="#14b8a6" stroke="#0f766e" stroke-width="3.5"/>
    <rect x="-10" y="7" width="20" height="16" rx="4" fill="#ccfbf1" stroke="#0f766e" stroke-width="2"/>
    <rect x="-6" y="11" width="5" height="8" rx="1" fill="#22c55e"/><rect x="1" y="11" width="5" height="8" rx="1" fill="#22c55e"/>
    ${ROBOT_COMMON.feet}`,
  // 오른쪽을 볼 때: 옆모습 (왼쪽은 이걸 뒤집는다)
  right: `
    ${ROBOT_COMMON.antenna}
    <rect x="-24" y="-20" width="7" height="13" rx="3.5" fill="#fb923c" stroke="#9a3412" stroke-width="2"/>
    <rect x="-20" y="-33" width="42" height="35" rx="13" fill="#f8fafc" stroke="#334155" stroke-width="3.5"/>
    <rect x="2" y="-27" width="17" height="23" rx="7" fill="#1e293b"/>
    <ellipse class="rb-eye" cx="12" cy="-17" rx="3.6" ry="5.5" fill="#67e8f9"/>
    <path d="M7 -9 Q11 -6 15 -9" stroke="#67e8f9" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <rect x="-16" y="1" width="34" height="29" rx="10" fill="#2dd4bf" stroke="#0f766e" stroke-width="3.5"/>
    <rect x="-5" y="6" width="9" height="18" rx="4.5" fill="#99f6e4" stroke="#0f766e" stroke-width="2.5" class="rb-arm"/>
    <rect x="-12" y="28" width="16" height="10" rx="4.5" fill="#334155"/>
    <rect x="4" y="28" width="15" height="10" rx="4.5" fill="#475569"/>`,
};

export function robotSVG(view) {
  if (view === 'left') return `<g transform="scale(-1,1)">${ROBOT_VIEWS.right}</g>`;
  return ROBOT_VIEWS[view] || ROBOT_VIEWS.down;
}

export const VIEW_FOR_DIR = ['up', 'right', 'down', 'left'];

// 앱 아이콘·첫 화면용 큰 반짝이 (viewBox -60 -70 120 120)
export function robotBadge() {
  return `<svg viewBox="-60 -66 120 116" aria-hidden="true">
    <ellipse cx="0" cy="40" rx="30" ry="6" fill="rgba(0,0,0,.18)"/>
    <g>${ROBOT_VIEWS.down}</g>
  </svg>`;
}

// ── 판 꾸미기 ──
export const THEMES = {
  meadow: { bg: '#5ccf7d', bg2: '#4cbc6c', floor: '#fdf1c7', floorEdge: '#e9d48f', plant: 'tree' },
  desert: { bg: '#f4c063', bg2: '#e8ad4c', floor: '#fff5dc', floorEdge: '#e7cf9b', plant: 'cactus' },
  snow:   { bg: '#cfe4f7', bg2: '#bcd6ee', floor: '#ffffff', floorEdge: '#c7dbef', plant: 'pine' },
  cave:   { bg: '#3b3474', bg2: '#332c66', floor: '#e4dcff', floorEdge: '#b9a9f0', plant: 'crystal' },
};

const PLANTS = {
  tree: `<ellipse cx="50" cy="82" rx="26" ry="7" fill="rgba(0,0,0,.15)"/>
    <rect x="44" y="56" width="12" height="26" rx="4" fill="#92400e"/>
    <circle cx="50" cy="42" r="27" fill="#15803d"/><circle cx="38" cy="50" r="17" fill="#16a34a"/>
    <circle cx="62" cy="48" r="18" fill="#16a34a"/><circle cx="44" cy="34" r="9" fill="#22c55e" opacity=".8"/>`,
  cactus: `<ellipse cx="50" cy="84" rx="22" ry="6" fill="rgba(0,0,0,.15)"/>
    <rect x="40" y="22" width="20" height="62" rx="10" fill="#4d7c0f"/>
    <path d="M40 54 H30 a8 8 0 0 1 -8 -8 V36" stroke="#4d7c0f" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M60 46 H69 a8 8 0 0 0 8 -8 V30" stroke="#4d7c0f" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M50 28 V78" stroke="#65a30d" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="20" r="5" fill="#f472b6"/>`,
  pine: `<ellipse cx="50" cy="84" rx="24" ry="6" fill="rgba(0,0,0,.12)"/>
    <rect x="45" y="70" width="10" height="14" rx="3" fill="#78350f"/>
    <path d="M50 10 L78 46 H62 L84 74 H16 L38 46 H22 Z" fill="#166534"/>
    <path d="M50 10 L64 28 Q56 32 50 26 Q44 32 36 28 Z M30 52 Q40 58 50 52 Q60 58 70 52 L62 46 H38 Z" fill="#fff"/>`,
  crystal: `<ellipse cx="50" cy="84" rx="26" ry="6" fill="rgba(0,0,0,.25)"/>
    <path d="M50 12 L64 40 L56 84 H44 L36 40 Z" fill="#67e8f9" stroke="#0e7490" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 48 L40 62 L36 84 H24 L20 62 Z" fill="#a5b4fc" stroke="#4338ca" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 44 L80 60 L77 84 H65 L62 60 Z" fill="#f0abfc" stroke="#a21caf" stroke-width="3" stroke-linejoin="round"/>
    <path d="M50 18 L55 40" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
};

const ROCK = `<ellipse cx="50" cy="80" rx="32" ry="8" fill="rgba(0,0,0,.18)"/>
  <path d="M18 78 Q14 52 32 38 Q44 22 62 30 Q84 38 84 62 Q86 80 70 82 H28 Q20 82 18 78 Z" fill="#94a3b8" stroke="#475569" stroke-width="3.5"/>
  <path d="M34 44 Q44 34 56 38" stroke="#e2e8f0" stroke-width="4" fill="none" stroke-linecap="round"/>`;

const WATER = `<rect x="0" y="0" width="100" height="100" fill="#60a5fa"/>
  <path d="M10 34 q10 -8 20 0 t20 0 t20 0 t20 0 M10 66 q10 -8 20 0 t20 0 t20 0 t20 0" stroke="#bfdbfe" stroke-width="4" fill="none" stroke-linecap="round">
    <animateTransform attributeName="transform" type="translate" values="0 0; -6 0; 0 0" dur="3s" repeatCount="indefinite"/>
  </path>`;

export function obstacleSVG(ch, theme) {
  if (ch === '~') return WATER;
  if (ch === '#') return ROCK;
  return PLANTS[THEMES[theme].plant];
}

export function floorSVG(theme) {
  const t = THEMES[theme];
  return `<rect x="5" y="5" width="90" height="90" rx="16" fill="${t.floor}" stroke="${t.floorEdge}" stroke-width="4"/>`;
}

export function starSVG() {
  return `<g class="star-art">
    <circle cx="50" cy="50" r="30" fill="#fde68a" opacity=".55"/>
    <path d="${STAR_PATH(50, 52, 27)}" fill="#facc15" stroke="#b45309" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 44 L46 40" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
    <animateTransform attributeName="transform" type="translate" values="0 0; 0 -5; 0 0" dur="1.6s" repeatCount="indefinite"/>
  </g>`;
}

export function flagSVG() {
  return `<ellipse cx="44" cy="86" rx="20" ry="5" fill="rgba(0,0,0,.18)"/>
    <rect x="34" y="16" width="7" height="70" rx="3" fill="#7c2d12"/>
    <circle cx="37.5" cy="15" r="6" fill="#fde047" stroke="#a16207" stroke-width="2"/>
    <path fill="#ef4444" stroke="#991b1b" stroke-width="3" stroke-linejoin="round" d="M41 20 Q58 14 76 24 Q60 34 41 44 Z">
      <animate attributeName="d" dur="1.4s" repeatCount="indefinite"
        values="M41 20 Q58 14 76 24 Q60 34 41 44 Z;M41 20 Q58 26 76 26 Q60 30 41 44 Z;M41 20 Q58 14 76 24 Q60 34 41 44 Z"/>
    </path>`;
}

// ── 블록 아이콘 (24×24) ──
export const BLOCK_ICONS = {
  F: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 12 H15 V21 H9 V12 H4 Z" fill="currentColor"/></svg>`,
  L: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 20 V12 a6 6 0 0 0 -6 -6 H9" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M10 1.5 L3 6 L10 10.5 Z" fill="currentColor"/></svg>`,
  R: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 V12 a6 6 0 0 1 6 -6 H15" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M14 1.5 L21 6 L14 10.5 Z" fill="currentColor"/></svg>`,
  rep: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12 a7 7 0 0 1 12 -5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M19 3 V9 H13 Z" fill="currentColor"/><path d="M19 12 a7 7 0 0 1 -12 5" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M5 21 V15 H11 Z" fill="currentColor"/></svg>`,
  P: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH(12, 12.5, 10.5)}" fill="currentColor" stroke-linejoin="round"/></svg>`,
  if: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L22 12 L12 22 L2 12 Z" fill="currentColor"/><text x="12" y="16.5" font-size="12" font-weight="900" text-anchor="middle" fill="#fff" font-family="sans-serif">?</text></svg>`,
};

export const STAR_ICON = (filled) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${filled ? 'on' : 'off'}"><path d="${STAR_PATH(12, 12.8, 11)}" stroke-linejoin="round"/></svg>`;
