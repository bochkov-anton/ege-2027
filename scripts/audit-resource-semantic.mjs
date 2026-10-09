import vm from "node:vm";import{readFileSync}from"node:fs";
const ctx=vm.createContext({window:{},console,encodeURIComponent});
for(const f of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","fipi-supplements.js"]){
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),ctx,{filename:f});
}
const {EGE_DATA:D,EGE_LESSONS:L,EGE_THEORY:T,EGE_PRACTICE:P}=ctx.window;
for(const sub of D.subjectOrder){
 console.log("\n### "+sub);
 for(let w=0;w<26;w++)for(let i=0;i<3;i++){
 const key=sub+":"+(w+1)+":"+i,lesson=L.get(key),theory=T.get(key,sub,lesson.title,lesson),
 pr=P.get(key)?.sources||[];
 const brief=(s,n=65)=>s.replace(/\s+/g," ").slice(0,n);
 console.log(key+" | "+brief(lesson.title,78)+" | FOX "+theory.articles.map(x=>brief(x.title,32)).join(";")+
 " | TASK "+pr.map(x=>brief(x.title,50)).join(";"));
 }
}