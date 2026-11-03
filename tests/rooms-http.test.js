const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRoomServer } = require("../server/rooms.cjs");
test("HTTP 房間服務可用，保護來源、令牌、靜態路徑與 JSON 輸入", async (t) => {
  const { server } = createRoomServer();
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = "http://127.0.0.1:" + server.address().port;
  const call = (path, body, headers = {}) =>
    fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  assert.equal((await call("/health")).status, 200);
  assert.equal((await call("/.git/config")).status, 404);
  assert.equal((await call("/server/rooms.cjs")).status, 404);
  assert.equal((await call("/rooms-config.js")).status, 200);
  assert.equal(
    (
      await call(
        "/api/rooms",
        { name: "測試", count: 5 },
        { Origin: "https://untrusted.example" },
      )
    ).status,
    403,
  );
  const response = await call(
    "/api/rooms",
    { name: "甲", count: 5 },
    { Origin: "http://127.0.0.1:3000" },
  );
  assert.equal(response.status, 201);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "http://127.0.0.1:3000",
  );
  const a = await response.json();
  assert.equal((await call("/api/rooms/" + a.code)).status, 401);
  const b = await (
    await call("/api/rooms/" + a.code + "/join", { name: "乙" })
  ).json();
  const start = await call(
    "/api/rooms/" + a.code + "/start",
    {},
    { Authorization: "Bearer " + a.token },
  );
  assert.equal(start.status, 200);
  const state = await start.json();
  assert.equal(state.phase, "question");
  assert.equal(state.result, undefined);
  assert.equal(
    (
      await call("/api/rooms/" + a.code, undefined, {
        Authorization: "Bearer " + b.token,
      })
    ).status,
    200,
  );
  const invalid = await fetch(base + "/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  });
  assert.equal(invalid.status, 400);
});
