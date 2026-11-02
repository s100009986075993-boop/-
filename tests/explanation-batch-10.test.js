const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const batch=require('../data/explanation-batch-20261102-10.json');const curated=require('../data/curated-explanations.json');const library=require('../data/references.json');
test('第十批50題確實同步到年度JSON、整合JSON及網站JS，仍保持草稿',()=>{
 assert.equal(batch.count,50);assert.equal(new Set(batch.questionIds).size,50);
 for(const [slug,variable,count] of [['structure','officialBank',20],['environment','environmentBank',30]]){
  const ids=batch.questionIds.filter(id=>id.includes('-'+slug+'-'));assert.equal(ids.length,count);
  const bank=require(`../data/${slug}-bank.json`);const client=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`);
  for(const id of ids){const q=bank.find(q=>q.id===id);assert.ok(q,id);assert.equal(q.explanationStatus,'draft');assert.equal(q.explanationBatch,batch.batchId);assert.ok(q.solution.length>70,id);assert.equal(q.optionExplanations.length,4);assert.ok(q.memoryTip.length>10,id);
   const year=require(`../data/${q.year}-${slug}.json`).find(q=>q.id===id);const browser=client.find(q=>q.id===id);
   for(const record of [q,year,browser]){assert.equal(record.solution,curated[id].solution,id);assert.equal(record.memoryTip,curated[id].memoryTip,id);assert.deepEqual(Array.from(record.optionExplanations),curated[id].optionExplanations,id);}
  }
 }
});

test('第七至十批共200個不同題號，均有詳解草稿',()=>{
 const batches=['07','08','09','10'].map(n=>require('../data/explanation-batch-20261102-'+n+'.json'));const ids=batches.flatMap(b=>b.questionIds);assert.equal(ids.length,200);assert.equal(new Set(ids).size,200);for(const id of ids){assert.ok(curated[id].solution.length>70,id);assert.equal(curated[id].optionExplanations.length,4,id);}
});
