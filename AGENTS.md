# tedshen-dev — 專案作業守則（AI / 人類共用）

> 本檔案是最高優先的作業入口。任何對本專案的處理（改碼、改文案、改設定、除錯、部署、研究），開始前先讀本檔，結束前按 §5 留下紀錄並更新相關文件。

## 1. 這是什麼專案

- `dev.tedshen.link`：沈裕德 Ted 的軟體開發與技術顧問接案站，一頁式（Hero → 能做什麼 → 接案經歷 → 作品 → 合作方式 → 另一條線 → CTA → 官方管道）。
- 定位：讓對方快速確認「是這個人」，然後用 LINE 或 Email 聯絡。CTA 以 LINE 為主、Email 為輔。
- Repo：`TedShen/tedshen-dev`，`main` 分支即正式站。

## 2. 技術與部署

- Astro 7 靜態站（零客戶端 JS），`@astrojs/sitemap`，Node >= 22.12。
- 常用指令：`npm install` / `npm run dev`（http://localhost:4321）/ `npm run build`（產出 `dist/`）。
- 部署：push 到 `main` → `.github/workflows/deploy.yml` → GitHub Pages；DNS 在 Cloudflare；`public/CNAME` = `dev.tedshen.link` 不可刪。
- `astro.config.mjs`：`site: https://dev.tedshen.link`，`trailingSlash: 'always'`。canonical、sitemap、站內連結一律帶尾斜線。

## 3. 三站關係（改錯會壞掉的部分）

| 站 | 網址 | Repo | 角色 |
|---|---|---|---|
| 身分頁（正本） | https://tedshen.link | `TedShen/tedshen-hub` | Person schema 正本（`/#person`）、官方帳號總表 |
| 財務教練 | https://grow.tedshen.link | `TedShen/grow` | 財務線入口，本站只做導流不混內容 |
| 本站（軟體線） | https://dev.tedshen.link | 本 repo | 接案站 |

- 社群帳號、Email、LINE 連結的正本在 hub 的 `consts.ts`；本站 `src/consts.ts` 改完要和 hub、grow 保持一致。
- 軟體線只開 LINE 官方帳號（`https://lin.ee/XB3OxbQ`），不開 Threads / IG。
- Person 正本在 `https://tedshen.link/#person`。本站的 Service / WebSite schema 只用 `@id` 引用它，不要在本棧另建一份 Person。
- 版型與官方管道元件是從 hub 複製後微調，三站樣式刻意一致；大改樣式前先對齊 hub。

## 4. 關鍵檔案

- `src/consts.ts` — 網站名稱、描述、對外連結（LINE / Email / HUB / GROW / 履歷 / kindmap）、PERSON 顯示欄位。改聯絡方式只改這裡。
- `src/pages/index.astro` — 全站唯一頁面，含 Service + WebSite JSON-LD，8 個區塊順序固定（見檔頭註解 ①–⑧）。
- `src/layouts/Base.astro` — head（canonical / OG / Twitter / JSON-LD）、全域 CSS（含深色模式）、footer 導覽三站連結。
- `src/components/OfficialChannels.astro` — 官方管道與防冒用聲明（「我不會做的事」5 條不可擅自增刪）。
- `public/` — `avatar.jpg`、`og.jpg`（1200×630）、`favicon.*`、`robots.txt`（sitemap 指向本網域）。

## 5. 作業紀錄規範（強制）

任何作業（無論大小）結束前必須做完這三件，否則視為未完成：

1. **留 git commit**：一個邏輯變更一個 commit，用中文寫清楚「做了什麼＋為什麼」。不要把無關變更塞進同一包。
2. **更新文件**：行為、文案、連結、schema、部署任一有變，就同步改 `README.md` 和／或本檔對應段落。只改註解也要確認註解與現況一致。
3. **寫作業紀錄**：在下方 §6 依模板追加一筆（新紀錄放最上面）。修 bug 另加一行「驗證方式」（如 `npm run build` 通過、預覽 URL 已看）。

模板：

```md
### YYYY-MM-DD — 標題（一句話）
- 範圍：改了哪些檔／哪個區塊
- 原因：為什麼做（需求、issue、口頭指示）
- 驗證：怎麼確認是對的（build、預覽、對照 hub/grow）
```

不用另開 CHANGELOG、工作日誌檔或 issue 來代替本節；§6 就是唯一的作業流水帳。

## 6. 作業紀錄

### 2026-09-18 — 修 SEO 稽核的 4 個 Warning
- 範圍：`src/pages/index.astro`（h1 加 `h1-kicker` 關鍵字行、站外連結補尾斜線、內文連結改 `brand-dark`）、`src/layouts/Base.astro`（小字連結/標籤改 `brand-dark`、`h1-kicker` 樣式、`.card p` 與 `.zone-note` 改 1rem）、`src/components/OfficialChannels.astro`（連結補尾斜線、列表連結與 × 符號改 `brand-dark`）
- 原因：同日 SEO 稽核報告的 Warnings 全修；h1 文案採站主選的「h1 加關鍵字行」方案
- 驗證：`npm run build` 通過；`dist/index.html` 已確認 h1 含關鍵字行、hub/grow/dev 連結皆帶尾斜線、CSS 用 `brand-dark`

### 2026-09-18 — SEO 稽核（純研究，未改程式碼，86/100）
- 範圍：未改任何原始碼；稽核 `src/pages/index.astro`、`src/layouts/Base.astro`、`src/components/OfficialChannels.astro`、`src/consts.ts`、`public/robots.txt`、`astro.config.mjs`，並抓取線上站驗證 HTML、robots.txt、sitemap-index → sitemap-0 → 首頁鏈完整、hub/grow 對外連結有效
- 原因：使用者指示執行 SEO Audit skill
- 驗證：線上渲染 HTML 與原始碼一致；待修項（h1 缺關鍵字、品牌綠內文連結對比約 3.45:1、站外連結尾斜線不一致）已列入稽核報告，修不修由站主決定
- 備註：`AGENTS.md` 本次首度 commit（前一筆紀錄建檔時未 commit，一併納入本包）

### 2026-09-18 — 新增 AGENTS.md，建立作業紀錄規範
- 範圍：新增 `AGENTS.md`（本檔），整理專案總覽、三站關係、關鍵檔案與紀錄規範
- 原因：使用者要求「之後任何作業都知道要去更新與紀錄」
- 驗證：與 `README.md`、`src/consts.ts`、各 `.astro` 檔、`deploy.yml`、`git log` 逐項核對
