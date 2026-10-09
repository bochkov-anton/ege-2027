import test from "node:test";import assert from "node:assert/strict";import vm from "node:vm";import {readFileSync} from "node:fs";
const c=vm.createContext({window:{}});
for(const f of ["data.js","fipi-map.js","lesson-content.js","topic-practice.js","theory-core.js","fipi-supplements.js","textbooks.js","curriculum.js"])
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),c,{filename:f});
const F=c.window.EGE_FIPI,D=c.window.EGE_DATA,C=c.window.EGE_CURRICULUM;
test("разделы проекта ФИПИ-2027 сопоставлены со всеми 234 темами и ресурсами",()=>{
 assert.equal(Object.keys(F.all).length,234);
 for(const [key,entry]of Object.entries(F.all)){
  assert.ok(C.records[key],"Curriculum missing "+key);
  assert.equal(entry.title,C.records[key].title);
  assert.ok(c.window.EGE_LESSONS.get(key),"Lesson missing "+key);
  assert.ok(c.window.EGE_PRACTICE.get(key)?.sources.length,"Practice missing "+key);
  assert.equal(c.window.EGE_TEXTBOOKS.get(key,entry.subject,entry.title).length,2,"Textbooks missing "+key);
  assert.ok(entry.section.length>=10);
  assert.equal(entry.year,2027);
  assert.equal(entry.status,"draft");
  for(const n of entry.lines){assert.ok(Number.isInteger(n));assert.ok(n>=1&&n<=F.exams[entry.subject].total)}
 }
});
test("проект ЕГЭ-2027: математика 20, химия 34, биология 28 заданий",()=>{
 assert.equal(F.exams.math.total,20);
 assert.equal(F.exams.math.short,13);
 assert.equal(F.exams.math.extended,7);
 assert.equal(F.exams.math.maxPrimary,33);
 assert.equal(F.exams.math.lines[5],"Случайная величина и распределение");
 assert.deepEqual(Array.from(F.exams.math.newLines),[6,13,17]);
 assert.equal(F.exams.chem.total,34);
 assert.equal(F.exams.chem.extended,6);
 assert.equal(F.exams.bio.total,28);
 assert.equal(F.exams.bio.maxPrimary,57);
});
test("реальная нумерация КИМ-2027 не смешивается с порядком изучения",()=>{
 assert.ok(F.get("math:5:1").lines.includes(14));
 assert.ok(F.get("math:4:1").lines.includes(13));
 assert.ok(F.get("math:12:1").lines.includes(17));
 assert.equal(F.get("math:2:0").lines.includes(4),true);
 assert.ok(C.order.math.indexOf("math:5:1")<C.order.math.indexOf("math:7:0"));
});
test("спецификация показывает проектные ограничения, а не делает конспект ФИПИ учебником",()=>{
 assert.ok(F.caution.includes("Проекты ФИПИ"));
 assert.ok(F.primarySource.startsWith("https://fipi.ru/"));
 assert.ok(F.get("bio:1:1").section.length>10);
 assert.equal(F.get("bio:1:1").verification,"editorial_week_domain_only");
});

test("новое задание №6 ведёт непосредственно в статью Фоксфорда и подборку реальных задач",()=>{
 for(const id of ["math:2:2"]){
  const topic=C.records[id];
  const links=c.window.EGE_PRACTICE.get(id).sources;
  assert.ok(links.some(x=>x.url==="https://repa-ai.ru/ege/matematika-profil/zadanie-6/"));
  const theory=c.window.EGE_THEORY.get(id,"math",topic.title,c.window.EGE_LESSONS.get(id));
  assert.ok(theory.articles.some(x=>x.url==="https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"));
  assert.ok(theory.articles.some(x=>/№6/.test(x.title)));
 }
});

test("практика новой линии №6 ведёт к конкретным задачам, а не к общей странице каталога",()=>{
 const links=c.window.EGE_PRACTICE.get("math:2:2").sources;
 assert.equal(links[0].url,"https://repa-ai.ru/ege/matematika-profil/zadanie-6/");
 assert.ok(/№6/.test(links[0].title));
 assert.ok(!links.some(x=>x.url==="https://math-ege.sdamgia.ru/test?filter=all&category_id=130"),
   "Категория 130 в старом РЕШУ ЕГЭ названа «Задания для подготовки», не №6-2027");
 const foundation=c.window.EGE_PRACTICE.get("math:2:0").sources;
 assert.ok(foundation.some(x=>/Классическое определение вероятности|Теоремы о вероятностях/.test(x.title)));
 assert.ok(!foundation.some(x=>/repa-ai.ru/.test(x.url)),"Распределение должно идти после вероятностей");
});
