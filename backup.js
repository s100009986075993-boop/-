// Versioned, local-only backup/restore for learning records. No network calls.
const StudyBackup = (() => {
  const keys = [
    "architect-history",
    "architect-question-notes",
    "architect-adventure-rounds",
    "architect-site-records",
    "architect-design-records",
    "architect-bank",
    "architect-practice-settings",
    "architect-answerflow",
  ];
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const safeId = value => typeof value === "string" && value.length > 0 && value.length <= 200 && !["__proto__", "constructor", "prototype"].includes(value);
  const isIndex = value => Number.isInteger(value) && value >= 0 && value <= 100;
  function checkData(data) {
    if (!isObject(data) || Object.keys(data).some(key => !keys.includes(key)))
      throw new Error("備份包含不支援的資料欄位");
    for (const [key, value] of Object.entries(data)) {
      if (key === "architect-history") {
        if (!Array.isArray(value) || value.length > 200000 ||
            value.some(a => !isObject(a) || !safeId(a.id) ||
              typeof a.subject !== "string" || typeof a.correct !== "boolean" ||
              !(isIndex(a.selected) || (Array.isArray(a.selected) && a.selected.length <= 10 && a.selected.every(isIndex)))))
          throw new Error("作答紀錄格式不正確");
      } else if (key === "architect-question-notes") {
        if (!isObject(value) || Object.keys(value).length > 50000 ||
            Object.entries(value).some(([id, note]) => !safeId(id) || !isObject(note) ||
              typeof note.text !== "string" || note.text.length > 4000 ||
              typeof note.reason !== "string" ||
              (note.updatedAt != null && typeof note.updatedAt !== "string")))
          throw new Error("單題筆記格式不正確");
      } else if (key === "architect-adventure-rounds") {
        if (!Number.isSafeInteger(value) || value < 0)
          throw new Error("冒險回合數格式不正確");
      } else if (key === "architect-site-records" || key === "architect-design-records") {
        if (!isObject(value) || Object.keys(value).length > 500 ||
            Object.entries(value).some(([id, record]) => !safeId(id) || !isObject(record) ||
              typeof record.notes !== "string" || record.notes.length > 100000 ||
              !Array.isArray(record.checks) || record.checks.some(n => !isIndex(n)) ||
              !isObject(record.session) ||
              !["idle", "running", "paused", "finished"].includes(record.session.status) ||
              !Number.isFinite(record.session.remainingMs) || record.session.remainingMs < 0 ||
              (record.session.deadline !== null && !Number.isFinite(record.session.deadline))))
          throw new Error("敷地／設計練習紀錄格式不正確");
      } else if (key === "architect-bank") {
        if (!Array.isArray(value) || value.length > 50000)
          throw new Error("自訂題庫格式不正確");
      } else if (key === "architect-practice-settings") {
        if (!isObject(value) || Object.entries(value).some(([id, v]) => !safeId(id) || typeof v !== "string"))
          throw new Error("練習偏好設定格式不正確");
      } else if (key === "architect-answerflow") {
        if (value !== "instant" && value !== "confirm")
          throw new Error("作答偏好設定格式不正確");
      }
    }
    return data;
  }
  function create(storage, at = new Date().toISOString()) {
    const data = {};
    for (const key of keys) {
      const raw = storage.getItem(key);
      if (raw !== null) data[key] = JSON.parse(raw);
    }
    return { format: "architect-study-backup", version: 1, exportedAt: at, data: checkData(data) };
  }
  function parse(value) {
    if (!isObject(value)) throw new Error("請選擇有效的 JSON 備份");
    if (value.format === "architect-study-backup" && value.version === 1)
      return { kind: "full", data: checkData(value.data) };
    // Compatible with the old "匯出學習紀錄" file.
    if (Array.isArray(value.history) && isObject(value.questionNotes)) {
      const data = {
        "architect-history": value.history,
        "architect-question-notes": value.questionNotes,
      };
      if (value.adventureRounds !== undefined)
        data["architect-adventure-rounds"] = value.adventureRounds;
      return { kind: "legacy", data: checkData(data) };
    }
    throw new Error("不支援此備份格式。請使用完整備份或舊版 architect-progress.json");
  }
  function restore(storage, parsed) {
    const data = checkData(parsed.data);
    const updateKeys = parsed.kind === "full" ? keys : Object.keys(data);
    const previous = new Map(updateKeys.map(key => [key, storage.getItem(key)]));
    try {
      for (const key of updateKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key))
          storage.setItem(key, JSON.stringify(data[key]));
        else storage.removeItem(key);
      }
    } catch (error) {
      for (const [key, old] of previous) {
        try {
          if (old === null) storage.removeItem(key);
          else storage.setItem(key, old);
        } catch {}
      }
      throw new Error("儲存空間不足或瀏覽器限制，已嘗試還原先前資料：" + error.message);
    }
    return updateKeys.length;
  }
  return { keys, create, parse, restore };
})();
if (typeof module !== "undefined" && module.exports) module.exports = StudyBackup;

if (typeof document !== "undefined") {
  const exportButton = document.getElementById("full-backup-export");
  const importInput = document.getElementById("full-backup-import");
  const status = document.getElementById("full-backup-status");
  if (exportButton && importInput && status) {
    function download(data, filename) {
      const link = document.createElement("a");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    exportButton.addEventListener("click", () => {
      try {
        download(StudyBackup.create(localStorage), "architect-study-full-backup.json");
        status.textContent = "已建立完整備份檔。請確認下載已完成並妥善保存。";
      } catch (error) {
        status.textContent = "備份失敗：" + error.message;
      }
    });
    importInput.addEventListener("change", async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        if (file.size > 30 * 1024 * 1024) throw new Error("備份檔不可超過 30 MB");
        const parsed = StudyBackup.parse(JSON.parse(await file.text()));
        const custom = parsed.data["architect-bank"];
        if (custom?.length) {
          validateBank(custom);
          if (custom.some(q => builtInIds.has(q.id) || q.id.startsWith("demo-")))
            throw new Error("備份自訂題庫與內建題號衝突，無法還原");
        }
        const historyCount = parsed.data["architect-history"]?.length ?? 0;
        const siteCount = Object.keys(parsed.data["architect-site-records"] || {}).length;
        const designCount = Object.keys(parsed.data["architect-design-records"] || {}).length;
        const notice = parsed.kind === "full"
          ? "完整備份會覆蓋目前的作答紀錄、筆記、自訂題庫與設定（不包含進行中的未提交回合）。"
          : "舊版備份只會覆蓋作答紀錄、單題筆記與冒險回合，不影響敷地／設計紀錄。";
        if (!confirm("將還原 " + historyCount + " 筆作答、" + siteCount + " 份敷地及 " + designCount + " 份設計紀錄。\n" +
          notice + "\n請先確認目前資料已有其他備份。是否確定覆蓋？")) {
          status.textContent = "已取消還原，目前資料未變更。";
          return;
        }
        // Safety copy before any writes, even if the incoming file fails later.
        download(StudyBackup.create(localStorage), "architect-study-before-restore.json");
        StudyBackup.restore(localStorage, parsed);
        status.textContent = "還原成功，正在重新整理以載入紀錄。";
        location.reload();
      } catch (error) {
        status.textContent = "還原失敗，未完成資料更新：" + error.message;
      } finally {
        importInput.value = "";
      }
    });
  }
}
