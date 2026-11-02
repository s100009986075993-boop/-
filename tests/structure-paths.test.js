const {test}=require('node:test');
const assert=require('node:assert/strict');
const bank=require('../data/structure-bank.json');
const topics=require('../data/structure-topics');
const {structureCategory,matchesStructure,structureGuides}=require('../structure-model');
test('結構分流互斥且涵蓋全部720題，待分類不冒充力學',()=>{
 const lanes=['systems','mechanics','pending'];
 const counts=lanes.map(lane=>bank.filter(q=>matchesStructure(q,topics,lane)).length);
 assert.deepEqual(counts,[109,22,589]);
 for(const q of bank)assert.equal(lanes.filter(lane=>matchesStructure(q,topics,lane)).length,1,q.id);
 const ids=new Set(bank.map(q=>q.id));for(const id of Object.keys(topics))assert.ok(ids.has(id),id);
 const pending=bank.find(q=>!topics[q.id]);assert.equal(structureCategory(pending,topics).lane,'pending');assert.equal(matchesStructure(pending,topics,'mechanics'),false);
 assert.equal(matchesStructure({id:'demo',subject:'營建法規與實務'},topics),false);
});
test('管式、形抗、耐震配置與隔震概念分流，量化格子梁題留在力學',()=>{
 for(const id of ['97-structure-10','97-structure-11','97-structure-35','99-structure-21','109-structure-02'])assert.equal(topics[id].lane,'systems',id);
 for(const id of ['97-structure-20','100-structure-03','108-structure-26','113-structure-18'])assert.equal(topics[id].lane,'mechanics',id);
 for(const q of bank.filter(q=>matchesStructure(q,topics,'systems'))){const topic=topics[q.id].topic;assert.ok(structureGuides[topic]?.length,topic);assert.ok(matchesStructure(q,topics,'systems',topic));assert.equal(matchesStructure(q,topics,'systems','受力、變形與計算'),false);}
});
