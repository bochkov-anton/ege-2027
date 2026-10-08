import {writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const out=resolve(dirname(fileURLToPath(import.meta.url)),"../verified-tocs.js");
const editions={
bioPlant7:{url:"https://rucont.ru/efd/818838",title:"Викторов, Никишов. Биология. Растения. Бактерии. Грибы и лишайники. 7 класс",isbn:"978-5-907433-29-8",year:2021,subject:"bio",mode:"section",toc:[1,64]},
bioAnimal8:{url:"https://rucont.ru/efd/818828",title:"Никишов, Шарова. Биология. Животные. 8 класс",isbn:"978-5-907433-30-4",year:2021,subject:"bio",mode:"numbered",toc:[1,70]},
bioHuman9:{url:"https://rucont.ru/efd/818841",title:"Никишов, Богданов. Биология. Человек и его здоровье. 9 класс",isbn:"978-5-907433-31-1",year:2021,subject:"bio",mode:"numbered",toc:[1,65]},
bioTeremov10:{url:"https://rucont.ru/efd/818825",title:"Теремов, Петросова. Биология. Биологические системы и процессы. 10 класс",isbn:"978-5-907433-32-8",year:2021,subject:"bio",toc:[1,34]},
bioShumny11:{url:"https://rucont.ru/efd/838637",title:"Бородин, Дымшиц, Саблина и др., под ред. Шумного и Дымшица. Биология. 11 класс. Углублённый",isbn:"978-5-09-088207-1",year:2022,subject:"bio",toc:[1,57]},
chemPaper10:{url:"https://rucont.ru/efd/838758",title:"Ерёмин и др. Химия. 10 класс. Углублённый уровень. 13-е изд.",isbn:"978-5-09-128109-5",year:2026,subject:"chem",toc:[1,70]},
chemPaper11:{url:"https://rucont.ru/efd/838762",title:"Ерёмин и др. Химия. 11 класс. Углублённый уровень. 13-е изд.",isbn:"978-5-09-128110-1",year:2026,subject:"chem",toc:[1,86]},
mathPaper10:{url:"https://rucont.ru/efd/838691",title:"Мерзляк, Номировский, Поляков. Алгебра и начала анализа. 10 класс. Углублённый. 8-е изд.",isbn:"978-5-09-112257-2",year:2024,subject:"math",toc:[1,52]},
mathPaper11:{url:"https://rucont.ru/efd/838692",title:"Мерзляк, Номировский, Поляков. Алгебра и начала анализа. 11 класс. Углублённый. 7-е изд.",isbn:"978-5-09-112258-9",year:2024,subject:"math",toc:[1,43]},
geo2026:{url:"https://rucont.ru/efd/838812",title:"Атанасян и др. Геометрия. 10–11 классы. Базовый и углублённый уровни. 14-е изд.",isbn:"978-5-09-127969-6",year:2026,subject:"math",toc:[null,null]}
};
const manual={
bioTeremov10:{4:29},
bioShumny11:{4:24,16:107,30:197,47:307},
chemPaper10:{14:90,16:101,37:198,39:206,40:211},
chemPaper11:{1:5,2:9,3:12,4:21,5:25,6:29,7:34,8:36,9:40,10:43,11:48,12:52,13:55,14:63,15:66,16:69,17:79,18:83,19:89,20:93,21:96,62:289,64:298},
mathPaper10:{1:6,4:32,21:157,47:359},
mathPaper11:{1:5,24:223,37:330,41:343}
};
const output={};let total=0;
for(const [id,ed] of Object.entries(editions)){
 const r=await fetch(ed.url,{signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error(id+" status "+r.status);
 let t=(await r.text()).replace(/<script[^>]*>[\s\S]*?<\/script>/gi,"").replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/ig," ").replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(+x)).replace(/\s+/g," ").trim();
 const beg=t.search(/ОГЛАВЛЕНИЕ|Оглавление/);if(beg<0)throw Error(id+" TOC missing");t=t.slice(beg);
 const marks=[...t.matchAll(ed.mode==="numbered"?/(?:^|\s)(\d{1,2})\.\s+(?=[А-ЯЁ])/g:/§\s*(\d{1,2})\.\s*/g)];
 const arr=[];
 for(let j=0;j<marks.length;j++){
  const start=marks[j].index+marks[j][0].length,end=marks[j+1]?.index||t.length;
  let piece=t.slice(start,end).slice(0,500);
  const pageMatch=piece.match(/^([\s\S]+?)\s*(?:\. ?){4,}\s*(\d{1,3})(?:\s|$)/);
  let name=pageMatch?pageMatch[1]:piece.split(/Глава|Стр\.|Оглавление|©/)[0].slice(0,150).replace(/(?:\s*\.){2,}.*$/,"");
  name=name.replace(/(?:\s*\.){2,}/g," ").replace(/\s+/g," ").trim();
  const n=+marks[j][1],page=(manual[id]||{})[n]??(pageMatch?+pageMatch[2]:null);
  if(!page||page>500||page<3||!name)continue;
  arr.push({number:n,title:name,page,marker:ed.mode==="numbered"?"Раздел":"§"});
 }
 if(id!=="geo2026"){
  const seen=new Set();
  for(const x of arr){if(seen.has(x.number))throw Error(id+" duplicate § "+x.number);seen.add(x.number)}
 }
 // Deliberately do NOT infer exact ending page: only section start pages are printed in verified TOC.
 if(arr.length<20)throw Error(id+" only "+arr.length+" paragraphs");
 output[id]={...ed,sections:arr};delete output[id].toc;delete output[id].mode;total+=arr.length;
 console.log(id+" "+arr.length+" verified section starts");
}
const js=["/* Достоверные номера § и начальных страниц; конкретное издание и ссылка указаны в каждой записи. */",
'(function(){"use strict";const EDITIONS=',JSON.stringify(output),
';window.EGE_VERIFIED_TOC={editions:EDITIONS,section(id,n){return EDITIONS[id]?.sections.find(x=>x.number===n)||null;}};})();'].join("");
writeFileSync(out,js);
console.log("TOTAL "+total+" OUTPUT "+js.length);
