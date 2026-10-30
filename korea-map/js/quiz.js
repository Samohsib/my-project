// 문제 만들기: 단계별 문제 목록과 한 판(라운드) 고르기. 화면과 상관없는 순수 함수.

export const STAGES = [
  { n: 1, title: '시·도 위치 맞히기', desc: '시·도가 지도 어디에 있는지 찾아요', mode: 'region' },
  { n: 2, title: '시·도청과 주요 도시', desc: '도청이 있는 도시와 큰 도시를 찾아요', mode: 'city' },
  { n: 3, title: '명소와 특산물', desc: '이름난 곳과 특산물이 어느 시·도인지 맞혀요', mode: 'region' },
  { n: 4, title: '큰 산과 강', desc: '높은 산과 큰 강을 지도에서 찾아요', mode: 'nature' },
];

export const ROUND_SIZE = 8;

// 받침 있는 글자인지 (조사 고르기용)
export function hasBatchim(word) {
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

// josa('경복궁', '을/를') → '경복궁을'
export function josa(word, pair) {
  const [withB, withoutB] = pair.split('/');
  return word + (hasBatchim(word) ? withB : withoutB);
}

// 두 시·도가 맞닿아 있는지: 단순화 뒤에도 이웃 경계는 같은 꼭짓점을 함께 쓴다(위상 보존)
export function neighborsOf(features) {
  const key = ([x, y]) => `${x},${y}`;
  const sets = features.map((f) => {
    const s = new Set();
    for (const poly of f.geometry.coordinates) for (const ring of poly) for (const p of ring) s.add(key(p));
    return s;
  });
  const out = {};
  features.forEach((f, i) => {
    out[f.properties.code] = [];
    features.forEach((g, j) => {
      if (i === j) return;
      let shared = 0;
      for (const k of sets[i]) if (sets[j].has(k) && ++shared >= 2) break;
      if (shared >= 2) out[f.properties.code].push(g.properties.code);
    });
  });
  return out;
}

// 자료 묶음 → 문제에 쓰기 좋은 목록
export function buildCatalog(data) {
  const features = data.sido.features;
  const byCode = {};
  for (const r of data.regions.regions) {
    const f = features.find((x) => x.properties.code === r.code);
    byCode[r.code] = { ...r, geometry: f.geometry, label: f.properties.label };
  }
  const regions = data.regions.regions.map((r) => byCode[r.code]);
  return {
    regions,
    byCode,
    neighbors: neighborsOf(features),
    cities: data.cities.cities,
    places: data.places.places,
    mountains: data.nature.mountains,
    rivers: data.nature.rivers.map((r) => ({ ...r, lines: (data.rivers.rivers[r.id] || []).map((p) => p.line) })),
    giSource: data.places.meta.giSource,
  };
}

export function regionStampId(region) {
  return `region:${region.id}`;
}

function regionHint(cat, code) {
  const nb = (cat.neighbors[code] || []).map((c) => cat.byCode[c].short);
  if (!nb.length) return '바다 건너 남쪽에 있는 큰 섬이에요.';
  const pick = nb.slice(0, 3).join(', ') + (nb.length > 3 ? ' 등' : '');
  return `${josa(pick, '과/와')} 맞닿아 있어요.`;
}

// 단계별로 낼 수 있는 모든 문제
export function questionsForStage(n, cat) {
  if (n === 1) {
    return cat.regions.map((r) => ({
      key: `s1:${r.id}`, stage: 1, mode: 'region', accept: [r.code], answer: r.code,
      stampId: regionStampId(r), stampName: r.short, region: r.code,
      prompt: `${josa(r.name, '을/를')} 찾아 눌러 봐!`,
      hint: regionHint(cat, r.code),
      fact: r.fact, title: r.name, icon: 'region',
    }));
  }
  if (n === 2) {
    return cat.cities.map((c) => {
      const r = cat.byCode[c.sido];
      let prompt;
      let hint;
      if (c.role === 'office' && c.sido === '12') {
        prompt = {
          gwangju: '전남광주통합특별시 광주청사가 있는 광주를 찾아 눌러 봐!',
          muan: '옛 전라남도청 건물(무안청사)이 있는 무안군을 찾아 눌러 봐!',
          suncheon: '전남광주통합특별시 동부청사가 있는 순천시를 찾아 눌러 봐!',
        }[c.id];
        hint = `${r.name}에 있어요.`;
      } else if (c.role === 'office') {
        prompt = `${r.office.label}이 있는 도시는 어디일까? 찾아 눌러 봐!`;
        hint = `이름은 '${c.name}'이에요.`;
      } else {
        prompt = `${josa(c.name, '을/를')} 찾아 눌러 봐!`;
        hint = `${r.name}에 있어요.`;
      }
      return {
        key: `s2:${c.id}`, stage: 2, mode: 'city', accept: [c.id], answer: c.id,
        // 도청 문제는 그 도를 먼저 보여 주고 그 안에서 도시를 고르게 한다
        focus: c.role === 'office' && c.sido !== '12',
        stampId: c.id, stampName: c.name.replace(/(시|군)$/, ''), region: c.sido,
        prompt, hint, fact: c.fact, title: c.name, icon: 'city',
      };
    });
  }
  if (n === 3) {
    return cat.places.map((p) => {
      const r = cat.byCode[p.sido];
      const prompt = p.kind === '특산물'
        ? `특산물 '${p.name}'${hasBatchim(p.name) ? '은' : '는'} 어느 시·도에서 날까? 그 시·도를 눌러 봐!`
        : `${josa(p.name, '은/는')} 어느 시·도에 있을까? 그 시·도를 눌러 봐!`;
      // 특산물은 생산지 이름, 명소는 답 시·도의 이웃을 알려 준다
      const hint = p.kind === '특산물' ? `${p.at}에서 나요.` : `그 시·도는 ${regionHint(cat, r.code)}`;
      return {
        key: `s3:${p.id}`, stage: 3, mode: 'region', accept: [p.sido], answer: p.sido,
        stampId: p.id, stampName: p.name, region: p.sido, kind: p.kind,
        prompt, hint,
        fact: p.desc, title: p.name, icon: p.icon, color: p.color, pin: p.ll,
      };
    });
  }
  if (n === 4) {
    const ms = cat.mountains.map((m) => ({
      key: `s4:${m.id}`, stage: 4, mode: 'nature', accept: [m.id], answer: m.id,
      stampId: m.id, stampName: m.name, region: m.sido, kind: '산',
      prompt: `${josa(m.name, '을/를')} 찾아 눌러 봐! (높이 ${m.height.toLocaleString('ko-KR')}m)`,
      hint: `${cat.byCode[m.sido].name}에 있어요.`,
      fact: m.fact, title: m.name, icon: 'mountain',
    }));
    const rs = cat.rivers.map((r) => ({
      key: `s4:${r.id}`, stage: 4, mode: 'nature', accept: [r.id], answer: r.id,
      stampId: r.id, stampName: r.name, region: null, kind: '강',
      prompt: `${josa(r.name, '을/를')} 찾아 파란 강줄기를 눌러 봐!`,
      hint: r.fact,
      fact: r.fact, title: r.name, icon: 'river',
    }));
    return [...ms, ...rs];
  }
  throw new Error(`없는 단계: ${n}`);
}

export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 한 판: 아직 도장을 못 받은 문제를 먼저, 그다음 받은 문제를 섞어서 size 개
export function makeRound(n, cat, stamps = {}, rng = Math.random, size = ROUND_SIZE) {
  const all = questionsForStage(n, cat);
  const fresh = shuffle(all.filter((q) => !stamps[q.stampId]), rng);
  const done = shuffle(all.filter((q) => stamps[q.stampId]), rng);
  return [...fresh, ...done].slice(0, Math.min(size, all.length));
}

// 단계별 도장 현황
export function stageProgress(n, cat, stamps = {}) {
  const all = questionsForStage(n, cat);
  return { got: all.filter((q) => stamps[q.stampId]).length, total: all.length };
}

// 도장 수첩: 시·도마다 받을 수 있는 도장 목록 (강은 따로). 도장 글자는 문제와 같은 것을 쓴다
export function bookPages(cat) {
  const stampNames = {};
  for (const s of STAGES) for (const q of questionsForStage(s.n, cat)) stampNames[q.stampId] = q.stampName;
  const withStamp = (slot) => ({ ...slot, stampName: stampNames[slot.stampId] });
  const pages = cat.regions.map((r) => ({
    code: r.code, name: r.name, short: r.short,
    slots: [
      { stampId: regionStampId(r), name: r.short, stage: 1, kind: '시·도' },
      ...cat.cities.filter((c) => c.sido === r.code).map((c) => ({ stampId: c.id, name: c.name, stage: 2, kind: c.role === 'office' ? '청사' : '도시' })),
      ...cat.places.filter((p) => p.sido === r.code).map((p) => ({ stampId: p.id, name: p.name, stage: 3, kind: p.kind })),
      ...cat.mountains.filter((m) => m.sido === r.code).map((m) => ({ stampId: m.id, name: m.name, stage: 4, kind: '산' })),
    ].map(withStamp),
  }));
  pages.push({
    code: 'rivers', name: '우리나라의 큰 강', short: '큰 강',
    slots: cat.rivers.map((r) => withStamp({ stampId: r.id, name: r.name, stage: 4, kind: '강' })),
  });
  return pages;
}
