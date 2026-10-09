// Запуск: node scripts/verify-live.mjs
// Сравнивает GitHub Pages со свежими локальными файлами. Не модифицирует данные ученицы.
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const site="https://bochkov-anton.github.io/ege-2027/";
const fileList=["index.html","manifest.webmanifest","sw.js","style.css","ux.css","android.css","tablet-ui.css","flow.css","session.css","wellbeing.css","lessons.css","textbooks.css",
  "data.js","wellbeing.js","logic.js","curriculum.js","fipi-map.js","resources.js","topic-practice.js","lesson-content.js","theory-core.js","fipi-supplements.js","resource-integrity.js","textbooks.js","verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js","study-source-routes.js","experience.js","app.js","android.js","icons/icon-192.png","icons/icon-512.png"];
const sha=b=>createHash("sha256").update(b).digest("hex").slice(0,12);
const report={site,assets:[],broken:[],stale:[],external:[]};
async function query(url,timeout=16000){
  try{const result=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(timeout),headers:{"cache-control":"no-cache"}});
    return {status:result.status,url:result.url,type:result.headers.get("content-type"),buffer:Buffer.from(await result.arrayBuffer())};}
  catch(e){return{status:"ERR",error:String(e).slice(0,100)};}
}
// Ограничиваем нагрузку на CDN и сеть проверяющего агента; ERR не означает HTTP 404.
async function retryQuery(url,timeout=7500){
  let result;
  for(let attempt=0;attempt<2;attempt++){
    result=await query(url,timeout);
    if(result.status!=="ERR")return result;
  }
  return result;
}
async function mapLimit(items,limit,fn){
  let index=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(index<items.length){const current=index++;await fn(items[current]);}
  }));
}
await mapLimit(fileList,9,async name=>{
  const url=new URL(name,site).href+"?verify="+Date.now();
  const live=await retryQuery(url,3000);
  const local=existsSync(resolve(root,name))?readFileSync(resolve(root,name)):null;
  const equal=!!local && !!live.buffer && sha(local)===sha(live.buffer);
  const out={name,status:live.status,bytes:live.buffer?.length||0,match:equal};
  report.assets.push(out);
  if(live.status!==200)report.broken.push({...out,error:live.error||null});
  else if(!equal)report.stale.push({...out,liveHash:sha(live.buffer),localHash:local?sha(local):null});
});
if(process.argv.includes("--external")){
const sources=readFileSync(resolve(root,"resources.js"),"utf8");
const urlRegex=/https:\/\/[^"'\s]+/g;
const urls=[...new Set(sources.match(urlRegex)||[])].filter(x=>!x.endsWith("/")&& !x.includes("undefined"));
await mapLimit(urls,3,async url=>{
 const response=await retryQuery(url,6500);
 report.external.push({url,status:response.status,bytes:response.buffer?.length||0,final:response.url||null,error:response.error||null});
});
}
const html=report.assets.find(x=>x.name==="index.html");
console.log(JSON.stringify(report,null,2));
console.log("SUMMARY "+JSON.stringify({siteAvailable:html.status===200,assets:report.assets.length,broken:report.broken.length,stale:report.stale.length,external:report.external.length}));
if(report.broken.length||report.stale.length)process.exitCode=1;
