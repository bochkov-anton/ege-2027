/* Compact, semantic weekly course cards. Every subject is visible by default. */
(function(){"use strict";
function renderWeek(state,C,n,ctx){
 const metrics=window.EGE_ANALYTICS.week(state,C,n);
 const {safe,badge,authored,pagePreview,subj}=ctx;
 const all=Object.entries(metrics);
 const total=all.reduce((a,[,x])=>a+x.topics.length,0);
 const complete=all.reduce((a,[,x])=>a+x.mastered,0);
 const ready=all.reduce((a,[,x])=>a+x.ready,0);
 const blocked=all.reduce((a,[,x])=>a+x.blocked,0);
 const ratio=total?Math.round(complete/total*100):0;
 const summary='<section class="week-overview" aria-label="Сводка учебной недели">'+
  '<div class="week-overview-main"><span class="week-overview-label">УЧЕБНЫЙ МАРШРУТ</span>'+
  '<h2>9 тем. Три направления.</h2>'+
  '<p>Все темы недели на одном экране. Подробности открываются только тогда, когда нужны.</p></div>'+
  '<div class="week-overview-stats">'+
  '<div><b>'+complete+' <small>/ '+total+'</small></b><span>Освоено</span></div>'+
  '<div><b>'+ready+'</b><span>Доступно к изучению</span></div>'+
  '<div><b>'+blocked+'</b><span>Ожидает базу</span></div></div>'+
  '<div class="week-overview-track" role="progressbar" aria-label="Освоенные темы недели" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+complete+'"><span style="width:'+ratio+'%"></span></div></section>';
 const states={mastered:["Освоено","done"],practice:["Нужна практика","practice"],
   ready:["Можно изучать","ready"],blocked:["Сначала основы","blocked"]};
 const columns=all.map(([s,data])=>{
  const percent=data.topics.length?Math.round(data.mastered/data.topics.length*100):0;
  const list=data.topics.map((topic,i)=>{
   const title=topic.title,guide=authored(topic.id,s,title),flag=states[topic.phase]||states.blocked;
   return '<li class="week-mini-lesson" data-topic-id="'+safe(topic.id)+'">'+
      '<div class="week-mini-heading"><span class="week-mini-number">'+(i+1)+'</span>'+
      '<div class="week-mini-title"><h4>'+safe(title)+'</h4>'+
      '<span class="week-mini-status '+flag[1]+'">'+flag[0]+'</span></div></div>'+
      '<div class="week-mini-controls"><button type="button" class="week-open-btn" aria-label="Открыть тему: '+safe(title)+'" data-action="open-topic" data-key="'+safe(topic.id)+'">Открыть тему <span aria-hidden="true">→</span></button>'+
      '<details class="week-mini-details"><summary aria-label="Подробнее о теме: '+safe(title)+'">Подробнее</summary>'+
      '<div class="week-mini-detail-body">'+
       '<p><strong>Изучить</strong>'+safe(guide.know)+'</p>'+
       (pagePreview(topic.id)||"")+
       '<p><strong>Выполнить</strong>'+safe(guide.doTask)+'</p>'+
       '<p><strong>Проверить</strong>'+safe(guide.check)+'</p>'+
       (topic.missing?'<p class="week-prereq-note">До темы необходимо завершить '+topic.missing+' '+(topic.missing===1?"базовую тему":"базовых тем")+'. Откройте карточку для списка зависимостей.</p>':"")+
      '</div></details></div></li>';
  }).join("");
  return '<section class="week-subject week-subject-'+s+'" aria-label="'+safe(subj(s).name)+'">'+
    '<header class="week-subject-header"><div class="week-subject-heading">'+badge(s)+
      '<span class="week-subject-count">'+data.mastered+' / '+data.topics.length+' освоено</span></div>'+
      '<div class="week-subject-bar" role="progressbar" aria-label="Освоено тем: '+safe(subj(s).name)+'" aria-valuemin="0" aria-valuemax="'+data.topics.length+'" aria-valuenow="'+data.mastered+'"><span style="width:'+percent+'%"></span></div></header>'+
    '<ol class="week-mini-list">'+list+'</ol></section>';
 }).join("");
 return '<section class="week-topics-redesigned" aria-label="Темы недели">'+
   '<div class="week-section-heading"><div><span class="week-eyebrow">ПРОГРАММА</span><h2>Темы недели</h2></div>'+
   '<button type="button" class="week-rest-chip" data-action="show-saturday" title="Открыть субботу выбранной недели: учёба только по желанию">Сб · можно учиться по желанию · Вс · отдых</button></div>'+
   summary+'<div class="week-subject-grid">'+columns+'</div>'+
   '<p class="week-data-disclaimer">Это учебный ориентир, а не фактически назначенные занятия. Доступность учитывает зависимости; освоение означает завершённые теорию и практику. Календарное время само по себе не засчитывается.</p>'+
   '</section>';
}
function renderProgress(state,C,today,ctx){
 const d=window.EGE_ANALYTICS.summary(state,C,today);
 const {safe,badge,subj}=ctx,all=Object.entries(d),sum=k=>all.reduce((n,[,x])=>n+x[k],0);
 const mastered=sum("mastered"),reinforced=sum("reinforced"),due=sum("due"),errors=sum("openErrors");
 const total=sum("total"),pct=total?Math.round(mastered/total*100):0;
 let html='<section class="learning-insights" aria-label="Аналитика освоения">'+
 '<div class="insights-header"><div><span class="week-eyebrow">НА ОСНОВЕ СОХРАНЁННЫХ РЕЗУЛЬТАТОВ</span>'+
 '<h2>Что действительно освоено</h2><p>Теория, самостоятельная практика и отложенное закрепление — разные уровни прогресса.</p></div></div>'+
 '<div class="insights-metrics">'+
 [['Освоено',mastered+"/"+total,"Теория и практика завершены"],["Закреплено",reinforced,"Не менее двух успешных повторений"],["К повторению",due,"Наступил срок проверки"],["Открытые ошибки",errors,"Ещё не исправлены"]]
  .map(([title,value,subtitle])=>'<div class="insight-metric"><span>'+title+'</span><b>'+value+'</b><small>'+subtitle+'</small></div>').join("")+
 '</div>'+
 '<div class="insights-subject-grid">'+all.map(([s,x])=>{
  const share=x.total?Math.round(x.mastered/x.total*100):0,retention=x.total?Math.round(x.reinforced/x.total*100):0;
  return '<section class="insight-subject">'+
    '<header>'+badge(s)+'<span>'+x.mastered+' / '+x.total+' освоено</span></header>'+
    '<div class="insight-bar-label"><span>Теория + практика</span><strong>'+share+'%</strong></div>'+
    '<div class="insight-bar" role="progressbar" aria-label="Освоение '+safe(subj(s).name)+'" aria-valuemin="0" aria-valuemax="'+x.total+'" aria-valuenow="'+x.mastered+'"><span style="width:'+share+'%"></span></div>'+
    '<div class="insight-bar-label"><span>Закреплено повторениями</span><strong>'+x.reinforced+'</strong></div>'+
    '<div class="insight-bar insight-bar-reinforced"><span style="width:'+retention+'%"></span></div>'+
    '<dl><div><dt>Начато</dt><dd>'+x.started+'</dd></div>'+
    '<div><dt>Теория пройдена</dt><dd>'+x.theory+'</dd></div>'+
    '<div><dt>Ожидают повторения</dt><dd>'+x.due+'</dd></div>'+
    '<div><dt>Ошибки в работе</dt><dd>'+x.openErrors+'</dd></div></dl>'+
    (x.accuracy===null?'<p class="insight-accuracy">Пока нет записанной точности задач.</p>':
      '<p class="insight-accuracy">Точность вручную внесённых задач: <strong>'+x.accuracy+'%</strong> ('+x.answered+' ответов)</p>')+
    '</section>';
 }).join("")+'</div>'+
 '<div class="insights-legend"><strong>Важно:</strong> '+pct+'% — доля тем с отмеченными теорией и практикой, не прогноз баллов ЕГЭ. Закрепление требует реальных повторений. Точность отражает только вручную внесённые задания.</div></section>';
 return html;
}
window.EGE_WEEK_UI=Object.freeze({renderWeek,renderProgress});
})();