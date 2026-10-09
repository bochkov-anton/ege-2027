import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import{readFileSync}from"node:fs";
const c=vm.createContext({window:{},URL,encodeURIComponent});
for(const f of ["data.js","lesson-content.js","topic-practice.js","theory-core.js","fipi-supplements.js","fipi-map.js"])
  vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),c,{filename:f});
test("ошибочные назначения тематических задач заменены, не общими разделами",()=>{
  const examples={
    "bio:1:2":{word:"Генетическая информация",url:"extra_id=248"},
    "bio:11:2":{word:"Размножение",url:"extra_id=251"},
    "bio:19:1":{word:"Нейрогуморальная",url:"extra_id=269"}
  };
  for(const [id,expect]of Object.entries(examples)){
    const r=c.window.EGE_PRACTICE.get(id);
    assert.ok(r.sources[0].title.includes(expect.word),id);
    assert.ok(r.sources[0].url.includes(expect.url),id);
    assert.equal(r.sourceVerification,"thematic_editorial_verified_url");
    assert.equal(r.sources.length,1,id+" should not include displaced irrelevant tasks");
  }
});
test("проект ФИПИ не выдаётся за официально завершённую предметную валидацию",()=>{
  const a=c.window.EGE_FIPI;
  assert.equal(Object.keys(a.all).length,234);
  for(const r of Object.values(a.all)){
    assert.equal(r.status,"draft");
    assert.ok(["editorial_category","declared_line_in_plan","editorial_week_domain_only"].includes(r.verification));
  }
});
