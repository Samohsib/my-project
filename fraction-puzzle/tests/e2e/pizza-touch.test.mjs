// 아이패드 크기(가로 1024×768, 세로 768×1024)에서 손가락으로
// 피자를 나누고 칠해서 '분수 피자' 한 판(문제 3개)을 맞히는 흐름 시험
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, startServer, ipadContext, IPAD, finger, cellCenters } from './helpers.mjs';

let srv, browser;
before(async () => { srv = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); srv?.stop(); });

// 화면의 말풍선에서 목표 분수 읽기 (아이가 보는 그대로)
async function readTarget(page) {
  const nu = await page.locator('#bubble .num .nu').first().textContent();
  const de = await page.locator('#bubble .num .de').first().textContent();
  return { n: Number(nu), d: Number(de) };
}

// 바깥 요청이 하나도 없는지, 오류가 없는지 지켜보기
function watch(page, base) {
  const outside = [], errors = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u); });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { outside, errors };
}

async function setCuts(page, f, want) {
  const now = Number(await page.locator('[data-cuts]').textContent());
  const btn = page.locator(want > now ? '[data-act=more]' : '[data-act=less]');
  for (let k = 0; k < Math.abs(want - now); k++) await f.tapEl(btn);
  assert.equal(Number(await page.locator('[data-cuts]').textContent()), want);
}

async function paintByTaps(page, f, count) {
  const cells = await cellCenters(page, 'main');
  for (let i = 0; i < count; i++) await f.tap(cells[i].x, cells[i].y);
}

for (const [name, size] of Object.entries(IPAD)) {
  test(`${name} ${size.width}×${size.height}: 피자 나누고 칠해서 1판을 모두 맞히기`, async () => {
    const ctx = await ipadContext(browser, size);
    const page = await ctx.newPage();
    const w = watch(page, srv.url);
    const f = await finger(page);
    await page.goto(srv.url);

    // 첫 화면 → 분수 피자 → 1판
    await assert.doesNotReject(page.locator('#home.on').waitFor());
    assert.equal(await page.locator('.unit-card').count(), 9); // 단원 8개 + 도전 모드
    await f.tapEl(page.locator('[data-unit=pizza]'));
    await f.tapEl(page.locator('[data-level="1"]'));
    await page.locator('#play.on').waitFor();

    for (let q = 0; q < 3; q++) {
      const { n, d } = await readTarget(page);
      assert.ok(d >= 2 && d <= 12 && n >= 1 && n < d, `목표 ${n}/${d}`);
      await setCuts(page, f, d); // 피자 나누기
      assert.equal(await page.locator('[data-board=main] .cell').count(), d);
      await paintByTaps(page, f, n); // 칠하기
      assert.equal(Number(await page.locator('[data-count]').textContent()), n);
      assert.equal(await page.locator('[data-board=main] .cell.paint').count(), n);
      await f.tapEl(page.locator('[data-act=check]'));
      await page.locator('#sheet[data-result=ok]').waitFor();
      await f.tapEl(page.locator('#sheet [data-act=next]'));
    }

    // 판 끝: 한 번도 안 틀렸으니 별 3개, 기록 저장, 다음 판 열림
    await page.locator('#sheet[data-result=stage-done]').waitFor();
    assert.equal(await page.locator('.big-stars').getAttribute('data-stars'), '3');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-puzzle:v1')));
    assert.equal(saved.stars.pizza[0], 3);
    await f.tapEl(page.locator('#sheet [data-act=next-stage]'));
    await page.locator('#play.on').waitFor();
    assert.match(await page.locator('#where').textContent(), /2판/);

    assert.deepEqual(w.outside, [], '바깥(인터넷) 요청이 없어야 함');
    assert.deepEqual(w.errors, []);
    await ctx.close();
  });

  test(`${name}: 틀리면 그림 설명이 나오고, 손가락으로 문질러 칠해 다시 맞히기`, async () => {
    const ctx = await ipadContext(browser, size);
    const page = await ctx.newPage();
    const w = watch(page, srv.url);
    const f = await finger(page);
    await page.goto(srv.url);
    // 앞 판을 깬 것처럼 기록을 넣어 5판(분모 6, 8)을 연다
    await page.evaluate(() => localStorage.setItem('fraction-puzzle:v1', JSON.stringify({ stars: { pizza: [3, 3, 3, 3] } })));
    await page.reload();
    await f.tapEl(page.locator('[data-unit=pizza]'));
    await f.tapEl(page.locator('[data-level="5"]'));
    await page.locator('#play.on').waitFor();

    // 1) 일부러 한 조각 덜 나눠서 틀리기
    const first = await readTarget(page);
    await setCuts(page, f, first.d - 1);
    await paintByTaps(page, f, 1);
    await f.tapEl(page.locator('[data-act=check]'));
    await page.locator('#sheet[data-result=wrong]').waitFor();
    assert.ok(await page.locator('#sheet .ex-pic svg').count() >= 2, '내가 한 것과 바른 그림');
    const lines = await page.locator('#sheet .ex-lines li').allTextContents();
    assert.ok(lines.some((l) => l.includes(`${first.d}조각`)), lines.join(' / '));
    await f.tapEl(page.locator('#sheet [data-act=retry]'));
    assert.equal(await page.locator('#sheet').isHidden(), true);

    // 2) 이번엔 바르게 나누고, 조각들을 한 번에 문질러 칠하기
    for (let q = 0; q < 3; q++) {
      const { n, d } = await readTarget(page);
      await setCuts(page, f, d);
      const cells = await cellCenters(page, 'main');
      if (n === 1) await f.tap(cells[0].x, cells[0].y);
      else await f.drag(cells.slice(0, n).map((c) => [c.x, c.y]));
      assert.equal(Number(await page.locator('[data-count]').textContent()), n, `${n}/${d} 문지르기`);
      // 칠한 조각을 다시 누르면 지워지고, 또 누르면 칠해진다
      await f.tap(cells[0].x, cells[0].y);
      assert.equal(Number(await page.locator('[data-count]').textContent()), n - 1);
      await f.tap(cells[0].x, cells[0].y);
      await f.tapEl(page.locator('[data-act=check]'));
      await page.locator('#sheet[data-result=ok]').waitFor();
      await f.tapEl(page.locator('#sheet [data-act=next]'));
    }
    await page.locator('#sheet[data-result=stage-done]').waitFor();
    assert.equal(await page.locator('.big-stars').getAttribute('data-stars'), '2', '한 번 틀리면 별 2개');

    assert.deepEqual(w.outside, []);
    assert.deepEqual(w.errors, []);
    await ctx.close();
  });
}

test('인터넷이 끊겨도 다시 열린다 (오프라인 캐시)', async () => {
  const ctx = await ipadContext(browser, IPAD.landscape);
  const page = await ctx.newPage();
  await page.goto(srv.url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // 서비스 워커가 페이지를 맡은 뒤
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await page.reload();
  await page.locator('#home.on .unit-card').first().waitFor();
  const f = await finger(page);
  await f.tapEl(page.locator('[data-unit=pizza]'));
  await f.tapEl(page.locator('[data-level="1"]'));
  await page.locator('#play.on [data-board=main]').waitFor();
  await ctx.close();
});
