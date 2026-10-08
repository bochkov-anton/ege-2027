import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {fileURLToPath} from "node:url";
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=filename=>readFileSync(path.join(dir,filename),"utf8");
test("манифест PWA имеет правильный базовый путь для корня и подкаталога",()=>{
  const m=JSON.parse(source("manifest.webmanifest"));
  assert.equal(m.display,"standalone");
  assert.equal(m.start_url,"./index.html");
  assert.equal(m.scope,"./");
  assert.equal(m.lang,"ru");
  assert.equal(m.icons.length,2);
  for(const icon of m.icons){
    const file=path.join(dir,icon.src);
    assert.ok(existsSync(file));
    const b=readFileSync(file);
    assert.equal(b.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    const width=b.readUInt32BE(16),height=b.readUInt32BE(20),expected=Number(icon.sizes.split("x")[0]);
    assert.equal(width,expected);
    assert.equal(height,expected);
  }
});
test("все офлайн-ресурсы реально присутствуют и подключены к HTML",()=>{
  const html=source("index.html");
  const worker=source("sw.js");
  const m=worker.match(/const APP_SHELL=\[([\s\S]*?)\];/);
  assert.ok(m);
  const assets=Array.from(m[1].matchAll(/"([^"]+)"/g),x=>x[1]);
  assert.ok(assets.length>=10);
  for(const item of assets){
    if(item==="./")continue;
    assert.ok(existsSync(path.join(dir,item)),item);
  }
  for(const file of ["data.js","wellbeing.js","logic.js","resources.js","topic-practice.js","lesson-content.js","theory-core.js","textbooks.js","experience.js","app.js","android.js","style.css","ux.css","android.css","flow.css","session.css","wellbeing.css","lessons.css","textbooks.css"]){
    assert.ok(html.includes("./"+file));
    assert.ok(assets.includes("./"+file));
  }
  assert.ok(html.includes("rel=\"manifest\""));
});
test("service worker не перехватывает чужие сайты и запросы POST",async()=>{
  const events={},responses=new Map(),cacheMap=new Map();
  const scope="https://example.org/study/";
  const ctx=vm.createContext({
    self:{registration:{scope},location:{origin:"https://example.org"},addEventListener:(name,cb)=>{events[name]=cb;},clients:{claim:()=>Promise.resolve()}},
    caches:{open:async(name)=>({
      addAll:async(entries)=>entries.forEach(e=>cacheMap.set(e,{ok:true,url:e})),
      match:async key=>cacheMap.get(key),
      put:async(key,value)=>cacheMap.set(key,value)}),
      match:async key=>cacheMap.get(key.url||key),
      keys:async()=>["ege-2027-shell-v1-android"],
      delete:async()=>true},
    fetch:async req=>({ok:true,url:req.url,clone(){return this;}}),
    URL,Response,
  });
  vm.runInContext(source("sw.js"),ctx,{filename:"sw.js"});
  assert.equal(typeof events.install,"function");
  assert.equal(typeof events.fetch,"function");
  let promise;
  events.install({waitUntil:p=>promise=p});await promise;
  assert.ok(cacheMap.has("./android.css"));
  const external={request:{method:"GET",url:"https://fipi.ru/books",mode:"navigate"},respondWith(){responses.set("external",true);}};
  events.fetch(external);assert.equal(responses.has("external"),false);
  const post={request:{method:"POST",url:scope+"save",mode:"cors"},respondWith(){responses.set("post",true);}};
  events.fetch(post);assert.equal(responses.has("post"),false);
});
