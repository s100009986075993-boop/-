const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const batch=require('../data/explanation-batch-20261102-04.json');const curated=require('../data/curated-explanations.json');
test('第四批30題含12題結構與18題環控，三種發布資料一致且仍為草稿',()=>{
 assert.equal(batch.count,30);assert.equal(new Set(batch.questionIds).size,30);
 for(const [slug,variable,count] of [['structure','officialBank',12],['environment','environmentBank',18]]){
  const ids=batch.questionIds.filter(id=>id.includes('-'+slug+'-'));assert.equal(ids.length,count);
  const bank=require(`../data/${slug}-bank.json`);const client=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`);
  for(const id of ids){const q=bank.find(q=>q.id===id);assert.ok(q,id);assert.equal(q.explanationBatch,batch.batchId);assert.equal(q.explanationStatus,'draft');assert.ok(q.solution.length>100,id);assert.equal(q.optionExplanations.length,4);assert.ok(q.memoryTip.length>10,id);
   for(const record of [q,client.find(q=>q.id===id),require(`../data/${q.year}-${slug}.json`).find(q=>q.id===id)]){assert.equal(record.solution,curated[id].solution,id);assert.deepEqual(Array.from(record.optionExplanations),curated[id].optionExplanations,id);assert.equal(record.memoryTip,curated[id].memoryTip,id);}
   assert.ok(q.explanationSources.some(s=>s.url===q.sourcePdf&&s.page===q.sourcePage),id);assert.ok(q.explanationSources.some(s=>s.url===q.answerSource),id);
  }
 }
});
