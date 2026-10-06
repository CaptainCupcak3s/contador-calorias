const CACHE_NAME = 'macro-control-v3'; // El cambio de nombre fuerza la actualización
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// INSTALACIÓN: Guarda los archivos base en la memoria del teléfono
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN: Borra cualquier versión vieja de la app (v1 o v2)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH: Intercepta peticiones para funcionar sin internet
self.addEventListener('fetch', (event) => {
  // EXCEPCIÓN CRÍTICA: No cachear la API de alimentos, siempre buscar en internet
  if (event.request.url.includes('openfoodfacts.org')) {
    return;
  }

  // Para el resto de archivos (HTML, CSS, JS), usa la caché si existe
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
