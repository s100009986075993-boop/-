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
    await a.locator("#room-seconds").selectOption("90");
    await a.getByRole("button", { name: "建立房間", exact: true }).click();
    await a.locator(".room-heading h3").waitFor();
    const code = await a.evaluate(
      () => JSON.parse(sessionStorage.getItem("architect-room-session")).code,
    );
    await a.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.testRoomInvite = value;
          },
        },
      }),
    );
    await a.getByRole("button", { name: "複製邀請", exact: true }).click();
    const invitation = await a.evaluate(() => window.testRoomInvite);
    const parsedInvite = new URL(invitation);
    assert.equal(parsedInvite.origin, new URL(base).origin);
    assert.ok(parsedInvite.searchParams.get("v"));
    assert.ok(parsedInvite.searchParams.get("invite"));
    assert.equal(parsedInvite.hash, "#room=" + code);
    assert.ok(!invitation.includes("token"));
    await a.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error("Clipboard unavailable");
          },
        },
      }),
    );
    await a.getByRole("button", { name: "複製邀請", exact: true }).click();
    assert.equal(await a.locator(".room-share").getAttribute("open"), "");
    assert.equal(await a.getByLabel("房間邀請網址").inputValue(), invitation);
    await b.addInitScript(() => {
      Object.defineProperty(AbortSignal, "timeout", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(crypto, "randomUUID", {
        configurable: true,
        value: undefined,
      });
    });
    await b.goto(invitation);
    assert.equal(await b.locator("#room-code").inputValue(), code);
    await b.locator("#room-name").fill("勇者乙");
    assert.ok(
      (await b.locator(".room-form").first().innerText()).includes("加入朋友"),
    );
    await b.evaluate((link) => {
      const input = document.getElementById("room-code");
      input.value = "";
      const data = new DataTransfer();
      data.setData("text/plain", link);
      input.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }, invitation);
    assert.equal(await b.locator("#room-code").inputValue(), code);
    await b.locator("#room-code").press("Enter");
    await b.locator(".room-heading h3").waitFor();
    await a.waitForFunction(
      () => document.querySelectorAll(".room-player").length === 2,
    );
    assert.ok(
      (await b.locator("#room-content").innerText()).includes("每題 90 秒"),
    );
    await a.getByRole("button", { name: "全員到齊，開始挑戰" }).click();
    await a.locator(".room-option").first().waitFor();
    await b.locator(".room-option").first().waitFor();
    assert.equal(await b.locator(".room-party").getAttribute("open"), null);
    const initialTiming = await a.evaluate(async () => {
      const session = JSON.parse(
        sessionStorage.getItem("architect-room-session"),
      );
      return (
        await fetch("/api/rooms/" + session.code, {
          headers: { Authorization: "Bearer " + session.token },
        })
      ).json();
    });
    assert.equal(initialTiming.seconds, 90);
    assert.ok(initialTiming.deadline - initialTiming.serverNow > 80000);
    assert.equal(await a.locator(".room-exclude:visible").count(), 4);
    await b.locator(".room-exclude").first().click();
    assert.equal(await b.locator(".room-option").first().isDisabled(), true);
    assert.equal(await a.locator(".room-option").first().isEnabled(), true);
    await b.locator(".room-exclude").first().click();
    assert.equal(await b.locator(".room-option.selected").count(), 0);
    await b.locator(".room-option").first().click();
    await b.locator(".room-exclude").first().click();
    assert.equal(await b.locator(".room-option.selected").count(), 0);
    assert.equal(await b.locator(".room-submit").isDisabled(), true);
    for (const i of [1, 2, 3]) await b.locator(".room-exclude").nth(i).click();
    assert.equal(await b.locator(".room-option:disabled").count(), 4);
    assert.equal(await b.locator(".room-submit").isDisabled(), true);
    await b.screenshot({
      path: "/tmp/room-exclude-mobile.png",
      fullPage: true,
    });
    await b.locator(".room-clear-exclusions").click();
    assert.equal(await b.locator(".room-option:enabled").count(), 4);
    assert.equal(await b.locator(".room-option.selected").count(), 0);
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
      if (i === 0) {
        const unselected = await b
          .locator(".room-option")
          .evaluateAll((els) =>
            els.findIndex((el) => el.getAttribute("aria-pressed") !== "true"),
          );
        await b.locator(".room-exclude").nth(Math.max(0, unselected)).click();
      }
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
        assert.equal(await b.locator(".room-option.eliminated").count(), 1);
        assert.equal(await a.locator(".room-exclude:visible").count(), 0);
      }
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
      assert.equal(await b.locator(".room-exclude:visible").count(), 0);
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
      "PASS real two-client room: 90-second setting, private exclusions/restore/clear, draft retention, submission lock, invite, reconnect and 5-round scoring",
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
        body: "window.ARCHITECT_ROOMS = {enabled: false, apiBase: null};",
      }),
    );
    await staticPage.goto("http://127.0.0.1:3000");
    await staticPage.locator("#rooms-start").click();
    assert.equal(await staticPage.locator(".room-unavailable").count(), 1);
    assert.equal(await staticPage.locator("#room-name").count(), 0);
    console.log(
      "PASS explicitly disabled configuration reports service unavailable",
    );
    const stalePage = await browser.newPage();
    await stalePage.route("**/rooms-config.js?*", (route) =>
      route.fulfill({
        contentType: "text/javascript",
        body: "window.ARCHITECT_ROOMS = {apiBase: null};",
      }),
    );
    await stalePage.goto("http://127.0.0.1:3000/#room=ABC234");
    assert.equal(await stalePage.locator("#room-name").count(), 1);
    assert.equal(await stalePage.locator(".room-unavailable").count(), 0);
    assert.equal(await stalePage.locator("#room-code").inputValue(), "ABC234");
    console.log(
      "PASS stale null configuration recovers from page metadata and preserves invitation",
    );
    const missingPage = await browser.newPage();
    await missingPage.route("**/rooms-config.js?*", (route) => route.abort());
    await missingPage.goto("http://127.0.0.1:3000/#room=ABC234");
    assert.equal(await missingPage.locator("#room-name").count(), 1);
    assert.equal(
      await missingPage.locator("#room-code").inputValue(),
      "ABC234",
    );
    console.log(
      "PASS missing configuration script recovers from page metadata",
    );
    const recoveryPage = await browser.newPage();
    await recoveryPage.route("**/rooms-config.js?*", (route) => route.abort());
    await recoveryPage.route("http://127.0.0.1:3000/", async (route) => {
      const response = await route.fetch();
      const html = (await response.text()).replace(
        /<meta name="rooms-api-base"[^>]*>/,
        "",
      );
      await route.fulfill({ response, body: html });
    });
    await recoveryPage.goto("http://127.0.0.1:3000/#room=ABC234");
    assert.ok(
      (await recoveryPage.locator(".room-unavailable").innerText()).includes(
        "設定未載入",
      ),
    );
    await recoveryPage
      .getByRole("button", { name: "重新載入房間設定" })
      .click();
    await recoveryPage.locator("#room-name").waitFor();
    assert.equal(
      await recoveryPage.locator("#room-code").inputValue(),
      "ABC234",
    );
    assert.ok(new URL(recoveryPage.url()).searchParams.get("refresh"));
    console.log("PASS configuration recovery reload retains room code");
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
