import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=name=>readFileSync(new URL(name,root),"utf8");
const html=read("index.html"),css=read("tablet-ui.css"),app=read("app.js");
test("tablet styles are loaded last and included in offline packaging",()=>{
 const styles=[...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)">/g)].map(m=>m[1]);
 assert.equal(styles.at(-1),"saturday-ui.css");
 assert.ok(styles.indexOf("dashboard-ui.css")<styles.indexOf("saturday-ui.css"));
 assert.ok(styles.indexOf("tablet-ui.css")<styles.indexOf("dashboard-ui.css"));
 assert.equal(new Set(styles).size,styles.length);
 for(const file of ["scripts/package-site.py","sw.js","scripts/verify-live.mjs"])
  assert.ok(read(file).includes("tablet-ui.css"),file);
 assert.ok(css.length>6000);
});
test("six destinations remain accessible from the phone navigation, including progress",()=>{
 const mobile=html.match(/<nav class="mobile-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 assert.ok(mobile);
 const labels=[...mobile.matchAll(/<button[^>]*data-view="([^"]+)"[^>]*>/g)].map(m=>m[1]);
 assert.deepEqual(labels,["today","week","subjects","reviews","progress","settings"]);
 const desktop=html.match(/<nav id="nav-desktop"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
 for(const key of labels.slice(0,5))assert.ok(desktop.includes('data-view="'+key+'"'),key);
 assert.ok(app.includes('aria-current","page"'));
});
test("portrait and landscape tablet breakpoints expand reading area and shrink sidebar",()=>{
 assert.match(css,/@media\(min-width:761px\) and \(max-width:1199px\)/);
 assert.match(css,/grid-template-columns:88px minmax\(0,1fr\)/);
 assert.match(css,/width:min\(920px,calc\(100vw - 34px\)\)/);
 assert.match(css,/@media\(min-width:761px\) and \(max-width:890px\)/);
 assert.match(css,/@media\(max-height:600px\) and \(min-width:761px\)/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test("finger controls, zoom safety, reduced motion and safe areas are explicit",()=>{
 assert.match(css,/min-height:48px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html,/viewport-fit=cover/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
 assert.match(css,/font-size:16px/);
 assert.ok(css.includes("focus-visible"));
});
test("lesson tabs support keyboard arrows, semantic tab panels and default focus",()=>{
 assert.ok(app.includes('aria-controls="lesson-theory"'));
 assert.ok(app.includes('aria-controls="lesson-practice"'));
 assert.ok(app.includes('id="tab-theory"'));
 assert.ok(app.includes('id="tab-practice"'));
 assert.ok(app.includes('"ArrowRight"'));
 assert.ok(app.includes('"Home"'));
 assert.ok(app.includes("el.tabIndex=selected?0:-1"));
 assert.ok(app.includes('План изучения · '));
 assert.ok(app.includes("coverage.components.length<=3"));
});
test("the tablet stylesheet is syntactically balanced and doesn't mutate progress",()=>{
 const opens=(css.match(/\{/g)||[]).length,closes=(css.match(/\}/g)||[]).length;
 assert.equal(opens,closes);
 assert.ok(opens>=25);
 assert.doesNotMatch(css,/localStorage|sessionStorage|indexedDB/);
});
