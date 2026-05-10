const CACHE_NAME = "alatipha-music-v7";
const SONG_CACHE = "alatipha-songs-v1";

/* APP SHELL */
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./css/all.min.css"
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

/* ACTIVATE */
self.addEventListener("activate", (event) => {

  event.waitUntil(
    (async () => {

      const keys = await caches.keys();

      await Promise.all(
        keys.map((key) => {

          if (
            key !== CACHE_NAME &&
            key !== SONG_CACHE
          ) {
            return caches.delete(key);
          }
        })
      );

      await self.clients.claim();

      // Reload all tabs
      const clientsList =
        await self.clients.matchAll();

      clientsList.forEach((client) => {
        client.postMessage({
          type: "RELOAD"
        });
      });

    })()
  );
});

/* FETCH HANDLING */
self.addEventListener("fetch", (event) => {

  const request = event.request;

  /* 1. AUDIO STREAMS ONLY */
  if (
    request.destination === "audio" &&
    request.method === "GET"
  ) {

    event.respondWith(
      cacheAudioFirst(request)
    );

    return;
  }

  /* 2. FONTS */
  if (request.destination === "font") {

    event.respondWith(

      caches.match(request).then((cached) => {

        return (
          cached ||

          fetch(request).then((response) => {

            return caches.open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  response.clone()
                );

                return response;
              });
          })
        );
      })
    );

    return;
  }

  /* 3. HTML NAVIGATION */
  if (request.mode === "navigate") {

    event.respondWith(

      fetch(request, {
        cache: "no-store"
      })

      .then((response) => {

        return caches.open(CACHE_NAME)
          .then((cache) => {

            cache.put(
              request,
              response.clone()
            );

            return response;
          });
      })

      .catch(() => {
        return caches.match("./index.html");
      })
    );

    return;
  }

  /* 4. OTHER ASSETS */
  event.respondWith(

    caches.match(request).then((cached) => {

      const fetchPromise = fetch(request)

        .then((networkResponse) => {

          // cache only valid same-origin files
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {

            caches.open(CACHE_NAME)
              .then((cache) => {

                cache.put(
                  request,
                  networkResponse.clone()
                );
              });
          }

          return networkResponse;
        })

        .catch(() => {
          return cached;
        });

      return cached || fetchPromise;
    })
  );

}); // IMPORTANT: closes fetch listener

/* AUDIO CACHE */
async function cacheAudioFirst(request) {

  const cache =
    await caches.open(SONG_CACHE);

  const cached =
    await cache.match(request);

  if (cached) {
    return cached;
  }

  try {

    const response =
      await fetch(request);

    // only cache successful audio
    if (
      response &&
      response.status === 200
    ) {

      await cache.put(
        request,
        response.clone()
      );
    }

    return response;

  } catch (err) {

    return new Response(
      "Audio not available offline",
      {
        status: 404
      }
    );
  }
}

/* MANUAL UPDATE CONTROL */
self.addEventListener("message", (event) => {

  if (
    event.data &&
    event.data.type === "SKIP_WAITING"
  ) {

    self.skipWaiting();
  }
});
