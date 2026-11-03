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
  assert.equal(exported.version, 1);
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
  assert.throws(() => Backup.parse({ format: 'architect-study-backup', version: 2, data: {} }), /不支援/);
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
  assert.throws(() => Backup.restore(target, parsed), /已嘗試還原/);
  assert.equal(values.get('architect-history'), '[]');
  assert.equal(values.get('architect-answerflow'), '"instant"');
});
