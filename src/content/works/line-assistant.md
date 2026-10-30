---
title: LINE 個人助理：用 LINE 記事，報表自己長出來
shortTitle: LINE 個人助理
description: 自己每天在用的 LINE 助理。在 LINE 傳一句話，自動解析、寫進 Google 試算表，並定時把行程與待辦整理成簡報推回 LINE。
pubDate: 2026-10-29
tags: [LINE 官方帳號, Google Apps Script, Google 試算表, 系統整合]
order: 1
kind: 自有作品
stack: [LINE Messaging API, Google Apps Script, Google 試算表, Google 日曆, clasp]
cover: /works/cover-line-assistant.webp
coverAlt: LINE 傳訊、Apps Script 解析、試算表歸檔、每日回報推回 LINE 的流程圖
---

這是我自己每天在用的工具。起因很單純：行程、待辦、記帳散在好幾個 App，每個都要打開才記得起來；但 LINE 是我每天一定會開的。

所以我讓 LINE 變成入口：**傳一句話就記好，該提醒的時候它自己來找我。**

## 做了什麼

- 在 LINE 傳訊息，程式判斷是行程、待辦還是記帳，寫進對應的 Google 試算表。
- 串接 Google 日曆，每天早上和每週一推送行程簡報。
- 回覆用 LINE 的卡片訊息（Flex Message），可以直接點按鈕操作，不用記指令。

## 架構

| 部分 | 用什麼 | 負責什麼 |
|---|---|---|
| 入口 | LINE 官方帳號（Messaging API） | 收訊息、回卡片 |
| 程式 | Google Apps Script | 依功能拆成多個模組：訊息路由、資料存取、行事曆、待辦、記帳、設定 |
| 資料 | Google 試算表 | 當資料庫，也當設定頁 |
| 行程 | Google 日曆 | 讀取與修改行程 |

## 設計上的考量

- **設定放在試算表裡**。提醒時間、分類、回覆文字都在表格裡，改設定不用改程式。程式裡只放金鑰。
- **控制推播用量**。LINE 回覆使用者不算額度，主動推播才算，所以排程推播會合併成一則送出。
- **先測試再部署**。本機用模擬的 Apps Script 環境跑邏輯測試，通過後才用 clasp 推上去、更新到同一個部署版本，網址不會變。
- **金鑰不外流**。程式碼放在私有版本庫，提交前自動掃描，避免把金鑰一起提交。

## 可以怎麼用在公司

同樣的架構，換掉「行程、待辦、記帳」就能變成：業務每日回報、客戶聯絡紀錄、預約登記、排班通知、表單彙整。做法說明在[LINE 官方帳號串接 Google 試算表](/services/line-google-sheets/)。
