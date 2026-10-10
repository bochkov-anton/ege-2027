/* Учебные зависимости ЕГЭ-2027. Идентификаторы тем неизменны:
 * subject:week:index. Редакционная последовательность независима от календаря.
 * Источники по экзамену: fipi.ru/ege/demoversii-specifikacii-kodifikatory,
 * официальные проекты КИМ-2027 (обсуждение, не утверждённый финальный КИМ).
 * Содержательные зависимости: анализ учебных целей 234 карточек.
 */
(function(){"use strict";
const D=window.EGE_DATA;
const EDGES={
bio:`
-;-;-
1.0+1.1;1.0;1.0
1.2;1.2+3.0;3.1
1.1;4.0;4.1
2.0+2.1+4.0;5.0;5.0+4.2
2.1;6.0;6.0+6.1
6.1+3.2;7.0;7.1
7.0+6.1;7.0+7.1;7.0+6.1
2.0+2.1;9.0;9.1
9.1+9.2;9.1+10.0;9.1+10.1
9.0;11.0;11.0+11.1+6.1
11.1+11.2;12.0;9.0+10.1+11.2+7.1
2.2;13.0;13.1
13.0+13.1;14.0;14.1
13.0+14.1;15.0;15.1
15.0+15.1;16.0;13.0+14.0+15.0
2.1+13.0;17.0+1.1;17.1
17.0;18.0;18.1
18.0+18.1+2.0;18.0;19.0+19.1
17.0+19.2;20.0;20.0+20.1+19.1
7.0+8.2;21.0;21.1
21.0+21.1;22.0;22.1
21.0;23.0;23.1
8.1+12.2+16.2+20.2+23.2;24.0;24.1
24.0+24.1;25.0+8.1+16.2;25.0+25.1
25.2;26.0;26.1
`,
chem:`
-;1.0;1.0+1.1
1.1+1.2+2.1;1.1+1.2;10.0+9.0
2.0+1.1+5.1;2.1;9.1+13.2
2.0+5.2;2.1+3.1;11.0+11.1+14.0
2.1+3.1;1.2;1.1+3.1
3.1+4.0;2.0+3.0;5.0+6.0+6.1
3.0+4.0+6.0;4.1+6.1;5.1+5.2+13.2
6.2+7.0;5.2+7.1;10.0+9.0+9.1
10.0;9.0+10.0;9.0+9.1+10.1
1.1;9.0+10.0;9.0+10.1
9.0+10.0;11.0;11.0+11.1
11.0+11.1;11.1;12.0+12.1+9.2
9.0+11.0+12.1;13.0+1.2;5.1+1.2
5.1+7.2;7.2+13.2;12.2+13.1
10.2+11.2;14.1+12.2;15.0+15.1
8.1+12.2+13.1;15.1+5.2+6.1;14.1+13.2
16.2;17.0;17.1+15.1
5.2+6.1;12.2+6.2;13.1+17.1
18.0+18.1;17.2+18.2;19.0+19.1
19.2+8.2+16.1;20.0;20.1
20.0+19.2;20.2;21.0+21.1
20.0+21.0;15.1;17.1+21.1
20.0+22.0;18.1;22.2
23.0;24.0;24.1
24.0;23.1;24.2
25.0;26.0;26.1
`,
math:`
-;-;1.1
1.1;1.1;2.0+2.1
1.2;1.1;2.1+3.0+3.1
1.1;1.1+4.0;1.2+5.1
3.2;1.2;1.2+5.1+4.2
3.2;5.2;1.1
5.1+5.2;6.2;6.0
6.2+7.1+1.1;7.0+5.2;3.0+3.1
8.0+7.1;8.1;8.2+2.2
8.0+9.0;9.2;3.1
4.1+3.1;9.0;10.1+5.2
4.0+11.0;10.2+12.0;9.0+5.2
10.2+12.1;12.1;12.2+3.2
13.0+13.1;9.1+9.0;14.0+14.1
12.2+14.2;11.0;15.0
3.0+3.1+8.0+12.1;16.0;15.2
16.1;14.1+14.0;16.2+17.1
17.0+15.2;17.2;18.1
18.2;19.0;19.1
19.0;18.2;20.1
20.2;20.1;21.0
21.2;21.1;22.1
22.0;22.2;23.1
23.0;23.1;24.1
24.0;24.1;25.1
25.0;26.0;26.1
`
};
function key(subject,w,i){return subject+":"+(w+1)+":"+i;}
const records={},warning=[];
for(const subject of D.subjectOrder){
 const rows=EDGES[subject].trim().split("\n").map(r=>r.trim().split(";"));
 if(rows.length!==26||rows.some(x=>x.length!==3))throw Error("Wrong graph dimensions "+subject);
 rows.forEach((cells,w)=>cells.forEach((cell,i)=>{
   const id=key(subject,w,i);
   const prerequisite=cell==="-"?[]:cell.split("+").map(label=>{
     const m=/^(\d{1,2})\.([012])$/.exec(label);
     if(!m||+m[1]<1||+m[1]>26)throw Error("Bad dependency "+id+" "+label);
     const result=subject+":"+m[1]+":"+m[2];
     if(result===id)throw Error("Self-dependency "+id);
     return result;
   });
   records[id]={id,subject,week:w,index:i,title:D.subjects[subject].weeks[w][i],
      prerequisites:[...new Set(prerequisite)]};
 }));
}
const all=Object.keys(records);
function ordered(subject){
 const source=all.filter(id=>records[id].subject===subject),done=new Set(),result=[];
 while(result.length<source.length){
   // Stable Kahn sort: prefer the earliest *available* planned topic.
   // Unlike DFS, do not jump to week 10 merely because an incorrectly
   // placed lesson in week 2 mentions a week-10 prerequisite.
   const id=source.find(key=>!done.has(key)&&records[key].prerequisites.every(dep=>done.has(dep)));
   if(!id)throw Error("Dependency cycle or missing prerequisite in "+subject);
   done.add(id);result.push(id);
 }
 return result;
}
const order=Object.fromEntries(D.subjectOrder.map(s=>[s,ordered(s)]));
const placement=Object.fromEntries(D.subjectOrder.flatMap(s=>
  order[s].map((id,index)=>[id,{subject:s,position:index+1,week:Math.floor(index/3)+1,withinWeek:index%3,
    originalWeek:records[id].week+1,originalIndex:records[id].index}])));
const canonicalInversions=all.flatMap(id=>records[id].prerequisites.filter(dep=>
  placement[dep].position>=placement[id].position).map(dep=>({topic:id,requiredBefore:dep})));
if(canonicalInversions.length)throw Error("Canonical schedule violates dependencies");
const risk=all.flatMap(id=>records[id].prerequisites.filter(d=>{
 const x=records[d],y=records[id];return x.week*3+x.index>y.week*3+y.index;
}).map(d=>({topic:id,requiredBefore:d,reason:"calendar_dependency_inversion"})));
function unmet(state,id){
 if(!Object.hasOwn(records,id))return [];
 return records[id].prerequisites.filter(dep=>{
   const p=state?.topicProgress?.[dep];
   return !(p&&p.theory===true&&p.practice===true);
 });
}
function topicStatus(state,id){
 const p=state?.topicProgress?.[id]||{};
 const exists=Object.hasOwn(records,id),missing=exists?unmet(state,id):[];
 return {theory:exists&&p.theory===true,practice:exists&&p.practice===true,
   ready:exists&&missing.length===0,missing,unknown:!exists};
}
function prerequisitePath(state,id,limit=12){
 if(!Object.hasOwn(records,id))return [];
 const found=new Set(),path=[];
 function visit(key){
   if(found.has(key))return;
   found.add(key);
   for(const dep of records[key].prerequisites)visit(dep);
   if(key===id)return;
   const st=topicStatus(state,key);
   if(!(st.theory&&st.practice))path.push({id:key,title:records[key].title,subject:records[key].subject,
     theoryDone:st.theory,practiceDone:st.practice});
 }
 visit(id);
 return path.slice(0,Math.max(0,Math.min(30,Number.isFinite(limit)?Math.trunc(limit):12)));
}
function nextSubject(state,subject){
 if(!Object.hasOwn(order,subject))return null;
 for(const id of order[subject]){
   const status=topicStatus(state,id);
   if(status.theory&&status.practice)continue;
   if(!status.ready)return null; // Не перепрыгивать незавершённую основу к более поздней независимой теме.
   return {...records[id],status};
 }
 return null;
}
function eligible(state,id,phase){
 if(!Object.hasOwn(records,id))return false;
 const status=topicStatus(state,id);
 return status.ready&&(phase==="theory"?!status.theory:phase==="practice"&&status.theory&&!status.practice);
}
function migrateLegacy(state,oldPlan){
 if(!state.topicProgress)state.topicProgress={};
 const byDay=new Map();
 for(const [id,value] of Object.entries(state.completed||{})){
   if(!value||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}:[012]$/.test(id))continue;
   const day=id.slice(0,10);
   if(!byDay.has(day))byDay.set(day,new Set());
   byDay.get(day).add(id);
 }
 for(const [day,ids] of byDay){
   if(state.curriculumAssignments?.[day])continue;
   const tasks=oldPlan(day,state.startDate,state.reviews,"normal");
   const theory=tasks.find(t=>t.id===day+":0"),practice=tasks.find(t=>t.id===day+":1");
   if(!theory?.topicKey||practice?.topicKey!==theory.topicKey)continue;
   const key=theory.topicKey,prev=state.topicProgress[key]||{};
   if(ids.has(theory.id))prev.theory=true;
   if(ids.has(theory.id)&&ids.has(practice.id))prev.practice=true;
   state.topicProgress[key]=prev;
   // Legacy secondary block was a different topic: preserve its recorded study.
   const secondary=tasks.find(t=>t.id===day+":2");
   if(secondary?.topicKey&&ids.has(secondary.id)){
     const other=state.topicProgress[secondary.topicKey]||{};
     other.theory=true;
     const score=state.results?.[secondary.id];
     if(Number(score?.total)>=3&&Number(score?.correct)>=0&&
       Number(score.correct)/Number(score.total)>=.8)other.practice=true;
     state.topicProgress[secondary.topicKey]=other;
   }
 }
 return state;
}
function task(day,slot,id,phase,minutes){
 const r=records[id];
 return{ id:day+":"+slot,topicKey:id,subject:r.subject,title:r.title,
   kind:phase==="theory"?"new":phase==="integrated"?"integrated":"practice",
   phase,minutes,slot,originDate:day,isBacklog:false,prerequisites:r.prerequisites};
}
function assign(state,day,start,planDay){
 if(!state.curriculumAssignments)state.curriculumAssignments={};
 if(Array.isArray(state.curriculumAssignments[day]))return state.curriculumAssignments[day];
 const old=state.assignments?.[day];
 const hasLegacyActivity=Array.isArray(old)&&old.some(id=>state.completed?.[id]||state.notes?.[id]||
   Number(state.timeSpent?.[id])>0||state.studyTimer?.taskId===id);
 if(hasLegacyActivity)return null; // Never reinterpret a previously started day.
 migrateLegacy(state,planDay);
 const dat=new Date(day+"T12:00:00");
 if(day<start)return [];
 const saturday=dat.getDay()===6?window.EGE_LOGIC?.saturdaySession(state,day):null;
 if(dat.getDay()===0||(dat.getDay()===6&&saturday?.kind!=="lesson"))return [];
 if(saturday?.kind==="lesson"){
   const next=nextSubject(state,saturday.subject);
   const assignments=next?[task(day,0,next.id,next.status.theory?"practice":"integrated",75)]:[];
   state.curriculumAssignments[day]=assignments;
   return assignments;
 }
 const week=Math.max(0,Math.floor((dat-new Date(start+"T12:00:00"))/604800000));
 const pair=D.patterns[week%2][dat.getDay()-1]||["bio","chem"];
 const preferred=[...pair,...D.subjectOrder.filter(x=>!pair.includes(x))];
 // Single complete lesson = theory → independent exercises → score.
 // 234 topics / 130 study days requires at least 1.8 completed topics/day.
 // Old stored curriculumAssignments are never reinterpreted.
 const chosen=new Set(),tasks=[];
 for(const subject of preferred){
   if(tasks.length>=2)break;
   if(chosen.has(subject))continue;
   const next=nextSubject(state,subject);
   if(!next)continue;
   chosen.add(subject);
   const phase=next.status.theory?"practice":"integrated";
   tasks.push(task(day,tasks.length,next.id,phase,phase==="integrated"?75:55));
 }
 state.curriculumAssignments[day]=tasks;
 return tasks;
}
function agenda(state,day,mode,currentDate,legacyPlan,legacyAgenda){
 const saturday=window.EGE_LOGIC?.saturdaySession(state,day);
 const dayOfWeek=new Date(day+"T12:00:00").getDay();
 if(dayOfWeek===0||(dayOfWeek===6&&!saturday))return [];
 if(dayOfWeek===6){
   if(saturday.kind!=="lesson"||mode==="off")return [];
   const stored=state.curriculumAssignments?.[day];
   const tasks=(day===currentDate?assign(state,day,state.startDate,legacyPlan):
     (Array.isArray(stored)?stored:[]))||[];
   return tasks.filter(x=>state.completed?.[x.id]||
     (topicStatus(state,x.topicKey).ready&&
       !(topicStatus(state,x.topicKey).theory&&topicStatus(state,x.topicKey).practice)))
     .map(x=>({...x,minutes:mode==="short"?25:mode==="light"?45:75}));
 }
 if(day!==currentDate||!state.curriculumAssignments?.[day]&&Array.isArray(state.assignments?.[day])&&
   state.assignments[day].some(id=>state.completed?.[id]||state.notes?.[id]))
   return legacyAgenda(state,day,mode,currentDate);
 const assigned=assign(state,day,state.startDate,legacyPlan);
 if(!assigned)return legacyAgenda(state,day,mode,currentDate);
 const count=mode==="short"?1:mode==="light"?2:mode==="off"?0:3;
 const stillRelevant=assigned.filter(item=>{
   const progress=topicStatus(state,item.topicKey);
   if(state.completed?.[item.id])return true; // Historical completion stays visible.
   if(item.phase==="theory"&&progress.theory)return false;
   if(item.phase==="practice"&&(!progress.theory||progress.practice))return false; // Never show exercises before theory is marked studied.
   if(item.phase==="integrated"&&progress.theory&&progress.practice)return false;
   return true;
 });
 const work=stillRelevant.slice(0,count).map((item,i)=>({...item,minutes:mode==="short"?25:mode==="light"?[45,35][i]:item.minutes}));
 if(mode!=="off"){
   const reviews=legacyPlan(day,state.startDate,state.reviews,mode).find(x=>x.kind==="review");
   if(reviews)work.push({...reviews,id:day+":3",slot:count,minutes:10});
 }
 return work;
}
function readyForCompletion(state,entry){
 if(!entry?.topicKey||!Object.hasOwn(records,entry.topicKey))return true;
 const x=topicStatus(state,entry.topicKey);
 if(!x.ready)return false;
 if(entry.phase==="theory")return true;
 if(entry.phase==="practice")return x.theory;
 if(entry.phase==="integrated")return true;
 return false;
}
function markCompletion(state,entry,completed){
 if(!entry?.topicKey||!Object.hasOwn(records,entry.topicKey))return;
 if(!state.topicProgress)state.topicProgress={};
 const progress=state.topicProgress[entry.topicKey]||{};
 if(completed){
   if(entry.phase==="theory"||entry.phase==="integrated")progress.theory=true;
   if(entry.phase==="practice"||entry.phase==="integrated")progress.practice=true;
 }else{
   if(entry.phase==="practice"||entry.phase==="integrated")progress.practice=false;
   if(entry.phase==="theory"||entry.phase==="integrated")progress.theory=false;
 }
 state.topicProgress[entry.topicKey]=progress;
}
function debtSummary(state,date){
 const asOf=new Date(date+"T12:00:00"),first=new Date(state.startDate+"T12:00:00");
 const currentWeek=Math.max(0,Math.floor((asOf-first)/604800000));
 const previousWeekTopics=currentWeek*3;
 const previousDays=Math.max(0,Math.min(5,(asOf.getDay()+6)%7));
 const expected=Math.max(0,Math.min(78,previousWeekTopics+Math.floor(previousDays*3/5)));
 let total=0,overdue=0,oldest=null;
 for(const subject of D.subjectOrder){
   order[subject].forEach((key,i)=>{
     const st=topicStatus(state,key);
     if(st.theory&&st.practice)return;
     total++;
     if(i<expected){
       overdue++;
       if(oldest===null)oldest=state.startDate;
     }
   });
 }
 return{total,overdue,oldest};
}
function queue(state){
 const merged=[];
 for(let i=0;i<78;i++)for(const subject of D.subjectOrder){
   const key=order[subject][i],status=topicStatus(state,key);
   if(status.theory&&status.practice)continue;
   merged.push({...records[key],...status});
 }
 return merged;
}
function projectedWeek(subject,week){return order[subject].slice(week*3,week*3+3).map(id=>records[id]);}
window.EGE_CURRICULUM={records,order,placement,risks:risk,canonicalInversions,topicStatus,unmet,prerequisitePath,nextSubject,eligible,
 migrateLegacy,assign,agenda,readyForCompletion,markCompletion,projectedWeek,debtSummary,queue,meta:{
 year:2027,source:"https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
 status:"FIPI project 2027; verify against approved documents on publication",
 subjects:{bio:"7 broad content areas",chem:"General, inorganic, organic, calculation, experiment",math:"2027 profile: 20 tasks including new 6,13,17"},
 version:"2.1-canonical-sequence-and-formal-eligibility"
}};
})();