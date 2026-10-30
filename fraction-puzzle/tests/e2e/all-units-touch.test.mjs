// 모든 단원의 첫 판과 마지막 판을 손가락(터치)으로 끝까지 풀어 보는 시험.
// 문제는 화면에 나온 것을 그대로 읽고(window.fractionPuzzle), 칠하기·지우기·숫자 누르기·깃발/카드 끌기로 푼다.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, startServer, ipadContext, IPAD, finger, settle, range, mark, type } from './helpers.mjs';
import { UNITS } from '../../js/problems.js';
import { solve, givenCells } from '../../js/judge.js';

let srv, browser;
before(async () => { srv = await startServer(); browser = await chromium.launch(); });
after(async () => { await browser?.close(); srv?.stop(); });

async function solveOne(page, f) {
  await settle(page);
  const p = await page.evaluate(() => window.fractionPuzzle.problem());
  const s = solve(p);
  const check = page.locator('#side [data-act=check]');
  if (p.kind === 'make') {
    if (p.model === 'pizza' && p.cells === null) for (let k = 1; k < s.cuts; k++) await f.tapEl(page.locator('[data-act=more]'));
    await mark(page, f, 'main', p.model, s.cuts, range(0, s.painted));
    assert.equal(Number(await page.locator('[data-count]').textContent()), s.painted);
    if (p.write) await type(page, f, s.answer);
    await f.tapEl(check);
  } else if (p.kind === 'compare') {
    await mark(page, f, 'a', p.model, p.cellsA, range(0, s.paintA));
    await mark(page, f, 'b', p.model, p.cellsB, range(0, s.paintB));
    await f.tapEl(page.locator(`.sign[data-sign="${s.sign}"]`));
  } else if (p.kind === 'op') {
    const g = givenCells(p);
    await mark(page, f, 'main', p.model, p.cells, p.op === '+' ? range(g, g + s.marked) : range(g - s.marked, g));
    assert.equal(Number(await page.locator('[data-count]').textContent()), s.marked);
    await type(page, f, s.answer);
    await f.tapEl(check);
  } else if (p.kind === 'line-place') {
    const box = await page.locator('.nl-track').boundingBox();
    const y = box.y + box.height / 2;
    const x = (k) => box.x + (box.width * k) / p.line.count;
    await f.drag([[x(0), y], [x(s.tick), y]], 12);
    assert.equal(Number(await page.locator('.nl-flag').getAttribute('data-tick')), s.tick);
    await f.tapEl(check);
  } else {
    for (const [id, pt] of Object.entries(s.place)) {
      const card = await page.locator(`.card[data-card="${id}"]`).boundingBox();
      const dot = await page.locator(`.nl-point[data-point="${pt}"] .dot`).boundingBox();
      await f.drag([[card.x + card.width / 2, card.y + card.height / 2], [dot.x + dot.width / 2, dot.y + dot.height / 2]], 10);
    }
    assert.equal(await page.locator('.nl-tray .card').count(), 0, '카드를 모두 놓음');
    await f.tapEl(check);
  }
  return p;
}

for (const [name, size] of Object.entries(IPAD)) {
  test(`${name}: 8단원의 1판과 마지막 판을 손가락으로 모두 맞히기`, async () => {
    const ctx = await ipadContext(browser, size);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const f = await finger(page);
    await page.goto(srv.url);
    await page.evaluate((ids) => {
      const stars = Object.fromEntries(ids.map((id) => [id, Array(12).fill(1)]));
      localStorage.setItem('fraction-puzzle:v1', JSON.stringify({ stars, settings: { voice: false, sound: false } }));
    }, UNITS.map((u) => u.id));
    let solved = 0;
    for (const u of UNITS) {
      for (const level of [1, u.levels.length]) {
        await page.goto(srv.url);
        await f.tapEl(page.locator(`[data-unit=${u.id}]`));
        await f.tapEl(page.locator(`[data-level="${level}"]`));
        for (let q = 0; q < 3; q++) {
          const p = await solveOne(page, f);
          await page.locator('#sheet[data-result=ok]').waitFor({ timeout: 3000 }).catch(async () => {
            const why = await page.locator('#sheet').evaluate((e) => `${e.dataset.result || '알림판 없음'} ${e.innerText}`);
            throw new Error(`${u.title} ${level}판 ${q + 1}번 틀림: ${JSON.stringify(p)} → ${why}`);
          });
          await f.tapEl(page.locator('#sheet [data-act=next]'));
          solved++;
        }
        await page.locator('#sheet[data-result=stage-done]').waitFor();
        assert.equal(await page.locator('.big-stars').getAttribute('data-stars'), '3', `${u.title} ${level}판`);
      }
    }
    assert.equal(solved, UNITS.length * 2 * 3);
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

test('도전 모드: 틀리면 하트가 줄고, 하트 3개를 다 쓰면 끝난다', async () => {
  const ctx = await ipadContext(browser, IPAD.landscape);
  const page = await ctx.newPage();
  const f = await finger(page);
  await page.goto(srv.url);
  await f.tapEl(page.locator('[data-unit=challenge]'));
  for (let k = 0; k < 3; k++) {
    assert.equal(await page.locator('#dots .heart.on').count(), 3 - k);
    const p = await page.evaluate(() => window.fractionPuzzle.problem());
    // 아무것도 안 하고 내기 (비교 문제는 기호가 잠겨 있으니 한 문제를 맞히고 넘어간다)
    if (p.kind === 'compare' || p.kind === 'line-cards') {
      await solveOne(page, f);
      await page.locator('#sheet[data-result=ok]').waitFor();
      await f.tapEl(page.locator('#sheet [data-act=next]'));
      k--;
      continue;
    }
    await f.tapEl(page.locator('#side [data-act=check]'));
    await page.locator('#sheet[data-result=wrong]').waitFor();
    await f.tapEl(page.locator('#sheet [data-act=next]'));
  }
  await page.locator('#sheet[data-result=challenge-done]').waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-puzzle:v1')));
  assert.equal(saved.challengePlays, 1);
  await ctx.close();
});
