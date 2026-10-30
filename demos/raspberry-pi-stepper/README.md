# 樹莓派步進馬達控制（Python）

用樹莓派驅動步進馬達正轉、反轉，可指定步數、角度、圈數和轉速。
自有作品／示範，說明文章在 https://dev.tedshen.link/notes/raspberry-pi-stepper-python/

## 檔案

| 檔案 | 用途 |
|---|---|
| `stepper.py` | 控制程式本體：`StepperMotor` 加三種驅動方式（ULN2003、STEP/DIR、Mock） |
| `cli.py` | 命令列操作 |
| `test_stepper.py` | 不接硬體的測試，`python3 -m unittest -v` |

## 先在電腦上試跑（不接硬體）

```bash
python3 cli.py --driver mock --turns 1
python3 -m unittest -v
```

## 接法一：ULN2003 驅動板 + 28BYJ-48

| ULN2003 板 | 樹莓派（BCM 編號／實體腳位） |
|---|---|
| IN1 | GPIO17（pin 11） |
| IN2 | GPIO18（pin 12） |
| IN3 | GPIO27（pin 13） |
| IN4 | GPIO22（pin 15） |
| + （5V） | 外接 5V 電源正極 |
| − （GND） | 外接電源負極，**同時接樹莓派 GND**（pin 6） |

```bash
python3 cli.py --driver uln2003 --degrees 90     # 正轉 90 度
python3 cli.py --driver uln2003 --degrees -90    # 反轉 90 度
python3 cli.py --driver uln2003 --turns 1 --rpm 10
```

- 28BYJ-48 有減速齒輪，半步一圈約 4096 步，轉速大約 10～15 rpm 以內比較穩，太快會失步。
- 馬達建議用外接 5V 供電，GND 一定要和樹莓派共地。

## 接法二：A4988 / DRV8825 / TMC2209 + 一般步進馬達（例如 NEMA17）

| 驅動器 | 樹莓派 |
|---|---|
| STEP | GPIO20（pin 38） |
| DIR | GPIO21（pin 40） |
| EN | GPIO16（pin 36），低電位啟用 |
| GND（邏輯） | GND（pin 34） |
| VDD（邏輯電源） | 3.3V（pin 1） |
| VMOT／GND（馬達電源） | 外接馬達電源（依驅動器與馬達規格，常見 12V） |

```bash
# 整步：1.8° 馬達一圈 200 步
python3 cli.py --driver stepdir --turns 1 --rpm 60
# 驅動器設成 16 微步：一圈 3200 步
python3 cli.py --driver stepdir --steps-per-rev 3200 --turns 2 --rpm 60
```

- 馬達電源**不要**從樹莓派取，一定要外接。
- 先依驅動器說明調好電流限制，再接馬達通電；通電時不要插拔馬達線。

## 安裝

Raspberry Pi OS 通常已內建 `gpiozero`；沒有的話：

```bash
sudo apt install python3-gpiozero
```

## 限制

- Python 用 `time.sleep` 控制節奏，一般正反轉、定位足夠；需要高轉速或非常平順的運動，改用硬體 PWM、`pigpio`，或交給專用控制板。
- 沒有加減速曲線，帶重負載時要把轉速放慢。
- 預設結束後會放開線圈避免發燙，需要保持出力請加 `--hold`。
