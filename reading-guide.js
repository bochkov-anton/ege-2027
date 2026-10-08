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
window.EGE_READING={get:resolve};
})();