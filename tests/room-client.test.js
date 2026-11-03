const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveRoomApi, buildRoomInvite } = require("../room-client-model");
const target = "https://architect-study-rooms.onrender.com";
test("舊版 null 設定或設定腳本遺失時，仍可使用同頁備援設定", () => {
  assert.equal(
    resolveRoomApi({ apiBase: null }, target, "https://example.com"),
    target,
  );
  assert.equal(
    resolveRoomApi(undefined, target, "https://example.com"),
    target,
  );
  assert.equal(
    resolveRoomApi({ apiBase: target + "/" }, target, "https://example.com"),
    target,
  );
});
test("明確停用時不使用備援；後端同來源與本機設定仍有效", () => {
  assert.equal(
    resolveRoomApi({ enabled: false, apiBase: target }, target, target),
    null,
  );
  assert.equal(
    resolveRoomApi({ apiBase: "" }, target, "http://127.0.0.1:3001"),
    "http://127.0.0.1:3001",
  );
  for (const value of [
    "javascript:alert(1)",
    "http://untrusted.example",
    "https://user:secret@example.com",
  ])
    assert.equal(resolveRoomApi({ apiBase: value }, target, target), null);
});
test("邀請直接使用遊戲服務來源，帶新版號及獨立快取參數，不含登入資料", () => {
  const first = new URL(
    buildRoomInvite(target, "ABC234", "release-8", "unique-one"),
  );
  assert.equal(first.origin, target);
  assert.equal(first.pathname, "/");
  assert.equal(first.hash, "#room=ABC234");
  assert.equal(first.searchParams.get("v"), "release-8");
  assert.equal(first.searchParams.get("invite"), "unique-one");
  assert.deepEqual([...first.searchParams.keys()], ["v", "invite"]);
  assert.notEqual(
    first.href,
    buildRoomInvite(target, "ABC234", "release-8", "unique-two"),
  );
  assert.throws(() => buildRoomInvite(target, "invalid", "r", "n"));
});

test("加入房間可貼上完整邀請或全形房號，不接受不合法字串", () => {
  const { parseRoomCode } = require("../room-client-model");
  assert.equal(parseRoomCode(" abc234 "), "ABC234");
  assert.equal(parseRoomCode("ＡＢＣ２３４"), "ABC234");
  assert.equal(
    parseRoomCode(
      "https://architect-study-rooms.onrender.com/?v=test#room=Abc234",
    ),
    "ABC234",
  );
  for (const value of [
    "",
    null,
    "123",
    "https://example.com/#other=ABC234",
    "javascript:alert(1)",
  ])
    assert.equal(parseRoomCode(value), "");
});
