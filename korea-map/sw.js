// 우리나라 지도 탐험 오프라인 저장 (홈 화면 앱용)
// 파일을 고쳐서 다시 올릴 때마다 아래 버전 숫자를 하나씩 올려 주세요 (v1 → v2 ...)
const CACHE = 'korea-map-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/art.js',
  './js/geo.js',
  './js/judge.js',
  './js/map.js',
  './js/quiz.js',
  './js/sound.js',
  './js/store.js',
  './data/regions.json',
  './data/cities.json',
  './data/places.json',
  './data/nature.json',
  './data/geo/sido.json',
  './data/geo/rivers.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
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
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('korea-map-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  // 페이지는 네트워크 먼저: 새 버전을 올리면 온라인일 때 바로 반영
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))),
    );
    return;
  }

  // 나머지(스크립트·자료·그림)는 저장본 먼저
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    })),
  );
});
