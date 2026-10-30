const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateBank,isCorrect,stats}=require('../study');
const bank=require('../data/structure-bank.json');
const q=(year,n)=>bank.find(q=>q.id===`${year}-structure-${String(n).padStart(2,'0')}`);
test('18年份720題，編號及影像來源完整',()=>{
 validateBank(bank);assert.equal(bank.length,720);
 for(let year=97;year<=114;year++){
  assert.equal(bank.filter(q=>q.year===year).length,40);
  for(let n=1;n<=40;n++)for(const file of [q(year,n).image,q(year,n).sourcePdf,q(year,n).answerSource])assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);
 }
});
test('逐題比對各年擷取答案與備註，所有#都有規則',()=>{
 for(let y=98;y<=114;y++){
  const manifest=require(`../data/${y}-structure-manifest.json`);
  manifest.answerRows.forEach((letter,i)=>{
   const question=q(y,i+1);
   if(letter==='#')assert.ok(manifest.corrections.some(c=>c.number===i+1&&c.rule));
   else {assert.equal(question.answer,letter.charCodeAt(0)-65);assert.equal(isCorrect(question,question.answer),true);}
  });
 }
});
test('多答案與組合必須精確符合公告，不可任意多選',()=>{
 for(const [y,n,allowed] of [[100,38,[0,2]],[102,5,[2,3]],[113,18,[1,3]],[113,21,[0,1]]]){
  for(let i=0;i<4;i++)assert.equal(isCorrect(q(y,n),i),allowed.includes(i));
  assert.equal(isCorrect(q(y,n),allowed),false);
 }
 for(const [y,n,allowed] of [[105,28,[1,3]],[105,31,[1,2]],[106,18,[1,3]],[108,21,[0,1]],[111,35,[1,3]],[114,5,[0,2]]]){
  assert.ok(isCorrect(q(y,n),allowed));assert.ok(isCorrect(q(y,n),[...allowed].reverse()));
  for(const i of allowed)assert.ok(isCorrect(q(y,n),i));
  assert.equal(isCorrect(q(y,n),[0,1,2,3]),false);
 }
 assert.equal(isCorrect(q(107,11),0),true);assert.equal(isCorrect(q(107,11),1),false);
});
test('一律給分包含未選，且不灌高學習正確率',()=>{
 for(const [year,n] of [[99,14],[106,2],[106,7],[108,13],[109,22],[111,24],[112,21]]){
  const question=q(year,n);assert.ok(question.allAward);
  for(const selected of [[],0,1,2,3,[0,1,2,3]])assert.ok(isCorrect(question,selected));
 }
 assert.deepEqual(stats([{correct:true,allAward:true},{correct:false},{correct:true}]),{total:2,correct:1,accuracy:50});
});
