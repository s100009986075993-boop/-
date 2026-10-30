const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const library=require('../data/references.json');
const search=require('../reference-model');
test('10份文件506頁來源完整且保持上傳原始檔雜湊',()=>{
 assert.equal(library.length,10);assert.equal(library.reduce((n,d)=>n+d.pageCount,0),506);
 for(const doc of library){assert.equal(doc.verifiedCurrent,false);assert.equal(doc.pages.length,doc.pageCount);
  doc.pages.forEach((page,i)=>assert.equal(page.page,i+1));
  assert.ok(fs.existsSync(path.join(__dirname,'..',doc.sourceText)));
  const bytes=fs.readFileSync(path.join(__dirname,'..',doc.sourcePdf));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),doc.sha256);
 }
});
test('隨機檔名正確辨識為無障礙規範，版本與施行警語保存',()=>{
 assert.equal(library.find(d=>d.filename==='e9abb44ff171074d23a7d1d5ee35b4a4.pdf').title,'建築物無障礙設施設計規範');
 assert.match(library.find(d=>d.id==='accessibility').version,/108/);
 assert.match(library.find(d=>d.id==='building-design-code').versionNote,/301/);
 assert.match(library.find(d=>d.id==='building-design-code').versionNote,/115年7月1日/);
 assert.match(library.find(d=>d.id==='exam-outline-114').version,/114/);
 assert.equal(library.find(d=>d.id==='eewh-bc-2026').version,'2026年版');
});
test('條號搜尋容許空白、全形與跨行，限定文件且頁碼可追溯',()=>{
 const base=search.search(library,'第140條','building-design-code');assert.ok(base.length);
 assert.deepEqual(search.search(library,'第 140 條','building-design-code'),base);
 assert.deepEqual(search.search(library,'第１４０條','building-design-code'),base);
 for(const hit of base){assert.equal(hit.documentId,'building-design-code');const doc=library.find(d=>d.id===hit.documentId);assert.ok(hit.page>=1&&hit.page<=doc.pageCount);assert.ok(search.normalize(doc.pages[hit.page-1].text).includes('第140條'));}
});
test('多關鍵字必須全部命中，空白及無結果有明確結果',()=>{
 const hits=search.search(library,'綠化 生物','eewh-bc-2026');assert.ok(hits.length);
 for(const hit of hits){const doc=library.find(d=>d.id===hit.documentId),text=search.normalize(doc.pages[hit.page-1].text);assert.ok(text.includes('綠化')&&text.includes('生物'));}
 assert.deepEqual(search.search(library,'   '),[]);assert.deepEqual(search.search(library,'zzzz-never-in-these-pdfs'),[]);
});
