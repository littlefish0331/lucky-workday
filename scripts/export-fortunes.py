#!/usr/bin/env python
"""把籤詩匯出成 Excel，方便整批檢視。用法（在 ontime-lucky-day/ 底下）：
    python -X utf8 scripts/export-fortunes.py
讀 src/data/fortunes.generated.json（網站實際使用的 530 張），輸出 export/fortunes.xlsx。
注意：xlsx 只是「檢視用的副本」。要改籤詩請改 content/batches/*.json，再跑 npm run build:fortunes。
"""
import json
import os
import re

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

SRC_JSON = "src/data/fortunes.generated.json"
PAINS_JSON = "src/data/pains.json"
FORTUNES_TS = "src/data/fortunes.ts"
OUT = "export/fortunes.xlsx"

LEVELS = ["上上籤", "大吉", "吉", "小吉", "小凶", "凶", "大凶", "下下籤"]
# 等級出現率：抄自 src/engine/config.ts 的 LEVEL_RATE。改了那邊要同步改這裡。
LEVEL_RATE = {"上上籤": 0.06, "大吉": 0.12, "吉": 0.17, "小吉": 0.20, "小凶": 0.18, "凶": 0.14, "大凶": 0.08, "下下籤": 0.05}
GOOD = {"上上籤", "大吉", "吉", "小吉"}
STYLE_NAME = {"quote": "台詞", "notice": "系統通知", "dialogue": "對話", "checklist": "運勢清單", "murmur": "神明碎念", "yiji": "宜忌"}
SEASON_NAME = {"yearend": "年終", "tailparty": "尾牙", "newyear": "跨年", "cny": "春節", "payday": "發薪日"}

FONT = "Microsoft JhengHei"  # 微軟正黑體；Arial 沒有中文字形
f_body = Font(name=FONT, size=11)
f_bold = Font(name=FONT, size=11, bold=True)
f_head = Font(name=FONT, size=11, bold=True, color="FFFFFF")
f_title = Font(name=FONT, size=14, bold=True)
f_input = Font(name=FONT, size=11, color="0000FF")  # 藍字 = 手動輸入的常數
f_note = Font(name=FONT, size=10, color="666666")
fill_head = PatternFill("solid", start_color="7A1F16")
fill_fill = PatternFill("solid", start_color="FFF9C4")  # 淡黃 = 請你填
fill_bad = PatternFill("solid", start_color="F6E3E1")
thin = Side(style="thin", color="D0C4B0")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
wrap_top = Alignment(wrap_text=True, vertical="top")
center_top = Alignment(horizontal="center", vertical="top", wrap_text=True)

data = json.load(open(SRC_JSON, encoding="utf-8"))
topic_name = json.load(open(PAINS_JSON, encoding="utf-8"))["topics"]
TOPICS = list(topic_name.keys())
N = len(data)

wb = Workbook()

# ── 說明 ───────────────────────────────────────────
ws0 = wb.active
ws0.title = "說明"

# ── 籤詩總表 ───────────────────────────────────────
ws = wb.create_sheet("籤詩總表")
cols = [
    ("籤號", 7), ("id", 10), ("等級", 9), ("吉凶", 6), ("主題", 10), ("痛點", 14), ("籤型", 10),
    ("籤眼（最醒目那句）", 38), ("內文", 46), ("結語／宜忌", 34), ("時令", 8), ("到期日", 12), ("梗", 22),
    ("你的判斷", 11), ("備註", 34),
]
for i, (name, w) in enumerate(cols, 1):
    c = ws.cell(row=1, column=i, value=name)
    c.font, c.fill, c.alignment, c.border = f_head, fill_head, Alignment(horizontal="center", vertical="center", wrap_text=True), border
    ws.column_dimensions[get_column_letter(i)].width = w
ws.row_dimensions[1].height = 28

for r, f in enumerate(data, 2):
    row = [
        f["no"], f["id"], f["level"], "吉" if f["level"] in GOOD else "凶", topic_name[f["topic"]], f["pain"],
        STYLE_NAME.get(f["style"], f["style"]), f["eye"], "\n".join(f["body"]), f["tip"],
        SEASON_NAME.get(f["season"], "") if f["season"] else "", f["expires"] or "", f["meme"] or "", None, None,
    ]
    for ci, v in enumerate(row, 1):
        c = ws.cell(row=r, column=ci, value=v)
        c.font, c.border = f_body, border
        c.alignment = center_top if ci in (1, 2, 3, 4, 5, 7, 11, 12, 14) else wrap_top
        if ci in (14, 15):
            c.fill = fill_fill
        elif f["level"] not in GOOD and ci <= 13:
            c.fill = fill_bad

LAST = N + 1
ws.freeze_panes = "D2"
ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{LAST}"
dv = DataValidation(type="list", formula1='"保留,修改,刪除,再想想"', allow_blank=True)
dv.error, dv.errorTitle = "請從清單選一個", "不在選項內"
ws.add_data_validation(dv)
dv.add(f"N2:N{LAST}")

# ── 統計（用公式算，改了總表會跟著變）──────────────────
st = wb.create_sheet("統計")
st["A1"], st["A1"].font = "籤詩統計（公式：隨「籤詩總表」自動更新）", f_title
T = "'籤詩總表'"
rng = lambda col: f"{T}!${col}$2:${col}${LAST}"

st["A3"], st["A3"].font = "一、等級 × 主題 張數", f_bold
hdr = ["等級"] + [topic_name[t] for t in TOPICS] + ["合計", "出現率", "每張被抽到的機率"]
for i, h in enumerate(hdr, 1):
    c = st.cell(row=4, column=i, value=h)
    c.font, c.fill, c.border = f_head, fill_head, border
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
n_t = len(TOPICS)
col_total, col_rate, col_per = 2 + n_t, 3 + n_t, 4 + n_t
for ri, lv in enumerate(LEVELS, 5):
    st.cell(row=ri, column=1, value=lv).font = f_bold
    for ti in range(n_t):
        col = 2 + ti
        c = st.cell(row=ri, column=col, value=f'=COUNTIFS({rng("C")},$A{ri},{rng("E")},{get_column_letter(col)}$4)')
        c.font = f_body
    st.cell(row=ri, column=col_total, value=f"=SUM(B{ri}:{get_column_letter(1 + n_t)}{ri})").font = f_bold
    c = st.cell(row=ri, column=col_rate, value=LEVEL_RATE[lv])
    c.font, c.number_format = f_input, "0.0%"
    c = st.cell(row=ri, column=col_per, value=f"=IFERROR({get_column_letter(col_rate)}{ri}/{get_column_letter(col_total)}{ri},0)")
    c.font, c.number_format = f_body, "0.00%"
    for ci in range(1, col_per + 1):
        st.cell(row=ri, column=ci).border = border
        if ci > 1:
            st.cell(row=ri, column=ci).alignment = Alignment(horizontal="center")
tr = 5 + len(LEVELS)
st.cell(row=tr, column=1, value="合計").font = f_bold
for col in range(2, col_total + 1):
    L = get_column_letter(col)
    st.cell(row=tr, column=col, value=f"=SUM({L}5:{L}{tr - 1})").font = f_bold
st.cell(row=tr, column=col_rate, value=f"=SUM({get_column_letter(col_rate)}5:{get_column_letter(col_rate)}{tr - 1})").font = f_bold
st.cell(row=tr, column=col_rate).number_format = "0.0%"
for ci in range(1, col_per + 1):
    st.cell(row=tr, column=ci).border = border
    if ci > 1:
        st.cell(row=tr, column=ci).alignment = Alignment(horizontal="center")
st.cell(row=tr + 1, column=1, value="藍字＝手動輸入的常數（抄自 src/engine/config.ts 的 LEVEL_RATE）。「每張被抽到的機率」＝出現率 ÷ 該等級張數，是整個籤池裡每一張的平均機率（未計權重與時令窗口）。").font = f_note

r0 = tr + 3
st.cell(row=r0, column=1, value="二、籤型 張數").font = f_bold
for i, h in enumerate(["籤型", "張數"], 1):
    c = st.cell(row=r0 + 1, column=i, value=h)
    c.font, c.fill, c.border, c.alignment = f_head, fill_head, border, Alignment(horizontal="center")
for k, (key, nm) in enumerate(STYLE_NAME.items()):
    r = r0 + 2 + k
    st.cell(row=r, column=1, value=nm).font = f_body
    st.cell(row=r, column=2, value=f'=COUNTIF({rng("G")},A{r})').font = f_body
    for ci in (1, 2):
        st.cell(row=r, column=ci).border = border
r1 = r0 + 2 + len(STYLE_NAME) + 1
st.cell(row=r1, column=1, value="三、時令籤 張數").font = f_bold
for i, h in enumerate(["時令", "張數"], 1):
    c = st.cell(row=r1 + 1, column=i, value=h)
    c.font, c.fill, c.border, c.alignment = f_head, fill_head, border, Alignment(horizontal="center")
for k, nm in enumerate(SEASON_NAME.values()):
    r = r1 + 2 + k
    st.cell(row=r, column=1, value=nm).font = f_body
    st.cell(row=r, column=2, value=f'=COUNTIF({rng("K")},A{r})').font = f_body
    for ci in (1, 2):
        st.cell(row=r, column=ci).border = border
r2 = r1 + 2 + len(SEASON_NAME)
st.cell(row=r2, column=1, value="有到期日的籤").font = f_body
st.cell(row=r2, column=2, value=f'=COUNTIF({rng("L")},"?*")').font = f_body
st.cell(row=r2 + 1, column=1, value="有梗的籤").font = f_body
st.cell(row=r2 + 1, column=2, value=f'=COUNTIF({rng("M")},"?*")').font = f_body
for rr in (r2, r2 + 1):
    for ci in (1, 2):
        st.cell(row=rr, column=ci).border = border
st.column_dimensions["A"].width = 16
for col in range(2, col_per + 1):
    st.column_dimensions[get_column_letter(col)].width = 13
st.column_dimensions[get_column_letter(col_per)].width = 18

# ── 說明內容 ───────────────────────────────────────
hidden = ""
try:
    ts = open(FORTUNES_TS, encoding="utf-8").read()
    eye = re.search(r"eye:\s*'([^']*)'", ts).group(1)
    body = re.search(r"body:\s*\[([^\]]*)\]", ts).group(1)
    tip = re.search(r"tip:\s*'([^']*)'", ts).group(1)
    hidden = f"籤眼：{eye}／內文：{body.replace(chr(39), '').replace(', ', '、')}／結語：{tip}"
except Exception:
    hidden = "（讀不到，請看 src/data/fortunes.ts 的 SPECIAL_YIN）"

lines = [
    ("籤詩總表（檢視用）", f_title),
    (f"共 {N} 張，來源：src/data/fortunes.generated.json（網站實際使用的資料）。", f_body),
    ("", f_body),
    ("籤放在哪裡", f_bold),
    ("• 原稿：content/batches/*.json（8 個檔，這是「唯一真相」，會進 git）。", f_body),
    ("• 網站用的：src/data/fortunes.generated.json，由 npm run build:fortunes 從原稿產生，隨網站一起打包，玩家的瀏覽器直接讀，不需要連資料庫。", f_body),
    ("• 沒有存進 Supabase 的 PostgreSQL（那邊目前沒有任何資料表）。伺服器只存「計數」：Upstash Redis 的 otld: 開頭的 key，記每支籤被抽幾次、有感／沒感幾票；Edge Function 另有一份「籤 id → 等級」對照（known-ids.json）用來擋亂報的 id，不含籤的文字。", f_body),
    ("", f_body),
    ("怎麼用這份表", f_bold),
    ("• 黃色的兩欄（N「你的判斷」、O「備註」）是給你填的；N 欄有下拉選單：保留／修改／刪除／再想想。", f_body),
    ("• 例：N 欄選「修改」，O 欄寫「第二句跟上一張太像，笑點放最後」。填完把檔案給我，我再回去改原稿。", f_body),
    ("• 上方欄位標題可以篩選（例如只看某個等級、某個主題、某個籤型）。凶側的籤整列淡紅底。", f_body),
    ("", f_body),
    ("改動要注意", f_bold),
    ("• 籤的 id ＝ 等級＋籤眼 的雜湊。改「籤眼」或「等級」，id 會變，這支籤原本累積的抽取次數與有感／沒感票就不會算到新句子；只改內文與結語則票保留。", f_body),
    ("• 改完原稿要重新產生資料、重新部署 Edge Function（known-ids.json 變了，不部署的話新籤的計數會被伺服器擋掉）。", f_body),
    ("• 這個 xlsx 只是副本，直接改它不會影響網站。", f_body),
    ("", f_body),
    ("不在 530 張內的隱藏款", f_bold),
    ("• 擲出陰筊（3%）才會拿到、不計入計數、不能投票：" + hidden, f_body),
]
for i, (t, fnt) in enumerate(lines, 1):
    c = ws0.cell(row=i, column=1, value=t)
    c.font, c.alignment = fnt, Alignment(wrap_text=True, vertical="top")
ws0.column_dimensions["A"].width = 110

os.makedirs("export", exist_ok=True)
wb.save(OUT)
print(f"已輸出 {N} 張到 {OUT}（請接著跑 recalc 讓公式有數值）")
