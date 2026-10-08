import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const swSource=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const androidSource=readFileSync(new URL("../android.js",import.meta.url),"utf8");
function workerHarness({failInstall=false}={}){
 const scope="https://example.org/ege-2027/",events={},records={skip:0,claim:0,requests:[],deleted:[]},byCache=new Map();
 const oldCache=new Map([["/ege-2027/app.js",{version:"old"}]]);
 byCache.set("ege-2027-shell-oldhash",oldCache);
 const obj={
  self:{registration:{scope},location:{origin:"https://example.org"},
    clients:{claim:async()=>{records.claim++;}},skipWaiting:async()=>{records.skip++;},
    addEventListener:(name,cb)=>{events[name]=cb;}},
  caches:{
    open:async name=>{if(!byCache.has(name))byCache.set(name,new Map());const cache=byCache.get(name);
      return{addAll:async urls=>{if(failInstall)throw Error("offline");
         urls.forEach(u=>{records.requests.push(u);cache.set(new URL(u.url||u,scope).pathname,{version:"fresh"})})},
        match:async url=>cache.get(new URL(url.url||url,scope).pathname),
        put:async(url,body)=>cache.set(new URL(url.url||url,scope).pathname,body)};},
    keys:async()=>[...byCache.keys()],
    delete:async key=>{records.deleted.push(key);return byCache.delete(key);}},
  fetch:async req=>({ok:true,clone(){return this;}}),
  URL,Request,Response};
 vm.runInNewContext(swSource,obj,{filename:"sw.js"});
 return{events,records,byCache,scope};
}
test("новая версия PWA загружает свежие файлы и активируется сразу после успешной установки",async()=>{
 const a=workerHarness(),{events,records}=a;
 let promise;
 events.install({waitUntil:p=>promise=p});await promise;
 assert.equal(records.skip,1);
 assert.ok(records.requests.length>=20);
 assert.ok(records.requests.every(req=>req.cache==="reload"),"Не используется старый HTTP-кэш Android");
 events.activate({waitUntil:p=>promise=p});await promise;
 assert.equal(records.claim,1);
 assert.ok(records.deleted.includes("ege-2027-shell-oldhash"));
 assert.equal(a.byCache.has("ege-2027-shell-oldhash"),false);
});
test("если новые ресурсы не скачаны, старый PWA остаётся работоспособным",async()=>{
 const a=workerHarness({failInstall:true});
 let promise;
 a.events.install({waitUntil:p=>promise=p});
 await assert.rejects(promise,/offline/);
 assert.equal(a.records.skip,0);
 assert.ok(a.byCache.has("ege-2027-shell-oldhash"));
});
test("service worker не использует предыдущий кэш для статических файлов",async()=>{
 const a=workerHarness();let install,activation;
 a.events.install({waitUntil:p=>install=p});await install;
 a.events.activate({waitUntil:p=>activation=p});await activation;
 let served;
 const req={method:"GET",url:a.scope+"app.js",mode:"cors"};
 a.events.fetch({request:req,respondWith:p=>{served=p;}});
 assert.equal((await served).version,"fresh");
});
test("HTML обеспечивает однократное обновление после смены контроллера",()=>{
 const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/);
 assert.ok(inline,"Bootstrap не должен зависеть от старого android.js");
 for(const hasController of [true,false]){
  let reload=0,changed,old={};
  vm.runInNewContext(inline[1],{
    navigator:{serviceWorker:{controller:hasController?old:null,addEventListener:(event,cb)=>{if(event==="controllerchange")changed=cb;}}},
    window:{location:{reload:()=>{reload++;}}}
  });
  changed();changed();
  assert.equal(reload,hasController?1:0);
 }
});
test("отображается проверка обновлений, а данные прогресса не удаляются",()=>{
 assert.ok(androidSource.includes('b.dataset.android==="check-update"'));
 assert.ok(androidSource.includes("updateViaCache:\"none\""));
 assert.ok(androidSource.includes("visibilitychange"));
 assert.ok(!/localStorage\.clear\(|localStorage\.removeItem\(/.test(androidSource));
 assert.ok(html.includes("controllerchange"));
});
