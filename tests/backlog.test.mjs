import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{},Date,Intl});
for(const file of ["data.js","logic.js"])
  vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),ctx,{filename:file});
const L=ctx.window.EGE_LOGIC;
const start="2026-10-05",thursday="2026-10-08";
test("четверг не перепрыгивает занятия понедельника при отсутствии отметок",()=>{
  const state=L.safeState(null,start);
  const pending=L.pendingStudy(state,thursday);
  assert.equal(pending.length,12);
  assert.equal(L.debtSummary(state,thursday).overdue,9);
  assert.equal(pending[0].originDate,"2026-10-05");
  const today=L.studyAgenda(state,thursday,"normal",thursday);
  assert.equal(today.length,4);
  assert.equal(today[0].id,"2026-10-05:0");
  assert.equal(today[1].id,"2026-10-05:1");
  assert.equal(today[2].id,"2026-10-05:2");
  assert.ok(today.slice(0,3).every(t=>t.isBacklog));
  assert.equal(today.reduce((sum,t)=>sum+t.minutes,0),160);
});
test("дневное назначение не сдвигается после одной завершённой задачи",()=>{
  const state=L.safeState(null,start);
  state.assignments[thursday]=L.pendingStudy(state,thursday).slice(0,3).map(t=>t.id);
  state.completed["2026-10-05:0"]="chem";
  const shown=L.studyAgenda(state,thursday,"normal",thursday);
  assert.deepEqual(Array.from(shown.slice(0,3),x=>x.id),Array.from(state.assignments[thursday]));
  assert.equal(L.debtSummary(state,thursday).overdue,8);
});
test("облегчённый день сокращает часы, а не выбрасывает незакрытые темы",()=>{
  const state=L.safeState(null,start);
  state.assignments[thursday]=["2026-10-05:0","2026-10-05:1","2026-10-05:2"];
  const light=L.studyAgenda(state,thursday,"light",thursday);
  assert.equal(light.reduce((sum,t)=>sum+t.minutes,0),90);
  assert.equal(light[0].id,"2026-10-05:0");
  assert.equal(light[1].id,"2026-10-05:1");
  assert.equal(L.debtSummary(state,thursday).total,12);
  assert.equal(L.studyAgenda(state,thursday,"off",thursday).length,0);
});
test("пропуск явный, повторения не превращаются в отдельный накопленный долг",()=>{
  const state=L.safeState(null,start);
  state.skipped["2026-10-05:0"]=true;
  state.reviews["bio:1:0"]={subject:"bio",due:"2026-10-05",title:"Проверка",stage:0};
  assert.equal(L.pendingStudy(state,thursday).length,11);
  assert.ok(!L.pendingStudy(state,thursday).some(t=>t.kind==="review"));
});
test("через 26 недель незавершённая база не исчезает ради новой темы",()=>{
  const state=L.safeState(null,start);
  const end="2027-04-05";
  const agenda=L.studyAgenda(state,end,"normal",end);
  assert.equal(agenda[0].id,"2026-10-05:0");
  assert.ok(L.debtSummary(state,end).total>0);
});
test("выходные всегда свободны даже при большом долге",()=>{
  const state=L.safeState(null,start);
  assert.equal(L.studyAgenda(state,"2026-10-10","normal","2026-10-10").length,0);
  assert.equal(L.studyAgenda(state,"2026-10-11","normal","2026-10-11").length,0);
});
