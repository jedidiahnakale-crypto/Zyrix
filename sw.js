/* Zyrix helper file (service worker). Keeps a copy of the app on the phone so it opens without internet.
   Online: always tries the newest version first. Offline: uses the saved copy. Login and other online
   services (Supabase, voice) are never saved or touched. Change CACHE to force an update for everyone. */
var CACHE = 'zyrix-v2';
var FILES = ['./', 'index.html', 'privacy.html', 'terms.html', 'faq.html', '404.html', 'manifest.json', 'logo-small.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async function () {
    var cache = await caches.open(CACHE);
    var net = fetch(req).then(function (r) { if (r && r.ok) cache.put(req, r.clone()); return r; });
    var wait = new Promise(function (res) { setTimeout(function () { res(null); }, 3500); });
    try {
      var first = await Promise.race([net, wait]);
      if (first) return first;
    } catch (err) {}
    var saved = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') || await cache.match('./') : null);
    if (saved) return saved;
    try { return await net; } catch (err2) { return new Response('You are offline and this page was not saved yet. Connect to the internet once, then it will work offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } }); }
  })());
});
