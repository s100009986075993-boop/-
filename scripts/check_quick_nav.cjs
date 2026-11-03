const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [390, 320, 1280]) {
      const page = await browser.newPage({
          viewport: { width, height: width === 320 ? 568 : 844 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("http://127.0.0.1:3000");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const rect = await page.locator("#quick-menu-open").boundingBox();
      assert.ok(rect.y >= 0 && rect.y + rect.height < 75);
      await page.locator("#quick-menu-open").click();
      assert.equal(
        await page.locator("#quick-menu").evaluate((el) => el.open),
        true,
      );
      assert.equal(
        await page.locator("#quick-menu-open").getAttribute("aria-expanded"),
        "true",
      );
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.getElementById("quick-menu").open,
      );
      assert.equal(
        await page.locator("#quick-menu-open").getAttribute("aria-expanded"),
        "false",
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "quick-menu-open",
      );
      const go = async (destination) => {
        await page.locator("#quick-menu-open").click();
        await page.locator(`[data-quick-go="${destination}"]`).click();
      };
      for (const destination of [
        "rooms",
        "site",
        "design",
        "progress",
        "references",
        "import",
      ]) {
        await go(destination);
        assert.equal(await page.locator("#" + destination).isVisible(), true);
        assert.equal(
          await page.locator("#quick-menu").evaluate((el) => el.open),
          false,
        );
        const bounds = await page.locator("#" + destination).boundingBox();
        const toolbar = await page.locator(".quick-toolbar").boundingBox();
        assert.ok(
          bounds.y >= toolbar.height - 1,
          `${destination} begins below fixed toolbar`,
        );
      }
      await go("lobby");
      await page.locator("#questioncount").selectOption("5");
      await page.locator("#start").click();
      await page.locator(".option").first().click();
      if (await page.locator(".submit-answer").count())
        await page.locator(".submit-answer").click();
      const before = await page.evaluate(() => ({
        id: queue[index].id,
        index,
        answers: answers.length,
        history: history.length,
      }));
      assert.equal(before.answers, 1);
      await go("progress");
      await go("practice");
      const after = await page.evaluate(() => ({
        id: queue[index].id,
        index,
        answers: answers.length,
        history: history.length,
      }));
      assert.deepEqual(after, before);
      assert.equal(await page.locator(".feedback").count(), 1);
      await page.locator("#quick-menu-open").click();
      assert.ok(
        (await page.locator('[data-quick-go="lobby"]').innerText()).includes(
          "結束本回",
        ),
      );
      await page.locator('[data-quick-go="lobby"]').click();
      assert.equal(await page.locator(".question-card").count(), 0);
      assert.equal(await page.locator(".practice-lobby").isVisible(), true);
      assert.equal(await page.evaluate(() => history.length), before.history);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await go("top");
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      await page.locator("#quick-menu-open").click();
      await page.screenshot({
        path: `/tmp/quick-nav-${width}.png`,
        fullPage: false,
      });
      await page.locator("#quick-menu-close").click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      console.log(
        "PASS",
        width,
        "fixed menu, Escape/focus, all destinations, no header overlap, preserved answer, explicit restart and return to top",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
