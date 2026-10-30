// icons/icon.svg → PNG 아이콘들 (홈 화면 추가용). 실행: npm run icons
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, ROOT } from '../tests/e2e/helpers.mjs';

const jobs = [
  ['icon.svg', 'icon-180.png', 180],
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['icon-maskable.svg', 'icon-512-maskable.png', 512],
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = await readFile(path.join(ROOT, 'icons', src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}">`);
  await page.screenshot({ path: path.join(ROOT, 'icons', out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('만듦', out);
}
await browser.close();
