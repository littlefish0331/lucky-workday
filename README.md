# 準時下班宮 ontime-lucky-day

報上名來，神明賜你職場法號，替你看看今天能不能準時下班。給台灣上班族與打工人的求籤小遊戲。

- 網站：https://littlefish0331.github.io/ontime-lucky-day/
- 技術：React + TypeScript + Vite，純前端；計數走 Supabase Edge Function → Upstash Redis。

## 本機執行

```
npm install
npm run dev          # 開發（會先檢查並產生籤詩資料）
npm test             # 單元測試
npm run build        # 建置（含籤詩檢查）
```

## 目錄

| 路徑 | 內容 |
|---|---|
| `src/engine/` | 抽籤引擎：機率、擲筊、木魚、法號（有單元測試） |
| `src/screens/` | 各步驟畫面 |
| `content/batches/` | 籤詩原稿（JSON）。`npm run check:fortunes` 檢查格式與寫作規則 |
| `supabase/functions/count/` | 計數代理（Edge Function） |
| `dev-notes/` | 開發筆記（網頁，直接開 `index.html`） |
| `docs/` | 規格、進度、美術 prompt |

籤詩純屬娛樂，人生由你作主。
