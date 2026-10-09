/* Offline app shell. One immutable cache per release; no personal data leaves localStorage.
 * A successful install activates automatically and requests a client reload. */
const CACHE_NAME="ege-2027-shell-5c3ca0d789cc";
const SCOPE=self.registration.scope;
const APP_SHELL=[
  "./","./index.html","./style.css","./ux.css","./android.css","./tablet-ui.css","./flow.css","./session.css","./wellbeing.css","./lessons.css","./textbooks.css",
  "./data.js","./wellbeing.js","./logic.js","./curriculum.js","./fipi-map.js","./resources.js","./topic-practice.js","./lesson-content.js","./theory-core.js","./fipi-supplements.js","./resource-integrity.js","./textbooks.js","./verified-tocs.js","./page-assignments.js","./reading-guide.js","./topic-coverage.js","./coverage-candidates.js","./study-source-routes.js","./experience.js","./app.js",
  "./android.js","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png"
];
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    // Bypass the local browser HTTP cache; old PWA files have the same public URLs.
    // The new worker activates only after the entire app shell downloads successfully.
    await cache.addAll(APP_SHELL.map(path=>new Request(new URL(path,SCOPE),{cache:"reload"})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("ege-2027-shell-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type==="EGE_VERSION")event.ports?.[0]?.postMessage({version:CACHE_NAME.slice("ege-2027-shell-".length)});
  if(event.data?.type==="EGE_APPLY_UPDATE")event.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url),scope=new URL(SCOPE);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(req.mode==="navigate"){
    event.respondWith((async()=>{
      try{
        const response=await fetch(req);
        if(response.ok){
          const cache=await caches.open(CACHE_NAME);
          event.waitUntil(cache.put("./index.html",response.clone()));
        }
        return response;
      }catch{
        const cache=await caches.open(CACHE_NAME);
        return await cache.match("./index.html")||Response.error();
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    // Never serve arbitrary files from an older ege-2027-shell cache.
    const cache=await caches.open(CACHE_NAME);
    return await cache.match(req,{ignoreSearch:true})||fetch(req);
  })());
});
