import vm from "node:vm";
import {readFileSync,writeFileSync} from "node:fs";
const ctx=vm.createContext({window:{},URL,encodeURIComponent});
for(const f of ["data.js","curriculum.js","fipi-map.js","lesson-content.js","topic-practice.js","verified-tocs.js","page-assignments.js","reading-guide.js"]){
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),ctx,{filename:f});
}
const W=ctx.window,C=W.EGE_CURRICULUM,D=W.EGE_DATA;
const report={timestamp:"2026-10-09",source:{url:W.EGE_FIPI.primarySource,status:"project_2027_not_final",mappingStatus:"editorial_not_individually_fipi_verified"},subjects:{},errors:[],warnings:[],calendarInversions:C.risks};
for(const subject of D.subjectOrder){
 const ordered=C.order[subject],pos=Object.fromEntries(ordered.map((k,i)=>[k,i]));
 const out={topics:0,prerequisites:0,withPractice:0,withStudyGuide:0,withFipiSection:0,withPages:0,fipiExplicitLines:0,inversions:C.risks.filter(x=>x.topic.startsWith(subject+":")).length};
 for(const id of ordered){
  out.topics++;
  const node=C.records[id],guide=W.EGE_LESSONS.get(id),practice=W.EGE_PRACTICE.get(id),fipi=W.EGE_FIPI.get(id),book=W.EGE_READING.get(id);
  if(guide?.know&&guide?.doTask&&guide?.check)out.withStudyGuide++;else report.errors.push({id,kind:"missing_guide"});
  if(practice?.sources?.length)out.withPractice++;else report.errors.push({id,kind:"missing_practice"});
  if(fipi?.section)out.withFipiSection++;else report.errors.push({id,kind:"missing_fipi_section"});
  if(fipi?.verification==="declared_line_in_plan")out.fipiExplicitLines++;
  if(book?.verified)out.withPages++;
  for(const prereq of node.prerequisites){
   out.prerequisites++;
   if(!Object.hasOwn(pos,prereq)||pos[prereq]>=pos[id])report.errors.push({id,kind:"broken_dag",prereq});
  }
 }
 report.subjects[subject]=out;
}
report.summary={topics:Object.values(report.subjects).reduce((a,b)=>a+b.topics,0),edges:Object.values(report.subjects).reduce((a,b)=>a+b.prerequisites,0),calendarInversions:C.risks.length,errors:report.errors.length};
if(report.summary.topics!==234||report.errors.length)process.exitCode=1;
writeFileSync(new URL("../CURRICULUM-DEPENDENCY-RECHECK.json",import.meta.url),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report.summary));
console.log("BIO",JSON.stringify(report.subjects.bio),"CHEM",JSON.stringify(report.subjects.chem),"MATH",JSON.stringify(report.subjects.math));
