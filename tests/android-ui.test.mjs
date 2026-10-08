import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const body=readFileSync(new URL("../android.js",import.meta.url),"utf8");
function androidHarness({installed=false,secure=true,stored=null}={}){
  const nodes=new Map(),listeners={},actions={};
  function el(sel){
    if(!nodes.has(sel))nodes.set(sel,{textContent:"",innerHTML:"",dataset:{},hidden:false,addEventListener(){},getAttribute(){},});
    return nodes.get(sel);
  }
  const document={readyState:"complete",querySelector:el,addEventListener:(name,fn)=>actions[name]=fn};
  const window={matchMedia:()=>({matches:installed}),addEventListener:(name,cb)=>listeners[name]=cb};
  const shareCalls=[],store=new Map();
  if(stored)store.set("ege2027-local-progress-v1",JSON.stringify(stored));
  const navigator={userAgent:"Android Chrome",onLine:true,canShare:()=>true,share:async data=>{shareCalls.push(data);}};
  const context=vm.createContext({
    window,navigator,document,location:{protocol:secure?"https:":"file:",hostname:secure?"example.org":""},
    localStorage:{getItem:k=>store.get(k)||null},
    sessionStorage:{getItem:()=>null,setItem(){}},
    URL,File:class {constructor(parts,name,opts){this.parts=parts;this.name=name;this.type=opts.type;}},
    Blob,setTimeout:()=>1,clearTimeout:()=>{},
  });
  vm.runInContext(body,context,{filename:"android.js"});
  return {window,navigator,nodes,events:listeners,actions,shareCalls,node:el};
}
test("Android видит установку PWA по HTTPS и инструкцию",()=>{
  const h=androidHarness();
  assert.ok(h.node("#android-pwa-banner").innerHTML.includes("Установить"));
  assert.equal(h.node("#android-pwa-banner").hidden,false);
  assert.ok(h.node("#android-install-hint").textContent.includes("Chrome"));
});
test("уже установленная PWA не показывает повторную установку",()=>{
  const h=androidHarness({installed:true});
  assert.equal(h.node("#android-pwa-banner").hidden,true);
  assert.equal(h.node("#android-install-btn").hidden,true);
});
test("файловый режим объясняет, почему установка не работает",()=>{
  const h=androidHarness({secure:false});
  assert.ok(h.node("#android-install-hint").textContent.includes("HTTPS"));
});
test("экспорт для Android Share передаёт JSON, не обращаясь к облаку автоматически",async()=>{
  const h=androidHarness({stored:{startDate:"2026-10-05",completed:{"2026-10-05:0":"bio"}}});
  await h.window.EGE_ANDROID.shareBackup();
  assert.equal(h.shareCalls.length,1);
  const info=h.shareCalls[0];
  assert.ok(info.files[0].name.endsWith(".json"));
  const data=JSON.parse(info.files[0].parts.join(""));
  assert.equal(data.version,1);
  assert.equal(data.state.completed["2026-10-05:0"],"bio");
});
