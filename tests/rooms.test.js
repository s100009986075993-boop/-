const { test } = require("node:test");
const assert = require("node:assert/strict");
const { RoomEngine } = require("../server/room-engine.cjs");
const bank = Array.from({ length: 24 }, (_, i) => ({
  id: `100-law-${i + 1}`,
  year: 100,
  subject: "營建法規與實務",
  question: "原題 " + i,
  options: ["甲", "乙", "丙", "丁"],
  answer: 1,
  ...(i === 0 ? { acceptedSelections: [[0, 2]] } : {}),
}));
function setup(mode = "coop") {
  let now = 1000;
  const e = new RoomEngine(bank, { now: () => now, questionMs: 45000 });
  const a = e.create({ name: "房主", count: 5, mode }),
    b = e.join(a.code, { name: "朋友" });
  return { e, a, b, setTime: (v) => (now = v) };
}
const chosen = (e, code) => {
  const r = e.get(code),
    q = r.questions[r.index];
  return q.acceptedSelections?.[0] || [q.answer];
};
test("房間只允許 2～6 人、合法設定與不重複暱稱", () => {
  const e = new RoomEngine(bank);
  assert.throws(() => e.create({ name: " " }));
  assert.throws(() => e.create({ name: "我", count: 7 }));
  assert.throws(() => e.create({ name: "我", subject: "不存在" }));
  const a = e.create({ name: "我", count: 5 });
  assert.throws(() => e.start(a.code, a.token));
  for (let i = 0; i < 5; i++) e.join(a.code, { name: "玩家" + i });
  assert.throws(() => e.join(a.code, { name: "第七人" }));
  assert.equal(e.view(a.code, a.token).players.length, 6);
  const { e: e2, a: a2 } = setup();
  assert.throws(() => e2.join(a2.code, { name: "朋友" }));
});
test("非房主不能開始或推進，未加入者不能讀取房間", () => {
  const { e, a, b } = setup();
  assert.throws(() => e.start(a.code, b.token), { status: 403 });
  assert.throws(() => e.view(a.code, "invalid"), { status: 401 });
  e.start(a.code, a.token);
  assert.throws(() => e.next(a.code, b.token), { status: 403 });
  assert.throws(() => e.next(a.code, a.token), { status: 409 });
  assert.throws(() => e.join(a.code, { name: "遲到" }), { status: 409 });
});
test("大家同題；全員提交前不回傳答案、他人選擇或令牌；只由伺服器給分", () => {
  const { e, a, b } = setup();
  const s = e.start(a.code, a.token);
  assert.deepEqual(s.question, e.view(a.code, b.token).question);
  assert.equal(s.result, undefined);
  assert.equal(s.question.answer, undefined);
  const text = JSON.stringify(s);
  assert.ok(!text.includes(a.token));
  assert.ok(!text.includes(b.token));
  const selected = chosen(e, a.code);
  e.answer(a.code, a.token, {
    questionId: s.question.id,
    selected,
    score: 999,
    correct: true,
  });
  const waiting = e.view(a.code, b.token);
  assert.equal(waiting.phase, "question");
  assert.equal(waiting.result, undefined);
  assert.equal(waiting.mySelection, null);
  assert.equal(waiting.players.find((p) => p.id === a.playerId).score, 0);
  const wrong = [(selected[0] + 1) % 4];
  const result = e.answer(a.code, b.token, {
    questionId: s.question.id,
    selected: wrong,
  });
  assert.equal(result.phase, "reveal");
  assert.equal(result.players.find((p) => p.id === a.playerId).score, 1);
  assert.equal(result.players.find((p) => p.id === b.playerId).score, 0);
  assert.equal(result.damage, 1);
  assert.ok(result.result.answer);
});
test("拒絕重複答案、舊題目與非法選項，不能多次灌分", () => {
  const { e, a, b } = setup();
  const s = e.start(a.code, a.token);
  for (const selected of [[], [-1], [0, 0], [7], ["1"]])
    assert.throws(() =>
      e.answer(a.code, a.token, { questionId: s.question.id, selected }),
    );
  assert.throws(() =>
    e.answer(a.code, a.token, { questionId: "old", selected: [1] }),
  );
  const good = chosen(e, a.code);
  e.answer(a.code, a.token, { questionId: s.question.id, selected: good });
  assert.throws(
    () =>
      e.answer(a.code, a.token, { questionId: s.question.id, selected: good }),
    { status: 409 },
  );
  e.answer(a.code, b.token, { questionId: s.question.id, selected: good });
  assert.throws(
    () =>
      e.answer(a.code, a.token, { questionId: s.question.id, selected: good }),
    { status: 409 },
  );
  assert.equal(e.view(a.code, a.token).damage, 2);
});
test("到時自動揭答，未答記零分，逾時答案不接受", () => {
  const { e, a, b, setTime } = setup();
  const s = e.start(a.code, a.token);
  setTime(s.deadline);
  assert.throws(
    () =>
      e.answer(a.code, a.token, {
        questionId: s.question.id,
        selected: chosen(e, a.code),
      }),
    { status: 409 },
  );
  const v = e.view(a.code, b.token);
  assert.equal(v.phase, "reveal");
  assert.equal(v.damage, 0);
  assert.equal(v.result.players[0].selected, null);
  e.next(a.code, a.token);
  assert.equal(e.view(a.code, a.token).index, 1);
});
test("斷線保留身份，房主離線 30 秒後由在線玩家接手；離開不刪除已得分", () => {
  const { e, a, b, setTime } = setup();
  e.start(a.code, a.token);
  assert.equal(e.view(a.code, a.token).me, a.playerId);
  setTime(32001);
  const v = e.view(a.code, b.token);
  assert.equal(v.hostId, b.playerId);
  assert.equal(e.view(a.code, a.token).hostId, b.playerId);
  e.leave(a.code, b.token);
  assert.equal(e.view(a.code, a.token).hostId, a.playerId);
  assert.throws(() => e.view(a.code, b.token), { status: 401 });
});
test("完整競賽結算、不同題目與合作傷害不受客戶端分數影響", () => {
  const { e, a, b } = setup("versus");
  e.start(a.code, a.token);
  const ids = new Set();
  for (let i = 0; i < 5; i++) {
    const s = e.view(a.code, a.token);
    ids.add(s.question.id);
    const selected = chosen(e, a.code);
    e.answer(a.code, a.token, { questionId: s.question.id, selected });
    e.answer(a.code, b.token, { questionId: s.question.id, selected });
    e.next(a.code, a.token);
  }
  const done = e.view(a.code, a.token);
  assert.equal(ids.size, 5);
  assert.equal(done.phase, "finished");
  assert.equal(done.players[0].score, 5);
  assert.equal(done.players[1].score, 5);
  assert.equal(done.damage, 10);
  assert.throws(() => e.next(a.code, a.token));
});
test("過期房間和全部離開的房間會移除", () => {
  const { e, a, b, setTime } = setup();
  e.leave(a.code, a.token);
  e.leave(a.code, b.token);
  assert.throws(() => e.get(a.code), { status: 404 });
  const c = e.create({ name: "新房主", count: 5 });
  setTime(2 * 60 * 60 * 1000 + 1001);
  assert.throws(() => e.get(c.code), { status: 404 });
});
test("開始前已離開的玩家不增加 Boss 血量或出現在對戰名單", () => {
  const { e, a, b } = setup();
  const c = e.join(a.code, { name: "先離開" });
  e.leave(a.code, c.token);
  const state = e.start(a.code, a.token);
  assert.equal(state.players.length, 2);
  assert.equal(state.bossMax, 10);
});
