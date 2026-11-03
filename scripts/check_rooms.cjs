const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    const errors = [];
    const c1 = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      }),
      c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const a = await c1.newPage(),
      b = await c2.newPage();
    for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
    const base = process.argv[2] || "http://127.0.0.1:3001";
    await a.goto(base);
    await a.locator("#rooms-start").click();
    await a.locator("#room-name").fill("勇者甲");
    await a.locator("#room-count").selectOption("5");
    await a.getByRole("button", { name: "建立房間", exact: true }).click();
    await a.locator(".room-heading h3").waitFor();
    const code = await a.evaluate(
      () => JSON.parse(sessionStorage.getItem("architect-room-session")).code,
    );
    await b.goto(base + "/#room=" + code);
    assert.equal(await b.locator("#room-code").inputValue(), code);
    await b.locator("#room-name").fill("勇者乙");
    await b.getByRole("button", { name: "加入房間", exact: true }).click();
    await b.locator(".room-heading h3").waitFor();
    await a.waitForFunction(
      () => document.querySelectorAll(".room-player").length === 2,
    );
    await a.getByRole("button", { name: "全員到齊，開始挑戰" }).click();
    await a.locator(".room-option").first().waitFor();
    await b.locator(".room-option").first().waitFor();
    const answer = async (p) => {
      const selected = await p.evaluate(async () => {
        const session = JSON.parse(
          sessionStorage.getItem("architect-room-session"),
        );
        const response = await fetch("/api/rooms/" + session.code, {
          headers: { Authorization: "Bearer " + session.token },
        });
        const state = await response.json();
        return selectionSets(bank.find((q) => q.id === state.question.id))[0];
      });
      for (const i of selected) await p.locator(".room-option").nth(i).click();
    };
    const submit = async (p) => {
      await p.locator(".room-submit").click();
    };
    for (let i = 0; i < 5; i++) {
      await a.locator(".room-submit").waitFor();
      await b.locator(".room-submit").waitFor();
      assert.equal(
        await a.locator("#room-content .question-stem").innerText(),
        await b.locator("#room-content .question-stem").innerText(),
      );
      assert.equal(await a.locator(".room-result").count(), 0);
      assert.equal(await b.locator(".room-result").count(), 0);
      await answer(a);
      await answer(b);
      await submit(a);
      await a.waitForFunction(() =>
        document.querySelector(".room-submit")?.textContent.includes("已提交"),
      );
      assert.equal(await a.locator(".room-result").count(), 0);
      // The other player's submission must not clear a local, unsubmitted choice.
      await b.waitForFunction(() =>
        document
          .querySelectorAll(".room-player")[0]
          .textContent.includes("已提交"),
      );
      assert.ok((await b.locator(".room-option.selected").count()) > 0);
      if (i === 0) {
        await b.reload();
        await b.locator(".room-submit").waitFor();
        assert.equal(await b.locator(".room-player").count(), 2);
        await answer(b);
      }
      if (i === 1) {
        await c2.setOffline(true);
        await b.waitForTimeout(1600);
        await c2.setOffline(false);
        await b.waitForFunction(
          () =>
            document
              .getElementById("room-notice")
              .textContent.includes("已連線"),
          {},
          { timeout: 15000 },
        );
      }
      await submit(b);
      await a.locator(".room-result").waitFor();
      await b.locator(".room-result").waitFor();
      assert.ok(
        (await a.locator(".room-result").innerText()).includes("答對 +1 分"),
      );
      await a.screenshot({ path: "/tmp/rooms-desktop.png", fullPage: true });
      await b.screenshot({ path: "/tmp/rooms-mobile.png", fullPage: true });
      const previous = await a.locator(".room-next").innerText();
      await a.locator(".room-next").click();
      await a.waitForFunction(() => !document.querySelector(".room-next"));
      if (i < 4)
        await b.waitForFunction(
          () =>
            !document.querySelector(".room-next") &&
            !document.querySelector(".room-result"),
        );
    }
    await a.locator(".room-ranking").waitFor();
    await b.locator(".room-ranking").waitFor();
    assert.ok((await a.locator(".room-ranking").innerText()).includes("5 / 5"));
    assert.ok(
      (await a.locator("#room-content").innerText()).includes("合作成功"),
    );
    for (const p of [a, b])
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    assert.deepEqual(errors, []);
    console.log(
      "PASS real two-client room: invite, same questions, hidden results, draft retention, reconnect, 5 rounds, Boss damage and ranking",
    );
    await a
      .getByRole("button", { name: "離開並開新房間", exact: true })
      .click();
    await b
      .getByRole("button", { name: "離開並開新房間", exact: true })
      .click();
    await a.locator("#room-name").waitFor();
    await a.locator("#room-mode").selectOption("versus");
    await a.getByRole("button", { name: "建立房間", exact: true }).click();
    await a.locator(".room-heading h3").waitFor();
    assert.ok((await a.locator(".room-mode-tag").innerText()).includes("競賽"));
    console.log("PASS competition lobby");
    const staticPage = await browser.newPage();
    await staticPage.route("**/rooms-config.js?*", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.ARCHITECT_ROOMS = {apiBase: null};",
      }),
    );
    await staticPage.goto("http://127.0.0.1:3000");
    await staticPage.locator("#rooms-start").click();
    assert.equal(await staticPage.locator(".room-unavailable").count(), 1);
    assert.equal(await staticPage.locator("#room-name").count(), 0);
    console.log(
      "PASS explicitly disabled configuration reports service unavailable",
    );
    const configuredPage = await browser.newPage();
    await configuredPage.goto("http://127.0.0.1:3000");
    await configuredPage.locator("#rooms-start").click();
    assert.equal(await configuredPage.locator("#room-name").count(), 1);
    assert.equal(
      await configuredPage.evaluate(() => window.ARCHITECT_ROOMS.apiBase),
      "https://architect-study-rooms.onrender.com",
    );
    console.log(
      "PASS published configuration targets owner-provided Render URL (no remote health claim)",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
