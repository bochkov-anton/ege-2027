import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
const context=vm.createContext({window:{}});
for(const file of ["data.js","curriculum.js","learning-analytics.js"])
 vm.runInContext(readFileSync(new URL("../"+file,import.meta.url),"utf8"),context,{filename:file});
const C=context.window.EGE_CURRICULUM,A=context.window.EGE_ANALYTICS;
const empty=()=>({topicProgress:{},reviews:{},errors:[],results:{}});
test("week analytics represents all nine projected topics and all three subjects",()=>{
 const w=A.week(empty(),C,0);
 assert.deepEqual(Object.keys(w),["bio","chem","math"]);
 for(const s of ["bio","chem","math"]){
  assert.equal(w[s].topics.length,3,s);
  assert.equal(w[s].mastered,0,s);
  assert.equal(w[s].ready+w[s].blocked,3,s);
 }
 assert.equal(w.math.topics[0].id,"math:1:0");
});
test("calendar progress never claims a topic is completed",()=>{
 const x=A.summary(empty(),C,"2026-10-10");
 assert.equal(Object.values(x).reduce((n,v)=>n+v.mastered,0),0);
 for(const s of ["bio","chem","math"]){
  assert.equal(x[s].total,78);
  assert.equal(x[s].accuracy,null);
  assert.equal(x[s].reinforced,0);
  assert.equal(x[s].due,0);
 }
});
test("practice and mastery are separate and retention requires both mastery and reviews",()=>{
 const state=empty();
 state.topicProgress["bio:1:0"]={theory:true,practice:false};
 state.topicProgress["chem:1:0"]={theory:true,practice:true};
 state.reviews["chem:1:0"]={due:"2026-10-09",successes:2};
 state.reviews["bio:1:0"]={due:"2026-11-05",successes:3};
 const v=A.summary(state,C,"2026-10-10");
 assert.equal(v.bio.theory,1);
 assert.equal(v.bio.mastered,0);
 assert.equal(v.bio.reinforced,0);
 assert.equal(v.chem.mastered,1);
 assert.equal(v.chem.reinforced,1);
 assert.equal(v.chem.due,1);
 assert.equal(v.bio.due,0);
 assert.equal(A.week(state,C,0).chem.topics[0].phase,"mastered");
});
test("manual accuracy is weighted and invalid attempts cannot distort it",()=>{
 const state=empty();
 state.results={
  a:{subject:"chem",correct:1,total:2},
  b:{subject:"chem",correct:9,total:10},
  broken:{subject:"chem",correct:13,total:5},
  unknown:{subject:"chem",correct:3,total:0},
  other:{subject:"bio",correct:3,total:3}
 };
 state.errors=[{subject:"chem",done:false},{subject:"chem",done:true},{subject:"math",done:false}];
 const v=A.summary(state,C,"2026-10-10");
 assert.equal(v.chem.accuracy,83);
 assert.equal(v.chem.answered,12);
 assert.equal(v.chem.correct,10);
 assert.equal(v.chem.openErrors,1);
 assert.equal(v.math.openErrors,1);
 assert.equal(v.bio.accuracy,100);
});
test("week status labels distinguish waiting, readiness and study completion",()=>{
 const state=empty();
 const result=A.week(state,C,0);
 assert.equal(result.bio.topics[0].phase,"ready");
 state.topicProgress["bio:1:0"]={theory:true,practice:false};
 assert.equal(A.week(state,C,0).bio.topics[0].phase,"practice");
 state.topicProgress["bio:1:0"].practice=true;
 assert.equal(A.week(state,C,0).bio.topics[0].phase,"mastered");
});