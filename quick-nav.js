(() => {
  const open = $("quick-menu-open"),
    close = $("quick-menu-close"),
    menu = $("quick-menu");
  const labels = {
    practice: "一般刷題",
    rooms: "多人房間",
    site: "敷地練習",
    design: "設計練習",
    progress: "弱點分析",
    knowledge: "觀念卡／整理資料",
    references: "參考資料",
    import: "管理題庫",
  };
  const practiceCard = () =>
    $("quiz").querySelector(".question-card,.completion-card");
  function updateCurrent(id) {
    id ||= Object.keys(labels).find((key) => !$(key).hidden) || "practice";
    $("quick-current").textContent = labels[id];
    menu.querySelectorAll("[data-quick-go]").forEach((button) => {
      if (button.dataset.quickGo === id)
        button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  function dismiss() {
    open.setAttribute("aria-expanded", "false");
    if (menu.open) menu.close();
  }
  open.onclick = () => {
    const active = !!$("quiz").querySelector(".question-card");
    menu.querySelector('[data-quick-go="lobby"]').textContent = active
      ? "結束本回，重新選科目與題數"
      : "選科目與調整題數";
    $("quick-menu-hint").textContent = timer
      ? "可直接切換功能；模擬練習的倒數仍會繼續。"
      : "切換功能可保留目前作答；選擇重新選題才會結束本回。";
    updateCurrent();
    menu.showModal();
    open.setAttribute("aria-expanded", "true");
  };
  close.onclick = dismiss;
  menu.addEventListener("cancel", () =>
    open.setAttribute("aria-expanded", "false"),
  );
  menu.addEventListener("close", () =>
    open.setAttribute("aria-expanded", "false"),
  );
  menu.addEventListener("click", (event) => {
    if (event.target !== menu) return;
    const rect = menu.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dismiss();
  });
  function reveal(target) {
    target.scrollIntoView({ behavior: "instant", block: "start" });
    const heading = target.querySelector("h2,h3") || target;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  menu.querySelectorAll("[data-quick-go]").forEach(
    (button) =>
      (button.onclick = () => {
        const destination = button.dataset.quickGo;
        dismiss();
        if (destination === "top") {
          window.scrollTo({ top: 0, behavior: "instant" });
          open.focus({ preventScroll: true });
          return;
        }
        if (destination === "lobby") {
          endPractice();
          setTab("practice");
          reveal($("practice"));
          return;
        }
        if (destination === "practice") {
          if (!practiceCard()) endPractice();
          setTab("practice");
          reveal(practiceCard() ? $("quiz") : $("practice"));
          return;
        }
        setTab(destination);
        reveal($(destination));
      }),
  );
  document.addEventListener("workspace-change", (event) =>
    updateCurrent(event.detail.id),
  );
  updateCurrent();
})();
