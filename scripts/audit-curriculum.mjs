import vm from"node:vm";import{readFileSync}from"node:fs";
const ctx=vm.createContext({window:{}});for(const f of ["data.js","curriculum.js"])vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),ctx);
const C=ctx.window.EGE_CURRICULUM;
for(const sub of ["bio","chem","math"]){
 const arr=C.order[sub];
 console.log(sub,arr.length,arr.slice(0,35).join(" "));
}
console.log("NODES",Object.keys(C.records).length,"LATE_DEPENDENCIES",C.risks.length,"EXAMPLES",JSON.stringify(C.risks.slice(0,25)));
