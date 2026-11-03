---
title: 軟體工具許願池：檔案不上傳的三語 PDF 與圖片工具站
shortTitle: 軟體工具許願池 tools.tedshen.link
description: 在瀏覽器裡完成的 PDF 與圖片工具站，中英日三語，檔案不上傳。PDF 合併、分割、轉檔，圖片壓縮與 QR code 都在使用者裝置上處理；許願頁讓人提出想要的工具與預算，即時寄信通知。
pubDate: 2026-10-15
tags: [網站架設, 瀏覽器端處理, Cloudflare, 多語系]
order: 10
cover: /works/cover-tools-wishpool.webp
coverAlt: PDF 工具、圖片、QR code、許願池四個區塊的流程圖
kind: 自有作品
stack: [Cloudflare Workers, Cloudflare D1, Email Routing, pdf.js, pdf-lib, fflate, Playwright]
link: https://tools.tedshen.link/
linkLabel: tools.tedshen.link
---

很多免費 PDF 工具要先把檔案上傳到別人的伺服器。合約、報價單、病歷這類文件，其實不該這樣處理。

軟體工具許願池的承諾是四件事：**檔案不上傳、繁體中文、免註冊、不限次數。** 所有處理都在使用者自己的瀏覽器裡完成。

## 做了什麼

- **五個工具**：PDF 合併、PDF 分割、PDF 轉 Word／純文字／JPG／PNG、圖片壓縮／轉檔、QR code 產生。
- **中英日三語**：中文在根目錄，英文 `/en/`、日文 `/ja/`，路徑一一對應；三種語言共用同一支程式，提示文字依頁面語言切換。
- **許願頁**：使用者寫下想要的工具和預算，資料存進資料庫，同時寄通知信給我，直接回信就能聯絡許願的人。
- **每個工具配一篇指南**：說明不同情境下該用什麼方法，包含其他工具的比較。

## 架構

| 部分 | 用什麼 |
|---|---|
| 網站與 API | Cloudflare Workers＋靜態檔 |
| 許願資料 | Cloudflare D1 |
| 通知信 | Cloudflare Email Routing |
| PDF 合併 | pdf-lib，放在站內，不從外部 CDN 載入 |
| PDF 轉檔 | pdf.js（legacy 版，舊 iPhone 也能跑）＋ fflate 打包 .docx 與 .zip |
| QR code | qrcode-generator，放在站內 |
| 測試 | Playwright（WebKit），貼近 iPhone Safari |

## 設計上的考量

- **「不上傳」從瀏覽器層級擋住**。內容安全政策（CSP）只允許連回本站，就算程式出錯，檔案也送不出去。
- **.docx 自己組**。用 pdf.js 擷取文字、依座標重建段落，自行產生 Word 檔，不依賴外部轉檔服務；支援中文字型對照，掃描檔會提示改轉圖片。
- **零伺服器維運**。表單、資料庫、寄信都在 Cloudflare 的免費額度內，沒有主機要顧。

## 可以怎麼用在公司

同樣的「檔案不離開裝置」做法，可以部署在公司內網，給有保密需求的事務所、診所使用；許願表單這一套也能改成詢價、預約或報修表單。
