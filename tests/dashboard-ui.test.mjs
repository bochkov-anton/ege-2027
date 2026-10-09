import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(new URL("../"+x,import.meta.url),"utf8");
const css=read("dashboard-ui.css"),html=read("index.html"),week=read("week-ui.js");
test("compact weekly layout shows math, biology and chemistry as equal peers",()=>{
 assert.ok(week.includes("week-subject-'+s"));
 assert.ok(week.includes("week-mini-title"));
 assert.ok(week.includes("week-mini-status"));
 assert.ok(week.includes("week-mini-details"));
 assert.ok(!week.includes('s==="math"?"":" open"'));
 assert.ok(css.includes("repeat(3,minmax(0,1fr))"));
});
test("expanded topic details use available width instead of a tiny right column",()=>{
 assert.ok(css.includes(".week-mini-details[open]{grid-column:1/-1"));
 assert.ok(css.includes(".week-mini-controls{display:grid"));
 assert.ok(css.includes("grid-template-columns:minmax(0,1fr) auto"));
});
test("responsive dashboard supports tablet portrait, landscape, compact phones",()=>{
 for(const width of ["1199px","900px","760px","360px"])assert.ok(css.includes(width),width);
 assert.ok(css.includes(".week-subject-grid{grid-template-columns:1fr}"));
 assert.ok(css.includes(".insights-subject-grid"));
 assert.ok(css.includes(".week-day .week-topic{display:none}"));
});
test("dashboard assets are included in HTML, cache, offline package and live verification",()=>{
 for(const asset of ["dashboard-ui.css","learning-analytics.js","week-ui.js"]){
  for(const file of ["index.html","sw.js","scripts/package-site.py","scripts/verify-live.mjs"])
   assert.ok(read(file).includes(asset),file+": "+asset);
 }
 assert.ok(html.indexOf("learning-analytics.js")<html.indexOf("week-ui.js"));
 assert.ok(html.indexOf("week-ui.js")<html.indexOf("app.js"));
 assert.ok(html.indexOf("tablet-ui.css")<html.indexOf("dashboard-ui.css"));
});
test("completion and retrieval evidence are not fabricated by navigation or calendar",()=>{
 assert.ok(week.includes("Теория и практика завершены"));
 assert.ok(week.includes("mastered"));
 assert.ok(week.includes("reinforced"));
 assert.ok(week.includes("не прогноз баллов ЕГЭ"));
 assert.ok(week.includes('aria-valuenow'));
});
test("all new dashboard controls have semantic keyboard-native elements",()=>{
 assert.ok(week.includes("<button"));
 assert.ok(week.includes("<details"));
 assert.ok(week.includes("<summary"));
 assert.ok(week.includes("aria-label"));
 assert.ok(css.includes("min-height:40px"));
});
