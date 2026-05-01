const CACHE_NAME = 'jlpt-n5-v7';
const BASE = '/jlpt-n5';
const CORE_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/styles.css',
  BASE + '/app.js',
  BASE + '/manifest.json',
  BASE + '/japon.jpg',
  BASE + '/Kyoto.jpg',
  BASE + '/data/kanji.json',
  BASE + '/data/counters.json',
  BASE + '/data/verbs.json',
  BASE + '/data/verbs-plus.json',
  BASE + '/data/adverbs.json',
  BASE + '/data/particles.json',
  BASE + '/data/sentences.json',
  BASE + '/data/adjectives.json',
  BASE + '/data/grammar.json',
  BASE + '/data/vocabulary.json',
  BASE + '/data/kana.json',
  BASE + '/data/reading.json'
];

// Installation : cache chaque fichier indépendamment (un échec ne bloque pas les autres)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const promises = CORE_ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('Cache miss:', url, err))
      );
      return Promise.all(promises);
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyage anciens caches + prise de contrôle immédiate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch : cache en priorité, réseau en fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request.clone()).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => {
        // Hors ligne et pas en cache : retourner index.html pour la navigation
        if (event.request.mode === 'navigate') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});
