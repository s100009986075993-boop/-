const {test}=require('node:test');const assert=require('node:assert/strict');const {adventureProgress}=require('../adventure-model');
test('冒險只獎勵不同正式題目；首次答對可補經驗，重刷不灌分',()=>{
 const a={id:'106-law-41',playMode:'adventure',correct:false};
 assert.equal(adventureProgress([a,a]).xp,2);
 assert.equal(adventureProgress([a,{...a,correct:true},{...a,correct:true}]).xp,10);
 assert.equal(adventureProgress([{...a,playMode:'random'},{...a,allAward:true},{...a,excludeFromAccuracy:true},{...a,id:'demo-1'}]).xp,0);
});
test('等級與成就以實際探索、答對與完成回數計算',()=>{
 const h=Array.from({length:100},(_,i)=>({id:`106-law-${i+1}`,playMode:'adventure',correct:i<10}));
 const p=adventureProgress(h,5);assert.equal(p.xp,280);assert.equal(p.level,3);assert.equal(p.badges.length,4);
});
