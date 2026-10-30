// 문서용 스크린샷 찍기 (아이패드 가로 1024×768, 세로 768×1024)
//   npm run screenshots   → docs/*.png
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8767;
const BASE = `http://127.0.0.1:${PORT}/index.html`;
const LAND = { width: 1024, height: 768 };
const PORT_V = { width: 768, height: 1024 };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch();

async function open(viewport, stamps = {}) {
  const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await ctx.addInitScript((st) => {
    // 늘 같은 문제 순서가 나오게 난수를 고정
    let s = 42;
    Math.random = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    localStorage.setItem('korea-map:v1', JSON.stringify({ stamps: st, sound: false, rounds: 0 }));
  }, stamps);
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForSelector('body[data-ready="1"]');
  return { ctx, page };
}

const pt = (page, ll) => page.evaluate((p) => window.__koreaMap.map.toClientPoint(window.__koreaMap.project(p)), ll);
const q = (page) => page.evaluate(() => {
  const { play } = window.__koreaMap;
  return play.round[play.idx];
});
const shot = (page, name) => page.screenshot({ path: path.join(ROOT, 'docs', name) });

async function startStage(page, n) {
  await page.locator(`.stage-card[data-stage="${n}"]`).tap();
  await page.waitForTimeout(250);
}

// 도장이 조금 모인 상태
const someStamps = {};
for (const id of ['region:seoul', 'region:gyeonggi', 'region:gangwon', 'region:jeju', 'region:gyeongbuk', 'region:busan',
  'suwon', 'chuncheon', 'andong', 'gyeongju', 'gyeongbokgung', 'bulguksa', 'dokdo', 'hahoe', 'seongju-melon', 'hallasan', 'seoraksan', 'han', 'nakdong']) {
  someStamps[id] = { stage: 1, at: '2026-10-30', firstTry: true };
}

try {
  // 1. 처음 화면 (가로)
  {
    const { ctx, page } = await open(LAND, someStamps);
    await shot(page, '01-home-1024x768.png');
    await ctx.close();
  }
  // 2. 1단계 문제 → 정답 (가로)
  {
    const { ctx, page } = await open(LAND);
    await startStage(page, 1);
    await shot(page, '02-stage1-question-1024x768.png');
    const cur = await q(page);
    const ll = await page.evaluate((c) => window.__koreaMap.cat.byCode[c].label, cur.answer);
    const [x, y] = await pt(page, ll);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(700);
    await shot(page, '03-stage1-correct-1024x768.png');
    await ctx.close();
  }
  // 3. 2단계: 틀려서 힌트 받기 (세로)
  {
    const { ctx, page } = await open(PORT_V);
    await startStage(page, 2);
    const cur = await q(page);
    const other = await page.evaluate((id) => window.__koreaMap.cat.cities.find((c) => c.id !== id && c.role === 'major').ll, cur.answer);
    const [x, y] = await pt(page, other);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(150);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(400);
    await shot(page, '04-stage2-hint-768x1024.png');
    await ctx.close();
  }
  // 4. 3단계: 명소 맞히고 핀 보기 (세로)
  {
    const { ctx, page } = await open(PORT_V);
    await startStage(page, 3);
    const cur = await q(page);
    const [x, y] = await pt(page, cur.pin);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(700);
    await shot(page, '05-stage3-correct-768x1024.png');
    await ctx.close();
  }
  // 5. 4단계: 산과 강, 확대한 모습 (가로)
  {
    const { ctx, page } = await open(LAND);
    await startStage(page, 4);
    await page.evaluate(() => {
      const { map, project } = window.__koreaMap;
      const [x, y] = project([128.3, 36.3]);
      map.zoomAt([x, y], 1.8);
    });
    await page.waitForTimeout(200);
    await shot(page, '06-stage4-zoomed-1024x768.png');
    await ctx.close();
  }
  // 6. 도장 수첩 (세로) + 한 쪽 열기
  {
    const { ctx, page } = await open(PORT_V, someStamps);
    await page.locator('#openBook').tap();
    await page.waitForTimeout(200);
    await shot(page, '07-book-768x1024.png');
    await page.locator('.book-card[data-page="47"]').tap();
    await page.waitForTimeout(200);
    await shot(page, '08-book-page-768x1024.png');
    await ctx.close();
  }
  console.log('docs/ 에 스크린샷을 저장했어요.');
} finally {
  await browser.close();
  server.kill();
}
