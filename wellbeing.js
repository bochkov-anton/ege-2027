/* Планирование времени подростка, без сбора медицинской информации или сетевого доступа.
 * Внешние медицинские основания: сон 8–10 ч (AASM), активность в среднем 60 мин/день
 * (WHO 2020), отключение экранов хотя бы за 30 мин до сна (CDC).
 * Пределы ЕГЭ 160/90/35, интервалы и пороги школьного ДЗ — продуктовые
 * консервативные эвристики, НЕ клинические стандарты.
 */
(function(){
"use strict";
const DEFAULTS=Object.freeze({
 wakeTime:"07:00",schoolEnd:"14:00",sleepTarget:8.5,
 commute:30,recovery:45,meal:30,activityReserve:30,
 homework:60,sleep:8.5,energy:"ok",manualMode:"auto"
});
const LEVELS=Object.freeze(["off","short","light","normal"]);
function minutes(s,fallback){
 if(typeof s!=="string"||!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return fallback;
 const [h,m]=s.split(":").map(Number);return h*60+m;
}
function time(n){const x=((Math.round(n)%1440)+1440)%1440;return String(Math.floor(x/60)).padStart(2,"0")+":"+String(x%60).padStart(2,"0");}
function numeric(v,fallback,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function computeDay(raw={}){
 const x={...DEFAULTS,...raw};
 const wake=minutes(x.wakeTime,420),schoolEnd=minutes(x.schoolEnd,840);
 const target=numeric(x.sleepTarget,8.5,8,10);
 // Условное ежедневное расписание: час засыпания = подъём − желаемый сон.
 // Результат используется только для вечернего окна, не для диагноза.
 let bed=wake+1440-Math.round(target*60);
 // Никогда не переносим рекомендуемый отход ко сну на следующие сутки,
 // даже если школа/дорога/ДЗ не помещаются в заданные часы.
 const windDown=30,hardStop=bed-windDown;
 const commute=numeric(x.commute,30,0,120),recovery=numeric(x.recovery,45,15,120);
 const meal=numeric(x.meal,30,15,90),activity=numeric(x.activityReserve,30,0,90);
 const homework=numeric(x.homework,60,0,360),sleep=numeric(x.sleep,8.5,0,14);
 const homeworkBreaks=homework>45?Math.floor((homework-1)/45)*5:0;
 const energy=["good","ok","low"].includes(x.energy)?x.energy:"ok";
 const timeline=[{label:"Конец школы",at:time(schoolEnd)}];
 let t=schoolEnd;
 for(const [label,dur] of [["Дорога домой",commute],["Еда и восстановление",recovery],["Школьное ДЗ",homework],["Перерывы во время ДЗ",homeworkBreaks],["Движение / прогулка",activity],["Приём пищи",meal]]){
   if(dur>0){t+=dur;timeline.push({label,minutes:dur,at:time(t)});}
 }
 // При планировании именно сегодняшнего дня учитывается фактическое время.
 const now=Number(x.nowMinute);
 if(x.nowMinute!==null && x.nowMinute!==undefined && Number.isFinite(now)&&now>=0&&now<1440&&now>t){
   t=now;timeline.push({label:"Текущее время — начало оставшегося окна",at:time(t)});
 }
 const availableMinutes=Math.max(0,Math.floor(hardStop-t));
 const levels={
   normal:{study:160,breaks:50,wall:210},
   light:{study:90,breaks:15,wall:105},
   short:{study:35,breaks:5,wall:40},
   off:{study:0,breaks:0,wall:0}
 };
 const notes=[];
 const rules=[];
 // Приоритет 1: доступное физическое время до подготовки ко сну.
 let safe="off";
 for(const level of ["normal","light","short"]){
   if(availableMinutes>=levels[level].wall){safe=level;break;}
 }
 if(safe==="off")rules.push("Нет времени на ЕГЭ без сокращения защищённого окна сна.");
 // Приоритет 2: защищающие эвристики с запасом относительно AASM 8–10 ч.
 const cap=(level,reason)=>{
   if(LEVELS.indexOf(safe)>LEVELS.indexOf(level)) {safe=level;rules.push(reason);}
 };
 if(sleep<6.5)cap("off","Очень короткий сон прошлой ночью: лучше восстановиться, чем нагружаться ЕГЭ.");
 else if(sleep<7)cap("short","Недосып: только минимальная практика; отложите новую тяжёлую тему.");
 else if(sleep<8)cap("light","Сон меньше рекомендуемых 8 часов: уменьшена нагрузка.");
 if(energy==="low")cap("short","Выраженная усталость: уменьшен учебный объём.");
 if(homework>=210)cap("off","Очень большой объём школьного ДЗ: дополнительное ЕГЭ исключено.");
 else if(homework>=150)cap("short","Большое школьное ДЗ: сокращён объём ЕГЭ.");
 else if(homework>=90)cap("light","Много школьного ДЗ: выбрана облегчённая нагрузка.");
 // Приоритет 3: пользователь может только уменьшить рекомендованную нагрузку.
 const manual=LEVELS.includes(x.manualMode)?x.manualMode:"auto";
 let mode=safe;
 if(manual!=="auto"){
   if(LEVELS.indexOf(manual)<LEVELS.indexOf(mode))mode=manual;
   else if(LEVELS.indexOf(manual)>LEVELS.indexOf(mode))
     notes.push("Ручной режим ограничен временем, сном и нагрузкой: превышение не разрешено.");
 }
 const allowance=levels[mode];
 const finish=t+allowance.wall;
 if(mode!=="off"){
   timeline.push({label:"ЕГЭ с перерывами",minutes:allowance.study,breaks:allowance.breaks,at:time(finish)});
 }else notes.push("Невыполненные обязательные темы сохраняются в очереди, без штрафа.");
 timeline.push({label:"Без экранов и подготовка ко сну",at:time(hardStop)});
 timeline.push({label:"Плановый сон",at:time(bed)});
 const result={
   mode,studyMinutes:allowance.study,breakMinutes:allowance.breaks,wallMinutes:allowance.wall,
   availableMinutes,bedTime:time(bed),wakeTime:time(wake),screensOff:time(hardStop),
   bedMinute:bed,screensOffMinute:hardStop,finishMinute:finish,
   startEge:mode==="off"?null:time(t),finishEge:mode==="off"?null:time(finish),
   targetSleepHours:target,priorSleepHours:sleep,homeworkMinutes:homework,homeworkBreakMinutes:homeworkBreaks,
   timeline,warnings:rules,notes,
   references:["AASM-teen-8-10","WHO-2020-activity-60-average","CDC-sleep-hygiene-30-minute-screen"]
 };
 return result;
}
window.EGE_WELLBEING={computeDay,DEFAULTS,LEVELS,time};
})();
