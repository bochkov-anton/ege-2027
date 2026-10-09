/* Машинный реестр неподтверждённого ПОКРЫТИЯ, не ручная верификация. */
import vm from "node:vm";
import {readFileSync,writeFileSync} from "node:fs";
const ctx=vm.createContext({window:{},console,encodeURIComponent,URL});
for(const name of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js"])
 vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),ctx,{filename:name});
const W=ctx.window,cover=W.EGE_COVERAGE,lesson=W.EGE_LESSONS,practice=W.EGE_PRACTICE;
const topics=Object.values(cover.all).map(item=>{
 const sources=practice.get(item.id)?.sources||[];
 return {id:item.id,subject:item.subject,title:item.title,
  editorialContentReviewed:item.reviewed,
  subtopics:item.components.map(c=>({title:c.label,evidence:c.evidence,sourceUrl:c.source?.url||null,candidates:c.candidates})),
  reviewPriority:(item.reviewed?0:100)+(item.sourceCount?25:0)+(26-Number(item.id.split(":")[1]))*3,
  sourceReviewStatus:item.status,
  foxfordArticles:item.sourceCount,practiceCategoryLinks:sources.length,
  practiceVerification:"category_title_only_not_task_content",
  followUp:item.reviewed?
   "Проверить текст отдельных задач, покрытие учебника и соответствие ФИПИ":
   "Сопоставить каждую подтему с прочитанным текстом статьи, параграфа и условиями задач"};
});
if(topics.length!==234||new Set(topics.map(x=>x.id)).size!==234)throw Error("Coverage inventory must contain exactly 234 IDs");
const summary={total:topics.length,contentReviewed:topics.filter(x=>x.editorialContentReviewed).length,
 unreviewed:topics.filter(x=>!x.editorialContentReviewed).length,
 unreviewedWithLinks:topics.filter(x=>!x.editorialContentReviewed&&x.foxfordArticles>0).length,
 unreviewedWithoutFoxford:topics.filter(x=>!x.editorialContentReviewed&&x.foxfordArticles===0).length,
 subtopicRows:topics.reduce((n,x)=>n+x.subtopics.length,0),
  candidateHeadingsOnly:cover.candidateReport.componentsWithCandidate,
  withoutAnyHeadingCandidate:cover.candidateReport.componentsWithoutCandidate,
 bySubject:Object.fromEntries(W.EGE_DATA.subjectOrder.map(subject=>{
  const selected=topics.filter(x=>x.subject===subject);
  return [subject,{total:selected.length,reviewed:selected.filter(x=>x.editorialContentReviewed).length,
   notReviewed:selected.filter(x=>!x.editorialContentReviewed).length}];
 }))};
const out={date:"2026-10-09",note:"Ссылки на категории задач проверены по заголовку; совпадение с конкретными заданиями не доказано.",summary,topics:topics.sort((a,b)=>b.reviewPriority-a.reviewPriority||a.id.localeCompare(b.id))};
writeFileSync(new URL("../CONTENT-COVERAGE-AUDIT-2027.json",import.meta.url),JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify(summary));
