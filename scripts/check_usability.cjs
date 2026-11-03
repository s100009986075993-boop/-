const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const width of process.env.UX_WIDTH
      ? [Number(process.env.UX_WIDTH)]
      : [390, 320, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 844 } }),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto("http://127.0.0.1:3000");
      assert.ok((await p.locator(".practice-lobby").boundingBox()).y < 700);
      assert.equal(
        await p.locator(".town-overview").getAttribute("open"),
        null,
      );
      await p.locator("#practice-advanced summary").first().click();
      await p.locator("#answerflow").selectOption("confirm");
      await p.locator("#questioncount").selectOption("5");
      await p.locator("#start").click();
      const first = await p.evaluate(() => queue[0].id);
      await p.locator(".option").first().click();
      if (await p.locator(".submit-answer").count())
        await p.locator(".submit-answer").click();
      assert.equal(await p.evaluate(() => history.length), 1);
      await p.reload();
      assert.equal(await p.locator("#resume-practice").isVisible(), true);
      await p.locator("#resume-button").click();
      assert.equal(await p.evaluate(() => index), 1);
      assert.equal(await p.evaluate(() => answers.length), 1);
      assert.equal(await p.evaluate(() => history.length), 1);
      assert.notEqual(await p.evaluate(() => queue[index].id), first);
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForFunction(
        () => !document.getElementById("study-actionbar").hidden,
      );
      assert.equal(await p.locator("#study-action-button").isDisabled(), true); // unselected question needs an answer only if multi/confirm
      await p.locator(".option").first().click();
      if (await p.locator(".submit-answer").count())
        await p.locator(".submit-answer").click();
      await p.evaluate(() => window.scrollTo(0, 0));
      await p.waitForFunction(
        () => !document.getElementById("study-actionbar").hidden,
      );
      assert.equal(
        await p.locator("#study-action-button").textContent(),
        await p.locator(".next-question").textContent(),
      );
      if (width === 390) {
        await p.locator(".question-note>summary").click();
        await p.locator(".question-note textarea").focus();
        await p.waitForFunction(
          () => document.getElementById("study-actionbar").hidden,
        );
        await p.locator(".question-note textarea").evaluate((el) => el.blur());
        await p.evaluate(() => window.scrollTo(0, 0));
        await p.waitForFunction(
          () => !document.getElementById("study-actionbar").hidden,
        );
      }
      await p.locator("#study-action-button").click();
      assert.equal(await p.evaluate(() => index), 2);
      assert.equal(await p.evaluate(() => history.length), 2);
      // Test a full completion and retry with controlled real question and actual submission.
      await p.evaluate(() => {
        $("answerflow").value = "instant";
        clearInterval(timer);
        timer = null;
        queue = [
          bank.find(
            (q) =>
              q.year > 0 &&
              !q.allAward &&
              !q.excludeFromAccuracy &&
              selectionSets(q).length === 1 &&
              selectionSets(q)[0].length === 1,
          ),
        ];
        answers = [];
        index = 0;
        exam = false;
        playMode = "random";
        show();
      });
      const wrong = await p.evaluate(() => (queue[0].answer + 1) % 4);
      await p.locator(".option").nth(wrong).click();
      if (width === 390) {
        await p.reload();
        assert.equal(
          await p.locator("#resume-button").innerText(),
          "查看本回成果",
        );
        await p.locator("#resume-button").click();
      } else await p.locator(".next-question").click();
      assert.equal(await p.locator(".retry-round").count(), 1);
      await p.locator(".round-review>summary").click();
      await p.locator(".round-review-item").waitFor();
      assert.equal(await p.locator(".round-review-item").count(), 1);
      await p.locator(".retry-round").click();
      assert.equal(await p.evaluate(() => queue.length), 1);
      assert.equal(await p.evaluate(() => answers.length), 0);
      await p.locator(".lobby-button").click();
      assert.equal(
        await p.evaluate(() =>
          localStorage.getItem("architect-practice-session"),
        ),
        null,
      );
      await p.locator("#mode").selectOption("exam");
      await p.locator("#start").click();
      await p.evaluate(() => {
        const s = JSON.parse(
          localStorage.getItem("architect-practice-session"),
        );
        s.deadline = Date.now() - 1;
        localStorage.setItem("architect-practice-session", JSON.stringify(s));
      });
      await p.reload();
      await p.locator("#resume-button").click();
      assert.equal(await p.locator(".completion-card").count(), 1);
      assert.equal(await p.evaluate(() => timer), null);
      assert.equal(
        await p.evaluate(() =>
          localStorage.getItem("architect-practice-session"),
        ),
        null,
      );
      await p.getByRole("button", { name: "回到選題大廳" }).click();
      await p.locator("#reset-practice").click();
      assert.equal(await p.locator("#mode").inputValue(), "random");
      assert.equal(await p.locator("#questioncount").inputValue(), "20");
      assert.ok((await p.evaluate(() => history.length)) > 0);
      await p.locator("#quick-menu-open").click();
      await p.locator('[data-quick-go="references"]').click();
      await p.locator('[data-reference-query="無障礙"]').click();
      assert.ok((await p.locator("#refresults .reference-card").count()) > 0);
      await p.locator("#ref-clear").click();
      assert.equal(await p.locator("#refresults .reference-card").count(), 0);
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      console.log(
        "PASS",
        width,
        "compact entry, resume without duplicate history, action dock, wrong retry, review, expired exam, reset and reference shortcuts",
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
