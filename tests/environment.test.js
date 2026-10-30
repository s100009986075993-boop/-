const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateBank,isCorrect,stats}=require('../study');
const bank=require('../data/environment-bank.json');
const structure=require('../data/structure-bank.json');
const q=(year,n)=>bank.find(q=>q.id===`${year}-environment-${String(n).padStart(2,'0')}`);
test('兩科共1440題且ID不衝突，每年環控40題與來源完整',()=>{
 validateBank([...structure,...bank]);assert.equal(bank.length,720);
 for(let year=97;year<=114;year++){
  assert.equal(bank.filter(q=>q.year===year).length,40);
  const manifest=require(`../data/${year}-environment-manifest.json`);
  assert.equal(manifest.answerRows.length,40);
  for(let n=1;n<=40;n++){
   const item=q(year,n);assert.equal(item.subject,'建築環境控制');
   for(const file of [item.image,item.sourcePdf,item.answerSource])assert.ok(fs.existsSync(path.join(__dirname,'..',file)));
   const a=manifest.answerRows[n-1];
   if(a==='#')assert.ok(manifest.corrections.find(c=>c.number===n&&c.rule));
   else assert.equal(item.answer,a.charCodeAt(0)-65);
  }
 }
});
test('所有更正規則逐一測試16種選取組合',()=>{
 let corrections=0;
 for(let year=97;year<=114;year++){
  const manifest=require(`../data/${year}-environment-manifest.json`);
  for(const correction of manifest.corrections){corrections++;const item=q(year,correction.number),rule=correction.rule;
   for(let mask=0;mask<16;mask++){
    const selected=[0,1,2,3].filter(i=>mask&(1<<i));
    const expected=rule.allAward||rule.sets.some(s=>s.length===selected.length&&s.every(i=>selected.includes(i)));
    assert.equal(isCorrect(item,selected),expected,`${item.id} selection ${mask}`);
   }
  }
 }
 assert.equal(corrections,19);
});
test('100年第20題選任一單選給分，但空白或多選不給分，且排除正確率',()=>{
 const item=q(100,20);assert.equal(item.allAward,false);assert.ok(item.excludeFromAccuracy);
 for(let i=0;i<4;i++)assert.ok(isCorrect(item,i));
 assert.equal(isCorrect(item,[]),false);assert.equal(isCorrect(item,[0,1]),false);
 assert.deepEqual(stats([{correct:true,excludeFromAccuracy:true},{correct:false}]),{total:1,correct:0,accuracy:0});
});
test('98年兩份答案確實相同且無更正前版本',()=>{
 const manifest=require('../data/98-environment-manifest.json');assert.ok(manifest.identicalAnswerFiles);assert.ok(manifest.originalAnswerUnavailable);
 const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../assets/98-environment',f))).digest('hex');
 assert.equal(hash('answers-upload.pdf'),hash('corrected-answers.pdf'));
 assert.equal(isCorrect(q(98,16),1),true);assert.equal(isCorrect(q(98,16),2),true);assert.equal(isCorrect(q(98,16),[1,2]),false);
});
