// 앱 파일 점검: 바깥 주소(CDN 등)를 쓰지 않고, 오프라인 캐시 목록에 빠진 파일이 없다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { appRoot } from '../helpers/server.js';

async function walk(dir) {
  const out = [];
  for (const e of await readdir(path.join(appRoot, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(rel));
    else out.push(rel.split(path.sep).join('/'));
  }
  return out;
}

const runtimeFiles = async () => ['index.html', 'manifest.json', 'sw.js', ...await walk('css'), ...await walk('js'), ...await walk('icons')];

test('앱 파일에 바깥 주소가 없다 (SVG 이름표 xmlns만 허용)', async () => {
  for (const f of await runtimeFiles()) {
    if (f.endsWith('.png')) continue;
    const text = await readFile(path.join(appRoot, f), 'utf8');
    const urls = (text.match(/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'`)]*/gi) || [])
      .filter((u) => !u.startsWith('http://www.w3.org/'));
    assert.deepEqual(urls, [], `${f}에 바깥 주소가 있어요`);
    assert.doesNotMatch(text, /@import|fonts\.googleapis|cdn\./i, f);
  }
});

test('서비스 워커가 앱 파일을 모두 캐시한다', async () => {
  const sw = await readFile(path.join(appRoot, 'sw.js'), 'utf8');
  const listed = new Set([...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]));
  for (const f of await runtimeFiles()) {
    if (f === 'sw.js') continue;
    assert.ok(listed.has(f), `sw.js의 ASSETS에 ${f}가 없어요`);
  }
  for (const f of listed) {
    if (f === '') continue;
    assert.ok((await runtimeFiles()).includes(f), `sw.js에 없는 파일 ${f}가 있어요`);
  }
});

test('manifest의 아이콘 파일이 있다', async () => {
  const m = JSON.parse(await readFile(path.join(appRoot, 'manifest.json'), 'utf8'));
  const files = await runtimeFiles();
  for (const icon of m.icons) assert.ok(files.includes(icon.src), icon.src);
  assert.equal(m.lang, 'ko');
});
