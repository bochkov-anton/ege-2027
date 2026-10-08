/* Вывод учебных § по точному изданию, без переносов нумерации между редакциями. */
(function(){"use strict";
function resolve(key){
 const assignment=window.EGE_PAGE_ASSIGNMENTS?.get(key)||[];
 const books=window.EGE_VERIFIED_TOC?.editions||{};
 const good=[],unverified=[];
 for(const a of assignment){
  const ed=books[a.editionId];
  if(!ed){unverified.push(a);continue;}
  const i=ed.sections.findIndex(x=>a.page!==null?x.page===a.page:x.number===a.number);
  if(i<0){unverified.push(a);continue;}
  const section=ed.sections[i],next=ed.sections.slice(i+1).find(x=>x.page>section.page);
  const end=next&&next.page-section.page<=30?next.page-1:null;
  good.push({editionId:a.editionId,editionTitle:ed.title,year:ed.year,isbn:ed.isbn,source:ed.url,
   number:section.number,marker:section.marker||"§",title:section.title,page:section.page,endPage:end,
   pagesLabel:end?section.page+"–"+end:String(section.page),
   search:"https://yandex.ru/search/?text="+encodeURIComponent(ed.title+" "+ed.year+" "+ed.isbn+" оглавление учебник")});
 }
 return {key,entries:good,unverified,verified:good.length>0&&unverified.length===0};
}
function remedialReading(state,currentKey,subject,maxTopics=3){
 const selected=new Map();
 const safeKey=k=>typeof k==="string"&&/^(bio|chem|math):(?:[1-9]|1\d|2[0-6]):[012]$/.test(k)&&k!==currentKey&&k.startsWith(subject+":");
 function admit(key,reason,priority){
   if(!safeKey(key))return;
   const e=resolve(key);
   if(!e.verified||!e.entries.length)return;
   const old=selected.get(key);
   if(old&&old.priority>=priority)return;
   selected.set(key,{topicKey:key,reason,priority,reading:e.entries.slice(0,3)});
 }
 const errors=Array.isArray(state?.errors)?state.errors:[];
 for(const err of errors.slice(0,150)){
   if(err&&err.done!==true&&err.subject===subject)
     admit(err.topicKey,"Записанная нерешённая ошибка",100);
 }
 const results=state?.results&&typeof state.results==="object"?Object.values(state.results):[];
 for(const r of results){
   if(r&&r.subject===subject&&Number.isFinite(r.total)&&r.total>=3&&Number.isFinite(r.correct)&&r.correct>=0&&r.correct/r.total<.8){
     admit(r.topicKey,"Результат самостоятельных заданий ниже 80%",70);
   }
 }
 const reviews=state?.reviews&&typeof state.reviews==="object"?Object.entries(state.reviews):[];
 for(const [k,r]of reviews){
   if(r?.subject===subject&&Number(r.stage)===0)
     admit(k,"Повторение после затруднений",30);
 }
 return [...selected.values()].sort((a,b)=>b.priority-a.priority||a.topicKey.localeCompare(b.topicKey)).slice(0,Math.max(0,Math.min(6,Math.trunc(maxTopics)||0)));
}
window.EGE_READING={get:resolve,remedialReading};
})();