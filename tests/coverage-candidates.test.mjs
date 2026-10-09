import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{},encodeURIComponent,URL});
for(const name of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js"])
 vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),ctx,{filename:name});
const W=ctx.window;
test("все 234 темы и все смысловые пункты имеют проверяемый статус материалов",()=>{
 let count=0,hasBooks=0,hasPractice=0;
 for(const row of Object.values(W.EGE_COVERAGE.all)){
  assert.ok(row.components.length>0,row.id);
  const original=W.EGE_READING.get(row.id).entries||[];
  const practice=W.EGE_PRACTICE.get(row.id).sources||[];
  for(const part of row.components){
   count++;
   const candidates=part.candidates;
   assert.ok(candidates&&Array.isArray(candidates.books)&&Array.isArray(candidates.practice)&&Array.isArray(candidates.articles));
   for(const book of candidates.books){
    assert.equal(book.status,"toc_heading_candidate");
    assert.ok(original.some(x=>x.title===book.title&&x.page===book.page));
    hasBooks++;
   }
   for(const item of candidates.practice){
    assert.equal(item.status,"category_heading_candidate");
    assert.ok(practice.some(x=>x.url===item.url));
    hasPractice++;
   }
   for(const item of candidates.articles){
    assert.equal(item.status,"article_heading_candidate");
    assert.ok(W.EGE_THEORY.get(row.id,row.subject,row.title,W.EGE_LESSONS.get(row.id)).articles.some(x=>x.url===item.url));
   }
  }
 }
 assert.equal(count,W.EGE_COVERAGE.report.parts);
 assert.ok(hasBooks>20,"Заголовки известных параграфов должны давать адресные подсказки");
 assert.ok(hasPractice>0,"Адресные категории задач должны сохраняться");
 assert.equal(W.EGE_COVERAGE.candidateReport.componentsWithCandidate+W.EGE_COVERAGE.candidateReport.componentsWithoutCandidate,count);
});
