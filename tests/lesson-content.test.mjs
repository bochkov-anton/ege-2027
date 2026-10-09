import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import{readFileSync}from "node:fs";
const c=vm.createContext({window:{},console});
for(const file of ["data.js","lesson-content.js","topic-practice.js","theory-core.js"]){
 vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),c,{filename:file});
}
const D=c.window.EGE_DATA,lessons=c.window.EGE_LESSONS,practice=c.window.EGE_PRACTICE,Theory=c.window.EGE_THEORY;
test("все 234 темы имеют индивидуальную учебную цель, проверку и подборку задач",()=>{
 const keys=[];
 for(const sub of D.subjectOrder)for(let w=0;w<26;w++)for(let i=0;i<3;i++){
   const key=sub+":"+(w+1)+":"+i;
   keys.push(key);
   const lesson=lessons.get(key),sources=practice.get(key)?.sources;
   assert.ok(lesson,key+" missing");
   assert.equal(lesson.title,D.subjects[sub].weeks[w][i]);
   for(const field of ["know","doTask","check"]){
     assert.ok(lesson[field]?.length>10,key+" "+field);
     assert.ok(!/Разобрать 1 пример и независимо решить вариации/.test(lesson[field]),key);
   }
   assert.ok(sources?.length>=1&&sources.length<=3,key+" exercises");
   for(const source of sources){
     assert.ok(/^https:\/\/(bio|chem|math)-ege\.sdamgia\.ru\/test\?filter=all&category_id=\d+$/.test(source.url),key+" "+source.url);
     assert.ok(source.title.length>4);
     assert.ok(!/fipi\.ru|prob_catalog/.test(source.url),"direct exercises only");
   }
 }
 assert.equal(keys.length,234);
 assert.equal(new Set(keys).size,234);
});
test("теория и практика раздельны; Фоксфорд — конкретная статья, не главная страница",()=>{
 let withFoxford=0,unique=new Set();
 for(const sub of D.subjectOrder)for(let w=0;w<26;w++)for(let i=0;i<3;i++){
   const key=sub+":"+(w+1)+":"+i,lesson=lessons.get(key);
   const theory=Theory.get(key,sub,lesson.title,lesson);
   assert.ok(theory.explanation.length>100,key+" explanation");
   assert.ok(theory.example.length>60,key+" example");
   if(theory.articles?.length)withFoxford++;
   for(const article of theory.articles){
     assert.match(article.url,/^https:\/\/foxford\.ru\/wiki\/(biologiya|himiya|matematika)\/[a-z0-9-]+$/);
     assert.ok(article.title.length>=4);
     unique.add(article.url);
   }
 }
 console.log("FOXFORDED_TOPICS",withFoxford,"UNIQUE_ARTICLES",unique.size);
 assert.ok(withFoxford>45);
 assert.ok(unique.size>=20);
});
