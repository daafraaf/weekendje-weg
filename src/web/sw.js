// Service worker (RON-6): cachet alleen de app-schil, nooit gegevens van het script.
const VERSIE = 'schil-1';
const SCHIL = ['./', 'index.html', 'app.js', 'css/tokens.css', 'css/app.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIE).then((c) => c.addAll(SCHIL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((namen) => Promise.all(namen.filter((n) => n !== VERSIE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Eerst het netwerk, zodat een nieuwe versie direct verschijnt; offline komt de schil uit de cache.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const kopie = r.clone(); caches.open(VERSIE).then((c) => c.put(e.request, kopie)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
