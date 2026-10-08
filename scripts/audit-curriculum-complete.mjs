import{readFileSync,writeFileSync}from"node:fs";import vm from"node:vm";
const c=vm.createContext({window:{},URL,encodeURIComponent});
for(const f of ["data.js","curriculum.js","fipi-map.js","lesson-content.js","topic-practice.js","textbooks.js","verified-tocs.js","page-assignments.js","reading-guide.js","theory-core.js"])
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),c,{filename:f});
const W=c.window,C=W.EGE_CURRICULUM,F=W.EGE_FIPI;
const issues=[],rows=[],stats={};
for(const s of ["bio","chem","math"]){
 const seq=C.order[s],pos=new Map(seq.map((id,i)=>[id,i])),count={topics:0,edges:0,sets:0,books:0,fox:0};
 for(const id of seq){
  const r=C.records[id],content=W.EGE_LESSONS.get(id),links=W.EGE_PRACTICE.get(id)?.sources||[],reading=W.EGE_READING.get(id),fipi=F.get(id);
  const fox=W.EGE_THEORY.get(id,s,r.title,content)?.articles||[];
  if(!content||content.title!==r.title)issues.push("lesson mismatch "+id);
  if(!links.length)issues.push("missing practice "+id);
  if(!fipi?.section)issues.push("missing FIPI category "+id);
  for(const dep of r.prerequisites)if(pos.get(dep)>=pos.get(id))issues.push("bad prerequisite "+id+" "+dep);
  count.topics++;count.edges+=r.prerequisites.length;count.sets+=links.length;
  if(reading.verified)count.books++;
  if(fox.length)count.fox++;
  rows.push({id,title:r.title,subject:s,plannedWeek:r.week+1,sequence:pos.get(id)+1,prerequisites:r.prerequisites,
   examLines:fipi?.lines||[],fipiCategory:fipi?.section||"",exerciseSets:links.length,foxfordArticles:fox.length,
   verifiedBookPages:reading.verified});
 }
 stats[s]=count;
}
const sum=k=>Object.values(stats).reduce((a,b)=>a+b[k],0);
const output={schema:"ege-dependency-audit-v1",generated:"2026-10-08",fipiStatus:"draft",stats,issues,
 calendarInversions:C.risks,topics:rows};
writeFileSync(new URL("../curriculum-audit.json",import.meta.url),JSON.stringify(output,null,2)+"\n");
const md=[
"# Аудит учебных зависимостей — ЕГЭ-2027",
"",
"**Дата:** 8 октября 2026. Источник структуры экзамена: https://fipi.ru/ege/demoversii-specifikacii-kodifikatory. Статус КИМ: проекты ФИПИ-2027, не утверждённые финальные документы.",
"",
"## Результаты структурной проверки",
"",
"| Предмет | Тем | Связей | Наборов заданий | Тем с проверенными страницами | Тем со статьями Фоксфорда |",
"|---|---:|---:|---:|---:|---:|",
...Object.entries(stats).map(([s,n])=>"| "+s+" | "+n.topics+" | "+n.edges+" | "+n.sets+" | "+n.books+" | "+n.fox+" |"),
"| **Итого** | "+sum("topics")+" | "+sum("edges")+" | "+sum("sets")+" | "+sum("books")+" | "+sum("fox")+" |",
"",
"- Исходные календарные инверсии: **"+C.risks.length+"**. Проверяются топологической сортировкой.",
"- Нарушения целостности данных (отсутствующий учебный блок, пустая база заданий или отсутствующее соответствие разделу ФИПИ): **"+issues.length+"**.",
"- Теория и самостоятельные задания разделены. Доступность предметной практики зависит от завершения соответствующего этапа теории.",
"- Для зачёта самостоятельной практики требуется минимум три проверочных задания и не менее 80% правильных ответов.",
"- Прежние ключи тем и пользовательские записи сохраняются. Динамическая очередь теперь зависит от освоения, а не только от даты.",
"",
"## Экзаменационный стандарт: проект ФИПИ-2027",
"",
"- Профильная математика: 20 заданий, 13 кратких и 7 развёрнутых, 33 первичных балла; добавлены №6 (случайная величина), №13 (финансы/текстовые задачи), №17 (математические модели).",
"- Химия: 34 задания, из них №29–34 с развёрнутым ответом, максимум 56 первичных баллов.",
"- Биология: 28 заданий, 57 первичных баллов; ожидаются изменения отдельных критериев оценивания.",
"",
"## Подтверждённые ошибки предыдущей версии",
"",
"- Химия: алканы и алкены появились раньше изучения органического строения и изомерии. Граф принудительно ставит предварительные темы раньше реакционной практики.",
"- Химия: гидролиз/pH, электролиз и цепочки предъявлялись раньше растворов, ОВР, кислотно-основных равновесий и соответствующих классов соединений.",
"- Биология: сравнительные задачи по растениям, животным и физиологии требовали предварительного знакомства с систематикой и отдельными системами органов.",
"- Профильная математика: смешанные задания и нормативы скорости иногда предшествовали изучению базовых приёмов. Новая линия №6 недостаточно раскрывала распределения; учебный конспект дополнен.",
"",
"## Оставшиеся ограничения, не скрывать",
"",
"- **Формальный DAG не равен предметному рецензированию каждого параграфа**: многосоставные темы требуют дальнейшей декомпозиции на атомарные навыки.",
"- Прямые ссылки на практику и ссылки на книги проверены структурно; фактическая пригодность каждой внешней страницы и каждого упражнения ещё не подтверждена вручную.",
"- Химия после 4-й недели была сформирована по макроплану, поэтому там сохраняется повышенный риск недостаточной детализации.",
"- Соответствия разделам ФИПИ — редакционная классификация. Только упомянутые в названии номера заданий трактуются как явные; финальные КИМ-2027 требуется проверить отдельно.",
"",
"## Карта 234 тем",
"",
"| ID | Позиция в новом порядке | Название темы | Обязательные предпосылки | Указанные линии КИМ |",
"|---|---:|---|---|---|",
...rows.map(x=>"| "+x.id+" | "+x.sequence+" | "+x.title.replace(/\|/g,"/")+" | "+(x.prerequisites.join(", ")||"—")+" | "+(x.examLines.join(", ")||"по разделу")+" |"),
""
].join("\n");
writeFileSync(new URL("../CURRICULUM-AUDIT-2027.md",import.meta.url),md);
console.log("TOPICS",sum("topics"),"EDGES",sum("edges"),"CALENDAR_INVERSIONS",C.risks.length,"INTEGRITY_ISSUES",issues.length,"TEXTBOOK_PAGES",sum("books"),"FOX_ARTICLES",sum("fox"));
if(issues.length)process.exitCode=1;