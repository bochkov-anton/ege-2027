(function(){"use strict";
function summary(state,C,today){
 const out={},review=state?.reviews||{},errors=state?.errors||[],results=Object.values(state?.results||{});
 for(const s of ["bio","chem","math"]){
  const keys=C.order[s],statuses=keys.map(k=>({id:k,...C.topicStatus(state,k)}));
  const done=statuses.filter(x=>x.theory&&x.practice);
  const trials=results.filter(x=>x&&x.subject===s&&Number.isFinite(x.correct)&&Number.isFinite(x.total)&&x.total>0&&x.correct>=0&&x.correct<=x.total);
  const answered=trials.reduce((n,x)=>n+x.total,0),correct=trials.reduce((n,x)=>n+x.correct,0);
  out[s]={total:keys.length,mastered:done.length,
   theory:statuses.filter(x=>x.theory).length,practice:statuses.filter(x=>x.practice).length,
   started:statuses.filter(x=>x.theory||x.practice||review[x.id]).length,
   reinforced:done.filter(x=>Number(review[x.id]?.successes)>=2).length,
   available:statuses.filter(x=>x.ready&&!(x.theory&&x.practice)).length,
   due:keys.filter(x=>typeof review[x]?.due==="string"&&review[x].due<=today).length,
   openErrors:errors.filter(e=>e&&!e.done&&e.subject===s).length,
   answered,correct,accuracy:answered?Math.round(100*correct/answered):null};
 }
 return out;
}
function week(state,C,n){
 const data={};
 for(const s of ["bio","chem","math"]){
  const topics=C.projectedWeek(s,n).map(t=>{const x=C.topicStatus(state,t.id),done=x.theory&&x.practice;
   return {id:t.id,title:t.title,mastered:done,ready:x.ready,missing:x.missing.length,
    phase:done?"mastered":x.theory?"practice":x.ready?"ready":"blocked"};});
  data[s]={topics,mastered:topics.filter(x=>x.mastered).length,
   ready:topics.filter(x=>x.ready&&!x.mastered).length,
   blocked:topics.filter(x=>x.phase==="blocked").length};
 }
 return data;
}
window.EGE_ANALYTICS=Object.freeze({summary,week});
})();