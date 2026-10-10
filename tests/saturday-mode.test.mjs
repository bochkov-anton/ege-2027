import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const context=vm.createContext({window:{},Date,Intl,console});
for(const name of ["data.js","wellbeing.js","logic.js","curriculum.js"])
 vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),context,{filename:name});
const L=context.window.EGE_LOGIC,C=context.window.EGE_CURRICULUM;
const start="2026-10-05",sat="2026-10-10",sun="2026-10-11",mon="2026-10-12";
const state=()=>L.safeState({startDate:start},start);
test("суббота изначально свободна, воскресенье всегда свободно",()=>{
 const s=state();
 assert.equal(L.isStudyDay(sat),false);
 assert.equal(L.saturdaySession(s,sat),null);
 assert.equal(L.canStudyToday(s,sat),false);
 assert.equal(C.agenda(s,sat,"normal",sat,L.planDay,L.studyAgenda).length,0);
 assert.equal(C.agenda(s,sun,"normal",sun,L.planDay,L.studyAgenda).length,0);
 assert.equal(C.assign(s,sat,start,L.planDay).length,0);
 assert.equal(s.curriculumAssignments[sat],undefined);
 assert.equal(L.shiftStudyDays("2026-10-09",1),mon);
});
test("добровольная субботняя тема закрепляется за датой и сохраняет пререквизиты",()=>{
 const s=state();s.saturdaySessions[sat]={kind:"lesson",subject:"chem"};
 const tasks=C.agenda(s,sat,"normal",sat,L.planDay,L.studyAgenda);
 assert.equal(tasks.length,1);
 const task=tasks[0];
 assert.equal(task.id,sat+":0");
 assert.equal(task.subject,"chem");
 assert.equal(task.phase,"integrated");
 assert.equal(task.minutes,75);
 assert.ok(C.readyForCompletion(s,task));
 assert.equal(C.agenda(s,sat,"light",sat,L.planDay,L.studyAgenda)[0].minutes,45);
 assert.equal(C.agenda(s,sat,"short",sat,L.planDay,L.studyAgenda)[0].minutes,25);
 assert.equal(C.agenda(s,sat,"off",sat,L.planDay,L.studyAgenda).length,0);
 assert.equal(C.agenda(s,"2026-10-17","normal","2026-10-17",L.planDay,L.studyAgenda).length,0);
 assert.equal(C.agenda(s,sun,"normal",sun,L.planDay,L.studyAgenda).length,0);
 assert.equal(s.curriculumAssignments[sat][0].topicKey,task.topicKey);
 s.topicProgress[task.topicKey]={theory:true,practice:true};
 assert.equal(s.curriculumAssignments[sat][0].topicKey,task.topicKey);
});
test("добровольное повторение не назначает обязательные блоки и не создаёт долг",()=>{
 const s=state();s.saturdaySessions[sat]={kind:"review"};
 assert.equal(L.canStudyToday(s,sat),true);
 assert.equal(C.agenda(s,sat,"normal",sat,L.planDay,L.studyAgenda).length,0);
 assert.equal(Object.keys(s.curriculumAssignments).length,0);
 assert.equal(C.debtSummary(s,sat).overdue,C.debtSummary(state(),sat).overdue);
 const key="bio:1:0";
 s.reviews[key]={subject:"bio",title:"Методы биологии",due:"2026-10-09",stage:0,successes:0};
 assert.equal(L.rateReview(s,key,"hard",sat),true);
 assert.equal(s.reviews[key].due,mon);
});
test("после освоения субботней темы будущее будничное назначение видит факт освоения",()=>{
 const s=state();s.saturdaySessions[sat]={kind:"lesson",subject:"chem"};
 const task=C.agenda(s,sat,"normal",sat,L.planDay,L.studyAgenda)[0];
 C.markCompletion(s,task,true);
 const next=C.nextSubject(s,"chem");
 assert.ok(next&&next.id!==task.topicKey);
 assert.equal(C.topicStatus(s,task.topicKey).practice,true);
 assert.equal(s.curriculumAssignments[sat][0].topicKey,task.topicKey);
 assert.equal(C.agenda(s,sun,"normal",sun,L.planDay,L.studyAgenda).length,0);
});
test("испорченные или воскресные записи не включают учёбу",()=>{
 const s=L.safeState({startDate:start,saturdaySessions:{
  [sat]:{kind:"lesson",subject:"invalid"},
  [sun]:{kind:"review"},
  "2026-10-17":{kind:"review"},
  "2026-10-24":{kind:"lesson",subject:"math"}
 }},start);
 assert.equal(L.saturdaySession(s,sat),null);
 assert.equal(L.saturdaySession(s,sun),null);
 assert.ok(L.saturdaySession(s,"2026-10-17"));
 assert.ok(L.saturdaySession(s,"2026-10-24"));
 assert.equal(C.agenda(s,sun,"normal",sun,L.planDay,L.studyAgenda).length,0);
});
