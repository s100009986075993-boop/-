const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const timer=require('../site-model');
const papers=require('../data/site-papers.json');
test('18年原卷連續且每一頁與PDF均保存，原檔雜湊一致',()=>{
 assert.equal(papers.length,18);
 papers.forEach((p,i)=>{assert.equal(p.year,97+i);assert.equal(p.subject,'敷地計畫與都市設計');assert.equal(p.examMinutes,240);assert.equal(p.images.length,p.pages);
  for(const file of [...p.images,p.sourcePdf,p.sourceText])assert.ok(fs.existsSync(path.join(__dirname,'..',file)),file);
  const bytes=fs.readFileSync(path.join(__dirname,'..',p.sourcePdf));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256);
  assert.equal(p.answer,undefined);
 });
 assert.equal(papers.find(p=>p.year===105).pages,7);
});
test('倒數按實際時鐘計算，序列化重載後仍扣除離線時間',()=>{
 const started=timer.start(timer.create(20),1000);
 const restored=JSON.parse(JSON.stringify(started));
 assert.equal(timer.remaining(restored,61000),19*60000);
 assert.equal(timer.remaining(restored,1201001),0);
 assert.equal(timer.pause(restored,1201001).status,'finished');
});
test('暫停不扣時間，繼續沿用剩餘時間，不重新加滿',()=>{
 const started=timer.start(timer.create(60),0);
 const paused=timer.pause(started,60000);
 assert.equal(timer.remaining(paused,600000),59*60000);
 const resumed=timer.start(paused,600000);
 assert.equal(timer.remaining(resumed,660000),58*60000);
});
test('背景計時不依setInterval次數且到期不為負數',()=>{
 const started=timer.start(timer.create(240),1000);
 assert.equal(timer.format(timer.remaining(started,1000)),'04:00:00');
 assert.equal(timer.format(timer.remaining(started,1000+240*60000+10000)),'00:00:00');
 assert.equal(timer.start(timer.pause(started,1000+240*60000),20000000).status,'finished');
});
