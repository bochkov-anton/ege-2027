import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{},Number,Math});
vm.runInContext(readFileSync(new URL("../wellbeing.js",import.meta.url),"utf8"),ctx);
const W=ctx.window.EGE_WELLBEING;
const order={off:0,short:1,light:2,normal:3};
test("сон 8–10 ч защищён календарным ограничением (AASM)",()=>{
  const d=W.computeDay();
  assert.equal(d.targetSleepHours,8.5);
  assert.equal(d.wakeTime,"07:00");
  assert.equal(d.bedTime,"22:30");
  assert.equal(d.screensOff,"22:00");
  assert.equal(d.studyMinutes,160);
  assert.ok(d.availableMinutes>=d.wallMinutes);
});
test("ручная установка 160 мин не отменяет ограничение недосыпа",()=>{
  const x=W.computeDay({sleep:6,energy:"good",homework:0,manualMode:"normal"});
  assert.equal(x.mode,"off");
  assert.ok(x.notes.some(v=>v.includes("Ручной режим")));
});
test("нагрузка по школьному ДЗ монотонно сокращает ЕГЭ",()=>{
  let previous=4;
  for(const h of [0,30,60,90,120,150,180,210,240,300]){
    const d=W.computeDay({homework:h});
    assert.ok(order[d.mode]<=previous,"homework "+h);
    previous=order[d.mode];
    assert.ok(d.studyMinutes<=160);
    if(d.studyMinutes)assert.ok(d.finishEge<=d.screensOff||d.bedTime<d.screensOff);
  }
  assert.equal(W.computeDay({homework:90}).mode,"light");
  assert.equal(W.computeDay({homework:150}).mode,"short");
  assert.equal(W.computeDay({homework:210}).mode,"off");
});
test("сон менее восьми часов снижает нагрузку, выбор дня отдыха допустим",()=>{
  assert.equal(W.computeDay({sleep:7.5}).mode,"light");
  assert.equal(W.computeDay({sleep:6.75}).mode,"short");
  assert.equal(W.computeDay({sleep:5.5}).mode,"off");
  assert.equal(W.computeDay({manualMode:"off"}).mode,"off");
});
test("нагрузка сокращается при более раннем подъёме или длительной дороге",()=>{
  const base=W.computeDay({sleepTarget:9,commute:30});
  const early=W.computeDay({sleepTarget:10,commute:90});
  assert.ok(early.availableMinutes<base.availableMinutes);
  assert.ok(early.studyMinutes<=base.studyMinutes);
});
test("поздний час не разрешает новую учебную сессию",()=>{
  assert.equal(W.computeDay({nowMinute:22*60+10}).mode,"off");
  assert.equal(W.computeDay({schoolEnd:"23:00",homework:0}).mode,"off");
  assert.equal(W.computeDay({nowMinute:19*60,homework:60}).mode,"light");
});
test("защита от неверных входов и несуществующих времен",()=>{
  const x=W.computeDay({wakeTime:"25:99",schoolEnd:"bad",sleepTarget:999,homework:-100,commute:999,energy:"other"});
  assert.ok(x.targetSleepHours<=10&&x.targetSleepHours>=8);
  assert.equal(x.wakeTime,"07:00");
  assert.ok(x.studyMinutes>=0&&x.studyMinutes<=160);
  assert.equal(x.homeworkMinutes,0);
});
test("вычисление всегда конечное и не выходит за защищённое окно сна",()=>{
 for(const wakeTime of ["05:00","06:00","07:00","08:30","09:00"])
  for(const sleepTarget of [8,8.5,9,10])
   for(const homework of [0,60,120,180,240]){
    const x=W.computeDay({wakeTime,sleepTarget,homework});
    assert.ok(Number.isFinite(x.availableMinutes));
    assert.ok(x.availableMinutes>=x.wallMinutes);
    if(x.studyMinutes){
      assert.ok(x.finishMinute<=x.screensOffMinute,JSON.stringify({wakeTime,sleepTarget,homework,x}));
    }
   }
});
