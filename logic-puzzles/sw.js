// 논리 퍼즐 모음 오프라인 캐시 (홈 화면 앱용)
// 앱 파일을 고쳐서 다시 올릴 때는 VERSION 숫자를 하나 올린다 (1 → 2 ...). 그래야 새 파일을 다시 받는다.
// 같은 주소에서 도는 다른 앱의 캐시는 건드리지 않도록 'logic-puzzles-'로 시작하는 캐시만 정리한다.
const VERSION = 1;
const PREFIX = 'logic-puzzles-';
const CACHE = `${PREFIX}v${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './js/app/art.js',
  './js/app/dom.js',
  './js/app/fx.js',
  './js/app/game.js',
  './js/app/main.js',
  './js/app/nonogram-board.js',
  './js/app/number-board.js',
  './js/app/rules.js',
  './js/app/sound.js',
  './js/app/store.js',
  './js/app/voice.js',
  './js/core/catalog.js',
  './js/core/dates.js',
  './js/core/futoshiki.js',
  './js/core/nonogram.js',
  './js/core/records.js',
  './js/core/rng.js',
  './js/core/sudoku.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // 페이지는 네트워크 먼저: 새 버전을 올리면 켜져 있는 동안 바로 반영된다
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  // 나머지(스크립트·그림·스타일)는 캐시 먼저
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })),
  );
});
