# 多人冒險房間：啟用與維護

## 目前公開接線

使用者提供的服務網址是 `https://architect-study-rooms.onrender.com`，目前 `rooms-config.js` 已設定此公開網址。原 GitHub Pages 網站會連到該服務；Render 本身供應的網站會使用同來源 API。雲端執行環境的網路政策封鎖此網域，遠端健康檢查在 proxy CONNECT 階段收到 403，尚未由此環境驗證遠端連線；這與房間 API 回傳 403 是不同情況。

## 目前完成的功能

2～6 位玩家，各自以暱稱和六碼房號加入；邀請連結只包含房號，不包含登入令牌。支援合作打怪和多人競賽，房主可選四科混合或單一科目，以及 5、10、20 題。每題 45 秒，所有人提交或時間到才揭答，只有房主可推進下一題。答對得 1 分；合作全隊答對達總作答機會的 60% 即打倒 Boss。題目從正式題庫隨機抽取，不重複；一律給分及不計正確率題不參與。

這是訪客房間版本，沒有永久帳號、好友或跨裝置戰績。房間分數不灌入單人冒險經驗。瀏覽器分頁重新整理會用 sessionStorage 中的私有令牌重連；不要在聊天、網址、日誌或截圖分享令牌。關閉分頁後不保證能取回同一位玩家。房主明確離開會移交房主；房主停止連線超過 30 秒時，由仍在線的玩家接手。請用「離開房間」退出；短暫離線的玩家會保留到倒數結束。

## 最簡單啟用方式：Render

GitHub Pages 繼續承載原網站；額外建立一個 Node 服務處理房間。無需資料庫、Supabase 金鑰或新增 npm 套件。

1. 登入或建立 Render 帳號，使用部署連結：
   https://render.com/deploy?repo=https://github.com/s100009986075993-boop/-
2. 依畫面授權讀取此 GitHub 儲存庫，使用 `main` 分支與根目錄的 `render.yaml`。Blueprint 已指定 `plan: free`。請檢查建立畫面確認選用免費服務；不要自行切換到付費方案。
3. 建立 `architect-study-rooms` 服務，等待部署完成。啟動命令為 `node server/rooms.cjs`；健康檢查是 `/health`。若使用一般 Web Service 而非 Blueprint，runtime 選 Node，Build command 用 `node --check server/rooms.cjs`，Start command 用 `node server/rooms.cjs`。
4. Render 產生的 HTTPS 網址（例如實際分配的 `https://…onrender.com`）本身就能開啟完整網站和多人房間；可先用兩台手機直接在該網址試玩。`/health` 應回應 `{"ok":true,"version":"rooms-1"}`。
5. 將**公開服務網址**提供給維護者，或把根目錄 `rooms-config.js` 的 `apiBase: null` 改為該 HTTPS 網址，例如 `apiBase: "https://實際服務名稱.onrender.com"`。這是公開網址，不是密碼，不需要任何秘密金鑰。更新資源版本號並依 `PUBLICATION.md` 重新發布 GitHub Pages。
6. 在原 GitHub Pages 網站建立房間，第二台裝置開邀請連結，確認兩人同題、揭答時機、計分及重連，再宣告公開多人連線可用。

在 Node 服務直接開網站時，`/rooms-config.js` 會由伺服器產生同來源設定，不需要手動修改。Render 自動提供的 `RENDER_EXTERNAL_URL` 也會加入允許來源。`PUBLIC_ORIGIN` 已設定為 `https://s100009986075993-boop.github.io`（來源不含 `/-/` 路徑），用來允許原網站連線。

Render 免費方案可能休眠，第一次連線需等待啟動；額度、政策與是否需驗證帳號以建立畫面為準。本原型將房間保留在單一 Node 程序記憶體，重啟或重新部署會清除房間，不能開多個副本共同服務；無操作的房間兩小時後清除。單人學習紀錄仍在玩家原瀏覽器。正式長期服務若需要穩定房間或永久帳號，下一步再增加資料庫與帳號認證。

## 本機開發與已驗證流程

在現有 checkout `/workspace/-` 工作，每個雲端任務已隔離；未經使用者要求不要另建 Git worktree。

```sh
npm run rooms:start
```

預設埠 3001，可用 `PORT` 指定；服務會同時供應網站與房間 API，無需另外啟動 Python 服務。開兩個獨立瀏覽器環境，選「多人房間」，一位開房、一位用房號加入。

```sh
npm test
node scripts/check_rooms.cjs
```

`check_rooms.cjs` 預設測試 3001 服務，也額外在 3000 的靜態網站確認「尚未開放」提示，故執行這支腳本時需同時用 `npm start` 啟動 3000。需要既有 Playwright 與 `/usr/bin/chromium`；可用 `CHROMIUM_PATH` 指定。兩個隔離瀏覽器驗證邀請、共題、答案隱藏、暫選不受他人提交重設、重新整理、離線重連、五題合作結算與桌機／手機版面。單元與 HTTP 測試涵蓋競賽計分、權限、六人上限、逾時、過期、重複提交及不合法輸入。

若日後停用服務，將靜態 `rooms-config.js` 設為 `apiBase: null`，房間就不發送 API 請求，也不提供假的同機同步冒充網路連線。程式和本機測試成功不代表遠端服務連線已驗證。

## 存取控制與限制

伺服器保存題目、判分與進度；客戶端只可提交選項，不能指定分數。全員提交前 API 不回傳官方答案或其他人的答案，回應與日誌不含玩家令牌。限制 JSON 大小、來源和請求頻率；加入後不能中途換玩家，房間開始後不接受新加入。房號是私人邀請資訊，沒有搜尋公開房間的介面。

這是朋友間練習的原型，尚無帳號封禁、持久化、全球排行或高強度反作弊。正式題庫在原有靜態網站仍可讀取，所以不應宣稱能防止查答案。若後續做正式排名，需要另行設計題庫存取與帳號規則。
