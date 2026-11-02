const {test}=require('node:test');const assert=require('node:assert/strict');
const {reviewState,reviewMatch,REVIEW_DAY}=require('../review-model');
const start=Date.parse('2026-11-02T10:00:00+08:00');
function attempt(id,correct,confidence,day=0,extra={}){return {id,correct,confidence,at:new Date(start+day*REVIEW_DAY).toISOString(),...extra};}
test('猜對與不確定答對進入重練，舊版答對不被誤判為猜的',()=>{
 const states=reviewState([attempt('guess',true,'guess'),attempt('unsure',true,'unsure'),attempt('sure',true,'sure'),attempt('wrong',false,'sure'),attempt('legacy',true,undefined)]);
 for(const id of ['guess','unsure','wrong'])assert.equal(reviewMatch(states.get(id),'learning'),true,id);
 for(const id of ['sure','legacy'])assert.equal(reviewMatch(states.get(id),'learning'),false,id);
 assert.equal(reviewMatch(states.get('guess'),'due',start+REVIEW_DAY-1),false);assert.equal(reviewMatch(states.get('guess'),'due',start+REVIEW_DAY),true);
});
test('連續有把握答對依1/3/7/14天安排，答錯或猜對後重設',()=>{
 const history=[];for(let i=0;i<5;i++){history.push(attempt('q',true,'sure',i));assert.equal(reviewState(history).get('q').interval,[1,3,7,14,14][i]);}
 history.push(attempt('q',true,'guess',6));assert.equal(reviewState(history).get('q').streak,0);assert.equal(reviewState(history).get('q').interval,1);
 history.push(attempt('q',true,'sure',7));assert.equal(reviewMatch(reviewState(history).get('q'),'learning'),false);assert.equal(reviewState(history).get('q').interval,1);
 history.push(attempt('q',false,'sure',8));assert.equal(reviewState(history).get('q').streak,0);
});
test('一律給分與任一單選給分不灌入複習，未作答題不列入到期',()=>{
 const states=reviewState([attempt('all',true,'guess',0,{allAward:true}),attempt('excluded',true,'unsure',0,{excludeFromAccuracy:true})]);assert.equal(states.size,0);assert.equal(reviewMatch(undefined,'due',start),false);
 const legacy=reviewState([{id:'old',correct:false}]).get('old');assert.equal(reviewMatch(legacy,'due',start),true);
});
