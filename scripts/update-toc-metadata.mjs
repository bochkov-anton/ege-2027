import {readFileSync,writeFileSync} from "node:fs";
import vm from "node:vm";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const path=resolve(base,"verified-tocs.js");
const sandbox=vm.createContext({window:{}});
vm.runInContext(readFileSync(path,"utf8"),sandbox);
const editions=sandbox.window.EGE_VERIFIED_TOC.editions;
editions.bioAnimal8.title=editions.bioAnimal8.title.replace("Никишов, Викторов","Никишов, Шарова");
for(const [id,book] of Object.entries(editions)){
  for(const sec of book.sections)sec.marker=["bioHuman9","bioAnimal8"].includes(id)?"Раздел":"§";
}
const output='/* Проверенные по конкретным изданиям страницы из каталога РУКОНТ. */\n'+
 '(function(){"use strict";const EDITIONS='+JSON.stringify(editions)+
 ';window.EGE_VERIFIED_TOC={editions:EDITIONS,section(id,n){return EDITIONS[id]?.sections.find(x=>x.number===n)||null;}};})();\n';
writeFileSync(path,output,"utf8");
console.log("updated",Object.keys(editions).length,"editions",Object.values(editions).reduce((n,e)=>n+e.sections.length,0),"paragraphs");
