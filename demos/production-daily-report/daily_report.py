"""生產日報自動彙整：把每台機台匯出的 CSV，整理成一份 Excel 日報。

輸入：一個資料夾，每台機台一個（或多個）CSV，檔名開頭是機台名稱，例如 M01_20261029.csv。
  欄位（標題列，順序不限）：
    時間, 工單, 品號, 投入數, 良品數, 不良數, 停機分鐘, 停機原因
  - 時間：2026-10-29 08:00 或 2026/10/29 08:00
  - 編碼：UTF-8（含 BOM）或 Big5（cp950）都可以，機台常見的 Big5 匯出檔不用先轉

輸出：Excel，五個分頁
  總覽       每台機台：投入、良品、不良、良率、停機、稼動率，未達標準標紅
  班別       每台機台 × 早班／夜班
  停機原因   依停機分鐘排序
  異常清單   良率過低、停機過長、數字對不起來的資料列
  原始資料   合併後的全部紀錄，方便回查

班別：早班 08:00–20:00；夜班 20:00–隔天 08:00，夜班算在「開始那天」。
"""
from __future__ import annotations

import argparse
import csv
import io
import sys
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

REQUIRED = ["時間", "投入數", "良品數", "不良數"]
OPTIONAL = ["工單", "品號", "停機分鐘", "停機原因"]
# 常見的欄位別名，機台匯出的標題不統一時自動對應
ALIASES = {
    "時間": ["時間", "日期時間", "timestamp", "time", "datetime"],
    "工單": ["工單", "工單號", "work_order", "wo"],
    "品號": ["品號", "料號", "產品", "part_no", "product"],
    "投入數": ["投入數", "投入", "input", "input_qty"],
    "良品數": ["良品數", "良品", "good", "good_qty", "ok"],
    "不良數": ["不良數", "不良", "ng", "ng_qty", "defect"],
    "停機分鐘": ["停機分鐘", "停機時間", "downtime", "downtime_min"],
    "停機原因": ["停機原因", "原因", "downtime_reason", "reason"],
}


@dataclass
class Settings:
    day_shift_start: time = time(8, 0)
    night_shift_start: time = time(20, 0)
    min_yield: float = 0.97           # 良率低於此值標紅
    max_downtime_min: float = 60.0    # 單筆停機超過此分鐘列入異常
    planned_minutes_per_shift: float = 720.0  # 一班 12 小時，用來算稼動率


@dataclass
class Record:
    machine: str
    ts: datetime
    work_order: str
    part_no: str
    input_qty: int
    good_qty: int
    ng_qty: int
    downtime_min: float
    reason: str
    source: str
    line_no: int


@dataclass
class Issue:
    machine: str
    ts: str
    kind: str
    detail: str
    source: str


@dataclass
class LoadResult:
    records: list[Record] = field(default_factory=list)
    issues: list[Issue] = field(default_factory=list)


def read_text(path: Path) -> str:
    """先試 UTF-8（含 BOM），失敗再試 Big5（cp950）。"""
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp950"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def map_headers(header: list[str]) -> dict[str, int]:
    norm = [h.strip().lower() for h in header]
    mapping = {}
    for field_name, names in ALIASES.items():
        for n in names:
            if n.lower() in norm:
                mapping[field_name] = norm.index(n.lower())
                break
    return mapping


def parse_ts(s: str) -> datetime | None:
    s = s.strip().replace("/", "-")
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def to_num(s: str | None) -> float | None:
    if s is None:
        return None
    s = str(s).strip().replace(",", "")
    if s == "":
        return 0.0
    try:
        return float(s)
    except ValueError:
        return None


def machine_name(path: Path) -> str:
    return path.stem.split("_")[0]


def load_folder(folder: Path, settings: Settings | None = None) -> LoadResult:
    settings = settings or Settings()
    out = LoadResult()
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() == ".csv")
    if not files:
        raise FileNotFoundError(f"{folder} 裡沒有 CSV 檔")
    for path in files:
        machine = machine_name(path)
        rows = list(csv.reader(io.StringIO(read_text(path))))
        if not rows:
            out.issues.append(Issue(machine, "", "空檔案", "檔案沒有內容", path.name))
            continue
        cols = map_headers(rows[0])
        missing = [c for c in REQUIRED if c not in cols]
        if missing:
            out.issues.append(Issue(machine, "", "欄位缺少", "找不到欄位：" + "、".join(missing), path.name))
            continue

        def get(row, name):
            i = cols.get(name)
            return row[i] if i is not None and i < len(row) else ""

        for line_no, row in enumerate(rows[1:], start=2):
            if not any(c.strip() for c in row):
                continue  # 空白列
            ts = parse_ts(get(row, "時間"))
            nums = {k: to_num(get(row, k)) for k in ("投入數", "良品數", "不良數", "停機分鐘")}
            if ts is None or any(v is None for v in nums.values()):
                bad = "時間" if ts is None else "、".join(k for k, v in nums.items() if v is None)
                out.issues.append(Issue(machine, get(row, "時間"), "資料無法辨識", f"第 {line_no} 列「{bad}」格式不對，已略過", path.name))
                continue
            rec = Record(
                machine=machine, ts=ts, work_order=get(row, "工單").strip(), part_no=get(row, "品號").strip(),
                input_qty=int(nums["投入數"]), good_qty=int(nums["良品數"]), ng_qty=int(nums["不良數"]),
                downtime_min=nums["停機分鐘"], reason=get(row, "停機原因").strip(), source=path.name, line_no=line_no,
            )
            out.records.append(rec)
            stamp = ts.strftime("%m-%d %H:%M")
            if rec.good_qty + rec.ng_qty != rec.input_qty:
                out.issues.append(Issue(machine, stamp, "數量對不起來",
                                        f"投入 {rec.input_qty}，良品＋不良 = {rec.good_qty + rec.ng_qty}", path.name))
            if rec.downtime_min > settings.max_downtime_min:
                out.issues.append(Issue(machine, stamp, "停機過長",
                                        f"停機 {rec.downtime_min:g} 分鐘（{rec.reason or '未填原因'}）", path.name))
            if rec.downtime_min > 0 and not rec.reason:
                out.issues.append(Issue(machine, stamp, "停機未填原因", f"停機 {rec.downtime_min:g} 分鐘", path.name))
    out.records.sort(key=lambda r: (r.machine, r.ts))
    return out


def shift_of(ts: datetime, settings: Settings) -> tuple[date, str]:
    """回傳（歸屬日期, 班別）。夜班跨午夜，算在開始那天。"""
    t = ts.time()
    if settings.day_shift_start <= t < settings.night_shift_start:
        return ts.date(), "早班"
    if t >= settings.night_shift_start:
        return ts.date(), "夜班"
    return ts.date() - timedelta(days=1), "夜班"


@dataclass
class Totals:
    input_qty: int = 0
    good_qty: int = 0
    ng_qty: int = 0
    downtime_min: float = 0.0
    shifts: set = field(default_factory=set)

    def add(self, r: Record, shift_key) -> None:
        self.input_qty += r.input_qty
        self.good_qty += r.good_qty
        self.ng_qty += r.ng_qty
        self.downtime_min += r.downtime_min
        self.shifts.add(shift_key)

    @property
    def yield_rate(self) -> float | None:
        return self.good_qty / self.input_qty if self.input_qty else None

    def availability(self, minutes_per_shift: float) -> float | None:
        planned = minutes_per_shift * max(1, len(self.shifts))
        return max(0.0, (planned - self.downtime_min) / planned) if planned else None


def summarize(records: list[Record], report_date: date, settings: Settings):
    """只取歸屬於 report_date 的紀錄，回傳（各機台, 各機台×班別, 停機原因）。"""
    by_machine: dict[str, Totals] = OrderedDict()
    by_shift: dict[tuple[str, str], Totals] = OrderedDict()
    reasons: dict[str, list] = defaultdict(lambda: [0.0, 0])
    picked = []
    for r in records:
        d, sh = shift_of(r.ts, settings)
        if d != report_date:
            continue
        picked.append(r)
        by_machine.setdefault(r.machine, Totals()).add(r, sh)
        by_shift.setdefault((r.machine, sh), Totals()).add(r, sh)
        if r.downtime_min > 0:
            key = r.reason or "未填原因"
            reasons[key][0] += r.downtime_min
            reasons[key][1] += 1
    reason_rows = sorted(((k, v[0], v[1]) for k, v in reasons.items()), key=lambda x: -x[1])
    return by_machine, by_shift, reason_rows, picked


HEAD_FILL = PatternFill("solid", fgColor="1F3A5F")
HEAD_FONT = Font(bold=True, color="FFFFFF")
RED_FILL = PatternFill("solid", fgColor="F8D7DA")


def _sheet(wb, title, header, rows, widths=None):
    ws = wb.create_sheet(title)
    ws.append(header)
    for c in ws[1]:
        c.fill, c.font, c.alignment = HEAD_FILL, HEAD_FONT, Alignment(horizontal="center")
    for r in rows:
        ws.append(r)
    ws.freeze_panes = "A2"
    for i, h in enumerate(header, start=1):
        w = (widths or {}).get(h, max(10, len(str(h)) * 2 + 2))
        ws.column_dimensions[get_column_letter(i)].width = w
    return ws


def write_report(out_path: Path, report_date: date, load: LoadResult, settings: Settings) -> dict:
    by_machine, by_shift, reason_rows, picked = summarize(load.records, report_date, settings)
    wb = Workbook()
    wb.remove(wb.active)

    total = Totals()
    for t in by_machine.values():
        total.input_qty += t.input_qty
        total.good_qty += t.good_qty
        total.ng_qty += t.ng_qty
        total.downtime_min += t.downtime_min

    head = ["機台", "投入", "良品", "不良", "良率", "停機（分）", "稼動率"]
    rows = []
    for m, t in by_machine.items():
        rows.append([m, t.input_qty, t.good_qty, t.ng_qty, t.yield_rate, round(t.downtime_min, 1),
                     t.availability(settings.planned_minutes_per_shift)])
    rows.append(["合計", total.input_qty, total.good_qty, total.ng_qty, total.yield_rate,
                 round(total.downtime_min, 1), None])
    ws = _sheet(wb, "總覽", head, rows)
    ws.insert_rows(1, 2)
    ws["A1"] = f"生產日報　{report_date.isoformat()}"
    ws["A1"].font = Font(bold=True, size=14)
    ws["A2"] = f"良率標準 {settings.min_yield:.0%}　單筆停機上限 {settings.max_downtime_min:g} 分鐘　異常 {len(load.issues)} 筆（見「異常清單」）"
    ws.freeze_panes = "A4"
    last = 3 + len(rows)
    for col in ("E", "G"):
        for c in ws[f"{col}4:{col}{last}"]:
            c[0].number_format = "0.0%"
    ws.conditional_formatting.add(f"E4:E{last}", CellIsRule(operator="lessThan", formula=[str(settings.min_yield)], fill=RED_FILL))
    for c in ws[last]:
        c.font = Font(bold=True)

    shift_rows = [[m, sh, t.input_qty, t.good_qty, t.ng_qty, t.yield_rate, round(t.downtime_min, 1)]
                  for (m, sh), t in by_shift.items()]
    ws2 = _sheet(wb, "班別", ["機台", "班別", "投入", "良品", "不良", "良率", "停機（分）"], shift_rows)
    for c in ws2[f"F2:F{len(shift_rows) + 1}"]:
        c[0].number_format = "0.0%"
    ws2.conditional_formatting.add(f"F2:F{len(shift_rows) + 1}", CellIsRule(operator="lessThan", formula=[str(settings.min_yield)], fill=RED_FILL))

    _sheet(wb, "停機原因", ["停機原因", "累計分鐘", "次數"], [[k, round(v, 1), n] for k, v, n in reason_rows],
           widths={"停機原因": 24})
    _sheet(wb, "異常清單", ["機台", "時間", "類型", "說明", "來源檔"],
           [[i.machine, i.ts, i.kind, i.detail, i.source] for i in load.issues], widths={"說明": 44, "來源檔": 22})
    _sheet(wb, "原始資料", ["機台", "時間", "班別", "工單", "品號", "投入", "良品", "不良", "停機（分）", "停機原因", "來源檔"],
           [[r.machine, r.ts.strftime("%Y-%m-%d %H:%M"), shift_of(r.ts, settings)[1], r.work_order, r.part_no,
             r.input_qty, r.good_qty, r.ng_qty, r.downtime_min, r.reason, r.source] for r in picked],
           widths={"時間": 18, "來源檔": 22})

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)
    return {
        "machines": len(by_machine), "records": len(picked), "issues": len(load.issues),
        "input": total.input_qty, "good": total.good_qty,
        "low_yield": [m for m, t in by_machine.items() if t.yield_rate is not None and t.yield_rate < settings.min_yield],
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="多台機台 CSV → Excel 生產日報")
    p.add_argument("--input", required=True, type=Path, help="放 CSV 的資料夾")
    p.add_argument("--date", required=True, help="報表日期 YYYY-MM-DD（夜班算在開始那天）")
    p.add_argument("--out", type=Path, help="輸出 Excel 路徑，預設 生產日報_日期.xlsx")
    p.add_argument("--min-yield", type=float, default=0.97, help="良率標準，預設 0.97")
    p.add_argument("--max-downtime", type=float, default=60, help="單筆停機上限（分鐘），預設 60")
    a = p.parse_args(argv)
    d = datetime.strptime(a.date, "%Y-%m-%d").date()
    s = Settings(min_yield=a.min_yield, max_downtime_min=a.max_downtime)
    out = a.out or Path(f"生產日報_{a.date}.xlsx")
    load = load_folder(a.input, s)
    info = write_report(out, d, load, s)
    print(f"完成：{out}　機台 {info['machines']} 台、紀錄 {info['records']} 筆、異常 {info['issues']} 筆")
    if info["low_yield"]:
        print("良率未達標：" + "、".join(info["low_yield"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
