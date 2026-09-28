/* Offer Torch PWA service worker — offline shell cache */
var CACHE = 'offer-torch-v1.0.0-complete';
var ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/storage.js',
  './js/ads.js',
  './js/wake.js',
  './js/torch.js',
  './js/screenlight.js',
  './js/strobe.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; }).map(function (k) {
          return caches.delete(k);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) {
          try { cache.put(req, copy); } catch (_) {}
        });
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return cached;
      });
    })
  );
});
