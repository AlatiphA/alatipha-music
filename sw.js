const CACHE_NAME = "alatipha-music-v2";
const SONG_CACHE = "alatipha-songs-v1";

/* APP SHELL */
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
];

/* INSTALL */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

/* ACTIVATE + CLEAN OLD CACHE + FORCE RELOAD */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {

      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== SONG_CACHE) {
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();

      /* FORCE ALL OPEN TABS TO RELOAD */
      const clientsList = await self.clients.matchAll();
      clientsList.forEach(client => {
        client.postMessage({ type: "RELOAD" });
      });

    })()
  );
});

/* FETCH HANDLING */
self.addEventListener("fetch", (event) => {

  const request = event.request;

  /* 1. MP3 FILES (🔥 FIXED: CACHE FIRST) */
  if (request.url.includes(".mp3")) {
    event.respondWith(cacheAudioFirst(request));
    return;
  }

  /* 2. HTML (NETWORK FIRST) */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  /* 3. OTHER ASSETS (STALE-WHILE-REVALIDATE) */
  event.respondWith(
    caches.match(request).then((cached) => {

      const fetchPromise = fetch(request)
        .then((networkResponse) => {

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
          });

          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

/* 🔥 AUDIO CACHE FUNCTION (NEW CORE FIX) */
async function cacheAudioFirst(request) {

  const cache = await caches.open(SONG_CACHE);

  /* RETURN CACHED VERSION INSTANTLY */
  const cached = await cache.match(request);
  if (cached) return cached;

  try {

    const response = await fetch(request);

    /* STORE FOR OFFLINE */
    cache.put(request, response.clone());

    return response;

  } catch (err) {

    return new Response("Audio not available offline", {
      status: 404
    });

  }
}

/* OPTIONAL: MANUAL SKIP WAITING */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
