const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {validateBank,isCorrect,stats}=require('../study');
const bank=require('../data/law-bank.json');
const q=(year,n)=>bank.find(q=>q.id===`${year}-law-${String(n).padStart(2,'0')}`);
test('三科2880題ID唯一，法規每年80題，所有題號與來源完整',()=>{
 const all=[...bank,...require('../data/environment-bank.json'),...require('../data/structure-bank.json')];
 assert.equal(all.length,2880);validateBank(all);
 for(let year=97;year<=114;year++){
  const manifest=require(`../data/${year}-law-manifest.json`);
  assert.equal(bank.filter(q=>q.year===year).length,80);
  assert.equal(manifest.answerRows.length,80);
  for(let n=1;n<=80;n++){
   const item=q(year,n);assert.equal(item.subject,'營建法規與實務');assert.match(item.regulation,/非現行法規結論/);
   for(const f of [item.image,item.sourcePdf,item.answerSource])assert.ok(fs.existsSync(path.join(__dirname,'..',f)),f);
   const a=manifest.answerRows[n-1];
   if(a==='#')assert.ok(manifest.corrections.some(c=>c.number===n&&c.rule));
   else assert.equal(item.answer,a.charCodeAt(0)-65);
  }
 }
});
test('所有更正逐題比對16種組合，包含跨行備註',()=>{
 for(let year=97;year<=114;year++){
  const manifest=require(`../data/${year}-law-manifest.json`);
  for(const correction of manifest.corrections){const rule=correction.rule,item=q(year,correction.number);
   assert.ok(rule);
   for(let mask=0;mask<16;mask++){
    const selected=[0,1,2,3].filter(i=>mask&(1<<i));
    const expected=rule.allAward||rule.sets.some(s=>s.length===selected.length&&s.every(i=>selected.includes(i)));
    assert.equal(isCorrect(item,selected),expected,`${item.id} mask=${mask}`);
   }
  }
 }
});
test('104年第25題只接受A/B/D及其指定組合，不可包含C',()=>{
 const item=q(104,25);assert.equal(item.acceptedSelections.length,7);
 for(const selected of [[0],[1],[3],[0,1],[0,3],[1,3],[0,1,3]])assert.ok(isCorrect(item,selected));
 for(const selected of [[],[2],[0,2],[0,1,2,3]])assert.equal(isCorrect(item,selected),false);
 assert.ok(isCorrect(q(104,72),[1,3]));
});
test('108年第56題接受15種非空選取組合，空白不給分且排除正確率',()=>{
 const item=q(108,56);assert.equal(item.allAward,false);assert.ok(item.excludeFromAccuracy);assert.equal(item.acceptedSelections.length,15);
 for(let mask=1;mask<16;mask++)assert.ok(isCorrect(item,[0,1,2,3].filter(i=>mask&(1<<i))));
 assert.equal(isCorrect(item,[]),false);
 assert.deepEqual(stats([{correct:true,excludeFromAccuracy:true},{correct:false}]),{total:1,correct:0,accuracy:0});
});
test('單一答案更正必須覆蓋原答案',()=>{
 assert.deepEqual(q(98,14).acceptedAnswers,[1]);assert.deepEqual(q(100,31).acceptedAnswers,[3]);assert.deepEqual(q(100,73).acceptedAnswers,[1]);assert.deepEqual(q(113,2).acceptedAnswers,[3]);
 assert.equal(isCorrect(q(113,2),0),false);
});
test('保存的原始PDF雜湊與匯入紀錄一致',()=>{
 for(let year=97;year<=114;year++){
  const m=require(`../data/${year}-law-manifest.json`);
  for(const [filename,expected] of Object.entries(m.files)){
   const local=filename.endsWith('_試題.pdf')?'questions.pdf':filename.endsWith('_更正答案.pdf')?'corrected-answers.pdf':'answers-upload.pdf';
   const data=fs.readFileSync(path.join(__dirname,`../assets/${year}-law/${local}`));
   assert.equal(crypto.createHash('sha256').update(data).digest('hex'),expected);
  }
 }
});
