(() => {
  const panel = $("rooms"),
    root = $("room-content"),
    notice = $("room-notice");
  const configured = window.ARCHITECT_ROOMS?.apiBase;
  let base = null;
  try {
    if (typeof configured === "string") {
      const url = new URL(configured || location.origin);
      if (
        url.protocol === "https:" ||
        (["localhost", "127.0.0.1"].includes(url.hostname) &&
          url.protocol === "http:")
      )
        base = url.href.replace(/\/$/, "");
    }
  } catch {}
  const drafts = new Map();
  let session = null,
    state = null,
    revision = -1,
    pollTimer = null,
    pollBusy = false,
    mutationBusy = false,
    clockOffset = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem("architect-room-session"));
    if (
      saved?.base === base &&
      /^[A-Z2-9]{6}$/.test(saved.code) &&
      /^[a-f0-9]{64}$/.test(saved.token)
    )
      session = saved;
  } catch {}
  const invite =
    /^#room=([A-Z2-9]{6})$/i.exec(location.hash)?.[1]?.toUpperCase() || "";
  function status(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle("room-error", error);
  }
  function saveSession(value) {
    session = value;
    try {
      if (value)
        sessionStorage.setItem("architect-room-session", JSON.stringify(value));
      else sessionStorage.removeItem("architect-room-session");
    } catch {
      status("瀏覽器無法保存加入資訊；重新整理後可能需要重新加入。", true);
    }
  }
  async function request(path, body) {
    const headers = {};
    if (session?.token) headers.Authorization = "Bearer " + session.token;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let response;
    if (!session && body !== undefined)
      status("正在連線，首次啟動服務可能需要約一分鐘，請稍候。");
    try {
      response = await fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(session ? 10000 : 60000),
        cache: "no-store",
      });
    } catch {
      throw Error(
        session
          ? "暫時連不上房間服務，請檢查網路；會自動嘗試重新連線。"
          : "暫時連不上房間服務，首次啟動可能較久，請稍後再試。",
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("房間服務暫時沒有回應，可能仍在啟動，請稍後再試。");
    }
    if (!response.ok) {
      const e = Error(data.error || "操作失敗，請重試");
      e.status = response.status;
      throw e;
    }
    return data;
  }
  function button(text, handler, cls = "") {
    const b = element("button", text, cls);
    b.type = "button";
    b.onclick = async () => {
      if (mutationBusy) return;
      mutationBusy = true;
      b.disabled = true;
      try {
        await handler();
      } catch (e) {
        status(e.message, true);
      } finally {
        mutationBusy = false;
        b.disabled = false;
      }
    };
    return b;
  }
  function field(text, input) {
    const label = element("label", text);
    label.append(input);
    return label;
  }
  function input(id, placeholder, maxLength) {
    const el = document.createElement("input");
    el.id = id;
    el.placeholder = placeholder;
    el.maxLength = maxLength;
    return el;
  }
  function select(id, options) {
    const el = document.createElement("select");
    el.id = id;
    for (const [value, text] of options) el.add(new Option(text, value));
    return el;
  }
  function showForm() {
    root.replaceChildren();
    revision = -1;
    state = null;
    const intro = element(
      "p",
      "各自用手機加入同一個房間。2～6 人，同題作答，全部交卷或 45 秒到時才揭答；先用暱稱就能玩，不需註冊。",
      "room-intro",
    );
    root.append(intro);
    if (base === null) {
      const box = element("div", "", "room-unavailable");
      box.append(
        element("h3", "多人房間尚未開放"),
        element(
          "p",
          "連線服務啟用後，就能建立房間、分享邀請，一起打怪。單人冒險與一般練習仍可使用。",
        ),
      );
      root.append(box);
      return;
    }
    const name = input("room-name", "輸入你的暱稱", 20);
    name.autocomplete = "nickname";
    try {
      name.value = localStorage.getItem("architect-room-name") || "";
    } catch {}
    root.append(field("你的暱稱", name));
    const forms = element("div", "", "room-forms");
    const create = element("form", "", "room-form");
    const subject = select("room-subject", [
      ["", "四科混合"],
      ...["建築結構", "建築環境控制", "營建法規與實務", "建築構造與施工"].map(
        (x) => [x, x],
      ),
    ]);
    const count = select("room-count", [
      [5, "5 題 · 短回合"],
      [10, "10 題"],
      [20, "20 題"],
    ]);
    const mode = select("room-mode", [
      ["coop", "合作打怪"],
      ["versus", "多人競賽"],
    ]);
    const remember = () => {
      if (!name.value.trim()) {
        name.focus();
        throw Error("請先輸入暱稱");
      }
      try {
        localStorage.setItem("architect-room-name", name.value.trim());
      } catch {}
    };
    create.append(
      element("h3", "建立冒險房間"),
      field("科目", subject),
      field("回合長度", count),
      field("玩法", mode),
      button(
        "建立房間",
        async () => {
          remember();
          const credentials = await request("/api/rooms", {
            name: name.value.trim(),
            subject: subject.value,
            count: Number(count.value),
            mode: mode.value,
          });
          await enter(credentials);
        },
        "primary",
      ),
    );
    const join = element("form", "", "room-form");
    const code = input("room-code", "例如 AB3D7K", 6);
    code.value = invite;
    code.autocomplete = "off";
    code.autocapitalize = "characters";
    code.oninput = () => {
      code.value = code.value.toUpperCase().replace(/[^A-Z2-9]/g, "");
    };
    join.append(
      element("h3", "加入朋友的房間"),
      field("6 碼房號", code),
      button(
        "加入房間",
        async () => {
          remember();
          if (!/^[A-Z2-9]{6}$/.test(code.value)) throw Error("請輸入 6 碼房號");
          const credentials = await request(
            "/api/rooms/" + code.value + "/join",
            { name: name.value.trim() },
          );
          await enter(credentials);
        },
        "primary",
      ),
      element(
        "p",
        "邀請連結與房號即可加入，請只分享給一起練習的朋友。",
        "muted",
      ),
    );
    for (const form of [create, join])
      form.onsubmit = (e) => e.preventDefault();
    forms.append(create, join);
    root.append(forms);
  }
  async function enter(credentials) {
    saveSession({ ...credentials, base });
    revision = -1;
    await sync();
    schedule();
  }
  function schedule() {
    clearTimeout(pollTimer);
    if (session)
      pollTimer = setTimeout(async () => {
        await sync();
        schedule();
      }, 1250);
  }
  function roster(s) {
    const target = $("room-roster");
    if (!target) return;
    target.replaceChildren();
    for (const p of s.players) {
      const row = element("li", "", "room-player");
      row.append(
        element(
          "strong",
          p.name +
            (p.id === s.hostId ? " · 房主" : "") +
            (p.id === s.me ? " · 你" : ""),
        ),
        element(
          "span",
          p.left
            ? "已離開"
            : !p.online
              ? "暫時離線"
              : s.phase === "lobby"
                ? "已加入"
                : s.phase === "finished"
                  ? "已完成"
                  : p.submitted
                    ? "已提交"
                    : s.phase === "reveal"
                      ? "未作答"
                      : "作答中",
        ),
        element("span", p.score + " 分"),
      );
      target.append(row);
    }
  }
  function countdown() {
    const el = $("room-clock");
    if (el && state?.phase === "question")
      el.textContent = `剩餘 ${Math.max(0, Math.ceil((state.deadline - Date.now() - clockOffset) / 1000))} 秒`;
  }
  setInterval(countdown, 500);
  async function sync() {
    if (!session || pollBusy) return;
    pollBusy = true;
    const activeSession = session;
    try {
      const s = await request("/api/rooms/" + activeSession.code);
      if (session !== activeSession || s.revision < revision) return;
      clockOffset = s.serverNow - Date.now();
      state = s;
      status("已連線 · 進度自動同步");
      if (s.revision !== revision) {
        render(s);
        revision = s.revision;
      } else roster(s);
      countdown();
    } catch (e) {
      if (session !== activeSession) return;
      status(e.message, true);
      if (e.status === 401 || e.status === 404) {
        saveSession(null);
        showForm();
      }
    } finally {
      pollBusy = false;
    }
  }
  async function action(name, body = {}) {
    await request("/api/rooms/" + session.code + "/" + name, body);
    await sync();
  }
  function render(s) {
    root.replaceChildren();
    const header = element("div", "", "room-heading");
    header.append(
      element("h3", `房號 ${s.code}`),
      element(
        "span",
        s.mode === "coop" ? "合作打怪" : "多人競賽",
        "room-mode-tag",
      ),
    );
    header.append(
      button("複製邀請", async () => {
        const url = new URL(location.href);
        url.hash = "room=" + s.code;
        try {
          await navigator.clipboard.writeText(url.href);
          status("邀請連結已複製，傳給朋友即可加入。");
        } catch {
          status("無法複製，請分享此房號：" + s.code, true);
        }
      }),
    );
    header.append(
      button("離開房間", async () => {
        await request("/api/rooms/" + session.code + "/leave", {});
        saveSession(null);
        clearTimeout(pollTimer);
        showForm();
        status("已離開房間。");
      }),
    );
    root.append(header);
    const list = element("ul", "", "room-roster");
    list.id = "room-roster";
    list.setAttribute("aria-label", "房間玩家與分數");
    root.append(list);
    roster(s);
    if (s.phase === "lobby") {
      root.append(
        element(
          "p",
          `等待大家集合 · ${s.players.filter((p) => !p.left).length} / 6 人 · ${s.count} 題 · ${s.subject || "四科混合"}`,
        ),
      );
      if (s.me === s.hostId) {
        const start = button(
          "全員到齊，開始挑戰",
          () => action("start"),
          "primary",
        );
        start.disabled = s.players.filter((p) => !p.left).length < 2;
        root.append(start);
      } else
        root.append(
          element("p", "等房主開始後，大家會同時收到第一題。", "muted"),
        );
      root.append(
        element(
          "p",
          "中途重新整理會自動重連；離開房間按鈕才會退出。暱稱與分數只用於這一回，尚未提供永久帳號或跨裝置戰績。",
          "muted",
        ),
      );
      return;
    }
    if (s.mode === "coop") {
      const boss = element("div", "", "room-boss");
      boss.append(
        element("span", "", "pixel-monster"),
        element("strong", "知識森林守衛"),
      );
      const hp = document.createElement("progress");
      hp.max = s.bossMax;
      hp.value = Math.max(0, Math.ceil(s.bossMax * 0.6) - s.damage);
      hp.max = Math.ceil(s.bossMax * 0.6);
      hp.setAttribute("aria-label", "Boss 剩餘生命");
      boss.append(
        hp,
        element("span", `隊伍命中 ${s.damage} 次 · 剩餘 ${hp.value} HP`),
      );
      root.append(boss);
    }
    if (s.phase === "finished") {
      root.append(
        element(
          "h3",
          s.mode === "coop"
            ? s.damage >= Math.ceil(s.bossMax * 0.6)
              ? "合作成功！擊敗森林守衛"
              : "遠征完成，下次再挑戰森林守衛"
            : "本回競賽完成",
        ),
      );
      const ranking = element("ol", "", "room-ranking");
      const sorted = [...s.players].sort((a, b) => b.score - a.score);
      for (const p of sorted)
        ranking.append(element("li", `${p.name} · ${p.score} / ${s.count} 分`));
      root.append(
        ranking,
        element(
          "p",
          "每題答對得 1 分，同分並列。合作累計答對達全隊題數的 60% 即可打倒 Boss。",
          "muted",
        ),
      );
      root.append(
        button(
          "離開並開新房間",
          async () => {
            await request("/api/rooms/" + session.code + "/leave", {});
            saveSession(null);
            clearTimeout(pollTimer);
            showForm();
            status("選擇玩法再開一回吧。");
          },
          "primary",
        ),
      );
      return;
    }
    const q = s.question;
    root.append(
      element(
        "p",
        `第 ${s.index + 1} / ${s.count} 題 · ${q.year} 年 · ${q.subject}`,
        "eyebrow",
      ),
    );
    if (s.phase === "question") {
      const clock = element("p", "", "room-clock");
      clock.id = "room-clock";
      root.append(clock);
    }
    root.append(element("h3", q.question, "question-stem"));
    addDiagrams(root, q);
    const options = element("div", "", "question-options");
    options.setAttribute("aria-label", "多人房間作答選項");
    const picked = new Set(s.mySelection || drafts.get(s.code + q.id) || []);
    const submitted = !!s.mySelection || s.phase !== "question";
    let submit;
    q.options.forEach((text, i) => {
      const b = element(
        "button",
        `${String.fromCharCode(65 + i)}. ${text}`,
        "room-option",
      );
      b.type = "button";
      b.disabled = submitted;
      b.setAttribute("aria-pressed", String(picked.has(i)));
      b.classList.toggle("selected", picked.has(i));
      b.onclick = () => {
        if (q.multi) {
          if (picked.has(i)) picked.delete(i);
          else picked.add(i);
        } else {
          picked.clear();
          picked.add(i);
        }
        drafts.set(s.code + q.id, [...picked]);
        options.querySelectorAll("button").forEach((el, j) => {
          el.setAttribute("aria-pressed", String(picked.has(j)));
          el.classList.toggle("selected", picked.has(j));
        });
        submit.disabled = !picked.size;
      };
      options.append(b);
    });
    root.append(options);
    if (s.phase === "question") {
      if (q.multi)
        root.append(
          element("p", "這題可選多個選項，選好完整組合再提交。", "muted"),
        );
      submit = button(
        submitted ? "已提交，等待其他玩家" : "提交這題",
        () => action("answer", { questionId: q.id, selected: [...picked] }),
        "primary room-submit",
      );
      submit.disabled = submitted || !picked.size;
      root.append(
        submit,
        element("p", "全部提交或倒數結束才公布答案，提交後不能更改。", "muted"),
      );
    }
    if (s.phase === "reveal") {
      const result = element("section", "", "room-result");
      result.append(
        element("h3", "本題結果"),
        element("p", "官方給分：" + s.result.answer),
      );
      for (const a of s.result.players) {
        const player = s.players.find((p) => p.id === a.id);
        result.append(
          element(
            "p",
            `${player.name}：${a.selected ? a.selected.map((i) => String.fromCharCode(65 + i)).join("、") : "未作答"} · ${a.correct ? "答對 +1 分" : "未得分"}`,
          ),
        );
      }
      if (s.result.answerSource)
        result.append(safeLink("核對官方答案", s.result.answerSource));
      root.append(result);
      if (s.me === s.hostId)
        root.append(
          button(
            s.index === s.count - 1 ? "查看本回成果" : "下一題，繼續挑戰",
            () => action("next"),
            "primary room-next",
          ),
        );
      else root.append(element("p", "等房主帶大家前往下一題。", "muted"));
    }
  }
  $("rooms-start").onclick = () => {
    setTab("rooms");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  showForm();
  if (base === null) status("多人房間服務尚未啟用。");
  else if (session) {
    sync().then(schedule);
  } else status("準備出發：輸入暱稱，建立或加入房間。");
  if (invite || session) setTab("rooms");
})();
