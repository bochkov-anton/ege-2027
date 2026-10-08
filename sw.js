/* PWA: кэширует только статические файлы приложения.
 * Личные данные не отправляются на сервер и не кэшируются service worker.
 * При смене версии меняйте CACHE_NAME. */
const CACHE_NAME="ege-2027-shell-v3-links-wellbeing";
const SCOPE=self.registration.scope;
const APP_SHELL=[
  "./","./index.html","./style.css","./ux.css","./android.css","./flow.css","./session.css","./wellbeing.css",
  "./data.js","./wellbeing.js","./logic.js","./resources.js","./experience.js","./app.js",
  "./android.js","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png"
];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith("ege-2027-shell-")&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(SCOPE).pathname))return;
  if(req.mode==="navigate"){
    event.respondWith(
      fetch(req).then(response=>{
        if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE_NAME).then(c=>c.put("./index.html",copy)));}
        return response;
      }).catch(()=>caches.match("./index.html").then(r=>r||Response.error()))
    );
    return;
  }
  event.respondWith(
    caches.match(req,{ignoreSearch:true})
      .then(cached=>cached||fetch(req))
  );
});
