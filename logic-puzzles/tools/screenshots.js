// 아이패드 크기 스크린샷을 docs/에 찍는다:  npm run screenshots
// 날짜를 2026-10-30으로 고정하고, 풀던 판 상태를 저장소에 넣어 둔 뒤 화면을 찍는다.
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { startServer, appRoot } from '../tests/helpers/server.js';
import { makePuzzle, dailySeed, practiceSeed } from '../js/core/catalog.js';
import { addDays } from '../js/core/dates.js';
import { makeRng } from '../js/core/rng.js';

const OUT = path.resolve(process.argv[2] || path.join(appRoot, 'docs'));
const DAY = '2026-10-30';
const LAND = { width: 1024, height: 768 };
const PORT = { width: 768, height: 1024 };

await mkdir(OUT, { recursive: true });

// 기록: 사흘 연속, 단계 몇 개 열림
const rec = {
  solved: { 'sudoku:4': 6, 'sudoku:6': 3, 'sudoku:9': 1, 'nonogram:5': 4, 'nonogram:7': 2, 'nonogram:10': 1, 'futoshiki:4': 3, 'futoshiki:5': 1 },
  best: { 'sudoku:4': 38, 'sudoku:6': 121, 'sudoku:9': 734, 'nonogram:5': 52, 'nonogram:7': 133, 'nonogram:10': 402, 'futoshiki:4': 74, 'futoshiki:5': 260 },
  daily: {
    [addDays(DAY, -6)]: { 'sudoku:4': { s: 51, h: 0 } },
    [addDays(DAY, -5)]: { 'nonogram:5': { s: 70, h: 1 } },
    [addDays(DAY, -3)]: { 'futoshiki:4': { s: 90, h: 0 } },
    [addDays(DAY, -2)]: { 'sudoku:6': { s: 140, h: 0 } },
    [addDays(DAY, -1)]: { 'nonogram:7': { s: 133, h: 0 } },
    [DAY]: { 'sudoku:4': { s: 38, h: 0 } },
  },
  bestStreak: 3,
};

// 판의 일부를 채운 저장 상태 만들기
function partial(type, levelId, seed, fraction, { memo = 0, wrongX = false } = {}) {
  const p = makePuzzle(type, levelId, seed);
  const rng = makeRng(`shot|${seed}`);
  const N = p.solution.length;
  const v = type === 'nonogram' ? new Array(N).fill(0) : p.givens.slice();
  const m = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    if (type === 'nonogram') {
      if (rng.next() < fraction) v[i] = p.solution[i] ? 1 : (wrongX ? 2 : 0);
    } else if (!p.givens[i] && rng.next() < fraction) v[i] = p.solution[i];
  }
  // 빈칸 몇 개에 메모
  let left = memo;
  for (let i = 0; i < N && left > 0; i++) {
    if (type !== 'nonogram' && !v[i] && rng.next() < 0.5) {
      const other = (p.solution[i] % p.n) + 1;
      m[i] = (1 << (p.solution[i] - 1)) | (1 << (other - 1));
      left--;
    }
  }
  return { seed, v, m, hist: [{ s: [] }], t: 0, hints: 0, solved: false };
}

const saves = {
  [`d|${DAY}|sudoku|4`]: { ...partial('sudoku', '4', dailySeed(DAY, 'sudoku', '4'), 1), solved: true, t: 38 },
  [`d|${DAY}|sudoku|9`]: { ...partial('sudoku', '9', dailySeed(DAY, 'sudoku', '9'), 0.45, { memo: 4 }), t: 312 },
  [`p|sudoku|6`]: { ...partial('sudoku', '6', practiceSeed('sudoku', '6', 3), 0.3, { memo: 3 }), t: 84 },
  [`d|${DAY}|nonogram|10`]: { ...partial('nonogram', '10', dailySeed(DAY, 'nonogram', '10'), 0.55, { wrongX: true }), t: 205 },
  [`d|${DAY}|futoshiki|5`]: { ...partial('futoshiki', '5', dailySeed(DAY, 'futoshiki', '5'), 0.35, { memo: 2 }), t: 141 },
  [`p|nonogram|7`]: { ...partial('nonogram', '7', practiceSeed('nonogram', '7', 2), 0, {}), t: 97 },
};
const store = {
  settings: { voice: true, sfx: true }, rec, saves,
  practiceNo: { 'sudoku:6': 4, 'nonogram:7': 3 },
  lastLevel: { sudoku: '9', nonogram: '10', futoshiki: '5' },
};

const srv = await startServer();
const browser = await chromium.launch();

async function shot(name, size, hash, act) {
  const ctx = await browser.newContext({ viewport: size, hasTouch: true, isMobile: true, deviceScaleFactor: 2, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await ctx.clock.setFixedTime(new Date(`${DAY}T16:20:00+09:00`));
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('logic-puzzles:v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
  const page = await ctx.newPage();
  await page.goto(`${srv.url}${hash}`);
  await page.waitForTimeout(400);
  if (act) await act(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('찍음:', name);
  await ctx.close();
}

await shot('01-home-landscape.png', LAND, '#/');
await shot('02-home-portrait.png', PORT, '#/');
await shot('03-sudoku-select-portrait.png', PORT, '#/p/sudoku');
await shot('04-sudoku-9x9-landscape.png', LAND, '#/play/sudoku/9/daily', async (page) => {
  const empty = await page.$$eval('.ngrid .cell', (els) => els.filter((e) => !e.querySelector('.val').textContent && !e.querySelector('.memo').textContent.trim()).map((e) => e.dataset.i));
  await page.tap(`.cell[data-i="${empty[3]}"]`);
  await page.tap('[aria-label="힌트"]');
});
await shot('05-sudoku-6x6-portrait.png', PORT, '#/play/sudoku/6/practice', async (page) => {
  await page.tap('[aria-label="메모"]');
});
await shot('06-nonogram-10x10-landscape.png', LAND, '#/play/nonogram/10/daily', async (page) => {
  await page.tap('[aria-label="힌트"]');
});
await shot('07-futoshiki-5x5-portrait.png', PORT, '#/play/futoshiki/5/daily', async (page) => {
  const empty = await page.$$eval('.futo-grid .cell', (els) => els.filter((e) => !e.querySelector('.val').textContent).map((e) => e.dataset.i));
  await page.tap(`.cell[data-i="${empty[1]}"]`);
});
await shot('08-nonogram-solved-landscape.png', LAND, '#/play/nonogram/7/practice', async (page) => {
  const p = makePuzzle('nonogram', '7', practiceSeed('nonogram', '7', 2));
  for (let i = 0; i < p.solution.length; i++) if (p.solution[i]) await page.tap(`.nc[data-i="${i}"]`);
  await page.locator('.overlay .sheet').waitFor();
  await page.waitForTimeout(600);
});
await shot('09-records-portrait.png', PORT, '#/records');
await shot('10-rules-futoshiki-landscape.png', LAND, '#/p/futoshiki', async (page) => {
  await page.tap('text=규칙 보기');
});

await browser.close();
await srv.close();
