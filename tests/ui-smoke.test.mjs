import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

function runApp(seed=null,clock=null) {
  const nodes=new Map(),events=new Map(),store=new Map(),intervals=new Map();let intervalId=0;
  const stableMidday=new Date();stableMidday.setHours(15,0,0,0);
  const RuntimeDate=class extends Date {
    constructor(...args){super(...(args.length?args:[clock?clock.now:stableMidday.getTime()]));}
    static now(){return clock?clock.now:stableMidday.getTime();}
  };
  if(seed)store.set("ege2027-local-progress-v1",JSON.stringify(seed));
  function node(selector) {
    if(!nodes.has(selector)) nodes.set(selector,{innerHTML:"",textContent:"",value:"",dataset:{},classList:{toggle(){}},addEventListener(type,fn){events.set(selector+":"+type,fn);},focus(){},showModal(){this.open=true;},close(){this.open=false;}});
    return nodes.get(selector);
  }
  const document={
    querySelector:node,querySelectorAll(){return[];},addEventListener(type,fn){events.set("document:"+type,fn);}
  };
  const localStorage={getItem(k){return store.get(k)||null;},setItem(k,v){store.set(k,v);}};
  const window={EGE_DATA:null,EGE_LOGIC:null,EGE_RESOURCES:null,EGE_UX:null};
  class FakeFormData {constructor(form){this.data=form.values||{};}get(key){return this.data[key]??null;}}
  const context=vm.createContext({window,document,localStorage,Date:RuntimeDate,Intl,console,URL,FormData:FakeFormData,setTimeout:()=>1,clearTimeout(){},setInterval(fn){const id=++intervalId;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);},confirm:()=>true});
  for(const file of ["data.js","wellbeing.js","logic.js","curriculum.js","fipi-map.js","resources.js","topic-practice.js","lesson-content.js","theory-core.js","fipi-supplements.js","resource-integrity.js","textbooks.js","verified-tocs.js","page-assignments.js","reading-guide.js","topic-coverage.js","coverage-candidates.js","study-source-routes.js","experience.js","app.js"])vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),context,{filename:file});
  return {nodes,events,store,window,node,tick(){for(const fn of [...intervals.values()])fn();}};
}
function markStudySteps(a,click,verify=true){
  const change=a.events.get("document:change");
  change({target:{dataset:{step:"0"},checked:true,matches:()=>true}});
  click({action:"lesson-tab",tab:"practice"});
  change({target:{dataset:{step:"1"},checked:true,matches:()=>true}});
  if(verify)change({target:{dataset:{step:"2"},checked:true,matches:()=>true}});
}
test("приложение загружается без DOM-ошибок и выводит план дня",()=>{
  const a=runApp();
  assert.ok(a.node("#app").innerHTML.includes("Ежедневный план"));
  assert.ok(["Следующее занятие","День без занятий","Основная работа завершена"].some(v=>a.node("#app").innerHTML.includes(v)));
});
test("фокусный экран предлагает одно следующее действие без дублирования прогресса",()=>{
 const a=runApp(),L=a.window.EGE_LOGIC;
 if(!L.isStudyDay(L.today()))return;
 const h=a.node("#app").innerHTML;
 assert.ok(h.includes('class="focus-board card"'));
 assert.ok(h.includes('class="btn focus-primary"'));
 assert.ok(h.includes('role="progressbar"'));
 assert.ok(h.includes('aria-valuenow='));
 assert.ok(h.includes('class="daily-facts"'));
 assert.equal((h.match(/Прогресс сегодня/g)||[]).length,0);
 assert.ok(h.includes('class="day-mode"'));
 assert.ok(h.includes('class="task-more"'));
 assert.ok(h.includes('data-action="show-materials"'));
});
test("повторения требуют сначала сформулировать ответ, затем оценить его",()=>{
 const today=new Date(),day=today.getDay();if(day===0||day===6)return;
 const r={"bio:1:0":{subject:"bio",title:"Повторить биологию",due:"2026-01-01",stage:0,successes:0}};
 const a=runApp({completed:{},reviews:r,errors:[]});
 a.events.get("document:click")({target:{closest:()=>({dataset:{view:"reviews"}})}});
 const h=a.node("#app").innerHTML;
 assert.ok(h.includes('class="review-item review-recall"'));
 assert.ok(h.includes('<details class="recall-check"><summary>Проверить себя без подсказки</summary>'));
 assert.ok(h.includes('ВОСПРОИЗВЕДЕНИЕ ПО ПАМЯТИ'));
 assert.ok(h.includes('Самостоятельно'));
 assert.ok(h.includes('Открыть объяснение и материалы'));
 assert.ok(!h.includes('>Уверенно</button>'));
});
test("быстрые запросы библиотеки находят темы и позволяют очистить фильтр",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({view:"subjects"});
 assert.ok(a.node("#app").innerHTML.includes('role="search"'));
 assert.ok(a.node("#app").innerHTML.includes('data-action="search-suggestion"'));
 click({action:"search-suggestion",query:"Логарифмы"});
 assert.ok(a.node("#app").innerHTML.includes('value="Логарифмы"'));
 assert.ok(a.node("#app").innerHTML.includes("Результаты поиска"));
 assert.ok(a.node("#app").innerHTML.includes("Очистить поиск"));
 click({action:"clear-search"});
 assert.ok(!a.node("#app").innerHTML.includes('value="Логарифмы"'));
 assert.ok(a.node("#app").innerHTML.includes('id="topic-current-week"'));
});
test("неделя позволяет сворачивать предметы без потери всех девяти тем",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({view:"week"});
 const html=a.node("#app").innerHTML;
 assert.ok(html.includes('class="week-course" open'));
 assert.ok(html.includes('class="week-course"><summary'));
 assert.equal((html.match(/class="week-lesson"/g)||[]).length,9);
});
test("планшетный режим чтения увеличивает текст, не изменяя прогресс",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"chem:1:1"});
 const html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes('data-action="toggle-reader-size"'));
 assert.ok(html.includes('aria-controls="lesson-theory"'));
 assert.ok(html.includes('aria-controls="lesson-practice"'));
 assert.ok(html.indexOf('КРАТКИЙ КОНСПЕКТ')<html.indexOf('<div class="foxford-list">'));
 const progressBefore=a.store.get("ege2027-local-progress-v1");
 click({action:"toggle-reader-size"});
 assert.equal(a.store.get("ege2027-large-reader-v1"),"1");
 assert.equal(a.store.get("ege2027-local-progress-v1"),progressBefore);
 click({action:"toggle-reader-size"});
 assert.equal(a.store.get("ege2027-large-reader-v1"),"0");
});
test("навигация отрисовывает все разделы",()=>{
  const a=runApp();
  for(const [view,title] of [["week","Неделя"],["subjects","Предметы"],["reviews","Повторения"],["progress","Прогресс"],["settings","Настройки"]]){
    a.events.get("document:click")({target:{closest:()=>({dataset:{view}})}});
    assert.equal(a.node("#top-section").textContent,title);
    assert.ok(a.node("#app").innerHTML.length>300);
  }
});
test("школьная нагрузка автоматически снижает число учебных блоков",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC;
  if(!L.isStudyDay(L.today()))return;
  a.events.get("document:change")({target:{id:"school-homework",value:"120"}});
  const state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.school[L.today()].homework,120);
  assert.ok(a.node("#app").innerHTML.includes("120"),"Обновлённое значение школьного ДЗ отображается независимо от текущего времени суток");
});
test("результат занятий сохраняется и низкая точность создаёт ранний повтор",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC;
  const date=L.today();
  if(!L.isStudyDay(date))return;
  const first=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[date][0];
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:first.id});
  assert.ok(a.node("#dialog-content").innerHTML.includes("Теория: Фоксфорд + учебник"));
  assert.ok(a.node("#dialog-content").innerHTML.includes("2. Задания и проверка"));
  markStudySteps(a,click,false);
  a.node("#task-score").value="2/10";
  click({action:"save-score"});
  const saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(saved.results[first.id].correct,2);
  assert.equal(saved.results[first.id].total,10);
  assert.equal(saved.reviews[first.topicKey].due,L.shiftStudyDays(date,1));
});
test("отметка выполненного блока сохраняется и создаёт повтор",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC;
  const date=L.today();
  if(!L.isStudyDay(date)) return;
  const first=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[date][0];
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:first.id});markStudySteps(a,click);
  a.node("#task-score").value="4/5";click({action:"save-score"});
  click({action:"toggle-task",id:first.id});
  const saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(saved.completed[first.id],first.subject);
  assert.equal(saved.topicProgress[first.topicKey].theory,true);
  assert.equal(saved.topicProgress[first.topicKey].practice,true,"Теория и проверенная практика завершены");
});
test("поиск тем и открытие подробной карточки работают без перехода по неделям",()=>{
  const a=runApp(),click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({view:"subjects"});
  a.events.get("document:input")({target:{id:"topic-search",value:"генетика"}});
  assert.ok(a.node("#topic-results").innerHTML.includes("Генетика")||a.node("#topic-results").innerHTML.includes("генетика"));
  const topic=a.window.EGE_UX.findTopics("генетика")[0];assert.ok(topic);
  click({action:"open-topic",key:topic.key});
  assert.ok(a.node("#dialog-content").innerHTML.includes("ЧТО НУЖНО ПОНЯТЬ"));
  assert.ok(a.node("#dialog-content").innerHTML.includes("КРАТКИЙ КОНСПЕКТ"));
  a.events.get("document:input")({target:{id:"topic-note",value:"Нужно повторить решётку Пеннета."}});
  const saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(saved.topicNotes[topic.key],"Нужно повторить решётку Пеннета.");
  click({action:"pin-topic",key:topic.key});
  const saved2=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(saved2.pinned[topic.key],true);
});
test("шаги занятия, заметки и пропуск сохраняются по отдельности",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,date=L.today();
  if(!L.isStudyDay(date))return;
  const first=L.planDay(date,L.iso(L.monday(new Date())))[0];
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:first.id});
  a.events.get("document:change")({target:{id:"step-test",dataset:{step:"0"},checked:true,matches:()=>true}});
  a.events.get("document:input")({target:{id:"task-note",value:"Путаю условия реакции"}});
  let state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.steps[first.id][0],true);
  assert.equal(state.notes[first.id],"Путаю условия реакции");
  click({action:"close-dialog"});
  click({action:"skip-task",id:first.id});
  state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.skipped[first.id],true);
  assert.equal(state.completed[first.id],undefined);
  click({action:"skip-task",id:first.id});
  state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.skipped[first.id],undefined);
});
test("пользовательская ссылка сохраняется и опасные адреса отклоняются",()=>{
  const a=runApp(),U=a.window.EGE_UX;
  const topic=U.findTopics("митоз")[0];
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"open-topic",key:topic.key});
  const submit=(url)=>a.events.get("document:submit")({preventDefault(){},target:{id:"add-link-form",values:{title:"Мой набор",url},reset(){}}});
  submit("https://example.org/practice");
  let state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.customLinks[topic.key].length,1);
  assert.ok(a.node("#dialog-resources").innerHTML.includes("example.org/practice"));
  submit("javascript:alert(1)");
  state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.customLinks[topic.key].length,1);
  click({action:"remove-resource",topic:topic.key,url:"https://example.org/practice"});
  state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.customLinks[topic.key].length,0);
});
test("прежние данные загружаются, небезопасные ссылки из резервной копии не отображаются",()=>{
  const start=new Date(),monday=new Date(start);monday.setDate(start.getDate()-(start.getDay()+6)%7);
  const day=[monday.getFullYear(),String(monday.getMonth()+1).padStart(2,"0"),String(monday.getDate()).padStart(2,"0")].join("-");
  const seed={startDate:day,completed:{},reviews:{},errors:[],customLinks:{"bio:1:0":[{title:"Подмена",url:"javascript:alert(1)"}]}};
  const a=runApp(seed);
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"open-topic",key:"bio:1:0"});
  const resources=a.node("#dialog-content").innerHTML;
  assert.ok(!resources.includes("javascript:alert"));
  assert.ok(resources.includes("Фоксфорд"));
  assert.ok(!resources.includes("fipi.ru"));
  assert.ok(a.node("#dialog-content").innerHTML.includes("Мои заметки"));
});
test("закладки доступны из поиска и с главной страницы",()=>{
  const a=runApp(),t=a.window.EGE_UX.findTopics("генетика")[0];
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({view:"subjects"});click({action:"open-topic",key:t.key});click({action:"pin-topic",key:t.key});
  click({action:"close-dialog"});click({action:"toggle-pins"});
  assert.ok(a.node("#app").innerHTML.includes("Закладки"));
  assert.ok(a.node("#app").innerHTML.includes(t.title));
  click({view:"today"});
  if(a.window.EGE_LOGIC.isStudyDay(a.window.EGE_LOGIC.today()))
    assert.ok(a.node("#app").innerHTML.includes("Темы в закладках"));
});
test("дневные заметки отображаются в истории и не исчезают при навигации",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC;if(!L.isStudyDay(L.today()))return;
  const t=L.planDay(L.today(),L.iso(L.monday(new Date())))[0];
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:t.id});
  a.events.get("document:input")({target:{id:"task-note",value:"Вычисления: проверить единицы."}});
  click({action:"close-dialog"});click({view:"progress"});
  assert.ok(a.node("#app").innerHTML.includes("Последние записи"));
  assert.ok(a.node("#app").innerHTML.includes("проверить единицы"));
});
test("очередь повторений показывает ограниченный набор и позволяет раскрыть остальные",()=>{
  const d=new Date(),weekday=d.getDay();if(weekday===0||weekday===6)return;
  const start=new Date(d);start.setDate(d.getDate()-(weekday+6)%7);
  const iso=x=>[x.getFullYear(),String(x.getMonth()+1).padStart(2,"0"),String(x.getDate()).padStart(2,"0")].join("-");
  const reviews={};
  for(let i=0;i<12;i++)reviews["bio:1:"+i]={subject:"bio",title:"Контроль "+i,due:"2026-01-01",stage:0,successes:0};
  const a=runApp({startDate:iso(start),completed:{},reviews,errors:[]});
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({view:"reviews"});
  assert.ok(a.node("#app").innerHTML.includes("Показать всю очередь"));
  assert.equal((a.node("#app").innerHTML.match(/class="review-item review-recall"/g)||[]).length,6);
  click({action:"toggle-all-reviews"});
  assert.equal((a.node("#app").innerHTML.match(/class="review-item review-recall"/g)||[]).length,12);
});
test("сегодня показывает старые обязательные занятия как долг и фиксирует состав дня",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day)||L.parseDate(day).getDay()<2)return;
  const initial=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  const assigned=initial.curriculumAssignments[day];assert.ok(Array.isArray(assigned)&&assigned.length===2);
  assert.ok(a.node("#app").innerHTML.includes("Темы, требующие завершения"));
  assert.ok(a.node("#app").innerHTML.includes("Следующее занятие"));
  const first=assigned[0];
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:first.id});markStudySteps(a,click);
  a.node("#task-score").value="4/5";click({action:"save-score"});
  click({action:"toggle-task",id:first.id});
  const now=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(now.completed[first.id],first.subject);
  assert.ok(now.restSuggestion?.minutes>=15||a.node("#app").innerHTML.includes("Перерыв"));
  assert.deepEqual(Array.from(now.curriculumAssignments[day].map(x=>x.id)),Array.from(assigned.map(x=>x.id)));
  assert.ok(a.node("#app").innerHTML.includes("Выполнено сегодня"));
  assert.ok(a.node("#app").innerHTML.includes("Рекомендуется перерыв"));
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"start-break"}})}});
  const after=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.ok(after.restTimer.endAt>0);
  assert.ok(a.node("#app").innerHTML.includes("rest-countdown"));
});
test("очередь отложенной работы открывается и содержит исходные даты",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day)||L.parseDate(day).getDay()<2)return;
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"show-backlog"}})}});
  assert.ok(a.node("#app").innerHTML.includes("Последовательность без пропусков"));
  assert.ok(a.node("#app").innerHTML.includes("backlog-row"));
});
test("таймер достигает лимита, фиксирует результат и предлагает отдых",()=>{
  const clock={now:new Date(new Date().setHours(15,0,0,0)).getTime()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const assigned=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day].map(x=>x.id);
  if(!assigned?.length)return;
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"detail",id:assigned[0]});
  click({action:"timer-toggle"});
  clock.now+=75*60*1000;
  a.tick();
  const state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.restSuggestion.minutes,15);
  assert.ok(state.timeSpent[assigned[0]]>=3300);
  assert.ok(a.node("#timer-alert").textContent.includes("Перерыв")||a.node("#timer-alert").textContent.includes("перерыв"));
  click({action:"start-break"});
  clock.now+=15*60*1000;
  a.tick();
  const after=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(after.restTimer.notified,true);
});
test("мобильная кнопка Сегодня возвращает на реальную дату из старого дня",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  a.events.get("document:click")({target:{closest:()=>({dataset:{view:"week"}})}});
  const monday=L.iso(L.monday(new Date()));
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"pick-day",date:monday}})}});
  a.events.get("document:click")({target:{closest:()=>({dataset:{view:"today"}})}});
  assert.ok(a.node("#app").innerHTML.includes("Ежедневный план"));
  assert.ok(a.node("#app").innerHTML.includes(new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long"}).format(L.parseDate(day))));
});

test("после закрытия карточки занятия таймер продолжает отсчёт в верхней панели",()=>{
  const clock={now:new Date(new Date().setHours(15,0,0,0)).getTime()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const task=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day][0].id;
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"detail",id:task});
  click({action:"timer-toggle"});
  clock.now+=16000;a.tick();
  assert.equal(a.node("#study-clock").textContent,"00:16");
  click({action:"close-dialog"});
  let stored=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(stored.studyTimer.taskId,task);
  assert.ok(stored.studyTimer.startedAt);
  clock.now+=44000;a.tick();
  assert.equal(a.node("#study-clock").textContent,"01:00");
  click({action:"session-open",id:task});
  assert.ok(a.node("#dialog-content").innerHTML.includes('id="timer-clock">01:00'));
  assert.ok(a.node("#dialog-content").innerHTML.includes('id="timer-button">Пауза'));
  click({action:"close-dialog"});
  a.events.get("#task-dialog:close")?.();
  stored=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.ok(stored.studyTimer.startedAt,"native dialog close must not pause");
  click({action:"session-toggle"});
  stored=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(stored.studyTimer.startedAt,null);
  assert.equal(stored.studyTimer.elapsedSeconds,60);
  clock.now+=30000;a.tick();
  assert.equal(a.node("#study-clock").textContent,"01:00","paused time must be stable");
});
test("запущенный таймер восстанавливается после повторной загрузки приложения",()=>{
  const clock={now:new Date(new Date().setHours(15,0,0,0)).getTime()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const task=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day][0].id;
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:task});click({action:"timer-toggle"});click({action:"close-dialog"});
  const backup=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  clock.now+=110000;
  const b=runApp(backup,clock);
  b.tick();
  assert.equal(b.node("#study-clock").textContent,"01:50");
  const restored=JSON.parse(b.store.get("ege2027-local-progress-v1"));
  assert.equal(restored.studyTimer.taskId,task);
  assert.ok(restored.studyTimer.startedAt);
  clock.now+=76*60000;b.tick();
  const after=JSON.parse(b.store.get("ege2027-local-progress-v1"));
  assert.equal(after.studyTimer.startedAt,null);
  assert.equal(after.studyTimer.notified,true);
  assert.ok(after.timeSpent[task]>=3300);
});
test("кнопка Материалы открывает список источников вместо непонятной прямой ссылки",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const first=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day][0].id;
  assert.ok(a.node("#app").innerHTML.includes('data-action="show-materials"'));
  assert.ok(!a.node("#app").innerHTML.includes('title="Открыть материал"'));
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"show-materials",id:first}})}});
  assert.ok(a.node("#dialog-content").innerHTML.includes("подборки задач"),a.node("#dialog-content").innerHTML.slice(0,600));
  assert.ok(a.node("#dialog-content").innerHTML.includes("РЕШУ ЕГЭ"));
  assert.ok(a.node("#dialog-content").innerHTML.includes('data-action="copy-resource"'));
  assert.ok(!a.node("#dialog-content").innerHTML.includes("doc.fipi.ru"));
});

test("вкладка нагрузки показывает защищённый сон и параметры школы",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  assert.ok(a.node("#app").innerHTML.includes("Защищённый сон"));
  assert.ok(a.node("#app").innerHTML.includes("school-wake"));
  assert.ok(a.node("#app").innerHTML.includes("school-recovery"));
  a.events.get("document:change")({target:{id:"school-wake",value:"06:30"}});
  let state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.school[day].wakeTime,"06:30");
  a.events.get("document:change")({target:{id:"school-sleep",value:"6"}});
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"set-mode",mode:"normal"}})}});
  state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(state.school[day].manualMode,"normal");
  assert.equal(L.suggestDay(state.school[day]),"off");
  assert.ok(a.node("#app").innerHTML.includes("0 мин ЕГЭ"));
});
test("ночной предел останавливает таймер и не засчитывает часы сна в занятия",()=>{
  const clock={now:new Date(new Date().setHours(15,0,0,0)).getTime()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const id=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day][0].id;
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"detail",id});click({action:"timer-toggle"});
  const t=JSON.parse(a.store.get("ege2027-local-progress-v1")).studyTimer;
  if(!t?.startedAt)return;
  assert.ok(t.hardStopAt>clock.now);
  clock.now=t.hardStopAt+9*3600*1000;
  a.tick();
  const end=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(end.studyTimer.startedAt,null);
  assert.ok(end.timeSpent[id]<16*3600,"No overnight accumulation");
  assert.ok(end.timeSpent[id]>=0);
});
test("теория Фоксфорд отделена от прямых заданий и переключается без потери заметок",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const first=JSON.parse(a.store.get("ege2027-local-progress-v1")).curriculumAssignments[day][0].id;
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"detail",id:first});
  const html=a.node("#dialog-content").innerHTML;
  assert.ok(html.includes("Теория: Фоксфорд + учебник"));
  assert.ok(html.includes("КРАТКИЙ КОНСПЕКТ"));
  assert.ok(html.includes("Задания и проверка"));
  assert.ok(html.includes("category_id="));
  assert.ok(!html.includes("fipi.ru"));
  a.events.get("document:change")({target:{dataset:{step:"0"},checked:true,matches:()=>true}});
  click({action:"lesson-tab",tab:"practice"});
  assert.equal(a.node("#lesson-theory").hidden,true);
  assert.equal(a.node("#lesson-practice").hidden,false);
  a.events.get("document:input")({target:{id:"task-note",value:"Нужно повторить определение"}});
  click({action:"lesson-tab",tab:"theory"});
  assert.equal(a.node("#lesson-theory").hidden,false);
  assert.equal(JSON.parse(a.store.get("ege2027-local-progress-v1")).notes[first],"Нужно повторить определение");
});
test("учебник и страницы своей редакции сохраняются локально и возвращаются после перезапуска",()=>{
  const a=runApp();
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"open-topic",key:"bio:1:0"});
  let html=a.node("#dialog-content").innerHTML;
  assert.ok(html.includes("ОСНОВНАЯ ТЕОРИЯ · УЧЕБНИК"));
  assert.ok(html.includes("Под ред. В. К. Шумного"));
  assert.ok(html.includes("Найти учебник в Яндексе"));
  assert.ok(html.includes("Найти тему в учебнике"));
  assert.ok(html.includes("Искать в содержании"));
  assert.ok(!html.includes("подтверждённый номер параграфа:</p>§"));

  const edit=a.events.get("document:input");
  edit({target:{id:"textbook-place-bio10a",dataset:{action:"textbook-place",key:"bio:1:0",book:"bio10a"},
    value:"§ 3, с. 31–38"}});
  let current=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(current.textbookPlaces["bio:1:0::bio10a"],"§ 3, с. 31–38");

  edit({target:{dataset:{action:"textbook-place",key:"bio:1:0",book:"invalid"},value:"bad"}});
  current=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(current.textbookPlaces["bio:1:0::invalid"],undefined);

  const after=runApp(current);
  after.events.get("document:click")({target:{closest:()=>({dataset:{action:"open-topic",key:"bio:1:0"}})}});
  html=after.node("#dialog-content").innerHTML;
  assert.ok(html.includes("§ 3, с. 31–38"),"Свою редакцию и страницы не потеряли");
  assert.equal(after.window.EGE_LOGIC.safeState(current,"2026-10-05").textbookPlaces["bio:1:0::bio10a"],"§ 3, с. 31–38");
});

test("карточка выводит точный §, страницу и ISBN проверенного издания",()=>{
 const a=runApp();
 const open=key=>a.events.get("document:click")({target:{closest:()=>({dataset:{action:"open-topic",key}})}});
 open("chem:9:0");
 let html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Параграфы и страницы — проверены по оглавлению"),html.slice(0,1000));
 assert.ok(html.includes("§ 24."),"Реальный номер по химии 10");
 assert.ok(html.includes("С. 140"),"Реальная страница по химии 10");
 assert.ok(html.includes("978-5-09-128109-5"),"Идентификация редакции");
 assert.ok(html.includes("rucont.ru/efd/838758"),"Ссылка на оглавление");
 open("math:8:0");
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("§ 7."),"Логарифмические неравенства");
 assert.ok(html.includes("С. 60"),"Углублённая алгебра 11");
 assert.ok(html.includes("978-5-09-112258-9"));
 open("bio:24:0");
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("фиксированного нового § нет"),"Не выдаём чужие параграфы за точную теорию");
});

test("при диагностике после ошибки выводятся § и страницы для адресного повторения",()=>{
 const initial=runApp(),saved=JSON.parse(initial.store.get("ege2027-local-progress-v1"));
 saved.errors.unshift({id:"err-remedial",subject:"bio",title:"Плоские черви",topicKey:"bio:13:1",description:"ошибка в систематике",kind:"concept",done:false});
 const a=runApp(saved),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"bio:24:0"});
 let html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Индивидуальные параграфы по вашим ошибкам"));
 assert.ok(html.includes("Плоские, круглые, кольчатые черви"));
 assert.ok(html.includes("с. "));
 assert.ok(html.includes('data-action="remediation-open"'));
 click({action:"remediation-open",key:"bio:13:1"});
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Параграфы и страницы — проверены"));
});
test("короткие ссылки на § видны сразу в недельном и предметном обзоре",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({view:"week"});
 assert.ok(a.node("#app").innerHTML.includes("Учебник"),"В недельном обзоре присутствуют §");
 click({view:"subjects"});
 assert.ok(a.node("#app").innerHTML.includes("reading-short"),"На карточках предметов присутствует ориентир");
});

test("интегрированная тема: теория и самостоятельные задания учитываются вместе, зачёт только с результатом",()=>{
 const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
 if(!L.isStudyDay(day))return;
 const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 const state=JSON.parse(a.store.get("ege2027-local-progress-v1"));
 const [first,second]=state.curriculumAssignments[day];
 assert.equal(first.phase,"integrated");assert.equal(second.phase,"integrated");
 assert.notEqual(first.subject,second.subject);
 click({action:"toggle-task",id:first.id});
 let saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
 assert.ok(!saved.completed[first.id],"Без самостоятельного результата занятие не зачтено");
  click({action:"detail",id:first.id});
  click({action:"lesson-tab",tab:"practice"});
  assert.ok(a.node("#notice").textContent.includes("Сначала изучите теорию"),"Практика не открывается до теории");
  a.node("#task-score").value="4/5";click({action:"save-score"});
  assert.equal(JSON.parse(a.store.get("ege2027-local-progress-v1")).results[first.id],undefined,"Оценка не сохраняется до теории");
  markStudySteps(a,click);
  a.node("#task-score").value="4/5";click({action:"save-score"});
  click({action:"toggle-task",id:first.id});
 saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
 assert.equal(saved.completed[first.id],first.subject);
 assert.equal(saved.topicProgress[first.topicKey].theory,true);
 assert.equal(saved.topicProgress[first.topicKey].practice,true);
 assert.ok(saved.reviews[first.topicKey],"После освоения назначается повторение");
});
test("составная тема показывает три проверенные подтемы, а непроверенные связи не выдаёт за полные",()=>{
  const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"open-topic",key:"chem:1:1"});
  let html=a.node("#dialog-content").innerHTML;
  assert.ok(html.includes("Что именно изучить по этой теме"));
  for(const part of ["механизмы химической связи","решётки","Степень окисления"])
    assert.ok(html.toLowerCase().includes(part.toLowerCase()),part);
  assert.ok(html.includes("tipy-kristallicheskih-reshetok"));
  assert.ok(html.includes("algoritm-opredeleniya-stepeni-okisleniya"));
  click({action:"open-topic",key:"math:3:2"});
  html=a.node("#dialog-content").innerHTML;
  assert.ok(html.includes("Точное покрытие каждого пункта внешними материалами пока не проверено"));
  assert.ok(html.includes("Для этого пункта соответствие внешних материалов не проверено"));
});
test("каждая учебная карточка раскрывает учебник, страницу и адресную практику",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"chem:1:1"});
 let html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Проверить весь маршрут изучения"));
 assert.ok(html.includes("Ковалентная связь и строение молекул"));
 assert.ok(html.includes("с. 245"));
 assert.ok(html.includes("Степени окисления")||html.includes("Степень окисления"));
 click({action:"open-topic",key:"bio:26:0"});
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Повторить по предыдущим занятиям"));
 assert.ok(html.includes("ISBN"));
 click({action:"open-topic",key:"math:1:0"});
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("ma_11_2027.zip"));
});
test("сверхширокие занятия предупреждают о времени и не объявляют ссылки доказательством полного охвата",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"chem:2:1"});
 let html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Большой объём"));
 assert.ok(html.includes("время")||html.includes("40, задачи 25"));
 assert.ok(html.includes("Редакционно")||html.includes("редакционно"));
 click({action:"open-topic",key:"chem:3:0"});
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("гидролизуется по катиону"));
});
test("математика №6 показывает ФИПИ-проект и прямую подборку задач по дисперсии",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"math:2:2"});
 const html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Фоксфорд: новая линия №6"));
 assert.ok(html.includes("repa-ai.ru/ege/matematika-profil/zadanie-6/"));
 assert.ok(html.includes("Проекты ФИПИ")||html.includes("КРАТКИЙ КОНСПЕКТ"));
});

test("заблокированная тема показывает цепочку основы и переход к ней",()=>{
 const a=runApp(),click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
 click({action:"open-topic",key:"chem:2:2"});
 let html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Перед этой темой необходимо освоить"));
 assert.ok(html.includes("chem:10:0"));
 assert.ok(html.includes('data-action="open-prerequisite"'));
 click({action:"open-prerequisite",key:"chem:10:0"});
 html=a.node("#dialog-content").innerHTML;
 assert.ok(html.includes("Гибридизация, изомерия, механизм реакций"));
 assert.ok(html.includes("Что нужно понять")||html.includes("ЧТО НУЖНО ПОНЯТЬ"));
});
