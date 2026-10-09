/* Семантический контроль ссылок по конкретным УЧЕБНЫМ навыкам.
 * HTTP 200 подтверждает только доступность, НЕ предметную релевантность.
 * Не выдаём общую подборку за полную тему/пробник.
 * Редакционная проверка содержания задач отдельна от автоматической классификации.
 */
(function(){"use strict";
const D=window.EGE_DATA,L=window.EGE_LESSONS,P=window.EGE_PRACTICE,T=window.EGE_THEORY;
if(!D||!L||!P||!T)throw Error("Load content before semantic audit");
const rules={
bio:{
method:/метод[ыа]? (?:биологи|биологическ)|биологическ.*исследован|эксперимент|контрольн.*групп/i,
water:/вод[аыуе]|минеральн.*сол[ьи]/i,
biomolecule:/углевод|липид|белк|фермент|органическ.*веществ|атф/i,
dna:/днк|рнк|нуклеин|наследственн.*материал|генетическ.*информац/i,
code:/генетическ.*код|кодон|трансляц|биосинтез.*белк/i,
molecularProblems:/молекулярн.*биолог|задач.*днк|задач.*рнк/i,
membrane:/мембран|осмос|диффуз|плазмолиз|транспорт.*веществ/i,
organelle:/органоид|органелл/i,
prokaryote:/прокариот|бактери|цианобактери/i,
virus:/вирус/i,
cell:/клеточн.*(?:строен|организац)|клетк.*(?:строен|функци)|структурно-функциональн.*клетк/i,
metabolism:/метаболизм|энергетическ.*обмен|клеточн.*дыхани|гликолиз|брожени/i,
photosynthesis:/фотосинтез|фотолиз|хлоропласт|хемосинтез/i,
mitosis:/митоз|жизненн.*цикл клетки|клеточн.*цикл/i,
meiosis:/мейоз|гаметогенез/i,
chromosome:/хромосомн.*набор|числ.*хромосом|плоидност|набор.*n.c|набор.*хроматид/i,
genetics:/генетик|генотип|аллел|генетическ.*термин/i,
cross:/скрещиван|наследован|домин|задач.*генетик/i,
pedigree:/родословн/i,
linked:/сцеплен|кроссинговер/i,
mutation:/мутац|мутаген/i,
plantcell:/растительн.*клетк/i,
plantorgans:/корень|стебель|лист|почка|вегетативн.*орган|генеративн.*орган|цветок|плод|семя/i,
plantphysio:/флоэм|ксилем|транспирац|физиолог.*растен|питани.*растен/i,
plantphyla:/водоросл|моховидн|папорот|голосемен|покрытосемен|плаун|хвощ/i,
plantcycle:/гаметофит|спорофит|жизненн.*цикл|размножен.*растен/i,
protozoa:/простейш|одноклеточн.*животн|кишечнополост|губк/i,
worms:/черв|паразит/i,
arthropoda:/членистоног|ракообраз|паукообраз|насеком|метаморфоз/i,
mollusca:/моллюск/i,
vertebrates:/хордов|рыб|земновод|пресмыкающ|птиц|млекопитающ/i,
animalblood:/кровеносн.*систем|кровообращен/i,
bones:/опорно-двигател|скелет|мышц/i,
digest:/пищеварител|всасыван/i,
respiration:/дыхател.*систем|газообмен/i,
kidney:/выделительн.*систем|почек|нефрон|мочеобразован/i,
hormone:/эндокрин|гормон|нейрогуморальн/i,
nervous:/нервн.*систем|рефлекс|анализатор/i,
evolution:/эволюц|естественн.*отбор|видообразован|ароморфоз|идиоадаптац/i,
species:/критери.*вид/i,
popgen:/генофонд|дрейф|популяционн.*генетик/i,
ecology:/эколог|экосистем|пищев.*цеп|биосфер|сукцесс|фактор.*сред/i
},
chem:{
atom:/атом|электрон.*конфигурац|электронн.*строен|периодичн/i,
bond:/химическ.*связ|характеристик.*связ|кристаллич.*решетк|решётк/i,
oxidation:/окислител|восстановител|овр|окислительно-восстановительн|степен.*окислен/i,
mole:/молярн.*масс|количеств.*веществ|вычислен.*массы|масса.*объем.*веществ|масса.*объём.*веществ/i,
ion:/ионн.*обмен|ионн.*превращен|ионн.*уравнен|электролитич.*диссоци|диссоциац.*электролит|электролит/i,
salt:/сол[ьи]|оксид|основани|кислот/i,
amphoteric:/амфотер/i,
hydrolysis:/гидролиз/i,
equilibrium:/равновеси|влияни.*на.*равновеси/i,
kinetics:/скорост.*реакц|кинетик/i,
electrolysis:/электролиз|электрод/i,
metals:/металл|желез[ао]|мед[ьи]|цинк|алюмини/i,
nonmetals:/неметалл|галоген|азот|сер[аыу]|фосфор|кремни/i,
qualitative:/качественн.*реакц|распознаван|идентификац/i,
alkane:/алкан|метан/i,
alkene:/алкен|этен/i,
alkyne:/алкин|ацетилен/i,
arene:/арен|бензол/i,
hydrocarbon:/углеводород|циклоалкан|алкадиен/i,
isomerism:/изомер|номенклатур|классификац.*органич/i,
alcohol:/спирт|глицерин|многоатомн/i,
phenol:/фенол/i,
aldehyde:/альдегид|кетон|карбонил/i,
acidorganic:/карбон.*кислот/i,
ether:/сложн.*эфир|жир/i,
sugar:/углевод|сахар|крахмал/i,
amine:/амин|анилин|аминокислот|белк/i,
polymer:/полимер/i,
solutions:/раствор|массов.*дол|концентрац|растворимост|кристаллогидрат/i,
yield:/выход.*продукт|примес|избыток|ограничивающ.*реагент/i,
equations:/схем.*превращен|цепочк|последовательн.*реакц/i,
calculate:/расч[её]т|расчет|вычислен|материальн.*баланс/i
},
math:{
geometry:/геометр|планиметр|стереометр|треугольник|окружност/i,
vectors:/вектор/i,
prob:/вероятност|случайн.*событ|классическ.*определен.*вероятност/i,
distribution:/случайн.*величин|математическ.*ожидани|дисперси|распределени/i,
fractions:/дроб|рациональн.*выражен|числов.*рациональн/i,
powers:/степен|степенн.*выражен|корн|радикал/i,
logarithm:/логарифм/i,
equations:/линейн.*уравнен|квадратн.*уравнен|кубическ.*уравнен|алгебраическ.*уравнен/i,
trig:/тригонометр|синус|косинус|радианн/i,
trigeq:/тригонометрическ.*уравнен/i,
inequality:/неравенств|неравенств.*метод|метод.*интервал/i,
derivative:/производн|касательн/i,
functions:/график|функц/i,
wordproblems:/текстов.*задач|сплав|смес|процент|движен|работ/i,
finance:/кредит|вклад|финанс/i,
model:/моделир|оптимальн.*выбор|оптимизац/i,
parameter:/параметр/i,
numbertheory:/числ.*свойств|делимост/i
}};
const generics={
bio:/^(?:растения|животные|организм человека|общебиологические закономерности|человек и его здоровье|организм человека и его здоровье|растения\/грибы\/вирусы\/лишайники|животные и человек)$/i,
chem:/^(?:за[д­]дания для подготовки.*|задания тренировочных и диагностических работ|классификация.*вещества)$/i,
math:/^(?:разные задачи|смешанные задачи)$/i
};
const fullTest=/полный.*(?:вариант|пробн)|полноформатн|финальн.*вариант|вариант.*экзаменационн|пробник|экзаменационн.*вариант|полувариант/i;
function tags(subject,text){
 const dict=rules[subject]||{},t=String(text||"");
 return Object.keys(dict).filter(k=>dict[k].test(t));
}
const originalGet=P.get.bind(P);
const report={kept:0,hidden:0,partial:0,unreviewed:[],bySubject:{}};
const bank={};
for(const subject of D.subjectOrder){
 report.bySubject[subject]={kept:0,hidden:0};
 for(let w=1;w<=26;w++)for(let i=0;i<3;i++){
  const key=subject+":"+w+":"+i,lesson=L.get(key),candidate=originalGet(key)||{};
  const wanted=tags(subject,lesson.title),full=fullTest.test(lesson.title);
  if(subject==="math"){
    if(/№\s*14|уравнен.*№\s*14/.test(lesson.title)){wanted.push("trig","trigeq");}
    if(/№\s*16/.test(lesson.title)){wanted.push("inequality");}
    if(/№\s*17/.test(lesson.title)){wanted.push("finance","model","wordproblems");}
    if(/№\s*6/.test(lesson.title)){wanted.push("distribution");}
  }
  if(subject==="chem"){
    if(/задани[еяй]\s*29|№\s*29/.test(lesson.title))wanted.push("oxidation");
    if(/задани[еяй]\s*30|№\s*30/.test(lesson.title))wanted.push("ion");
    if(/задани[еяй]\s*31|№\s*31/.test(lesson.title))wanted.push("equations");
    if(/задани[еяй]\s*32|№\s*32/.test(lesson.title))wanted.push("equations","hydrocarbon");
    if(/задани[еяй]\s*33|№\s*33/.test(lesson.title))wanted.push("isomerism","calculate");
    if(/задани[еяй]\s*34|№\s*34/.test(lesson.title))wanted.push("calculate","yield","solutions");
    if(/алкан|алкен|алкин|арен|циклоалкан|алкадиен/.test(lesson.title.toLowerCase()))wanted.push("hydrocarbon");
  }
  const sources=Array.isArray(candidate.sources)?candidate.sources:[];
  const audited=[];
  for(const source of sources){
   const supplied=tags(subject,source.title),shared=wanted.filter(s=>supplied.includes(s));
   const broad=generics[subject]?.test(source.title.trim())||false;
   if(!full&&!broad&&shared.length&&/^(https:\/\/)/.test(source.url)){
      const narrow=wanted.length>shared.length||wanted.length>1||/смешан|контрол|повтор|вариац|сравнен|комплексн|блок/i.test(lesson.title);
      audited.push({...source,coverage:narrow?"partial":"topic",
        confidence:"catalog_title_matching_only",skillTags:shared});
      if(narrow)report.partial++;
   }else report.hidden++;
  }
  report.kept+=audited.length;report.bySubject[subject].kept+=audited.length;
  report.bySubject[subject].hidden+=sources.length-audited.length;
  if(!audited.length)report.unreviewed.push(key);
  bank[key]={...candidate,sources:audited,
    resourceAudit:{subject,topicTags:wanted,kept:audited.length,hidden:sources.length-audited.length,
      warning:"Это тематическая подборка по заголовку категории, не подтверждение содержания каждого задания."}};
 }
}
P.get=function(key){return bank[key]||null;};
P.all=bank; // Raw unreviewed mappings must not leak into other views.
window.EGE_RESOURCE_INTEGRITY={tags,report,get:key=>bank[key]||null,
 rulesVersion:"2026-10-editorial-v1",verification:"category_title_semantics_not_task_level"};
})();