/* Проверяем ПОКРЫТИЕ подтем, а не совпадение названия источника и карточки.
 * Только явно перечисленные и прочитанные статьи имеют evidence=page_content_reviewed.
 * Для остальных тем показываем редакционный долг, а не выдуманную полноту.
 * Проверка URL не означает проверку доступности/содержания каждой задачи.
 */
(function(){"use strict";
const D=window.EGE_DATA,L=window.EGE_LESSONS,T=window.EGE_THEORY;
if(!D||!L||!T)throw Error("Topic coverage needs data, lessons and theory");
const VERIFIED={
 "math:2:0":[["Классическая вероятность, элементарные исходы","https://foxford.ru/wiki/matematika/teoriya-veroyatnostey"],["Независимость событий и формула произведения","https://foxford.ru/wiki/matematika/teoriya-veroyatnostey"],["Условная вероятность и объединение событий","https://foxford.ru/wiki/matematika/teoriya-veroyatnostey"]],
 "math:2:2":[["Распределение случайной величины","https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"],["Математическое ожидание","https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"],["Дисперсия","https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"],["Стандартное отклонение","https://foxford.ru/wiki/matematika/zadanie-6-ege-po-profilnoy-matematike"]],
 "math:1:1":[
  ["Обыкновенные и десятичные дроби, операции с рациональными числами","https://foxford.ru/wiki/matematika/deistvija-s-racionalnymi-chislami"],
  ["Целые степени и правила преобразования","https://foxford.ru/wiki/matematika/svojstva-stepeni-s-celym-pokazatelem"],
  ["Корни и рациональные показатели","https://foxford.ru/wiki/matematika/stepen-s-ratsionalnym-pokazatelem"],
  ["Квадратные уравнения и дискриминант","https://foxford.ru/wiki/matematika/formula-korney-kvadratnogo-uravneniya"]
 ],
 "bio:2:0":[["Осмос и плазмолиз","https://foxford.ru/wiki/biologiya/osmos-i-osmoregulyatsiya"],["Активный и пассивный перенос","https://foxford.ru/wiki/biologiya/transport-veschestv-cherez-membranu-endotsitoz-i-ekzotsitoz"]],
 "bio:3:1":[["Генетический код: кодоны и свойства","https://foxford.ru/wiki/biologiya/geneticheskiy-kod"],["Трансляция: работа рибосомы и тРНК","https://foxford.ru/wiki/biologiya/translyatsiya-biosintez-belka"]],
 "bio:4:1":[["Гликолиз","https://foxford.ru/wiki/biologiya/obmen-veschestv-energeticheskiy-obmen-rol-atf"],["Клеточное дыхание","https://foxford.ru/wiki/biologiya/obmen-veschestv-energeticheskiy-obmen-rol-atf"]],
 "bio:7:0":[["Гены, аллели, генотип и фенотип","https://foxford.ru/wiki/biologiya/pervyy-zakon-mendelya-tipy-vzaimodeystviya-allelnyh-genov"],["Первый закон Менделя","https://foxford.ru/wiki/biologiya/pervyy-zakon-mendelya-tipy-vzaimodeystviya-allelnyh-genov"],["Второй закон и чистота гамет","https://foxford.ru/wiki/biologiya/vtoroy-zakon-mendelya-zakon-chistoty-gamet"],["Третий закон Менделя","https://foxford.ru/wiki/biologiya/di-i-poligibridnoe-skreschivanie-tretiy-zakon-mendelya"]],
 "bio:1:0":[
  ["Методы биологических исследований, наблюдение и эксперимент","https://foxford.ru/wiki/biologiya/nauka-biologiya-metody-izucheniya-biologii"],
  ["Уровни организации живых систем","https://foxford.ru/wiki/biologiya/urovni-strukturnoy-organizatsii-zhivogo"],
  ["Вода, минеральные соли и их роль в клетке","https://foxford.ru/wiki/biologiya/himicheskiy-sostav-zhivyh-organizmov-mineralnye-veschestva-voda"]
 ],
 "bio:1:1":[
  ["Углеводы: моно-, олиго- и полисахариды, функции","https://foxford.ru/wiki/biologiya/uglevody-ih-stroenie-i-funktsii"],
  ["Липиды: триглицериды, фосфолипиды, функции","https://foxford.ru/wiki/biologiya/lipidy-ih-svoystva-i-funktsii-membrany"],
  ["Строение белков и уровни структуры","https://foxford.ru/wiki/biologiya/struktura-belka"],
  ["Функции белков и принципы действия ферментов","https://foxford.ru/wiki/biologiya/funktsii-belkov-fermenty"],
  ["АТФ: роль в энергетическом обмене","https://foxford.ru/wiki/biologiya/obmen-veschestv-energeticheskiy-obmen-rol-atf"]
 ],
 "chem:1:1":[
  ["Виды, свойства и механизмы химической связи","https://foxford.ru/wiki/himiya/vidy-harakteristiki-i-mehanizmy-obrazovaniya-himicheskoy-svyazi"],
  ["Молекулярные, атомные, ионные, металлические решётки; свойства веществ","https://foxford.ru/wiki/himiya/tipy-kristallicheskih-reshetok-i-fizicheskie-svoystva-veschestv"],
  ["Степень окисления, правила определения и расчёт","https://foxford.ru/wiki/himiya/algoritm-opredeleniya-stepeni-okisleniya-i-valentnosti-elementa-v-soedinenii"]
 ],
 "chem:1:2":[
  ["Количество вещества, моль, молярная масса, формула n=m/M","https://foxford.ru/wiki/himiya/mol-molyarnaya-massa"],
  ["Молярный объём газа и расчёты n=V/Vm при известных условиях","https://foxford.ru/wiki/himiya/osnovnye-ponyatiya-mol"],
  ["Стехиометрические коэффициенты и расчёты массы/объёма по реакциям","https://foxford.ru/wiki/himiya/raschety-po-himicheskim-uravneniyam"]
 ],
 "chem:2:0":[
  ["Сильные и слабые электролиты, диссоциация","https://foxford.ru/wiki/himiya/teoriya-elektroliticheskoy-dissotsiatsii-ted"],
  ["Полные и сокращённые ионные уравнения реакций","https://foxford.ru/wiki/himiya/reaktsii-ionnogo-obmena-v-rastvorah"],
  ["Таблица растворимости и условия обмена в растворах","https://foxford.ru/wiki/himiya/reaktsii-ionnogo-obmena-v-rastvorah"]
 ],
 "chem:3:0":[
  ["Гидролиз солей и его ионные уравнения","https://foxford.ru/wiki/himiya/gidroliz"],
  ["Кислая, нейтральная, щелочная среда и качественная оценка pH","https://foxford.ru/wiki/himiya/gidroliz"],
  ["Химическое равновесие и принцип Ле Шателье","https://foxford.ru/wiki/himiya/smeschenie-himicheskogo-ravnovesiya"]
 ]
};
function splitRequirements(lesson){
 // Поле know — редакционная учебная цель. Точки с запятой разделяют группы
 // навыков, но НЕ означают, что любая ссылка доказывает покрытие такой группы.
 const raw=String(lesson?.know||lesson?.title||"").trim();
 const byMeaning=raw.split(/\s*;\s*/).map(x=>x.trim()).filter(Boolean);
 if(byMeaning.length>1)return byMeaning;
 const fragments=String(lesson?.title||"").split(/\s*[,;]\s*/).map(x=>x.trim()).filter(Boolean);
 return fragments.length>1?fragments:byMeaning;
}
const indexed={};
for(const subject of D.subjectOrder)for(let week=1;week<=26;week++)for(let index=0;index<3;index++){
 const id=subject+":"+week+":"+index,lesson=L.get(id);
 if(!lesson||lesson.subject!==subject)throw Error("Unknown lesson "+id);
 const articles=T.get(id,subject,lesson.title,lesson).articles||[];
 const editorial=VERIFIED[id];
 if(editorial){
  const urls=new Set(articles.map(x=>x.url));
  if(editorial.length<2)throw Error("Multi-component verification expected "+id);
  for(const [label,url] of editorial){
   if(!label||!urls.has(url))throw Error("Coverage evidence not in source list "+id+" "+url);
  }
 }
 const components=editorial?editorial.map(([label,url])=>({
  label,source:articles.find(x=>x.url===url),evidence:"page_content_reviewed"
 })):splitRequirements(lesson).map(label=>({label,source:null,evidence:"not_reviewed"}));
 indexed[id]={
  id,title:lesson.title,subject,reviewed:!!editorial,
  components,
  sourceCount:articles.length,
  unmatched:components.filter(x=>!x.source).length,
  status:editorial?"reviewed_selected_aspects":"requires_editorial_content_review",
  notice:editorial?
   "Для перечисленных аспектов подобраны и проверены по содержанию конкретные статьи. Практику и полный объём учебника необходимо проверять отдельно.":
   "Точное покрытие каждого пункта внешними материалами пока не проверено. Наличие статьи, параграфа или категории задач не доказывает полноту темы."
 };
}
function get(id){return Object.hasOwn(indexed,id)?indexed[id]:null;}
const report={topics:Object.keys(indexed).length,reviewed:Object.values(indexed).filter(x=>x.reviewed).length,
 unchecked:Object.values(indexed).filter(x=>!x.reviewed).length,
 parts:Object.values(indexed).reduce((n,x)=>n+x.components.length,0)};
window.EGE_COVERAGE={get,all:indexed,report,version:"2026-10-09-atomic-content-evidence-v1"};
})();