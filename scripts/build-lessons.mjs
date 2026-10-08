import {readFileSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const ctx=vm.createContext({window:{}});
vm.runInContext(readFileSync(resolve(root,"data.js"),"utf8"),ctx);
const D=ctx.window.EGE_DATA,output={};
const targets={bio:"biology-guides.txt",chem:"chemistry-guides.txt",math:"mathematics-guides.txt"};
for(const [sub,file] of Object.entries(targets)){
 const rows=readFileSync(resolve(root,"scripts",file),"utf8").trim().split(/\r?\n/);
 if(rows.length!==26)throw Error(sub+" weeks "+rows.length);
 for(let week=0;week<26;week++){
  const parts=rows[week].split(" || ").map(z=>z.trim());
  if(parts.length!==3)throw Error(sub+" week "+(week+1)+" lessons "+parts.length);
  parts.forEach((entry,index)=>{
   const segments=entry.split("§").map(x=>x.trim());
   if(segments.length!==3||segments.some(x=>x.length<12))throw Error(sub+" "+week+":"+index+" segments="+segments.length+" "+JSON.stringify(segments));
   const [know,doTask,check]=segments;
   const title=D.subjects[sub].weeks[week][index],key=sub+":"+(week+1)+":"+index;
   output[key]={title,know,doTask,check,subject:sub,week,index};
  });
 }
}
if(Object.keys(output).length!==234)throw Error("topics missing");
const code="/* Авторские предметные карточки 234 тем: знание, конкретное действие, контроль освоения.\n"+
 " * Source of truth: scripts/*-guides.txt; generate with node scripts/build-lessons.mjs.\n"+
 " */\n(function(){\"use strict\";const MAP="+JSON.stringify(output)+";window.EGE_LESSONS={get(key){return MAP[key]||null;},all:MAP};})();\n";
writeFileSync(resolve(root,"lesson-content.js"),code);
console.log("VERIFIED "+Object.keys(output).length+" authored lessons; size "+code.length);
