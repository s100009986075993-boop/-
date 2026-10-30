const {test}=require('node:test');
const assert=require('node:assert/strict');
const {demo,subjects,validateBank,stats}=require('../study');
test('六科分類與示範題答案有效',()=>{assert.equal(subjects.length,6);for(const q of demo)assert.ok(q.options[q.answer]);});
test('匯入接受正式年份與完整題目',()=>{const q={...demo[0],id:'law-1',year:115};assert.equal(validateBank([q])[0].id,'law-1');});
test('拒絕錯誤答案索引、重複 ID 及不明科目',()=>{const q={...demo[0],year:115};for(const data of [[{...q,answer:9}],[q,q],[{...q,subject:'其他'}],[]])assert.throws(()=>validateBank(data));});
test('正確率由實際紀錄計算，空紀錄不除以零',()=>{assert.deepEqual(stats([]),{total:0,correct:0,accuracy:0});assert.equal(stats([{correct:true},{correct:false},{correct:true}]).accuracy,67);});
