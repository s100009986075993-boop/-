const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const batch=require('../data/explanation-batch-20261102-02.json');const curated=require('../data/curated-explanations.json');const library=require('../data/references.json');
test('第二批50題確實同步到年度JSON、整合JSON及網站JS，仍保持草稿',()=>{
 assert.equal(batch.count,50);assert.equal(new Set(batch.questionIds).size,50);
 for(const [slug,variable,count] of [['structure','officialBank',18],['environment','environmentBank',20],['law','lawBank',12]]){
  const ids=batch.questionIds.filter(id=>id.includes('-'+slug+'-'));assert.equal(ids.length,count);
  const bank=require(`../data/${slug}-bank.json`);const client=vm.runInNewContext(fs.readFileSync(`data/${slug}-bank.js`,'utf8')+`;${variable}`);
  for(const id of ids){const q=bank.find(q=>q.id===id);assert.ok(q,id);assert.equal(q.explanationStatus,'draft');assert.equal(q.explanationBatch,batch.batchId);assert.ok(q.solution.length>100,id);assert.equal(q.optionExplanations.length,4);assert.ok(q.memoryTip.length>10,id);
   const year=require(`../data/${q.year}-${slug}.json`).find(q=>q.id===id);const browser=client.find(q=>q.id===id);
   for(const record of [q,year,browser]){assert.equal(record.solution,curated[id].solution,id);assert.equal(record.memoryTip,curated[id].memoryTip,id);assert.deepEqual(Array.from(record.optionExplanations),curated[id].optionExplanations,id);}
  }
 }
});
test('12題法規均有可讀取的特定上傳版本條文頁碼，不冒充現行法規',()=>{
 for(const id of batch.questionIds.filter(id=>id.includes('-law-'))){const item=curated[id];const reference=item.lawReference;const document=library.find(d=>d.id===reference.documentId);assert.ok(document,id);assert.equal(reference.version,document.version,id);const page=document.pages.find(p=>p.page===reference.page);assert.ok(page,id);assert.match(page.text,new RegExp('第\\s*'+reference.article+'\\s*條'),id);assert.ok(item.extraSources.some(s=>s.url===document.sourcePdf&&s.page===reference.page),id);assert.match(item.regulation,/非現行法規結論/);assert.match(item.regulation,/97年/);}
});
