// 지도 계산 모음 (브라우저와 Node 시험·빌드 도구가 함께 씀)
// 좌표는 모두 [경도, 위도] 순서. 화면 좌표는 SVG viewBox 단위.

// 간단한 등장방형 투영: 위도 36도에서 가로·세로 비율을 맞춘다.
// 1 단위 ≈ 0.69km 라서 거리 계산도 이 단위로 해도 충분하다.
export const PROJ = Object.freeze({
  lon0: 124.45,
  lonMax: 132.05,
  latTop: 38.75,
  latBottom: 32.95,
  k: 160,
  cosLat: Math.cos((36 * Math.PI) / 180),
});

export const VIEW = Object.freeze({
  width: Math.round((PROJ.lonMax - PROJ.lon0) * PROJ.k * PROJ.cosLat),
  height: Math.round((PROJ.latTop - PROJ.latBottom) * PROJ.k),
});

export function project([lon, lat]) {
  return [(lon - PROJ.lon0) * PROJ.k * PROJ.cosLat, (PROJ.latTop - lat) * PROJ.k];
}

export function unproject([x, y]) {
  return [x / (PROJ.k * PROJ.cosLat) + PROJ.lon0, PROJ.latTop - y / PROJ.k];
}

// 고리(ring) 안에 점이 있는지 (짝홀 규칙)
export function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// 다각형 = [바깥 고리, 구멍 고리...]
export function pointInPolygon(pt, polygon) {
  if (!pointInRing(pt, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) if (pointInRing(pt, polygon[h])) return false;
  return true;
}

export function polygonsOf(geometry) {
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

export function pointInGeometry(pt, geometry) {
  return polygonsOf(geometry).some((poly) => pointInPolygon(pt, poly));
}

// 선분 ab 와 점 p 사이 거리 (같은 좌표계)
export function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = a[0] + t * dx - p[0];
  const qy = a[1] + t * dy - p[1];
  return Math.sqrt(qx * qx + qy * qy);
}

export function distToLine(p, line) {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) best = Math.min(best, distToSegment(p, line[i - 1], line[i]));
  return best;
}

// 점에서 다각형 경계까지 거리 (화면 단위). 안에 있으면 0.
export function distToGeometryProjected(ptXY, geometry) {
  const ll = unproject(ptXY);
  if (pointInGeometry(ll, geometry)) return 0;
  let best = Infinity;
  for (const poly of polygonsOf(geometry)) {
    for (const ring of poly) {
      best = Math.min(best, distToLine(ptXY, ring.map(project)));
    }
  }
  return best;
}

// 고리 넓이 (km², 대략) — 작은 섬 걸러내기용
export function ringAreaKm2(ring) {
  const kmPerDegLat = 111.32;
  let lat0 = 0;
  for (const [, lat] of ring) lat0 += lat;
  lat0 /= ring.length;
  const kx = kmPerDegLat * Math.cos((lat0 * Math.PI) / 180);
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += ring[j][0] * kx * ring[i][1] * kmPerDegLat - ring[i][0] * kx * ring[j][1] * kmPerDegLat;
  }
  return Math.abs(s) / 2;
}

// 두 지점 사이 거리 (km, 하버사인)
export function haversineKm(a, b) {
  const R = 6371;
  const t = Math.PI / 180;
  const dLat = (b[1] - a[1]) * t;
  const dLon = (b[0] - a[0]) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// 더글러스-포커 단순화 (강 줄기용)
export function simplifyLine(line, tol) {
  if (line.length < 3) return line.slice();
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(line[i], line[s], line[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

// 다각형 안에서 글자를 놓기 좋은 점 (가장 큰 조각에서 경계와 가장 먼 점을 격자로 찾음)
export function labelPoint(geometry, steps = 40) {
  let biggest = null;
  let bigArea = -1;
  for (const poly of polygonsOf(geometry)) {
    const a = ringAreaKm2(poly[0]);
    if (a > bigArea) {
      bigArea = a;
      biggest = poly;
    }
  }
  const ring = biggest[0].map(project);
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const projPoly = biggest.map((r) => r.map(project));
  let best = null;
  let bestD = -1;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const p = [x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * j) / steps];
      if (!pointInPolygon(p, projPoly)) continue;
      let d = Infinity;
      for (const r of projPoly) d = Math.min(d, distToLine(p, r));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
  }
  return best ? unproject(best) : biggest[0][0];
}
