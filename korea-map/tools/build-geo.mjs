// 지도 경계·강 줄기 자료 만들기 (개발할 때 한 번만 돌림. 앱은 결과 JSON만 씀)
//
//   npm run build:geo
//
// 1) 시·도 경계: admdongkor(통계청 SGIS 행정경계 가공, CC BY 4.0 + 공공누리 제1유형)의
//    2026-10-01 시점 시도 경계(light, EPSG:4326)를 받아 작은 섬을 걸러내고 mapshaper로 단순화.
// 2) 강 줄기: OpenStreetMap(ODbL) 강 관계(relation)를 받아 본류만 이어 붙이고 단순화.
//
// 내려받은 원본은 tools/.cache/ 에 두고(저장소에는 올리지 않음) 다시 돌릴 때 재사용한다.
// 프록시가 있는 환경에서는 NODE_USE_ENV_PROXY=1 을 붙여 실행한다.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';
import * as adk from 'admdongkor';
import { polygonsOf, ringAreaKm2, simplifyLine, pointInGeometry, labelPoint } from '../js/geo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(HERE, '.cache');
const OUT = path.join(ROOT, 'data', 'geo');

const SIDO_VERSION = '20261001';
const MIN_ISLAND_KM2 = 2.5; // 이보다 작은 섬은 지도에서 뺀다
const ALWAYS_KEEP = [
  { name: '독도', bbox: [131.8, 37.2, 131.95, 37.3] },
];
const UA = 'korea-map-kids-app/1.0 (personal educational project)';

// OSM 강 관계 번호 (Wikidata P402 로 확인)
const RIVERS = [
  { id: 'han', parts: [
    { name: '한강', osm: 5488151 },
    { name: '남한강', osm: 5488155 },
    { name: '북한강', osm: 5486141 },
  ] },
  { id: 'nakdong', parts: [{ name: '낙동강', osm: 11698958 }] },
  { id: 'geum', parts: [{ name: '금강', osm: 17966007 }] },
  { id: 'yeongsan', parts: [{ name: '영산강', osm: 17966108 }] },
  { id: 'seomjin', parts: [{ name: '섬진강', osm: 17966016 }] },
];

async function cached(name, fetcher) {
  const file = path.join(CACHE, name);
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    const data = await fetcher();
    await fs.mkdir(CACHE, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data));
    return data;
  }
}

function round4(v) {
  return Math.round(v * 1e4) / 1e4;
}

async function buildSido() {
  const fc = await cached(`sido-${SIDO_VERSION}.json`, () => adk.get(SIDO_VERSION, 'sido'));
  if (fc.features.length !== 16) throw new Error(`시·도 수가 16이 아님: ${fc.features.length}`);

  // 작은 섬 걸러내기. 독도처럼 꼭 남길 작은 섬은 따로 빼 두었다가 단순화 뒤에 원래 모양대로 다시 붙인다
  // (mapshaper 단순화가 아주 작은 조각을 지워 버리기 때문. 이웃과 맞닿은 경계가 없어 위상에는 영향 없음)
  let dropped = 0;
  const reattach = new Map();
  for (const f of fc.features) {
    const code = f.properties.sidocd;
    const kept = polygonsOf(f.geometry).filter((poly) => {
      const ring = poly[0];
      if (ringAreaKm2(ring) >= MIN_ISLAND_KM2) return true;
      const [lon, lat] = ring[0];
      const keep = ALWAYS_KEEP.some(({ bbox }) => lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3]);
      if (keep) reattach.set(code, [...(reattach.get(code) || []), poly]);
      else dropped++;
      return false;
    });
    f.geometry = { type: 'MultiPolygon', coordinates: kept };
    f.properties = { code, name: f.properties.sidonm };
  }

  // 공유 경계를 지키며 단순화 (mapshaper 는 위상(topology)을 만들어 이웃 경계가 어긋나지 않게 함)
  const out = await mapshaper.applyCommands(
    '-i in.json -simplify interval=350 keep-shapes -o out.json precision=0.0001 format=geojson',
    { 'in.json': JSON.stringify(fc) },
  );
  const simple = JSON.parse(out['out.json']);

  let points = 0;
  const features = simple.features
    .sort((a, b) => a.properties.code.localeCompare(b.properties.code))
    .map((f) => {
      const geometry = f.geometry.type === 'Polygon'
        ? { type: 'MultiPolygon', coordinates: [f.geometry.coordinates] }
        : f.geometry;
      geometry.coordinates.push(...(reattach.get(f.properties.code) || []));
      geometry.coordinates = geometry.coordinates.map((poly) => poly.map((ring) => ring.map(([x, y]) => [round4(x), round4(y)])));
      for (const poly of geometry.coordinates) for (const ring of poly) points += ring.length;
      const label = labelPoint(geometry).map(round4);
      return { type: 'Feature', properties: { ...f.properties, label }, geometry };
    });

  const result = {
    type: 'FeatureCollection',
    meta: {
      source: 'admdongkor (vuski/admdongkor) 시도 경계 light, 시점 ' + SIDO_VERSION,
      upstream: '통계청 통계지리정보서비스(SGIS) 행정동 경계, 공공누리 제1유형',
      license: 'CC BY 4.0 (가공: vuski/admdongkor) + 공공누리 제1유형 출처표시',
      processing: `면적 ${MIN_ISLAND_KM2}km² 미만 섬 제외(독도는 원래 모양 그대로 유지), mapshaper -simplify interval=350 keep-shapes, 좌표 소수점 4자리`,
      built: new Date().toISOString().slice(0, 10),
    },
    features,
  };
  await fs.writeFile(path.join(OUT, 'sido.json'), JSON.stringify(result));
  console.log(`시·도 ${features.length}개, 점 ${points}개, 빠진 작은 섬 ${dropped}개`);
  return result;
}

function assembleOsm(data, relId) {
  const nodes = new Map();
  const ways = new Map();
  for (const e of data.elements) {
    if (e.type === 'node') nodes.set(e.id, [e.lon, e.lat]);
    if (e.type === 'way') ways.set(e.id, e);
  }
  const rel = data.elements.find((e) => e.type === 'relation' && e.id === relId);
  const segs = rel.members
    .filter((m) => m.type === 'way' && m.role !== 'side_stream' && m.role !== 'tributary' && ways.has(m.ref))
    .map((m) => ways.get(m.ref).nodes.slice());
  const lines = [];
  while (segs.length) {
    let cur = segs.shift();
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        const a = cur[0];
        const z = cur[cur.length - 1];
        if (s[0] === z) cur = cur.concat(s.slice(1));
        else if (s[s.length - 1] === a) cur = s.concat(cur.slice(1));
        else if (s[0] === a) cur = s.slice().reverse().concat(cur.slice(1));
        else if (s[s.length - 1] === z) cur = cur.concat(s.slice().reverse().slice(1));
        else continue;
        segs.splice(i, 1);
        changed = true;
        break;
      }
    }
    lines.push(cur.map((n) => nodes.get(n)));
  }
  // 가장 긴 줄기만 쓴다 (본류)
  lines.sort((a, b) => b.length - a.length);
  return { name: rel.tags.name, line: lines[0] };
}

async function buildRivers(sido) {
  const southKorea = { type: 'MultiPolygon', coordinates: sido.features.flatMap((f) => f.geometry.coordinates) };
  const rivers = {};
  for (const river of RIVERS) {
    const lines = [];
    for (const part of river.parts) {
      const data = await cached(`osm-rel-${part.osm}.json`, async () => {
        const res = await fetch(`https://api.openstreetmap.org/api/0.6/relation/${part.osm}/full.json`, { headers: { 'User-Agent': UA } });
        if (!res.ok) throw new Error(`OSM ${part.osm}: ${res.status}`);
        return res.json();
      });
      let { line } = assembleOsm(data, part.osm);
      // 북한 쪽에서 시작하는 부분(북한강 상류)은 지도 밖이라 잘라 낸다
      const first = line.findIndex((p) => pointInGeometry(p, southKorea));
      if (first > 0) line = line.slice(first);
      line = simplifyLine(line, 0.004).map(([x, y]) => [round4(x), round4(y)]);
      lines.push({ name: part.name, osm: part.osm, line });
    }
    rivers[river.id] = lines;
  }
  const result = {
    meta: {
      source: 'OpenStreetMap 강 관계(relation) 본류',
      license: '© OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright)',
      processing: '본류 경로만 이어 붙인 뒤 더글러스-포커 단순화(허용 오차 0.004도), 북한 쪽 상류는 잘라 냄',
      built: new Date().toISOString().slice(0, 10),
    },
    rivers,
  };
  await fs.writeFile(path.join(OUT, 'rivers.json'), JSON.stringify(result));
  for (const [id, parts] of Object.entries(rivers)) {
    console.log(`강 ${id}: ${parts.map((p) => `${p.name} ${p.line.length}점`).join(', ')}`);
  }
}

await fs.mkdir(OUT, { recursive: true });
const sido = await buildSido();
await buildRivers(sido);
