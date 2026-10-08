import {readFileSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
import vm from "node:vm";
import {assignments} from "./direct-map.mjs";
const dir=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const v=vm.createContext({window:{}});
vm.runInContext(readFileSync(resolve(dir,"data.js"),"utf8"),v);
const D=v.window.EGE_DATA;
function strip(text){
 return text.replace(/<[^>]*>/g,"").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g," ").trim();
}
const catalog={};
for(const subject of D.subjectOrder){
  const url="https://"+subject+"-ege.sdamgia.ru/prob_catalog";
  const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(subject+" catalog HTTP "+response.status);
  const html=await response.text();
  const raw=[...html.matchAll(/<a\s+class="cat_name"\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
  catalog[subject]=raw.map(m=>{
    const relative=m[1].replace(/&amp;/g,"&");
    if(!/^\/test\?filter=all&category_id=\d+$/.test(relative))throw Error("unexpected catalogue URL "+relative);
    return {title:strip(m[2]),url:"https://"+subject+"-ege.sdamgia.ru"+relative};
  });
  console.log(subject,"catalogued:",catalog[subject].length);
}
const mapped={};
for(const subject of D.subjectOrder){
  const rows=assignments[subject].trim().split("\n").map(x=>x.trim().split(";"));
  if(rows.length!==26||rows.some(x=>x.length!==3))throw Error("mapping rows "+subject+" "+rows.length);
  for(let w=0;w<26;w++)for(let i=0;i<3;i++){
    const key=subject+":"+(w+1)+":"+i;
    const positions=rows[w][i].split(",").map(Number);
    const records=positions.map(j=>catalog[subject][j]);
    if(records.some(x=>!x))throw Error(key+" index missing");
    if(new Set(records.map(x=>x.url)).size!==records.length)throw Error("duplicate link "+key);
    mapped[key]={label:D.subjects[subject].weeks[w][i],sources:records};
  }
}
const urls=[...new Set(Object.values(mapped).flatMap(x=>x.sources.map(z=>z.url)))];
let failures=[];const status=[];let index=0;
async function worker(){
  while(index<urls.length){
    const ix=index++,url=urls[ix];
    let ok=false,reason="";
    for(let attempt=0;attempt<2&&!ok;attempt++){
      try{
        const r=await fetch(url,{signal:AbortSignal.timeout(14000)});
        const html=await r.text();
        ok=r.status===200&&(/Каталог заданий|Каталог задани|Задания/.test(html))&&(/solution|problem|task|№|Решение|Пояснение/.test(html));
        reason=ok?"200 content":String(r.status)+" body "+html.length;
      }catch(e){reason=String(e);}
    }
    status.push({url,ok,reason});if(!ok)failures.push({url,reason});
  }
}
await Promise.all(Array.from({length:8},()=>worker()));
console.log("MAPPED",Object.keys(mapped).length,"UNIQUE",urls.length,"OK",status.length-failures.length,"FAIL",failures.length);
if(failures.length){console.log("FAILURES",JSON.stringify(failures.slice(0,30)));process.exitCode=1;process.exit();}
const header="/* Конкретные подборки заданий РЕШУ ЕГЭ, полученные из живого каталога и проверенные HTTP 200.\n"+
 " * Название категории подтверждено, но состав заданий может обновляться на сайте.\n"+
 " * Генерация: node scripts/build-direct-practice.mjs. Исходные соответствия: scripts/direct-map.mjs.\n"+
 " */\n(function(){\n\"use strict\";\nconst MAP=";
const js=header+JSON.stringify(mapped,null,0)+";\nwindow.EGE_PRACTICE={get(key){return MAP[key]||null;},all:MAP};\n})();\n";
writeFileSync(resolve(dir,"topic-practice.js"),js,"utf8");
console.log("WROTE",js.length,"bytes and",Object.keys(mapped).length,"lessons");
