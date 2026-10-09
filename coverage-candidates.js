/* Сопоставление всех пунктов учебного плана с кандидатами из конкретного оглавления.
 * Сходство заголовка НЕ является проверкой содержимого.
 */
(function(){
 "use strict";
 const Q=window.EGE_COVERAGE,R=window.EGE_READING,P=window.EGE_PRACTICE,T=window.EGE_THEORY,L=window.EGE_LESSONS;
 if(!Q||!R||!P||!T||!L)throw Error("Coverage data must load before candidate audit");
 const stop=new Set(["основ","задач","пункт","контр","повто","вопрос","сравн","этапы","разбо","форма","свойс","разли"]);
 function roots(s){return new Set((String(s||"").toLowerCase().match(/[а-яёa-z]{5,}/g)||[])
  .map(x=>x.slice(0,5)).filter(x=>!stop.has(x)));}
 function intersects(x,y){const a=roots(x),b=roots(y);return [...a].some(k=>b.has(k));}
 let candidateCount=0,withoutCandidate=0;
 for(const record of Object.values(Q.all)){
  const id=record.id,lesson=L.get(id);
  const theory=T.get(id,record.subject,lesson.title,lesson).articles||[];
  const reading=R.get(id).entries||[],tasks=P.get(id)?.sources||[];
  for(const item of record.components){
   const books=reading.filter(x=>intersects(item.label,x.title)).slice(0,3)
    .map(x=>({title:x.title,edition:x.editionTitle,number:x.number,page:x.page,pagesLabel:x.pagesLabel,status:"toc_heading_candidate"}));
   const practice=tasks.filter(x=>intersects(item.label,x.title)).slice(0,2)
    .map(x=>({title:x.title,url:x.url,status:"category_heading_candidate"}));
   const articles=theory.filter(x=>intersects(item.label,x.title)).slice(0,2)
    .map(x=>({title:x.title,url:x.url,status:"article_heading_candidate"}));
   item.candidates={books,practice,articles};
   if(books.length||practice.length||articles.length)candidateCount++;
   else withoutCandidate++;
  }
 }
 Q.candidateReport={componentsWithCandidate:candidateCount,componentsWithoutCandidate:withoutCandidate,
  basis:"heading_similarity_only_not_content_review"};
})();