// icons/icon.svg → 홈 화면용 PNG 아이콘 만들기 (Playwright로 그려서 저장)
//   node tools/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../tests/helpers/playwright.mjs';
import { ROOT } from '../tests/helpers/server.mjs';

const jobs = [
  ['icon-maskable.svg', 'icon-180.png', 180],
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-512-maskable.png', 512],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = fs.readFileSync(path.join(ROOT, 'icons', src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="width:${size}px;height:${size}px;display:block" `)}</body></html>`);
  await page.screenshot({ path: path.join(ROOT, 'icons', out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('만듦:', out);
}
await browser.close();
