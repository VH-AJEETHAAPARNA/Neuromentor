const CACHE_NAME = "neuromentor-cache-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./logo192.png",
  "./logo512.png"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network First with Cache Fallback for general assets
self.addEventListener("fetch", (e) => {
  // Skip backend API calls or WebSocket/SSE calls
  if (
    e.request.url.includes("/api/") || 
    e.request.url.includes("/apps/") || 
    e.request.url.includes("/run_sse") ||
    e.request.url.includes("ws://") ||
    e.request.url.includes("wss://")
  ) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful requests
        if (res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
