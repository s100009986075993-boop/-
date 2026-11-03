const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 844 } }),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto("http://127.0.0.1:3000");
      await p.locator("#questioncount").selectOption("5");
      await p.locator("#start").click();
      assert.equal(
        await p.evaluate(() => queue.some(isOriginalQuestion)),
        false,
      );
      await p.locator(".option").first().click();
      if (await p.locator(".submit-answer").count())
        await p.locator(".submit-answer").click();
      const historical = await p.locator("#total").innerText();
      await p.locator(".lobby-button").click();
      await p.locator("#question-source").selectOption("original");
      assert.equal(await p.locator("#year").isDisabled(), true);
      assert.equal(
        await p
          .locator('#subject option[value="營建法規與實務"]')
          .evaluate((el) => el.disabled),
        true,
      );
      assert.equal(
        await p
          .locator('#mode option[value="paper"]')
          .evaluate((el) => el.disabled),
        true,
      );
      await p.locator("#subject").selectOption("建築結構");
      await p.locator("#questioncount").selectOption("80");
      await p.locator("#start").click();
      assert.equal(await p.evaluate(() => queue.length), 20);
      assert.equal(
        await p.evaluate(() =>
          queue.every((q) => q.subject === "建築結構" && isOriginalQuestion(q)),
        ),
        true,
      );
      await p.locator(".lobby-button").click();
      await p.locator("#subject").selectOption("建築環境控制");
      await p.locator("#start").click();
      assert.equal(await p.evaluate(() => queue.length), 20);
      assert.equal(
        await p.evaluate(() =>
          queue.every(
            (q) => q.subject === "建築環境控制" && isOriginalQuestion(q),
          ),
        ),
        true,
      );
      await p.locator(".lobby-button").click();
      await p.locator("#subject").selectOption("");
      const count = width === 390 ? 40 : 5;
      await p.locator("#questioncount").selectOption(String(count));
      await p.locator("#start").click();
      assert.equal(
        await p.evaluate(() => new Set(queue.map((q) => q.id)).size),
        count,
      );
      for (let i = 0; i < count; i++) {
        assert.equal(await p.locator(".original-solution").count(), 0);
        assert.ok(
          (await p.locator(".original-notice").innerText()).includes(
            "待專家覆核",
          ),
        );
        assert.ok(
          (await p.locator(".question-meta").innerText()).includes("原創模擬"),
        );
        const answer = await p.evaluate(() =>
          index === 0 ? (queue[index].answer + 1) % 4 : queue[index].answer,
        );
        await p.locator(".option").nth(answer).click();
        assert.equal(await p.locator(".original-solution").count(), 1);
        assert.equal(await p.locator(".original-options li").count(), 4);
        assert.ok(
          (await p.locator(".answer-rule").innerText()).includes("參考答案"),
        );
        assert.equal(await p.locator("#total").innerText(), historical);
        if (i === 0) {
          await p.screenshot({
            path: `/tmp/original-${width}.png`,
            fullPage: true,
          });
          await p.reload();
          assert.equal(
            await p.locator("#question-source").inputValue(),
            "original",
          );
          await p.locator("#resume-button").click();
          assert.equal(await p.evaluate(() => index), 1);
          assert.equal(
            await p.evaluate(() => queue.every(isOriginalQuestion)),
            true,
          );
        } else await p.locator(".next-question").click();
      }
      assert.equal(await p.locator(".completion-card").count(), 1);
      assert.ok(
        (await p.locator(".completion-card").innerText()).includes(
          "原創草稿判定",
        ),
      );
      assert.equal(await p.locator("#total").innerText(), historical);
      assert.ok(
        (await p.locator("#original-progress-summary").innerText()).includes(
          `已答 ${count} 次`,
        ),
      );
      assert.equal(
        await p.evaluate(() => history.filter(isOriginalAttempt).length),
        count,
      );
      assert.equal(await p.locator(".retry-round").count(), 1);
      await p
        .getByRole("button", { name: "回到選題大廳", exact: true })
        .click();
      await p.locator("#mode").selectOption("exam");
      await p.locator("#start").click();
      await p.locator(".option").first().click();
      assert.equal(await p.locator(".original-solution").count(), 0);
      await p.evaluate(() => {
        deadline = Date.now() - 1;
        runPracticeClock();
      });
      assert.equal(await p.locator(".exam-review").count(), 1);
      await p.locator(".exam-review>summary").click();
      assert.equal(await p.locator(".original-solution").count(), 1);
      await p
        .getByRole("button", { name: "回到選題大廳", exact: true })
        .click();
      await p.locator("#question-source").selectOption("official");
      assert.equal(await p.locator("#year").isEnabled(), true);
      assert.equal(
        await p
          .locator('#mode option[value="paper"]')
          .evaluate((el) => el.disabled),
        false,
      );
      await p.locator("#subject").selectOption("建築構造與施工");
      await p.locator("#year").selectOption("114");
      await p.locator("#mode").selectOption("paper");
      await p.locator("#start").click();
      assert.equal(await p.evaluate(() => queue.length), 80);
      assert.equal(
        await p.evaluate(() => queue.some(isOriginalQuestion)),
        false,
      );
      assert.deepEqual(errors, []);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      console.log(
        "PASS",
        width,
        "original source, 20 per subject, draft solutions, separate scores, source-safe resume, exam privacy and unchanged 80-question papers",
      );
      await p.close();
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
