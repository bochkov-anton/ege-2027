(function () {
  "use strict";
  const D = window.EGE_DATA;
  function parseDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
    const [y,m,d] = s.split("-").map(Number);
    const date = new Date(y,m-1,d,12,0,0);
    return date.getFullYear()===y && date.getMonth()===m-1 && date.getDate()===d ? date : null;
  }
  function iso(date) {
    return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
  }
  function move(date,delta) { const d=new Date(date); d.setDate(d.getDate()+delta); return d; }
  function monday(date) { const d=new Date(date); return move(d,-(d.getDay()+6)%7); }
  function today() { return iso(new Date()); }
  function isStudyDay(date) { const d=typeof date==="string"?parseDate(date):date; return !!d && d.getDay()>=1 && d.getDay()<=5; }
  function shiftStudyDays(date,n) {
    let d=parseDate(date);
    if (!d) return null;
    let left=Math.max(0,n);
    do { d=move(d,1); if(isStudyDay(d)) left--; } while(left>0 || !isStudyDay(d));
    return iso(d);
  }
  function weekNumber(date,start) {
    const dt=parseDate(date), st=parseDate(start);
    if(!dt || !st) return -1;
    const a=monday(dt), b=monday(st);
    const utc=x=>Date.UTC(x.getFullYear(),x.getMonth(),x.getDate());
    return Math.round((utc(a)-utc(b))/604800000);
  }
  function topicKey(sub,week,index) { return sub+":"+(week+1)+":"+index; }
  function suggestDay(info={}) {
    return window.EGE_WELLBEING
      ? window.EGE_WELLBEING.computeDay(info).mode
      : (Number(info.sleep)<8 || Number(info.homework)>=90 || info.energy==="low"?"light":"normal");
  }
  function planDay(date,start, reviews={},mode="normal") {
    const d=parseDate(date), w=weekNumber(date,start);
    if(!d || !isStudyDay(d) || w<0 || mode==="off") return [];
    const dow=d.getDay()-1, pair=D.patterns[w%2][dow], primary=pair[0], secondary=pair[1];
    const previous=D.patterns[w%2].slice(0,dow);
    const count=(sub)=>previous.reduce((n,p)=>n+(p.includes(sub)?1:0),0);
    const key=(sub)=>Math.min(count(sub), D.subjects[sub].weeks[Math.min(w,D.totalWeeks-1)].length-1);
    const pi=key(primary), si=key(secondary);
    const lastWeek=w>=D.totalWeeks;
    const maintenance={
      bio:["Смешанная практика: генетика, эксперимент, изображения","Слабые темы: физиология, ботаника, эволюция","Развёрнутые ответы и коррекция"],
      chem:["Смешанные реакции: органика, неорганика, условия","Слабые задачи: расчёты, ОВР, ионные процессы","Задания 29–34: модель, оформление"],
      math:["Смешанная первая часть и лёгкие баллы","Задания 14/16/17: оформление","Слабые линии и управление временем"]
    };
    const ptitle=lastWeek?maintenance[primary][(w+dow)%3]:D.subjects[primary].weeks[w][pi];
    const stitle=lastWeek?maintenance[secondary][(w+dow+1)%3]:D.subjects[secondary].weeks[w][si];
    const due=Object.entries(reviews).filter(([,v])=>v && v.due<=date).sort((a,b)=>a[1].due.localeCompare(b[1].due));
    const reviewSubject=due.length?due[0][1].subject:D.reviewFallback[dow];
    const standard=[
      {id:date+":0",subject:primary,title:ptitle,topicKey:lastWeek?null:topicKey(primary,w,pi),kind:"new",minutes:55,label:"Разбор и понимание"},
      {id:date+":1",subject:primary,title:ptitle,topicKey:lastWeek?null:topicKey(primary,w,pi),kind:"practice",minutes:50,label:"Самостоятельная практика"},
      {id:date+":2",subject:secondary,title:stitle,topicKey:lastWeek?null:topicKey(secondary,w,si),kind:"mixed",minutes:45,label:"Второй предмет"},
      {id:date+":3",subject:reviewSubject,title:due.length?"Повторение по очереди и исправление ошибок":"Смешанные задания и проверка старого",topicKey:null,kind:"review",minutes:10,label:"Короткое повторение"}
    ];
    if(mode==="short")return [{...standard[0],minutes:25},standard[3]];
    if(mode==="light")return [{...standard[0],minutes:45},{...standard[2],minutes:35},standard[3]];
    return standard;
  }
  // Источник истины для прохождения: реальные завершения, а не календарная дата.
  // Старые ID сохраняются, поэтому отметки, заметки и ошибки переживают обновление.
  // Повторения (kind=review) — отдельная очередь и не создают бесконечный "долг".
  function pendingStudy(state,throughDate) {
    const start=parseDate(state.startDate),end=parseDate(throughDate);
    if(!start||!end||end<start)return [];
    const result=[];
    // Разрешаем 26 недель основного курса; оставшийся после него долг
    // сохраняется и не заменяется режимом поддержания.
    const last=move(start,D.totalWeeks*7-1),until=end<last?end:last;
    for(let d=new Date(start);d<=until;d=move(d,1)){
      if(!isStudyDay(d))continue;
      const date=iso(d);
      const blocks=planDay(date,state.startDate,state.reviews,"normal");
      for(const task of blocks){
        if(task.kind==="review")continue;
        if(state.completed?.[task.id]||state.skipped?.[task.id])continue;
        result.push({...task,originDate:date});
      }
    }
    return result;
  }
  function studyAgenda(state,date,mode="normal",currentDate=today()) {
    if(!isStudyDay(date)||mode==="off")return [];
    if(weekNumber(date,state.startDate)<0)return [];
    // Архивные даты и будущий календарь остаются читабельными.
    if(date!==currentDate){
      const planned=planDay(date,state.startDate,state.reviews,mode);
      return planned.map((task,i)=>({...task,slot:i,originDate:date,isBacklog:false}));
    }
    const pending=pendingStudy(state,date);
    const max=mode==="short"?1:mode==="light"?2:3;
    const times=mode==="short"?[25]:mode==="light"?[45,35]:[55,50,45];
    const assigned=state.assignments?.[date];
    const entries=Array.isArray(assigned)
      ? assigned.slice(0,max).map(id=>{
          const originDate=String(id).split(":")[0];
          const task=planDay(originDate,state.startDate,state.reviews,"normal").find(x=>x.id===id&&x.kind!=="review");
          return task?{...task,originDate}:null;
        }).filter(Boolean)
      : pending.slice(0,max);
    const work=entries.map((task,i)=>({
      ...task,minutes:times[i],slot:i,isBacklog:task.originDate<date
    }));
    // После 26 недель начинаем поддержание только если освоена обязательная очередь.
    if(!work.length && weekNumber(date,state.startDate)>=D.totalWeeks){
      return planDay(date,state.startDate,state.reviews,mode).map((task,i)=>({...task,slot:i,originDate:date,isBacklog:false}));
    }
    const base=planDay(date,state.startDate,state.reviews,mode);
    const review=base.find(x=>x.kind==="review");
    if(review)work.push({...review,id:date+":3",slot:max,originDate:date,isBacklog:false});
    return work;
  }
  function debtSummary(state,date){
    const pending=pendingStudy(state,date);
    return {total:pending.length,overdue:pending.filter(x=>x.originDate<date).length,
      oldest:pending[0]?.originDate??null,next:pending[0]??null};
  }
  function safeState(o,defaultStart) {
    if(!o || typeof o!=="object" || Array.isArray(o)) o={};
    return {
      startDate:parseDate(o.startDate)?o.startDate:defaultStart,
      completed:o.completed && typeof o.completed==="object" && !Array.isArray(o.completed)?o.completed:{},
      reviews:o.reviews && typeof o.reviews==="object" && !Array.isArray(o.reviews)?o.reviews:{},
      errors:Array.isArray(o.errors)?o.errors.filter(x=>x && typeof x==="object").slice(0,3000):[],
      notes:o.notes && typeof o.notes==="object" && !Array.isArray(o.notes)?o.notes:{},
      minimum:o.minimum && typeof o.minimum==="object" && !Array.isArray(o.minimum)?o.minimum:{},
      school:o.school && typeof o.school==="object" && !Array.isArray(o.school)?o.school:{},
      results:o.results && typeof o.results==="object" && !Array.isArray(o.results)?o.results:{},
      steps:o.steps && typeof o.steps==="object" && !Array.isArray(o.steps)?o.steps:{},
      topicNotes:o.topicNotes && typeof o.topicNotes==="object" && !Array.isArray(o.topicNotes)?o.topicNotes:{},
      dayNotes:o.dayNotes && typeof o.dayNotes==="object" && !Array.isArray(o.dayNotes)?o.dayNotes:{},
      customLinks:o.customLinks && typeof o.customLinks==="object" && !Array.isArray(o.customLinks)?o.customLinks:{},
      skipped:o.skipped && typeof o.skipped==="object" && !Array.isArray(o.skipped)?o.skipped:{},
      timeSpent:o.timeSpent && typeof o.timeSpent==="object" && !Array.isArray(o.timeSpent)?o.timeSpent:{},
      pinned:o.pinned && typeof o.pinned==="object" && !Array.isArray(o.pinned)?o.pinned:{},
      assignments:o.assignments && typeof o.assignments==="object" && !Array.isArray(o.assignments)?o.assignments:{},
      restTimer:o.restTimer && typeof o.restTimer==="object" && Number.isFinite(o.restTimer.endAt)?o.restTimer:null,
      restSuggestion:o.restSuggestion && typeof o.restSuggestion==="object" ?o.restSuggestion:null,
      notifyEnabled:o.notifyEnabled===true,
      studyTimer:o.studyTimer && typeof o.studyTimer==="object" && /^\d{4}-\d{2}-\d{2}:\d$/.test(o.studyTimer.taskId||"") && Number.isFinite(o.studyTimer.elapsedSeconds) && o.studyTimer.elapsedSeconds>=0 && (!o.studyTimer.startedAt || Number.isFinite(o.studyTimer.startedAt)) ? o.studyTimer : null
    };
  }
  function dueItems(reviews,date) {
    return Object.entries(reviews).filter(([key,v])=>v && v.due<=date && typeof v.subject==="string")
      .sort((a,b)=>String(a[1].due).localeCompare(String(b[1].due)))
      .map(([key,v])=>({key,...v}));
  }
  function beginReview(state,block,date) {
    if(!block.topicKey || !D.subjects[block.subject] || state.reviews[block.topicKey]) return;
    state.reviews[block.topicKey]={subject:block.subject,title:block.title,due:shiftStudyDays(date,1),stage:0,successes:0};
  }
  function rateReview(state,key,rate,date) {
    const v=state.reviews[key]; if(!v) return false;
    if(rate==="hard") { v.stage=0; v.successes=0; v.due=shiftStudyDays(date,1); }
    else if(rate==="medium") { v.due=shiftStudyDays(date,3); }
    else if(rate==="easy") {
      v.stage=Math.min(4,(Number(v.stage)||0)+1);
      v.successes=(Number(v.successes)||0)+1;
      v.due=shiftStudyDays(date,[1,3,7,14,22][v.stage]);
    } else return false;
    return true;
  }
  function stats(state) {
    const all=Object.keys(state.completed).filter(k=>state.completed[k]);
    const map={bio:0,chem:0,math:0};
    for(const id of all) {
      const value=state.completed[id];
      if(typeof value==="string" && Object.hasOwn(map,value)) map[value]++;
      else { const b=planDay(id.split(":")[0],state.startDate,state.reviews).find(x=>x.id===id); if(b && Object.hasOwn(map,b.subject)) map[b.subject]++; }
    }
    return {total:all.length,bySubject:map,openErrors:state.errors.filter(e=>!e.done).length};
  }
  window.EGE_LOGIC={parseDate,iso,move,monday,today,isStudyDay,shiftStudyDays,weekNumber,topicKey,suggestDay,planDay,pendingStudy,studyAgenda,debtSummary,safeState,dueItems,beginReview,rateReview,stats};
})();