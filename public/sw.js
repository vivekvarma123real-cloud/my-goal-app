const CACHE_NAME = "lifestack-v1";
const ASSETS_TO_CACHE = [
  "/choose",
  "/favicon.ico",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Service Worker and cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching app shell...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch events: Network-first with offline fallback for pages/API, Cache-first for static files
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests or external/supabase/chrome extension requests
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Cache-first strategy for static resources (CSS, JS, Fonts, Images)
  const isStaticAsset = 
    requestUrl.pathname.startsWith("/_next/static/") ||
    requestUrl.pathname.startsWith("/icons/") ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".css") ||
    requestUrl.pathname.endsWith(".png") ||
    requestUrl.pathname.endsWith(".jpg") ||
    requestUrl.pathname.endsWith(".ico") ||
    requestUrl.pathname.endsWith(".woff2");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      }).catch(() => fetch(event.request))
    );
  } else {
    // Network-first strategy for dynamic pages and other documents
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Offline fallback for navigation requests
            if (event.request.mode === "navigate") {
              return caches.match("/choose");
            }
            return new Response("Offline mode. Some data may not be available.", {
              status: 503,
              statusText: "Service Unavailable",
              headers: new Headers({ "Content-Type": "text/plain" })
            });
          });
        })
    );
  }
});
