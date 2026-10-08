import vm from "node:vm";import{readFileSync}from"node:fs";
const ctx=vm.createContext({window:{},encodeURIComponent});
for(const f of ["data.js","verified-tocs.js","page-assignments.js","reading-guide.js"])
 vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),ctx,{filename:f});
for(const sub of ctx.window.EGE_DATA.subjectOrder){
 console.log("## "+sub);
 for(let wi=0;wi<26;wi++){
  for(let i=0;i<3;i++){
   const key=sub+":"+(wi+1)+":"+i;
   const title=ctx.window.EGE_DATA.subjects[sub].weeks[wi][i];
   const book=ctx.window.EGE_READING.get(key);
   const entries=book.entries.map(e=>e.editionId+"/"+e.number+" "+e.page+" "+e.title.slice(0,55)).join(" + ");
   console.log(key+" "+title+" ==> "+entries);
  }
 }
}
