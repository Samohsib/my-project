// 아이패드 크기(1024×768 가로, 768×1024 세로)에서 손가락 터치로 노는 흐름 시험
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { startServer } from '../helpers/server.js';
import { makePuzzle, practiceSeed } from '../../js/core/catalog.js';

const IPAD_UA = devices['iPad (gen 7)'].userAgent;
const SIZES = [
  { name: '가로 1024×768', width: 1024, height: 768 },
  { name: '세로 768×1024', width: 768, height: 1024 },
];

let srv, browser;
before(async () => { srv = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await srv?.close(); });

async function ipad({ width, height }) {
  const ctx = await browser.newContext({
    viewport: { width, height }, hasTouch: true, isMobile: true, deviceScaleFactor: 2,
    userAgent: IPAD_UA, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`페이지 오류: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`콘솔 오류: ${m.text()}`); });
  page.on('request', (r) => { if (!r.url().startsWith(srv.url) && !r.url().startsWith('data:')) problems.push(`바깥 요청: ${r.url()}`); });
  return { ctx, page, problems };
}

const readStore = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('logic-puzzles:v1')));

// 화면에 보이는 숫자판 읽기 (data-i 순서)
async function readGrid(page) {
  const cells = await page.$$eval('.ngrid .cell, .futo-grid .cell', (els) => els.map((e) => [Number(e.dataset.i), e.querySelector('.val').textContent]));
  const out = [];
  for (const [i, t] of cells) out[i] = t ? Number(t) : 0;
  return out;
}

// 손가락으로 쭉 밀기 (CDP 터치 이벤트 → 브라우저가 pointer 이벤트를 만든다)
async function touchDrag(page, from, to, steps = 8) {
  const cdp = await page.context().newCDPSession(page);
  const pt = (x, y) => [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
  for (let k = 1; k <= steps; k++) {
    const x = from.x + ((to.x - from.x) * k) / steps, y = from.y + ((to.y - from.y) * k) / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x, y) });
  }
  // 손가락을 떼기 전에 잠깐 멈춘다. 빠르게 휙 떼면 Chromium이 '튕기기(fling)'로 여겨
  // 다음 탭의 click을 삼킨다(앱 코드가 없는 빈 페이지에서도 똑같다).
  for (let k = 0; k < 3; k++) {
    await new Promise((r) => setTimeout(r, 40));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(to.x, to.y) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

async function centerOf(page, selector) {
  const b = await page.locator(selector).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

for (const size of SIZES) {
  test(`아이패드 ${size.name}: 4×4 스도쿠 오늘의 퍼즐을 터치로 끝까지 푼다`, async () => {
    const { ctx, page, problems } = await ipad(size);
    await page.goto(srv.url);

    // 첫 화면 → 스도쿠 → 오늘의 퍼즐
    await page.tap('.pcard[data-type="sudoku"]');
    await page.locator('.screen.select').waitFor();
    assert.equal(await page.locator('.level.sel').getAttribute('data-level'), '4');
    await page.tap('.mode.daily');
    const play = page.locator('.screen.play');
    await play.waitFor();

    // 오늘 날짜 씨앗이고, 화면의 판이 Node에서 같은 씨앗으로 만든 판과 똑같다 (브라우저가 달라도 같은 판)
    const seed = await play.getAttribute('data-seed');
    const today = await page.evaluate(() => {
      const d = new Date(); const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    });
    assert.equal(seed, `daily|${today}|sudoku|4`);
    const puzzle = makePuzzle('sudoku', '4', seed);
    assert.deepEqual(await readGrid(page), puzzle.givens);

    // 판과 숫자 단추가 화면 안에 다 보이고, 손가락으로 누르기 넉넉한 크기인지
    for (const sel of ['.ngrid', '.pad', '.tools']) {
      const b = await page.locator(sel).boundingBox();
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= size.width + 1 && b.y + b.height <= size.height + 1, `${sel}가 화면 밖으로 나감`);
    }
    const cellBox = await page.locator('.ngrid .cell').first().boundingBox();
    assert.ok(cellBox.width >= 60, `칸이 너무 작음: ${cellBox.width}`);
    const numBox = await page.locator('.pad .num').first().boundingBox();
    assert.ok(numBox.height >= 56 && numBox.width >= 56, '숫자 단추가 너무 작음');

    // 빈칸을 하나씩 눌러 정답 숫자를 넣는다
    const blanks = puzzle.givens.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    for (const i of blanks) {
      await page.tap(`.cell[data-i="${i}"]`);
      assert.match(await page.locator(`.cell[data-i="${i}"]`).getAttribute('class'), /\bsel\b/);
      await page.tap(`.pad .num[data-v="${puzzle.solution[i]}"]`);
    }

    // 다 풀었어요!
    const sheet = page.locator('.overlay .sheet');
    await sheet.waitFor({ timeout: 5000 });
    assert.match(await sheet.textContent(), /다 풀었어요/);
    assert.match(await sheet.textContent(), /힌트 없이/);
    assert.deepEqual(await readGrid(page), puzzle.solution);

    // 기록이 저장되고, 첫 화면에 연속 1일이 보인다
    const store = await readStore(page);
    assert.ok(store.rec.daily[today]['sudoku:4']);
    assert.equal(store.rec.solved['sudoku:4'], 1);
    await page.tap('.overlay [data-act="home"]');
    await page.locator('.screen.home').waitFor();
    assert.match(await page.locator('.streak').textContent(), /1일/);
    assert.match(await page.locator('.pcard[data-type="sudoku"] .today').textContent(), /완료/);

    // 다시 열면 이미 푼 판으로 보인다
    await page.goto(`${srv.url}#/play/sudoku/4/daily`);
    await page.locator('.screen.play').waitFor();
    assert.match(await page.locator('.coach').textContent(), /벌써 풀었어요/);
    assert.deepEqual(await readGrid(page), puzzle.solution);

    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

test('메모·되돌리기·힌트·이어 하기 (세로 768×1024)', async () => {
  const { ctx, page, problems } = await ipad(SIZES[1]);
  await page.goto(`${srv.url}#/play/sudoku/4/practice`);
  const play = page.locator('.screen.play');
  await play.waitFor();
  const seed = await play.getAttribute('data-seed');
  assert.equal(seed, practiceSeed('sudoku', '4', 0));
  const p = makePuzzle('sudoku', '4', seed);
  const blanks = p.givens.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  const a = blanks[0];

  // 메모: 1, 2를 적고 → 되돌리기로 2를 지운다
  await page.tap(`.cell[data-i="${a}"]`);
  await page.tap('[aria-label="메모"]');
  await page.tap('.pad .num[data-v="1"]');
  await page.tap('.pad .num[data-v="2"]');
  const memo = () => page.locator(`.cell[data-i="${a}"] .memo`).textContent();
  assert.equal(await memo(), '12');
  await page.tap('[aria-label="되돌리기"]');
  assert.equal(await memo(), '1');
  await page.tap('[aria-label="메모"]');

  // 틀린 숫자를 넣으면 힌트가 먼저 틀린 칸을 알려 준다
  const wrong = (p.solution[a] % 4) + 1;
  await page.tap('.pad .num[data-v="' + wrong + '"]');
  assert.equal(await page.locator(`.cell[data-i="${a}"] .val`).textContent(), String(wrong));
  await page.tap('[aria-label="힌트"]');
  assert.match(await page.locator('.coach').textContent(), /틀렸어요/);
  assert.match(await page.locator(`.cell[data-i="${a}"]`).getAttribute('class'), /\bwrong\b/);
  await page.tap('[aria-label="지우기"]');
  assert.equal(await page.locator(`.cell[data-i="${a}"] .val`).textContent(), '');

  // 힌트를 누르면 정답 숫자 하나를 이유와 함께 채워 준다
  const before = await readGrid(page);
  await page.tap('[aria-label="힌트"]');
  const after = await readGrid(page);
  const filled = after.findIndex((v, i) => v !== before[i]);
  assert.ok(filled >= 0, '힌트가 칸을 채워야 한다');
  assert.equal(after[filled], p.solution[filled]);
  assert.match(await page.locator('.coach').textContent(), /이 칸|하나뿐/);

  // 새로 고침해도 하던 판이 그대로 이어진다
  await page.waitForTimeout(300);
  await page.reload();
  await page.locator('.screen.play').waitFor();
  assert.equal(await page.locator('.screen.play').getAttribute('data-seed'), seed);
  assert.deepEqual(await readGrid(page), after);
  assert.match(await page.locator('.coach').textContent(), /이어서/);

  // 나머지를 채우면 끝 — 힌트 횟수가 보인다
  for (const i of blanks) {
    if (after[i]) continue;
    await page.tap(`.cell[data-i="${i}"]`);
    await page.tap(`.pad .num[data-v="${p.solution[i]}"]`);
  }
  await page.locator('.overlay .sheet').waitFor();
  assert.match(await page.locator('.overlay .sheet').textContent(), /힌트 2번/);
  // 연습 '다음 판'은 새 씨앗
  await page.tap('.overlay [data-act="next"]');
  await page.waitForFunction((s) => document.querySelector('.screen.play')?.dataset.seed !== s, seed);
  assert.equal(await page.locator('.screen.play').getAttribute('data-seed'), practiceSeed('sudoku', '4', 1));
  // 연습 판은 연속 기록에 들어가지 않는다
  const store = await readStore(page);
  assert.equal(Object.keys(store.rec.daily).length, 0);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('네모로직: 손가락으로 쭉 밀어 한 줄을 칠하고, 끝까지 풀면 그림이 나온다 (가로 1024×768)', async () => {
  const { ctx, page, problems } = await ipad(SIZES[0]);
  await page.goto(`${srv.url}#/play/nonogram/5/practice`);
  const play = page.locator('.screen.play');
  await play.waitFor();
  const p = makePuzzle('nonogram', '5', await play.getAttribute('data-seed'));
  const state = async () => page.$$eval('.nono .nc', (els) => els.map((e) => (e.classList.contains('v1') ? 1 : e.classList.contains('v2') ? 2 : 0)));

  // 첫 줄 왼쪽 끝 → 오른쪽 끝으로 밀면 다섯 칸이 모두 칠해지고, 되돌리기 한 번에 한꺼번에 지워진다
  await touchDrag(page, await centerOf(page, '.nc[data-i="0"]'), await centerOf(page, '.nc[data-i="4"]'));
  assert.deepEqual((await state()).slice(0, 5), [1, 1, 1, 1, 1]);
  await page.tap('[aria-label="되돌리기"]');
  assert.deepEqual((await state()).slice(0, 5), [0, 0, 0, 0, 0]);

  // 세로로 밀다가 살짝 옆으로 흔들려도 같은 세로줄만 칠한다
  const top = await centerOf(page, '.nc[data-i="2"]');
  const bottom = await centerOf(page, '.nc[data-i="22"]');
  await touchDrag(page, top, { x: bottom.x + 20, y: bottom.y });
  const s1 = await state();
  assert.deepEqual([2, 7, 12, 17, 22].map((i) => s1[i]), [1, 1, 1, 1, 1]);
  assert.equal(s1.filter(Boolean).length, 5);
  await page.tap('[aria-label="되돌리기"]');

  // X 표시 모드로 바꿔 한 칸 탭
  await page.tap('[aria-label="X 표시"]');
  await page.tap('.nc[data-i="0"]');
  assert.equal((await state())[0], 2);
  await page.tap('[aria-label="되돌리기"]');
  await page.tap('[aria-label="칠하기"]');

  // 정답 칸을 가로줄마다 끊어진 묶음별로 밀어서 칠한다
  for (let r = 0; r < p.h; r++) {
    let c = 0;
    while (c < p.w) {
      if (!p.solution[r * p.w + c]) { c++; continue; }
      let e = c;
      while (e + 1 < p.w && p.solution[r * p.w + e + 1]) e++;
      if (e === c) await page.tap(`.nc[data-i="${r * p.w + c}"]`);
      else await touchDrag(page, await centerOf(page, `.nc[data-i="${r * p.w + c}"]`), await centerOf(page, `.nc[data-i="${r * p.w + e}"]`), 6);
      c = e + 1;
    }
  }
  await page.locator('.overlay .sheet').waitFor({ timeout: 5000 });
  assert.match(await page.locator('.nono').getAttribute('class'), /\bsolved\b/);
  assert.deepEqual((await state()).map((v) => (v === 1 ? 1 : 0)), p.solution);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('부등호 4×4: 터치로 풀 수 있고 부등호를 어기면 빨갛게 보인다 (세로 768×1024)', async () => {
  const { ctx, page, problems } = await ipad(SIZES[1]);
  await page.goto(`${srv.url}#/play/futoshiki/4/practice`);
  const play = page.locator('.screen.play');
  await play.waitFor();
  const p = makePuzzle('futoshiki', '4', await play.getAttribute('data-seed'));
  assert.equal(await page.locator('.futo-grid .sym').count(), p.ineqs.length);

  // 부등호를 일부러 어긴다: 작은 칸에 4, 큰 칸에 1
  const k = p.ineqs.findIndex(([lo, hi]) => !p.givens[lo] && !p.givens[hi]);
  if (k >= 0) {
    const [lo, hi] = p.ineqs[k];
    await page.tap(`.cell[data-i="${lo}"]`); await page.tap('.pad .num[data-v="4"]');
    await page.tap(`.cell[data-i="${hi}"]`); await page.tap('.pad .num[data-v="1"]');
    assert.match(await page.locator(`.sym[data-k="${k}"]`).getAttribute('class'), /\bbad\b/);
    await page.tap('[aria-label="되돌리기"]');
    await page.tap('[aria-label="되돌리기"]');
  }
  for (let i = 0; i < 16; i++) {
    if (p.givens[i]) continue;
    await page.tap(`.cell[data-i="${i}"]`);
    await page.tap(`.pad .num[data-v="${p.solution[i]}"]`);
  }
  await page.locator('.overlay .sheet').waitFor({ timeout: 5000 });
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('잠긴 단계는 주소로 바로 들어가도 열리지 않는다', async () => {
  const { ctx, page } = await ipad(SIZES[0]);
  await page.goto(`${srv.url}#/play/sudoku/9/daily`);
  await page.locator('.screen.select').waitFor();
  assert.match(await page.locator('.level[data-level="9"]').getAttribute('class'), /locked/);
  await ctx.close();
});
