import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const ctx=vm.createContext({window:{},URL,Number,Math,encodeURIComponent});
for(const f of ["data.js","lesson-content.js","textbooks.js"])
  vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),ctx,{filename:f});
const DATA=ctx.window.EGE_DATA;
const LESSONS=ctx.window.EGE_LESSONS;
const LIB=ctx.window.EGE_TEXTBOOKS;

test("234 темы связаны с основной и дополнительной книгой и предметным ориентиром",()=>{
  const index=new Set();
  for(const subject of DATA.subjectOrder)for(let week=0;week<26;week++)for(let i=0;i<3;i++){
    const key=subject+":"+(week+1)+":"+i,lesson=LESSONS.get(key);
    const books=LIB.get(key,subject,lesson.title);
    assert.equal(books.length,2,key);
    assert.equal(books[0].role,"Основной учебник");
    assert.equal(books[1].role,"Дополнительный учебник");
    assert.notEqual(books[0].bookId,books[1].bookId);
    for(const book of books){
      assert.ok(book.title.includes("класс")||book.title.includes("классы"),key+" "+book.title);
      assert.ok(book.authors.length>=8,key);
      assert.ok(book.section.length>=15,key+" "+book.section);
      assert.equal(book.paragraph,null,"Нельзя выдумывать номер §");
      assert.equal(book.pages,null,"Нельзя выдумывать страницы");
      assert.equal(book.sectionStatus,"topic_hint_unverified");
      assert.equal(new URL(book.official).protocol,"https:");
      assert.ok(["prosv.ru","media.prosv.ru","rucont.ru"].includes(new URL(book.official).hostname),key);
      assert.equal(new URL(book.yandex).hostname,"yandex.ru");
      assert.ok(decodeURIComponent(book.yandexSection).includes(book.section),key+" тематический поиск");
      assert.ok(!book.official.endsWith(".pdf"),"Не ссылаться на сомнительные PDF-сканы");
      index.add(book.bookId);
    }
  }
  assert.ok(index.size>=10);
});

test("биологию по генетике привязываем к части 2, а клетку — к клеточной биологии",()=>{
  const genetics=LIB.get("bio:7:0","bio","Основы генетики");
  const cell=LIB.get("bio:2:0","bio","Клеточная мембрана");
  assert.equal(genetics[0].bookId,"bio10b");
  assert.equal(cell[0].bookId,"bio10a");
});

test("органика относится к химии 10, неорганика к 11",()=>{
  assert.equal(LIB.get("chem:13:0","chem","Углеводороды алканы алкены")[0].bookId,"chem10");
  assert.equal(LIB.get("chem:7:0","chem","Соли и электролиты")[0].bookId,"chem11");
});

test("стереометрия и алгебра имеют разные учебники",()=>{
  assert.equal(LIB.get("math:3:0","math","Стереометрия")[0].bookId,"mathGeo");
  assert.equal(LIB.get("math:4:1","math","Логарифмы")[0].bookId,"math10");
});

test("ошибочный ключ не приводит к выдаче библиографии",()=>{
  assert.equal(LIB.get("math:27:0","math","Тема").length,0);
  assert.equal(LIB.get("bio:2:0","chem","Тема").length,0);
  assert.equal(LIB.get("","bio","Тема").length,0);
});
