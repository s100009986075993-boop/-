const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {combinationStatements,isCorrect}=require('../study');
const fixes=require('../data/combination-transcription-fixes.json');
test('22題組合題完整保留原題分項，年度、整合JSON與瀏覽器資料一致',()=>{
 assert.equal(Object.keys(fixes).length,22);
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
    statements.forEach(statement=>assert.ok(statement.length>3,id));
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
