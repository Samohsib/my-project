// 시험 도우미: Playwright 불러오기와 정적 서버(python3 -m http.server) 켜기
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';

const require = createRequire(import.meta.url);
// 폴더 안 node_modules의 playwright를 먼저 쓰고, 없으면 전역 설치본을 쓴다(NODE_PATH)
export const { chromium } = require('playwright');

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
    s.on('error', rej);
  });
}

export async function startServer() {
  const port = await freePort();
  const proc = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url); if (r.ok) break; } catch (e) { /* 아직 안 켜짐 */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return { url, port, stop: () => proc.kill() };
}

export const IPAD = {
  landscape: { width: 1024, height: 768 },
  portrait: { width: 768, height: 1024 },
};

export async function ipadContext(browser, size, opts = {}) {
  return browser.newContext({
    viewport: size, screen: size, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    locale: 'ko-KR', ...opts,
  });
}

// ---- 손가락 흉내 ----
// 톡: Playwright touchscreen.tap / 끌기: Chrome DevTools 프로토콜의 진짜 터치 이벤트
export async function finger(page) {
  const cdp = await page.context().newCDPSession(page);
  const send = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 8, radiusY: 8, force: 1 })) });
  return {
    async tap(x, y) { await page.touchscreen.tap(x, y); },
    async tapEl(locator) {
      await locator.scrollIntoViewIfNeeded();
      const b = await locator.boundingBox();
      if (!b) throw new Error('보이지 않는 것을 누르려고 함');
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    },
    // 여러 점을 차례로 지나가며 문지르기
    async drag(points, steps = 6) {
      await send('touchStart', [points[0]]);
      for (let i = 1; i < points.length; i++) {
        const [x0, y0] = points[i - 1], [x1, y1] = points[i];
        for (let s = 1; s <= steps; s++) await send('touchMove', [[x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps]]);
      }
      // 손가락을 멈췄다가 뗀다 (빠르게 튕기듯 떼면 브라우저가 '플링'으로 보고 다음 톡을 삼킨다)
      const last = points.at(-1);
      for (let k = 0; k < 3; k++) { await new Promise((r) => setTimeout(r, 40)); await send('touchMove', [last]); }
      await send('touchEnd', []);
    },
  };
}

// 화면 배치가 끝날 때까지 두 프레임 기다리기
export const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// 칠하는 판의 칸 가운데 화면 좌표 (피자는 조각 안쪽 토핑 자리)
export async function cellCenters(page, tag) {
  await settle(page);
  return page.evaluate((t) => {
    const board = document.querySelector(`[data-board="${t}"]`);
    return [...board.querySelectorAll('.cell')].map((g) => {
      const top = g.querySelector('.top');
      if (top) {
        const svg = g.ownerSVGElement;
        const pt = svg.createSVGPoint();
        pt.x = +top.getAttribute('cx'); pt.y = +top.getAttribute('cy');
        const q = pt.matrixTransform(g.getScreenCTM());
        return { i: +g.dataset.i, x: q.x, y: q.y };
      }
      const r = g.querySelector('.shape').getBoundingClientRect();
      return { i: +g.dataset.i, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }).sort((a, b) => a.i - b.i);
  }, tag);
}

export const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

// 칸 번호들을 칠하기(또는 ✕): 모눈은 '한 판 모두'·줄 단추를 쓰고, 막대는 한 번에 문지르고, 피자는 톡톡
export async function mark(page, f, tag, model, cellsPerUnit, idx) {
  if (!idx.length) return;
  const centers = await cellCenters(page, tag);
  const board = page.locator(`[data-board="${tag}"]`);
  const set = new Set(idx);
  if (model === 'grid100') {
    const rest = [];
    const units = new Set(idx.map((i) => Math.floor(i / 100)));
    for (const u of units) {
      if (range(u * 100, u * 100 + 100).every((i) => set.has(i))) { await f.tapEl(board.locator(`[data-whole="${u}"]`)); continue; }
      for (let c = 0; c < 10; c++) {
        const col = range(u * 100 + c * 10, u * 100 + c * 10 + 10);
        if (col.every((i) => set.has(i))) await f.tapEl(board.locator(`[data-col="${u}:${c}"]`));
        else rest.push(...col.filter((i) => set.has(i)));
      }
    }
    for (const i of rest) await f.tap(centers[i].x, centers[i].y);
    return;
  }
  if (model === 'pizza') {
    for (const i of idx) await f.tap(centers[i].x, centers[i].y);
    return;
  }
  // 막대: 한 막대 안에서 이어진 칸을 한 번에 문지른다
  const byUnit = new Map();
  idx.forEach((i) => { const u = Math.floor(i / cellsPerUnit); byUnit.set(u, [...(byUnit.get(u) || []), i]); });
  for (const list of byUnit.values()) {
    if (list.length === 1) await f.tap(centers[list[0]].x, centers[list[0]].y);
    else await f.drag([[centers[list[0]].x, centers[list[0]].y], [centers[list.at(-1)].x, centers[list.at(-1)].y]], Math.max(4, list.length * 2));
  }
}

export async function type(page, f, answer) {
  const side = page.locator('#side');
  if (typeof answer === 'string') {
    await f.tapEl(side.locator('[data-box=x]'));
    for (const ch of answer) await f.tapEl(side.locator(`.key[data-key="${ch}"]`));
    return;
  }
  for (const k of ['w', 'n', 'd']) {
    if (answer[k] === null || answer[k] === undefined) continue;
    await f.tapEl(side.locator(`[data-box=${k}]`));
    for (const ch of String(answer[k])) await f.tapEl(side.locator(`.key[data-key="${ch}"]`));
  }
}
