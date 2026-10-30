// docs/ 폴더에 아이패드 크기 스크린샷 만들기
//   node tools/screenshots.mjs
import path from 'node:path';
import { chromium } from '../tests/helpers/playwright.mjs';
import { startServer, ROOT } from '../tests/helpers/server.mjs';
import { LEVELS } from '../js/levels.js';
import { parseProgram } from '../js/engine.js';

const OUT = path.join(ROOT, 'docs');
const LAND = [1024, 768];
const PORT = [768, 1024];

const srv = await startServer();
const browser = await chromium.launch();

function saveData({ upTo = '2-5', unlockAll = false, programs = {} } = {}) {
  const stars = {}, best = {};
  for (const l of LEVELS) {
    stars[l.id] = l.id === '1-7' || l.id === '2-3' ? 2 : 3;
    best[l.id] = l.best;
    if (l.id === upTo) break;
  }
  return {
    stars, best, programs, last: upTo,
    seen: { ch1: true, ch2: true, ch3: true, ch4: true, 'cond-open': true, 'cond-left': true, 'cond-right': true },
    settings: { voice: true, sfx: false, speed: 'normal', unlockAll },
  };
}

const solved = id => parseProgram(LEVELS.find(l => l.id === id).solution);

async function shot(name, [w, h], data, act) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto(srv.url);
  await page.evaluate(d => localStorage.setItem('coding-puzzle-v1', JSON.stringify(d)), data);
  await act(page);
  await page.screenshot({ path: path.join(OUT, name) });
  console.log('찍음:', name);
  await ctx.close();
}

const open = async (page, id) => {
  await page.goto(`${srv.url}#${id}`);
  await page.reload();
  await page.waitForSelector('#play.on');
  await page.waitForTimeout(300);
};
const steps = async (page, n) => {
  for (let i = 0; i < n; i++) { await page.tap('#stepBtn'); await page.waitForTimeout(520); }
};

// 1. 첫 화면 (가로)
await shot('01-판-고르기-가로.png', LAND, saveData(), async page => {
  await page.reload();
  await page.waitForTimeout(400);
});

// 2. 순서: 블록을 쌓고 한 단계씩 (가로)
await shot('02-순서-한단계-가로.png', LAND, saveData({ programs: { '1-5': solved('1-5') } }), async page => {
  await open(page, '1-5');
  await steps(page, 3);
});

// 3. 반복 안에 반복, 실행 중 (세로)
await shot('03-반복-실행중-세로.png', PORT, saveData({ upTo: '2-7', programs: { '2-8': solved('2-8') } }), async page => {
  await open(page, '2-8');
  await steps(page, 9);
});

// 4. 나만의 블록 (가로)
await shot('04-나만의블록-가로.png', LAND, saveData({ unlockAll: true, programs: { '3-5': solved('3-5') } }), async page => {
  await open(page, '3-5');
  await steps(page, 6);
});

// 5. 조건(만약) 블록, 로봇이 앞을 살펴보는 중 (세로)
await shot('05-조건-세로.png', PORT, saveData({ unlockAll: true, programs: { '4-3': solved('4-3') } }), async page => {
  await open(page, '4-3');
  await steps(page, 6);
  await page.tap('#stepBtn');
  await page.waitForTimeout(150);
});

// 6. 성공! (세로)
await shot('06-성공-세로.png', PORT, saveData({ programs: { '2-4': solved('2-4') } }), async page => {
  await open(page, '2-4');
  await page.tap('#runBtn');
  await page.waitForSelector('.sheet.win', { timeout: 20000 });
  await page.waitForTimeout(1200);
});

await browser.close();
await srv.close();
