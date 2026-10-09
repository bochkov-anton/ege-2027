import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{},console});
for(const name of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","topic-coverage.js"])
 vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),ctx,{filename:name});
const W=ctx.window,C=W.EGE_COVERAGE;
test("все 234 темы имеют список проверяемых смысловых компонентов, без ложного зачёта источников",()=>{
 assert.equal(C.report.topics,234);
 assert.ok(C.report.reviewed>=13);
 assert.equal(C.report.unchecked+C.report.reviewed,234);
 for(const [id,row] of Object.entries(C.all)){
  assert.ok(row.components.length>=1,id);
  assert.ok(row.components.every(x=>x.label.length>=2),id);
  if(row.reviewed){
   assert.ok(row.components.every(x=>x.source?.url.startsWith("https://")&&["source_excerpt_verified","editorial_link_selected"].includes(x.evidence)),id);
  }else{
   assert.equal(row.status,"requires_editorial_content_review",id);
   assert.ok(row.components.every(x=>x.source===null&&x.evidence==="not_reviewed"),id);
  }
 }
 assert.equal(C.get("chem:99:1"),null);
 assert.equal(C.report.verifiedExcerptComponents,10);
 assert.equal(C.report.verifiedExcerptTopics,2);
 assert.equal(C.get("chem:1:1").verifiedContent,true);
 assert.equal(C.get("bio:11:0").verifiedContent,false);
});
test("химическая связь, кристаллические решётки и степени окисления — три РАЗНЫХ проверенных раздела",()=>{
 const row=C.get("chem:1:1");
 assert.equal(row.components.length,3);
 assert.equal(new Set(row.components.map(x=>x.source.url)).size,3);
 assert.match(row.components[0].source.url,/himicheskoy-svyazi$/);
 assert.match(row.components[1].source.url,/reshetok-i-fizicheskie-svoystva-veschestv$/);
 assert.match(row.components[2].source.url,/stepeni-okisleniya-i-valentnosti/);
 assert.ok(!row.notice.includes("покрывает тему полностью"));
});
test("гидролиз, pH и равновесие: отдельные аспекты, а не один ярлык; ионные уравнения тоже выделены",()=>{
 const a=C.get("chem:3:0");
 assert.equal(a.components.length,3);
 assert.ok(a.components.some(x=>/pH/.test(x.label)));
 assert.ok(a.components.some(x=>/Ле Шателье/.test(x.label)));
 assert.equal(new Set(a.components.map(x=>x.source.url)).size,2);
 const b=C.get("chem:2:0");
 assert.equal(b.components.length,3);
 assert.ok(b.components.some(x=>/растворимост/.test(x.label)));
});
test("биологические методы, уровни организации и вода с солями не подменяются одним материалом",()=>{
 const a=C.get("bio:1:0");
 assert.equal(a.components.length,3);
 assert.equal(new Set(a.components.map(x=>x.source.url)).size,3);
 assert.ok(a.components.some(x=>/Вода.*соли/.test(x.label)));
});
test("первый математический фундамент не подменяется ссылкой только на логарифмы",()=>{
 const row=C.get("math:1:1");
 assert.equal(row.reviewed,true);
 assert.equal(row.components.length,4);
 assert.ok(row.components.some(x=>/дроби/i.test(x.label)));
 assert.ok(row.components.some(x=>/дискриминант/i.test(x.label)));
 assert.ok(row.components.every(x=>!x.source.url.includes("logarifm")),row.id);
});
test("все материалы вне узкого редакционного списка не получают статус прочитанного содержания",()=>{
 for(const key of ["bio:1:2","math:3:2","bio:25:0"]){
  const row=C.get(key);
  assert.equal(row.reviewed,false,key);
  assert.ok(row.unmatched>=1);
 }
});
