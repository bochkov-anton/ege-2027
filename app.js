(function () {
  "use strict";
  const D=window.EGE_DATA,L=window.EGE_LOGIC,C=window.EGE_CURRICULUM,R=window.EGE_RESOURCES,U=window.EGE_UX,STORE="ege2027-local-progress-v1";
  const $=(q)=>document.querySelector(q);
  const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const currentMonday=L.iso(L.monday(new Date()));
  let state;
  try{state=L.safeState(JSON.parse(localStorage.getItem(STORE)||"null"),currentMonday);}
  catch{state=L.safeState(null,currentMonday);}
  let view="today",date=L.today(),focusWeek=Math.max(0,Math.min(25,L.weekNumber(date,state.startDate))),focusSubject="bio",searchQuery="",searchSubject="all",searchPinned=false,openTopicKey=null,schoolExpanded=false,showAllReviews=false;
  let openTask=null,noticeHandle=null,lessonTab='theory';
  const READER_PREF="ege2027-large-reader-v1";
  let largeReading=false;
  try{largeReading=localStorage.getItem(READER_PREF)==="1";}catch{}
  function applyReaderMode(){
    $("#task-dialog").classList.toggle("large-reading",largeReading);
    const button=document.querySelector("#task-dialog .reader-font-btn");
    button?.setAttribute?.("aria-pressed",String(largeReading));
    button?.setAttribute?.("aria-label",largeReading?"Вернуть обычный размер текста":"Увеличить текст учебных материалов");
  }
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
  function sourceActions(x,key){
    const url=U.safeHttpUrl(x.url);
    if(!url)return "";
    return '<div class="resource-line"><div class="resource-copy">'+
      '<div class="resource-type">'+safe(x.user?"Добавлено вручную · адрес не проверен":U.resourceKind(x))+'</div>'+
      '<strong>'+safe(x.title)+'</strong>'+
      '<small>'+safe(x.user?"Пользовательская ссылка: проверьте адрес вручную.":U.resourceHint(x))+'</small>'+
      '<small class="resource-address">'+safe(url)+'</small>'+
      '<div class="row wrap resource-buttons"><a class="btn secondary small" href="'+safe(url)+'" rel="noreferrer">Открыть сайт ↗</a>'+
      '<button type="button" class="btn ghost small" data-action="copy-resource" data-url="'+safe(url)+'">Скопировать адрес</button></div></div>'+
      (x.user&&key?'<button type="button" class="btn ghost small" data-action="remove-resource" data-topic="'+safe(key)+'" data-url="'+safe(url)+'" title="Удалить ссылку">×</button>':'')+'</div>';
  }
  function authored(key,subject,title){
    return window.EGE_LESSONS?.get(key)||U.topicGuide(subject,title);
  }
  function theoryFor(key,subject,title){
    return window.EGE_THEORY?.get(key,subject,title,authored(key,subject,title))||{};
  }
  function directExercises(key){return window.EGE_PRACTICE?.get(key)?.sources||[];}
  function sourceCaveat(key,url){
    if(key==="chem:3:0"&&/foxford\.ru\/wiki\/himiya\/gidroliz$/.test(url))
      return "В выводах статьи встречается неточность: соль слабого основания и сильной кислоты гидролизуется по катиону, а не по аниону. Проверяйте состав ионов по учебнику.";
    if(["math:12:0","math:12:1"].includes(key)&&/zadanie-17-ege-po-profilnoy-matematike/.test(url))
      return "Не переносите числовой ответ из соседнего примера: проверьте все значения параметров по собственному условию.";
    return "";
  }
  function coveragePanel(key){
    const coverage=window.EGE_COVERAGE?.get(key);
    if(!coverage)return "";
    return '<details class="card padding content-coverage" aria-label="Покрытие подтем материалами"'+(coverage.components.length<=3?' open':'')+'><summary>План изучения · '+safe(coverage.components.length)+' подтем</summary>'+
      '<h3>Что именно изучить по этой теме</h3>'+
      '<p class="note">'+safe(coverage.notice)+'</p>'+
      '<ol class="coverage-parts">'+coverage.components.map(part=>
        '<li><strong>'+safe(part.label)+'</strong>'+
        (part.source?
          '<div class="coverage-evidence"><span>'+(part.evidence==="source_excerpt_verified"?"Фрагмент текста источника проверен":"Редакционно подобрано: содержимое требуется сверить")+'</span> · <a href="'+safe(part.source.url)+'" target="_blank" rel="noopener noreferrer">'+safe(part.source.title)+' ↗</a></div>':
          '<div class="coverage-unreviewed">Для этого пункта соответствие внешних материалов не проверено</div>'+
          (part.candidates?.books?.length?'<div class="coverage-suggestions">Возможные § по оглавлению (содержимое не сверено): '+
            part.candidates.books.map(x=>safe(x.edition)+' · § '+safe(x.number)+' · с. '+safe(x.pagesLabel)).join('; ')+'</div>':"")+
          (part.candidates?.articles?.length?'<div class="coverage-suggestions">Статьи-кандидаты по названию: '+
            part.candidates.articles.map(x=>'<a href="'+safe(x.url)+'" rel="noopener noreferrer" target="_blank">'+safe(x.title)+' ↗</a>').join('; ')+'</div>':"")+
          (part.candidates?.practice?.length?'<div class="coverage-suggestions">Подборки-кандидаты по названию (задания не проверены): '+
            part.candidates.practice.map(x=>'<a href="'+safe(x.url)+'" rel="noopener noreferrer" target="_blank">'+safe(x.title)+' ↗</a>').join('; ')+'</div>':""))+
        '</li>').join("")+'</ol>'+
      '</details>';
  }
  function studySourcesPanel(key){
    const guide=window.EGE_STUDY_SOURCES?.get(key);
    if(!guide)return "";
    const pack=guide.bookReadings;
    return '<section class="source-route" aria-label="Материалы по компонентам занятия">'+
      '<details><summary>Проверить весь маршрут изучения: параграфы, страницы и задачи ('+
       safe(guide.components.length)+' части)</summary>'+
      '<p class="note">'+safe(guide.notice)+'</p>'+
       '<p class="note">Ориентир 75 минут: теория 40, задачи 25, повторение 10. Параграфы — тематическая карта, не требование читать всё подряд.</p>'+
       (guide.workload.large?'<p class="route-load-warning"><strong>Большой объём:</strong> '+safe(guide.workload.referenceParagraphs)+
       ' параграфов на '+safe(guide.workload.components)+' подтем. Если не успеваете, перенесите остаток на другую сессию; не отмечайте тему освоенной.</p>':"")+
      '<ol class="route-facets">'+guide.components.map(part=>
        '<li><strong>'+safe(part.label)+'</strong>'+
        (part.article?'<div class="route-verified">'+(part.article.verification==="source_excerpt_verified"?"Фрагмент текста проверен":"Статья подобрана редакционно, полный текст не проверен")+': <a href="'+safe(part.article.url)+'" target="_blank" rel="noopener noreferrer">'+safe(part.article.title)+' ↗</a></div>':"")+
        (part.specificallyRelatedParagraphs.length?
          '<ul>'+part.specificallyRelatedParagraphs.map(x=>
            '<li>'+safe(x.edition)+' · '+safe(x.marker)+' '+safe(x.number)+
              ', с. '+safe(x.pagesLabel)+
              ' · '+safe(x.heading)+'</li>').join("")+'</ul>':
          '<p class="route-unmatched">Точный параграф для этого пункта по названию оглавления не установлен — используйте общий список по занятию ниже и сверьте содержание.</p>')+
        '</li>').join("")+'</ol>'+
      (pack.length?'<h4>'+(guide.type==="review_or_assessment"?"Повторить по предыдущим занятиям":"Опорные параграфы занятия")+'</h4>'+
        '<ol class="route-readings">'+pack.map(x=>
          '<li><strong>'+safe(x.heading)+'</strong> · '+safe(x.edition)+
          ' · '+safe(x.marker)+' '+safe(x.number)+' · с. '+safe(x.pagesLabel)+
          ' · ISBN '+safe(x.isbn)+
          (x.fromTopic?' · из темы «'+safe(x.fromTitle)+'»':"")+
          ' · <a href="'+safe(x.source)+'" target="_blank" rel="noopener noreferrer">Источник оглавления ↗</a></li>').join("")+'</ol>':
          '<p class="note">'+(guide.type==="review_or_assessment"?
            "Для диагностики новых учебных параграфов нет: используйте демовариант ФИПИ или подборку заданий ниже.":
            "Адресная статья по этой теме дана выше; ошибочный параграф другого раздела учебника не назначаем.")+'</p>')+
      (guide.practiceCategories.length?'<h4>Практика</h4><ul class="route-readings">'+
        guide.practiceCategories.map(x=>'<li><a target="_blank" rel="noopener noreferrer" href="'+safe(x.url)+'">'+safe(x.title)+' ↗</a>'+
         ' · '+(x.verification==="official_fipi_archive"?"Архив проекта ФИПИ-2027":"Категория по названию, отдельные задания ещё не проверены")+'</li>').join("")+'</ul>':"")+
      '</details></section>';
  }
  function examMeta(key){
    const m=window.EGE_FIPI?.get(key);
    if(!m)return "";
    const lineText=m.lines.length?"Задания № "+m.lines.join(", "):
      "Номер конкретного задания не назначен";
    const evidence=m.lines.length?
      "Номера взяты из названия темы; сопоставление нужно сверить по спецификации.":
      "Тематический раздел — редакционная классификация, не цитата кодификатора.";
    return '<div class="exam-meta"><div class="study-kicker">ФИПИ · ПРОЕКТ ЕГЭ-2027</div>'+
      '<strong>'+safe(m.section)+'</strong><p>'+safe(lineText)+'</p><small>'+safe(evidence)+'</small></div>';
  }
  function resourceCards(subject,week,title,key){
    const sources=directExercises(key);
    const examRoute=window.EGE_STUDY_SOURCES?.get(key);
    const officialExam=examRoute?.practiceCategories?.find(x=>x.verification==="official_fipi_archive");
    const saved=key?(Array.isArray(state.customLinks[key])?state.customLinks[key]:[])
      .filter(x=>U.safeHttpUrl(x.url)&&typeof x.title==="string").slice(0,12):[];
    return '<div class="practice-intro"><strong>'+(examRoute?.fullExam?"Тематическая отработка ошибок, не полный вариант":"Прямые подборки задач по теме")+'</strong>'+
      '<p>'+(examRoute?.fullExam?"Сначала выполните полный вариант самостоятельно. Эти узкие подборки предназначены только для исправления ошибок.":"Откройте условия задач, решите 5–8 самостоятельно, затем сверьте решения и запишите результат.")+'</p></div>'+
      (officialExam?'<p class="route-load-warning"><strong>ФИПИ-2027 · проект демоварианта:</strong> <a href="'+safe(officialExam.url)+'" target="_blank" rel="noopener noreferrer">Открыть официальный архив ↗</a>. Это один демонстрационный комплект, не банк полных вариантов.</p>':"")+
       '<div class="direct-exercises">'+(sources.length?sources.map((x,i)=>
      '<div class="direct-exercise"><span class="direct-index">'+(i+1)+'</span>'+
      '<div class="direct-description"><strong>'+safe(x.title)+'</strong>'+
      '<span>'+(x.url.includes("sdamgia.ru")?"РЕШУ ЕГЭ":"Внешний учебный ресурс")+' · '+(x.coverage==="partial"?"только часть темы":"тематическая категория")+' · проверено по заголовку, не по содержанию каждой задачи</span>'+
      '<div class="row wrap"><a class="btn small" href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer">Открыть задания →</a>'+
      '<button class="btn ghost small" data-action="copy-resource" data-url="'+safe(x.url)+'">Скопировать адрес</button></div></div></div>').join(""):'<p class="note">Не найдена подборка заданий с достаточно точным названием по этой теме. Неподходящие ссылки скрыты; выполните индивидуальное упражнение из карточки. Это не означает, что задача на сайте отсутствует.</p>')+'</div>'+
      (saved.length?'<details class="personal-links"><summary>Мои дополнительные ссылки ('+saved.length+')</summary>'+saved.map(x=>sourceActions({...x,user:true},key)).join("")+'</details>':"");
  }
  function textbookSection(key,subject,title){
    const books=window.EGE_TEXTBOOKS?.get(key,subject,title)||[];
    if(!books.length)return '<p class="note">Учебники для этой темы ещё не сопоставлены.</p>';
    return '<section class="textbook-section" aria-label="Учебники для углублённого изучения">'+
      '<div class="textbook-section-head"><strong>Учебник · подробная теория</strong>'+
      '<p>Фоксфорд — быстро разобраться, учебник — подробно изучить определения, рисунки, доказательства и разобранные задачи. Прочитайте нужный раздел учебника, затем самостоятельно выполните практику.</p></div>'+
      books.map(book=>{
        const placeId="book-place-"+key.replace(/:/g,"-")+"-"+book.bookId;
        const old=state.textbookPlaces?.[key+"|"+book.bookId]||"";
        return '<article class="textbook-card"><div class="textbook-role">'+safe(book.role)+'</div>'+
          '<h3 class="textbook-title">'+safe(book.title)+'</h3>'+
          '<div class="textbook-meta">'+safe(book.authors)+' · '+safe(book.level)+' · '+safe(book.year)+
          (book.isbn?' · ISBN '+safe(book.isbn):"")+'</div>'+
          '<div class="textbook-section-hint"><div class="textbook-section-label">Что искать по оглавлению:</div>'+
          '<strong>'+safe(book.section)+'</strong><div class="note">Ориентир по содержанию, не подтверждённое название параграфа. Тема раздела должна совпадать с заданием карточки.</div></div>'+
          '<div class="textbook-links">'+
          '<a class="btn secondary small" href="'+safe(book.official)+'" target="_blank" rel="noopener noreferrer">Издание у издателя →</a>'+
          '<a class="btn secondary small" href="'+safe(book.yandex)+'" target="_blank" rel="noopener noreferrer">Найти книгу в Яндексе →</a>'+
          '<a class="btn ghost small" href="'+safe(book.yandexSection)+'" target="_blank" rel="noopener noreferrer">Поиск параграфа →</a></div>'+
          '<div class="textbook-place"><label for="'+safe(placeId)+'">Мой экземпляр: параграф / страницы (необязательно)</label>'+
          '<input type="text" maxlength="80" id="'+safe(placeId)+'" data-bookmark="'+safe(book.bookId)+'" data-key="'+safe(key)+'" '+
          'placeholder="Например: § 8, стр. 41–48" value="'+safe(old)+'">'+
          '<small>Найдите номер в оглавлении именно вашего издания и сохраните здесь — он останется на планшете. Страницы не назначаются автоматически без проверки.</small></div></article>';
      }).join("")+'</section>';
  }
  function remediationPanel(key){
    const subject=key.split(":")[0];
    const selected=window.EGE_READING?.remedialReading(state,key,subject,3)||[];
    if(!selected.length)return '<p class="note"><strong>Пока нет зарегистрированных слабых тем.</strong> Решите диагностические задания и запишите ошибки или результат. После этого приложение покажет конкретные параграфы для исправления затруднений.</p>';
    return '<div class="remediation-list"><h4>Индивидуальные параграфы по вашим ошибкам</h4>'+
      selected.map(item=>{
        const topic=U.topicByKey(item.topicKey);
        const sections=item.reading.map(x=>'<li>'+safe(x.marker||"§")+' '+safe(x.number)+' · '+safe(x.title)+
          ' — <strong>с. '+safe(x.pagesLabel)+'</strong> ('+safe(x.year)+')</li>').join("");
        return '<article class="remediation-row"><strong>'+safe(topic?.title||item.topicKey)+'</strong>'+
          '<small>'+safe(item.reason)+'</small><ul>'+sections+'</ul>'+
          '<button type="button" class="btn secondary small" data-action="remediation-open" data-key="'+safe(item.topicKey)+'">Открыть исходную тему →</button></article>';
      }).join("")+'</div>';
  }
  function pagePreview(key){
    const entries=window.EGE_READING?.get(key)?.entries||[];
    if(!entries.length)return '<p class="reading-short reading-short-unmapped">Повторение · нужные страницы после проверки ошибок</p>';
    const sample=entries.slice(0,2).map(x=>(x.marker||"§")+" "+x.number+" — с. "+x.pagesLabel).join("; ");
    return '<p class="reading-short"><strong>Учебник '+safe(entries[0].year)+':</strong> '+safe(sample)+
      (entries.length>2?" · ещё "+(entries.length-2):"")+'</p>';
  }
  function verifiedReadingPanel(key){
    const data=window.EGE_READING?.get(key)||{entries:[],unverified:[]};
    const sections=data.entries||[];
    if(!sections.length){
      const lesson=window.EGE_LESSONS?.get(key);
      const title=String(lesson?.title||"");
      const isDiagnostic=/вариант|пробник|диагност|стабилиз|слаб|смешан|контрол|ошиб|экзаменацион|повтор|стратег|скорост|специализац|кодификатор|покрыт|полувариант|ремонт|надежност|надёжност|итог/i.test(title);
      if(isDiagnostic)return '<div class="reading-unverified"><strong>Повторение или диагностика — фиксированного нового § нет.</strong>'+
        '<p>Сначала выполните проверочные задания. После фиксации затруднений будут предложены точные параграфы соответствующих теоретических тем. Не надо читать учебник целиком.</p>'+
        remediationPanel(key)+'</div>';
      return '<div class="reading-unverified"><strong>Точный § и страницы для этой темы пока не подтверждены.</strong>'+
        '<p>Для этой узкой темы требуется дополнительное оглавление именно выбранного издания. Не будем выдавать произвольный § за проверенный. Свои страницы можно записать ниже.</p></div>';
    }
    const grouped=new Map();
    for(const s of sections){if(!grouped.has(s.editionId))grouped.set(s.editionId,[]);
      grouped.get(s.editionId).push(s);}
    return '<section class="verified-reading" aria-label="Подтверждённые параграфы и страницы">'+
      '<h3>Параграфы и страницы — проверены по оглавлению</h3>'+
      '<p class="note">Номера ниже относятся ТОЛЬКО к указанному году издания и ISBN. У другой редакции страницы могут отличаться. Последняя страница диапазона рассчитана по началу следующего §.</p>'+
      [...grouped.values()].map(items=>{
        const ref=items[0];
        return '<div class="verified-edition"><div class="study-kicker">ПРОВЕРЕННОЕ ИЗДАНИЕ · '+safe(ref.year)+'</div>'+
          '<strong>'+safe(ref.editionTitle)+'</strong><small>ISBN '+safe(ref.isbn||"не указан")+'</small>'+
          '<ol>'+items.map(x=>'<li><strong>'+safe(x.marker||"§")+' '+safe(x.number)+'. '+safe(x.title)+'</strong>'+
              '<div class="reading-pages">С. '+safe(x.pagesLabel)+'</div></li>').join("")+'</ol>'+
          '<div class="row wrap"><a class="btn secondary small" href="'+safe(ref.source)+'" target="_blank" rel="noopener noreferrer">Посмотреть источник оглавления ↗</a>'+
          '<a class="btn ghost small" href="'+safe(ref.search)+'" target="_blank" rel="noopener noreferrer">Найти именно это издание ↗</a></div>'+
          '</div>';
      }).join("")+'</section>';
  }
  function textbookPanel(key,subject,title){
    const matches=window.EGE_TEXTBOOKS?.get(key,subject,title)||[];
    const learningFocus=authored(key,subject,title).know;
    if(!matches.length)return '<div class="foxford-missing"><strong>Для темы нет подтверждённой библиографии.</strong>'+
      '<p>Используйте краткий конспект и отметьте необходимость подобрать полноценное издание.</p></div>';
    return '<section class="textbook-section" aria-label="Основное чтение по учебнику">'+
      '<div class="textbook-section-head"><div class="study-kicker">ОСНОВНАЯ ТЕОРИЯ · УЧЕБНИК</div>'+
      '<strong>Углублённое изучение по учебнику</strong>'+
      '<p>Фоксфорд — быстро понять тему. Учебник — прочитать систематическое объяснение и примеры. '+
      'Выберите один основной учебник, не нужно читать оба полностью. Содержание и страницы могут различаться по изданиям.</p></div>'+
      matches.map((book,i)=>{
        const storageKey=key+'::'+book.bookId;
        const personal=state.textbookPlaces?.[storageKey]||'';
        return '<article class="textbook-card"><div class="textbook-role">'+safe(book.role)+'</div>'+
          '<h3 class="textbook-title">'+safe(book.title)+'</h3>'+
          '<div class="textbook-meta">'+safe(book.authors)+' · '+safe(book.grade)+' класс · '+safe(book.level)+
          (book.isbn?' · ISBN '+safe(book.isbn):'')+'</div>'+
          '<div class="textbook-section-hint"><div class="textbook-section-label">Искать в содержании: '+safe(book.section)+'</div>'+
          '<span>Ориентир по теме, а не подтверждённый номер параграфа.</span>'+ 
          '<p class="textbook-focus"><strong>Найти и изучить:</strong> '+safe(learningFocus)+'</p></div>'+
          '<div class="textbook-links">'+
            '<a class="btn secondary small" href="'+safe(book.official)+'" target="_blank" rel="noopener noreferrer">Издатель / электронная версия ↗</a>'+
            '<a class="btn small" href="'+safe(book.yandex)+'" target="_blank" rel="noopener noreferrer">Найти учебник в Яндексе ↗</a>'+
            '<a class="btn ghost small" href="'+safe(book.yandexSection)+'" target="_blank" rel="noopener noreferrer">Найти тему в учебнике ↗</a>'+
          '</div>'+
          '<div class="textbook-place">'+
            '<label for="textbook-place-'+safe(book.bookId)+'">Мой параграф / страницы (именно в моей редакции)</label>'+
            '<input id="textbook-place-'+safe(book.bookId)+'" type="text" data-action="textbook-place" '+
            'data-key="'+safe(key)+'" data-book="'+safe(book.bookId)+'" maxlength="100" '+
            'placeholder="Например: § 7, с. 40–47" value="'+safe(personal)+'" />'+
            '<small>Указывайте после проверки оглавления. Запись хранится только на планшете; не загружается на GitHub.</small>'+
          '</div></article>';
      }).join('')+'</section>';
  }
  function lessonPanel(key,subject,title,task=null,initial="theory"){
    const guide=authored(key,subject,title),info=theoryFor(key,subject,title);
    const showTheory=initial!=="practice",checks=task?(state.steps[task.id]||[]):[];
    let html='<nav class="lesson-tabs" aria-label="Разделы темы" role="tablist">'+
      '<button type="button" role="tab" id="tab-theory" aria-controls="lesson-theory" tabindex="'+(showTheory?"0":"-1")+'" aria-selected="'+showTheory+'" class="lesson-tab'+(showTheory?" selected":"")+'" data-action="lesson-tab" data-tab="theory">1. Теория: Фоксфорд + учебник</button>'+
      '<button type="button" role="tab" id="tab-practice" aria-controls="lesson-practice" tabindex="'+(!showTheory?"0":"-1")+'" aria-selected="'+!showTheory+'" class="lesson-tab'+(!showTheory?" selected":"")+'" data-action="lesson-tab" data-tab="practice">2. Задания и проверка</button></nav>';
    html+='<section id="lesson-theory" class="lesson-section" role="tabpanel" aria-labelledby="tab-theory" tabindex="0"'+(showTheory?"":" hidden")+'>'+
      '<div class="study-chapter"><div class="study-kicker">ЧТО НУЖНО ПОНЯТЬ</div><p>'+safe(guide.know)+'</p></div>';
    html+='<div class="study-chapter"><div class="study-kicker">КРАТКИЙ КОНСПЕКТ · ОФЛАЙН</div>'+
      '<h3>Объяснение</h3><p>'+safe(info.explanation||guide.know)+'</p>'+
      '<div class="worked-example"><strong>Разобранный пример</strong><p>'+safe(info.example||guide.doTask)+'</p></div>'+
      '<h3>Что воспроизвести без подсказки</h3><p>'+safe(guide.doTask)+'</p></div>';
    html+=coveragePanel(key)+studySourcesPanel(key);
    const articles=info.articles||[];
    if(articles.length)html+='<div class="foxford-list"><div class="study-kicker">ФОКСФОРД · КРАТКОЕ ОБЪЯСНЕНИЕ</div>'+
      articles.map(x=>'<div class="foxford-item"><strong>'+safe(x.title)+'</strong>'+
      '<p class="note">'+(window.EGE_COVERAGE?.get(key)?.components.some(part=>part.source?.url===x.url&&part.evidence==="source_excerpt_verified")?
         "Фрагмент текста статьи проверен для отдельного вопроса, но не для всей составной темы.":
         "Статья подобрана по теме. Полное покрытие содержимым ещё не доказано; сверьте вопросы выше.")+'</p>'+
      (sourceCaveat(key,x.url)?'<p class="route-load-warning">'+safe(sourceCaveat(key,x.url))+'</p>':"")+
       '<a class="btn" href="'+safe(x.url)+'" target="_blank" rel="noopener noreferrer">Читать теорию Фоксфорда →</a>'+
      '<button class="btn ghost small" data-action="copy-resource" data-url="'+safe(x.url)+'">Скопировать ссылку</button></div>').join("")+'</div>';
    else html+='<div class="foxford-missing"><strong>Точно соответствующая теме статья Фоксфорда не подтверждена.</strong>'+
      '<p>Не подменяем теорию кодификатором или неподходящей статьёй. Используйте конспект ниже.</p></div>';
    html+='<details class="extra-materials"'+(articles.length?'':' open')+'><summary>Учебники · точные параграфы и дополнительные материалы</summary>'+
      verifiedReadingPanel(key)+textbookPanel(key,subject,title)+'</details>';

    if(task?.phase==="integrated"){
      html+='<div class="step-list"><label class="step-line"><input type="checkbox" data-action="toggle-step" data-step="0"'+(checks[0]?" checked":"")+'><span>Теория изучена: могу объяснить основные понятия без подсказки</span></label></div>';
    }
    html+='<button type="button" class="btn" data-action="lesson-tab" data-tab="practice">Перейти к заданиям →</button></section>';
    html+='<section id="lesson-practice" class="lesson-section" role="tabpanel" aria-labelledby="tab-practice" tabindex="0"'+(showTheory?" hidden":"")+'>'+
      examMeta(key)+'<div class="study-chapter"><div class="study-kicker">КОНКРЕТНОЕ УЧЕБНОЕ ДЕЙСТВИЕ</div>'+
      '<h3>Что выполнить</h3><p>'+safe(guide.doTask)+'</p>'+
      '<p class="criterion"><strong>Критерий освоения:</strong> '+safe(guide.check)+'</p></div>'+
      '<div id="dialog-resources">'+resourceCards(subject,0,title,key)+'</div>'+resourceForm(key);
    if(task){
      const steps=[
        "Прочитать теорию: "+guide.know,
        "Выполнить упражнения: "+guide.doTask,
        "Проверить: "+guide.check
      ];
      const last=state.results[task.id],score=last?last.correct+"/"+last.total:"";
      html+='<h3>Контрольные действия</h3><div class="step-list">'+steps.map((v,i)=>
        (task.phase==="integrated"&&i===0?"":'<label class="step-line"><input type="checkbox" data-action="toggle-step" data-step="'+i+'"'+(checks[i]?" checked":"")+'><span>'+safe(v)+'</span></label>')).join("")+'</div>'+
      '<div class="result-box"><div class="field"><label for="task-score">Верных заданий / всего</label>'+
      '<input id="task-score" inputmode="text" placeholder="Например, 6/8" value="'+safe(score)+'"></div>'+
      '<button class="btn secondary small" data-action="save-score">Записать результат</button>'+
      '<span class="note">Для освоения: не менее 80% самостоятельно. При ошибках повторите соответствующий шаг.</span></div>';
    }
    html+='</section>';
    return html;
  }
  function quickCapture(t){return state.results[t.id]?'<span class="chip status-good">'+safe(U.scoreText(state.results[t.id]))+'</span>':"";}
  function stepsFor(t){return [1,2,3];}
  function schoolInfo(day){
    const saturday=L.parseDate(day)?.getDay()===6;
    // Saturday has no assumed school timetable, but any explicitly saved overrides prevail.
    return {...window.EGE_WELLBEING.DEFAULTS,...(saturday?{schoolEnd:"09:00",homework:0,commute:0,recovery:30}:{}),...(state.school[day]||{})};
  }
  function saturdayActivity(day){
    const value=state.curriculumAssignments?.[day];
    const tasks=Array.isArray(value)?value:[];
    return tasks.some(t=>t&&(state.completed[t.id]||state.results[t.id]||state.notes[t.id]||
      (Array.isArray(state.steps[t.id])&&state.steps[t.id].some(Boolean))||Number(state.timeSpent[t.id])>0||
      state.studyTimer?.taskId===t.id));
  }
  function canStudyToday(){return L.canStudyToday(state,L.today());}
  function liveInfo(day){const i=schoolInfo(day);return day===L.today()?{...i,nowMinute:new Date().getHours()*60+new Date().getMinutes()}:i;}
  function modeFor(day){return L.suggestDay(liveInfo(day));}
  function externalLinks(resources){
    return '<div class="link-list">'+resources.map(x=>'<a rel="noreferrer" href="'+safe(x.url)+'" title="'+safe(x.type||"Материал")+'">'+safe(x.title)+' ↗</a>').join("")+'</div>';
  }
  function schoolPanel(day,mode){
    const i=schoolInfo(day),p=window.EGE_WELLBEING.computeDay(liveInfo(day));
    const select=(id,value,choices)=>'<select id="'+id+'">'+choices.map(([v,t])=>
      '<option value="'+v+'"'+(String(v)===String(value)?" selected":"")+'>'+t+'</option>').join("")+'</select>';
    const field=(id,label,content)=>'<div class="field"><label for="'+id+'">'+label+'</label>'+content+'</div>';
    const timeField=(id,label,value)=>field(id,label,'<input id="'+id+'" type="time" value="'+safe(value)+'">');
    return '<details class="school-accordion card"'+(schoolExpanded||(mode==="off"&&p.warnings.length)?' open':'')+'><summary class="school-summary">'+
      '<div><strong>Школа · ДЗ · сон · режим</strong><small>Заполняйте по факту, план рассчитывается автоматически</small></div>'+
      '<span class="chip">'+p.studyMinutes+' мин ЕГЭ</span></summary>'+
      '<div class="school-inner"><p class="note"><strong>Защищённый сон:</strong> '+p.targetSleepHours+' ч (ориентир AASM 8–10 ч для 13–18 лет); отход ко сну '+p.bedTime+
      ', без экранов с '+p.screensOff+'. Время учёбы не может уменьшать это окно.</p>'+
      '<div class="school-fields">'+
       field("school-homework","Школьное ДЗ",select("school-homework",i.homework,[[0,"0 минут"],[30,"30 минут"],[60,"60 минут"],[90,"90 минут"],[120,"120 минут"],[150,"150 минут"],[180,"180 минут"],[210,"210 минут"],[240,"240 минут"],[300,"300 минут"]]))+
       field("school-sleep","Сон прошлой ночью",select("school-sleep",i.sleep,[[5,"Меньше 6 ч"],[6,"6 ч"],[6.5,"6,5 ч"],[7,"7 ч"],[7.5,"7,5 ч"],[8,"8 ч"],[8.5,"8,5 ч"],[9,"9 ч"],[10,"10 ч"]]))+
       field("school-energy","Самочувствие",select("school-energy",i.energy,[["good","Бодро"],["ok","Нормально"],["low","Очень устала"]]))+
       timeField("school-end","Конец занятий в школе",i.schoolEnd)+
       timeField("school-wake","Подъём утром",i.wakeTime)+
       field("school-sleep-target","План сна",select("school-sleep-target",i.sleepTarget,[[8,"8 ч"],[8.5,"8,5 ч"],[9,"9 ч"],[9.5,"9,5 ч"],[10,"10 ч"]]))+
       field("school-commute","Дорога после школы",select("school-commute",i.commute,[[0,"0 минут"],[15,"15 минут"],[30,"30 минут"],[45,"45 минут"],[60,"60 минут"],[90,"90 минут"]]))+
       field("school-activity","Движение вне школы",select("school-activity",i.activityReserve,[[0,"Учтено в школьном дне"],[15,"15 минут"],[30,"30 минут"],[45,"45 минут"],[60,"60 минут"]]))+
       field("school-recovery","Восстановление после школы",select("school-recovery",i.recovery,[[15,"15 минут"],[30,"30 минут"],[45,"45 минут"],[60,"60 минут"],[90,"90 минут"]]))+
       field("school-meal","Приём пищи",select("school-meal",i.meal,[[15,"15 минут"],[30,"30 минут"],[45,"45 минут"],[60,"60 минут"]]))+'</div>'+
      '<div class="school-timeline">'+p.timeline.map(x=>'<span><strong>'+safe(x.at)+'</strong> · '+safe(x.label)+(x.minutes&&x.label!=="ЕГЭ с перерывами"?" · "+x.minutes+" мин":"")+'</span>').join("")+'</div>'+
      '<p class="note"><strong>Фактический бюджет:</strong> '+p.availableMinutes+' мин до отключения экранов, из них '+p.studyMinutes+' мин занятий и '+p.breakMinutes+' мин перерывов. К школьному ДЗ добавлено '+p.homeworkBreakMinutes+' мин коротких перерывов.</p>'+
      (p.warnings.length?'<div class="safety-notice" role="status">'+p.warnings.map(x=>'<p>'+safe(x)+'</p>').join("")+'</div>':"")+
      (p.notes.length?'<p class="note">'+safe(p.notes.join(" "))+'</p>':"")+
      '<p class="note">Медицинские основания: AASM (сон 8–10 ч), WHO (в среднем 60 мин активного движения за день по неделе), CDC (убрать экраны за 30 мин до сна). Пороги ДЗ и режимы 160/90/35/0 — консервативные правила планировщика, не медицинские нормы.</p></div></details>';
  }
  function taskCard(t,index,showBreak=true){
    const subjData=subj(t.subject),done=!!state.completed[t.id],skipped=!!state.skipped[t.id],checked=(state.steps[t.id]||[]).filter(Boolean).length;
    const blockedPractice=t.phase==="practice"&&!C.topicStatus(state,t.topicKey).theory;
    const labels={new:"Сначала теория",practice:"Практика после теории",integrated:"Теория → задачи",mixed:"Второй предмет",review:"Короткое повторение"};
    const originNote=t.isBacklog?'<span class="debt-origin">Не завершено '+safe(dformat(t.originDate))+'</span>':"";
    const rest=showBreak&&index===1?'<div class="break">Перерыв · 15 минут</div>':
      showBreak&&index===2?'<div class="break">Ужин и восстановление · 35 минут</div>':"";
    return rest+'<article class="task '+(done?"done":skipped?"skipped":"")+'" style="--subject:'+subjData.color+'">'+
      '<div class="task-icon">'+safe(subjData.icon)+'</div><div class="task-copy"><div class="row wrap">'+badge(t.subject)+
      '<span class="chip">'+labels[t.kind]+'</span>'+originNote+quickCapture(t)+'</div>'+
      '<h3>'+safe(t.title)+'</h3><p class="task-goal"><strong>Задание:</strong> '+safe(authored(t.topicKey,t.subject,t.title).doTask)+'</p>'+pagePreview(t.topicKey)+'<div class="meta">'+t.minutes+' мин'+(checked?" · "+checked+"/"+stepsFor(t).length+" шагов":"")+(state.notes[t.id]?" · Есть заметка":"")+
      (skipped?" · Пропущено без переноса":"")+'</div></div>'+
      '<div class="task-actions"><button class="btn small '+(done?"secondary":"")+'" data-action="detail" data-id="'+safe(t.id)+'"'+(blockedPractice?' disabled title="Сначала завершите теорию"':"")+'>'+(done?"Посмотреть":blockedPractice?"Сначала теория":"Начать →")+'</button>'+
      '<button class="check-button" data-action="toggle-task" data-id="'+safe(t.id)+'"'+(blockedPractice?' disabled':"")+' aria-label="'+(done?"Отменить выполнение":"Отметить выполненным")+'">'+(done?"✓":"")+'</button>'+
      '<details class="task-more"><summary aria-label="Дополнительные действия">Ещё</summary><div class="task-more-actions">'+
      '<button class="btn ghost small" data-action="show-materials" data-id="'+safe(t.id)+'"'+(blockedPractice?' disabled':"")+'>Открыть задания</button>'+
      (!done?'<button class="btn ghost small" data-action="skip-task" data-id="'+safe(t.id)+'">'+(skipped?"Вернуть занятие":"Пропустить занятие")+'</button>':"")+
      '</div></details></div></article>';
  }
  function ensureAssignments(day){
    if(day!==L.today()||!L.canStudyToday(state,day)||L.weekNumber(day,state.startDate)<0)return;
    if(!Array.isArray(state.curriculumAssignments?.[day])){
      C.assign(state,day,state.startDate,L.planDay);
      save();
    }
  }
  function currentAgenda(day,mode){
    return C.agenda(state,day,mode,L.today(),L.planDay,L.studyAgenda);
  }
  function renderSaturday(){
    const session=L.saturdaySession(state,date),isToday=date===L.today();
    let html=head("Ежедневный план · добровольная суббота","Суббота, "+dformat(date),
      "Суббота свободна по умолчанию. Можно учиться по желанию — без обязательной нормы, штрафов и переноса долгов.",viewDateNav());
    if(!session){
      if(!isToday)return html+'<section class="card padding saturday-rest"><h2>Суббота — день отдыха</h2><p>Занятия не назначались. Включить дополнительную сессию можно в саму субботу.</p></section>';
      if(L.weekNumber(date,state.startDate)<0)return html+'<section class="card padding saturday-rest"><h2>Программа ещё не началась</h2><p>Начните основной маршрут с даты старта программы.</p></section>';
      const pinned=state.curriculumAssignments?.[date]?.[0],hasActivity=saturdayActivity(date);
      return html+'<section class="saturday-welcome card" aria-label="Добровольная учёба в субботу">'+
       '<div class="saturday-welcome-head"><span class="study-kicker">ВЫ РЕШАЕТЕ</span>'+
       '<h2>Отдохнуть или немного позаниматься?</h2>'+
       '<p>Обычное расписание остаётся с понедельника по пятницу. Дополнительное занятие не создаёт обязательств на будущие субботы и не увеличивает учебный долг.</p></div>'+
       '<div class="saturday-options">'+
       '<div class="saturday-option"><div><strong>Повторить изученное</strong><p>Разобрать ошибки и ответить по памяти на отложенные вопросы. Можно остановиться в любой момент.</p></div>'+
       '<button class="btn secondary" data-action="saturday-enable" data-kind="review">Выбрать повторение →</button></div>'+
       D.subjectOrder.map(s=>{
        const next=C.nextSubject(state,s);
        const fixed=pinned?.subject===s?C.records[pinned.topicKey]:next;
        const locked=hasActivity&&pinned?.subject!==s;
        return '<div class="saturday-option"><div>'+badge(s)+'<strong>Одно занятие по предмету</strong>'+
         '<p>'+(fixed?safe(fixed.title):"Все доступные темы уже освоены или требуют завершения основ.")+'</p></div>'+
         '<button class="btn secondary" data-action="saturday-enable" data-kind="lesson" data-subject="'+s+'"'+
         (!fixed||locked?' disabled':'')+'>Начать →</button></div>';
       }).join("")+'</div>'+
       '<p class="note">Воскресенье остаётся выходным. Повторные проверки новых тем будут назначены на ближайшие учебные дни.</p></section>';
    }
    const label=session.kind==="review"?"Повторение без нового материала":"Дополнительное занятие · "+subj(session.subject).name;
    html+='<section class="saturday-active card padding"><div class="row between wrap"><div><div class="study-kicker">ДОБРОВОЛЬНОЕ ЗАНЯТИЕ</div>'+
      '<h2>'+safe(label)+'</h2></div>'+
      (isToday?'<button class="btn ghost small" data-action="saturday-disable">Закончить сегодня</button>':"")+
      '</div><p class="note">Нет ежедневной серии, штрафа или обязанности повторять это в следующие субботы. Если устали — можно закончить.</p></section>';
    if(session.kind==="review"){
      const due=L.dueItems(state.reviews,L.today()),errors=state.errors.filter(x=>!x.done).length;
      html+='<section class="card padding saturday-review"><h2>Выберите один небольшой шаг</h2>'+
        '<p>Вопросов для повторения: <strong>'+due.length+'</strong>. Ошибок для разбора: <strong>'+errors+'</strong>.</p>'+
        '<div class="row wrap"><button class="btn" data-view="reviews">Открыть повторения →</button>'+
        '<button class="btn secondary" data-view="subjects">Выбрать изученную тему</button></div>'+
        '<p class="note">При отсутствии назначенных проверок можно просто перечитать заметки или выполнить несколько задач; новых обязательных сроков не будет.</p></section>';
      return html;
    }
    if(isToday)ensureAssignments(date);
    const mode=modeFor(date),blocks=currentAgenda(date,mode),done=blocks.filter(x=>state.completed[x.id]).length;
    if(mode==="off")html+='<div class="safety-notice"><p>По текущему сну, самочувствию или доступному времени новое занятие сегодня не рекомендуется. Можно выбрать отдых или короткое повторение.</p></div>';
    html+='<section class="card padding saturday-work"><div class="row between wrap"><h2>Одна тема — без перегрузки</h2>'+
      '<span class="chip">'+(blocks[0]?.minutes||0)+' минут</span></div>'+
      (blocks.length?'<p class="note">'+done+' из '+blocks.length+' завершено. Для зачёта требуется проверенная самостоятельная практика.</p>'+
        '<div class="schedule">'+blocks.map((task,i)=>taskCard(task,i,false)).join("")+'</div>':
       '<p class="note">Нет доступных новых заданий по выбранному предмету либо выбран отдых по состоянию. Можно перейти к повторениям.</p>')+
      '<div class="row wrap"><button class="btn secondary" data-view="reviews">Открыть повторения</button>'+
      '<button class="btn ghost" data-view="week">План следующей недели</button></div></section>';
    if(isToday)html+=schoolPanel(date,mode);
    return html;
  }
  function renderToday(){
    if(L.parseDate(date)?.getDay()===6)return renderSaturday();
    ensureAssignments(date);
    const week=L.weekNumber(date,state.startDate),mode=modeFor(date),blocks=currentAgenda(date,mode),debt=C.debtSummary(state,date),isActualToday=date===L.today();
    const isRest=!L.isStudyDay(date);
    const shown=blocks;
    const done=shown.filter(x=>state.completed[x.id]).length,skipped=shown.filter(x=>state.skipped[x.id]).length,next=shown.find(x=>!state.completed[x.id]&&!state.skipped[x.id]);
    const due=L.dueItems(state.reviews,L.today());
    let html=head("Ежедневный план",nameDay(date).replace(/^./,c=>c.toUpperCase())+", "+dformat(date),
      (week>=26?"После основного курса · ":(week>=0?"Неделя "+(week+1)+" из 26 · ":""))+(isRest?"День без занятий":"Нагрузка регулируется по ДЗ, сну, самочувствию и времени"),viewDateNav());
    if(isRest)return html+'<div class="empty"><strong>Воскресенье — день отдыха</strong>Обязательные занятия и повторения не назначаются. По субботам доступна добровольная учебная сессия.</div>';
    if(week<0)return html+'<div class="empty"><strong>Программа ещё не началась</strong>Начало: '+dformat(state.startDate)+'. Дату можно изменить в настройках.</div>';
    if(week>=26&&!debt.total)html+='<div class="callout" style="margin-bottom:14px"><strong>Основная программа выполнена.</strong> Теперь смешанная практика, пробники и повторение.</div>';
    if(isActualToday&&debt.overdue)html+='<section class="backlog card padding"><div><strong>Темы, требующие завершения: '+debt.overdue+'</strong><p class="note">Это количество тем из ориентировочно пройденной части программы, а не число занятий на сегодня. Следующие темы открываются только после освоения необходимых основ.</p></div><button class="btn secondary small" data-action="show-backlog">Порядок и зависимости →</button></section>';
    if(isActualToday&&!debt.overdue&&!debt.total&&week<26)html+='<div class="callout">Обязательные занятия до сегодняшней даты завершены. Отличная возможность заняться повторением и отдыхом.</div>';
    const progressPercent=shown.length?Math.round(done/shown.length*100):0;
    html+='<section class="focus-board card" aria-label="Главное на сегодня">'+
      '<div class="focus-main"><div class="focus-eyebrow"><span class="focus-pulse" aria-hidden="true"></span>'+
      (next?"Следующее занятие":"Сегодня")+' · '+(done+1>shown.length?shown.length:done+1)+' из '+shown.length+'</div>'+
      (next?'<h2>'+safe(next.title)+'</h2><p class="focus-goal">'+safe(U.taskGoal(next))+'</p>'+
        '<div class="focus-meta">'+badge(next.subject)+'<span class="chip">'+next.minutes+' минут</span>'+
          '<span class="chip">Теория → самостоятельная практика → проверка</span></div>':
        '<h2>'+(mode==="off"?"Время отдохнуть":"Основная работа завершена")+'</h2>'+
        '<p class="focus-goal">Не нужно добавлять занятия ради заполнения календаря. Повторите материал в следующий учебный день.</p>')+
      '<div class="focus-actions">'+(next?'<button class="btn focus-primary" data-action="detail" data-id="'+safe(next.id)+'">Открыть занятие <span aria-hidden="true">→</span></button>':"")+
      (due.length&&isActualToday?'<button class="btn secondary" data-view="reviews">Повторить по памяти · '+due.length+'</button>':"")+
      '<button class="btn ghost" data-view="week">План недели</button></div></div>'+
      '<aside class="focus-progress" aria-label="Прогресс дня">'+
        '<span class="focus-progress-label">Выполнено сегодня</span><strong>'+done+' <small>/ '+shown.length+'</small></strong>'+
        '<div class="bar focus-progress-bar" role="progressbar" aria-label="Выполненные занятия" aria-valuemin="0" aria-valuemax="'+shown.length+'" aria-valuenow="'+done+'"><span style="width:'+progressPercent+'%"></span></div>'+
        '<div class="focus-progress-meta">'+(shown.length-done)+' осталось · '+totalTime(shown)+' мин в плане</div>'+
        '<p>Спокойный темп важнее дополнительных галочек.</p></aside></section>';
    if(isActualToday)html+=breakPanel();
    html+=schoolPanel(date,mode);
    html+='<div class="daily-facts" aria-label="Краткая сводка"><span><strong>'+Math.floor(totalTime(shown)/60)+' ч '+String(totalTime(shown)%60).padStart(2,"0")+'</strong> планового времени</span>'+
      '<span><strong>'+due.length+'</strong> повторений к проверке</span>'+
      '<span><strong>'+skipped+'</strong> пропущено без зачёта</span></div>';
    html+='<div class="grid-2"><div class="stack"><div class="row between wrap"><h2 style="margin:0">План ЕГЭ</h2>'+
      '<details class="day-mode"><summary>Нагрузка · '+({normal:"160 мин",light:"90 мин",short:"35 мин",off:"отдых"}[mode]||"автоматически")+'</summary>'+
      '<div class="day-mode-options" role="group" aria-label="Выбор учебной нагрузки">'+
      [['normal','160 мин'],['light','90 мин'],['short','35 мин'],['off','Отдых'],['auto','Авто']].map(([value,label])=>
        '<button class="btn '+(schoolInfo(date).manualMode===value?'':'secondary')+' small" data-action="set-mode" data-mode="'+value+'" aria-pressed="'+(schoolInfo(date).manualMode===value)+'">'+label+'</button>').join("")+
      '</div></details></div>';
    html+='<div class="schedule">'+(shown.length?shown.map((t,i)=>taskCard(t,i,mode==="normal")).join(""):'<div class="empty"><strong>Сегодня без ЕГЭ</strong>Отдых и школьные задания имеют приоритет. Пропущенное не нужно переносить на выходные.</div>')+'</div>';
    html+='<div class="card padding day-reflection"><label for="day-note"><strong>Итог дня</strong> <span class="note">· Одно предложение — по желанию</span></label><textarea id="day-note" maxlength="1200" placeholder="Что получилось? Что стоит повторить?">'+safe(state.dayNotes[date]||"")+'</textarea><span class="note">Сохранение при вводе. Необязательно.</span></div>'+
    '<p class="note">Незавершённое не исчезает. Порядок задаётся графом необходимых знаний, практика открывается после теории; дневная норма и выходные сохраняются.</p></div>';
    html+='<div class="stack">';
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
    const all=C.queue(state);
    let html=head("Учебный маршрут","Последовательность без пропусков",
      "Зависимости проверяются для всех 234 тем. Сначала необходимые знания, затем практика.");
    html+='<div class="card padding"><h2>'+all.length+' тем ещё не подтверждены</h2>'+
      '<p class="note">Готова — можно начать. Ожидает — сначала завершите указанные основы. Не нужно выполнять всю очередь за день.</p>'+
      '<div class="row wrap"><button class="btn" data-view="today">← Сегодня</button>'+
      '<button class="btn secondary" data-action="export">Скачать резервную копию</button></div></div>';
    if(!all.length)return html+'<div class="empty"><strong>Теоретические темы и практика завершены.</strong></div>';
    html+='<div class="backlog-list">'+all.slice(0,100).map((item,i)=>{
      const prereq=item.missing.slice(0,3).map(key=>C.records[key]?.title||key).join("; ");
      const phase=item.theory?"Теория пройдена · практика в очереди":"Теория → самостоятельная практика";
      return '<article class="backlog-row card"><span class="backlog-index">'+(i+1)+'</span>'+
        '<div class="backlog-description">'+badge(item.subject)+'<strong>'+safe(item.title)+'</strong>'+
        '<small>'+safe(phase)+' · '+(item.ready?"Можно изучать":"Ожидает базу")+'</small>'+
        (item.missing.length?'<p class="note"><strong>Сначала:</strong> '+safe(prereq)+'</p>':"")+'</div>'+
        '<button class="btn secondary small" data-action="open-topic" data-key="'+safe(item.id)+'">Тема →</button></article>';
    }).join("")+'</div>';
    if(all.length>100)html+='<p class="note">Показаны первые 100 из '+all.length+' тем.</p>';
    return html;
  }
  function renderWeek(){
    const mon=L.move(L.parseDate(state.startDate),focusWeek*7);
    const sat=L.move(mon,5),sun=L.move(mon,6);
    let html=head("Календарный ориентир","Неделя "+(focusWeek+1),dformat(L.iso(mon))+" — "+dformat(L.iso(sun))+". Темы ниже идут в учебном порядке зависимостей; прошлые фактически начатые занятия сохраняются как архив.",weekNav());
    html+='<div class="week-days">'+[0,1,2,3,4].map(i=>{
      const day=L.iso(L.move(mon,i));
      const saved=state.curriculumAssignments?.[day];
      const modern=Array.isArray(saved);
      const originalIds=state.assignments?.[day]||[];
      const history=Array.isArray(originalIds)&&originalIds.some(id=>state.completed[id]||
        state.notes[id]||Number(state.timeSpent[id])>0)||
        Object.keys(state.completed).some(id=>id.startsWith(day+":")&&state.completed[id]);
      const archivedLegacy=day<L.today()&&!modern&&history;
      const blocks=day===L.today()?currentAgenda(day,modeFor(day)):
        modern?saved:archivedLegacy?L.planDay(day,state.startDate,state.reviews,modeFor(day)):[];
      const d=blocks.filter(x=>state.completed[x.id]).length;
      const remaining=blocks.filter(x=>x.kind!=="review"&&!state.completed[x.id]).length;
      return '<button class="week-day'+(day===date?" active":"")+'" data-action="pick-day" data-date="'+day+'">'+
        '<span class="day-num">'+D.dayNames[i]+' · '+dformat(day)+'</span><strong>'+
        (blocks.length?d+'/'+blocks.length+' блока':'По готовности')+'</strong>'+
        (day<L.today()&&remaining?'<span class="debt-origin">Осталось: '+remaining+'</span>':"")+
        (blocks.length?blocks.filter(x=>x.kind!=="review").map(x=>'<div class="week-topic">'+
          badge(x.subject)+safe(x.title)+'</div>').join(""):
          '<div class="week-topic">Состав дня определится после проверки предыдущих тем</div>')+
        '</button>';
    }).join("")+'</div>';
    html+=window.EGE_WEEK_UI.renderWeek(state,C,focusWeek,{safe,badge,authored,pagePreview,subj});
    return html;
  }
  function links(key,week,title){return externalLinks(R.forTopic(key,week??focusWeek,title||subj(key).weeks[week??focusWeek][0]));}
  function topicCard(topic){
    const [label,statusClass]=reviewStatus(topic.key),star=state.pinned[topic.key]?"★ ":"";
    const guide=authored(topic.key,topic.subject,topic.title),count=directExercises(topic.key).length;
    const foxford=(theoryFor(topic.key,topic.subject,topic.title).articles||[]).length;
    return '<article class="topic topic-compact lesson-topic"><small>'+badge(topic.subject)+' <span>· Учебная неделя '+(C.placement[topic.key]?.week||topic.week+1)+'</span></small>'+
      '<div class="topic-title">'+star+safe(topic.title)+'</div>'+
      '<p class="note"><strong>Научиться:</strong> '+safe(guide.doTask)+'</p>'+
      '<p class="note"><strong>Критерий:</strong> '+safe(guide.check)+'</p>'+pagePreview(topic.key)+
      '<span class="note '+statusClass+'">'+safe(label)+'</span>'+
      '<span class="note">'+(foxford?"Есть статья Фоксфорда":"Есть офлайн-конспект")+' · '+count+' подборки задач</span>'+
      '<button class="btn secondary small" data-action="open-topic" data-key="'+safe(topic.key)+'">Теория и задания →</button></article>';
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
    html+='<div class="card padding topic-search-card" role="search" aria-label="Поиск учебных тем"><label for="topic-search"><strong>Название темы</strong></label>'+
      '<div class="topic-search-row"><input id="topic-search" type="search" autocomplete="off" placeholder="Например: митоз, растворы, уравнения..." value="'+safe(searchQuery)+'">'+
      '<select id="search-subject" aria-label="Фильтр по предмету">'+[['all','Все предметы'],...D.subjectOrder.map(k=>[k,subj(k).name])].map(([k,title])=>'<option value="'+k+'"'+(searchSubject===k?' selected':'')+'>'+safe(title)+'</option>').join("")+'</select></div>'+
      '<div class="search-suggestions" aria-label="Быстрые запросы">'+
      ['Генетика','ОВР','Логарифмы','Клетка'].map(q=>'<button type="button" class="search-suggestion" data-action="search-suggestion" data-query="'+safe(q)+'">'+safe(q)+'</button>').join("")+
      (searchQuery?'<button type="button" class="search-suggestion clear-search" data-action="clear-search">Очистить поиск ×</button>':"")+'</div>'+
      '<div class="row wrap" style="margin-top:10px"><button class="btn '+(searchPinned?"":"secondary")+' small" data-action="toggle-pins">☆ Мои закладки ('+Object.keys(state.pinned).filter(k=>state.pinned[k]).length+')</button><span class="note">Введите название или выберите закладки</span></div></div>'+
      '<div id="topic-results">'+topicSearchResults()+'</div>'+
      '<section id="topic-current-week"'+(searchQuery.trim()||searchPinned?' hidden':'')+'>'+
      '<div class="row wrap" style="margin:20px 0">'+D.subjectOrder.map(k=>'<button class="btn '+(focusSubject===k?'':'secondary')+'" data-action="subject" data-subject="'+k+'">'+safe(subj(k).name)+'</button>').join("")+'</div>'+
      '<div class="card padding"><div class="row between wrap"><div>'+badge(focusSubject)+'<h2 style="margin-top:12px">Неделя '+(week+1)+'</h2></div><span class="chip">Цель '+safe(s.target)+' баллов</span></div>'+
      '<div class="subject-topics">'+C.projectedWeek(focusSubject,week).map(topic=>topicCard({subject:focusSubject,week,index:topic.index,title:topic.title,key:topic.id})).join("")+'</div>'+
      '<hr class="divider"><h3>Что закреплять каждую неделю</h3><ul class="simple-list">'+R.weeklyEssentials(focusSubject,week).map(x=>'<li>'+safe(x)+'</li>').join("")+'</ul></div>';
    if(focusSubject==="chem")html+='<p class="note" style="margin-top:12px">После четвёртой недели темы химии основаны на доступном макроплане (приложена часть 1 из 10).</p>';
    return html+'</section>';
  }
  function renderReviews(){
    const due=L.dueItems(state.reviews,L.today()),restDay=!canStudyToday(),upcoming=Object.entries(state.reviews).filter(([,v])=>v&&v.due>L.today()).sort((a,b)=>a[1].due.localeCompare(b[1].due)).slice(0,6);
    const errors=state.errors.filter(x=>!x.done);
    let html=head("Закрепление","Повторения и ошибки","Ответьте без подсказки, затем оцените реальный результат. В выходные ничего не назначается.");
    html+='<div class="grid-2"><section class="stack"><div class="row between"><h2>Пора повторить</h2><span class="chip">'+due.length+' тем</span></div>';
    html+=due.length&&!restDay?due.slice(0,showAllReviews?due.length:6).map(r=>{
      const question=authored(r.key,r.subject,r.title).check;
      return '<article class="review-item review-recall">'+badge(r.subject)+'<div class="review-item-main">'+
        '<h3>'+safe(r.title)+'</h3><p class="meta">Назначено: '+dformat(r.due)+
        ' · Успешных проверок: '+(r.successes||0)+'</p>'+
        '<details class="recall-check"><summary>Проверить себя без подсказки</summary>'+
        '<div class="recall-body"><span class="study-kicker">ВОСПРОИЗВЕДЕНИЕ ПО ПАМЯТИ</span>'+
        '<p>'+safe(question)+'</p><p class="note">Сначала ответьте самостоятельно или запишите решение. Затем оцените результат. «Уверенно» — только если ответ получился без подсказки.</p>'+
        '<div class="review-actions"><button class="btn danger" data-action="rate" data-key="'+safe(r.key)+'" data-rate="hard">Не получилось</button>'+
        '<button class="btn secondary" data-action="rate" data-key="'+safe(r.key)+'" data-rate="medium">С подсказкой</button>'+
        '<button class="btn" data-action="rate" data-key="'+safe(r.key)+'" data-rate="easy">Самостоятельно</button></div></div></details>'+
        '<button class="btn ghost small recall-materials" data-action="open-topic" data-key="'+safe(r.key)+'">Открыть объяснение и материалы ↗</button>'+
        '</div></article>';
    }).join(""):(restDay?'<div class="empty"><strong>Сегодня день отдыха</strong>Если хотите повторять материал в субботу, сначала включите добровольную сессию в разделе «Сегодня». Воскресенье остаётся выходным.</div>':'<div class="empty"><strong>Очередь пока пуста</strong>После изучения темы появится контроль на следующий учебный день.</div>');
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
    const weeks=Math.min(26,Math.max(0,L.weekNumber(L.today(),state.startDate)+1));
    let html=head("Обратная связь","Прогресс обучения","Отмеченная теория, самостоятельная практика и повторение считаются отдельно.");
    html+=window.EGE_WEEK_UI.renderProgress(state,C,L.today(),{safe,badge,subj});
    html+='<section class="calendar-context"><div><strong>Календарный ориентир: '+weeks+' из 26 недель</strong>'+
      '<p>Прошедшая неделя не означает освоенную тему. Смотрите показатели подготовки выше.</p></div>'+
      '<button class="btn secondary small" data-view="week">Открыть неделю →</button></section>';
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
      '<p class="android-device-note">Сайт в Chrome и установленная PWA — одна программа. Обновления проверяются при запуске, восстановлении сети и возвращении к приложению. Когда новая версия готова, страница обновляется без удаления прогресса. Без интернета работает последняя сохранённая версия.</p>'+
      '<div class="android-status-row"><span class="android-offline-indicator" id="android-connection">Проверка сети</span><span class="chip" id="android-offline-status">Проверка офлайн-режима…</span></div>'+
      '<p class="note" id="android-install-hint">Для установки нужен HTTPS-адрес.</p>'+
      '<div class="row wrap"><button class="btn" type="button" id="android-install-btn" data-android="install">Как установить</button>'+
      '<button class="btn secondary" type="button" data-android="check-update">Проверить обновления</button>'+
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
    document.querySelectorAll("[data-view]").forEach(b=>{const active=b.dataset.view===view;b.classList.toggle("active",active);if(active)b.setAttribute?.("aria-current","page");else b.removeAttribute?.("aria-current");});
    $("#app").innerHTML=({today:renderToday,week:renderWeek,subjects:renderSubjects,reviews:renderReviews,progress:renderProgress,settings:renderSettings,backlog:renderBacklog}[view]||renderToday)();
    renderSession();
    window.EGE_ANDROID?.updateUI?.();
  }
  function lookup(id){
    const d=id.split(":")[0];
    const assigned=state.curriculumAssignments?.[d];
    const matched=Array.isArray(assigned)?assigned.find(x=>x.id===id):null;
    if(matched)return matched;
    return L.planDay(d,state.startDate,state.reviews,"normal").find(x=>x.id===id)||
      L.planDay(d,state.startDate,state.reviews,"light").find(x=>x.id===id);
  }
  function completeTask(id){
    const b=lookup(id);if(!b)return;
    const modern=!!b.phase;
    if(!state.completed[id]&&modern){
      if(!C.readyForCompletion(state,b)){
        const missing=C.unmet(state,b.topicKey).map(key=>C.records[key]?.title).filter(Boolean).slice(0,2);
        notice(missing.length?"Сначала изучите необходимые темы: "+missing.join("; "):
          "Сначала завершите теорию этой темы, затем переходите к практике.");
        return;
      }
      if(b.phase==="integrated"){
        const steps=state.steps?.[id]||[];
        if(![0,1,2].every(index=>steps[index]===true)){
          notice("Для завершения темы отметьте изучение теории, самостоятельные задания и проверку решения.");
          return;
        }
      }
      if(b.phase==="practice"||b.phase==="integrated"){
        const score=state.results[id];
        if(!score||score.total<3||score.correct/score.total<.8){
          notice("Для завершения практики решите минимум 3 задания и запишите результат от 80%.");
          return;
        }
      }
    }
    if(state.completed[id]){
      delete state.completed[id];
      if(modern)C.markCompletion(state,b,false);
    }else{
      const todayBlock=currentAgenda(L.today(),modeFor(L.today())).find(x=>x.id===id);
      if(state.studyTimer?.taskId===id){
        pauseStudyTimer();state.studyTimer=null;
      }
      state.completed[id]=b.subject;delete state.skipped[id];
      if(modern)C.markCompletion(state,b,true);
      if(!modern||b.phase!=="theory")L.beginReview(state,b,L.today());
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
      return Math.max(0,Number(t.elapsedSeconds)||0)+(started?Math.max(0,Math.floor((Math.min(Date.now(),Number(t.hardStopAt)||Infinity)-started)/1000)):0);
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
    const budget=window.EGE_WELLBEING.computeDay(liveInfo(L.today()));
    if(budget.mode==="off"){
      notice("Занятие не помещается до подготовки ко сну. Выберите отдых или перенесите его на следующий учебный день.");
      return false;
    }
    const midnight=new Date();midnight.setHours(0,0,0,0);
    const hardStopAt=midnight.getTime()+budget.screensOffMinute*60000;
    if(Date.now()>=hardStopAt){notice("Поздно для нового занятия: защищаем время сна.");return false;}
    if(!state.studyTimer||state.studyTimer.taskId!==task.id){
      state.studyTimer={taskId:task.id,elapsedSeconds:Math.max(0,Number(state.timeSpent[task.id])||0),
        startedAt:null,targetSeconds:task.minutes*60,notified:false};
    }
    state.studyTimer.hardStopAt=hardStopAt;
    if(budget.mode==="short")state.studyTimer.targetSeconds=Math.min(state.studyTimer.targetSeconds,25*60);
    else if(budget.mode==="light")state.studyTimer.targetSeconds=Math.min(state.studyTimer.targetSeconds,45*60);
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
      if(Number(t.hardStopAt)>0&&Date.now()>=t.hardStopAt){
        pauseStudyTimer();renderSession();
        alertUser("Пора завершить занятия: начинается защищённое время подготовки ко сну.");
      }else if(!t.notified&&currentTime(t.taskId)>=t.targetSeconds){
        const assigned=currentAgenda(L.today(),modeFor(L.today())).find(x=>x.id===t.taskId);
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
    const assigned=currentAgenda(L.today(),modeFor(L.today())).find(x=>x.id===id);
    const t=assigned||source;
    openTask=t;openTopicKey=t.topicKey;
    const note=state.notes[id]||"",priorScore=state.results[id],guide=authored(t.topicKey,t.subject,t.title);
    const prereqs=t.topicKey?C.unmet(state,t.topicKey):[];
    lessonTab="theory";
    const week=Math.max(0,Math.min(25,L.weekNumber(id.split(":")[0],state.startDate)));
    const kind={new:"Изучить теорию",practice:"Решить после изучения теории",integrated:"Прочитать и решить",mixed:"Смешанная практика",review:"Проверить себя"}[t.kind];
    $("#dialog-content").innerHTML='<div class="dialog-pad"><div class="dialog-head"><div>'+badge(t.subject)+
      '<h2 style="margin:12px 0 5px">'+safe(t.title)+'</h2><p class="note">'+safe(kind)+' · '+t.minutes+' мин</p></div>'+
      '<div class="dialog-head-actions"><button type="button" class="reader-font-btn" data-action="toggle-reader-size" aria-pressed="false" aria-label="Увеличить текст учебных материалов" title="Размер текста">Аа</button><button class="dialog-close" data-action="close-dialog" aria-label="Закрыть карточку">×</button></div></div>'+
      dependencyPanel(t.topicKey)+
      '<div class="lesson-objective"><div class="study-kicker">ЦЕЛЬ ЗАНЯТИЯ</div><p>'+safe(guide.doTask)+'</p>'+
      '<small><strong>Проверка освоения:</strong> '+safe(guide.check)+'</small></div>'+
      '<div id="lesson-panel">'+lessonPanel(t.topicKey,t.subject,t.title,t,lessonTab)+'</div>'+
      '<div class="timer-box"><div><div class="stat-caption">УЧЕБНЫЙ ТАЙМЕР · цель '+t.minutes+' минут</div><div class="timer" id="timer-clock">'+clockDisplay(currentTime(id))+'</div>'+
      '<p class="note">Таймер продолжает идти после закрытия карточки. Время учитывается по часам планшета.</p></div>'+
      '<div class="row"><button class="btn secondary small" data-action="timer-toggle" id="timer-button">'+timerButtonLabel(id)+'</button><button class="btn ghost small" data-action="timer-reset">Сброс</button></div></div>'+
      '<div id="timer-alert" class="timer-alert" role="status" aria-live="assertive" hidden></div>'+
      '<div class="field" style="margin-top:16px"><label for="task-note">Быстрая запись</label><textarea id="task-note" maxlength="2000" placeholder="Какая ошибка? Какой метод? Что повторить позже?">'+safe(note)+'</textarea><span class="note" id="saved-label">Сохраняется при наборе</span></div>'+
      '<div class="row wrap dialog-actions"><button class="btn" data-action="dialog-complete">'+(state.completed[id]?"Отменить выполнение":"Завершить занятие ✓")+'</button>'+
      '<button class="btn secondary" data-action="dialog-error">Записать ошибку</button></div>'+
      '<div id="dialog-error-form" hidden><div class="field"><label for="dialog-error-type">Тип ошибки</label>'+
      '<select id="dialog-error-type"><option value="concept">Не поняла принцип</option><option value="method">Не знаю метод</option><option value="memory">Забыла факт</option><option value="attention">Невнимательность</option><option value="time">Не хватило времени</option><option value="other">Другая причина</option></select></div>'+
      '<div class="field"><label for="dialog-error-text">Что исправить?</label><textarea id="dialog-error-text" maxlength="800" placeholder="Например: путаю знак при раскрытии скобок. Решить ещё 3 похожих примера."></textarea></div>'+
      '<button class="btn small" data-action="dialog-save-error">Сохранить ошибку</button></div></div>';
    $("#task-dialog").showModal();
    applyReaderMode();
    document.querySelector("#task-dialog .dialog-close")?.focus?.();
  }
  function dependencyPanel(id){
    const list=window.EGE_CURRICULUM?.prerequisitePath(state,id,10)||[];
    if(!list.length)return "";
    return '<section class="dependency-panel" aria-label="Необходимая подготовка">'+
      '<h3>Перед этой темой необходимо освоить</h3>'+
      '<p>Теория и самостоятельная проверка каждой основы обязательны. Темы перечислены в правильном порядке — от основ к более сложным.</p>'+
      '<ol>'+list.map(x=>'<li><span>'+safe(x.title)+'</span>'+
         '<small>'+(!x.theoryDone?"Теория ещё не завершена":!x.practiceDone?"Нужна самостоятельная практика":"Освоено")+'</small>'+
         '<button class="btn secondary small" data-action="open-prerequisite" data-key="'+safe(x.id)+'">Изучить →</button></li>').join("")+'</ol>'+
      '</section>';
  }
  function topicDetail(key){
    const t=U.topicByKey(key);if(!t)return;
    openTask=null;openTopicKey=key;lessonTab="theory";
    const [status]=reviewStatus(key),personal=state.topicNotes[key]||"",guide=authored(key,t.subject,t.title);
    const missing=C.unmet(state,key);
    $("#dialog-content").innerHTML='<div class="dialog-pad"><div class="dialog-head"><div>'+badge(t.subject)+
      '<p class="note" style="margin:12px 0 4px">Учебная неделя '+(C.placement[key]?.week||t.week+1)+' · '+safe(status)+'</p>'+
      '<h2>'+safe(t.title)+'</h2></div><div class="dialog-head-actions"><button type="button" class="reader-font-btn" data-action="toggle-reader-size" aria-pressed="false" aria-label="Увеличить текст учебных материалов" title="Размер текста">Аа</button><button class="dialog-close" data-action="close-dialog" aria-label="Закрыть">×</button></div></div>'+
      dependencyPanel(key)+
      '<div class="lesson-objective"><div class="study-kicker">ЦЕЛЬ ТЕМЫ</div><p>'+safe(guide.doTask)+'</p></div>'+
      '<div id="lesson-panel">'+lessonPanel(key,t.subject,t.title,null,"theory")+'</div>'+
      '<div class="field" style="margin-top:18px"><label for="topic-note">Мои заметки по теме</label>'+
      '<textarea id="topic-note" maxlength="3000" placeholder="Основные формулы, трудные места, конкретные задания, которые надо решить...">'+safe(personal)+'</textarea><span class="note">Сохраняется при наборе</span></div>'+
      '<div class="row wrap" style="margin-top:16px"><button class="btn secondary" data-action="pin-topic" data-key="'+safe(key)+'">'+(state.pinned[key]?"★ В закладках":"☆ В закладки")+'</button><button class="btn" data-action="start-topic-review" data-key="'+safe(key)+'">'+(state.reviews[key]?"Повтор уже запланирован":"Изучила → назначить повтор")+'</button>'+
      (state.reviews[key]?'<button class="btn secondary" data-view="reviews">Открыть повторения</button>':"")+'</div></div>';
    $("#task-dialog").showModal();
    applyReaderMode();
    document.querySelector("#task-dialog .dialog-close")?.focus?.();
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
      case "show-saturday":{
        date=L.iso(L.move(L.parseDate(state.startDate),focusWeek*7+5));
        view="today";render();break;
      }
      case "saturday-enable":{
        if(date!==L.today()||L.parseDate(date)?.getDay()!==6||
          L.weekNumber(date,state.startDate)<0){notice("Добровольная сессия доступна только в текущую субботу после начала программы.");break;}
        const kind=b.dataset.kind,subject=b.dataset.subject;
        if(kind==="review"){
          state.saturdaySessions[date]={kind:"review"};
          save();render();break;
        }
        if(kind!=="lesson"||!D.subjectOrder.includes(subject))break;
        const assigned=state.curriculumAssignments?.[date]?.[0];
        if(assigned?.subject!==subject&&saturdayActivity(date)){
          notice("Занятие уже начато. Записи и результат сохранены за первоначальной темой.");break;
        }
        if(assigned?.subject!==subject&&state.curriculumAssignments?.[date]){
          delete state.curriculumAssignments[date];
        }
        if(!assigned||assigned.subject!==subject){
          if(!C.nextSubject(state,subject)){notice("По предмету сейчас нет доступной темы. Можно выбрать повторение.");break;}
        }
        state.saturdaySessions[date]={kind:"lesson",subject};
        C.assign(state,date,state.startDate,L.planDay);
        save();render();break;
      }
      case "saturday-disable":{
        if(date!==L.today()||!L.saturdaySession(state,date))break;
        if(state.studyTimer?.taskId?.startsWith(date+":"))pauseStudyTimer();
        if(!saturdayActivity(date))delete state.curriculumAssignments[date];
        delete state.saturdaySessions[date];
        save();render();notice("Суббота снова свободна. Сохранённые результаты не удалены.");break;
      }
      case "prev-day":case "next-day":{
        let d=L.parseDate(date),delta=action==="prev-day"?-1:1;
        do{d=L.move(d,delta);}while(!L.canStudyToday(state,L.iso(d)));
        date=L.iso(d);render();break;
      }
      case "prev-week":case "next-week":focusWeek=Math.min(25,Math.max(0,focusWeek+(action==="prev-week"?-1:1)));render();break;
      case "pick-day":date=b.dataset.date;view="today";render();break;
      case "subject":focusSubject=b.dataset.subject;render();break;
      case "repeat-error":{
        const er=state.errors.find(x=>x.id===b.dataset.id);
        if(!er?.topicKey){notice("У этой записи нет привязки к теме.");break;}
        if(!canStudyToday()){notice("Чтобы повторять в субботу, включите добровольную сессию в разделе «Сегодня».");break;}
        const t=U.topicByKey(er.topicKey);if(!t)break;
        L.beginReview(state,{topicKey:t.key,subject:t.subject,title:t.title},L.today());
        state.reviews[t.key].due=L.shiftStudyDays(L.today(),1);
        save();notice("Проверка назначена на следующий учебный день.");render();break;
      }
      case "open-topic":topicDetail(b.dataset.key);break;
      case "open-prerequisite":if($("#task-dialog")?.open)closeDialog();topicDetail(b.dataset.key);break;
      case "remediation-open":if($("#task-dialog")?.open)closeDialog();topicDetail(b.dataset.key);break;
      case "search-suggestion":
        searchQuery=b.dataset.query||"";
        searchPinned=false;
        searchSubject="all";
        setView("subjects");
        $("#topic-search")?.focus?.();
        break;
      case "clear-search":
        searchQuery="";
        searchPinned=false;
        render();
        $("#topic-search")?.focus?.();
        break;
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
        if(!canStudyToday()){notice("Чтобы учиться в субботу, включите добровольную сессию в разделе «Сегодня».");break;}
        const progress=C.topicStatus(state,t.key);
        if(!progress.ready||!progress.theory||!progress.practice){
          notice("Повторение назначается после завершения теории и практики. Сначала пройдите необходимую базу в учебной очереди.");
          break;
        }
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
      case "lesson-tab":{
        if(b.dataset.tab==="practice"&&openTask?.phase==="integrated"&&state.steps?.[openTask.id]?.[0]!==true){
          notice("Сначала изучите теорию и подтвердите это в первом разделе.");
          break;
        }
        lessonTab=b.dataset.tab==="practice"?"practice":"theory";
        const isTheory=lessonTab==="theory";
        const t=$("#lesson-theory"),p=$("#lesson-practice");
        if(t)t.hidden=!isTheory;
        if(p)p.hidden=isTheory;
        document.querySelectorAll(".lesson-tab").forEach(el=>{
          const selected=el.dataset.tab===lessonTab;
          el.classList.toggle("selected",selected);
          el.setAttribute("aria-selected",String(selected));
          el.tabIndex=selected?0:-1;
        });
        $("#lesson-panel")?.scrollIntoView?.({block:"start",behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth"});
        break;
      }
      case "copy-resource":{
        const url=U.safeHttpUrl(b.dataset.url);
        if(!url){notice("Адрес некорректен.");break;}
        if(typeof navigator!=="undefined"&&navigator.clipboard?.writeText){
          navigator.clipboard.writeText(url).then(()=>notice("Адрес скопирован. Откройте Chrome и вставьте ссылку."))
            .catch(()=>prompt("Скопируйте адрес и откройте его в Chrome:",url));
        }else if(typeof prompt==="function")prompt("Скопируйте адрес и откройте его в Chrome:",url);
        break;
      }
      case "show-materials":{
        detail(b.dataset.id);
        lessonTab="practice";
        const th=$("#lesson-theory"),pr=$("#lesson-practice");
        if(th)th.hidden=true;
        if(pr)pr.hidden=false;
        break;
      }
      case "set-mode":{const info=schoolInfo(date);state.school[date]={...info,manualMode:b.dataset.mode};save();render();break;}
      case "start-topic":{
        const s=b.dataset.subject,i=Number(b.dataset.index),key=L.topicKey(s,focusWeek,i);
        if(!state.reviews[key]){L.beginReview(state,{subject:s,title:subj(s).weeks[focusWeek][i],topicKey:key},L.today());save();notice("Тема добавлена в очередь повторений.");render();}
        else setView("reviews");
        break;
      }
      case "rate":if(!canStudyToday()){notice("В субботу сначала включите добровольную сессию. Воскресенье остаётся выходным.");break;}if(L.rateReview(state,b.dataset.key,b.dataset.rate,L.today())){save();render();notice("Следующая проверка назначена.");}break;
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
      case "toggle-reader-size":
        largeReading=!largeReading;
        try{localStorage.setItem(READER_PREF,largeReading?"1":"0");}catch{}
        applyReaderMode();
        break;
      case "close-dialog":closeDialog();break;
      case "dialog-complete":if(openTask){const id=openTask.id;closeDialog();completeTask(id);}break;
      case "save-score":{
        if(!openTask)break;
        if(openTask.phase==="integrated"&&
          !(state.steps?.[openTask.id]?.[0]===true&&state.steps?.[openTask.id]?.[1]===true)){
          notice("Сначала изучите теорию и выполните самостоятельные задания.");
          break;
        }
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
        if(t.startedAt){pauseStudyTimer();renderSession();updateTimerDisplays();}
        else {const task=lookup(t.taskId);if(task)startStudyTimer(task);}
        break;
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
    if(["school-homework","school-sleep","school-energy","school-end","school-wake","school-sleep-target","school-commute","school-activity","school-recovery","school-meal"].includes(ev.target.id)){
      const info={...schoolInfo(date)};
      if(ev.target.id==="school-homework")info.homework=Number(ev.target.value);
      if(ev.target.id==="school-sleep")info.sleep=Number(ev.target.value);
      if(ev.target.id==="school-energy")info.energy=ev.target.value;
      const map={"school-end":"schoolEnd","school-wake":"wakeTime","school-sleep-target":"sleepTarget",
        "school-commute":"commute","school-activity":"activityReserve","school-recovery":"recovery","school-meal":"meal"};
      if(map[ev.target.id])info[map[ev.target.id]]=ev.target.id==="school-end"||ev.target.id==="school-wake"?ev.target.value:Number(ev.target.value);
      schoolExpanded=true;state.school[date]=info;save();render();
    }
    if(ev.target.id==="task-note"&&openTask){state.notes[openTask.id]=ev.target.value;save();}
    if(ev.target.matches?.('input[data-action="toggle-step"]')&&openTask){
      const step=Number(ev.target.dataset.step);const checked=state.steps[openTask.id]||[];
      if(!Number.isInteger(step)||step<0||step>2)return;
      if(openTask.phase==="integrated"&&ev.target.checked&&step>0&&checked[step-1]!==true){
        ev.target.checked=false;
        notice(step===1?"Сначала завершите изучение теории.":"Сначала выполните самостоятельные задания.");
        return;
      }
      checked[step]=!!ev.target.checked;
      if(!checked[step])for(let i=step+1;i<3;i++)checked[i]=false;
      state.steps[openTask.id]=checked;save();
    }
    if(ev.target.id==="search-subject"){searchSubject=ev.target.value;$("#topic-results").innerHTML=topicSearchResults();}
    if(["school-homework","school-sleep","school-energy","school-end","school-wake","school-sleep-target","school-commute","school-activity","school-recovery","school-meal"].includes(ev.target.id))schoolExpanded=true;
  });
  document.addEventListener("input",ev=>{
    const el=ev.target;
    if(el.id==="task-note"&&openTask){state.notes[openTask.id]=el.value;save();}
    if(el.id==="topic-note"&&openTopicKey){state.topicNotes[openTopicKey]=el.value;save();}
    if(el.dataset?.action==="textbook-place"){
      const key=el.dataset.key,book=el.dataset.book;
      const lesson=window.EGE_LESSONS?.get(key);
      if(lesson&&window.EGE_TEXTBOOKS?.get(key,lesson.subject,lesson.title).some(x=>x.bookId===book)){
        if(!state.textbookPlaces)state.textbookPlaces={};
        state.textbookPlaces[key+"::"+book]=String(el.value||"").slice(0,100);save();
      }
    }
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
    if(["ArrowLeft","ArrowRight","Home","End"].includes(ev.key)&&ev.target?.matches?.(".lesson-tab")){
      const tabs=[...document.querySelectorAll(".lesson-tab")];
      const current=tabs.indexOf(ev.target);
      if(current>=0&&tabs.length){
        ev.preventDefault();
        const next=ev.key==="Home"?0:ev.key==="End"?tabs.length-1:
          (current+(ev.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
        tabs[next].focus();
        tabs[next].click();
      }
      return;
    }
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
