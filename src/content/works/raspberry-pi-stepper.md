---
title: 樹莓派步進馬達控制：正反轉、角度、轉速一支程式搞定
shortTitle: 樹莓派步進馬達控制
description: 用 Python 在樹莓派上驅動步進馬達正轉、反轉，可指定步數、角度、圈數與轉速。支援 ULN2003＋28BYJ-48 與 A4988／TMC2209 兩種常見接法，附不接硬體也能跑的測試。
pubDate: 2026-10-29
tags: [樹莓派, Python, 步進馬達, 自動控制]
order: 6
kind: 自有作品
stack: [Python, gpiozero, Raspberry Pi]
link: https://github.com/TedShen/tedshen-dev/tree/main/demos/raspberry-pi-stepper
linkLabel: 原始碼（GitHub）
cover: /works/cover-raspberry-pi-stepper.webp
coverAlt: 指令、Python、驅動板、步進馬達的流程圖
---

「用樹莓派讓馬達轉起來」是很常見的需求：做展示裝置、自動餵食器、窗簾、拍攝滑軌、實驗治具，第一步都是這件事。網路上的範例多半只有一段寫死的迴圈，換一顆馬達或想指定角度就得重寫。

這個示範把它整理成一支可以直接用的程式。

> 驗證狀態：程式邏輯以 11 項模擬測試驗證（不接硬體）；接線與參數依驅動板規格整理，尚未在實機上跑過。我實際交付過的樹莓派案子是[小吃店點餐出單機](/works/raspberry-pi-pos/)，同樣是樹莓派接周邊設備，差別在介面與電氣部分。

## 功能

- 正轉、反轉，可指定**步數、角度或圈數**
- 可設定**轉速**（每分鐘圈數），程式自動換算每一步的間隔
- 支援兩種常見接法：
  - **ULN2003 驅動板 ＋ 28BYJ-48**：便宜、好取得，適合輕負載
  - **A4988／DRV8825／TMC2209 ＋ 一般步進馬達**（例如 NEMA17）：扭力大，支援微步
- 結束後自動放開線圈，避免馬達長時間通電發燙
- **Mock 模式**：不接硬體也能在電腦上試跑和測試

## 使用方式

```bash
python3 cli.py --driver uln2003 --degrees 90      # 正轉 90 度
python3 cli.py --driver uln2003 --degrees -90     # 反轉 90 度
python3 cli.py --driver stepdir --turns 2 --rpm 60
```

接線表、驅動器設定和注意事項，寫在[技術筆記](/notes/raspberry-pi-stepper-python/)。

## 品質

- 11 個自動測試涵蓋：正反轉步數、角度換算、轉速換算、半步序列、STEP／DIR 脈衝與致能腳邏輯。
- 驅動方式抽成獨立模組，之後要換成別的驅動器，只要多寫一個類別。

## 可以延伸成

- 加按鈕或網頁介面操作
- 多軸同步、加減速曲線
- 搭配感測器做定位、計數或自動化流程
