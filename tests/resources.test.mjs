import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{}});
for(const file of ["data.js","wellbeing.js","logic.js","resources.js"])vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),ctx,{filename:file});
const {EGE_DATA:D,EGE_LOGIC:L,EGE_RESOURCES:R}=ctx.window;
test("все 234 тематические карточки получают практику и полезные ссылки",()=>{
  let topics=0;
  for(const subject of D.subjectOrder) for(let w=0;w<26;w++) for(const title of D.subjects[subject].weeks[w]){
    topics++;
    const refs=R.forTopic(subject,w,title);
    assert.ok(refs.length>=2,subject+" "+w);
    assert.ok(refs.every(v=>v.url.startsWith("https://") && v.title.length>5));
    assert.ok(R.practicePlan(subject,"new",w,title).length>=2);
    assert.ok(R.practicePlan(subject,"practice",w,title).length>=2);
    assert.ok(R.weeklyEssentials(subject,w).length>=2);
  }
  assert.equal(topics,234);
});
test("все учебные адреса — устойчивые страницы вместо прямых PDF или видео",()=>{
  const allowed=new Set([
    "https://fipi.ru/navigator-podgotovki/navigator-ege",
    "https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege",
    "https://fipi.ru/ege/demoversii-specifikacii-kodifikatory",
    "https://bio-ege.sdamgia.ru/prob_catalog",
    "https://chem-ege.sdamgia.ru/prob_catalog",
    "https://math-ege.sdamgia.ru/prob_catalog"
  ]);
  for(const sub of D.subjectOrder)for(let w=0;w<26;w++)for(const title of D.subjects[sub].weeks[w]){
    const resources=R.forTopic(sub,w,title);
    for(const resource of resources){
      assert.ok(allowed.has(resource.url),resource.url);
      assert.ok(!/\.pdf|rutube|math100/i.test(resource.url));
      assert.ok(resource.hint?.length>20);
    }
  }
});
test("подсказки по разделам остаются предметными",()=>{
  const g=R.forTopic("bio",7,"Генетика: моногибридное скрещивание");
  assert.ok(g[0].hint.includes("Организм"));
  const c=R.forTopic("chem",10,"Альдегиды, кетоны, изомерия");
  assert.ok(c[0].title.includes("Органическая"));
  const m=R.forTopic("math",11,"Логарифмические неравенства");
  assert.ok(m[0].title.includes("Неравенства"));
});
test("план сохраняет математике один длинный день в неделю",()=>{
  const weekA=[0,1,2,3,4].map(i=>L.planDay(L.iso(L.move(L.parseDate("2026-10-05"),i)),"2026-10-05"));
  const tuesday=weekA[1];
  assert.equal(tuesday[0].subject,"math");
  assert.equal(tuesday[1].subject,"math");
  assert.equal(tuesday[0].minutes+tuesday[1].minutes,105);
  assert.ok(weekA.every(p=>new Set(p.slice(0,3).map(x=>x.subject)).size===2));
});
