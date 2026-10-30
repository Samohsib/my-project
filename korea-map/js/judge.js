// 맞히기 판정: 손가락이 닿은 곳이 무엇인지 찾고, 문제의 답과 같은지 본다.
// 화면(DOM)과 상관없는 순수 함수라 Node 에서 단위 시험을 한다.
// xy 는 지도(SVG viewBox) 좌표, tol 은 같은 단위의 허용 거리.

import { unproject, pointInGeometry, distToGeometryProjected, distToLine } from './geo.js';

// 누른 곳의 시·도 코드. 경계 안이면 그 시·도, 바다처럼 바깥이면 tol 안에 있는 가장 가까운 시·도.
export function regionAt(xy, regions, tol = 0) {
  const ll = unproject(xy);
  for (const r of regions) if (pointInGeometry(ll, r.geometry)) return r.code;
  if (tol <= 0) return null;
  let best = null;
  let bestD = tol;
  for (const r of regions) {
    const d = distToGeometryProjected(xy, r.geometry);
    if (d <= bestD) {
      bestD = d;
      best = r.code;
    }
  }
  return best;
}

// 점 목표(도시·산) 가운데 tol 안에서 가장 가까운 것
export function nearestTarget(xy, targets, tol) {
  let best = null;
  let bestD = tol;
  for (const t of targets) {
    const d = Math.hypot(t.xy[0] - xy[0], t.xy[1] - xy[1]);
    if (d <= bestD) {
      bestD = d;
      best = t.id;
    }
  }
  return best;
}

// 선 목표(강) 가운데 tol 안에서 가장 가까운 것. lines: [{id, xys: [[x,y]...][]}]
export function nearestLine(xy, lines, tol) {
  let best = null;
  let bestD = tol;
  for (const l of lines) {
    for (const xys of l.xys) {
      const d = distToLine(xy, xys);
      if (d <= bestD) {
        bestD = d;
        best = l.id;
      }
    }
  }
  return best;
}

// 문제 종류(mode)에 맞춰 누른 곳을 찾는다.
//   region: 시·도 / city: 도시 점 / nature: 산(점) 먼저, 없으면 강(선)
export function hitTest(mode, xy, layers, tol) {
  if (mode === 'region') return regionAt(xy, layers.regions, tol);
  if (mode === 'city') return nearestTarget(xy, layers.cities, tol);
  if (mode === 'nature') {
    return nearestTarget(xy, layers.mountains, tol) ?? nearestLine(xy, layers.rivers, tol * 0.8);
  }
  throw new Error(`모르는 문제 종류: ${mode}`);
}

// 결과: 'correct' 맞음 / 'wrong' 다른 것을 누름 / 'none' 아무것도 안 누름(바다 등)
export function judge(question, hitId) {
  if (hitId == null) return 'none';
  return question.accept.includes(hitId) ? 'correct' : 'wrong';
}

// 틀린 횟수에 따른 도움 단계
//   0: 도움 없음, 1: 누른 곳 이름 알려 주기, 2: 답이 있는 시·도(또는 이름) 알려 주기, 3: 답을 깜빡여 보여 주기
export function hintLevel(wrongCount) {
  return Math.max(0, Math.min(3, wrongCount));
}

// 화면 픽셀 허용 거리를 지도 단위로 바꾼다 (확대할수록 지도 단위로는 작아짐)
export function tolInMapUnits(tolPx, pxPerUnit, zoom) {
  return tolPx / (pxPerUnit * zoom);
}
