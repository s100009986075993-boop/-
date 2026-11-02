const REVIEW_DAY=24*60*60*1000;
const REVIEW_INTERVALS=[1,3,7,14];
function reviewState(history){
 const map=new Map();
 for(const answer of history){
  if(!answer||typeof answer.id!=='string'||answer.allAward||answer.excludeFromAccuracy)continue;
  const previous=map.get(answer.id);
  // Legacy correct answers retain their original meaning; new answers record confidence explicitly.
  const confident=answer.correct&&(answer.confidence===undefined||answer.confidence==='sure');
  const streak=confident?(previous?.streak||0)+1:0;
  const needsReview=!confident;
  const interval=REVIEW_INTERVALS[Math.min(Math.max(streak-1,0),REVIEW_INTERVALS.length-1)];
  const time=Date.parse(answer.at);
  map.set(answer.id,{id:answer.id,needsReview,streak,confidence:answer.confidence||'legacy',correct:!!answer.correct,dueAt:Number.isFinite(time)?time+interval*REVIEW_DAY:0,interval});
 }
 return map;
}
function reviewMatch(state,mode,now=Date.now()){
 if(!state)return false;
 if(mode==='learning')return state.needsReview;
 if(mode==='due')return state.dueAt<=now;
 return false;
}
if(typeof module!=='undefined')module.exports={reviewState,reviewMatch,REVIEW_DAY};
