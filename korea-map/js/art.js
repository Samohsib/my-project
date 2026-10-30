// 그림 모음: 안내 캐릭터 '탐험가 달수'(수달), 작은 그림 아이콘, 도장. 모두 직접 그린 SVG.

// 시·도 색 (이웃끼리 다른 색이 되도록 고름)
export const REGION_COLORS = {
  11: '#ffd6a5', 12: '#c7f0bd', 26: '#a8e8f0', 27: '#ffb8b8', 28: '#cdc4ff', 30: '#a8e8f0',
  31: '#fbf3a8', 36: '#ffd6a5', 41: '#b4d0ff', 43: '#fbf3a8', 44: '#ffb8b8', 47: '#cdc4ff',
  48: '#ffd6a5', 50: '#f6c8f6', 51: '#c7f0bd', 52: '#b4d0ff',
};

// 단계별 도장 잉크 색
export const INK = { 1: '#d6336c', 2: '#1971c2', 3: '#2b8a3e', 4: '#7048e8' };

// 탐험가 달수 (mood: 'idle' | 'happy' | 'think')
export function otterSVG(mood = 'idle', extraClass = '') {
  const eyes = mood === 'happy'
    ? `<path d="M74 92 Q82 82 90 92" stroke="#2b1d14" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M110 92 Q118 82 126 92" stroke="#2b1d14" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<circle cx="82" cy="${mood === 'think' ? 86 : 90}" r="7.5" fill="#2b1d14"/>
       <circle cx="118" cy="${mood === 'think' ? 86 : 90}" r="7.5" fill="#2b1d14"/>
       <circle cx="84.5" cy="${mood === 'think' ? 83.5 : 87.5}" r="2.6" fill="#fff"/>
       <circle cx="120.5" cy="${mood === 'think' ? 83.5 : 87.5}" r="2.6" fill="#fff"/>`;
  const mouth = mood === 'happy'
    ? '<path d="M89 114 Q100 130 111 114 Z" fill="#7a2e2e"/><path d="M93 121 Q100 127 107 121" fill="#ff8a8a"/>'
    : mood === 'think'
      ? '<circle cx="104" cy="118" r="4" fill="#7a2e2e"/>'
      : '<path d="M91 114 Q100 122 109 114" stroke="#2b1d14" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  return `<svg class="otter ${extraClass}" viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="탐험가 달수">
  <path d="M52 178 Q14 186 18 214 Q40 206 62 196 Z" fill="#7a4f30"/>
  <ellipse cx="100" cy="163" rx="52" ry="52" fill="#9b6a43"/>
  <ellipse cx="100" cy="173" rx="34" ry="36" fill="#f1d9b5"/>
  <ellipse cx="78" cy="214" rx="17" ry="9" fill="#7a4f30"/>
  <ellipse cx="122" cy="214" rx="17" ry="9" fill="#7a4f30"/>
  <path d="M60 128 Q100 146 140 128 L136 142 Q100 158 64 142 Z" fill="#e8533f"/>
  <path d="M124 138 L146 160 L128 160 Z" fill="#c43b2a"/>
  <ellipse cx="58" cy="160" rx="13" ry="18" fill="#8a5c39" transform="rotate(20 58 160)"/>
  <g transform="rotate(-18 152 130)">
    <rect x="148" y="140" width="8" height="30" rx="4" fill="#5b3b22"/>
    <circle cx="152" cy="126" r="17" fill="#d8f1ff" fill-opacity="0.75" stroke="#5b3b22" stroke-width="6"/>
    <path d="M144 120 Q148 114 154 114" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
  <ellipse cx="142" cy="158" rx="12" ry="15" fill="#8a5c39"/>
  <circle cx="58" cy="60" r="13" fill="#9b6a43"/><circle cx="58" cy="60" r="6.5" fill="#6e4528"/>
  <circle cx="142" cy="60" r="13" fill="#9b6a43"/><circle cx="142" cy="60" r="6.5" fill="#6e4528"/>
  <circle cx="100" cy="94" r="50" fill="#9b6a43"/>
  <ellipse cx="100" cy="113" rx="31" ry="23" fill="#f1d9b5"/>
  <circle cx="68" cy="108" r="7" fill="#ff9aa9" opacity="0.6"/><circle cx="132" cy="108" r="7" fill="#ff9aa9" opacity="0.6"/>
  ${eyes}
  <ellipse cx="100" cy="104" rx="9" ry="6.5" fill="#2b1d14"/>
  ${mouth}
  <g stroke="#6e4528" stroke-width="2" stroke-linecap="round">
    <line x1="74" y1="112" x2="52" y2="108"/><line x1="74" y1="117" x2="53" y2="119"/>
    <line x1="126" y1="112" x2="148" y2="108"/><line x1="126" y1="117" x2="147" y2="119"/>
  </g>
  <ellipse cx="100" cy="62" rx="66" ry="11" fill="#c99a4b"/>
  <path d="M52 60 Q54 16 100 14 Q146 16 148 60 Z" fill="#e3bd6f"/>
  <path d="M53 52 Q100 60 147 52 L148 60 Q100 68 52 60 Z" fill="#7a5230"/>
  <path d="M80 22 Q100 16 120 22" stroke="#f3d898" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="100" cy="40" r="9" fill="#fff4d6" stroke="#7a5230" stroke-width="2.5"/>
  <path d="M100 33 L103 40 L100 47 L97 40 Z" fill="#e8533f"/>
</svg>`;
}

// 64×64 작은 그림
const ICONS = {
  region: '<path d="M32 6c-10 0-18 8-18 18 0 14 18 32 18 32s18-18 18-32c0-10-8-18-18-18z" fill="#e8533f"/><circle cx="32" cy="24" r="7" fill="#fff"/>',
  city: '<rect x="10" y="26" width="14" height="30" fill="#5c7cfa"/><rect x="26" y="12" width="14" height="44" fill="#4263eb"/><rect x="42" y="30" width="12" height="26" fill="#748ffc"/><g fill="#fff"><rect x="29" y="18" width="3" height="4"/><rect x="34" y="18" width="3" height="4"/><rect x="29" y="28" width="3" height="4"/><rect x="34" y="28" width="3" height="4"/><rect x="13" y="32" width="3" height="4"/><rect x="18" y="32" width="3" height="4"/><rect x="45" y="36" width="3" height="4"/></g><rect x="6" y="56" width="52" height="3" fill="#495057"/>',
  palace: '<path d="M6 26 Q32 10 58 26 L52 28 H12 Z" fill="#2f9e44"/><rect x="14" y="28" width="36" height="6" fill="#c92a2a"/><path d="M10 36 Q32 26 54 36 L50 38 H14 Z" fill="#2f9e44"/><rect x="16" y="38" width="32" height="16" fill="#e8590c"/><rect x="28" y="42" width="8" height="12" fill="#5c3d1e"/><rect x="8" y="54" width="48" height="4" fill="#868e96"/>',
  beach: '<circle cx="46" cy="16" r="8" fill="#fcc419"/><rect x="0" y="34" width="64" height="14" fill="#4dabf7"/><path d="M0 40 Q8 36 16 40 T32 40 T48 40 T64 40" stroke="#fff" stroke-width="2" fill="none"/><rect x="0" y="48" width="64" height="16" fill="#ffe8a3"/><path d="M18 50 L22 22" stroke="#8a5c39" stroke-width="2.5"/><path d="M8 26 Q22 12 36 26 Z" fill="#ff6b6b"/>',
  market: '<rect x="8" y="26" width="48" height="30" fill="#ffe8cc"/><path d="M6 14 H58 L56 26 H8 Z" fill="#fff"/><g fill="#f03e3e"><path d="M6 14 H15 L14 26 H8 Z"/><path d="M24 14 H33 L33 26 H25 Z"/><path d="M42 14 H51 L52 26 H44 Z"/></g><circle cx="20" cy="42" r="6" fill="#fab005"/><circle cx="32" cy="44" r="6" fill="#e8590c"/><circle cx="44" cy="42" r="6" fill="#40c057"/><rect x="8" y="48" width="48" height="8" fill="#a0612a"/>',
  plane: '<path d="M6 36 L30 30 L44 10 L50 10 L42 30 L56 28 Q62 30 56 34 L42 36 L50 54 L44 54 L30 38 L8 40 Z" fill="#339af0"/><circle cx="20" cy="34" r="1.6" fill="#fff"/><circle cx="26" cy="33" r="1.6" fill="#fff"/>',
  tower: '<path d="M32 4 L36 20 L28 20 Z" fill="#adb5bd"/><path d="M26 20 H38 L42 56 H22 Z" fill="#74c0fc"/><ellipse cx="32" cy="24" rx="12" ry="5" fill="#1c7ed6"/><rect x="18" y="56" width="28" height="4" fill="#495057"/><path d="M29 30 H35 M28 38 H36 M27 46 H37" stroke="#fff" stroke-width="2"/>',
  whale: '<rect x="4" y="8" width="56" height="50" rx="10" fill="#c9a27a"/><path d="M12 34 Q24 22 40 30 Q46 26 50 22 L50 34 Q46 32 42 36 Q26 46 12 34 Z" fill="#5c3d1e"/><circle cx="18" cy="32" r="1.6" fill="#c9a27a"/><path d="M14 50 L20 44 L26 50 M34 48 L40 42 L46 48" stroke="#5c3d1e" stroke-width="2.5" fill="none"/>',
  lake: '<ellipse cx="32" cy="40" rx="28" ry="16" fill="#74c0fc"/><path d="M14 40 Q20 36 26 40 T38 40 T50 40" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M8 26 L14 12 L20 26 Z M44 24 L52 8 L60 24 Z" fill="#40c057"/>',
  fortress: '<path d="M6 24 h8 v-6 h6 v6 h8 v-6 h8 v6 h8 v-6 h6 v6 h8 v34 H6 Z" fill="#ced4da"/><path d="M6 32 H58 M6 42 H58 M20 24 V58 M44 24 V58" stroke="#adb5bd" stroke-width="1.5"/><path d="M24 58 V44 Q32 34 40 44 V58 Z" fill="#5c3d1e"/><path d="M22 12 Q32 2 42 12 L40 14 H24 Z" fill="#2f9e44"/>',
  pavilion: '<path d="M4 24 Q32 6 60 24 L54 26 H10 Z" fill="#2f9e44"/><rect x="12" y="26" width="40" height="5" fill="#c92a2a"/><g fill="#e8590c"><rect x="14" y="31" width="4" height="22"/><rect x="30" y="31" width="4" height="22"/><rect x="46" y="31" width="4" height="22"/></g><rect x="8" y="52" width="48" height="5" fill="#868e96"/><path d="M0 60 Q16 56 32 60 T64 60" stroke="#4dabf7" stroke-width="3" fill="none"/>',
  peaks: '<rect x="0" y="44" width="64" height="20" fill="#4dabf7"/><path d="M6 46 Q10 22 18 46 Z M22 46 Q30 10 40 46 Z M44 46 Q50 26 58 46 Z" fill="#69db7c" stroke="#2b8a3e" stroke-width="2"/><path d="M4 52 Q14 48 24 52 T44 52 T64 52" stroke="#fff" stroke-width="2" fill="none"/>',
  museum: '<path d="M6 22 L32 8 L58 22 Z" fill="#868e96"/><rect x="8" y="22" width="48" height="5" fill="#adb5bd"/><g fill="#dee2e6"><rect x="12" y="28" width="6" height="22"/><rect x="24" y="28" width="6" height="22"/><rect x="36" y="28" width="6" height="22"/><rect x="48" y="28" width="6" height="22"/></g><rect x="6" y="50" width="52" height="6" fill="#868e96"/>',
  village: '<path d="M4 34 Q18 22 32 34 L28 36 H8 Z" fill="#495057"/><rect x="9" y="36" width="18" height="16" fill="#fff4e6"/><rect x="15" y="42" width="6" height="10" fill="#a0612a"/><path d="M30 28 Q46 14 62 28 L58 30 H34 Z" fill="#495057"/><rect x="36" y="30" width="22" height="22" fill="#fff4e6"/><rect x="44" y="38" width="7" height="14" fill="#a0612a"/><rect x="2" y="52" width="60" height="5" fill="#8ce99a"/>',
  wetland: '<rect x="0" y="40" width="64" height="24" fill="#a5d8ff"/><g stroke="#b08900" stroke-width="2.5"><path d="M10 44 V18 M18 44 V12 M26 44 V22 M40 44 V14 M48 44 V20 M56 44 V26"/></g><g fill="#e0b84c"><ellipse cx="10" cy="16" rx="3" ry="6"/><ellipse cx="18" cy="10" rx="3" ry="6"/><ellipse cx="26" cy="20" rx="3" ry="6"/><ellipse cx="40" cy="12" rx="3" ry="6"/><ellipse cx="48" cy="18" rx="3" ry="6"/><ellipse cx="56" cy="24" rx="3" ry="6"/></g><circle cx="32" cy="52" r="5" fill="#e8590c"/><path d="M26 50 L22 46 M38 50 L42 46" stroke="#e8590c" stroke-width="2"/>',
  bamboo: '<g fill="#51cf66" stroke="#2b8a3e" stroke-width="1.5"><rect x="10" y="4" width="8" height="56" rx="3"/><rect x="28" y="2" width="8" height="58" rx="3"/><rect x="46" y="6" width="8" height="54" rx="3"/></g><path d="M10 20 H18 M10 38 H18 M28 16 H36 M28 34 H36 M46 22 H54 M46 42 H54" stroke="#2b8a3e" stroke-width="2"/><path d="M36 14 Q46 8 44 2 M18 28 Q26 26 28 20" stroke="#2b8a3e" stroke-width="2" fill="none"/>',
  temple: '<path d="M2 26 Q32 8 62 26 L56 28 H8 Z" fill="#a61e4d"/><rect x="10" y="28" width="44" height="6" fill="#2f9e44"/><rect x="14" y="34" width="36" height="18" fill="#e8590c"/><rect x="28" y="38" width="8" height="14" fill="#5c3d1e"/><rect x="6" y="52" width="52" height="5" fill="#868e96"/><circle cx="32" cy="14" r="3" fill="#fab005"/>',
  island: '<rect x="0" y="36" width="64" height="28" fill="#4dabf7"/><path d="M8 42 Q14 22 24 42 Z" fill="#8c6d4f"/><path d="M28 42 Q40 14 52 42 Z" fill="#8c6d4f"/><path d="M34 26 Q40 18 46 26" stroke="#69db7c" stroke-width="3" fill="none"/><path d="M0 48 Q10 44 20 48 T40 48 T64 48" stroke="#fff" stroke-width="2" fill="none"/><path d="M52 12 l2 4 4 0 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 0 z" fill="#fcc419"/>',
  volcano: '<circle cx="32" cy="22" r="10" fill="#ffa94d"/><rect x="0" y="46" width="64" height="18" fill="#4dabf7"/><path d="M4 48 Q14 26 22 24 H42 Q50 26 60 48 Z" fill="#82c91e"/><path d="M22 24 Q32 32 42 24" fill="#5c940d"/>',
  tea: '<path d="M10 30 H44 V40 Q44 54 27 54 Q10 54 10 40 Z" fill="#fff" stroke="#2b8a3e" stroke-width="3"/><path d="M44 34 Q54 34 52 42 Q50 48 43 46" stroke="#2b8a3e" stroke-width="3" fill="none"/><ellipse cx="27" cy="32" rx="15" ry="3" fill="#94d82d"/><path d="M34 22 Q42 4 56 8 Q52 24 34 22 Z" fill="#40c057"/><path d="M36 20 Q44 12 52 10" stroke="#2b8a3e" stroke-width="1.5" fill="none"/>',
  fruit: '<circle cx="32" cy="38" r="20" fill="var(--fruit,#d93a3a)"/><path d="M32 18 Q30 10 34 6" stroke="#5c3d1e" stroke-width="3" fill="none"/><path d="M34 14 Q44 6 50 12 Q42 20 34 14 Z" fill="#40c057"/><ellipse cx="24" cy="32" rx="4" ry="6" fill="#fff" opacity="0.35"/>',
  grape: '<path d="M32 10 Q30 4 36 2" stroke="#5c3d1e" stroke-width="3" fill="none"/><path d="M36 8 Q46 2 52 8 Q44 14 36 8 Z" fill="#40c057"/><g fill="#7048e8"><circle cx="22" cy="20" r="7"/><circle cx="34" cy="18" r="7"/><circle cx="46" cy="20" r="7"/><circle cx="28" cy="31" r="7"/><circle cx="40" cy="31" r="7"/><circle cx="22" cy="42" r="6" fill="#845ef7"/><circle cx="34" cy="43" r="7"/><circle cx="46" cy="42" r="6" fill="#845ef7"/><circle cx="34" cy="54" r="6"/></g>',
  watermelon: '<path d="M4 24 A28 28 0 0 0 60 24 Z" fill="#2f9e44"/><path d="M8 24 A24 24 0 0 0 56 24 Z" fill="#fff"/><path d="M11 24 A21 21 0 0 0 53 24 Z" fill="#ff6b6b"/><g fill="#212529"><ellipse cx="22" cy="32" rx="1.6" ry="2.5"/><ellipse cx="32" cy="38" rx="1.6" ry="2.5"/><ellipse cx="42" cy="32" rx="1.6" ry="2.5"/><ellipse cx="27" cy="28" rx="1.4" ry="2.2"/><ellipse cx="37" cy="28" rx="1.4" ry="2.2"/></g>',
  melon: '<ellipse cx="32" cy="36" rx="24" ry="17" fill="#ffd43b"/><path d="M14 30 Q32 26 50 30 M12 38 Q32 34 52 38 M16 46 Q32 42 48 46" stroke="#fff" stroke-width="2.5" fill="none"/><path d="M54 30 Q60 24 58 18" stroke="#5c3d1e" stroke-width="3" fill="none"/>',
  rice: '<path d="M8 32 H56 Q54 54 32 56 Q10 54 8 32 Z" fill="#4dabf7"/><path d="M12 32 Q14 18 32 16 Q50 18 52 32 Z" fill="#fff" stroke="#dee2e6" stroke-width="1.5"/><g fill="#e9ecef"><ellipse cx="24" cy="24" rx="2" ry="1.2"/><ellipse cx="32" cy="21" rx="2" ry="1.2"/><ellipse cx="40" cy="25" rx="2" ry="1.2"/><ellipse cx="30" cy="28" rx="2" ry="1.2"/></g><path d="M16 40 H48" stroke="#fff" stroke-width="2"/>',
  corn: '<path d="M18 52 Q8 32 22 22 Q24 40 30 54 Z M46 52 Q56 32 42 22 Q40 40 34 54 Z" fill="#69db7c"/><ellipse cx="32" cy="30" rx="10" ry="24" fill="#ffd43b"/><g stroke="#f08c00" stroke-width="1.5"><path d="M24 20 H40 M23 28 H41 M23 36 H41 M24 44 H40"/><path d="M28 8 V52 M36 8 V52"/></g>',
  cow: '<ellipse cx="32" cy="38" rx="20" ry="18" fill="#a0612a"/><ellipse cx="32" cy="46" rx="12" ry="9" fill="#e9b98a"/><circle cx="28" cy="46" r="2" fill="#5c3d1e"/><circle cx="36" cy="46" r="2" fill="#5c3d1e"/><circle cx="24" cy="32" r="3" fill="#212529"/><circle cx="40" cy="32" r="3" fill="#212529"/><path d="M14 24 Q6 18 10 12 Q16 20 20 22 Z M50 24 Q58 18 54 12 Q48 20 44 22 Z" fill="#fff4e6"/><ellipse cx="10" cy="32" rx="6" ry="3.5" fill="#a0612a"/><ellipse cx="54" cy="32" rx="6" ry="3.5" fill="#a0612a"/>',
  herb: '<path d="M32 60 V20" stroke="#2b8a3e" stroke-width="3"/><g fill="#69db7c" stroke="#2b8a3e" stroke-width="1.5"><path d="M32 22 Q18 8 10 16 Q18 28 32 26 Z"/><path d="M32 22 Q46 8 54 16 Q46 28 32 26 Z"/><path d="M32 38 Q18 26 8 34 Q18 44 32 42 Z"/><path d="M32 38 Q46 26 56 34 Q46 44 32 42 Z"/><path d="M32 52 Q22 44 14 50 Q22 58 32 56 Z"/><path d="M32 52 Q42 44 50 50 Q42 58 32 56 Z"/></g>',
  fabric: '<path d="M10 10 H46 L54 18 V54 H10 Z" fill="#f8f9fa" stroke="#adb5bd" stroke-width="2"/><g stroke="#ced4da" stroke-width="1.5"><path d="M10 20 H54 M10 30 H54 M10 40 H54 M20 10 V54 M30 10 V54 M40 10 V54"/></g><path d="M46 10 V18 H54" fill="#e9ecef" stroke="#adb5bd" stroke-width="2"/>',
  pepper: '<path d="M30 14 Q12 30 18 52 Q22 60 28 52 Q40 32 36 16 Z" fill="#e03131"/><path d="M30 14 Q32 6 40 6" stroke="#2b8a3e" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 14 Q34 10 38 16 Q32 18 28 14 Z" fill="#40c057"/><path d="M24 26 Q22 36 24 44" stroke="#fff" stroke-width="2.5" fill="none" opacity="0.5"/>',
  garlic: '<path d="M32 8 Q30 18 22 24 Q8 34 14 48 Q20 58 32 58 Q44 58 50 48 Q56 34 42 24 Q34 18 32 8 Z" fill="#f8f9fa" stroke="#ced4da" stroke-width="2"/><path d="M32 24 Q26 40 30 56 M32 24 Q38 40 34 56" stroke="#dee2e6" stroke-width="2" fill="none"/><path d="M26 58 L24 62 M32 58 V62 M38 58 L40 62" stroke="#adb5bd" stroke-width="1.5"/>',
  mountain: '<path d="M4 54 L24 18 L34 34 L42 24 L60 54 Z" fill="#8c6d4f"/><path d="M24 18 L30 29 L26 27 L22 31 L19 27 Z" fill="#fff"/><path d="M42 24 L47 32 L42 30 L38 33 Z" fill="#fff"/><rect x="2" y="54" width="60" height="4" fill="#69db7c"/>',
  river: '<path d="M10 4 Q30 14 20 26 Q8 40 30 46 Q50 52 40 62" stroke="#228be6" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M10 4 Q30 14 20 26 Q8 40 30 46 Q50 52 40 62" stroke="#a5d8ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
};

export function iconSVG(name, color) {
  const body = ICONS[name] || ICONS.region;
  const style = color ? ` style="--fruit:${color}"` : '';
  return `<svg class="icon" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${style}>${body}</svg>`;
}

export const ICON_NAMES = Object.keys(ICONS);

// 도장: 동그라미 두 줄 + 이름. got=false 면 점선 빈칸
export function stampSVG({ name, stage, got = true, sub = '' }) {
  const ink = got ? INK[stage] || INK[1] : '#adb5bd';
  // 안쪽 동그라미(지름 약 64) 안에 들어가게 글자 크기를 정한다. 5자가 넘으면 두 줄
  const len = [...name].length;
  let lines = [name];
  if (len > 5) {
    const sp = name.indexOf(' ');
    const cut = sp > 0 ? sp : Math.ceil(len / 2);
    lines = [name.slice(0, cut).trim(), name.slice(cut).trim()];
  }
  const longest = Math.max(...lines.map((t) => [...t].length));
  const fs = Math.min(lines.length === 1 ? 28 : 18, Math.floor(60 / longest));
  const text = got
    ? lines.map((t, i) => {
      const y = lines.length === 1 ? 50 + fs * 0.36 : 47 + (i - 0.5) * (fs + 3) + fs * 0.36;
      return `<text x="50" y="${y.toFixed(1)}" font-size="${fs}" text-anchor="middle" fill="${ink}" font-weight="800">${t}</text>`;
    }).join('')
    : `<text x="50" y="62" font-size="30" text-anchor="middle" fill="${ink}" font-weight="800">?</text>`;
  const ring = got
    ? `<circle cx="50" cy="50" r="45" fill="none" stroke="${ink}" stroke-width="5"/><circle cx="50" cy="50" r="37" fill="none" stroke="${ink}" stroke-width="2"/>`
    : `<circle cx="50" cy="50" r="44" fill="none" stroke="${ink}" stroke-width="3" stroke-dasharray="7 6"/>`;
  const subText = got && sub ? `<text x="50" y="25" font-size="10" text-anchor="middle" fill="${ink}" font-weight="700">${sub}</text>` : '';
  return `<svg class="stamp${got ? '' : ' empty'}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ring}${subText}${text}</svg>`;
}
