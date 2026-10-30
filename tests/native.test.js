const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const bank=['structure','environment','law','construction'].flatMap(slug=>require(`../data/${slug}-bank.json`));
const q=id=>bank.find(q=>q.id===id);
test('4320題有原生題幹與四選項，無佔位文字或未顯示字元',()=>{
 assert.equal(bank.length,4320);
 for(const item of bank){assert.ok(item.question.length>5,item.id);assert.equal(item.options.length,4);
  for(const text of [item.question,...item.options]){assert.ok(text.trim());assert.doesNotMatch(text,/原題選項|[\ue000-\uf8ff]/,item.id);}
  assert.ok(['native','needs-review'].includes(item.textStatus));assert.ok(item.questionNo>0);
  for(const d of item.diagrams||[])assert.ok(fs.existsSync(path.join(__dirname,'..',d.src)));
 }
});
test('文字轉錄完全不變更原始官方答案與更正規則',()=>{
 const baseline=require('../data/native-score-baseline.json');
 const scores=bank.map(q=>Object.fromEntries(['id','answer','acceptedAnswers','acceptedSelections','allAward','excludeFromAccuracy'].map(k=>[k,q[k]??null])));
 // Python used a canonical key order; sort recursively before comparison.
 const canonical=JSON.stringify(scores.map(q=>Object.fromEntries(Object.entries(q).sort(([a],[b])=>a.localeCompare(b)))));
 assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'),baseline.sha256);
 assert.equal(baseline.count,4320);
});
test('範例純文字與圖形選項正確分離，承上題附前提',()=>{
 assert.match(q('106-construction-04').question,/甲醛/);assert.deepEqual(q('106-construction-04').options,['鋁板','貼木皮複合板','玻璃','檜木板']);
 assert.equal(q('106-construction-04').diagrams.length,0);
 assert.match(q('106-construction-26').question,/直徑12/);assert.deepEqual(q('106-construction-26').options,['圖示 A','圖示 B','圖示 C','圖示 D']);assert.ok(q('106-construction-26').diagrams.length);
 assert.equal(q('104-law-20').options[3],'L2＋L4＋L6');assert.match(q('104-law-06').question,/前題條件/);
 assert.match(q('97-structure-30').question,/75 t\/m²/);assert.deepEqual(q('97-structure-30').options,['50 cm','60 cm','70 cm','80 cm']);
});
test('23題詳細解析草稿均有解題步驟、四選項理由與真實來源',()=>{
 const detailed=bank.filter(q=>q.solution);assert.equal(detailed.length,23);
 for(const item of detailed){assert.equal(item.explanationStatus,'draft');assert.ok(item.solution.length>70,item.id);assert.equal(item.optionExplanations.length,4);
  item.optionExplanations.forEach(text=>{assert.ok(text.trim(),item.id);assert.doesNotMatch(text,/解析待補充|此選項的觀念解析待補充/);});
  for(const source of item.explanationSources)assert.ok(fs.existsSync(path.join(__dirname,'..',source.url)));
 }
 assert.match(q('106-environment-10').solution,/25 m³\/h/);assert.match(q('97-structure-30').solution,/0.8 m/);
 assert.equal(q('114-law-01').explanationStatus,'pending');
});
