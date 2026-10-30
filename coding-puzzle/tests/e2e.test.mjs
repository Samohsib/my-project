// 아이패드 크기(가로 1024×768, 세로 768×1024)에서 손가락(터치)으로 첫 판을 깨는 흐름 시험
//   - 블록은 탭으로도, 끌어다 놓기(진짜 터치 이벤트)로도 쌓는다
//   - 끌어서 밖에 놓으면 빠지는지, 한 단계 · 처음부터 · 되돌리기가 되는지
//   - 실행해서 성공 창과 별 3개가 나오고 기록이 저장되는지
//   - 바깥 인터넷으로 나가는 요청이 하나도 없는지, 오류가 없는지, 화면 밖으로 넘치는 게 없는지
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from './helpers/playwright.mjs';
import { startServer } from './helpers/server.mjs';

let srv, browser;
before(async () => {
  srv = await startServer();
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await srv?.close();
});

async function openIpad(width, height) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  const problems = [];
  const outside = [];
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('request', r => {
    const u = r.url();
    if (!u.startsWith(srv.url) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(u);
  });
  const cdp = await ctx.newCDPSession(page);
  // 진짜 손가락처럼 touchStart → touchMove 여러 번 → touchEnd
  const touchDrag = async (from, to, steps = 14) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
    for (let i = 1; i <= steps; i++) {
      const x = from.x + (to.x - from.x) * i / steps;
      const y = from.y + (to.y - from.y) * i / steps;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  return { ctx, page, problems, outside, touchDrag };
}

const center = async loc => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

async function expectInside(page, selectors) {
  const { innerWidth: W, innerHeight: H } = await page.evaluate(() => ({ innerWidth, innerHeight }));
  for (const sel of selectors) {
    const b = await page.locator(sel).first().boundingBox();
    assert.ok(b, `${sel} 이(가) 안 보여요`);
    assert.ok(b.x >= -1 && b.y >= -1 && b.x + b.width <= W + 1 && b.y + b.height <= H + 1, `${sel} 이(가) 화면 밖으로 나가요: ${JSON.stringify(b)}`);
  }
  const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(over <= 0, `가로로 ${over}px 넘쳐요`);
}

for (const [w, h, name] of [[1024, 768, '가로'], [768, 1024, '세로']]) {
  test(`아이패드 ${name}(${w}×${h}): 터치로 첫 판 깨기`, async () => {
    const { ctx, page, problems, outside, touchDrag } = await openIpad(w, h);
    await page.goto(srv.url);

    // 첫 화면: 1-1만 열려 있다
    await page.waitForSelector('#home.on');
    assert.equal(await page.locator('.lv:not(.locked)').count(), 1);
    await expectInside(page, ['.home-title h1', '#settingsBtn', '.lv[data-id="1-1"]']);

    // 1-1 열기 → 1장 소개 창 → 시작
    await page.tap('.lv[data-id="1-1"]');
    await page.waitForSelector('.sheet.intro');
    await page.tap('.sheet.intro [data-close]');
    await page.waitForSelector('#play.on');
    assert.equal(await page.textContent('#lvId'), '1-1');
    await expectInside(page, ['#board svg', '#runBtn', '#stepBtn', '#resetBtn', '.pal-item.k-F', '.pal-item.k-R', '#workspace', '#undoBtn', '#clearBtn']);
    for (const sel of ['#runBtn', '#stepBtn', '#resetBtn', '.pal-item.k-F', '#undoBtn', '#backBtn']) {
      const b = await page.locator(sel).boundingBox();
      assert.ok(b.height >= 44 && b.width >= 44, `${sel} 누르는 곳이 너무 작아요`);
    }

    // ① 탭으로 블록 넣기
    await page.tap('.pal-item.k-F');
    assert.equal(await page.locator('#workspace .blk').count(), 1);

    // ② 끌어다 놓기: 블록 상자의 '앞으로'를 프로그램 끝 칸으로
    const end = page.locator('.list.root[data-list="main"] > .end');
    await touchDrag(await center(page.locator('.pal-item.k-F')), await center(end));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#workspace .blk.k-F').count(), 2, '끌어다 놓은 블록이 들어가야 해요');

    // ③ 잘못 넣은 블록(오른쪽 돌기)을 끌어서 밖으로 빼기
    await page.tap('.pal-item.k-R');
    assert.equal(await page.locator('#workspace .blk').count(), 3);
    const rBlock = page.locator('#workspace .blk.k-R .lbl');
    await touchDrag(await center(rBlock), await center(page.locator('#board')));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#workspace .blk.k-R').count(), 0, '밖으로 끌어낸 블록은 빠져야 해요');

    // ④ 되돌리기: 방금 뺀 블록이 돌아오고, 한 번 더 누르면 넣기 전으로
    await page.tap('#undoBtn');
    assert.equal(await page.locator('#workspace .blk.k-R').count(), 1);
    await page.tap('#undoBtn');
    assert.equal(await page.locator('#workspace .blk').count(), 2);

    // ⑤ 탭으로 하나 더 → 앞으로 3개
    await page.tap('.pal-item.k-F');
    assert.equal(await page.locator('#workspace .blk.k-F').count(), 3);
    assert.equal(await page.textContent('#count'), '블록 3개');

    // ⑥ 한 단계씩: 첫 블록이 빛나고 로봇이 한 칸 간다, 처음부터를 누르면 제자리
    await page.tap('#stepBtn');
    await page.waitForSelector('#workspace .blk.hl');
    await page.waitForTimeout(700);
    const firstId = await page.locator('#workspace .blk').first().getAttribute('data-id');
    assert.equal(await page.locator('#workspace .blk.hl').getAttribute('data-id'), firstId);
    const moved = await page.locator('.robot').getAttribute('transform');
    assert.match(moved, /translate\(250/, '로봇이 오른쪽으로 한 칸 가야 해요');
    await page.tap('#resetBtn');
    assert.match(await page.locator('.robot').getAttribute('transform'), /translate\(150/);
    assert.equal(await page.locator('#workspace .blk.hl').count(), 0);

    // ⑦ 실행 → 성공, 별 3개
    await page.tap('#runBtn');
    await page.waitForSelector('.sheet.win', { timeout: 10000 });
    assert.equal(await page.locator('.sheet.win .win-stars svg.on').count(), 3);
    await expectInside(page, ['.sheet.win [data-act="next"]', '.sheet.win [data-act="again"]']);
    // 창 안의 버튼은 창 안에 있어야 한다
    const sheetBox = await page.locator('.sheet.win').boundingBox();
    for (const sel of ['[data-act="next"]', '[data-act="again"]']) {
      const b = await page.locator(`.sheet.win ${sel}`).boundingBox();
      assert.ok(b.x >= sheetBox.x && b.y >= sheetBox.y && b.x + b.width <= sheetBox.x + sheetBox.width
        && b.y + b.height <= sheetBox.y + sheetBox.height, `${sel} 버튼이 성공 창 밖에 있어요`);
    }

    // 기록 저장
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-puzzle-v1')));
    assert.equal(saved.stars['1-1'], 3);
    assert.equal(saved.best['1-1'], 3);

    // ⑧ 다음 판으로
    await page.tap('.sheet.win [data-act="next"]');
    await page.waitForSelector('#modal.on', { state: 'detached' });
    assert.equal(await page.textContent('#lvId'), '1-2');

    // 판 목록으로 돌아가면 1-1에 별 3개, 1-2가 열려 있다
    await page.tap('#backBtn');
    await page.waitForSelector('#home.on');
    assert.equal(await page.locator('.lv[data-id="1-1"] svg.on').count(), 3);
    assert.equal(await page.locator('.lv[data-id="1-2"]:not(.locked)').count(), 1);

    assert.deepEqual(outside, [], '인터넷으로 나가는 요청이 있으면 안 돼요');
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('반복 블록: 탭으로 안에 넣고, 숫자를 바꾸고, 다시 열어도 프로그램이 남아 있다', async () => {
  const { ctx, page, problems, outside } = await openIpad(1024, 768);
  await page.goto(srv.url);
  await page.evaluate(() => localStorage.setItem('coding-puzzle-v1', JSON.stringify({
    settings: { voice: false, sfx: false, speed: 'fast', unlockAll: true }, seen: { ch1: true, ch2: true, ch3: true, ch4: true },
  })));
  await page.goto(`${srv.url}#2-1`);
  await page.reload();
  await page.waitForSelector('#play.on');
  // 반복을 넣으면 노란 자리가 반복 안으로 들어가서, 다음 탭은 반복 안에 들어간다
  await page.tap('.pal-item.k-rep');
  await page.tap('.pal-item.k-F');
  assert.equal(await page.locator('#workspace .blk.k-rep .blk.k-F').count(), 1);
  // 숫자 바꾸기: 3 → 8
  await page.tap('#workspace .blk.k-rep .num');
  await page.waitForSelector('.sheet.picker');
  await page.tap('.sheet.picker .opt[data-v="8"]');
  assert.equal(await page.textContent('#workspace .blk.k-rep .num'), '8');
  assert.equal(await page.textContent('#count'), '블록 2개');
  // 다시 열어도 그대로
  await page.reload();
  await page.waitForSelector('#play.on');
  assert.equal(await page.textContent('#workspace .blk.k-rep .num'), '8');
  // 실행하면 반복 칸에 몇 번째인지 나온다
  await page.tap('#runBtn');
  await page.waitForSelector('#workspace .badge.loop');
  await page.waitForSelector('.sheet.win', { timeout: 10000 });
  assert.equal(await page.locator('.sheet.win .win-stars svg.on').count(), 3);
  assert.deepEqual(outside, []);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('나만의 블록과 만약 블록도 터치로 짜서 깰 수 있다 (3-1, 4-1)', async () => {
  const { ctx, page, problems, touchDrag } = await openIpad(768, 1024);
  await page.goto(srv.url);
  await page.evaluate(() => localStorage.setItem('coding-puzzle-v1', JSON.stringify({
    settings: { voice: false, sfx: false, speed: 'fast', unlockAll: true }, seen: { ch1: true, ch2: true, ch3: true, ch4: true },
  })));
  // 3-1: 나만의 블록 = 앞으로 왼쪽 앞으로 오른쪽, 프로그램 = ★ 네 번
  await page.goto(`${srv.url}#3-1`);
  await page.reload();
  await page.waitForSelector('#play.on');
  for (let i = 0; i < 4; i++) await page.tap('.pal-item.k-P');
  // 나만의 블록 칸의 끝을 눌러 노란 자리를 옮긴 뒤 탭으로 채우기
  await page.locator('.list.root[data-list="fn"] > .end').scrollIntoViewIfNeeded();
  await page.tap('.list.root[data-list="fn"] > .end');
  for (const k of ['F', 'L', 'F', 'R']) await page.tap(`.pal-item.k-${k}`);
  assert.equal(await page.locator('.list.root[data-list="fn"] > .blk').count(), 4);
  // 나만의 블록 안에 ★을 끌어 넣으면 안 된다
  const fnEnd = page.locator('.list.root[data-list="fn"] > .end');
  await touchDrag(await center(page.locator('.pal-item.k-P')), await center(fnEnd));
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.list.root[data-list="fn"] .blk.k-P').count(), 0);
  assert.match(await page.textContent('#bubble'), /넣을 수 없어요/);
  assert.equal(await page.textContent('#count'), '블록 8개');
  await page.tap('#runBtn');
  await page.waitForSelector('.sheet.win', { timeout: 15000 });
  assert.equal(await page.locator('.sheet.win .win-stars svg.on').count(), 3);

  // 4-1: 20번 반복 안에 만약(앞이 막혔으면) 오른쪽 / 아니면 앞으로
  await page.goto(`${srv.url}#4-1`);
  await page.reload();
  await page.waitForSelector('#play.on');
  await page.tap('.pal-item.k-rep');
  await page.tap('.pal-item.k-if');
  await page.tap('.pal-item.k-R');                         // 만약 칸 안
  await page.tap('#workspace .blk.k-if > .list[data-list$=":else"] > .end');
  await page.tap('.pal-item.k-F');                         // 아니면 칸 안
  await page.tap('#workspace .blk.k-rep .num');
  await page.tap('.sheet.picker .opt[data-v="20"]');
  assert.equal(await page.textContent('#count'), '블록 4개');
  await page.tap('#runBtn');
  await page.waitForSelector('#workspace .badge.yes, #workspace .badge.no');
  await page.waitForSelector('.sheet.win', { timeout: 20000 });
  assert.equal(await page.locator('.sheet.win .win-stars svg.on').count(), 3);
  assert.deepEqual(problems, []);
  await ctx.close();
});
