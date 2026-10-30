// docs/ 에 아이패드 크기 스크린샷 만들기. 실행: npm run screenshots
// 문제는 씨앗(seed)을 골라 늘 같은 화면이 나오게 한다.
import path from 'node:path';
import { chromium, startServer, ipadContext, IPAD, finger, settle, range, mark, type, ROOT } from '../tests/e2e/helpers.mjs';
import { makeStage, UNITS } from '../js/problems.js';
import { givenCells, needCells } from '../js/judge.js';
import { text } from '../js/num.js';

const OUT = path.join(ROOT, 'docs');

function seedFor(unit, level, ok) {
  for (let s = 1; s < 100000; s++) if (ok(makeStage(unit, level, s)[0])) return s;
  throw new Error(`씨앗 못 찾음 ${unit} ${level}`);
}

const srv = await startServer();
const browser = await chromium.launch();

async function open(size) {
  const ctx = await ipadContext(browser, size);
  const page = await ctx.newPage();
  await page.goto(srv.url);
  await page.evaluate((ids) => {
    const stars = Object.fromEntries(ids.map((id) => [id, [3, 3, 2, 3, 1, 3, 2, 3, 3, 1]]));
    stars.pizza = [3, 3, 3, 2, 3, 3];
    localStorage.setItem('fraction-puzzle:v1', JSON.stringify({ stars, challengeBest: 7, settings: { voice: true, sound: false } }));
  }, UNITS.map((u) => u.id));
  await page.reload();
  return { ctx, page, f: await finger(page) };
}

async function startAt(page, f, unit, level, seed) {
  await f.tapEl(page.locator(`[data-unit=${unit}]`));
  await page.evaluate((s) => { Date.now = () => s; }, seed);
  await f.tapEl(page.locator(`[data-level="${level + 1}"]`));
  await settle(page);
}

const shot = async (page, name) => {
  await settle(page);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('찍음', name);
};

// 1. 첫 화면 (가로)
{
  const { ctx, page } = await open(IPAD.landscape);
  await shot(page, '01-home-landscape.png');
  await ctx.close();
}

// 2. 피자 나누고 칠하는 중 (가로): 3/4
{
  const seed = seedFor('pizza', 2, (p) => text(p.target) === '3/4');
  const { ctx, page, f } = await open(IPAD.landscape);
  await startAt(page, f, 'pizza', 2, seed);
  for (let k = 0; k < 3; k++) await f.tapEl(page.locator('[data-act=more]'));
  await mark(page, f, 'main', 'pizza', 4, [0, 1]);
  await shot(page, '02-pizza-landscape.png');
  await ctx.close();
}

// 3. 틀렸을 때 그림 설명 (세로): 6/8을 4조각으로 나눠 3조각 칠함 → 크기는 같지만 분모가 달라요
{
  const seed = seedFor('pizza', 4, (p) => text(p.target) === '6/8');
  const { ctx, page, f } = await open(IPAD.portrait);
  await startAt(page, f, 'pizza', 4, seed);
  for (let k = 0; k < 3; k++) await f.tapEl(page.locator('[data-act=more]'));
  await mark(page, f, 'main', 'pizza', 4, [0, 1, 2]);
  await f.tapEl(page.locator('[data-act=check]'));
  await page.locator('#sheet[data-result=wrong]').waitFor();
  await shot(page, '03-explain-portrait.png');
  await ctx.close();
}

// 4. 분수 덧셈 (세로): 받아올림 있는 대분수 덧셈, 칠하고 답 쓰는 중
{
  const seed = seedFor('faddsub', 6, (p) => p.a.d === 5 && p.units === 4);
  const { ctx, page, f } = await open(IPAD.portrait);
  await startAt(page, f, 'faddsub', 6, seed);
  const p = await page.evaluate(() => window.fractionPuzzle.problem());
  const g = givenCells(p);
  await mark(page, f, 'main', 'bar', p.cells, range(g, g + needCells(p)));
  await type(page, f, { w: 3, n: null, d: null });
  await f.tapEl(page.locator('#side [data-box=n]'));
  await shot(page, '04-fraction-add-portrait.png');
  await ctx.close();
}

// 5. 소수 크기 비교 (가로): 0.5와 0.48 같은 함정
{
  const seed = seedFor('dcompare', 3, (p) => p.a.p === 1 && p.a.i === 5);
  const { ctx, page, f } = await open(IPAD.landscape);
  await startAt(page, f, 'dcompare', 3, seed);
  const p = await page.evaluate(() => window.fractionPuzzle.problem());
  const [na, nb] = needCells(p);
  await mark(page, f, 'a', 'grid100', 100, range(0, na));
  await mark(page, f, 'b', 'grid100', 100, range(0, nb));
  await shot(page, '05-decimal-compare-landscape.png');
  await ctx.close();
}

// 6. 수직선 카드 (세로): 카드 몇 장을 놓은 모습
{
  const seed = seedFor('line', 5, (p) => p.points.some((k) => k > 10) && p.points.some((k) => k < 10));
  const { ctx, page, f } = await open(IPAD.portrait);
  await startAt(page, f, 'line', 5, seed);
  const p = await page.evaluate(() => window.fractionPuzzle.problem());
  const { solve } = await import('../js/judge.js');
  const place = Object.entries(solve(p).place).slice(0, 3);
  for (const [id, pt] of place) {
    const card = await page.locator(`.card[data-card="${id}"]`).boundingBox();
    const dot = await page.locator(`.nl-point[data-point="${pt}"] .dot`).boundingBox();
    await f.drag([[card.x + card.width / 2, card.y + card.height / 2], [dot.x + dot.width / 2, dot.y + dot.height / 2]], 10);
  }
  await shot(page, '06-number-line-portrait.png');
  await ctx.close();
}

// 7. 소수 뺄셈 설명 (가로): 세로셈과 모눈
{
  const seed = seedFor('daddsub', 8, (p) => p.op === '-');
  const { ctx, page, f } = await open(IPAD.landscape);
  await startAt(page, f, 'daddsub', 8, seed);
  const p = await page.evaluate(() => window.fractionPuzzle.problem());
  const g = givenCells(p);
  await mark(page, f, 'main', 'grid100', 100, range(g - needCells(p), g));
  await type(page, f, '1.35');
  await f.tapEl(page.locator('[data-act=check]'));
  await page.locator('#sheet[data-result=wrong]').waitFor();
  await shot(page, '07-decimal-explain-landscape.png');
  await ctx.close();
}

// 8. 판 고르기 (세로)
{
  const { ctx, page, f } = await open(IPAD.portrait);
  await f.tapEl(page.locator('[data-unit=pizza]'));
  await shot(page, '08-levels-portrait.png');
  await ctx.close();
}

await browser.close();
srv.stop();
