import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const ctx=vm.createContext({window:{},Date,Intl,console});
for(const file of ["data.js","logic.js"])vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),ctx,{filename:file});
const D=ctx.window.EGE_DATA,L=ctx.window.EGE_LOGIC;
test("все три предмета имеют 26 недель с 3 темами",()=>{
  for(const key of D.subjectOrder){
    assert.equal(D.subjects[key].weeks.length,26,key);
    for(const [i,w] of D.subjects[key].weeks.entries()) {
      assert.equal(w.length,3,key+" неделя "+(i+1));
      assert.ok(w.every(t=>t.length>8));
    }
  }
});
test("учебные дни и выходные разделены",()=>{
  const start="2026-10-05";
  for(const d of ["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09"]){
    const plan=L.planDay(d,start);assert.equal(plan.length,4);
    assert.equal(plan.reduce((n,b)=>n+b.minutes,0),160);
    assert.ok(plan.every(x=>D.subjects[x.subject]));
  }
  assert.equal(L.planDay("2026-10-10",start).length,0);
  assert.equal(L.planDay("2026-10-11",start).length,0);
});
test("недели и смена предметов в A и B",()=>{
  const a=L.planDay("2026-10-05","2026-10-05");
  const b=L.planDay("2026-10-12","2026-10-05");
  assert.equal(a[0].subject,"chem");assert.equal(a[2].subject,"bio");
  assert.equal(b[0].subject,"bio");assert.equal(b[2].subject,"chem");
  assert.equal(L.weekNumber("2027-04-05","2026-10-05"),26);
  const continuation=L.planDay("2027-04-05","2026-10-05");
  assert.equal(continuation.length,4);
  assert.ok(continuation[0].title.length>15);
  assert.equal(continuation[0].topicKey,null);
});
test("DST не сбивает вычисление номера недели",()=>{
  assert.equal(L.weekNumber("2027-03-29","2026-10-05"),25);
  assert.equal(L.weekNumber("2027-03-28","2026-10-05"),24);
});
test("повторы никогда не падают на выходные",()=>{
  assert.equal(L.shiftStudyDays("2026-10-09",1),"2026-10-12");
  assert.equal(L.shiftStudyDays("2026-10-09",3),"2026-10-14");
  assert.equal(L.shiftStudyDays("2026-10-08",1),"2026-10-09");
});
test("после изучения тема получает повтор; не дублируется",()=>{
  const state=L.safeState(null,"2026-10-05");
  const task=L.planDay("2026-10-09","2026-10-05")[0];
  L.beginReview(state,task,"2026-10-09");
  assert.equal(state.reviews[task.topicKey].due,"2026-10-12");
  L.beginReview(state,task,"2026-10-09");
  assert.equal(Object.keys(state.reviews).length,1);
  const key=task.topicKey;
  assert.equal(L.rateReview(state,key,"easy","2026-10-12"),true);
  assert.equal(state.reviews[key].successes,1);
  assert.equal(state.reviews[key].due,"2026-10-15");
  assert.equal(L.rateReview(state,key,"hard","2026-10-15"),true);
  assert.equal(state.reviews[key].successes,0);
  assert.equal(state.reviews[key].due,"2026-10-16");
});
test("сниженная нагрузка и отдых не уничтожают программу",()=>{
  assert.equal(L.suggestDay({homework:60,sleep:8.5,energy:"ok"}),"normal");
  assert.equal(L.suggestDay({homework:90,sleep:8.5,energy:"ok"}),"light");
  assert.equal(L.suggestDay({homework:30,sleep:7,energy:"ok"}),"light");
  assert.equal(L.suggestDay({homework:120,sleep:6,energy:"low"}),"off");
  const light=L.planDay("2026-10-05","2026-10-05",{},"light");
  assert.equal(light.reduce((n,b)=>n+b.minutes,0),90);
  assert.equal(L.planDay("2026-10-05","2026-10-05",{},"off").length,0);
});
test("учёт завершений не меняется после переноса повторов",()=>{
  const state=L.safeState(null,"2026-10-05");
  const task=L.planDay("2026-10-05","2026-10-05")[0];
  state.completed[task.id]=task.subject;
  state.errors.push({done:false});
  assert.equal(L.stats(state).bySubject.chem,1);
  assert.equal(L.stats(state).openErrors,1);
});
