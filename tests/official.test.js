const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validateBank,isCorrect,answerText}=require('../study');
const bank=require('../data/97-structure.json');
test('97 年 40 題全部有效並保留題圖與來源',()=>{
 assert.equal(bank.length,40);validateBank(bank);
 bank.forEach((q,i)=>{assert.equal(q.id,`97-structure-${String(i+1).padStart(2,'0')}`);for(const f of [q.image,q.sourcePdf,q.answerSource])assert.ok(fs.existsSync(path.join(__dirname,'..',f)));});
});
test('第25題依更正表接受B、C並拒絕A、D',()=>{
 const q=bank[24];assert.ok(isCorrect(q,1));assert.ok(isCorrect(q,2));assert.equal(isCorrect(q,0),false);assert.equal(isCorrect(q,3),false);assert.match(answerText(q),/B.*或.*C/);
});
test('每題答案與擷取的更正表一致',()=>{
 const expected='BDCBADBCBBBDCBDDBACDBADC#DCDCD BCADC AACAD'.replaceAll(' ','');
 assert.equal(expected.length,40);
 bank.forEach((q,i)=>assert.equal(i===24?'#':String.fromCharCode(65+q.answer),expected[i]));
});
