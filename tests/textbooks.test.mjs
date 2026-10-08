import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const ctx=vm.createContext({window:{},URL,encodeURIComponent});
for(const name of ["data.js","lesson-content.js","textbooks.js"]){
  vm.runInContext(readFileSync(new URL("../"+name,import.meta.url),"utf8"),ctx,{filename:name});
}
const D=ctx.window.EGE_DATA,L=ctx.window.EGE_LESSONS,B=ctx.window.EGE_TEXTBOOKS;
test("234 темы получают две книги с правильным предметом и без выдуманных страниц",()=>{
  const used=new Set();
  for(const subject of D.subjectOrder)for(let week=0;week<26;week++)for(let i=0;i<3;i++){
    const key=subject+":"+(week+1)+":"+i;
    const lesson=L.get(key),bookList=B.get(key,subject,lesson.title);
    assert.equal(bookList.length,2,key);
    assert.equal(bookList[0].role,"Основной учебник");
    assert.equal(bookList[1].role,"Дополнительный учебник");
    assert.notEqual(bookList[0].bookId,bookList[1].bookId);
    for(const book of bookList){
      used.add(book.bookId);
      assert.ok(book.title.length>25,key);
      assert.ok(book.authors.length>10,key);
      assert.ok(book.section.length>15,key);
      assert.equal(book.paragraph,null);
      assert.equal(book.pages,null);
      assert.equal(book.sectionStatus,"topic_hint_unverified");
      assert.ok(["prosv.ru","media.prosv.ru"].includes(new URL(book.official).hostname));
      assert.equal(new URL(book.yandex).hostname,"yandex.ru");
      assert.ok(decodeURIComponent(book.yandexSection).includes(book.section));
    }
  }
  assert.ok(used.size>=10);
});
test("геометрия 7-9 для планиметрии, 10-11 для стереометрии",()=>{
  assert.equal(B.get("math:2:0","math","Планиметрия: треугольники")[0].bookId,"mathGeoLower");
  assert.equal(B.get("math:2:1","math","Стереометрия")[0].bookId,"mathGeo");
  assert.equal(B.get("math:2:2","math","Тригонометрия и единичная окружность")[0].bookId,"math10");
});
test("генетика и органика ищутся в правильных специализированных книгах",()=>{
  assert.equal(B.get("bio:7:0","bio","Генетика")[0].bookId,"bio10b");
  assert.equal(B.get("chem:13:0","chem","Органические углеводороды")[0].bookId,"chem10");
  assert.equal(B.get("chem:7:0","chem","Соли и электролиты")[0].bookId,"chem11");
});
test("нет книг для ложного номера недели или предмета",()=>{
  assert.equal(B.get("bio:27:0","bio","Тема").length,0);
  assert.equal(B.get("math:4:1","bio","Тема").length,0);
  assert.equal(B.get("bad","chem","Тема").length,0);
});
