// 데이터 무결성 시험: 시·도 경계·이름·소재지, 점들이 올바른 시·도 안에 찍히는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAll } from './helpers.mjs';
import { pointInGeometry, distToGeometryProjected, project, polygonsOf, haversineKm } from '../js/geo.js';

const D = loadAll();
const features = D.sido.features;
const byCode = new Map(features.map((f) => [f.properties.code, f]));
const KM_PER_UNIT = 1 / 1.44; // 지도 1단위 ≈ 0.69km
const COAST_TOLERANCE_KM = 1.5; // 단순화한 해안선 때문에 바닷가 점이 살짝 밖으로 나가는 것만 허용

// 점이 어느 시·도에 찍히는지: { inside: [코드...], nearest, nearestKm }
function locate(ll) {
  const inside = features.filter((f) => pointInGeometry(ll, f.geometry)).map((f) => f.properties.code);
  let nearest = null;
  let best = Infinity;
  for (const f of features) {
    const d = distToGeometryProjected(project(ll), f.geometry) * KM_PER_UNIT;
    if (d < best) {
      best = d;
      nearest = f.properties.code;
    }
  }
  return { inside, nearest, nearestKm: best };
}

function assertInRegion(label, ll, code) {
  const where = locate(ll);
  if (where.inside.length) {
    assert.deepEqual(where.inside, [code], `${label}: ${code} 안이어야 하는데 ${where.inside.join(',')} 안에 찍힘`);
  } else {
    assert.equal(where.nearest, code, `${label}: 어느 시·도에도 안 들어가고 가장 가까운 곳이 ${where.nearest}`);
    assert.ok(where.nearestKm <= COAST_TOLERANCE_KM, `${label}: 경계 밖으로 ${where.nearestKm.toFixed(2)}km 벗어남`);
  }
}

const allPoints = [
  ...D.cities.cities.map((c) => ({ kind: '도시', ...c })),
  ...D.places.places.map((p) => ({ kind: p.kind, ...p })),
  ...D.nature.mountains.map((m) => ({ kind: '산', ...m })),
];

test('시·도는 16곳이고 경계 자료와 하나씩 짝이 맞는다', () => {
  assert.equal(D.regions.regions.length, 16);
  assert.equal(features.length, 16);
  const codes = D.regions.regions.map((r) => r.code);
  assert.equal(new Set(codes).size, 16, '코드 중복');
  assert.deepEqual([...codes].sort(), [...byCode.keys()].sort());
  const ids = D.regions.regions.map((r) => r.id);
  assert.equal(new Set(ids).size, 16, 'id 중복');
});

test('모든 시·도가 이름·짧은 이름·종류·소재지를 가진다 (경계 자료의 이름과 같음)', () => {
  for (const r of D.regions.regions) {
    const f = byCode.get(r.code);
    assert.equal(r.name, f.properties.name, `${r.code} 이름이 경계 자료와 다름`);
    for (const key of ['short', 'kind', 'fact']) assert.ok(r[key] && r[key].trim(), `${r.name}.${key} 없음`);
    assert.ok(r.office && r.office.label && r.office.place, `${r.name} 소재지 없음`);
    assert.ok(r.sources.length > 0, `${r.name} 출처 없음`);
  }
});

test('2026년 기준 행정구역 이름 (특별자치도 이름 바뀜, 전남광주 통합)', () => {
  const names = new Set(D.regions.regions.map((r) => r.name));
  for (const n of ['강원특별자치도', '전북특별자치도', '세종특별자치시', '제주특별자치도', '전남광주통합특별시']) {
    assert.ok(names.has(n), `${n} 없음`);
  }
  for (const old of ['강원도', '전라북도', '전라남도', '광주광역시']) {
    assert.ok(!names.has(old), `옛 이름 ${old} 이(가) 남아 있음`);
  }
});

test('모든 시·도 경계가 닫힌 다각형이고 이름표 자리가 경계 안에 있다', () => {
  for (const f of features) {
    const polys = polygonsOf(f.geometry);
    assert.ok(polys.length > 0, `${f.properties.name} 경계 없음`);
    for (const poly of polys) {
      for (const ring of poly) {
        assert.ok(ring.length >= 4, `${f.properties.name} 고리 점 부족`);
        assert.deepEqual(ring[0], ring[ring.length - 1], `${f.properties.name} 고리가 닫히지 않음`);
      }
    }
    assert.ok(pointInGeometry(f.properties.label, f.geometry), `${f.properties.name} 이름표 자리가 밖에 있음`);
  }
});

test('독도와 울릉도가 경상북도 경계에 들어 있다', () => {
  const gb = byCode.get('47');
  assert.ok(pointInGeometry([131.8667, 37.2417], gb.geometry) || locate([131.8667, 37.2417]).nearestKm < COAST_TOLERANCE_KM, '독도');
  assert.ok(pointInGeometry([130.86, 37.5], gb.geometry), '울릉도');
});

test('군위군은 대구광역시 안에 있다 (2023년 편입)', () => {
  // Wikidata Q50215(군위군) 좌표
  assertInRegion('군위', [128.5728, 36.2347], '27');
});

test('시·도청 소재지 도시가 바르게 이어져 있다', () => {
  const cityById = new Map(D.cities.cities.map((c) => [c.id, c]));
  for (const r of D.regions.regions) {
    const isProvinceLike = ['도', '특별자치도', '통합특별시'].includes(r.kind);
    if (isProvinceLike) assert.ok(r.office.cities.length >= 1, `${r.name} 소재지 도시가 없음`);
    else assert.equal(r.office.cities.length, 0, `${r.name} 은(는) 도시 자체가 시·도라 소재지 도시 점이 없어야 함`);
    for (const id of r.office.cities) {
      const c = cityById.get(id);
      assert.ok(c, `${r.name} → ${id} 도시 없음`);
      assert.equal(c.role, 'office', `${c.name} role 이 office 가 아님`);
      assert.equal(c.sido, r.code, `${c.name} 이(가) ${r.name} 소속이 아님`);
    }
  }
  // 거꾸로: office 도시는 모두 어느 시·도의 소재지 목록에 있어야 한다
  const listed = new Set(D.regions.regions.flatMap((r) => r.office.cities));
  for (const c of D.cities.cities.filter((c) => c.role === 'office')) {
    assert.ok(listed.has(c.id), `${c.name} 은(는) office 인데 어느 시·도에도 안 걸림`);
  }
});

test('전남광주통합특별시는 청사 3곳(광주·무안·순천)을 소재지로 가진다', () => {
  const r = D.regions.regions.find((x) => x.code === '12');
  assert.deepEqual([...r.office.cities].sort(), ['gwangju', 'muan', 'suncheon']);
});

test('도시·명소·특산물·산이 모두 올바른 시·도 경계 안에 찍힌다', () => {
  for (const p of allPoints) {
    assert.ok(byCode.has(p.sido), `${p.name}: 없는 시·도 코드 ${p.sido}`);
    assert.ok(Array.isArray(p.ll) && p.ll.length === 2, `${p.name}: 좌표 형식`);
    assertInRegion(`${p.kind} ${p.name}`, p.ll, p.sido);
  }
});

test('항목 id 는 모두 겹치지 않는다 (도장 열쇠로 씀)', () => {
  const ids = [
    ...D.regions.regions.map((r) => `region:${r.id}`),
    ...allPoints.map((p) => p.id),
    ...D.nature.rivers.map((r) => r.id),
  ];
  const seen = new Set();
  for (const id of ids) {
    assert.ok(!seen.has(id), `id 중복: ${id}`);
    seen.add(id);
  }
});

test('명소·특산물·산·강 항목마다 출처가 있다', () => {
  const giOk = D.places.meta.giSource && D.places.meta.giSource.url.startsWith('https://');
  for (const p of D.places.places) {
    assert.ok(['명소', '특산물'].includes(p.kind), `${p.name} 종류`);
    assert.ok(p.desc && p.desc.length > 5, `${p.name} 설명 없음`);
    assert.ok(p.sources.length > 0, `${p.name} 출처 없음`);
    for (const s of p.sources) {
      if (s === 'gi') assert.ok(giOk, '지리적표시 출처 없음');
      else assert.ok(s.url.startsWith('https://') && s.title, `${p.name} 출처 형식`);
    }
    assert.match(p.wikidata, /^Q\d+$/, `${p.name} 좌표 출처(Wikidata) 없음`);
  }
  for (const m of [...D.nature.mountains, ...D.nature.rivers]) {
    assert.ok(m.sources.length > 0 && m.sources.every((s) => s.url.startsWith('https://')), `${m.name} 출처`);
    assert.match(m.wikidata, /^Q\d+$/);
  }
  for (const c of D.cities.cities) assert.match(c.wikidata, /^Q\d+$/, `${c.name} 좌표 출처`);
});

test('특산물은 지리적표시 등록 목록에 있는 이름이다', () => {
  // 농림축산식품부 보도자료(2024-09) 붙임1 의 등록 명칭 중 이 앱에서 쓰는 것
  const registered = new Set(['보성녹차', '하동녹차', '이천쌀', '성주참외', '의성마늘', '순창전통고추장', '홍천찰옥수수', '강화약쑥',
    '횡성한우고기', '충주사과', '한산모시', '영동포도', '나주배', '부산대저토마토', '제주한라봉', '고창수박']);
  for (const p of D.places.places.filter((x) => x.kind === '특산물')) {
    assert.ok(registered.has(p.name), `${p.name} 은(는) 확인한 지리적표시 목록에 없음`);
  }
});

test('산 높이는 그럴듯한 범위이고 한라산이 가장 높다', () => {
  const ms = D.nature.mountains;
  for (const m of ms) assert.ok(m.height > 500 && m.height < 2000, `${m.name} 높이 ${m.height}`);
  const top = [...ms].sort((a, b) => b.height - a.height)[0];
  assert.equal(top.id, 'hallasan');
});

test('강마다 줄기 자료가 있고, 적어 둔 시·도를 실제로 지나간다', () => {
  for (const r of D.nature.rivers) {
    const parts = D.rivers.rivers[r.id];
    assert.ok(parts && parts.length > 0, `${r.name} 줄기 없음`);
    // 줄기를 약 1km 간격으로 촘촘히 짚어 지나가는 시·도를 모은다
    const visited = new Set();
    let inKorea = 0;
    let total = 0;
    for (const { line } of parts) {
      assert.ok(line.length >= 2);
      for (let i = 1; i < line.length; i++) {
        const [a, b] = [line[i - 1], line[i]];
        const n = Math.max(1, Math.ceil(haversineKm(a, b)));
        for (let k = 0; k < n; k++) {
          const t = k / n;
          const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          total++;
          for (const f of features) {
            if (pointInGeometry(p, f.geometry)) {
              visited.add(f.properties.code);
              inKorea++;
              break;
            }
          }
        }
      }
    }
    for (const code of r.passes) assert.ok(visited.has(code), `${r.name} 이(가) ${code} 를 지나지 않음 (지난 곳: ${[...visited].join(',')})`);
    assert.ok(inKorea / total > 0.85, `${r.name} 줄기의 ${(100 - (100 * inKorea) / total).toFixed(0)}% 가 경계 밖`);
  }
});
