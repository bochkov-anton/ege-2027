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
test("159 из 234 учебных карточек имеют проверенную привязку, остаток честно обозначен",()=>{
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
 assert.equal(verified,159);
 assert.equal(unmapped,75);
});
test("широкие составные темы содержат разделы каждой необходимой содержательной области",()=>{
 const has=(key,edition,number)=>W.EGE_READING.get(key).entries.some(x=>x.editionId===edition&&x.number===number);
 for(const [key,edition,number] of [
  ["bio:1:1","bioTeremov10",7],["bio:7:0","bioTeremov10",26],
  ["chem:2:1","chemPaper11",48],["chem:3:2","chemPaper10",34],
  ["chem:3:2","chemPaper10",37],["chem:11:1","chemPaper10",48],
  ["chem:12:0","chemPaper10",60],["chem:13:1","chemPaper10",6],
  ["math:2:1","mathPaper10",10],["math:3:1","mathPaper10",40],
  ["math:4:2","mathPaper10",32]
 ])assert.ok(has(key,edition,number),key+": missing "+edition+" §"+number);
});
test("химическая связь не лишена решёток и степеней окисления в карте учебника",()=>{
 const entries=W.EGE_READING.get("chem:1:1").entries;
 const labels=entries.map(e=>e.editionId+":"+e.number);
 assert.ok(labels.includes("chemPaper11:53"),"Ковалентная связь");
 assert.ok(labels.includes("chemPaper11:54"),"Ионные решётки");
 assert.ok(labels.includes("chemPaper11:55"),"Металлическая связь и решётки");
 assert.ok(labels.includes("chemPaper10:7"),"ОВР как опора для степеней окисления — необходимо уточнить внутри §");
});
test("прямые темы химии, биологии и математики имеют номер и страницу",()=>{
 for(const key of ["bio:1:2","bio:6:1","bio:21:0","chem:1:0","chem:9:0","math:5:1","math:8:0"]){
   const r=W.EGE_READING.get(key);
   assert.ok(r.verified&&r.entries.length>0,key);
 }
});

test("повторение выбирает страницы из зарегистрированных ошибок, слабых результатов и повторов",()=>{
 const state={
  errors:[
    {subject:"bio",topicKey:"bio:13:0",done:false},
    {subject:"bio",topicKey:"bio:9:0",done:true},
    {subject:"chem",topicKey:"chem:9:0",done:false},
    {subject:"bio",topicKey:"bio:24:0",done:false},
    {subject:"bio",topicKey:"bad:9:0",done:false}],
  results:{"one":{subject:"bio",topicKey:"bio:17:1",correct:3,total:8},
           "two":{subject:"bio",topicKey:"bio:20:1",correct:9,total:10},
           "three":{subject:"math",topicKey:"math:5:1",correct:1,total:9}},
  reviews:{"bio:21:0":{subject:"bio",stage:0},"bio:11:1":{subject:"bio",stage:3}}
 };
 const arr=W.EGE_READING.remedialReading(state,"bio:24:0","bio",3);
 assert.equal(arr.length,3);
 assert.equal(arr[0].topicKey,"bio:13:0");
 assert.equal(arr[0].reason,"Записанная нерешённая ошибка");
 assert.ok(arr.some(v=>v.topicKey==="bio:17:1"));
 assert.ok(arr.some(v=>v.topicKey==="bio:21:0"));
 assert.ok(arr.every(v=>v.topicKey.startsWith("bio:")&&v.reading.every(x=>x.page>0)));
 assert.equal(W.EGE_READING.remedialReading({},"bio:24:0","bio").length,0);
 assert.equal(W.EGE_READING.remedialReading(state,"bio:13:0","chem").length,1);
});
test("рекомендации по слабым темам не содержат выдуманных ссылок и лишних задач",()=>{
 const invalid={errors:[{topicKey:"bio:99:0",subject:"bio"},{topicKey:"bio:5:0",subject:"bio",done:false}],
 results:{"t":{subject:"bio",topicKey:"bio:6:0",correct:0,total:2}}};
 const found=W.EGE_READING.remedialReading(invalid,"bio:24:0","bio",6);
 assert.equal(found.length,1);
 assert.equal(found[0].topicKey,"bio:5:0");
 assert.ok(found[0].reading.length<4);
 assert.equal(W.EGE_READING.remedialReading(invalid,"bio:24:0","bio",0).length,0);
});

test("редакторская проверка: тригонометрия ≠ геометрическая окружность",()=>{
 const entries=W.EGE_READING.get("math:1:2").entries;
 assert.ok(entries.some(x=>x.editionId==="mathPaper10"&&x.number===17),"Радианная мера угла обязательна");
 assert.ok(entries.some(x=>x.editionId==="mathPaper10"&&x.number===18),"Тригонометрические функции обязательны");
 assert.ok(entries.some(x=>x.editionId==="geo2026"),"Базовая геометрия представлена отдельно");
});
test("редакционная ревизия исключает несвязанные главы и добавляет точные основы по предметам",()=>{
  const entries=key=>W.EGE_READING.get(key).entries;
  const sections=key=>Array.from(entries(key),e=>e.editionId+":"+e.number);
  const chemMole=sections("chem:1:2");
  assert.deepEqual(chemMole,["chemPaper10:5","chemPaper10:6"],"Моль и газовые расчёты не должны ссылаться на ОВР и изомерию");
  assert.ok(!sections("chem:4:2").includes("chemPaper10:9"),"Спирты и альдегиды не равны растворам");
  for(const n of [25,29])assert.ok(sections("chem:9:0").includes("chemPaper10:"+n),"Свойства алканов и алкенов");
  for(const n of [34,37])assert.ok(sections("chem:9:1").includes("chemPaper10:"+n),"Реакции алкинов и аренов");
  assert.ok(sections("bio:9:1").includes("bioPlant7:8"),"Почки");
  assert.ok(sections("bio:11:0").includes("bioPlant7:51"),"Плауны и хвощи");
  assert.ok(!sections("math:1:1").includes("mathPaper11:4"),"Логарифмы не должны заменять степенные и корневые преобразования");
  for(const n of [21,22,23])assert.ok(sections("math:2:2").includes("mathPaper11:"+n),"Случайные величины, распределения и их характеристики");
  assert.ok(!sections("math:2:2").includes("mathPaper11:26"),"Методы решения уравнений не равны распределениям");
});
test("адресное повторение не выдаёт общие страницы по производной за исправление всех заданий №1–13",()=>{
 const info=W.EGE_READING.get("math:10:1");
 assert.equal(info.entries.length,0);
 const f=W.EGE_READING.get("chem:3:0").entries;
 assert.ok(f.some(x=>x.editionId==="chemPaper11"&&x.number===66),"pH должен вести к ионному произведению воды");
});
test("объём чтения вычисляется только по соседним страницам того же ISBN",()=>{
 for(const sub of W.EGE_DATA.subjectOrder)for(let week=1;week<=26;week++)for(let index=0;index<3;index++){
 const r=W.EGE_READING.get(sub+":"+week+":"+index);
 for(const e of r.entries){
  const source=W.EGE_VERIFIED_TOC.editions[e.editionId];
  assert.equal(e.isbn,source.isbn);
  assert.equal(e.year,source.year);
  assert.ok(source.sections.some(s=>s.page===e.page&&s.title===e.title));
  if(e.endPage!==null)assert.ok(source.sections.some(s=>s.page===e.endPage+1));
 }
 }
});
