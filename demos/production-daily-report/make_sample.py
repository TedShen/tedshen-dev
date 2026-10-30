"""產生範例資料：三台機台、一天兩班、每小時一筆，故意放幾個常見的髒資料。

  python3 make_sample.py           # 輸出到 sample/
"""
import csv
import random
from datetime import datetime, timedelta
from pathlib import Path

REASONS = ["換線", "待料", "設備異常", "品質確認", "保養"]


def make(out_dir: Path = Path("sample"), seed: int = 7) -> Path:
    rnd = random.Random(seed)
    out_dir.mkdir(parents=True, exist_ok=True)
    start = datetime(2026, 10, 29, 8, 0)
    for m, (ng_rate, enc) in {"M01": (0.01, "utf-8-sig"), "M02": (0.045, "cp950"), "M03": (0.015, "utf-8-sig")}.items():
        rows = []
        for h in range(24):
            ts = start + timedelta(hours=h)
            inp = rnd.randint(280, 320)
            ng = round(inp * ng_rate * rnd.uniform(0.5, 1.5))
            down, reason = 0, ""
            if rnd.random() < 0.2:
                down, reason = rnd.choice([10, 15, 20, 35]), rnd.choice(REASONS)
            rows.append([ts.strftime("%Y/%m/%d %H:%M"), f"WO-{1000 + h // 6}", "P-A12", inp, inp - ng, ng, down, reason])
        if m == "M02":
            rows[5][6], rows[5][7] = 95, "設備異常"     # 停機過長
            rows[9][4] = rows[9][4] - 3               # 數量對不起來
        if m == "M03":
            rows[14][6], rows[14][7] = 20, ""          # 停機未填原因
            rows[17][3] = "N/A"                        # 無法辨識的數字
            rows.insert(12, ["", "", "", "", "", "", "", ""])  # 空白列
        with open(out_dir / f"{m}_20261029.csv", "w", newline="", encoding=enc) as f:
            w = csv.writer(f)
            w.writerow(["時間", "工單", "品號", "投入數", "良品數", "不良數", "停機分鐘", "停機原因"])
            w.writerows(rows)
    return out_dir


if __name__ == "__main__":
    print("範例資料：", make())
