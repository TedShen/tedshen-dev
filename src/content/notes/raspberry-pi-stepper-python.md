---
title: 樹莓派用 Python 控制步進馬達：接線、程式與常見問題
shortTitle: 樹莓派 Python 控制步進馬達
description: 從選驅動板、接線到 Python 程式，說明樹莓派怎麼讓步進馬達正轉、反轉、轉指定角度。涵蓋 ULN2003＋28BYJ-48 與 A4988／TMC2209 兩種接法，以及抖動、失步、發燙的原因。
pubDate: 2026-10-29
tags: [樹莓派, Python, 步進馬達, gpiozero]
---

這篇是[樹莓派步進馬達控制](/works/raspberry-pi-stepper/)的實作筆記。完整程式碼在 [GitHub](https://github.com/TedShen/tedshen-dev/tree/main/demos/raspberry-pi-stepper)。

## 先選驅動方式

樹莓派的 GPIO 電流很小，**不能直接接馬達**，中間一定要有驅動板。常見兩種：

| | ULN2003 ＋ 28BYJ-48 | A4988／TMC2209 ＋ NEMA17 |
|---|---|---|
| 價格 | 很便宜，常整組賣 | 較高 |
| 扭力 | 小，有減速齒輪 | 大 |
| 轉速 | 慢，約 10～15 rpm 以內 | 快 |
| 控制線 | 4 條（IN1～IN4） | 2～3 條（STEP、DIR、EN） |
| 適合 | 展示、輕負載、學習 | 滑軌、治具、需要力量的機構 |

## 接線

### ULN2003 ＋ 28BYJ-48

| ULN2003 板 | 樹莓派 |
|---|---|
| IN1～IN4 | GPIO17、18、27、22（實體 pin 11、12、13、15） |
| ＋ | 外接 5V |
| − | 外接電源負極，並接樹莓派 GND |

### A4988／TMC2209 ＋ 步進馬達

| 驅動器 | 樹莓派 |
|---|---|
| STEP | GPIO20（pin 38） |
| DIR | GPIO21（pin 40） |
| EN | GPIO16（pin 36），低電位啟用 |
| VDD／GND（邏輯） | 3.3V（pin 1）／GND |
| VMOT（馬達電源） | 外接，依馬達與驅動器規格 |

**兩種接法都要共地**：馬達電源的負極要和樹莓派 GND 接在一起，否則訊號沒有共同的參考電位，馬達會亂抖或不動。

## 程式的核心

### ULN2003：照序列輪流通電

28BYJ-48 有四組線圈，依順序通電就會轉。半步序列共 8 個狀態，往前走就是正轉，往回走就是反轉：

```python
HALF_STEP_SEQUENCE = (
    (1, 0, 0, 0), (1, 1, 0, 0), (0, 1, 0, 0), (0, 1, 1, 0),
    (0, 0, 1, 0), (0, 0, 1, 1), (0, 0, 0, 1), (1, 0, 0, 1),
)

def step(self, direction):
    self.index = (self.index + direction) % 8
    for out, value in zip(self.outputs, HALF_STEP_SEQUENCE[self.index]):
        out.value = value
```

### STEP／DIR：方向一條線，脈衝一條線

驅動器把線圈時序都處理掉了，程式只要設定方向，再送一個脈衝就走一步：

```python
def step(self, direction):
    self.dir_out.value = 1 if direction == CW else 0
    self.step_out.value = 1
    time.sleep(5e-6)
    self.step_out.value = 0
```

### 轉速怎麼換算

每一步之間要等多久，由轉速和「一圈幾步」決定：

```text
每步間隔（秒） = 60 ÷ (rpm × 一圈步數)
```

例如 1.8° 馬達一圈 200 步，60 rpm 就是每步 5 毫秒。

### 一圈到底幾步

- **28BYJ-48 半步**：約 4096 步。不同批次的減速比略有差異，要精準定位請自己轉十圈量一下。
- **1.8° 步進馬達**：整步 200 步；驅動器設成 16 微步就是 3200 步。程式裡的 `--steps-per-rev` 要跟驅動器設定一致，不然角度會不準。

## 常見問題

**馬達只抖不轉**
多半是線序錯，或轉速太快。28BYJ-48 先把轉速降到 5 rpm 試；STEP／DIR 驅動器檢查馬達兩組線圈有沒有接對（同一組線圈的兩條線，量起來電阻很小）。

**轉一轉會失步、位置跑掉**
負載太重或轉速太快。先降速；要快又要穩，就需要加減速曲線，或換扭力更大的馬達。

**馬達很燙**
停著的時候線圈還一直通電。程式預設結束會放開線圈（`release()`）；如果你需要停著也保持出力，再加 `--hold`。A4988、TMC2209 這類驅動器也要先把電流限制調到馬達的額定值。

**換了樹莓派 5 就不能用**
Pi 5 的 GPIO 架構改了，舊的 `RPi.GPIO` 套件不支援。這份程式用的是 `gpiozero`，Raspberry Pi OS 內建，Pi 5 也能用。

## 不接硬體先測

程式裡有 Mock 模式和 11 個自動測試，可以先在電腦上確認邏輯：

```bash
python3 cli.py --driver mock --turns 1
python3 -m unittest -v
```

## 這種程式的極限

Python 在 Linux 上用 `time.sleep` 控制節奏，一般的正反轉、定位都夠用；但作業系統排程會造成微小的時間抖動，需要高轉速、非常平順的運動，或多軸精準同步，就該改用硬體 PWM、`pigpio`，或交給專用的運動控制板。
