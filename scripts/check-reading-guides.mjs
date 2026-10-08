import {readFileSync} from "node:fs";
import vm from "node:vm";
const v=vm.createContext({window:{},encodeURIComponent});
for(const f of ["data.js","verified-tocs.js","page-assignments.js","reading-guide.js"])vm.runInContext(readFileSync(new URL("../"+f,import.meta.url),"utf8"),v,{filename:f});
const W=v.window;let success=0,bad=[],empty=[];
for(const sub of W.EGE_DATA.subjectOrder)for(let week=0;week<26;week++)for(let i=0;i<3;i++){
 const key=sub+":"+(week+1)+":"+i,r=W.EGE_READING.get(key);
 if(r.unverified.length)bad.push([key,r.unverified]);
 if(r.verified)success++;
 else if(!r.unverified.length)empty.push(key);
}
console.log("VERIFIED",success,"NOT-MAPPED",empty.length,"INVALID",bad.length,"EDITIONS",Object.keys(W.EGE_VERIFIED_TOC.editions).length);
if(bad.length)console.log(JSON.stringify(bad).slice(0,3500));
if(empty.length)console.log("unmapped",empty.join(",").slice(0,1300));
if(bad.length)process.exitCode=1;
