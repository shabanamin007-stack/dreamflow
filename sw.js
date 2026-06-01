const CACHE_NAME = 'dreamflow-v1';
const urlsToCache = [
  '/dreamflow/',
  '/dreamflow/index.html',
  '/dreamflow/dreamlist.html',
  '/dreamflow/home.html',
  '/dreamflow/style.css',
  '/dreamflow/script.js',
  '/dreamflow/dreamlist.css',
  '/dreamflow/dreamlist.js',
  '/dreamflow/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
