# 目前進度（新 session 先看這份）

最後更新：2026-11-20 晚（約 21:30）。**目標上線：2026-11-22 前。** Context 用量估計約 45%（上限提醒 65%）。

## 已完成並驗證

| 項目 | 驗證方式 |
|---|---|
| 規格 `docs/SPEC.md` | 使用者已確認 |
| 專案守則 `CLAUDE.md`、3 個 skill、2 個 agent | — |
| 抽籤引擎 `src/engine/*` | `tests/engine.test.ts` |
| 狀態轉換 `src/lib/play.ts` | `tests/play.test.ts` |
| Edge Function `count`（Supabase `ontime-lucky-day`） | 已部署；**用真實 Redis 實測過**：寫入、亂打被擋、限流、偽造等級以伺服器為準；測完已清除測試資料 |
| 籤詩 500 支 + 審稿 | `check-fortunes` 0 錯誤 0 警告（但「好不好笑」未經真人檢驗） |
| 美術素材 | 使用者用 Codex 生成，我已處理成 `public/art/*.webp`（25 檔，約 0.9MB），原圖在 `art-src/`（不進 git） |
| 前端完整流程 | **真實 Edge 手機尺寸（390×844）跑通 15 項**（`scripts/e2e-smoke.mjs`）：首頁、報名、換一批痛點、按手印、搖籤、擲筊、揭曉、存圖、Threads 連結、重整後同籤、籤冊、字級 ≥14px、無 JS 錯誤 |
| 開發筆記 | `dev-notes/` 第 1 篇；**尚未用瀏覽器開啟檢查圖表是否渲染** |

## 單元測試：52 項通過；`npx tsc --noEmit` 通過；`npx vite build` 通過

## 進行中

- **`news-01.json`（30 張限時時事籤）**：背景 agent 寫作中。回報後要：跑 `check-fortunes`、`build-fortunes`、**重新部署 Edge Function**（known-ids 會更新）。內容來源 `reference/ai-response-02.md`（使用者聯網 AI 蒐集，已排除政治）。
- 新增欄位 `expires`（限時籤，過期自動下架），引擎與檢查器已支援。

## 待辦（依優先順序）

1. 看 news-01 的結果，合併，重新部署 Edge Function（用 `mcp__plugin_supabase_supabase__deploy_edge_function`，檔案在 `supabase/functions/count/`，**部署前先跑 `npm run build:fortunes`**）。
2. ~~凶籤路線測試~~ **已完成**：`scripts/e2e-bad-paths.mjs` 跑過改判、認命、化解三條路線共 19 項全過。名字是用引擎預先算好的，**只在算出當天有效**，過日要重找（見檔案開頭註解）。
3. ~~籤卡排版~~ **已完成**：`scripts/e2e-card-layout.mjs` 用真實籤池裡最長的 38 張 × 2 種結局共 76 張量測，最小間距 70px，並用眼睛看過最擠的兩張。需要先 `npx vite --port 5199 --host 127.0.0.1`。**新增籤詩後要重跑**。
4. 部署：加 `.github/workflows/pages.yml`，push 到 `littlefish0331/ontime-lucky-day`（**push 前先問使用者**），Pages Source 設為 GitHub Actions。
5. `og.png`、`icon.png`：提示詞已寫在 `docs/ART-PROMPTS.md`，等使用者生成。`index.html` 的 og:image 要補。
6. 請使用者抽樣 30 張籤標「有感／普通／沒感」：`node scripts/sample-fortunes.mjs 30`。
7. 實機測試：iPhone／Android 的震動、存圖到相簿、Threads 發文連結。
8. 第 2 篇開發筆記（前端實作與美術處理）；先用瀏覽器檢查第 1 篇。

## 已知風險與未驗證事項

- iPhone 可能沒有網頁震動（未實機驗證），已有畫面震動備援。
- 存圖到相簿的實際行為依機型而異，尚未實機測試。
- 籤詩共鳴度未經真人檢驗；寫手是依檢查器規則調整，有「為了過關而改」的風險。
- Redis 免費額度 500K 指令/月；超額行為官網沒寫清楚。
- 陰筊的隱藏籤只有 1 支（`SPECIAL_YIN`），不在 500 支內、不計數。

## 重要識別

- Supabase 專案 `ontime-lucky-day`，ref `csykldmxxzlnwzbamswl`。Function：`https://csykldmxxzlnwzbamswl.supabase.co/functions/v1/count`
- Upstash Redis：`free-tier`（id 見 CLAUDE.md），key 前綴 `otld:`。Redis token 只在 Supabase secrets（使用者已填）。
- GitHub：`littlefish0331/ontime-lucky-day`（目前是空的）。
- 前端可放的只有 Supabase URL 與 publishable key。

## 常用指令（在 `ontime-lucky-day/`）

```
npm run build:fortunes     # 檢查並產生 fortunes.generated.json 與 known-ids.json
npx vitest run             # 單元測試
npx tsc --noEmit           # 型別
npx vite build && npx vite preview --port 4173 --host 127.0.0.1   # 預覽
node scripts/e2e-smoke.mjs # 真實 Edge 手機尺寸走完整流程（需先 preview）
python -X utf8 scripts/process-art.py   # 美術原圖 → public/art
```
