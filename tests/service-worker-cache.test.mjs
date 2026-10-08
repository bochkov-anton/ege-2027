import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const build=readFileSync(resolve(root,"scripts/package-site.py"),"utf8");
const m=/ASSETS\s*=\s*\[([\s\S]*?)\]/.exec(build);
if(!m)throw Error("ASSETS not found in packager");
const paths=[...m[1].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
test("ресурсы PWA объявлены без повторов и физически существуют",()=>{
 assert.equal(paths.length,new Set(paths).size,"Duplicate asset");
 assert.ok(paths.includes("reading-guide.js"));
 assert.ok(paths.includes("sw.js"));
 for(const name of paths)assert.ok(existsSync(resolve(root,name)),"Missing "+name);
});
test("GitHub Pages SW имеет хеш той же версии, что и сборка; обновление не останется только в ZIP",()=>{
 const pieces=[];
 for(const name of [...paths].filter(x=>x!=="sw.js").sort()){
  pieces.push(Buffer.from(name+"\0","utf8"),readFileSync(resolve(root,name)));
 }
 const stamp=createHash("sha256").update(Buffer.concat(pieces)).digest("hex").slice(0,12);
 const sw=readFileSync(resolve(root,"sw.js"),"utf8");
 assert.ok(sw.includes('const CACHE_NAME="ege-2027-shell-'+stamp+'";'),
   "Run python3 scripts/package-site.py and commit sw.js after modifying assets");
});
test("все обязательные загружаемые скрипты/стили включены в pre-cache",()=>{
 const html=readFileSync(resolve(root,"index.html"),"utf8");
 const sw=readFileSync(resolve(root,"sw.js"),"utf8");
 const urls=[...html.matchAll(/(?:src|href)="\.\/([^"]+\.(?:js|css|webmanifest))"/g)].map(x=>x[1]);
 for(const file of urls){assert.ok(paths.includes(file),"Archive missing "+file);
 assert.ok(sw.includes('"./'+file+'"'),"Service worker missing "+file);}
});
