// OmniResize Studio — Offline Service Worker (PWA)
const CACHE_NAME = 'omniresize-v4.1';

const STATIC_ASSETS = [
  './',
  'index.html',
  'resize-image-to-20kb.html',
  'resize-image-to-50kb.html',
  'resize-image-to-100kb.html',
  'bulk-image-resizer.html',
  'passport-photo-maker.html',
  'crop-image.html',
  'site.webmanifest',
  'assets/logo.png',
  'assets/logo.svg',
  'styles/main.css?v=4.0',
  'styles/components.css?v=4.0',
  'styles/editor.css?v=4.0',
  'styles/bulk.css?v=4.0',
  'styles/footer.css?v=4.0',
  'js/app.js?v=4.0',
  'js/engine.js?v=4.0',
  'js/batch.js?v=4.0',
  'js/cropper.js?v=4.0',
  'js/filters.js?v=4.0',
  'js/presets.js?v=4.0',
  'js/vendor/jszip.min.js?v=4.0',
  'js/vendor/heic2any.min.js'
];

// Install: Cache critical assets for offline usage and skip waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: Immediately purge all previous caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for same-origin assets so updates are immediate; fallback to cache when offline
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET requests
  if (req.method !== 'GET') return;

  // Same-origin local assets: Network-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(req);
      })
    );
    return;
  }

  // Cross-origin assets (fonts, icons, cdn): Cache with fallback
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response && response.status === 200 && (url.hostname.includes('fonts') || url.hostname.includes('cdnjs'))) {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, respClone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
