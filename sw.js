const CACHE_NAME="alatipha-music-v3";

const ASSETS=[
"./",
"./index.html",
"./manifest.json",
"./icon-192.png",
"./icon-512.png",
"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
];

self.addEventListener(
"install",
e=>{
e.waitUntil(
caches.open(CACHE_NAME)
.then(cache=>cache.addAll(ASSETS))
);
}
);

/* ADD THIS NEW BLOCK */
self.addEventListener(
"activate",
event=>{
event.waitUntil(
self.clients.claim()
);
}
);

self.addEventListener(
"fetch",
e=>{

if(
e.request.url.includes(".mp3")
){

e.respondWith(
caches.open("songs")
.then(cache=>
fetch(e.request)
.then(response=>{
cache.put(
e.request,
response.clone()
);
return response;
})
.catch(()=>
cache.match(e.request)
)
)
);

return;
}

e.respondWith(
caches.match(e.request)
.then(r=>r || fetch(e.request))
);

});
