const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const bank = require("../data/original-bank.json");
const { isOriginalQuestion, isOriginalAttempt } = require("../original-model");
const { stats } = require("../study");
const { buildGptPrompt } = require("../gpt-helper");
test("40題為獨立原創草稿，兩科各20，附完整解題、四選項理由與參考來源", () => {
  assert.equal(bank.length, 40);
  assert.equal(new Set(bank.map((q) => q.id)).size, 40);
  assert.equal(new Set(bank.map((q) => q.question)).size, 40);
  const official = ["structure", "environment", "law", "construction"].flatMap(
    (s) => require("../data/" + s + "-bank.json"),
  );
  const old = new Set(official.map((q) => q.question));
  for (const slug of ["structure", "environment"]) {
    const subset = bank.filter((q) => q.slug === slug);
    assert.equal(subset.length, 20);
    for (let i = 0; i < 4; i++)
      assert.equal(subset.filter((q) => q.answer === i).length, 5);
  }
  for (const q of bank) {
    assert.ok(isOriginalQuestion(q));
    assert.equal(q.year, 0);
    assert.equal(q.reviewStatus, "unreviewed");
    assert.equal(q.explanationStatus, "draft");
    assert.ok(!old.has(q.question));
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.optionExplanations.length, 4);
    assert.ok(q.solution.length > 60, q.id);
    assert.match(q.optionExplanations[q.answer], /^正確：/);
    assert.ok(q.explanationSources.length);
    assert.ok(q.explanationSources.every((s) => s.url.startsWith("https://")));
  }
  const browser = vm.runInNewContext(
    fs.readFileSync("data/original-bank.js", "utf8") +
      ";JSON.stringify(originalBank)",
  );
  assert.deepEqual(JSON.parse(browser), bank);
});
function expected(c) {
  switch (c.kind) {
    case "beam_udl":
      return (c.w * c.L ** 2) / 8;
    case "reaction":
      return (c.P * (c.L - c.a)) / c.L;
    case "cantilever":
      return c.P * c.L;
    case "axial_stress":
      return (c.N * 1000) / c.A;
    case "axial_delta":
      return (c.N * 1000 * c.L) / (c.E * c.A);
    case "inertia_ratio":
      return c.factor ** 3;
    case "bending_stress":
      return (c.M * 1e6) / ((c.b * c.h ** 2) / 6);
    case "euler_length":
      return 1 / c.factor ** 2;
    case "euler_K":
      return (c.K2 / c.K1) ** 2;
    case "deflection_span":
      return c.factor ** 4;
    case "parallel_columns":
      return (c.total * c.ratio) / (c.ratio + 1);
    case "frequency":
      return Math.round((Math.sqrt(c.k / c.m) / (2 * Math.PI)) * 100) / 100;
    case "period_stiffness":
      return 1 / Math.sqrt(c.factor);
    case "pdelta":
      return c.P * c.delta;
    case "story_shear":
      return c.loads.reduce((a, b) => a + b, 0);
    case "thermal_stress":
      return -c.E * c.alpha * c.dT;
    case "deflection_I":
      return 1 / c.factor;
    case "bearing":
      return c.N / (c.b * c.L);
    case "torsion":
      return c.F * c.e;
    case "heat_flow":
      return c.U * c.A * c.dT;
    case "thermal_R":
      return c.d / c.k;
    case "series_U":
      return 1 / c.R.reduce((a, b) => a + b, 0);
    case "parallel_U":
      return c.f * c.U1 + (1 - c.f) * c.U2;
    case "solar":
      return c.A * c.G * c.shgc;
    case "ach":
      return c.Q / c.V;
    case "co2":
      return c.G / ((c.Ci - c.Co) * 1e-6);
    case "sensible":
      return c.rho * c.cp * c.Q * c.dT;
    case "recovery":
      return c.outdoor + c.eff * (c.exhaust - c.outdoor);
    case "pump":
      return (c.rho * c.g * c.Q * c.H) / c.eta;
    case "illuminance":
      return c.I / c.r ** 2;
    case "lumen":
      return Math.ceil((c.E * c.A) / (c.flux * c.UF * c.MF));
    case "sabine":
      return Math.round(((0.161 * c.V) / c.A) * 100) / 100;
    case "sound_sum":
      return Math.round(c.level + 10 * Math.log10(c.count));
    case "sound_distance":
      return Math.round(20 * Math.log10(c.r2 / c.r1));
    case "mass_law":
      return Math.round(20 * Math.log10(c.factor));
    case "cop":
      return c.cooling / c.power;
    case "shf":
      return c.sensible / (c.sensible + c.latent);
    case "runoff":
      return Math.round(((c.C * c.i * c.A) / 3600) * 100) / 100;
    default:
      throw Error("未驗算公式 " + c.kind);
  }
}
test("38題數值或比例題依力學、熱流、聲能及單位轉換獨立重算，答案選項唯一", () => {
  const numeric = bank.filter((q) => q.calculation);
  assert.equal(numeric.length, 38);
  for (const q of numeric) {
    const value = expected(q.calculation);
    assert.ok(
      Math.abs(value - q.choiceValues[q.answer]) < 1e-7,
      `${q.id}: expected ${value}, actual ${q.choiceValues[q.answer]}`,
    );
    assert.equal(
      q.choiceValues.filter((v) => Math.abs(v - value) < 1e-7).length,
      1,
      q.id,
    );
  }
});
test("原創紀錄可與舊版考古紀錄分開計算，GPT提問不冒稱官方答案", () => {
  const history = [
    { id: "114-law-01", correct: true },
    { id: bank[0].id, correct: false },
    { id: bank[1].id, questionSource: "original", correct: true },
  ];
  assert.equal(stats(history.filter((a) => !isOriginalAttempt(a))).total, 1);
  assert.equal(stats(history.filter(isOriginalAttempt)).total, 2);
  assert.equal(stats(history.filter(isOriginalAttempt)).accuracy, 50);
  const prompt = buildGptPrompt(bank[0], bank[0].answer);
  assert.match(prompt, /AI 原創模擬題/);
  assert.match(prompt, /草稿參考答案（非官方）/);
  assert.doesNotMatch(prompt, /【官方答案／給分組合】/);
});
