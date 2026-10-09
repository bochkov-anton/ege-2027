/* Полный маршрут источников для всех 234 занятий.
 * Опорные параграфы: сверены по оглавлению конкретного ISBN, не по полному тексту.
 * Практические категории: подтверждено соответствие заголовка, не задания.
 * Не присваивать статус "content-reviewed" без чтения настоящего материала.
 */
(function(){"use strict";
const D=window.EGE_DATA,C=window.EGE_CURRICULUM,R=window.EGE_READING,Q=window.EGE_COVERAGE,P=window.EGE_PRACTICE,L=window.EGE_LESSONS,T=window.EGE_THEORY;
if(!D||!C||!R||!Q||!P||!L||!T)throw Error("Load sources, coverage and dependency graph first");
const reviewedSet=new Set(["page_content_reviewed"]);
const concept=[
 [/связ/i,/связ|ковалент|ионн|металл/i],
 [/реш[её]тк|кристалл/i,/связ|ионн|металл|кристалл/i],
 [/окислен|валентн/i,/окислен|валентн|реакц/i],
 [/стехиометр|молярн|количеств.*веществ/i,/расчёт|газовы|вещества|количеств/i],
 [/pH|кислотност|реакц.*среды/i,/водородн|гидролиз|среды|равновес/i],
 [/амфотер/i,/алюмини|цинк|амфотер|оксид/i],
 [/осмос|плазмолиз|диффуз/i,/клетк|органоид|мембран/i],
 [/генетич.*код|трансляц|биосинтез/i,/биосинтез|нуклеинов/i],
 [/кроссинговер|мейоз/i,/мейоз|гамет/i],
 [/количеств.*реакц|ионн.*обмен/i,/раствор|ионн|реакц/i],
 [/гликолиз|дыхание|энергетич/i,/расщеплени|дыхани|обмен/i],
 [/математическ.*ожидан|дисперси|случайн.*величин|распределени/i,/вероятност|случайн|математическ/i],
 [/корн|степен|дроб/i,/степенн|корн|числа/i],
 [/определени.*функц|ОДЗ/i,/функц|уравнени|неравенств/i],
 [/эволюц|отбор|видообразован/i,/эволюц|отбор|вид|популяц/i],
 [/фотосинтез|хемосинтез/i,/синтез|фотосинтез/i]
];
const stems=x=>(String(x||"").toLowerCase().match(/[а-яёa-z]{5,}/g)||[]).map(k=>k.slice(0,6));
const stop=new Set(["задачи","основы","другие","данных","разбор","сравне","разные","методы","област","работы","приме","навыки","объект","услови","общая","практи","схемы"]);
function relevant(part,title){
 const a=stems(part),b=new Set(stems(title)),direct=a.some(k=>!stop.has(k)&&b.has(k));
 if(direct)return true;
 return concept.some(([topic,chapter])=>topic.test(part)&&chapter.test(title));
}
function toRef(x){return {editionId:x.editionId,edition:x.editionTitle,isbn:x.isbn,source:x.source,number:x.number,marker:x.marker,page:x.page,pagesLabel:x.pagesLabel,heading:x.title,verification:"verified_toc_only"};}
const mapping={};
function reachableReadings(id){
 const subject=C.records[id]?.subject;
 const seen=new Set([id]),candidates=[];
 const queue=[...(C.records[id]?.prerequisites||[])];
 while(queue.length&&seen.size<100){
  const x=queue.shift();
  if(seen.has(x))continue;
  seen.add(x);
  const entry=R.get(x).entries||[];
  if(entry.length)candidates.push({id:x,entries:entry});
  queue.push(...(C.records[x]?.prerequisites||[]));
 }
 if(!candidates.length){
  const order=C.order[subject]||[];
  for(let j=order.indexOf(id)-1;j>=0&&candidates.length<4;j--){
   const source=order[j],entries=R.get(source).entries||[];
   if(entries.length)candidates.push({id:source,entries});
  }
 }
 return candidates.slice(0,4);
}
for(const subject of D.subjectOrder)for(let week=1;week<=26;week++)for(let i=0;i<3;i++){
 const id=subject+":"+week+":"+i,record=C.records[id],lesson=L.get(id),coverage=Q.get(id);
 if(!record||!lesson||!coverage)throw Error("No canonical lesson "+id);
 const own=R.get(id).entries||[];
 const articles=T.get(id,subject,lesson.title,lesson).articles||[];
 const diagnostic=own.length===0&&articles.length===0;
 const support=diagnostic?reachableReadings(id):[];
 const readings=diagnostic?support.flatMap(x=>x.entries.map(v=>({...toRef(v),fromTopic:x.id,fromTitle:C.records[x.id].title}))):own.map(toRef);
 const unique=[...new Map(readings.map(x=>[x.editionId+":"+x.page,x])).values()].slice(0,12);
 const practice=P.get(id)?.sources||[];
 const officialFipi=subject==="math"?"https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/ma_11_2027.zip":
   subject==="bio"?"https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/bi_11_2027.zip":
   "https://doc.fipi.ru/ege/demoversii-specifikacii-kodifikatory/2027/hi_11_2027.zip";
 const fullExam=/(полный.*вариант|полноформатн|финальн.*вариант|пробник|вариант.*экзаменационн|экзаменационном режиме)/i.test(record.title);
 const officialPractice=(fullExam||(diagnostic&&!unique.length))?
   [{title:"Проект демоверсии ФИПИ-2027: архив заданий и спецификации",url:officialFipi,
     coverage:"official_exam_archive",verification:"official_fipi_archive"}]:[];
 const items=coverage.components.map(part=>{
  const matched=own.filter(x=>relevant(part.label,x.title)).map(toRef);
  const source=part.source?{title:part.source.title,url:part.source.url,verification:part.evidence}:null;
  return {label:part.label,article:source,
   specificallyRelatedParagraphs:matched.slice(0,5),
   chapterCandidates:(part.candidates?.books||[]).slice(0,2),
   unresolved:!source&&!matched.length,
   evidence:source?part.evidence:matched.length?"toc_heading_or_subject_match_not_article_content":"no_component_content_evidence"};
 });
 mapping[id]={id,title:record.title,subject,fullExam,type:diagnostic?"review_or_assessment":"theory_and_practice",
   components:items,
   bookReadings:unique,
   practiceCategories:[...practice.map(x=>({title:x.title,url:x.url,coverage:x.coverage||"heading_only",verification:"category_title_only",purpose:fullExam?"review_of_errors_only":"practice"})),...officialPractice],
   supplementaryArticles:articles.map(x=>({title:x.title,url:x.url,coverage:x.coverage||"partial"})),
   diagnosticsFrom:support.map(x=>({id:x.id,title:C.records[x.id].title})),
   exercise:lesson.doTask,learningGoal:lesson.know,check:lesson.check,
   workload:{referenceParagraphs:unique.length,components:items.length,
     large:!diagnostic&&(unique.length>=6||items.length>=5),
     budget:{theory:40,practice:25,recall:10},
     perComponentTheoryMinutes:Math.max(4,Math.floor(40/Math.max(1,items.length)))},
   notice:diagnostic?
     "Повторение и диагностика: перечитайте отмеченные источники из тем-основ по своим ошибкам; нового теоретического параграфа не назначено.":
     "Адресные статьи и параграфы конкретного ISBN перечислены ниже; назначение каждой подтемы ещё не означает проверки содержания всей главы или заданий."
 };
}
const all=Object.values(mapping);
const stats={topics:all.length,withBookBundle:all.filter(x=>x.bookReadings.length).length,
 noBookBundle:all.filter(x=>!x.bookReadings.length).map(x=>x.id),
 theoryTopics:all.filter(x=>x.type==="theory_and_practice").length,
 reviewTopics:all.filter(x=>x.type==="review_or_assessment").length,
 components:all.reduce((n,x)=>n+x.components.length,0),
 explicitComponents:all.reduce((n,x)=>n+x.components.filter(c=>!!c.article).length,0),
 fullExamTopics:all.filter(x=>x.fullExam).length,
 bookMatchedComponents:all.reduce((n,x)=>n+x.components.filter(c=>c.specificallyRelatedParagraphs.length>0).length,0),
 unresolvedComponents:all.reduce((n,x)=>n+x.components.filter(c=>c.unresolved).length,0)};
window.EGE_STUDY_SOURCES={get:id=>mapping[id]||null,all:mapping,stats,version:"2026-10-09-complete-234-topic-reading-routes"};
})();