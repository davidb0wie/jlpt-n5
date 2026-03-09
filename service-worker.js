const CACHE_NAME = 'jlpt-n5-v6';
const BASE = '/jlpt-n5';
const urlsToCache = [
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
// Installation du service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retourner la réponse du cache
        if (response) {
          return response;
        }

        // Cloner la requête
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});
