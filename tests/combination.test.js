const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {combinationStatements,isCorrect}=require('../study');
const fixes=require('../data/combination-transcription-fixes.json');
test('165題組合題完整保留原題分項，年度、整合JSON與瀏覽器資料一致',()=>{
 assert.equal(Object.keys(fixes).length,165);
 for(const [slug,variable] of [['structure','officialBank'],['environment','environmentBank'],['law','lawBank'],['construction','constructionBank']]){
  const bank=require(`../data/${slug}-bank.json`);
  const browserBank=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`);
  for(const [id,fix] of Object.entries(fixes)){
   const q=bank.find(q=>q.id===id);if(!q)continue;
   assert.equal(q.question,fix.question,id);
   assert.equal(browserBank.find(q=>q.id===id).question,q.question,id);
   assert.equal(require(`../data/${id.split('-')[0]}-${slug}.json`).find(q=>q.id===id).question,q.question,id);
   for(const option of q.options){
    const markers=option.match(/[①-⑳]/g)||[];
    assert.ok(markers.length,id);
    const statements=combinationStatements(q,option);
    assert.equal(statements.length,markers.length,id);
    statements.forEach(statement=>assert.ok(statement.length>=3,id));
   }
  }
 }
});
test('分項對照保留順序且不把組合題變成多選題',()=>{
 const q=require('../data/97-construction.json').find(q=>q.id==='97-construction-39');
 assert.deepEqual(combinationStatements(q,q.options[1]),['① 高壓水泥磚','③ 泡沫混凝土','② 五皮柏油油毛氈','④ 結構混凝土']);
 assert.ok(isCorrect(q,q.answer));assert.equal(isCorrect(q,[0,1,2,3]),false);
 assert.deepEqual(combinationStatements({question:'一般單選題'},'①②'),[]);
});

test('新增149題原卷圈號與分項修復可重建，含六題圖解選項',()=>{
 const repair=require('../data/combination-repair-20261103.json');const graphics=require('../data/combination-graphic-fixes.json');
 assert.equal(repair.questionIds.length,149);assert.equal(new Set(repair.questionIds).size,149);assert.equal(Object.keys(graphics).length,6);
 for(const id of repair.questionIds){const slug=id.split('-')[1],fix=fixes[id]||graphics[id];assert.ok(fix,id);
  const bank=require(`../data/${slug}-bank.json`),q=bank.find(q=>q.id===id);assert.equal(q.question,fix.question,id);assert.deepEqual(q.options,fix.options,id);
  const year=require(`../data/${id.split('-')[0]}-${slug}.json`).find(q=>q.id===id);assert.deepEqual(year.options,q.options,id);
  const variable={structure:'officialBank',environment:'environmentBank',law:'lawBank',construction:'constructionBank'}[slug];
  const client=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`).find(q=>q.id===id);assert.deepEqual(Array.from(client.options),q.options,id);
  if(graphics[id])assert.ok(q.diagrams.length,id);
 }
 const q=require('../data/106-law.json').find(q=>q.id==='106-law-41');assert.match(q.question,/①都市土地/);assert.match(q.question,/②非都市土地/);assert.match(q.question,/③國家公園土地/);assert.deepEqual(q.options,['①③','①②','②③','①②③']);assert.equal(q.answer,1);
});
test('PDF正規化保留圈號，也保留普通數字及全形數字的正常用途',()=>{
 const {execFileSync}=require('node:child_process');const result=execFileSync('python3',['-c',"import sys;sys.path.insert(0,'scripts');from native_questions import clean;assert clean('①② １２ cm2')=='①② 12 cm²';assert clean('12')=='12';assert clean('\\ue000\\ue001')=='①②'"],{encoding:'utf8'});assert.equal(result,'');
});
