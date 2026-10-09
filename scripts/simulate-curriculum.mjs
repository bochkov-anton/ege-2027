import{readFileSync}from"node:fs";import vm from"node:vm";
const c=vm.createContext({window:{},Date,URL});
for(const f of ["data.js","logic.js","curriculum.js"])vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),c,{filename:f});
const L=c.window.EGE_LOGIC,C=c.window.EGE_CURRICULUM;
const start="2026-10-05",st=L.safeState({startDate:start},start);
let phases=0,full=0;
for(let n=0;n<26*7;n++){
 const date=L.iso(L.move(L.parseDate(start),n));
 if(!L.isStudyDay(date))continue;
 C.assign(st,date,start,L.planDay);
 for(let loop=0;loop<5;loop++){
  const list=C.agenda(st,date,"normal",date,L.planDay,L.studyAgenda).filter(t=>t.phase);
  const next=list.find(t=>!st.completed[t.id]&&C.readyForCompletion(st,t));
  if(!next)break;
  st.completed[next.id]=next.subject;C.markCompletion(st,next,true);phases++;
 }
}
for(const sub of ["bio","chem","math"]){
 const n=C.order[sub].filter(id=>{const q=C.topicStatus(st,id);return q.theory&&q.practice}).length;
 console.log(sub+" "+n+"/78 topics completed");
 full+=n;
}
console.log("ALL "+full+"/234 topics in 130 study days; phases "+phases+" capacity "+130*3);
