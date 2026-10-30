// icons/icon.svg를 홈 화면용 PNG로 바꾼다:  npm run icons
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgText = await readFile(path.join(root, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, file, { maskable = false } = {}) {
  await page.setViewportSize({ width: size, height: size });
  // maskable: 둥근 모서리 없이 꽉 채우고, 그림은 안쪽 80%에 둔다
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#6c5ce7;display:flex;align-items:center;justify-content:center">
         <div style="width:${size * 0.8}px;height:${size * 0.8}px">${svgText.replace('rx="104"', 'rx="0"')}</div></div>`
    : `<div style="width:${size}px;height:${size}px">${svgText}</div>`;
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}
    <style>svg{width:100%;height:100%;display:block}</style></body></html>`);
  await page.screenshot({ path: path.join(root, 'icons', file), omitBackground: !maskable });
  console.log('만듦:', file);
}

await render(180, 'icon-180.png');
await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-512-maskable.png', { maskable: true });
await browser.close();
