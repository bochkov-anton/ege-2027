/* Generate a human-readable and machine-readable 234-topic source route.
 * Only verified table-of-contents metadata may be described as verified.
 * Never mark article/task content reviewed merely because its title matches.
 */
import vm from "node:vm";
import {readFileSync,writeFileSync} from "node:fs";
const ctx=vm.createContext({window:{},URL,encodeURIComponent,console});
for(const name of ["data.js","curriculum.js","lesson-content.js","theory-core.js","topic-practice.js",
 "verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js","study-source-routes.js"])
 vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),ctx,{filename:name});
const W=ctx.window,all=W.EGE_STUDY_SOURCES.all,stats=W.EGE_STUDY_SOURCES.stats;
const order=W.EGE_DATA.subjectOrder.flatMap(s=>W.EGE_CURRICULUM.order[s]);
if(order.length!==234||new Set(order).size!==234||order.some(id=>!all[id]))throw Error("Route must cover all topics");
for(const id of order){
 const r=all[id];
 if(!r.bookReadings.length&&!r.practiceCategories.length&&!r.supplementaryArticles.length)throw Error("No study evidence "+id);
 if(r.bookReadings.some(b=>!b.isbn||!Number.isInteger(b.page)))throw Error("Unverified edition "+id);
}
const editions=Object.fromEntries(Object.entries(W.EGE_VERIFIED_TOC.editions).map(([key,b])=>[key,
 {title:b.title,year:b.year,isbn:b.isbn,source:b.url}]));
const topics=order.map(id=>{
 const t=all[id];
 return {id:t.id,subject:t.subject,title:t.title,type:t.type,know:t.learningGoal,
  task:t.exercise,check:t.check,
  components:t.components.map(c=>({label:c.label,
   article:c.article?{title:c.article.title,url:c.article.url}:null,
   paragraphs:c.specificallyRelatedParagraphs.map(b=>({edition:b.editionId,number:b.number,pages:b.pagesLabel})),
   evidence:c.evidence})),
  books:t.bookReadings.map(b=>({edition:b.editionId,number:b.number,page:b.page,pages:b.pagesLabel,
   title:b.heading,fromTopic:b.fromTopic||null})),
  practice:t.practiceCategories.map(p=>({title:p.title,url:p.url,evidence:p.verification})),
  articles:t.supplementaryArticles.map(a=>({title:a.title,url:a.url})),
  reviewFrom:t.diagnosticsFrom.map(x=>x.id)};
});
const result={generated:"2026-10-09",status:"editorial_coverage_not_full_content_certification",
 description:"234 study routes; paragraph/page numbers verified by edition contents only; external tasks not individually verified",
 stats,editions,topics};
writeFileSync(new URL("../STUDY-SOURCE-ROUTES-2027.json",import.meta.url),JSON.stringify(result)+"\n");
const names={bio:"Биология",chem:"Химия",math:"Профильная математика"};
let md="# Источники и задания для всех 234 занятий ЕГЭ-2027\n\n"+
"Версия 9 октября 2026. Для учебных тем указаны адресные статьи и/или параграфы конкретных изданий. Для повторений — маршруты по ранее изученным разделам. "+
"Страницы сверены по оглавлениям ISBN, но это не доказывает покрытие каждого учебного вопроса текстом параграфа. Внешние категории задач требуют проверки содержания.\n\n"+
"Обозначения: **[статья]** — адресная ссылка; **[§]** — глава конкретного учебника; **[подборка]** — каталог задач по заголовку, не набор проверенных заданий.\n\n";
md+="## Издания и ISBN\n\n";
for(const [key,b] of Object.entries(W.EGE_VERIFIED_TOC.editions))
 md+="- **"+key+"**: "+b.title+"; ISBN "+b.isbn+"; [оглавление]("+b.url+").\n";
md+="\n";
for(const subject of W.EGE_DATA.subjectOrder){
 md+="## "+names[subject]+" (78 занятий)\n\n";
 for(let i=0;i<78;i++){
  const id=W.EGE_CURRICULUM.order[subject][i],t=all[id];
  md+="### "+(i+1)+". "+t.title+" \u2014 \u0060"+id+"\u0060\n\n";
  md+="**Знать:** "+t.learningGoal+"\n\n";
  md+="**Выполнить:** "+t.exercise+"\n\n";
  md+="**Проверка:** "+t.check+"\n\n";
  for(const c of t.components){
   md+="- **"+c.label+"**. ";
   if(c.article)md+="[статья] "+c.article.title+" \u2014 "+c.article.url+". ";
   if(c.specificallyRelatedParagraphs.length)
    md+="[§] "+c.specificallyRelatedParagraphs.map(b=>b.editionId+" §"+b.number+", с. "+b.pagesLabel).join("; ")+".";
   if(!c.article&&!c.specificallyRelatedParagraphs.length)
    md+="Точный источник для компонента не подтверждён: сверить опорные главы ниже по тексту.";
   md+="\n";
  }
  md+="\n";
  if(t.bookReadings.length){
   md+="**Чтение"+(t.type==="review_or_assessment"?" для адресного повторения":" по уроку")+"** (по оглавлению, ISBN):\n\n";
   for(const b of t.bookReadings)md+="- "+b.editionId+" §"+b.number+
    ", «"+b.heading+"», с. "+b.pagesLabel+
    (b.fromTopic?" (опора: "+b.fromTopic+")":"")+".\n";
   md+="\n";
  }
  if(t.practiceCategories.length){
   md+="**Практика/контроль:** "+t.practiceCategories.map(x=>"["+x.title+"]("+x.url+")").join("; ")+
     ". Содержимое каждого внешнего задания отдельно не удостоверено.\n\n";
  }else md+="**Практика/контроль:** выполнить действие из карточки и проверить по указанному критерию; неподтверждённую тематическую ссылку не добавляем.\n\n";
  md+="---\n\n";
 }
}
writeFileSync(new URL("../STUDY-SOURCE-ROUTES-2027.md",import.meta.url),md);
console.log(JSON.stringify({topics:order.length,markdownBytes:Buffer.byteLength(md),routeStats:stats}));
