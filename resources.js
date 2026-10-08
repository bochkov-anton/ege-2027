/* Проверенные тематические материалы ФИПИ и каталоги практики.
 * PDF относятся к ЕГЭ-2026 (пособия остаются полезными, но КИМ-2027 проверять отдельно).
 * Не выдавать общие каталоги за точно подобранные номера задач. */
(function(){
"use strict";
const base="https://doc.fipi.ru/navigator-podgotovki/navigator-ege/2026/";
const item=(title,url,type="Официальный материал")=>({title,url,type});
const official={
  bio:{
    method:item("ФИПИ: биология как наука, метод эксперимента",base+"bi-1-biologija-kak-nauka.pdf"),
    cell:item("ФИПИ: клетка, молекулярная биология, обмен",base+"bi-2-kletka.pdf"),
    organism:item("ФИПИ: организм, размножение, генетика",base+"bi-3-organizm.pdf"),
    diversity:item("ФИПИ: растения, грибы и животные",base+"bi-4-mnogoobrazie.pdf"),
    human:item("ФИПИ: человек и здоровье",base+"bi-5-chelovek-i-ego-zdorove.pdf"),
    evolution:item("ФИПИ: эволюция",base+"bi-6-evoljucija.pdf"),
    ecology:item("ФИПИ: экосистемы и экология",base+"bi-7-ecologia.pdf"),
    practice:item("ФИПИ: тренировочные задания по биологии",base+"bi-tren.pdf"),
    experiment:item("ФИПИ: разбор задач по эксперименту (видео)","https://rutube.ru/video/3fe6e9b58f10ff15f77800e2ef47172e/","Официальное видео"),
    genetics1:item("ФИПИ: генетика, кумулятивная полимерия (видео)","https://rutube.ru/video/83963f7f853c348f7d92fd09598cec30/","Официальное видео"),
    genetics2:item("ФИПИ: независимое и сцепленное наследование (видео)","https://rutube.ru/video/be2a4085ca73e7029666be157aca26e4/","Официальное видео")
  },
  chem:{
    basics:item("ФИПИ: строение вещества и основы химии",base+"hi-teoreticheskie-osnovy.pdf"),
    reaction:item("ФИПИ: химические реакции, равновесие, ОВР",base+"hi-himicheskaja-reakcija.pdf"),
    inorganic:item("ФИПИ: неорганические вещества",base+"hi-neorganicheskaja-himija.pdf"),
    organic:item("ФИПИ: органические вещества и превращения",base+"hi-organicheskaja-himija.pdf"),
    practice:item("ФИПИ: тренировочные задания по химии",base+"hi-tren.pdf")
  },
  math:{
    basics:item("ФИПИ: выражения и преобразования",base+"Mat_prof_1.pdf"),
    word:item("ФИПИ: текстовые задачи",base+"Mat_prof_2_tekst.pdf"),
    equations:item("ФИПИ: уравнения",base+"Mat_prof_3%20uravnenia.pdf"),
    inequalities:item("ФИПИ: неравенства",base+"Mat_prof_4_neravenstva.pdf"),
    functions:item("ФИПИ: функции и производная",base+"Mat_prof_5_funkcii.pdf"),
    probability:item("ФИПИ: вероятность и статистика",base+"Mat_prof_6_veroyatnost.pdf")
  }
};
const shared=[
  item("ФИПИ: демоверсии, спецификации, критерии — проверяйте год","https://fipi.ru/ege/demoversii-specifikacii-kodifikatory","Актуализация экзамена"),
  item("ФИПИ: открытый банк заданий","https://fipi.ru/ege/otkrytyy-bank-zadaniy-ege","Официальный банк")
];
const practice={
 bio:item("РЕШУ ЕГЭ: каталог биологических задач","https://bio-ege.sdamgia.ru/prob_catalog","Каталог практики"),
 chem:item("РЕШУ ЕГЭ: каталог химических задач","https://chem-ege.sdamgia.ru/prob_catalog","Каталог практики"),
 math:item("РЕШУ ЕГЭ: каталог профильной математики","https://math-ege.sdamgia.ru/prob_catalog","Каталог практики")
};
const all=(a)=>Array.from(new Map(a.filter(Boolean).map(x=>[x.url,x])).values());
function forTopic(subject,week,title){
  const t=String(title||"").toLowerCase(),o=official[subject]||{};
  if(subject==="bio"){
    const first=week<=5?[o.cell]:week<=7?[o.organism]:week<=15?[o.diversity]:week<=19?[o.human]:week<=21?[o.evolution]:week<=22?[o.ecology]:[o.practice];
    if(/генетик|мендел|наслед|сцеплен|родослов/.test(t))first.unshift(o.organism,o.genetics2);
    if(/митоз|мейоз|клеточн|транскрип|трансляц|дыхани|фотосинтез/.test(t))first.unshift(o.cell);
    if(/эксперимент/.test(t))first.unshift(o.method,o.experiment);
    if(/метод|уровни организации/.test(t))first.unshift(o.method);
    return all([...first,o.practice,practice.bio,shared[0]]).slice(0,6);
  }
  if(subject==="chem"){
    const chosen=week<2?[o.basics,o.reaction]:week<8?[o.inorganic,o.reaction]:week<15?[o.organic,o.reaction]:[o.practice,o.reaction];
    if(/степен|атом|связ|период/.test(t))chosen.unshift(o.basics);
    if(/органик|алкан|алкен|альдегид|спирт|фенол|карбон|эфир|амин|белк|изомер/.test(t))chosen.unshift(o.organic);
    if(/металл|неметалл|амфотер|качествен|неорган/.test(t))chosen.unshift(o.inorganic);
    if(/овр|ионн|равновес|электролиз|гидролиз|расч|раствор|стехиометр|34/.test(t))chosen.unshift(o.reaction);
    return all([...chosen,o.practice,practice.chem,shared[0]]).slice(0,6);
  }
  const chosen=[o.basics];
  if(/вероят|распределени|статист/.test(t))chosen.unshift(o.probability);
  if(/неравен|одз|интервал/.test(t))chosen.unshift(o.inequalities);
  if(/текстов|финансов|приклад|модел/.test(t))chosen.unshift(o.word);
  if(/уравнен|тригонометр/.test(t))chosen.unshift(o.equations);
  if(/производ|функци|график|экстремум/.test(t))chosen.unshift(o.functions);
  return all([...chosen,practice.math,shared[0]]).slice(0,5);
}
function practicePlan(subject,kind,week,title){
  if(kind==="review")return ["Сначала ответить без конспекта: 2–4 контрольных вопроса/задачи.","Проверить ответы и отметить: уверенно, с трудом, ошибка.","Не добавлять материал ради заполнения времени."];
  if(subject==="bio"){
    return kind==="new"?["Восстановить тему по памяти: 3–5 контрольных вопросов перед чтением.","Адресная теория 10–15 минут; нарисовать схему или причинную цепочку.","3–6 заданий по теме без подсказки; одно объяснение своими словами."]:
      ["5–8 разнотипных заданий; как минимум один процесс/рисунок/эксперимент, если уместно.","На темах генетики — задачи с оформлением; на второй части — проверка по элементам критериев.","Ошибку превратить в конкретное действие, а не только записать."];
  }
  if(subject==="chem"){
    return kind==="new"?["Вспомнить известные условия реакций/формулы до чтения.","Разобрать 1–2 образца, затем закрыть решение.","Предсказать продукты/условия 3–5 реакций, решить 2–3 упражнения самостоятельно."]:
      ["4–7 задач разных моделей с проверкой баланса/единиц.","Хотя бы один расчёт или элемент сложной части, если тема позволяет.","Перепроверить условия реакции и критерии оформления."];
  }
  return kind==="new"?["Решить 1 входную задачу без подсказки.","Если пробел — короткий worked example и постепенное снятие подсказок.","4–6 задач с вариациями и проверкой ОДЗ, знаков, единиц."]:
    ["4–7 задач разного типа; смешивать методы после начальной точности.","Если тема №14/16/17 — записать полный ход решения по критериям.","Проверить отсроченно, а не решать бесконечную пачку сейчас."];
}
function weeklyEssentials(subject,week){
 if(subject==="bio"){
  return week<6?["1 задание на эксперимент и переменные","5 изображений или схем с признаками","1 развёрнутый ответ по критериям"]:
  ["1 экспериментальная задача","2 задачи на генетику/молекулярные расчёты","5 изображений и 2 развёрнутых ответа"];
 }
 if(subject==="chem")return ["2 коротких касания расчётов","2 мини-набора прогнозирования продуктов","1 элемент второй части и проверка записи"];
 return ["1 смешанный блок первой части","1 развёрнутая задача (№14/16/17 по этапу)","1 короткая геометрическая сессия"];
}
window.EGE_RESOURCES={official,forTopic,practicePlan,weeklyEssentials,shared};
})();