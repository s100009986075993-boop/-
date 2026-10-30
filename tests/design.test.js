const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const papers=require('../data/design-papers.json');
const site=require('../data/site-papers.json');
const timer=require('../site-model');
test('18年設計原卷、8小時與完整附圖均保存',()=>{
 assert.equal(papers.length,18);
 papers.forEach((p,i)=>{assert.equal(p.year,97+i);assert.equal(p.subject,'建築計畫與設計');assert.equal(p.examMinutes,480);assert.equal(p.images.length,p.pages);
  for(const f of [...p.images,p.sourcePdf,p.sourceText])assert.ok(fs.existsSync(path.join(__dirname,'..',f)),f);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p.sourcePdf))).digest('hex'),p.sha256);
  assert.equal(p.answer,undefined);
 });
 assert.equal(papers.find(p=>p.year===103).pages,7);
 assert.equal(papers.find(p=>p.year===98).calculator,'禁止使用');
 assert.match(papers.find(p=>p.year===114).calculator,/可使用/);
});
test('設計與敷地同年有不同ID、檔案與時間，不會混用',()=>{
 assert.equal(new Set([...papers,...site].map(p=>p.id)).size,36);
 for(let i=0;i<18;i++){
  assert.notEqual(papers[i].sourcePdf,site[i].sourcePdf);
  assert.equal(papers[i].examMinutes,2*site[i].examMinutes);
 }
 const started=timer.start(timer.create(480),0);
 assert.equal(timer.format(timer.remaining(started,0)),'08:00:00');
 assert.equal(timer.format(timer.remaining(started,240*60000)),'04:00:00');
});
test('六科都有原始資料；設計試卷不灌入4320題選擇題',()=>{
 const {subjects}=require('../study');
 const mc=['structure','environment','law','construction'].flatMap(name=>require(`../data/${name}-bank.json`));
 assert.equal(mc.length,4320);
 const covered=new Set([...mc,...papers,...site].map(p=>p.subject));
 assert.deepEqual([...covered].sort(),subjects.slice().sort());
});
