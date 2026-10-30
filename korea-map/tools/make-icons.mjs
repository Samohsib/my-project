// 앱 아이콘 만들기: 지도 모양 + 탐험가 달수를 SVG 로 그린 뒤 Playwright(Chromium)로 PNG 를 찍는다.
//   npm run build:icons
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { project, VIEW } from '../js/geo.js';
import { otterSVG } from '../js/art.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sido = JSON.parse(await fs.readFile(path.join(ROOT, 'data/geo/sido.json'), 'utf8'));

// 본토와 제주만 (먼 섬은 아이콘에서 생략)
const d = sido.features
  .flatMap((f) => f.geometry.coordinates)
  .filter((poly) => poly[0].length > 60)
  .map((poly) => 'M' + poly[0].map((p) => project(p).map((v) => v.toFixed(0)).join(',')).join('L') + 'Z')
  .join('');

function iconSvg(maskable) {
  // maskable 은 가장자리가 잘려도 되도록 그림을 안쪽(80%)에 모은다
  const s = maskable ? 0.78 : 0.92;
  const off = (512 * (1 - s)) / 2;
  const otter = otterSVG('happy').replace('<svg class="otter "', '<svg x="250" y="215" width="250" height="281"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa6c8"/><stop offset="1" stop-color="#1f6f8b"/></linearGradient></defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 100}" fill="url(#bg)"/>
  <g transform="translate(${off} ${off}) scale(${s})">
    <g transform="translate(20 30) scale(${(400 / VIEW.height).toFixed(4)})">
      <path d="${d}" fill="#c7f0bd" stroke="#2b8a3e" stroke-width="6" stroke-linejoin="round"/>
    </g>
    ${otter}
  </g>
</svg>`;
}

await fs.mkdir(path.join(ROOT, 'icons'), { recursive: true });
await fs.writeFile(path.join(ROOT, 'icons/icon.svg'), iconSvg(false));
await fs.writeFile(path.join(ROOT, 'icons/icon-maskable.svg'), iconSvg(true));

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, maskable] of [
  ['icon-180.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-512-maskable.png', 512, true],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${iconSvg(maskable).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: path.join(ROOT, 'icons', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('아이콘', file);
}
await browser.close();
