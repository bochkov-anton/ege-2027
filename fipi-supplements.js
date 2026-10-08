/* Дополнения для новых линий проекта КИМ-2027.
 * Источники проверены предметно, а не заменены ссылками на общие банки.
 * ЕГЭ №6: https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike
 * конкретные задания №6: https://repa-ai.ru/ege/matematika-profil/zadanie-6/
 * Старую category_id=130 не использовать: это общий раздел, не линия №6.
 */
(function(){"use strict";
const theory=window.EGE_THEORY,practice=window.EGE_PRACTICE;
if(!theory||!practice)throw Error("theory or practice bank not loaded");
const additions={
 "math:2:2":{
   theory:[{title:"Фоксфорд: новая линия №6 — теория, формулы и разобранные задачи",url:"https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"}],
   practice:[{title:"Задание №6 ЕГЭ-2027: конкретные упражнения на математическое ожидание и дисперсию",url:"https://repa-ai.ru/ege/matematika-profil/zadanie-6/"}]
 }
};
const oldGetTheory=theory.get.bind(theory),oldGetPractice=practice.get.bind(practice);
theory.get=function(key,sub,title,guide){
 const base=oldGetTheory(key,sub,title,guide)||{},add=additions[key]?.theory;
 if(!add)return base;
 const already=Array.isArray(base.articles)?base.articles:[];
 return {...base,articles:[...add,...already.filter(x=>!add.some(y=>y.url===x.url))]};
};
practice.get=function(key){
 const base=oldGetPractice(key)||{},add=additions[key]?.practice;
 if(!add)return base;
 const already=Array.isArray(base.sources)?base.sources:[];
 return {...base,sources:[...add,...already.filter(x=>!add.some(y=>y.url===x.url))]};
};
window.EGE_FIPI_SUPPLEMENTS={get:key=>additions[key]||null};
})();