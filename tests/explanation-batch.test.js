const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const batch=require('../data/explanation-batch-20261102.json');const curated=require('../data/curated-explanations.json');
test('新增36題全部進入年度、整合及瀏覽器題庫，記憶提示和草稿狀態一致',()=>{
 assert.equal(batch.count,36);assert.equal(new Set(batch.questionIds).size,36);
 for(const [slug,variable,count] of [['structure','officialBank',23],['environment','environmentBank',13]]){
  const bank=require(`../data/${slug}-bank.json`);const browser=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`);
  const ids=batch.questionIds.filter(id=>id.includes('-'+slug+'-'));assert.equal(ids.length,count);
  for(const id of ids){
   const q=bank.find(q=>q.id===id);assert.ok(q,id);const original=require(`../data/${q.year}-${slug}.json`).find(q=>q.id===id);const client=browser.find(q=>q.id===id);
   assert.equal(q.explanationStatus,'draft',id);assert.equal(q.explanationBatch,batch.date,id);assert.ok(q.memoryTip.length>10,id);
   for(const record of [original,client]){assert.equal(record.solution,curated[id].solution,id);assert.equal(record.memoryTip,curated[id].memoryTip,id);assert.deepEqual(Array.from(record.optionExplanations),curated[id].optionExplanations,id);}
   assert.equal(q.optionExplanations.length,q.options.length,id);assert.ok(q.explanationSources.some(source=>source.url===q.sourcePdf&&source.page===q.sourcePage),id);assert.ok(q.explanationSources.some(source=>source.url===q.answerSource),id);
  }
 }
});
