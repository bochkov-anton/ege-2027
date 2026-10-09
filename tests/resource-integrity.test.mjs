import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import{readFileSync}from"node:fs";
const x=vm.createContext({window:{},console,encodeURIComponent});
for(const f of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","fipi-supplements.js","resource-integrity.js","curriculum.js"]){
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),x,{filename:f});
}
const W=x.window,T=W.EGE_THEORY,P=W.EGE_PRACTICE,L=W.EGE_LESSONS,Q=W.EGE_RESOURCE_INTEGRITY,C=W.EGE_CURRICULUM;
test("по всем 234 темам источники имеют семантическое основание или явно скрываются",()=>{
 let lessons=0,kept=0,removed=0;
 for(const sub of W.EGE_DATA.subjectOrder)for(let week=1;week<=26;week++)for(let i=0;i<3;i++){
  const id=sub+":"+week+":"+i,item=L.get(id);
  const r=P.get(id);
  lessons++;kept+=r.sources.length;removed+=r.resourceAudit.hidden;
  assert.ok(item&&r);
  assert.ok(r.sources.every(z=>z.skillTags.length>=1));
  for(const source of r.sources){
   assert.ok(source.url.startsWith("https://"));
   assert.ok(["topic","partial"].includes(source.coverage));
   assert.equal(source.confidence,"catalog_title_matching_only");
   const titleTags=Q.tags(sub,source.title);
   assert.ok(source.skillTags.some(tag=>titleTags.includes(tag)),id+" no topic match "+source.title);
  }
 }
 assert.equal(lessons,234);
 assert.ok(removed>0,"ошибочные ссылки нельзя оставлять без проверки");
 assert.ok(kept>0,"проверенные тематические категории не должны исчезать");
 assert.equal(Q.report.kept,kept);
 assert.equal(Q.report.hidden,removed);
});
test("характерные ошибки соответствий Фоксфорда исключены",()=>{
 for(const id of ["bio:1:0","chem:1:2","math:1:1","bio:21:0"]){
  const r=L.get(id),theory=T.get(id,r.subject,r.title,r);
  assert.equal(theory.articles.length,0,id+" still shows unrelated article");
 }
 assert.ok(T.get("bio:1:2","bio",L.get("bio:1:2").title,L.get("bio:1:2")).articles.length>0);
 assert.ok(T.get("bio:3:0","bio",L.get("bio:3:0").title,L.get("bio:3:0")).articles[0].url.includes("transkriptsiya"));
 assert.ok(T.get("math:2:2","math",L.get("math:2:2").title,L.get("math:2:2")).articles[0].url.includes("zadanie-6"));
});
test("ошибочные ссылки на задания скрываются",()=>{
 const forbidden={
 "bio:9:0":/Вегетативные органы растений/,
 "chem:1:2":/Окислител|восстановител/,
 "math:1:1":/логарифм/i,
 "bio:21:0":/Экологич/,
 "math:23:0":/Вероятност|Тригонометрич/i
 };
 for(const [key,rule]of Object.entries(forbidden)){
  assert.ok(!P.get(key).sources.some(s=>rule.test(s.title)),key);
 }
 const early=P.get("bio:1:0").sources;
 assert.ok(early.some(x=>/Методы.*исследован/.test(x.title)));
 const maths=P.get("math:1:1").sources;
 assert.ok(maths.some(x=>/рациональн/i.test(x.title)));
});
test("полный пробник не выдаёт тренировку одной линии за весь вариант",()=>{
 for(const key of ["bio:24:0","chem:20:0","math:19:0","math:23:0","math:26:0"]){
  assert.equal(P.get(key).sources.length,0,key);
 }
});
test("весь граф зависимостей остаётся ациклическим, ссылки не меняют учебный порядок",()=>{
 for(const sub of W.EGE_DATA.subjectOrder){
  const order=C.order[sub],position=new Map(order.map((id,i)=>[id,i]));
  assert.equal(order.length,78);
  for(const key of order)for(const before of C.records[key].prerequisites)
   assert.ok(position.get(before)<position.get(key),key+" "+before);
 }
});
