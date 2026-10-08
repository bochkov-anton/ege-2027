import test from "node:test";import assert from "node:assert/strict";import vm from "node:vm";import{readFileSync}from"node:fs";
const c=vm.createContext({window:{},Date,URL});
for(const file of ["data.js","logic.js","curriculum.js","lesson-content.js","topic-practice.js"])
 vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),c,{filename:file});
const D=c.window.EGE_DATA,L=c.window.EGE_LOGIC,C=c.window.EGE_CURRICULUM;
test("все 234 темы имеют DAG без циклов и зависимость идёт раньше темы",()=>{
 assert.equal(Object.keys(C.records).length,234);
 let edges=0;
 for(const subject of D.subjectOrder){
  const seq=C.order[subject];assert.equal(seq.length,78);
  assert.equal(new Set(seq).size,78);
  const pos=new Map(seq.map((id,i)=>[id,i]));
  for(const id of seq){
   assert.equal(C.records[id].subject,subject);
   assert.equal(C.records[id].title,D.subjects[subject].weeks[C.records[id].week][C.records[id].index]);
   for(const dep of C.records[id].prerequisites){
    assert.ok(pos.has(dep)&&pos.get(dep)<pos.get(id),id+" missing prerequisite "+dep);
    edges++;
   }
  }
 }
 assert.ok(edges>=170,"Not enough real documented prerequisite edges: "+edges);
 assert.ok(C.risks.length>=12,"The old calendar must be demonstrably unsafe");
});
test("органика изучается только после основ, а не на второй неделе по дате",()=>{
 for(const needed of ["chem:10:0","chem:9:0"]){
  assert.ok(C.order.chem.indexOf(needed)<C.order.chem.indexOf("chem:2:2"),needed);
 }
 for(const needed of ["chem:11:0","chem:11:1"]){
  assert.ok(C.order.chem.indexOf(needed)<C.order.chem.indexOf("chem:4:2"),needed);
 }
 assert.ok(C.order.math.indexOf("math:5:1")<C.order.math.indexOf("math:4:2"));
  assert.ok(C.order.math.indexOf("math:4:2")<C.order.math.indexOf("math:5:2"));
  assert.ok(C.order.chem.indexOf("chem:2:1")<C.order.chem.indexOf("chem:2:0"));
  assert.ok(C.order.math.indexOf("math:5:1")<C.order.math.indexOf("math:5:2"));
 assert.ok(C.order.bio.indexOf("bio:6:1")<C.order.bio.indexOf("bio:7:0"));
});
test("новый день начинается с теории и не отдаёт готовую практику без её освоения",()=>{
 const st=L.safeState({startDate:"2026-10-05"},"2026-10-05");
 const a=C.agenda(st,"2026-10-05","normal","2026-10-05",L.planDay,L.studyAgenda);
 assert.equal(a.length,4);
 assert.deepEqual(Array.from(a.slice(0,3).map(x=>x.kind)),["new","practice","new"]);
 assert.equal(a[0].topicKey,a[1].topicKey);
 assert.equal(C.readyForCompletion(st,a[1]),false,"Практику нельзя засчитывать прежде теории");
 assert.equal(C.readyForCompletion(st,a[0]),true);
 C.markCompletion(st,a[0],true);
 assert.equal(C.readyForCompletion(st,a[1]),true);
 C.markCompletion(st,a[1],true);
 assert.equal(C.topicStatus(st,a[0].topicKey).practice,true);
 assert.equal(C.unmet(st,"chem:2:2").length>0,true);
});
test("назначение для даты неизменно после прогресса, общие идентификаторы не перезаписываются",()=>{
 const st=L.safeState({startDate:"2026-10-05"},"2026-10-05");
 const day="2026-10-05",a=C.agenda(st,day,"normal",day,L.planDay,L.studyAgenda);
 const oldIds=a.filter(x=>x.topicKey).map(x=>x.topicKey);
 C.markCompletion(st,a[0],true);
 const b=C.agenda(st,day,"normal",day,L.planDay,L.studyAgenda);
 assert.deepEqual(Array.from(st.curriculumAssignments[day].map(x=>x.topicKey)),Array.from(oldIds));
 assert.ok(!b.some(x=>x.phase==="theory"&&x.topicKey===a[0].topicKey),
   "Уже пройденная теория не дублируется в видимом плане");
 const next=C.agenda(st,"2026-10-06","normal","2026-10-06",L.planDay,L.studyAgenda);
 assert.ok(next.find(x=>x.kind==="practice"),"Unfinished practice is carried over");
});
test("архивные завершения мигрируют по старым ID только при подтверждении двух этапов",()=>{
 const date="2026-10-05",d=L.safeState({startDate:date,completed:{[date+":0"]:"chem"}},date);
 C.migrateLegacy(d,L.planDay);
 const old=L.planDay(date,date,{},"normal")[0].topicKey;
 assert.equal(C.topicStatus(d,old).theory,true);
 assert.equal(C.topicStatus(d,old).practice,false);
 d.completed[date+":1"]="chem";C.migrateLegacy(d,L.planDay);
 assert.equal(C.topicStatus(d,old).practice,true);
 assert.ok(d.completed[date+":0"],"Historical completion remains");
});
test("при наличии уже начатого старого дня новые назначения его не переписывают",()=>{
 const day="2026-10-05",old=[day+":0",day+":1",day+":2"];
 const st=L.safeState({startDate:day,assignments:{[day]:old},completed:{[day+":0"]:"chem"}},day);
 const answer=C.assign(st,day,st.startDate,L.planDay);
 assert.equal(answer,null);
 assert.equal(st.curriculumAssignments[day],undefined);
});
test("краткий режим и выходные не увеличивают учебную нагрузку",()=>{
 const st=L.safeState({startDate:"2026-10-05"},"2026-10-05");
 assert.equal(C.agenda(st,"2026-10-10","normal","2026-10-10",L.planDay,L.studyAgenda).length,0);
 assert.equal(C.agenda(st,"2026-10-05","off","2026-10-05",L.planDay,L.studyAgenda).length,0);
 assert.ok(C.agenda(st,"2026-10-06","short","2026-10-06",L.planDay,L.studyAgenda).length<=2);
});

test("старая незакрытая практика не остаётся дубликатом после завершения темы через другой день",()=>{
 const st=L.safeState({startDate:"2026-10-05"},"2026-10-05"),first="2026-10-05",second="2026-10-07";
 const original=C.agenda(st,first,"normal",first,L.planDay,L.studyAgenda);
 const later=C.agenda(st,second,"normal",second,L.planDay,L.studyAgenda);
 const previousPractice=original.find(x=>x.phase==="practice");
 const repeated=later.find(x=>x.topicKey===previousPractice.topicKey);
 assert.ok(repeated,"На следующий день незавершённая практика повторяется");
 C.markCompletion(st,previousPractice,true);
 C.markCompletion(st,original[0],true);
 const refresh=C.agenda(st,second,"normal",second,L.planDay,L.studyAgenda);
 assert.ok(!refresh.some(x=>x.topicKey===previousPractice.topicKey&&x.phase==="practice"),
   "После зачёта старого блока дубликат должен исчезнуть");
});

test("старый третий блок сохраняет факт изучения, практика — только по результату 80%",()=>{
 const first="2026-10-05",date=first;
 const oldTasks=L.planDay(first,first,{},"normal"),secondary=oldTasks.find(t=>t.id===date+":2");
 assert.ok(secondary?.topicKey);
 const state=L.safeState({startDate:first,completed:{[date+":2"]:secondary.subject},results:{[date+":2"]:{correct:7,total:8,subject:secondary.subject,topicKey:secondary.topicKey}}},first);
 C.migrateLegacy(state,L.planDay);
 assert.equal(C.topicStatus(state,secondary.topicKey).theory,true);
 assert.equal(C.topicStatus(state,secondary.topicKey).practice,true);
 assert.equal(state.completed[date+":2"],secondary.subject);
 const low=L.safeState({startDate:first,completed:{[date+":2"]:secondary.subject},results:{[date+":2"]:{correct:1,total:8}}},first);
 C.migrateLegacy(low,L.planDay);
 assert.equal(C.topicStatus(low,secondary.topicKey).theory,true);
 assert.equal(C.topicStatus(low,secondary.topicKey).practice,false);
});
test("ранние темы не требуют ещё не изученных ОВР, изомерии или логарифмов",()=>{
 assert.ok(!/изомер|ОВР|номенклатур/i.test(D.subjects.chem.weeks[0][2]));
 assert.ok(!/логарифм/i.test(D.subjects.math.weeks[0][1]));
 assert.equal(C.records["chem:1:2"].title,D.subjects.chem.weeks[0][2]);
 assert.equal(C.records["math:1:1"].title,D.subjects.math.weeks[0][1]);
});

test("зависимости раскрываются рекурсивно, показывая самый ранний пробел первым",()=>{
 const s=L.safeState({startDate:"2026-10-05"},"2026-10-05");
 const path=C.prerequisitePath(s,"chem:2:2");
 assert.ok(path.length>=4);
 const ids=path.map(x=>x.id);
 assert.ok(ids.indexOf("chem:1:0")<ids.indexOf("chem:1:1"));
 assert.ok(ids.indexOf("chem:10:0")<ids.indexOf("chem:9:0"));
 assert.ok(ids.indexOf("chem:9:0")<ids.indexOf("chem:2:2")||!ids.includes("chem:2:2"));
 assert.ok(path.every(x=>x.subject==="chem"&&!x.theoryDone&&!x.practiceDone));
 C.markCompletion(s,{topicKey:"chem:1:0",phase:"theory"},true);
 const newPath=C.prerequisitePath(s,"chem:2:2");
 assert.ok(newPath.find(x=>x.id==="chem:1:0")?.theoryDone);
 C.markCompletion(s,{topicKey:"chem:1:0",phase:"practice"},true);
 assert.ok(!C.prerequisitePath(s,"chem:2:2").some(x=>x.id==="chem:1:0"));
});
test("зависимости ФИПИ-2027: базовые вероятности, затем распределения; тригонометрия после формул",()=>{
 const order=C.order.math;
 assert.ok(order.indexOf("math:2:0")<order.indexOf("math:2:2"));
 assert.ok(order.indexOf("math:5:1")<order.indexOf("math:4:2"));
 assert.ok(order.indexOf("math:4:2")<order.indexOf("math:5:2"));
 const c=C.order.chem;
 assert.ok(c.indexOf("chem:2:1")<c.indexOf("chem:2:0"));
 assert.ok(c.indexOf("chem:5:1")<c.indexOf("chem:3:0"));
});
test("все 234 узла достигаются на тренировочном графе, не нарушая порядок",()=>{
 const s=L.safeState({startDate:"2026-10-05"},"2026-10-05");
 let seen=0;
 for(const subject of D.subjectOrder){
  for(let i=0;i<78;i++){
   const next=C.nextSubject(s,subject);
   assert.ok(next,subject+" deadlock at "+i);
   assert.equal(C.unmet(s,next.id).length,0,next.id);
   assert.equal(next.status.theory,false);
   C.markCompletion(s,{topicKey:next.id,phase:"theory"},true);
   assert.equal(C.eligible(s,next.id,"practice"),true);
   C.markCompletion(s,{topicKey:next.id,phase:"practice"},true);
   assert.equal(C.topicStatus(s,next.id).practice,true);
   seen++;
  }
  assert.equal(C.nextSubject(s,subject),null);
 }
 assert.equal(seen,234);
});
