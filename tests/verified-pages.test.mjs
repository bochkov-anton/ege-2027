import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const x=vm.createContext({window:{},encodeURIComponent});
for(const f of ["data.js","verified-tocs.js","page-assignments.js","reading-guide.js"])
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),x,{filename:f});
const W=x.window;
test("точные § и страницы помечены ISBN и источником оглавления",()=>{
 const ed=W.EGE_VERIFIED_TOC.editions;
 assert.equal(Object.keys(ed).length,10);
 let total=0;
 for(const [key,book] of Object.entries(ed)){
   assert.match(book.url,/^https:\/\/rucont\.ru\/efd\/\d+$/);
   assert.ok(/^\d{4}$/.test(String(book.year)),key);
   assert.ok(/^[0-9-]{15,19}$/.test(book.isbn),key);
   assert.ok(book.sections.length>20,key);
   for(const sec of book.sections){
     assert.ok(sec.page>=3&&sec.page<500,key+" page");
     assert.ok(sec.title.length>=3,key+" heading");
     assert.ok(sec.number>=1&&sec.number<100,key+" number");
     total++;
   }
 }
 assert.ok(total>=540);
});
test("контрольные номера из оглавлений не перенесены на другие издания",()=>{
 const ed=W.EGE_VERIFIED_TOC;
 const pairs=[
 ["bioTeremov10",7,45],
 ["bioShumny11",14,93],
 ["chemPaper10",28,162],
 ["chemPaper11",64,298],
 ["mathPaper11",4,29],
 ["mathPaper10",38,284],
 ];
 for(const [id,n,start] of pairs)assert.equal(ed.section(id,n)?.page,start,id+" §"+n);
 assert.ok(ed.editions.chemPaper10.isbn!==ed.editions.chemPaper11.isbn);
});
test("168 из 234 учебных карточек имеют проверенную привязку, остаток честно обозначен",()=>{
 let verified=0,unmapped=0;
 for(const sub of W.EGE_DATA.subjectOrder)for(let wi=0;wi<26;wi++)for(let i=0;i<3;i++){
   const k=sub+":"+(wi+1)+":"+i,r=W.EGE_READING.get(k);
   assert.equal(r.unverified.length,0,k+" contains false source");
   if(r.verified){
     verified++;
     assert.ok(r.entries.length>=1);
     for(const p of r.entries){
       assert.ok(p.page>0);
       assert.ok(p.pagesLabel.includes(String(p.page)));
       assert.ok(p.source.includes("rucont.ru"));
       assert.ok(p.editionTitle.length>20);
       assert.ok(p.year&&p.isbn);
       if(p.endPage!==null)assert.ok(p.endPage>=p.page);
     }
   }else unmapped++;
 }
 assert.equal(verified,168);
 assert.equal(unmapped,66);
});
test("прямые темы химии, биологии и математики имеют номер и страницу",()=>{
 for(const key of ["bio:1:2","bio:6:1","bio:21:0","chem:1:0","chem:9:0","math:5:1","math:8:0"]){
   const r=W.EGE_READING.get(key);
   assert.ok(r.verified&&r.entries.length>0,key);
 }
});
