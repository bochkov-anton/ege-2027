// Запуск: node scripts/verify-live.mjs
// Сравнивает GitHub Pages со свежими локальными файлами. Не модифицирует данные ученицы.
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const site="https://bochkov-anton.github.io/ege-2027/";
const fileList=["index.html","manifest.webmanifest","sw.js","style.css","ux.css","android.css","flow.css","session.css","wellbeing.css","lessons.css","textbooks.css",
  "data.js","wellbeing.js","logic.js","resources.js","topic-practice.js","lesson-content.js","theory-core.js","textbooks.js","verified-tocs.js","page-assignments.js","reading-guide.js","experience.js","app.js","android.js","icons/icon-192.png","icons/icon-512.png"];
const sha=b=>createHash("sha256").update(b).digest("hex").slice(0,12);
const report={site,assets:[],broken:[],stale:[],external:[]};
async function query(url,timeout=16000){
  try{const result=await fetch(url,{redirect:"follow",signal:AbortSignal.timeout(timeout),headers:{"cache-control":"no-cache"}});
    return {status:result.status,url:result.url,type:result.headers.get("content-type"),buffer:Buffer.from(await result.arrayBuffer())};}
  catch(e){return{status:"ERR",error:String(e).slice(0,100)};}
}
await Promise.all(fileList.map(async name=>{
  const url=new URL(name,site).href+"?verify="+Date.now();
  const live=await query(url,12000);
  const local=existsSync(resolve(root,name))?readFileSync(resolve(root,name)):null;
  const equal=!!local && !!live.buffer && sha(local)===sha(live.buffer);
  const out={name,status:live.status,bytes:live.buffer?.length||0,match:equal};
  report.assets.push(out);
  if(live.status!==200)report.broken.push(out);
  else if(!equal)report.stale.push({...out,liveHash:sha(live.buffer),localHash:local?sha(local):null});
}));
const sources=readFileSync(resolve(root,"resources.js"),"utf8");
const urlRegex=/https:\/\/[^"'\s]+/g;
const urls=[...new Set(sources.match(urlRegex)||[])].filter(x=>!x.endsWith("/")&& !x.includes("undefined"));
for(const url of urls){
 const response=await query(url,13000);
 report.external.push({url,status:response.status,bytes:response.buffer?.length||0,final:response.url||null,error:response.error||null});
}
const html=report.assets.find(x=>x.name==="index.html");
console.log(JSON.stringify(report,null,2));
console.log("SUMMARY "+JSON.stringify({siteAvailable:html.status===200,assets:report.assets.length,broken:report.broken.length,stale:report.stale.length,external:report.external.length}));
if(report.broken.length||report.stale.length)process.exitCode=1;
