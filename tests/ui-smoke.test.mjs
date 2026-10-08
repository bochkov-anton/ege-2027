import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

function runApp(seed=null,clock=null) {
  const nodes=new Map(),events=new Map(),store=new Map(),intervals=new Map();let intervalId=0;
  const RuntimeDate=clock?class extends Date { static now(){return clock.now;} }:Date;
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
  for(const file of ["data.js","wellbeing.js","logic.js","resources.js","experience.js","app.js"])vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),context,{filename:file});
  return {nodes,events,store,window,node,tick(){for(const fn of [...intervals.values()])fn();}};
}
test("приложение загружается без DOM-ошибок и выводит план дня",()=>{
  const a=runApp();
  assert.ok(a.node("#app").innerHTML.includes("Ежедневный план"));
  assert.ok(a.node("#app").innerHTML.includes("Следующее занятие")||a.node("#app").innerHTML.includes("День без занятий"));
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
  assert.ok(a.node("#app").innerHTML.includes("90 мин ЕГЭ"));
});
test("результат занятий сохраняется и низкая точность создаёт ранний повтор",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC;
  const date=L.today();
  if(!L.isStudyDay(date))return;
  const first=L.planDay(date,L.iso(L.monday(new Date())))[0];
  const click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset})}});
  click({action:"detail",id:first.id});
  assert.ok(a.node("#dialog-content").innerHTML.includes("Материалы и практика"));
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
  const first=L.planDay(date,L.iso(L.monday(new Date())))[0];
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"toggle-task",id:first.id}})}});
  const saved=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(saved.completed[first.id],first.subject);
  assert.ok(saved.reviews[first.topicKey]);
});
test("поиск тем и открытие подробной карточки работают без перехода по неделям",()=>{
  const a=runApp(),click=(dataset)=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({view:"subjects"});
  a.events.get("document:input")({target:{id:"topic-search",value:"генетика"}});
  assert.ok(a.node("#topic-results").innerHTML.includes("Генетика")||a.node("#topic-results").innerHTML.includes("генетика"));
  const topic=a.window.EGE_UX.findTopics("генетика")[0];assert.ok(topic);
  click({action:"open-topic",key:topic.key});
  assert.ok(a.node("#dialog-content").innerHTML.includes("Что нужно знать"));
  assert.ok(a.node("#dialog-content").innerHTML.includes("Знать"));
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
  assert.ok(resources.includes("ФИПИ"));
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
  assert.equal((a.node("#app").innerHTML.match(/class="review-item"/g)||[]).length,6);
  click({action:"toggle-all-reviews"});
  assert.equal((a.node("#app").innerHTML.match(/class="review-item"/g)||[]).length,12);
});
test("сегодня показывает старые обязательные занятия как долг и фиксирует состав дня",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day)||L.parseDate(day).getDay()<2)return;
  const initial=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  const assigned=initial.assignments[day];assert.ok(Array.isArray(assigned)&&assigned.length===3);
  assert.ok(a.node("#app").innerHTML.includes("Незавершённые занятия"));
  assert.ok(a.node("#app").innerHTML.includes("Не завершено"));
  const first=assigned[0];
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"toggle-task",id:first}})}});
  const now=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.equal(now.completed[first],"chem");
  assert.equal(now.restSuggestion.minutes,15);
  assert.deepEqual(Array.from(now.assignments[day]),Array.from(assigned));
  assert.ok(a.node("#app").innerHTML.includes("1/4"));
  assert.ok(a.node("#app").innerHTML.includes("Рекомендуется перерыв"));
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"start-break"}})}});
  const after=JSON.parse(a.store.get("ege2027-local-progress-v1"));
  assert.ok(after.restTimer.endAt>Date.now());
  assert.ok(a.node("#app").innerHTML.includes("rest-countdown"));
});
test("очередь отложенной работы открывается и содержит исходные даты",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day)||L.parseDate(day).getDay()<2)return;
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"show-backlog"}})}});
  assert.ok(a.node("#app").innerHTML.includes("Очередь незавершённого"));
  assert.ok(a.node("#app").innerHTML.includes("backlog-row"));
});
test("таймер достигает лимита, фиксирует результат и предлагает отдых",()=>{
  const clock={now:Date.now()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const assigned=JSON.parse(a.store.get("ege2027-local-progress-v1")).assignments[day];
  if(!assigned?.length)return;
  const click=dataset=>a.events.get("document:click")({target:{closest:()=>({dataset,textContent:""})}});
  click({action:"detail",id:assigned[0]});
  click({action:"timer-toggle"});
  clock.now+=55*60*1000;
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
  const clock={now:Date.now()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const task=JSON.parse(a.store.get("ege2027-local-progress-v1")).assignments[day][0];
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
  const clock={now:Date.now()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const task=JSON.parse(a.store.get("ege2027-local-progress-v1")).assignments[day][0];
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
  clock.now+=56*60000;b.tick();
  const after=JSON.parse(b.store.get("ege2027-local-progress-v1"));
  assert.equal(after.studyTimer.startedAt,null);
  assert.equal(after.studyTimer.notified,true);
  assert.ok(after.timeSpent[task]>=3300);
});
test("кнопка Материалы открывает список источников вместо непонятной прямой ссылки",()=>{
  const a=runApp(),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const first=JSON.parse(a.store.get("ege2027-local-progress-v1")).assignments[day][0];
  assert.ok(a.node("#app").innerHTML.includes('data-action="show-materials"'));
  assert.ok(!a.node("#app").innerHTML.includes('title="Открыть материал"'));
  a.events.get("document:click")({target:{closest:()=>({dataset:{action:"show-materials",id:first}})}});
  assert.ok(a.node("#dialog-content").innerHTML.includes("Учебные источники"),a.node("#dialog-content").innerHTML.slice(0,600));
  assert.ok(a.node("#dialog-content").innerHTML.includes("Навигаторе ФИПИ"));
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
  const clock={now:Date.now()},a=runApp(null,clock),L=a.window.EGE_LOGIC,day=L.today();
  if(!L.isStudyDay(day))return;
  const id=JSON.parse(a.store.get("ege2027-local-progress-v1")).assignments[day][0];
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
