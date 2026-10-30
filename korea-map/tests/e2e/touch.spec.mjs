// 터치 흐름 시험: 아이패드 크기에서 손가락으로 시·도를 맞히고 도장을 받는다
import { test, expect } from '@playwright/test';

// 지도 위 [경도, 위도] 를 지금 화면 좌표로 바꾼다 (확대·이동 반영)
async function screenPointOf(page, ll) {
  return page.evaluate((p) => {
    const { map, project } = window.__koreaMap;
    return map.toClientPoint(project(p));
  }, ll);
}

async function currentQuestion(page) {
  return page.evaluate(() => {
    const { play } = window.__koreaMap;
    const q = play.round[play.idx];
    return { key: q.key, answer: q.answer, accept: q.accept, mode: q.mode, stampId: q.stampId };
  });
}

// 시·도 코드 → 그 시·도 이름표 자리(경계 안쪽 점)
async function regionPoint(page, code) {
  const ll = await page.evaluate((c) => window.__koreaMap.cat.byCode[c].label, code);
  return screenPointOf(page, ll);
}

async function startStage(page, n) {
  await page.goto('/index.html');
  await page.waitForSelector('body[data-ready="1"]');
  await page.locator(`.stage-card[data-stage="${n}"]`).tap();
  await expect(page.locator('#play')).toHaveClass(/on/);
  await expect(page.locator('#prompt')).not.toHaveText('문제');
}

// 두 손가락 벌리기 (Chrome DevTools 프로토콜로 실제 터치 점 두 개를 보낸다)
async function pinchOut(page, cx, cy, from = 60, to = 180, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  const pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + ((to - from) * i) / steps) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test.beforeEach(async ({ page }) => {
  // 매번 깨끗한 기록으로 시작
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__keep')) localStorage.clear();
  });
});

test('1단계: 시·도 하나를 손가락으로 눌러 맞히고 도장을 받는다', async ({ page }) => {
  await startStage(page, 1);
  const q = await currentQuestion(page);
  expect(q.mode).toBe('region');
  await expect(page.locator('#stampCount')).toHaveText('0');

  const [x, y] = await regionPoint(page, q.answer);
  await page.touchscreen.tap(x, y);

  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#resSub')).toContainText('새 도장');
  await expect(page.locator('#stampCount')).toHaveText('1');
  await expect(page.locator(`.region[data-code="${q.answer}"]`)).toHaveClass(/is-right/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('korea-map:v1')));
  expect(Object.keys(saved.stamps)).toEqual([q.stampId]);

  // 다음 문제로 넘어간다
  await page.locator('#nextBtn').tap();
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#qProgress')).toHaveText(/^2 \/ /);
});

test('1단계: 다른 시·도를 누르면 이름을 알려 주고, 세 번 틀리면 답이 반짝인다', async ({ page }) => {
  await startStage(page, 1);
  const q = await currentQuestion(page);
  const wrongCode = q.answer === '11' ? '50' : '11'; // 서울 또는 제주
  const [wx, wy] = await regionPoint(page, wrongCode);

  await page.touchscreen.tap(wx, wy);
  await expect(page.locator('#feedback')).toHaveClass(/bad/);
  await expect(page.locator('#feedback')).toContainText('여긴');
  await expect(page.locator('#result')).toBeHidden();

  await page.touchscreen.tap(wx, wy);
  await expect(page.locator('#feedback')).toContainText('힌트');
  await page.touchscreen.tap(wx, wy);
  await expect(page.locator(`.region[data-code="${q.answer}"]`)).toHaveClass(/is-pulse/);

  // 바다를 누르면 틀린 것으로 치지 않는다
  const [sx, sy] = await screenPointOf(page, [125.0, 33.6]);
  await page.touchscreen.tap(sx, sy);
  await expect(page.locator('#feedback')).toContainText('바다');

  const [x, y] = await regionPoint(page, q.answer);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#feedback')).toContainText('찾았어요');
});

test('두 손가락으로 확대한 뒤에도 손가락으로 맞힐 수 있다', async ({ page }) => {
  await startStage(page, 1);
  const box = await page.locator('#mapHost').boundingBox();
  const before = Number(await page.locator('#mapHost').getAttribute('data-zoom'));
  await pinchOut(page, box.x + box.width / 2, box.y + box.height / 2);
  const after = Number(await page.locator('#mapHost').getAttribute('data-zoom'));
  expect(after).toBeGreaterThan(before * 1.8);
  // 확대·이동만 했으므로 아직 답을 고르지 않았다
  await expect(page.locator('#result')).toBeHidden();

  const q = await currentQuestion(page);
  // 확대해서 답 시·도가 화면 밖으로 나갔을 수 있으니 처음 크기로 돌린 뒤 다시 확대해 그 위치를 누른다
  await page.locator('#zoomReset').tap();
  const [x0, y0] = await regionPoint(page, q.answer);
  await pinchOut(page, x0, y0, 40, 110, 6);
  expect(Number(await page.locator('#mapHost').getAttribute('data-zoom'))).toBeGreaterThan(1.5);
  const [x, y] = await regionPoint(page, q.answer);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#result')).toBeVisible();
});

test('2단계: 도시 점을 손가락으로 눌러 맞힌다', async ({ page }) => {
  await startStage(page, 2);
  const q = await currentQuestion(page);
  expect(q.mode).toBe('city');
  const ll = await page.evaluate((id) => window.__koreaMap.cat.cities.find((c) => c.id === id).ll, q.answer);
  const [x, y] = await screenPointOf(page, ll);
  await page.touchscreen.tap(x + 4, y - 3); // 손가락이 살짝 빗나가도 맞게 친다
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#stampCount')).toHaveText('1');
});

test('도장은 새로고침해도 남아 있고 도장 수첩에 보인다', async ({ page }) => {
  await startStage(page, 1);
  const q = await currentQuestion(page);
  const [x, y] = await regionPoint(page, q.answer);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('#stampCount')).toHaveText('1');

  await page.evaluate(() => sessionStorage.setItem('__keep', '1'));
  await page.reload();
  await page.waitForSelector('body[data-ready="1"]');
  await expect(page.locator('#stampCount')).toHaveText('1');
  await page.locator('#openBook').tap();
  await expect(page.locator('#book')).toHaveClass(/on/);
  await expect(page.locator('#bookSub')).toContainText('모은 도장 1 /');
  await page.locator(`.book-card[data-page="${q.answer}"]`).tap();
  await expect(page.locator('#pageView')).toBeVisible();
  await expect(page.locator('#pageStamps .slot:not(.empty)')).toHaveCount(1);
});

test('실행 중에 바깥 인터넷 요청이 하나도 없다', async ({ page }) => {
  const outside = [];
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data')) outside.push(req.url());
  });
  await startStage(page, 4);
  await page.locator('#backBtn').tap();
  await page.locator('#openAbout').tap();
  await expect(page.locator('#about')).toHaveClass(/on/);
  expect(outside).toEqual([]);
});
