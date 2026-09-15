# dev.tedshen.link

沈裕德 Ted 的軟體開發與技術顧問接案站。一頁式：能做什麼、合作方式、作品、聯絡方式、官方管道。

- 身分頁：<https://tedshen.link>（`TedShen/tedshen-hub`）
- 財務教練：<https://grow.tedshen.link>（`TedShen/grow`）

## 技術

Astro 靜態站，GitHub Actions 部署到 GitHub Pages，DNS 在 Cloudflare。
版型和官方管道元件從 hub 複製後微調，三站樣式一致。

## 常用指令

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # 產出到 dist/
```

## 改東西時

- 社群帳號、Email、LINE 連結在 `src/consts.ts`，和 hub、grow 的要保持一致。
- Person 的正本在 `https://tedshen.link/#person`，這站的 Service 和 WebSite schema 只引用它。
