const crypto = require("node:crypto");
const { isCorrect, selectionSets, answerText } = require("../study.js");
class RoomError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
class RoomEngine {
  constructor(
    bank,
    { now = Date.now, questionMs = 45000, ttlMs = 2 * 60 * 60 * 1000 } = {},
  ) {
    this.bank = bank.filter(
      (q) => q.year > 0 && !q.allAward && !q.excludeFromAccuracy,
    );
    this.now = now;
    this.questionMs = questionMs;
    this.ttlMs = ttlMs;
    this.rooms = new Map();
  }
  clean() {
    for (const [code, r] of this.rooms)
      if (this.now() - r.touched > this.ttlMs) this.rooms.delete(code);
  }
  nickname(value) {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > 20 ||
      /[\x00-\x1f\x7f]/.test(value)
    )
      throw new RoomError("請輸入 1～20 字的暱稱");
    return value.trim();
  }
  player(name) {
    return {
      id: crypto.randomUUID(),
      token: crypto.randomBytes(32).toString("hex"),
      name: this.nickname(name),
      score: 0,
      lastSeen: this.now(),
      left: false,
    };
  }
  get(code) {
    this.clean();
    const r = this.rooms.get(String(code).toUpperCase());
    if (!r) throw new RoomError("找不到房間，可能已關閉或過期", 404);
    return r;
  }
  member(r, token) {
    const p = r.players.find((p) => p.token === token && !p.left);
    if (!p) throw new RoomError("加入資訊已失效，請重新加入房間", 401);
    p.lastSeen = this.now();
    return p;
  }
  host(r, p) {
    if (r.hostId !== p.id) throw new RoomError("只有房主可以操作", 403);
  }
  create({ name, subject = "", count = 10, mode = "coop", seconds } = {}) {
    this.clean();
    if (this.rooms.size >= 200)
      throw new RoomError("目前房間已滿，請稍後再試", 503);
    if (
      ![5, 10, 20].includes(count) ||
      !["coop", "versus"].includes(mode) ||
      typeof subject !== "string" ||
      (seconds !== undefined &&
        (!Number.isInteger(seconds) || seconds < 15 || seconds > 600))
    )
      throw new RoomError("房間設定不正確");
    const pool = this.bank.filter((q) => !subject || q.subject === subject);
    if (pool.length < count) throw new RoomError("此科目可用題目不足");
    const p = this.player(name);
    let code;
    do {
      code = Array.from(
        { length: 6 },
        () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[crypto.randomInt(32)],
      ).join("");
    } while (this.rooms.has(code));
    const r = {
      code,
      hostId: p.id,
      players: [p],
      subject,
      count,
      mode,
      questionMs: seconds === undefined ? this.questionMs : seconds * 1000,
      pool,
      phase: "lobby",
      questions: [],
      index: 0,
      submissions: new Map(),
      touched: this.now(),
      revision: 1,
      damage: 0,
    };
    this.rooms.set(code, r);
    return { code, token: p.token, playerId: p.id };
  }
  join(code, { name } = {}) {
    const r = this.get(code);
    if (r.phase !== "lobby")
      throw new RoomError("這一回已開始，請等房主開新房間", 409);
    if (r.players.filter((p) => !p.left).length >= 6)
      throw new RoomError("房間已滿（最多 6 人）", 409);
    const p = this.player(name);
    if (r.players.some((x) => !x.left && x.name === p.name))
      throw new RoomError("此暱稱已被使用，請換一個");
    r.players.push(p);
    r.touched = this.now();
    r.revision++;
    return { code: r.code, token: p.token, playerId: p.id };
  }
  start(code, token) {
    const r = this.get(code),
      p = this.member(r, token);
    this.host(r, p);
    if (r.phase !== "lobby") throw new RoomError("這一回已經開始", 409);
    if (r.players.filter((p) => !p.left).length < 2)
      throw new RoomError("至少需要 2 位玩家才能開始");
    r.players = r.players.filter((p) => !p.left);
    const pool = [...r.pool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    r.questions = pool.slice(0, r.count);
    delete r.pool;
    r.bossMax = r.count * r.players.length;
    r.phase = "question";
    r.deadline = this.now() + r.questionMs;
    r.touched = this.now();
    r.revision++;
    return this.view(code, token);
  }
  advanceClock(r) {
    if (r.phase === "question" && this.now() >= r.deadline) this.reveal(r);
  }
  reveal(r) {
    if (r.phase !== "question") return;
    const q = r.questions[r.index];
    for (const p of r.players) {
      const a = r.submissions.get(p.id);
      if (a && isCorrect(q, a.selected)) {
        p.score++;
        r.damage++;
      }
    }
    r.phase = "reveal";
    r.touched = this.now();
    r.revision++;
  }
  answer(code, token, { questionId, selected } = {}) {
    const r = this.get(code),
      p = this.member(r, token);
    this.advanceClock(r);
    const q = r.questions[r.index];
    if (r.phase !== "question" || questionId !== q?.id)
      throw new RoomError("這一題已結束，請查看最新進度", 409);
    if (r.submissions.has(p.id))
      throw new RoomError("本題已提交，不能重複作答", 409);
    if (
      !Array.isArray(selected) ||
      !selected.length ||
      selected.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= q.options.length,
      ) ||
      new Set(selected).size !== selected.length
    )
      throw new RoomError("請選擇有效答案");
    if (!selectionSets(q).some((s) => s.length > 1) && selected.length !== 1)
      throw new RoomError("此題只能選一個選項");
    r.submissions.set(p.id, { selected: [...selected].sort((a, b) => a - b) });
    r.touched = this.now();
    r.revision++;
    if (r.players.filter((p) => !p.left).every((p) => r.submissions.has(p.id)))
      this.reveal(r);
    return this.view(code, token);
  }
  next(code, token) {
    const r = this.get(code),
      p = this.member(r, token);
    this.host(r, p);
    this.advanceClock(r);
    if (r.phase !== "reveal")
      throw new RoomError("請等大家提交或倒數結束", 409);
    r.index++;
    r.submissions = new Map();
    r.phase = r.index >= r.questions.length ? "finished" : "question";
    r.deadline = this.now() + r.questionMs;
    r.touched = this.now();
    r.revision++;
    return this.view(code, token);
  }
  leave(code, token) {
    const r = this.get(code),
      p = this.member(r, token);
    p.left = true;
    if (r.hostId === p.id) r.hostId = r.players.find((p) => !p.left)?.id;
    if (!r.players.some((p) => !p.left)) {
      this.rooms.delete(r.code);
      return;
    }
    r.revision++;
    if (
      r.phase === "question" &&
      r.players.filter((p) => !p.left).every((p) => r.submissions.has(p.id))
    )
      this.reveal(r);
  }
  view(code, token) {
    const r = this.get(code),
      me = this.member(r, token);
    const host = r.players.find((p) => p.id === r.hostId);
    if (!host || host.left || this.now() - host.lastSeen > 30000) {
      r.hostId = me.id;
      r.revision++;
    }
    this.advanceClock(r);
    const q = r.questions[r.index];
    const result = {
      code: r.code,
      hostId: r.hostId,
      me: me.id,
      mode: r.mode,
      subject: r.subject,
      count: r.count,
      seconds: r.questionMs / 1000,
      phase: r.phase,
      index: r.index,
      revision: r.revision,
      serverNow: this.now(),
      deadline: r.deadline || null,
      damage: r.damage,
      bossMax: r.bossMax || 0,
      players: r.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        left: p.left,
        online: !p.left && this.now() - p.lastSeen < 15000,
        submitted: r.submissions.has(p.id),
      })),
    };
    if (q && r.phase !== "lobby") {
      result.question = {
        id: q.id,
        year: q.year,
        subject: q.subject,
        question: q.question,
        options: q.options,
        multi: selectionSets(q).some((s) => s.length > 1),
        diagrams: q.diagrams || (q.diagram ? [q.diagram] : []),
      };
      result.mySelection = r.submissions.get(me.id)?.selected || null;
      if (r.phase === "reveal") {
        result.result = {
          answer: answerText(q),
          sourcePdf: q.sourcePdf || null,
          answerSource: q.answerSource || null,
          players: r.players.map((p) => ({
            id: p.id,
            selected: r.submissions.get(p.id)?.selected || null,
            correct:
              r.submissions.has(p.id) &&
              isCorrect(q, r.submissions.get(p.id).selected),
          })),
        };
      }
    }
    return result;
  }
}
module.exports = { RoomEngine, RoomError };
