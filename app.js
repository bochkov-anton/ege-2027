(function () {
  "use strict";
  const D=window.EGE_DATA,L=window.EGE_LOGIC,R=window.EGE_RESOURCES,U=window.EGE_UX,STORE="ege2027-local-progress-v1";
  const $=(q)=>document.querySelector(q);
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const currentMonday=L.iso(L.monday(new Date()));
  let state;
  try{state=L.safeState(JSON.parse(localStorage.getItem(STORE)||"null"),currentMonday);}
  catch{state=L.safeState(null,currentMonday);}
  let view="today",date=L.today(),focusWeek=Math.max(0,Math.min(25,L.weekNumber(date,state.startDate))),focusSubject="bio",searchQuery="",searchSubject="all",searchPinned=false,openTopicKey=null,schoolExpanded=false,showAllReviews=false;
  let openTask=null,noticeHandle=null;
  function save(){try{localStorage.setItem(STORE,JSON.stringify(state));}catch{notice("Не удалось сохранить: скачайте резервную копию JSON.");}}
  function notice(msg){$("#notice").textContent=msg;clearTimeout(noticeHandle);noticeHandle=setTimeout(()=>$("#notice").textContent="",3600);}
  function subj(key){return D.subjects[key]||D.subjects.bio;}
  function badge(key){const s=subj(key);return '<span class="subject-chip" style="--subject:'+s.color+'"><i class="subject-dot"></i>'+safe(s.name)+'</span>';}
  function subjectSpan(key){return '<span style="color:'+subj(key).color+';font-weight:800">'+safe(subj(key).name)+'</span>';}
  const dformat=(d,opt={day:"numeric",month:"long"})=>{const x=L.parseDate(d);return x?new Intl.DateTimeFormat("ru-RU",opt).format(x):"—";};
  function nameDay(d){return new Intl.DateTimeFormat("ru-RU",{weekday:"long"}).format(L.parseDate(d));}
  function head(kicker,title,subtitle,extra=""){return '<div class="section-head"><div><div class="kicker">'+safe(kicker)+'</div><h1>'+safe(title)+'</h1><p class="subtitle">'+subtitle+'</p></div>'+extra+'</div>';}
  function viewDateNav(){return '<div class="date-nav"><button class="btn ghost" data-action="prev-day" title="Предыдущий учебный день">←</button><button class="btn ghost" data-action="next-day" title="Следующий учебный день">→</button></div>';}
  function weekNav(){return '<div class="date-nav"><button class="btn ghost" data-action="prev-week" title="Предыдущая неделя">←</button><span class="chip">Неделя '+(focusWeek+1)+' / 26</span><button class="btn ghost" data-action="next-week" title="Следующая неделя">→</button></div>';}
  function totalTime(blocks){return blocks.reduce((sum,x)=>sum+x.minutes,0);}
  function searchAction(){if($("#task-dialog").open)closeDialog();setView("subjects");const input=$("#topic-search");if(input)input.focus();}
  function reviewStatus(key) {
    const item=state.reviews[key];if(!item)return ["Ещё не начато","muted"];
    if((item.successes||0)>=2)return ["Дважды проверено","status-good"];
    return [item.due<=L.today()?"Пора повторить":"В процессе",item.due<=L.today()?"status-warn":"muted"];
  }
  function resourceCards(subject,week,title,key){
    const saved=key?(Array.isArray(state.customLinks[key])?state.customLinks[key]:[]).filter(x=>U.safeHttpUrl(x.url)&&typeof x.title==="string").slice(0,12):[];
    return '<div class="resource-help"><strong>Где изучать и решать</strong><p>Выберите источник из списка. PDF ФИПИ — тематические материалы 2026 года, а не готовое индивидуальное домашнее задание. Если PDF не открылся на планшете, перейдите в <a href="https://fipi.ru/navigator-podgotovki/navigator-ege" target="_blank" rel="noopener noreferrer">официальный Навигатор ФИПИ ↗</a> и найдите предмет.</p></div>'+
      '<div class="resources-box">'+[...saved.map(x=>({...x,user:true})),...R.forTopic(subject,Math.min(25,week),title)].map(x=>
      '<div class="resource-line"><div class="resource-copy"><div class="resource-type">'+safe(x.user?"Моя ссылка":U.resourceKind(x))+'</div><a target="_blank" rel="noopener noreferrer" href="'+safe(x.url)+'">'+safe(x.title)+' ↗</a><small>'+safe(x.user?"Добавлена вручную":U.resourceHint(x))+'</small></div>'+
      (x.user&&key?'<button type="button" class="btn ghost small" data-action="remove-resource" data-topic="'+safe(key)+'" data-url="'+safe(x.url)+'" title="Удалить ссылку">×</button>':'')+'</div>'
    ).join("")+'</div>';
  }
  function quickCapture(t){return state.results[t.id]?'<span class="chip status-good">'+safe(U.scoreText(state.results[t.id]))+'</span>':"";}
  function stepsFor(t){return R.practicePlan(t.subject,t.kind,Math.max(0,L.weekNumber(t.id.split(":")[0],state.startDate)),t.title);}
  function schoolInfo(day){return state.school[day]||{homework:60,sleep:8.5,energy:"ok",manualMode:"auto"};}
  function modeFor(day){return L.suggestDay(schoolInfo(day));}
  function externalLinks(resources){
    return '<div class="link-list">'+resources.map(x=>'<a target="_blank" rel="noopener noreferrer" href="'+safe(x.url)+'" title="'+safe(x.type||"Материал")+'">'+safe(x.title)+' ↗</a>').join("")+'</div>';
  }
  function schoolPanel(day,mode){
    const i=schoolInfo(day),homework=Number(i.homework??60);
    const clock=m=>String(Math.floor(m/60)%24).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
    const start=15*60+15+homework+15,finish=start+(mode==="normal"?210:mode==="light"?105:0);
    const select=(id,value,choices)=>'<select id="'+id+'">'+choices.map(([v,t])=>'<option value="'+v+'"'+(String(v)===String(value)?" selected":"")+'>'+t+'</option>').join("")+'</select>';
    return '<details class="school-accordion card"'+(schoolExpanded?' open':'')+'><summary class="school-summary">'+
      '<div><strong>Школа и нагрузка</strong><small>Домашние задания, сон, усталость · настроить</small></div><span class="chip">'+(mode==="normal"?"160":mode==="light"?"90":"0")+' мин ЕГЭ</span></summary>'+
      '<div class="school-inner"><p class="note">Время ориентировочное. Учёбу можно сдвигать, но не сокращать сон ради расписания.</p>'+
      '<div class="school-fields"><div class="field"><label for="school-homework">Домашнее задание</label>'+select("school-homework",i.homework??60,[[0,"0 мин"],[30,"30 мин"],[60,"60 мин"],[90,"90 мин"],[120,"120 мин"],[150,"150+ мин"]])+'</div>'+
      '<div class="field"><label for="school-sleep">Сон прошлой ночью</label>'+select("school-sleep",i.sleep??8.5,[[6,"Менее 7 ч"],[7,"7 ч"],[7.5,"7,5 ч"],[8,"8 ч"],[8.5,"8,5 ч"],[9,"9+ ч"]])+'</div>'+
      '<div class="field"><label for="school-energy">Самочувствие</label>'+select("school-energy",i.energy||"ok",[["good","Бодро"],["ok","Нормально"],["low","Сильно устала"]])+'</div></div>'+
      '<div class="school-timeline"><span>14:00–15:15 · обед и отдых</span><span>15:15–'+clock(15*60+15+homework)+' · Д/З школы</span>'+
      (mode==="off"?'<span>Дальше отдых от ЕГЭ</span>':'<span>'+clock(start)+'–'+clock(finish)+' · ЕГЭ с паузами</span>')+'</div>'+
      (finish>1200&&mode!=="off"?'<p class="note danger-text">Позднее 20:00: лучше облегчить ЕГЭ, а не сокращать сон.</p>':'')+
      '<p class="note">Оценки нагрузки — ориентиры, не медицинская диагностика.</p></div></details>';
  }
  function taskCard(t,index,showBreak=true){
    const subjData=subj(t.subject),done=!!state.completed[t.id],skipped=!!state.skipped[t.id],checked=(state.steps[t.id]||[]).filter(Boolean).length;
    const labels={new:"Новая тема",practice:"Практика",mixed:"Второй предмет",review:"Короткое повторение"};
    const originNote=t.isBacklog?'<span class="debt-origin">Не завершено '+safe(dformat(t.originDate))+'</span>':"";
    const rest=showBreak&&index===1?'<div class="break">Перерыв · 15 минут</div>':
      showBreak&&index===2?'<div class="break">Ужин и восстановление · 35 минут</div>':"";
    return rest+'<article class="task '+(done?"done":skipped?"skipped":"")+'" style="--subject:'+subjData.color+'">'+
      '<div class="task-icon">'+safe(subjData.icon)+'</div><div class="task-copy"><div class="row wrap">'+badge(t.subject)+
      '<span class="chip">'+labels[t.kind]+'</span>'+originNote+quickCapture(t)+'</div>'+
      '<h3>'+safe(t.title)+'</h3><p class="task-goal">'+safe(U.taskGoal(t))+'</p><div class="meta">'+t.minutes+' мин'+(checked?" · "+checked+"/"+stepsFor(t).length+" шагов":"")+(state.notes[t.id]?" · Есть заметка":"")+
      (skipped?" · Пропущено без переноса":"")+'</div></div>'+
      '<div class="task-actions"><button class="btn small '+(done?"secondary":"")+'" data-action="detail" data-id="'+safe(t.id)+'">'+(done?"Посмотреть":"Начать →")+'</button>'+
      '<button class="btn ghost small" data-action="show-materials" data-id="'+safe(t.id)+'">Материалы</button>'+
      '<button class="check-button" data-action="toggle-task" data-id="'+safe(t.id)+'" aria-label="'+(done?"Отменить выполнение":"Отметить выполненным")+'">'+(done?"✓":"")+'</button>'+
      (!done?'<button class="btn ghost small" data-action="skip-task" data-id="'+safe(t.id)+'">'+(skipped?"Вернуть":"Пропустить")+'</button>':"")+'</div></article>';
  }
  function ensureAssignments(day){
    if(day!==L.today()||!L.isStudyDay(day)||L.weekNumber(day,state.startDate)<0)return;
    if(!Array.isArray(state.assignments[day])){
      state.assignments[day]=L.pendingStudy(state,day).slice(0,3).map(x=>x.id);
      save();
    }
  }
  function renderToday(){
    ensureAssignments(date);
    const week=L.weekNumber(date,state.startDate),mode=modeFor(date),blocks=L.studyAgenda(state,date,mode),debt=L.debtSummary(state,date),isActualToday=date===L.today();
    const isRest=!L.isStudyDay(date);
    const shown=blocks;
    const done=shown.filter(x=>state.completed[x.id]).length,skipped=shown.filter(x=>state.skipped[x.id]).length,next=shown.find(x=>!state.completed[x.id]&&!state.skipped[x.id]);
    const due=L.dueItems(state.reviews,L.today());
    let html=head("Ежедневный план",nameDay(date).replace(/^./,c=>c.toUpperCase())+", "+dformat(date),
      (week>=26?"После основного курса · ":(week>=0?"Неделя "+(week+1)+" из 26 · ":""))+(isRest?"День без занятий":"Два предмета, одна большая смена контекста"),viewDateNav());
    if(isRest)return html+'<div class="empty"><strong>Полный выходной</strong>Сегодня нет занятий, карточек, пробников и повторений. Суббота и воскресенье всегда свободны.</div>';
    if(week<0)return html+'<div class="empty"><strong>Программа ещё не началась</strong>Начало: '+dformat(state.startDate)+'. Дату можно изменить в настройках.</div>';
    if(week>=26&&!debt.total)html+='<div class="callout" style="margin-bottom:14px"><strong>Основная программа выполнена.</strong> Теперь смешанная практика, пробники и повторение.</div>';
    if(isActualToday&&debt.overdue)html+='<section class="backlog card padding"><div><strong>Незавершённые занятия: '+debt.overdue+'</strong><p class="note">Показаны первые обязательные шаги, начиная с '+dformat(debt.oldest)+'. Следующие темы откроются после их выполнения. Не нужно выполнять весь список сегодня.</p></div><button class="btn secondary small" data-action="show-backlog">Вся очередь →</button></section>';
    if(isActualToday&&!debt.overdue&&!debt.total&&week<26)html+='<div class="callout">Обязательные занятия до сегодняшней даты завершены. Отличная возможность заняться повторением и отдыхом.</div>';
    html+='<section class="hero card">'+(next?'<div><div class="kicker">Следующее занятие</div><h2>'+safe(next.title)+'</h2><p>'+safe(U.taskGoal(next))+'</p><div class="row wrap">'+badge(next.subject)+'<span class="chip">'+next.minutes+' мин</span></div></div><button class="btn" data-action="detail" data-id="'+safe(next.id)+'">Начать →</button>':
      '<div><div class="kicker">Сегодня</div><h2>'+(mode==="off"?"Отдых":"Основная работа завершена")+'</h2><p>Никаких дополнительных часов ради галочек.</p></div>')+'</section>';
    if(isActualToday)html+=breakPanel();
    html+=schoolPanel(date,mode);
    html+='<div class="metric-strip"><div class="card metric"><b>'+done+'/'+shown.length+'</b><span>Блоков выполнено</span></div><div class="card metric"><b>'+Math.floor(totalTime(shown)/60)+' ч '+String(totalTime(shown)%60).padStart(2,"0")+'</b><span>Чистое время</span></div><div class="card metric"><b>'+due.length+'</b><span>Повторений сейчас</span></div></div>';
    html+='<div class="grid-2"><div class="stack"><div class="row between wrap"><h2 style="margin:0">План ЕГЭ</h2><div class="row wrap"><button class="btn secondary small" data-action="set-mode" data-mode="normal">160 мин</button><button class="btn secondary small" data-action="set-mode" data-mode="light">90 мин</button><button class="btn secondary small" data-action="set-mode" data-mode="off">Отдых</button><button class="btn ghost small" data-action="set-mode" data-mode="auto">Авто</button></div></div>';
    html+='<div class="schedule">'+(shown.length?shown.map((t,i)=>taskCard(t,i,mode==="normal")).join(""):'<div class="empty"><strong>Сегодня без ЕГЭ</strong>Отдых и школьные задания имеют приоритет. Пропущенное не нужно переносить на выходные.</div>')+'</div>';
    html+='<div class="card padding day-reflection"><label for="day-note"><strong>Итог дня</strong> <span class="note">· Одно предложение — по желанию</span></label><textarea id="day-note" maxlength="1200" placeholder="Что получилось? Что стоит повторить?">'+safe(state.dayNotes[date]||"")+'</textarea><span class="note">Сохранение при вводе. Необязательно.</span></div>'+
    '<p class="note">Незавершённое не исчезает. Темы идут по порядку, но в день предлагается не более 160 минут, по выходным — отдых.</p></div>';
    html+='<div class="stack"><div class="card padding"><div class="row between"><h2>Прогресс сегодня</h2><span class="chip">'+Math.round(done/Math.max(1,shown.length)*100)+'%</span></div><div class="bar"><span style="width:'+Math.round(done/Math.max(1,shown.length)*100)+'%"></span></div><p class="note" style="margin-top:13px">Сначала новый материал и практика. Затем второй предмет. Повторения выбираются по готовой очереди.</p></div>';
    html+='<div class="card padding"><div class="row between"><h2>Очередь повторений</h2><button class="btn ghost small" data-view="reviews">Открыть →</button></div>';
    if(!due.length)html+='<p class="note">Пока нет просроченных или назначенных на сегодня проверок. Они появятся после отметки первых тем.</p>';
    else html+='<div class="stack gap-small">'+due.slice(0,3).map(r=>'<div class="soft"><div style="font-size:11px;color:var(--muted)">'+safe(subj(r.subject).name)+'</div><strong style="font-size:12px">'+safe(r.title)+'</strong></div>').join("")+'</div>';
    const favorites=Object.keys(state.pinned).filter(k=>state.pinned[k]).map(U.topicByKey).filter(Boolean).slice(0,4);
    html+='</div>';
    if(favorites.length)html+='<div class="card padding"><h2>Темы в закладках</h2><div class="favorite-list">'+favorites.map(t=>'<button class="favorite-item" data-action="open-topic" data-key="'+safe(t.key)+'">'+badge(t.subject)+'<span>'+safe(t.title)+'</span><span>→</span></button>').join("")+'</div></div>';
    html+='<div class="callout"><strong>Важно</strong><p style="margin:6px 0 0">Не стремитесь заполнять каждый свободный слот. Если практика завершена и цели достигнуты, резерв можно оставить свободным.</p></div></div></div>';
    return html;
  }
  function renderBacklog(){
    const all=L.pendingStudy(state,L.today()),count=all.length;
    let html=head("Реальная последовательность","Очередь незавершённого",
      "Задания не исчезают с наступлением новой недели. Каждая отметка остаётся привязанной к исходной теме.");
    html+='<div class="card padding"><h2>'+count+' обязательных блоков в очереди</h2>'+
      '<p class="note">Занимайтесь в порядке списка и в пределах дневной нормы. Дополнительные часы и занятия в выходные не требуются. Повторения учитываются отдельно.</p>'+
      '<div class="row wrap"><button class="btn" data-view="today">← Сегодня</button>'+
      '<button class="btn secondary" data-action="export">Скачать резервную копию</button></div></div>';
    if(!count)return html+'<div class="empty"><strong>Очередь пуста</strong>Обязательные темы текущего курса завершены.</div>';
    html+='<div class="backlog-list">'+all.slice(0,80).map((t,i)=>'<article class="backlog-row card"><span class="backlog-index">'+(i+1)+'</span>'+
      '<div class="backlog-description">'+badge(t.subject)+'<strong>'+safe(t.title)+'</strong>'+
      '<small>'+dformat(t.originDate)+' · '+safe(t.kind==="new"?"Изучение":t.kind==="practice"?"Практика":"Закрепление")+'</small></div>'+
      '<button class="btn secondary small" data-action="detail" data-id="'+safe(t.id)+'">Открыть →</button></article>').join("")+'</div>';
    if(count>80)html+='<p class="note">Показаны первые 80 из '+count+'. Следующие появятся по мере прохождения.</p>';
    return html;
  }
  function renderWeek(){
    const mon=L.move(L.parseDate(state.startDate),focusWeek*7);
    const sat=L.move(mon,5),sun=L.move(mon,6);
    let html=head("Календарный ориентир","Неделя "+(focusWeek+1),dformat(L.iso(mon))+" — "+dformat(L.iso(sun))+". Незаконченная работа сохраняется в очереди.",weekNav());
    html+='<div class="week-days">'+[0,1,2,3,4].map(i=>{
      const day=L.iso(L.move(mon,i)),pair=D.patterns[focusWeek%2][i],blocks=L.planDay(day,state.startDate,state.reviews,modeFor(day)),
      d=blocks.filter(x=>state.completed[x.id]).length,unclosed=blocks.filter(x=>x.kind!=="review"&&!state.completed[x.id]&&!state.skipped[x.id]).length;
      return '<button class="week-day'+(day===date?" active":"")+'" data-action="pick-day" data-date="'+day+'">'+
        '<span class="day-num">'+D.dayNames[i]+' · '+dformat(day)+'</span><strong>'+d+'/'+blocks.length+' блока</strong>'+(day<L.today()&&unclosed?'<span class="debt-origin">Осталось: '+unclosed+'</span>':"")+
        pair.map(s=>'<div class="week-topic"><span style="color:'+subj(s).color+'">'+safe(subj(s).name)+'</span>'+safe(blocks.find(b=>b.subject===s&&b.kind!=="review")?.title||"")+'</div>').join("")+'</button>';
    }).join("")+'</div>';
    html+='<div class="card padding" style="margin-top:19px"><div class="row between wrap"><h2>Темы недели</h2><span class="chip">Сб и Вс — выходные</span></div><div class="grid-3">'+D.subjectOrder.map(s=>{
      const data=subj(s);return '<div><div class="row">'+badge(s)+'</div><ul class="simple-list">'+data.weeks[focusWeek].map(t=>'<li>'+safe(t)+'</li>').join("")+'</ul></div>';
    }).join("")+'</div></div>';
    return html+'<p class="note" style="margin-top:12px">Эта страница — календарная карта тем. Фактически изучаемые задания выбираются из очереди в разделе «Сегодня». Нажмите на день для просмотра его исходного плана. Химия с пятой недели — ориентировочное распределение.</p>';
  }
  function links(key,week,title){return externalLinks(R.forTopic(key,week??focusWeek,title||subj(key).weeks[week??focusWeek][0]));}
  function topicCard(topic){
    const [label,statusClass]=reviewStatus(topic.key),star=state.pinned[topic.key]?"★ ":"";
    return '<div class="topic topic-compact"><small>'+badge(topic.subject)+' <span>· Неделя '+(topic.week+1)+'</span></small>'+
      '<div class="topic-title">'+star+safe(topic.title)+'</div><span class="note '+statusClass+'">'+safe(label)+'</span>'+
      '<button class="btn secondary small" data-action="open-topic" data-key="'+safe(topic.key)+'">Открыть тему →</button></div>';
  }
  function topicSearchResults(){
    if(!searchQuery.trim()&&!searchPinned)return "";
    const all=U.findTopics(searchQuery,searchSubject,234);
    const results=searchPinned?all.filter(t=>!!state.pinned[t.key]):all,shown=results.slice(0,45);
    return '<div class="row between wrap" style="margin:18px 0"><h2>'+(searchPinned?"Закладки":"Результаты поиска")+' · '+results.length+'</h2><span class="note">По названию темы и предмету</span></div>'+
      (results.length?'<div class="subject-topics">'+shown.map(topicCard).join("")+'</div>'+
       (results.length>45?'<p class="note">Показаны первые 45 тем. Уточните запрос.</p>':""):
      '<div class="empty"><strong>Ничего не найдено</strong>Попробуйте слово из темы: «генетика», «неравенства», «ОВР».</div>');
  }
  function renderSubjects(){
    const s=subj(focusSubject),week=focusWeek;
    let html=head("Библиотека","Найти и открыть тему","Поиск по всем 234 темам, неделям и трём предметам.",weekNav());
    html+='<div class="card padding topic-search-card"><label for="topic-search"><strong>Название темы</strong></label>'+
      '<div class="topic-search-row"><input id="topic-search" type="search" autocomplete="off" placeholder="Например: митоз, растворы, уравнения..." value="'+safe(searchQuery)+'">'+
      '<select id="search-subject" aria-label="Фильтр по предмету">'+[['all','Все предметы'],...D.subjectOrder.map(k=>[k,subj(k).name])].map(([k,title])=>'<option value="'+k+'"'+(searchSubject===k?' selected':'')+'>'+safe(title)+'</option>').join("")+'</select></div>'+
      '<div class="row wrap" style="margin-top:10px"><button class="btn '+(searchPinned?"":"secondary")+' small" data-action="toggle-pins">☆ Мои закладки ('+Object.keys(state.pinned).filter(k=>state.pinned[k]).length+')</button><span class="note">Введите название или выберите закладки</span></div></div>'+
      '<div id="topic-results">'+topicSearchResults()+'</div>'+
      '<section id="topic-current-week"'+(searchQuery.trim()||searchPinned?' hidden':'')+'>'+
      '<div class="row wrap" style="margin:20px 0">'+D.subjectOrder.map(k=>'<button class="btn '+(focusSubject===k?'':'secondary')+'" data-action="subject" data-subject="'+k+'">'+safe(subj(k).name)+'</button>').join("")+'</div>'+
      '<div class="card padding"><div class="row between wrap"><div>'+badge(focusSubject)+'<h2 style="margin-top:12px">Неделя '+(week+1)+'</h2></div><span class="chip">Цель '+safe(s.target)+' баллов</span></div>'+
      '<div class="subject-topics">'+s.weeks[week].map((title,index)=>topicCard({subject:focusSubject,week,index,title,key:L.topicKey(focusSubject,week,index)})).join("")+'</div>'+
      '<hr class="divider"><h3>Что закреплять каждую неделю</h3><ul class="simple-list">'+R.weeklyEssentials(focusSubject,week).map(x=>'<li>'+safe(x)+'</li>').join("")+'</ul></div>';
    if(focusSubject==="chem")html+='<p class="note" style="margin-top:12px">После четвёртой недели темы химии основаны на доступном макроплане (приложена часть 1 из 10).</p>';
    return html+'</section>';
  }
  function renderReviews(){
    const due=L.dueItems(state.reviews,L.today()),restDay=!L.isStudyDay(L.today()),upcoming=Object.entries(state.reviews).filter(([,v])=>v&&v.due>L.today()).sort((a,b)=>a[1].due.localeCompare(b[1].due)).slice(0,6);
    const errors=state.errors.filter(x=>!x.done);
    let html=head("Закрепление","Повторения и ошибки","Ответьте без подсказки, затем оцените реальный результат. В выходные ничего не назначается.");
    html+='<div class="grid-2"><section class="stack"><div class="row between"><h2>Пора повторить</h2><span class="chip">'+due.length+' тем</span></div>';
    html+=due.length&&!restDay?due.slice(0,showAllReviews?due.length:6).map(r=>'<div class="review-item">'+badge(r.subject)+'<div class="review-item-main"><h3>'+safe(r.title)+'</h3><div class="meta">Назначено: '+dformat(r.due)+' · Успешных проверок: '+(r.successes||0)+'</div></div><div class="review-actions"><button class="btn ghost" data-action="open-topic" data-key="'+safe(r.key)+'">Тема ↗</button><button class="btn danger" data-action="rate" data-key="'+safe(r.key)+'" data-rate="hard">Сложно</button><button class="btn secondary" data-action="rate" data-key="'+safe(r.key)+'" data-rate="medium">Нормально</button><button class="btn" data-action="rate" data-key="'+safe(r.key)+'" data-rate="easy">Уверенно</button></div></div>').join(""):(restDay?'<div class="empty"><strong>Сегодня выходной</strong>Повторения можно выполнить в понедельник. Суббота и воскресенье свободны.</div>':'<div class="empty"><strong>Очередь пока пуста</strong>После изучения темы появится контроль на следующий учебный день.</div>');
    if(due.length>6&&!restDay)html+='<div class="callout"><strong>Не нужно закрывать все '+due.length+' повторений сегодня.</strong><p class="note" style="margin:8px 0">Начните с 2–3 тем, остальные останутся в очереди. Не увеличивайте дневную нагрузку.</p><button class="btn ghost small" data-action="toggle-all-reviews">'+(showAllReviews?"Показать только первые 6":"Показать всю очередь")+'</button></div>';
    html+='<div class="card padding"><h2>Следующие проверки</h2>'+(upcoming.length?upcoming.map(([key,v])=>'<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line);gap:16px"><span style="font-size:12px">'+safe(v.title)+'</span><span class="note nowrap">'+dformat(v.due)+'</span></div>').join(""):'<p class="note">Нет запланированных проверок.</p>')+'</div></section>';
    html+='<section class="stack"><div class="card padding"><h2>Добавить ошибку</h2><form id="add-error-form" class="stack gap-small"><div class="field"><label>Предмет</label><select name="subject">'+D.subjectOrder.map(s=>'<option value="'+s+'">'+safe(subj(s).name)+'</option>').join("")+'</select></div><div class="field"><label>Тема или задание</label><input name="title" maxlength="180" placeholder="Например: ОВР, задание 29" required></div><div class="field"><label>Что исправить</label><textarea name="description" maxlength="800" placeholder="Конкретный пробел и корректирующее действие" required></textarea></div><button class="btn" type="submit">Добавить в работу</button></form></div>';
    html+='<div class="card padding"><div class="row between"><h2>Открытые ошибки</h2><span class="chip">'+errors.length+'</span></div>';
    const errorKinds={concept:"Понимание",method:"Метод",memory:"Память",attention:"Внимательность",time:"Время",other:"Другое"};
    html+=errors.length?errors.slice(0,30).map(e=>'<div class="error-row"><div class="row between wrap">'+badge(e.subject)+
      '<span class="chip">'+safe(errorKinds[e.kind]||"Причина не указана")+'</span></div><p style="font-weight:750;margin:8px 0 4px">'+safe(e.title)+'</p>'+
      '<p class="note log-note">'+safe(e.description)+'</p><div class="row wrap">'+
      (e.topicKey?'<button class="btn ghost small" data-action="open-topic" data-key="'+safe(e.topicKey)+'">Материалы</button>'+
      '<button class="btn secondary small" data-action="repeat-error" data-id="'+safe(e.id)+'">Назначить проверку</button>':"")+
      '<button class="btn ghost small" data-action="resolve-error" data-id="'+safe(e.id)+'">Исправлено после повторной задачи ✓</button></div></div>').join(""):'<p class="note">Значимые ошибки закрывайте только после самостоятельной повторной задачи.</p>';
    html+='</div></section></div>';
    return html;
  }
  function renderProgress(){
    const st=L.stats(state),weeks=Math.min(26,Math.max(0,L.weekNumber(L.today(),state.startDate)+1));
    const attempts=Object.values(state.results).filter(v=>v&&Number.isFinite(v.correct)&&Number.isFinite(v.total)&&v.total>0);
    let html=head("Обратная связь","Прогресс обучения","Отдельно считаются знакомство с темами и отложенное подтверждение их освоения.");
    html+='<div class="metric-strip"><div class="card metric"><b>'+st.total+'</b><span>Завершённых блоков</span></div><div class="card metric"><b>'+Object.keys(state.reviews).length+'</b><span>Тем начато</span></div><div class="card metric"><b>'+st.openErrors+'</b><span>Открытых ошибок</span></div></div>';
    if(attempts.length){
      const scoreParts=D.subjectOrder.map(s=>{
        const a=attempts.filter(v=>v.subject===s),solved=a.reduce((n,v)=>n+v.total,0),correct=a.reduce((n,v)=>n+v.correct,0);
        return a.length?'<span>'+safe(subj(s).name)+': <strong>'+Math.round(correct/solved*100)+'%</strong> ('+solved+' заданий)</span>':'';
      }).filter(Boolean);
      html+='<div class="card padding" style="margin-bottom:18px"><h2>Точность записанных проверок</h2><div class="row wrap">'+scoreParts.join(' · ')+'</div><p class="note" style="margin:10px 0 0">Это точность только по вручную введённым наборам. Она не равна прогнозу баллов ЕГЭ и может зависеть от сложности задач.</p></div>';
    }
    html+='<div class="grid-2"><div class="card padding"><h2>Темы по предметам</h2>'+D.subjectOrder.map(s=>{
      const keys=Object.keys(state.reviews).filter(k=>k.startsWith(s+":")),mastered=keys.filter(k=>(state.reviews[k]?.successes||0)>=2).length,total=subj(s).weeks.reduce((n,w)=>n+w.length,0);
      const studied=Math.round(keys.length/total*100),stable=Math.round(mastered/total*100);
      return '<div class="progress-row"><div class="row between"><strong>'+safe(subj(s).name)+'</strong><span class="note">'+keys.length+'/'+total+' начато · '+mastered+' подтверждено</span></div><div class="bar" style="margin-bottom:5px"><span style="width:'+studied+'%;background:'+subj(s).color+'"></span></div><div class="bar"><span style="width:'+stable+'%;background:#243b54"></span></div></div>';
    }).join("")+'<p class="note">Верхняя полоса — начатые темы, нижняя — минимум две уверенные отложенные проверки. Это не прогноз баллов ЕГЭ.</p></div>';
    html+='<div class="stack"><div class="card padding"><h2>Календарный маршрут</h2><div class="row between" style="margin-bottom:10px"><strong>'+weeks+' / 26 недель</strong><span class="note">'+Math.round(weeks/26*100)+'%</span></div><div class="bar"><span style="width:'+Math.round(weeks/26*100)+'%"></span></div><p class="note" style="margin-top:14px">Неделя календаря не означает автоматически освоение её тем.</p></div>';
    html+='<div class="card padding"><h2>Выполненные блоки</h2>'+D.subjectOrder.map(s=>'<div class="row between" style="margin:9px 0">'+badge(s)+'<strong>'+st.bySubject[s]+'</strong></div>').join("")+'</div><div class="callout">Баллы пробников и точность задач пока вносятся вручную в примечания. Это намеренно простой локальный инструмент, а не платформа автоматической проверки ЕГЭ.</div></div></div>';
    const activity=Object.entries(state.results).filter(([,r])=>r&&typeof r==="object").map(([id,r])=>({id,date:id.split(":")[0],subject:r.subject,score:U.scoreText(r),note:state.notes[id]||""}))
      .concat(Object.entries(state.notes).filter(([id])=>!state.results[id]&&id.includes(":")).map(([id,note])=>({id,date:id.split(":")[0],subject:state.completed[id]||lookup(id)?.subject||"bio",score:"",note})))
      .filter(x=>x.score||x.note).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
    if(activity.length)html+='<div class="card padding" style="margin-bottom:16px"><div class="row between wrap"><h2>Последние записи</h2><span class="chip">До 15 последних</span></div>'+
      '<div class="activity-list">'+activity.map(x=>'<div class="activity-row"><div><div class="note">'+dformat(x.date)+' · '+safe(subj(x.subject).name)+' · '+safe(x.score)+'</div>'+
      (x.note?'<div class="log-note">'+safe(x.note.slice(0,200))+'</div>':"")+'</div>'+
      '<button class="btn ghost small" data-action="detail" data-id="'+safe(x.id)+'">Открыть</button></div>').join("")+'</div></div>';
    return html;
  }
  function renderSettings(){
    return head("Локальные данные","Настройки","Всё сохраняется на этом устройстве. Не забывайте делать резервные копии.")+
      '<div class="card padding android-section"><h2>Установка на Android</h2>'+
      '<p class="android-device-note">Откройте опубликованный HTTPS-адрес один раз через Chrome. После установки можно запускать с иконки, как обычное приложение. Основные страницы работают без интернета, а внешние PDF и банки заданий — при наличии сети.</p>'+
      '<div class="android-status-row"><span class="android-offline-indicator" id="android-connection">Проверка сети</span><span class="chip" id="android-offline-status">Проверка офлайн-режима…</span></div>'+
      '<p class="note" id="android-install-hint">Для установки нужен HTTPS-адрес.</p>'+
      '<div class="row wrap"><button class="btn" type="button" id="android-install-btn" data-android="install">Как установить</button>'+
      '<button class="btn secondary" type="button" data-view="progress">Мой прогресс →</button></div>'+
      '<details class="android-help"><summary>Как добавить иконку на экран телефона или планшета</summary>'+
      '<ol><li>Откройте HTTPS-ссылку в Google Chrome на Android.</li>'+
      '<li>Нажмите ⋮ в Chrome → «Установить приложение» либо «Установить и создать ярлык».</li>'+
      '<li>Подтвердите установку; открывайте «Мой ЕГЭ» с главного экрана.</li>'+
      '<li>Первый раз загрузите план через интернет. Затем проверьте офлайн-режим, отключив сеть.</li></ol></details></div>'+
      '<div class="card padding android-section"><h2>Резервная копия на планшете</h2>'+
      '<p class="android-device-note">Прогресс сохраняется только на планшете и не загружается на GitHub. Раз в неделю сохраните JSON в «Загрузки» или на собственный носитель. Не удаляйте данные приложения до создания копии.</p>'+
      '<div class="row wrap"><button class="btn" type="button" data-android="share">Поделиться резервной копией</button>'+
      '<button class="btn secondary" type="button" data-android="go-import">Импортировать файл JSON</button></div>'+
      '<p class="note" id="android-status" role="status" aria-live="polite">При импорте данные на этом устройстве заменяются после подтверждения.</p></div>'+
      '<div class="card padding"><h2>Уведомления о занятиях и перерывах</h2>'+
      '<p class="note">При запущенном приложении таймер показывает окончание учебного блока и перерыва. Системные уведомления доступны после разрешения Chrome; Android может ограничивать уведомления, если приложение закрыто или выгружено.</p>'+
      '<button class="btn secondary" data-action="allow-notify">'+(state.notifyEnabled?"Уведомления разрешены":"Разрешить уведомления")+'</button></div>'+
      '<div class="grid-2"><div class="stack"><div class="card padding"><h2>Старт 26-недельной программы</h2><div class="field"><label for="start-date">Дата начала (понедельник)</label><input id="start-date" type="date" value="'+safe(state.startDate)+'"></div><p class="note" style="margin-top:12px">При смене даты старые отметки привязаны к прежним календарным дням; для нового старта лучше сначала экспортировать данные.</p></div>'+
      '<div class="card padding"><h2>Резервная копия</h2><p class="note">Прогресс не передаётся между устройствами автоматически. Экспортируйте JSON и импортируйте его на другом устройстве.</p><div class="row wrap"><button class="btn" data-action="export">Скачать JSON</button><button class="btn secondary" data-action="import">Импортировать JSON</button></div></div>'+
      '<div class="card padding"><h2 class="danger-text">Сброс</h2><p class="note">Удалит все отметки, повторения и ошибки только этого приложения в текущем браузере.</p><button class="btn danger" data-action="reset">Очистить прогресс</button></div></div>'+
      '<div class="stack"><div class="card padding"><h2>Как пользоваться</h2><ol class="simple-list"><li>Откройте «Сегодня» и нажмите «Начать» у следующего занятия.</li><li>Отмечайте шаги внутри карточки, открывайте материалы и решайте задачи самостоятельно.</li><li>Запишите результат вида 8/10 и одно предложение об ошибке. Заметки сохраняются автоматически.</li><li>Используйте «Предметы» для поиска, собственных ссылок и закладок. Клавиша / открывает поиск.</li><li>В «Повторениях» отвечайте без подсказки до оценки уверенности.</li><li>В «Прогрессе» возвращайтесь к последним заметкам. По пятницам скачивайте резервную копию JSON.</li></ol></div>'+
      '<div class="callout"><strong>Ограничения</strong><p>Нет сервера, аккаунтов и синхронизации. Ссылки ведут на ресурсы предмета, а не всегда на конкретное задание. Химия после недели 4 распределена по доступному макроплану.</p><p style="margin-bottom:0">Сб и Вс всегда свободны; автоматического переноса заданий на выходные нет.</p></div></div></div>';
  }
  function render(){
    const navTitles={today:"Сегодня",week:"Неделя",subjects:"Предметы",reviews:"Повторения",progress:"Прогресс",settings:"Настройки",backlog:"Очередь"};
    $("#top-section").textContent=navTitles[view];
    $("#top-date").textContent=dformat(L.today(),{day:"numeric",month:"long",year:"numeric"});
    const n=L.dueItems(state.reviews,L.today()).length;
    $("#review-badge").textContent=n?n:"";
    document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $("#app").innerHTML=({today:renderToday,week:renderWeek,subjects:renderSubjects,reviews:renderReviews,progress:renderProgress,settings:renderSettings,backlog:renderBacklog}[view]||renderToday)();
    renderSession();
    window.EGE_ANDROID?.updateUI?.();
  }
  function lookup(id){
    const d=id.split(":")[0];
    return L.planDay(d,state.startDate,state.reviews,"normal").find(x=>x.id===id)||
      L.planDay(d,state.startDate,state.reviews,"light").find(x=>x.id===id);
  }
  function completeTask(id){
    const b=lookup(id);if(!b)return;
    if(state.completed[id])delete state.completed[id];
    else {
      const agenda=L.studyAgenda(state,L.today(),modeFor(L.today()));
      const todayBlock=agenda.find(x=>x.id===id);
      if(state.studyTimer?.taskId===id){
        pauseStudyTimer();state.studyTimer=null;
      }
      state.completed[id]=b.subject;delete state.skipped[id];
      L.beginReview(state,b,L.today());
      const minutes=suggestedPause(todayBlock);
      if(minutes)state.restSuggestion={minutes,fromId:id,offeredOn:L.today()};
    }
    save();render();
  }
  function setView(v){
    if(!["today","week","subjects","reviews","progress","settings","backlog"].includes(v))return;
    if(v==="today"){date=L.today();focusWeek=Math.max(0,Math.min(25,L.weekNumber(date,state.startDate)));}
    view=v;render();
  }
  function clockDisplay(seconds){
    const x=Math.max(0,Math.floor(Number(seconds)||0));
    return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0");
  }
  function currentTime(id){
    const t=state.studyTimer;
    if(t&&(!id||t.taskId===id)){
      const started=Number(t.startedAt)||0;
      return Math.max(0,Number(t.elapsedSeconds)||0)+(started?Math.max(0,Math.floor((Date.now()-started)/1000)):0);
    }
    return id?Math.max(0,Number(state.timeSpent[id])||0):0;
  }
  function pauseStudyTimer(){
    const t=state.studyTimer;if(!t)return;
    t.elapsedSeconds=currentTime(t.taskId);
    t.startedAt=null;
    state.timeSpent[t.taskId]=t.elapsedSeconds;
    save();
  }
  function startStudyTimer(task){
    const other=state.studyTimer;
    if(other?.taskId!==task.id&&other?.startedAt){
      if(!confirm("Сейчас идёт другое занятие. Остановить его таймер и перейти к этому?"))return false;
      pauseStudyTimer();
    }
    if(!state.studyTimer||state.studyTimer.taskId!==task.id){
      state.studyTimer={taskId:task.id,elapsedSeconds:Math.max(0,Number(state.timeSpent[task.id])||0),
        startedAt:null,targetSeconds:task.minutes*60,notified:false};
    }
    if(!state.studyTimer.startedAt)state.studyTimer.startedAt=Date.now();
    save();renderSession();updateTimerDisplays();return true;
  }
  function timerButtonLabel(id){
    const t=state.studyTimer;
    if(!t||t.taskId!==id)return t?.startedAt?"Переключить таймер":"Старт";
    return t.startedAt?"Пауза":"Продолжить";
  }
  function renderSession(){
    const area=$("#study-session");if(!area)return;
    const t=state.studyTimer;
    if(!t){area.hidden=true;area.innerHTML="";return;}
    const b=lookup(t.taskId),title=b?.title||"Занятие";
    area.hidden=false;
    area.innerHTML='<div class="study-session-inner"><div class="study-session-copy"><span class="study-session-label">'+
      (t.startedAt?"Идёт занятие":"Таймер на паузе")+'</span><strong>'+safe(title)+'</strong></div>'+
      '<span class="study-session-clock" id="study-clock">'+clockDisplay(currentTime(t.taskId))+'</span>'+
      '<button type="button" class="btn secondary small" data-action="session-toggle">'+(t.startedAt?"Пауза":"Продолжить")+'</button>'+
      '<button type="button" class="btn ghost small" data-action="session-open" data-id="'+safe(t.taskId)+'">Открыть</button></div>';
  }
  function updateTimerDisplays(){
    const t=state.studyTimer,elapsed=t?currentTime(t.taskId):0;
    const bar=$("#study-clock");if(bar&&t)bar.textContent=clockDisplay(elapsed);
    if(openTask){
      const clock=$("#timer-clock");if(clock)clock.textContent=clockDisplay(currentTime(openTask.id));
      const button=$("#timer-button");if(button)button.textContent=timerButtonLabel(openTask.id);
    }
  }
  function alertUser(message){
    notice(message);
    const alert=$("#timer-alert");if(alert){alert.hidden=false;alert.textContent=message;}
    if(typeof navigator!=="undefined"&&navigator.vibrate)try{navigator.vibrate([180,100,180]);}catch{}
    if(state.notifyEnabled && typeof Notification!=="undefined"&&Notification.permission==="granted"){
      try{
        if(typeof navigator!=="undefined"&&navigator.serviceWorker?.ready){
          navigator.serviceWorker.ready.then(reg=>reg.showNotification("Мой ЕГЭ",{body:message,tag:"ege-study",icon:"./icons/icon-192.png"})).catch(()=>{});
        }else new Notification("Мой ЕГЭ",{body:message});
      }catch{}
    }
  }
  function suggestedPause(task){
    if(!task||task.kind==="review"||task.slot===undefined)return 0;
    const mode=modeFor(L.today());
    return task.slot===0?15:(task.slot===1&&mode==="normal"?35:0);
  }
  function checkTimers(){
    const t=state.studyTimer;
    if(t?.startedAt){
      if(!t.notified&&currentTime(t.taskId)>=t.targetSeconds){
        const assigned=L.studyAgenda(state,L.today(),modeFor(L.today())).find(x=>x.id===t.taskId);
        const suggested=suggestedPause(assigned);
        pauseStudyTimer();
        state.studyTimer.notified=true;
        if(suggested)state.restSuggestion={minutes:suggested,fromId:t.taskId,offeredOn:L.today()};
        save();renderSession();
        alertUser("Время занятия закончилось. Пора сделать перерыв и отдохнуть.");
        const alert=$("#timer-alert");
        if(alert&&suggested)alert.innerHTML+=' <button type="button" class="btn small" data-action="start-break">Начать перерыв '+suggested+' минут</button>';
      }
    }
    updateTimerDisplays();
    if(state.restTimer?.endAt && state.restTimer.startedOn===L.today()){
      const seconds=Math.max(0,Math.ceil((state.restTimer.endAt-Date.now())/1000));
      const clock=$("#rest-countdown");if(clock)clock.textContent=clockDisplay(seconds);
      if(seconds===0&&!state.restTimer.notified){
        state.restTimer.notified=true;save();alertUser("Перерыв закончился. Можно продолжать, если есть силы.");
        if(view==="today"&&!$("#task-dialog").open)render();
      }
    }
  }
  function breakPanel(){
    if(state.restTimer?.endAt && state.restTimer.startedOn===L.today()){
      const remain=Math.max(0,Math.ceil((state.restTimer.endAt-Date.now())/1000));
      return '<section class="rest-banner card padding"><div><strong>'+(remain?"Перерыв — можно отдыхать":"Перерыв завершён")+'</strong>'+
        '<p class="note">До следующего занятия необязательно приступать сразу. Отдых можно продлить.</p></div>'+
        '<span class="rest-clock" id="rest-countdown">'+clockDisplay(remain)+'</span>'+
        '<button class="btn secondary small" data-action="close-break">'+(remain?"Завершить досрочно":"Закрыть")+'</button></section>';
    }
    if(state.restSuggestion?.minutes && state.restSuggestion.offeredOn===L.today()){
      return '<section class="rest-banner card padding"><div><strong>Рекомендуется перерыв '+state.restSuggestion.minutes+' минут</strong>'+
        '<p class="note">Пауза после завершённого блока. Можно начать сейчас или отложить.</p></div>'+
        '<button class="btn small" data-action="start-break">Начать перерыв</button>'+
        '<button class="btn ghost small" data-action="close-break">Не сейчас</button></section>';
    }
    return "";
  }
  function resourceForm(key){
    if(!key)return "";
    return '<details class="resource-add"><summary>+ Добавить свою ссылку на задание или объяснение</summary>'+
      '<form id="add-link-form" class="stack gap-small"><div class="field"><label for="link-title">Название</label><input id="link-title" name="title" maxlength="100" placeholder="Подборка задач №14" required></div>'+
      '<div class="field"><label for="link-url">Адрес ссылки</label><input id="link-url" name="url" type="url" placeholder="https://..." required></div>'+
      '<button class="btn small" type="submit">Сохранить ссылку</button></form></details>';
  }
  function detail(id){
    const source=lookup(id);if(!source)return;
    const assigned=L.studyAgenda(state,L.today(),modeFor(L.today())).find(x=>x.id===id);
    const t=assigned||source;
    openTask=t;openTopicKey=t.topicKey;
    const note=state.notes[id]||"",priorScore=state.results[id],guide=U.topicGuide(t.subject,t.title);
    const steps=stepsFor(t),checks=state.steps[id]||[];
    const week=Math.max(0,Math.min(25,L.weekNumber(id.split(":")[0],state.startDate)));
    const kind={new:"Изучить",practice:"Решить самостоятельно",mixed:"Смешанная практика",review:"Проверить себя"}[t.kind];
    $("#dialog-content").innerHTML='<div class="dialog-pad"><div class="dialog-head"><div>'+badge(t.subject)+
      '<h2 style="margin:12px 0 5px">'+safe(t.title)+'</h2><p class="note">'+safe(kind)+' · '+t.minutes+' мин</p></div>'+
      '<button class="dialog-close" data-action="close-dialog" aria-label="Закрыть карточку">×</button></div>'+
      '<div class="goal-box"><strong>Цель занятия</strong><p>'+safe(U.taskGoal(t))+'</p>'+
      '<p class="note" style="margin-top:8px"><strong>Как проверить себя:</strong> '+safe(guide.check)+'</p></div>'+
      '<h3 style="margin-top:18px">План действий <span class="note">· Отмечайте по мере выполнения</span></h3>'+
      '<div class="step-list">'+steps.map((v,i)=>'<label class="step-line"><input type="checkbox" data-action="toggle-step" data-step="'+i+'"'+(checks[i]?' checked':'')+'><span>'+safe(v)+'</span></label>').join("")+'</div>'+
      '<h3 style="margin-top:18px">Материалы и практика</h3><p class="note">Сначала изучите объяснение, затем перейдите к практическим заданиям. Ссылки открываются в Chrome и требуют интернета.</p>'+
      '<div id="dialog-resources">'+resourceCards(t.subject,week,t.title,t.topicKey)+'</div>'+resourceForm(t.topicKey)+
      '<div class="timer-box"><div><div class="stat-caption">УЧЕБНЫЙ ТАЙМЕР · цель '+t.minutes+' минут</div><div class="timer" id="timer-clock">'+clockDisplay(currentTime(id))+'</div>'+
      '<p class="note">Таймер продолжает идти после закрытия карточки. Время учитывается по часам планшета.</p></div>'+
      '<div class="row"><button class="btn secondary small" data-action="timer-toggle" id="timer-button">'+timerButtonLabel(id)+'</button><button class="btn ghost small" data-action="timer-reset">Сброс</button></div></div>'+
      '<div id="timer-alert" class="timer-alert" role="status" aria-live="assertive" hidden></div>'+
      '<div class="field" style="margin-top:16px"><label for="task-note">Быстрая запись</label><textarea id="task-note" maxlength="2000" placeholder="Какая ошибка? Какой метод? Что повторить позже?">'+safe(note)+'</textarea><span class="note" id="saved-label">Сохраняется при наборе</span></div>'+
      '<div class="result-box"><div class="field"><label for="task-score">Результат</label><input id="task-score" placeholder="Например, 8/10" inputmode="text" value="'+safe(priorScore?priorScore.correct+"/"+priorScore.total:"")+'"></div>'+
      '<button class="btn secondary small" data-action="save-score">Записать результат</button><span class="note">Число верных / всего. Необязательно для теории.</span></div>'+
      '<div class="row wrap dialog-actions"><button class="btn" data-action="dialog-complete">'+(state.completed[id]?"Отменить выполнение":"Завершить занятие ✓")+'</button>'+
      '<button class="btn secondary" data-action="dialog-error">Записать ошибку</button></div>'+
      '<div id="dialog-error-form" hidden><div class="field"><label for="dialog-error-type">Тип ошибки</label>'+
      '<select id="dialog-error-type"><option value="concept">Не поняла принцип</option><option value="method">Не знаю метод</option><option value="memory">Забыла факт</option><option value="attention">Невнимательность</option><option value="time">Не хватило времени</option><option value="other">Другая причина</option></select></div>'+
      '<div class="field"><label for="dialog-error-text">Что исправить?</label><textarea id="dialog-error-text" maxlength="800" placeholder="Например: путаю знак при раскрытии скобок. Решить ещё 3 похожих примера."></textarea></div>'+
      '<button class="btn small" data-action="dialog-save-error">Сохранить ошибку</button></div></div>';
    $("#task-dialog").showModal();
  }
  function topicDetail(key){
    const t=U.topicByKey(key);if(!t)return;
    openTask=null;openTopicKey=key;
    const [status]=reviewStatus(key),personal=state.topicNotes[key]||"",guide=U.topicGuide(t.subject,t.title);
    $("#dialog-content").innerHTML='<div class="dialog-pad"><div class="dialog-head"><div>'+badge(t.subject)+
      '<p class="note" style="margin:12px 0 4px">Неделя '+(t.week+1)+' · '+safe(status)+'</p>'+
      '<h2>'+safe(t.title)+'</h2></div><button class="dialog-close" data-action="close-dialog" aria-label="Закрыть">×</button></div>'+
      '<div class="goal-box"><strong>Что нужно знать, уметь и проверить</strong><dl class="topic-guide">'+
      '<dt>Знать</dt><dd>'+safe(guide.know)+'</dd>'+
      '<dt>Уметь</dt><dd>'+safe(guide.doTask)+'</dd>'+
      '<dt>Проверить</dt><dd>'+safe(guide.check)+'</dd></dl></div>'+
      '<h3 style="margin-top:18px">Материалы и задания</h3><div id="dialog-resources">'+resourceCards(t.subject,t.week,t.title,key)+'</div>'+resourceForm(key)+
      '<div class="field" style="margin-top:18px"><label for="topic-note">Мои заметки по теме</label>'+
      '<textarea id="topic-note" maxlength="3000" placeholder="Основные формулы, трудные места, конкретные задания, которые надо решить...">'+safe(personal)+'</textarea><span class="note">Сохраняется при наборе</span></div>'+
      '<div class="row wrap" style="margin-top:16px"><button class="btn secondary" data-action="pin-topic" data-key="'+safe(key)+'">'+(state.pinned[key]?"★ В закладках":"☆ В закладки")+'</button><button class="btn" data-action="start-topic-review" data-key="'+safe(key)+'">'+(state.reviews[key]?"Повтор уже запланирован":"Изучила → назначить повтор")+'</button>'+
      (state.reviews[key]?'<button class="btn secondary" data-view="reviews">Открыть повторения</button>':"")+'</div></div>';
    $("#task-dialog").showModal();
  }
  function closeDialog(){$("#task-dialog").close();openTask=null;openTopicKey=null;}
  function addError(subject,title,description,kind="other",topicKey=null){
    if(!description.trim()||!title.trim())return false;
    state.errors.unshift({id:String(Date.now())+"-"+Math.random().toString(36).slice(2,7),subject,title,description,kind,topicKey,date:L.today(),done:false});
    save();return true;
  }
  document.addEventListener("click",ev=>{
    const b=ev.target.closest("button");if(!b)return;
    if(b.dataset.view){if($("#task-dialog").open)closeDialog();setView(b.dataset.view);return;}
    const action=b.dataset.action;if(!action)return;
    switch(action){
      case "prev-day":case "next-day":{
        let d=L.parseDate(date),delta=action==="prev-day"?-1:1;
        do{d=L.move(d,delta);}while(!L.isStudyDay(d));
        date=L.iso(d);render();break;
      }
      case "prev-week":case "next-week":focusWeek=Math.min(25,Math.max(0,focusWeek+(action==="prev-week"?-1:1)));render();break;
      case "pick-day":date=b.dataset.date;view="today";render();break;
      case "subject":focusSubject=b.dataset.subject;render();break;
      case "repeat-error":{
        const er=state.errors.find(x=>x.id===b.dataset.id);
        if(!er?.topicKey){notice("У этой записи нет привязки к теме.");break;}
        if(!L.isStudyDay(L.today())){notice("Повторения не проводятся в выходные.");break;}
        const t=U.topicByKey(er.topicKey);if(!t)break;
        L.beginReview(state,{topicKey:t.key,subject:t.subject,title:t.title},L.today());
        state.reviews[t.key].due=L.shiftStudyDays(L.today(),1);
        save();notice("Проверка назначена на следующий учебный день.");render();break;
      }
      case "open-topic":topicDetail(b.dataset.key);break;
      case "toggle-pins":searchPinned=!searchPinned;render();break;
      case "toggle-all-reviews":showAllReviews=!showAllReviews;render();break;
      case "pin-topic":{
        const key=b.dataset.key;
        if(!U.topicByKey(key))break;
        if(state.pinned[key])delete state.pinned[key];else state.pinned[key]=true;
        save();b.textContent=state.pinned[key]?"★ В закладках":"☆ В закладки";break;
      }
      case "skip-task":{
        const id=b.dataset.id;
        if(state.skipped[id])delete state.skipped[id];
        else {
          const t=lookup(id);
          if(t&&t.kind!=="review"&&!confirm("Это обязательный учебный блок. Если пропустить его, он НЕ будет считаться освоенным, но исчезнет из очереди. Продолжить?"))break;
          delete state.completed[id];state.skipped[id]=true;
        }
        save();render();break;
      }
      case "show-backlog":{setView("backlog");break;}
      case "start-break":{
        const minutes=Number(state.restSuggestion?.minutes);
        if(!minutes)break;
        state.restTimer={endAt:Date.now()+minutes*60000,notified:false,startedOn:L.today()};
        delete state.restSuggestion;save();if($("#task-dialog").open)closeDialog();render();checkTimers();break;
      }
      case "close-break":{
        delete state.restTimer;delete state.restSuggestion;save();render();break;
      }
      case "allow-notify":{
        if(typeof Notification==="undefined"){notice("Системные уведомления недоступны в этом браузере. Встроенные напоминания работают.");break;}
        Notification.requestPermission().then(permission=>{
          state.notifyEnabled=permission==="granted";save();
          notice(state.notifyEnabled?"Системные уведомления включены.":"Уведомления не разрешены; остаются встроенные напоминания.");
          render();
        }).catch(()=>notice("Не удалось запросить уведомления."));
        break;
      }
      case "start-topic-review":{
        const t=U.topicByKey(b.dataset.key);
        if(!t)break;
        if(!L.isStudyDay(L.today())){notice("В выходные учебные действия не планируются.");break;}
        if(!state.reviews[t.key]){L.beginReview(state,{subject:t.subject,title:t.title,topicKey:t.key},L.today());save();notice("Тема добавлена: контроль в ближайший учебный день.");}
        closeDialog();render();break;
      }
      case "remove-resource":{
        const key=b.dataset.topic,url=b.dataset.url;
        state.customLinks[key]=(state.customLinks[key]||[]).filter(v=>v.url!==url);
        save();
        const t=U.topicByKey(key);
        if(t&&$("#dialog-resources"))$("#dialog-resources").innerHTML=resourceCards(t.subject,t.week,t.title,key);
        break;
      }
      case "toggle-task":completeTask(b.dataset.id);break;
      case "detail":detail(b.dataset.id);break;
      case "show-materials":{
        detail(b.dataset.id);
        const section=$("#dialog-resources");
        if(section?.scrollIntoView)section.scrollIntoView({block:"center",behavior:"smooth"});
        break;
      }
      case "set-mode":{const info=schoolInfo(date);state.school[date]={...info,manualMode:b.dataset.mode};save();render();break;}
      case "start-topic":{
        const s=b.dataset.subject,i=Number(b.dataset.index),key=L.topicKey(s,focusWeek,i);
        if(!state.reviews[key]){L.beginReview(state,{subject:s,title:subj(s).weeks[focusWeek][i],topicKey:key},L.today());save();notice("Тема добавлена в очередь повторений.");render();}
        else setView("reviews");
        break;
      }
      case "rate":if(!L.isStudyDay(L.today())){notice("В выходные занятия и повторения не проводятся.");break;}if(L.rateReview(state,b.dataset.key,b.dataset.rate,L.today())){save();render();notice("Следующая проверка назначена.");}break;
      case "resolve-error":{
        const er=state.errors.find(x=>x.id===b.dataset.id);if(er){er.done=true;save();render();}break;
      }
      case "export":{
        const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"});
        const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="ege-2027-progress-"+L.today()+".json";
        document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);break;
      }
      case "import":$("#import-input").click();break;
      case "reset":if(confirm("Удалить ВСЕ отметки, повторы и ошибки в этом браузере?")){state=L.safeState(null,currentMonday);save();date=L.today();focusWeek=0;render();}break;
      case "close-dialog":closeDialog();break;
      case "dialog-complete":if(openTask){const id=openTask.id;closeDialog();completeTask(id);}break;
      case "save-score":{
        if(!openTask)break;
        const raw=($("#task-score")?.value||"").trim(),m=/^(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(raw);
        if(!m||Number(m[2])<1||Number(m[1])>Number(m[2])||Number(m[2])>200){notice("Введите результат как 8/10 (не больше 200 задач).");break;}
        const correct=Number(m[1]),total=Number(m[2]),fraction=correct/total;
        state.results[openTask.id]={correct,total,subject:openTask.subject,topicKey:openTask.topicKey,date:openTask.id.split(":")[0]};
        if(openTask.topicKey && fraction<.8){
          L.beginReview(state,openTask,openTask.id.split(":")[0]);
          const review=state.reviews[openTask.topicKey];
          if(review){review.stage=0;review.successes=0;review.due=L.shiftStudyDays(L.today(),1);}
        }
        save();notice(fraction<.8?"Низкая точность: назначена ранняя повторная проверка.":"Результат сохранён. Освоение подтвердит отсроченная проверка.");
        break;
      }
      case "dialog-error":$("#dialog-error-form").hidden=false;$("#dialog-error-text").focus();break;
      case "dialog-save-error":{
        if(!openTask)break;
        const kind=$("#dialog-error-type")?.value||"other";
        const text=($("#dialog-error-text")?.value||"").trim();
        if(text&&addError(openTask.subject,openTask.title,text,kind,openTask.topicKey)){
          $("#dialog-error-form").hidden=true;$("#dialog-error-text").value="";
          notice("Ошибка сохранена. Вернитесь к ней при повторении.");
        }else notice("Укажите конкретную ошибку или затруднение.");
        break;
      }
      case "timer-toggle":{
        if(!openTask)break;
        if(state.studyTimer?.taskId===openTask.id&&state.studyTimer.startedAt){
          pauseStudyTimer();renderSession();updateTimerDisplays();
        }else startStudyTimer(openTask);
        break;
      }
      case "session-toggle":{
        const t=state.studyTimer;if(!t)break;
        if(t.startedAt)pauseStudyTimer();
        else {t.startedAt=Date.now();save();}
        renderSession();updateTimerDisplays();break;
      }
      case "session-open":{
        if($("#task-dialog").open)closeDialog();
        detail(b.dataset.id);break;
      }
      case "timer-reset":{
        if(!openTask)break;
        if(state.studyTimer?.taskId===openTask.id)state.studyTimer=null;
        state.timeSpent[openTask.id]=0;save();
        renderSession();updateTimerDisplays();break;
      }
    }
  });
  document.addEventListener("change",ev=>{
    if(ev.target.id==="start-date"){
      const v=ev.target.value,d=L.parseDate(v);
      if(!d||d.getDay()!==1){notice("Нужен понедельник.");ev.target.value=state.startDate;return;}
      if(confirm("Изменить дату начала? Отметки привязаны к прежним датам; сохраните резервную копию при необходимости.")){
        state.startDate=v;date=v;focusWeek=0;save();render();
      }else ev.target.value=state.startDate;
    }
    if(["school-homework","school-sleep","school-energy"].includes(ev.target.id)){
      const info={...schoolInfo(date)};
      if(ev.target.id==="school-homework")info.homework=Number(ev.target.value);
      if(ev.target.id==="school-sleep")info.sleep=Number(ev.target.value);
      if(ev.target.id==="school-energy")info.energy=ev.target.value;
      schoolExpanded=true;state.school[date]=info;save();render();
    }
    if(ev.target.id==="task-note"&&openTask){state.notes[openTask.id]=ev.target.value;save();}
    if(ev.target.matches?.('input[data-action="toggle-step"]')&&openTask){
      const step=Number(ev.target.dataset.step);const checked=state.steps[openTask.id]||[];
      checked[step]=!!ev.target.checked;state.steps[openTask.id]=checked;save();
    }
    if(ev.target.id==="search-subject"){searchSubject=ev.target.value;$("#topic-results").innerHTML=topicSearchResults();}
    if(["school-homework","school-sleep","school-energy"].includes(ev.target.id))schoolExpanded=true;
  });
  document.addEventListener("input",ev=>{
    const el=ev.target;
    if(el.id==="task-note"&&openTask){state.notes[openTask.id]=el.value;save();}
    if(el.id==="topic-note"&&openTopicKey){state.topicNotes[openTopicKey]=el.value;save();}
    if(el.id==="day-note"){state.dayNotes[date]=el.value;save();}
    if(el.id==="topic-search"){
      searchQuery=el.value;
      const results=$("#topic-results"),current=$("#topic-current-week");
      if(results)results.innerHTML=topicSearchResults();
      if(current)current.hidden=!!searchQuery.trim()||searchPinned;
    }
  });
  document.addEventListener("submit",ev=>{
    if(ev.target.id==="add-link-form"){
      ev.preventDefault();
      const t=U.topicByKey(openTopicKey);if(!t){notice("Выберите тему.");return;}
      const data=new FormData(ev.target),url=U.safeHttpUrl(data.get("url")),title=String(data.get("title")||"").trim();
      if(!url||!title||title.length>100){notice("Укажите название и обычную ссылку http/https.");return;}
      const links=state.customLinks[t.key]||[];
      if(links.length>=12){notice("Для одной темы достаточно 12 ссылок.");return;}
      if(!links.some(x=>x.url===url))links.push({title,url});
      state.customLinks[t.key]=links;save();
      $("#dialog-resources").innerHTML=resourceCards(t.subject,t.week,t.title,t.key);
      ev.target.reset();notice("Ссылка добавлена к этой теме.");return;
    }
    if(ev.target.id==="add-error-form"){
      ev.preventDefault();const data=new FormData(ev.target);
      if(addError(String(data.get("subject")),String(data.get("title")||""),String(data.get("description")||""))){notice("Ошибка добавлена.");render();}
    }
  });
  $("#import-input").addEventListener("change",async ev=>{
    const f=ev.target.files?.[0];if(!f)return;
    if(f.size>3_000_000){notice("Слишком большой файл резервной копии.");ev.target.value="";return;}
    try{
      const obj=JSON.parse(await f.text());
      if(obj.version!==1||!obj.state||!obj.state.completed||!obj.state.reviews)throw Error("Неверный формат");
      if(!confirm("Заменить текущий прогресс данными из этого файла?"))return;
      state=L.safeState(obj.state,currentMonday);save();focusWeek=Math.max(0,Math.min(25,L.weekNumber(date,state.startDate)));render();notice("Резервная копия восстановлена.");
    }catch{notice("Не удалось прочитать резервную копию JSON.");}finally{ev.target.value="";}
  });
  $("#jump-today").addEventListener("click",()=>{date=L.today();focusWeek=Math.max(0,Math.min(25,L.weekNumber(date,state.startDate)));setView("today");});
  $("#task-dialog").addEventListener("close",()=>{openTask=null;openTopicKey=null;});
  $("#quick-search").addEventListener("click",searchAction);
  document.addEventListener("keydown",ev=>{
    if(ev.key==="/"&&!ev.altKey&&!ev.ctrlKey&&!ev.metaKey&&!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)){
      ev.preventDefault();searchAction();
    }
  });
  if(typeof document!=="undefined")document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)checkTimers();
  });
  setInterval(checkTimers,1000);
  render();
})();
