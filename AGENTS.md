# tedshen-dev — 專案作業守則（AI / 人類共用）

> 本檔案是最高優先的作業入口。任何對本專案的處理（改碼、改文案、改設定、除錯、部署、研究），開始前先讀本檔，結束前按 §5 留下紀錄並更新相關文件。

## 1. 這是什麼專案

- `dev.tedshen.link`：沈裕德 Ted 的軟體開發與技術顧問接案站。首頁是一頁式（Hero → 能做什麼 → 接案經歷 → 作品 → 合作方式 → 另一條線 → CTA → 官方管道），另有三個內容區：
  - `/services/`：服務頁，一個問題一頁（能解決什麼、怎麼做、怎麼開始）
  - `/works/`：作品與 Demo（自有作品、去識別化案例，不寫客戶名稱）
  - `/notes/`：技術筆記
- 定位：軟體為主、遠端為主（系統串接、流程自動化、網站與內部工具），機器視覺與設備軟體是加分背景。讓對方快速確認「是這個人」，然後用 LINE 或 Email 聯絡。CTA 以 LINE 為主、Email 為輔。
- 內容策略：打具體問題的長尾關鍵字，讓準備發案、先上網查的人找到本站。規劃見專案文件 `claude/dev-seo-plan-2026-10-29.md`（claude.ai 專案「個人-網路相關」）。
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
- `src/pages/index.astro` — 首頁，含 Service + WebSite JSON-LD，8 個區塊順序固定（見檔頭註解 ①–⑧）；② 與 ④ 結尾有連到 `/services/`、`/works/`、`/notes/` 的按鈕。
- `src/content.config.ts` — 三個內容集合 `services`、`works`、`notes` 的欄位定義。`works` 多了 `kind`（自有作品／案例）、`stack`、`link`、`cover`。`draft: true` 不進 build。
- `src/content/<集合>/<slug>.md` — 內容本體，檔名就是網址 slug。新增文章只要加一個 md 檔。
- `src/lib/sections.ts` — 三區的名稱、網址、列表說明，以及排序（`order` 小在前，再依日期新到舊）。
- `src/pages/[section]/index.astro`、`[slug].astro` — 列表頁與內頁共用模板。內頁 schema：服務頁 `Service`、作品 `CreativeWork`、筆記 `TechArticle`，都用 `@id` 引用 hub 的 Person；Base 自動加 BreadcrumbList。
- `src/components/SiteNav.astro` — 內頁頂部導覽；`ContactCTA.astro` — 內頁結尾 LINE／Email 聯絡區。
- `public/works/` — 作品封面（1200×900 webp，深藍底＋一句標題＋流程圖的統一版型）。
- `demos/` — Demo 原始碼，不進 Astro build，作品頁連到 GitHub 上的資料夾。每個 demo 自帶 README 與測試。
- `src/layouts/Base.astro` — head（canonical / OG / Twitter / JSON-LD）、全域 CSS（含深色模式）、footer 導覽三站連結。
- `src/components/OfficialChannels.astro` — 官方管道與防冒用聲明（「我不會做的事」5 條不可擅自增刪）。
- `public/` — `avatar.jpg`＋`avatar.webp`（首屏頭像用 `<picture>`，webp 優先、jpg fallback）、`og.jpg`（1200×630；og:image 沿用 jpg 保分享相容）、`favicon.*`、`robots.txt`（sitemap 指向本網域）。

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

### 2026-10-29 — 從一頁式擴充為服務／作品／筆記三區，加第一批內容與步進馬達 demo
- 範圍：新增 `src/content.config.ts`、`src/lib/sections.ts`、`src/pages/[section]/index.astro`、`src/pages/[section]/[slug].astro`、`src/components/SiteNav.astro`、`src/components/ContactCTA.astro`；`src/layouts/Base.astro`（內頁導覽、卡片連結、程式碼與表格樣式，footer 導覽加三區）；`src/pages/index.astro`（② 服務卡片改為系統串接、網站在前，設備軟體移到第三；② ④ 加三區入口按鈕）；內容 5 篇：`services/line-google-sheets`、`works/line-assistant`、`works/kindmap`、`works/raspberry-pi-stepper`、`notes/raspberry-pi-stepper-python`；`public/works/` 三張封面；`demos/raspberry-pi-stepper/`（stepper.py、cli.py、test_stepper.py、README）
- 原因：站主 2026-10-29 決定接案定位改為軟體為主、遠端為主，並以長尾關鍵字讓發案者從搜尋找到本站；出任務上低價案改做成通用 demo 當作品
- 驗證：`npm run build` 通過（9 頁），sitemap 含全部新網址；本機 preview 以 1280px 與 390px 截圖檢查，無橫向捲動；`python3 -m unittest -v` 11 項測試通過，`cli.py --driver mock` 試跑正常
- 備註：demo 原始碼的 GitHub 連結（`tree/main/demos/raspberry-pi-stepper`）要合併到 main 後才會生效

### 2026-09-18 — 修 SEO 稽核的 Opportunities（5 項全做）
- 範圍：`public/avatar.webp`（新增，sharp webp q82，101KB→62KB）、`src/pages/index.astro`（頭像改 `<picture>` webp 優先＋jpg fallback＋`fetchpriority="high"`、WebSite schema `url` 改 `abs('/')`）、`src/layouts/Base.astro`（加 `twitter:image:alt`、加深淺色 `theme-color`、刪非標準 `<link rel="sitemap">`）、`AGENTS.md` §4（補 avatar.webp 說明）
- 原因：同日 SEO 稽核報告的 Opportunities 全修
- 驗證：`npm run build` 通過；`dist/index.html` 已確認 picture/twitter:image:alt/theme-color/schema url 尾斜線、無 `rel="sitemap"`；og:image 維持 `og.jpg`（分享爬蟲相容），轉好的 `og.webp` 未用已刪
- 備註：轉檔用暫存區 `sharp`（`Temp\opencode\webpconv`），未進專案依賴

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
