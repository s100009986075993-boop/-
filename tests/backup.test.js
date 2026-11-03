const { test } = require('node:test');
const assert = require('node:assert/strict');
const Backup = require('../backup');

function store(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}
const attempt = { id: '108-law-14', subject: '營建法規與實務', selected: 2, correct: true, at: '2026-11-03T08:00:00.000Z' };
const note = { text: '核對條文適用年分', reason: '法規版本待查', updatedAt: '2026-11-03T08:00:00.000Z' };
const paper = { notes: '檢核基地條件', checks: [0, 2], session: { remainingMs: 60000, deadline: null, status: 'paused' }, updatedAt: null };

test('round-trip complete backup includes answers, notes, site/design records and preferences', () => {
  const from = store({
    'architect-history': JSON.stringify([attempt]),
    'architect-question-notes': JSON.stringify({ '108-law-14': note }),
    'architect-site-records': JSON.stringify({ '113-site': paper }),
    'architect-design-records': JSON.stringify({ '113-design': paper }),
    'architect-adventure-rounds': '2',
    'architect-answerflow': '"confirm"',
  });
  const exported = Backup.create(from, '2026-11-03T08:00:00.000Z');
  assert.equal(exported.version, 2);
  const parsed = Backup.parse(JSON.parse(JSON.stringify(exported)));
  const to = store({});
  Backup.restore(to, parsed);
  for (const key of Backup.keys) assert.equal(to.getItem(key), from.getItem(key), key);
});
test('legacy architect-progress backup restores only included learning records', () => {
  const target = store({
    'architect-history': '[]',
    'architect-site-records': JSON.stringify({ '113-site': paper }),
    'architect-adventure-rounds': '4',
  });
  const parsed = Backup.parse({ history: [attempt], questionNotes: { '108-law-14': note }, adventureRounds: 1 });
  assert.equal(parsed.kind, 'legacy');
  Backup.restore(target, parsed);
  assert.equal(JSON.parse(target.getItem('architect-history')).length, 1);
  assert.equal(target.getItem('architect-adventure-rounds'), '1');
  assert.deepEqual(JSON.parse(target.getItem('architect-site-records')), { '113-site': paper });
});
test('invalid backups do not alter saved data', () => {
  const target = store({ 'architect-history': '[]' });
  assert.throws(() => Backup.parse({ format: 'architect-study-backup', version: 999, data: {} }), /不支援/);
  assert.throws(() => Backup.parse({ history: [{ id: 'bad' }], questionNotes: {} }), /格式/);
  assert.throws(() => Backup.parse({ format: 'architect-study-backup', version: 1, data: { 'unknown-key': [] } }), /不支援/);
  assert.equal(target.getItem('architect-history'), '[]');
});
test('storage failure attempts rollback to previous values', () => {
  const values = new Map([['architect-history', '[]'], ['architect-answerflow', '"instant"']]);
  let once = false;
  const target = {
    getItem(k) { return values.has(k) ? values.get(k) : null; },
    setItem(k, v) {
      if (k === 'architect-answerflow' && !once) { once = true; throw Error('quota'); }
      values.set(k, v);
    },
    removeItem(k) { values.delete(k); },
  };
  const parsed = Backup.parse({
    format: 'architect-study-backup', version: 1,
    data: { 'architect-history': [attempt], 'architect-answerflow': 'confirm' },
  });
  assert.throws(() => Backup.restore(target, parsed), /已回復先前資料/);
  assert.equal(values.get('architect-history'), '[]');
  assert.equal(values.get('architect-answerflow'), '"instant"');
});

test('完整備份包含續練、題數及暱稱，但不含多人令牌或復原點',()=>{
 const source=store({'architect-history':JSON.stringify([attempt]),'architect-questioncount':'40','architect-room-name':'小林','architect-backup-recovery':'private','architect-room-session':'private-token'});
 const out=Backup.create(source);assert.equal(out.data['architect-room-name'],'小林');assert.equal(out.data['architect-questioncount'],40);assert.ok(!JSON.stringify(out).includes('private'));assert.ok(!('architect-room-session'in out.data));
});
test('v1備份缺少欄位不刪除目前筆記、題庫、題數或偏好',()=>{
 const target=store({'architect-history':'[]','architect-question-notes':JSON.stringify({'108-law-14':note}),'architect-questioncount':'80'});
 Backup.restore(target,Backup.parse({format:'architect-study-backup',version:1,data:{'architect-history':[attempt]}}));assert.equal(target.getItem('architect-questioncount'),'80');assert.equal(JSON.parse(target.getItem('architect-question-notes'))['108-law-14'].text,note.text);
});
test('合併不重複相同作答、依時間排序並保留本機衝突內容',()=>{
 const older={...attempt,at:'2026-11-02T08:00:00.000Z'},current={...note,text:'本機筆記'};
 const target=store({'architect-history':JSON.stringify([attempt]),'architect-question-notes':JSON.stringify({'108-law-14':current}),'architect-adventure-rounds':'5','architect-answerflow':'"instant"'});
 const parsed=Backup.parse({history:[older,{correct:true,subject:attempt.subject,selected:2,id:attempt.id,at:attempt.at}],questionNotes:{'108-law-14':note,'other-question':note},adventureRounds:2});Backup.restore(target,parsed,{mode:'merge'});
 assert.deepEqual(JSON.parse(target.getItem('architect-history')).map(a=>a.at),[older.at,attempt.at]);assert.equal(JSON.parse(target.getItem('architect-question-notes'))['108-law-14'].text,'本機筆記');assert.ok(JSON.parse(target.getItem('architect-question-notes'))['other-question']);assert.equal(target.getItem('architect-adventure-rounds'),'5');
});
test('格式錯誤、自訂題庫衝突、不安全欄位和未來版本不能寫入',()=>{
 const cases=[{'architect-bank':[{}]},{'architect-bank':[{id:'demo-1',year:115,subject:'建築結構',chapter:'測試',question:'問題',options:['A','B'],answer:0,explanation:'解析',regulation:'依據'}]},{'architect-history':[{...attempt,selected:[1,1]}]},{'architect-design-records':{'115-design':{...paper,session:{remainingMs:1000,deadline:null,status:'running'}}}}];
 for(const data of cases)assert.throws(()=>Backup.parse({format:'architect-study-backup',version:2,data}));
 assert.throws(()=>Backup.parse(JSON.parse('{"format":"architect-study-backup","version":2,"data":{"architect-question-notes":{"__proto__":{"text":"x","reason":""}}}}')));
 assert.throws(()=>Backup.parse({format:'architect-study-backup',version:999,data:{},history:[attempt],questionNotes:{}}));
});
test('官方與原創內建題號皆不可經備份取代，空自訂題庫可還原',()=>{
 for(const id of['114-law-01','original-structure-001'])assert.throws(()=>Backup.parse({format:'architect-study-backup',version:2,data:{'architect-bank':[{id,year:115,subject:'建築結構',chapter:'測試',question:'問題',options:['A','B'],answer:0,explanation:'解析',regulation:'依據'}]}}));
 assert.doesNotThrow(()=>Backup.parse({format:'architect-study-backup',version:2,data:{'architect-bank':[]}}));
});
test('無法建立復原點時，原資料完全不變',()=>{
 const values=new Map([['architect-history','[]']]);const target={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(k===Backup.recoveryKey)throw Error('quota');values.set(k,v);},removeItem:k=>values.delete(k)};
 assert.throws(()=>Backup.restore(target,Backup.parse({history:[attempt],questionNotes:{}})),/還原未開始/);assert.equal(values.get('architect-history'),'[]');assert.equal(values.size,1);
});
test('復原點可回復還原前所有資料，不動無關鍵值',()=>{
 const target=store({'architect-history':'[]','unrelated':'keep'});Backup.restore(target,Backup.parse({history:[attempt],questionNotes:{'108-law-14':note}}));assert.ok(Backup.checkpoint(target));Backup.recover(target);assert.equal(target.getItem('architect-history'),'[]');assert.equal(target.getItem('architect-question-notes'),null);assert.equal(target.getItem('unrelated'),'keep');
});
test('寫入持續失敗時保留有效復原點，不假稱回滾成功',()=>{
 const values=new Map([['architect-history','[]'],['architect-answerflow','"instant"']]);let fail=false;
 const target={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>{if(k==='architect-answerflow'){fail=true;throw Error('failed');}if(k==='architect-history'&&fail)throw Error('rollback denied');values.set(k,v);},removeItem:k=>values.delete(k)};
 const parsed=Backup.parse({format:'architect-study-backup',version:2,data:{'architect-history':[attempt],'architect-answerflow':'confirm'}});assert.throws(()=>Backup.restore(target,parsed),/部分項目無法/);assert.ok(Backup.checkpoint(target));
});
test('續練必須與同份歷史和題庫一致，還原不延長模擬截止時間',()=>{
 const a={...attempt,id:'114-law-01'};const session={version:1,ids:[a.id,'114-law-02'],answers:[a],mode:'exam',exam:true,deadline:10000,roundNotice:'',savedAt:5000};
 const parsed=Backup.parse({format:'architect-study-backup',version:2,data:{'architect-history':[a],'architect-practice-session':session}});const target=store();Backup.restore(target,parsed);assert.equal(JSON.parse(target.getItem('architect-practice-session')).deadline,10000);
 assert.throws(()=>Backup.restore(store(),Backup.parse({format:'architect-study-backup',version:2,data:{'architect-practice-session':session}})),/不一致/);
});
