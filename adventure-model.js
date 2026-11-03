// Rewards depend on distinct official questions, so repeat attempts cannot farm XP.
function adventureProgress(history,rounds=0){
 const seen=new Set(),correct=new Set();
 for(const a of history){if(a.playMode!=='adventure'||a.allAward||a.excludeFromAccuracy||!/^\d+-(structure|environment|law|construction)-\d+$/.test(a.id))continue;seen.add(a.id);if(a.correct)correct.add(a.id);}
 const xp=seen.size*2+correct.size*8;
 const badges=[];if(rounds>=1)badges.push('初次遠征');if(correct.size>=10)badges.push('十題斬');if(seen.size>=100)badges.push('百題探險家');if(rounds>=5)badges.push('持續前進');
 return {xp,level:1+Math.floor(xp/100),seen:seen.size,correct:correct.size,badges};
}
if(typeof module!=='undefined')module.exports={adventureProgress};
