import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const context=vm.createContext({window:{},URL});
for(const file of ["data.js","resources.js","experience.js"])vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),context,{filename:file});
const U=context.window.EGE_UX;

test("поиск по всем 234 темам учитывает предмет и отдельные слова",()=>{
  assert.equal(U.findTopics("","all",234).length,234);
  assert.ok(U.findTopics("генетика").some(x=>x.subject==="bio"));
  assert.ok(U.findTopics("неравенства","math").every(x=>x.subject==="math"));
  assert.equal(U.findTopics("несуществующая-тема-zzz").length,0);
  assert.equal(U.findTopics("математика", "math").length,78);
});
test("тема из поиска разрешается в тот же устойчивый ключ",()=>{
  const t=U.findTopics("митоз")[0];assert.ok(t);
  const resolved=U.topicByKey(t.key);
  assert.equal(resolved.title,t.title);
  assert.equal(U.topicByKey("chem:100:1"),null);
  assert.equal(U.topicByKey("<script>"),null);
});
test("ссылки поддерживают только обычные http/https без встраиваемого кода",()=>{
  assert.equal(U.safeHttpUrl("javascript:alert(1)"),null);
  assert.equal(U.safeHttpUrl("data:text/html,<h1>x</h1>"),null);
  assert.equal(U.safeHttpUrl("file:///etc/passwd"),null);
  assert.equal(U.safeHttpUrl("https://example.org/lesson"),"https://example.org/lesson");
  assert.equal(U.safeHttpUrl("https://user:pass@example.org/"),null);
});
test("подсказки к темам предметные, а не одинаковые заглушки",()=>{
  const bio=U.topicGuide("bio","Генетика. Сцепленное наследование");
  const chem=U.topicGuide("chem","Расчёты: растворы и смеси");
  const math=U.topicGuide("math","Логарифмические неравенства, ОДЗ");
  assert.ok(bio.doTask.includes("скрещивания"));
  assert.ok(chem.doTask.includes("баланс"));
  assert.ok(math.know.includes("ОДЗ"));
  for(const t of [bio,chem,math])assert.ok(t.check.length>30);
});
