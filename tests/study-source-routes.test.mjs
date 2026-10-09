import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const v=vm.createContext({window:{},console,URL,encodeURIComponent});
for(const f of ["data.js","curriculum.js","lesson-content.js","theory-core.js","topic-practice.js","verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js","study-source-routes.js"])
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),v,{filename:f});
const W=v.window,full=W.EGE_STUDY_SOURCES;
test("каждое из 234 занятий получает доказательную карту ресурсов",()=>{
 assert.equal(full.stats.topics,234);
 assert.equal(full.stats.theoryTopics,163);
 assert.equal(full.stats.reviewTopics,71);
 assert.equal(full.stats.components,435);
 for(const topic of Object.values(full.all)){
  assert.ok(topic.components.length>0,topic.id);
  assert.ok(topic.bookReadings.length||topic.practiceCategories.length||topic.supplementaryArticles.length,topic.id+" must have materials");
  for(const r of topic.bookReadings){
   assert.ok(/^https:\/\//.test(r.source),topic.id);
   assert.ok(r.isbn&&r.page>0&&r.heading,topic.id+" exact textbook and page");
   assert.equal(r.verification,"verified_toc_only");
  }
  for(const c of topic.components){
   assert.ok(c.label.length>=2,topic.id);
   if(c.specificallyRelatedParagraphs.length){
    assert.ok(c.specificallyRelatedParagraphs.every(r=>r.verification==="verified_toc_only"));
   }
   if(c.article) assert.ok(["source_excerpt_verified","editorial_link_selected"].includes(c.article.verification));
  }
 }
});
test("для составного урока связь/решётки/степени окисления указаны разные страницы",()=>{
 const x=full.get("chem:1:1");
 assert.equal(x.components.length,3);
 assert.ok(x.components[0].specificallyRelatedParagraphs.some(b=>b.number===53));
 assert.ok(x.components[1].specificallyRelatedParagraphs.some(b=>[54,55].includes(b.number)));
 assert.ok(x.components[2].article.url.includes("stepeni-okisleniya"));
});
test("диагностические варианты получают маршрут повторения предыдущих уроков",()=>{
 for(const subject of ["bio","chem","math"]){
  const key=subject+":26:0",x=full.get(key);
  assert.equal(x.type,"review_or_assessment");
  assert.ok(x.bookReadings.some(x=>x.fromTopic));
  assert.ok(x.bookReadings.every(r=>r.verification==="verified_toc_only"));
 }
 const first=full.get("math:1:0");
 assert.ok(first.practiceCategories.some(r=>r.verification==="official_fipi_archive"));
 assert.equal(first.bookReadings.length,0);
});
test("ресурсы защищены от переприсвоения проверки содержания по заголовку",()=>{
 for(const x of Object.values(full.all)){
  for(const c of x.components){
   if(!c.article)assert.ok(c.evidence!=="page_content_reviewed",x.id);
  }
  for(const r of x.practiceCategories)assert.ok(["category_title_only","official_fipi_archive"].includes(r.verification));
 }
});
