(() => {
  const sessionKey = "architect-practice-session";
  const settingsKey = "architect-practice-settings";
  const fields = [
    "question-source",
    "subject",
    "year",
    "questioncount",
    "mode",
    "chapter",
    "contentfilter",
    "structurelane",
    "structuretopic",
  ];
  const toast = element("p", "", "ux-toast");
  toast.hidden = true;
  toast.setAttribute("role", "status");
  document.body.append(toast);
  let toastTimer;
  function announce(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 6000);
  }
  function setOption(id, value) {
    if ([...$(id).options].some((o) => o.value === String(value)))
      $(id).value = String(value);
  }
  const preferences = read(settingsKey, null);
  if (preferences && typeof preferences === "object") {
    if (preferences["question-source"] !== undefined)
      setOption("question-source", preferences["question-source"]);
    applyPracticeSource();
    for (const id of fields.filter(
      (x) => x !== "structuretopic" && x !== "question-source",
    ))
      if (preferences[id] !== undefined) setOption(id, preferences[id]);
    syncSubjectShortcuts();
    if (preferences.structuretopic !== undefined)
      setOption("structuretopic", preferences.structuretopic);
    updatePracticeCountControls();
  }
  function saveSettings() {
    try {
      localStorage.setItem(
        settingsKey,
        JSON.stringify(
          Object.fromEntries(fields.map((id) => [id, $(id).value])),
        ),
      );
    } catch {}
  }
  function summary() {
    $("practice-summary").textContent = [
      $("question-source").value === "original"
        ? "AI 原創模擬題"
        : "考古／自訂題",
      $("subject").value ||
        ($("question-source").value === "original" ? "結構＋環控" : "四科混合"),
      $("question-source").value === "original"
        ? "非官方草稿"
        : $("year").value
          ? `${$("year").value} 年`
          : "跨年度",
      $("mode").value === "paper"
        ? "完整考卷"
        : `${$("questioncount").value} 題`,
      $("mode").selectedOptions[0]?.textContent,
    ]
      .filter(Boolean)
      .join(" · ");
    const narrowed = [
      $("chapter").value,
      $("contentfilter").value !== "all",
      $("structurelane").value !== "all",
      $("structuretopic").value,
      $("answerflow").value === "confirm",
    ].filter(Boolean).length;
    $("practice-advanced").querySelector("summary").textContent =
      `進階設定：章節、題目範圍與作答方式${narrowed ? `（已調整 ${narrowed} 項）` : ""}`;
  }
  for (const id of [...fields, "answerflow"])
    $(id).addEventListener("change", () => {
      summary();
      saveSettings();
    });
  document
    .querySelectorAll(
      "[data-subject],[data-structure-lane],[data-portable-subject]",
    )
    .forEach((b) =>
      b.addEventListener("click", () => {
        summary();
        saveSettings();
      }),
    );
  $("reset-practice").onclick = () => {
    for (const [id, value] of Object.entries({
      subject: "",
      year: "",
      chapter: "",
      contentfilter: "all",
      mode: "random",
      structurelane: "all",
      structuretopic: "",
      questioncount: "20",
    }))
      $(id).value = value;
    $("questioncount").dispatchEvent(new Event("change", { bubbles: true }));
    syncSubjectShortcuts();
    updatePracticeCountControls();
    $("practice-error").hidden = true;
    summary();
    saveSettings();
    announce("已重設篩選，學習紀錄與筆記仍保留。");
  };
  function savedSession() {
    const s = read(sessionKey, null);
    if (
      !s ||
      s.version !== 1 ||
      !Array.isArray(s.ids) ||
      !s.ids.length ||
      s.ids.length > 80 ||
      new Set(s.ids).size !== s.ids.length ||
      !Array.isArray(s.answers) ||
      s.answers.length > s.ids.length
    )
      return null;
    if (
      ![
        "random",
        "paper",
        "adventure",
        "duel",
        "exam",
        "wrong",
        "learning",
        "due",
      ].includes(s.mode) ||
      typeof s.exam !== "boolean" ||
      (s.exam && !Number.isFinite(s.deadline))
    )
      return null;
    const lookup = new Map(bank.map((q) => [q.id, q]));
    if (s.ids.some((id) => !lookup.has(id))) return null;
    if (
      !s.answers.every(
        (a, i) =>
          a &&
          a.id === s.ids[i] &&
          typeof a.correct === "boolean" &&
          a.subject === lookup.get(a.id).subject &&
          (Array.isArray(a.selected) ? a.selected : [a.selected]).every(
            (n) =>
              Number.isInteger(n) &&
              n >= 0 &&
              n < lookup.get(a.id).options.length,
          ),
      )
    )
      return null;
    const attemptKey=a=>JSON.stringify([a.id,a.at??null,Array.isArray(a.selected)?[...a.selected].sort((a,b)=>a-b):[a.selected],a.correct]);
    const recorded=new Set(history.map(attemptKey));if(s.answers.some(a=>!recorded.has(attemptKey(a))))return null;
    return s;
  }
  function renderResume() {
    const s = savedSession();
    $("resume-practice").hidden = !s;
    $("start").textContent = s ? "開始新回合（取代續練進度）" : "開始練習 →";
    if (!s) return;
    const expired = s.exam && s.deadline <= Date.now();
    const completed = s.answers.length === s.ids.length;
    const selected = s.ids.map((id) => bank.find((q) => q.id === id));
    const subject =
      new Set(selected.map((q) => q.subject)).size === 1
        ? selected[0].subject
        : "多科練習";
    $("resume-description").textContent =
      `${subject} · 已答 ${s.answers.length} / ${s.ids.length} 題。${completed ? "本回已答完，可開啟成果與錯題回顧。" : expired ? "模擬倒數已結束，可查看已作答結果。" : "從下一個未作答題繼續，已提交紀錄不會重複計入。"}`;
    $("resume-button").textContent = completed
      ? "查看本回成果"
      : expired
        ? "查看到時的練習結果"
        : "接續未完成的練習";
  }
  window.savePracticeSession = () => {
    if (!queue.length || queue.length > 80) return;
    try {
      localStorage.setItem(
        sessionKey,
        JSON.stringify({
          version: 1,
          ids: queue.map((q) => q.id),
          answers,
          mode: playMode,
          exam,
          deadline: exam ? deadline : null,
          roundNotice,
          savedAt: Date.now(),
        }),
      );
      renderResume();
      saveSettings();
      summary();
    } catch {
      announce("無法保存續練進度，請先完成本回或匯出紀錄備份。");
    }
  };
  window.clearPracticeSession = () => {
    try {
      localStorage.removeItem(sessionKey);
    } catch {}
    $("resume-practice").hidden = true;
    $("start").textContent = "開始練習 →";
  };
  $("resume-button").onclick = () => {
    const s = savedSession();
    if (!s) {
      renderResume();
      return;
    }
    clearInterval(timer);
    timer = null;
    const lookup = new Map(bank.map((q) => [q.id, q]));
    $("question-source").value = s.ids.every((id) =>
      isOriginalQuestion(lookup.get(id)),
    )
      ? "original"
      : "official";
    applyPracticeSource();
    queue = s.ids.map((id) => lookup.get(id));
    answers = s.answers;
    index = answers.length;
    exam = s.exam;
    playMode = s.mode;
    deadline = s.deadline || 0;
    roundNotice = typeof s.roundNotice === "string" ? s.roundNotice : "";
    roundSaved = false;
    setTab("practice");
    show();
    if (exam && index < queue.length) runPracticeClock();
    $("quiz").scrollIntoView({ block: "start", behavior: "instant" });
  };
  $("discard-resume").onclick = () => {
    window.clearPracticeSession();
    announce("已捨棄這回續練進度；已提交的作答與筆記仍保留。");
  };
  function quickPractice(mode, count) {
    if (mode !== "random") {
      const states = reviewState(history);
      if (!activePracticeBank().some(q => reviewMatch(states.get(q.id), mode))) {
        renderReviewDesk();
        announce("目前沒有符合的複習題目，學習紀錄未變更。");
        return;
      }
    }
    const saved = savedSession();
    const unfinished = (saved && saved.answers.length < saved.ids.length) ||
      (queue.length > 0 && index < queue.length);
    if (unfinished && !confirm("開始快速練習會取代未完成的這回續練進度。\n已提交的作答與筆記會保留。確定開始嗎？")) return;
    for (const [id, value] of Object.entries({
      subject: "", year: "", chapter: "", contentfilter: "all",
      structurelane: "all", structuretopic: "", mode, questioncount: String(count),
    })) $(id).value = value;
    syncSubjectShortcuts();
    $("questioncount").dispatchEvent(new Event("change", {bubbles: true}));
    setTab("practice");
    startPractice({confirmed: true});
  }
  $("quick-random").onclick = () => quickPractice("random", 5);
  $("quick-due").onclick = () => quickPractice("due", 10);
  $("quick-learning").onclick = () => quickPractice("learning", 10);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderReviewDesk();
  });
  // A small bottom action mirrors the real button rather than creating a second answer path.
  const dock = $("study-actionbar"),
    dockButton = $("study-action-button");
  let primary = null,
    pending = false;
  function updateDock() {
    pending = false;
    const focused = document.activeElement;
    const editing = !!(
      focused &&
      !focused.readOnly &&
      (focused.tagName === "TEXTAREA" ||
        (focused.tagName === "INPUT" &&
          !["button", "checkbox", "radio"].includes(focused.type)))
    );
    document.body.classList.toggle("ux-editing", editing);
    let target = null,
      context = "";
    if (!$("practice").hidden) {
      target =
        $("quiz").querySelector(".next-question") ||
        $("quiz").querySelector(".submit-answer");
      context = $("quiz").querySelector(".question-count")?.textContent || "";
      if (!target && !document.body.classList.contains("quiz-mode")) {
        target = $("resume-practice").hidden ? $("start") : $("resume-button");
        context = $("resume-practice").hidden
          ? `自訂 ${$("questioncount").value} 題`
          : "進度已保存";
      }
    } else if (!$("rooms").hidden) {
      target =
        $("room-content").querySelector(".room-next") ||
        $("room-content").querySelector(".room-submit");
      context = $("room-clock")?.textContent || "多人房間";
    }
    primary = target;
    document.body.classList.toggle("has-study-action", !!target);
    if (!target) {
      dock.hidden = true;
      return;
    }
    dockButton.textContent = target.textContent;
    dockButton.disabled = target.disabled;
    $("study-action-context").textContent = context;
    const rect = target.getBoundingClientRect(),
      top = document
        .querySelector(".quick-toolbar")
        .getBoundingClientRect().bottom;
    dock.hidden =
      editing || (rect.top >= top && rect.bottom <= innerHeight - 76);
  }
  function scheduleDock() {
    if (!pending) {
      pending = true;
      requestAnimationFrame(updateDock);
    }
  }
  dockButton.onclick = () => {
    if (primary?.isConnected && !primary.disabled) primary.click();
    scheduleDock();
  };
  const observer = new MutationObserver(scheduleDock);
  for (const id of ["quiz", "room-content"])
    observer.observe($(id), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled"],
    });
  window.addEventListener("scroll", scheduleDock, { passive: true });
  window.addEventListener("resize", scheduleDock);
  document.addEventListener("focusin", scheduleDock);
  document.addEventListener("focusout", scheduleDock);
  document.querySelectorAll("[data-mobile-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.mobileTab;
        if (
          id === "practice" &&
          !$("quiz").querySelector(".question-card,.completion-card")
        )
          endPractice();
        setTab(id);
        const target =
          id === "practice" && $("quiz").children.length ? $("quiz") : $(id);
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }),
  );
  function workspace() {
    const id =
      [
        "practice",
        "rooms",
        "site",
        "design",
        "progress",
        "knowledge",
        "references",
        "import",
      ].find((key) => !$(key).hidden) || "practice";
    document.body.classList.toggle("workspace-secondary", id !== "practice");
    document.querySelectorAll("[data-mobile-tab]").forEach((b) => {
      if (b.dataset.mobileTab === id) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    summary();
    scheduleDock();
  }
  document.addEventListener("workspace-change", workspace);
  document.addEventListener("practice-source-change", () => {
    summary();
    saveSettings();
  });
  document.querySelectorAll("[data-reference-query]").forEach(
    (b) =>
      (b.onclick = () => {
        $("refquery").value = b.dataset.referenceQuery;
        runReferenceSearch();
        $("refresults").scrollIntoView({ block: "start" });
      }),
  );
  $("ref-clear").onclick = () => {
    $("refquery").value = "";
    runReferenceSearch();
    $("refquery").focus();
  };
  summary();
  renderResume();
  workspace();
})();
