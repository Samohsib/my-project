// 앱 파일 시험: 인터넷 없이 돌아가는지(바깥 주소를 부르지 않는지), 오프라인 캐시 목록이 빠짐없는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './helpers/server.mjs';

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const appFiles = () => [
  'index.html', 'manifest.json', 'sw.js', 'css/app.css',
  ...fs.readdirSync(path.join(ROOT, 'js')).map(f => `js/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'icons')).map(f => `icons/${f}`),
];

test('앱 파일 어디에도 바깥 인터넷 주소가 없다 (CDN·글꼴·분석 도구 없음)', () => {
  for (const f of appFiles()) {
    if (f.endsWith('.png')) continue;
    // SVG 이름표(xmlns)는 주소처럼 생겼지만 실제로 불러오지 않는다
    const text = read(f).replaceAll('http://www.w3.org/2000/svg', '');
    const urls = text.match(/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"')]*/gi) || [];
    assert.deepEqual(urls, [], `${f}: ${urls.join(', ')}`);
  }
});

test('오프라인 캐시(sw.js)에 앱 파일이 모두 들어 있고, 적힌 파일은 모두 있다', () => {
  const sw = read('sw.js');
  const list = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const need = appFiles().filter(f => f !== 'sw.js' && !f.endsWith('maskable.svg'));
  for (const f of need) assert.ok(list.includes(f), `sw.js 캐시 목록에 ${f} 이(가) 없어요`);
  for (const f of list) assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} 파일이 없어요`);
});

test('홈 화면 앱 정보(manifest)의 아이콘이 모두 있다', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.lang, 'ko');
  for (const icon of m.icons) assert.ok(fs.existsSync(path.join(ROOT, icon.src)), icon.src);
  const html = read('index.html');
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(ROOT, href)), `index.html이 부르는 ${href} 이(가) 없어요`);
  }
});

test('스크립트는 ES 모듈로 서로 불러오고, 부르는 파일이 모두 있다', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'js'))) {
    const src = read(`js/${f}`);
    for (const [, dep] of src.matchAll(/from '(\.\/[^']+)'/g)) {
      assert.ok(fs.existsSync(path.join(ROOT, 'js', dep)), `js/${f} → ${dep}`);
    }
  }
});
