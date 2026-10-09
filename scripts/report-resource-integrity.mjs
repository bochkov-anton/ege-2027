import vm from "node:vm";import{readFileSync}from"node:fs";
const context=vm.createContext({window:{},encodeURIComponent,console});
for(const file of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","fipi-supplements.js","resource-integrity.js"]){
 vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),context,{filename:file});
}
const W=context.window,r=W.EGE_RESOURCE_INTEGRITY.report;
const seen={bio:{articles:0,practice:0},chem:{articles:0,practice:0},math:{articles:0,practice:0}};
for(const sub of W.EGE_DATA.subjectOrder)for(let week=1;week<=26;week++)for(let i=0;i<3;i++){
 const key=sub+":"+week+":"+i,lesson=W.EGE_LESSONS.get(key);
 if(W.EGE_THEORY.get(key,sub,lesson.title,lesson).articles.length)seen[sub].articles++;
 if(W.EGE_PRACTICE.get(key).sources.length)seen[sub].practice++;
}
console.log("RESOURCE_AUDIT "+JSON.stringify({report:r,coverage:seen}).slice(0,6000));
