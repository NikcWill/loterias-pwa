const CACHE_NAME = "loterias-cache-v1";
const urlsToCache = [
  "/index.html",
  "/gerador.html",
  "/historico.html",
  "/graficos.html",
  "/conferencia.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalando o Service Worker e cacheando arquivos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Ativando o SW
self.addEventListener("activate", (event) => {
  console.log("Service Worker ativado");
});

// Interceptando requisições
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
