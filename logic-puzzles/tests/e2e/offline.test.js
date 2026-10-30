// 인터넷 없이: 바깥 요청이 하나도 없고, 한 번 연 뒤에는 서비스 워커 캐시로 꺼진 상태에서도 열린다
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { startServer } from '../helpers/server.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await srv?.close(); });

test('모든 화면을 돌아도 바깥 주소 요청이 없다', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const outside = [];
  page.on('request', (r) => { if (!r.url().startsWith(srv.url)) outside.push(r.url()); });
  for (const hash of ['#/', '#/p/sudoku', '#/p/nonogram', '#/p/futoshiki', '#/records',
    '#/play/sudoku/4/daily', '#/play/nonogram/5/daily', '#/play/futoshiki/4/daily']) {
    await page.goto(`${srv.url}${hash}`);
    await page.waitForLoadState('networkidle');
  }
  assert.deepEqual(outside, []);
  await ctx.close();
});

test('서비스 워커가 캐시한 뒤에는 서버가 꺼져도(오프라인) 열린다', async () => {
  const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(srv.url);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    // 첫 방문에서는 아직 페이지를 SW가 관리하지 않을 수 있어 한 번 기다린다
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
  });
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('logic-puzzles-')));
    return (await c.keys()).length;
  });
  assert.ok(cached >= 20, `캐시된 파일 수: ${cached}`);

  await ctx.setOffline(true);
  await page.reload();
  await page.locator('.screen.home').waitFor();
  await page.tap('.pcard[data-type="nonogram"]');
  await page.tap('.mode.daily');
  await page.locator('.nono').waitFor();
  assert.ok(await page.locator('.nono .nc').count() === 25);
  await ctx.close();
});
