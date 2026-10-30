const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateBank,isCorrect}=require('../study');
const bank=require('../data/construction-bank.json');
const q=(year,n)=>bank.find(q=>q.id===`${year}-construction-${String(n).padStart(2,'0')}`);
test('四科4320題唯一，每年構造施工80題且原卷影像完整',()=>{
 const all=[...bank,...require('../data/law-bank.json'),...require('../data/environment-bank.json'),...require('../data/structure-bank.json')];
 assert.equal(all.length,4320);validateBank(all);
 for(let y=97;y<=114;y++){
  const m=require(`../data/${y}-construction-manifest.json`);
  assert.equal(bank.filter(q=>q.year===y).length,80);assert.equal(m.answerRows.length,80);
  for(let n=1;n<=80;n++){
   const item=q(y,n);assert.equal(item.subject,'建築構造與施工');
   for(const file of [item.image,item.sourcePdf,item.answerSource])assert.ok(fs.existsSync(path.join(__dirname,'..',file)));
   if(m.answerRows[n-1]==='#')assert.ok(m.corrections.some(c=>c.number===n&&c.rule));
   else assert.equal(item.answer,m.answerRows[n-1].charCodeAt(0)-65);
  }
 }
});
test('全部更正逐一測試16種答案組合',()=>{
 for(let y=97;y<=114;y++){
  const m=require(`../data/${y}-construction-manifest.json`);
  for(const c of m.corrections){assert.ok(c.rule);for(let mask=0;mask<16;mask++){
   const selected=[0,1,2,3].filter(i=>mask&(1<<i));
   const expected=c.rule.allAward||c.rule.sets.some(s=>s.length===selected.length&&s.every(i=>selected.includes(i)));
   assert.equal(isCorrect(q(y,c.number),selected),expected,`${y} Q${c.number} mask=${mask}`);
  }}
 }
});
test('112年第12題及34題只接受指定單選，不接受組合',()=>{
 for(const [n,allowed] of [[12,[0,2,3]],[34,[1,2,3]]]){
  for(let i=0;i<4;i++)assert.equal(isCorrect(q(112,n),i),allowed.includes(i));
  assert.equal(isCorrect(q(112,n),allowed),false);assert.equal(isCorrect(q(112,n),allowed.slice(0,2)),false);
 }
});
test('103年第66題與114年第41題接受七種指定組合',()=>{
 for(const [y,n,allowed] of [[103,66,[0,1,3]],[114,41,[1,2,3]]]){
  const item=q(y,n);assert.equal(item.acceptedSelections.length,7);
  assert.ok(isCorrect(item,allowed));assert.equal(isCorrect(item,[0,1,2,3]),false);assert.equal(isCorrect(item,[]),false);
 }
});
test('單一答案更正覆蓋原答案',()=>{
 for(const [y,n,correct] of [[107,7,0],[108,62,2],[112,50,1],[113,58,0]]){
  const item=q(y,n);assert.deepEqual(item.acceptedAnswers,[correct]);for(let i=0;i<4;i++)assert.equal(isCorrect(item,i),i===correct);
 }
});
test('97、98兩份答案相同且來源PDF雜湊正確',()=>{
 for(let y=97;y<=114;y++){
  const m=require(`../data/${y}-construction-manifest.json`);
  if(y<=98){assert.ok(m.identicalAnswerFiles);assert.ok(m.originalAnswerUnavailable);}
  for(const [filename,expected] of Object.entries(m.files)){
   const local=filename.endsWith('_試題.pdf')?'questions.pdf':filename.endsWith('_更正答案.pdf')?'corrected-answers.pdf':'answers-upload.pdf';
   const bytes=fs.readFileSync(path.join(__dirname,`../assets/${y}-construction/${local}`));
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected);
  }
 }
});
