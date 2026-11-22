# 目前進度（新 session 先看這份）

最後更新：2026-11-20 晚（約 22:15）。**V1 已上線**：https://littlefish0331.github.io/ontime-lucky-day/
Context 在這個 session 用到 64% 時交接。

## 一句話現況

遊戲、500+30 支籤、美術、計數、部署都完成，**線上版用真實 Edge 手機尺寸跑完整流程 15 項全過**，計數已驗證寫入 Redis（測完已清空）。剩下的是**需要真人與實機的驗證**，以及上線後的調整。

## 已完成並驗證（我自己跑過，不是 agent 的說法）

| 項目 | 驗證方式 |
|---|---|
| 遊戲流程（報名→痛點→手印→搖籤→擲筊→揭曉） | 真實 Edge 390×844，`scripts/e2e-smoke.mjs`，**對本機與線上各跑過，15 項全過** |
| 凶籤三條路線（改判／認命／化解） | `scripts/e2e-bad-paths.mjs` 19 項全過。名字用引擎預算，**只在算出當天有效**（見檔案開頭） |
| 籤卡排版 | `scripts/e2e-card-layout.mjs`，最長的 38 張×2 結局，最小間距 70px；也用眼睛看過 |
| 引擎、狀態轉換、計數邏輯 | vitest 52 項通過；`npx tsc --noEmit` 通過 |
| 籤詩 530 張 | `check-fortunes` 0 錯誤 0 警告（500 常駐 + 30 限時時事） |
| Edge Function `count` | Supabase `ontime-lucky-day`，已部署（id 表 530 筆）。實測：錯 key／無 key 401、陌生來源 403、限流、亂打被擋、偽造等級以伺服器為準；從 github.io 實際寫入 Redis 成功 |
| 部署 | commit `4c9a090` 已 push；Pages Source 為 GitHub Actions（使用者已設定）；線上資源（og.jpg、manifest、各美術）皆 200 |
| 開發筆記 | `dev-notes/` 共 2 篇；第 1 篇已用瀏覽器驗證圖表與動畫 |
| 機密 | 提交前掃描 0 命中；前端只有 Supabase URL 與 publishable key；Redis token 只在 Edge Function secrets（使用者已填） |

## 待辦（依優先順序）

1. **使用者實機測試**（我做不到）：iPhone／Android 的 ① 按手印是否震動 ② 存成圖片能否進相簿 ③ Threads 發文連結是否開 App ④ 籤卡在手機上的觀感。回報問題後修。
2. **使用者抽樣籤詩**：`node scripts/sample-fortunes.mjs 30` → `content/samples/*.md`，標「有感／普通／沒感」。**這是籤詩共鳴度唯一的真人檢驗**，之前都是檢查器與寫手自評。依結果用 `write-fortunes` skill 重寫沒感覺的。寫手自評最弱的幾張可優先看（地瓜加美式、午休 12:40、土地公撥算盤、Offer 乘算）。
3. **美術一致性**（使用者說上線後再檢視）：神像、木槌、筊杯是「有外框卡通風」，籤筒、木魚、首頁是「繪本質感」，不算完全統一。標準見 `docs/ART-PROMPTS.md` 開頭 6 關。若要提高，優先重生神像與筊杯。
4. **時事籤到期**：`news-01.json` 的 `expires` 有 2026-12-05、2026-12-31、2027-02-28 三批，過期自動不出現。**12/5 後常駐籤就比較多，可以請使用者再用 `docs/PROMPTS-FOR-WEB-AI.md` 的 P1 蒐集新一批**，再 `write-fortunes` 補寫。
5. **og.png 已用**，圖示已生成各尺寸；使用者提到「其他圖片風格一致性等上線後再檢視」。
6. 第 3 篇開發筆記：寫實機測試結果與調整。
7. V1.1 候選（使用者尚未排定）：每支籤獨立的連結預覽圖、揪同事合籤、年度籤冊；V2：使用者投稿一句話（prompt 已寫在 `docs/V2-SUBMISSION-PROMPT.md`）。
8. 使用者原本要討論但還沒開始的：**賺錢方式（buy me a coffee 等）、聖誕節延伸、交換願望遊戲**。使用者說「只是討論」。核心上線後可以主動提。

## 已知風險與未驗證

- iPhone 網頁震動：印象中不支援（未驗證），已有畫面震動備援。
- 存圖到相簿的實際行為依機型而異，只測過流程走得到、桌面沒有下載事件。
- 籤詩共鳴度未經真人檢驗；寫手是依檢查器規則調整的，**有為了過關而改的風險**（曾發現有寫手想把「你」換成「妳」，自己改回）。
- Redis 免費額度 500K 指令/月；超額行為官網沒寫清楚。計數壞了遊戲照常，只是不顯示今日人數。
- 陰筊隱藏款只有 1 支（`SPECIAL_YIN`），不在 530 支內、不計數。
- `art-src/`（原圖約 20MB）只在本機、不進 git；若換電腦會遺失，需要的話再向使用者要。
- 流行梗會過期：整批梗占比限制 15%，`meme` 欄方便下架。

## 重要識別

- 網站：https://littlefish0331.github.io/ontime-lucky-day/
- GitHub：`littlefish0331/ontime-lucky-day`（git 在 `ontime-lucky-day/` 內，不是上層資料夾）
- Supabase：專案 `ontime-lucky-day`，ref `csykldmxxzlnwzbamswl`；Function `https://csykldmxxzlnwzbamswl.supabase.co/functions/v1/count`
- Upstash Redis：`free-tier`（id 見 CLAUDE.md），key 前綴 `otld:`
- 目前資料夾上層還有 `preview-version/`（舊版，不要動）、`reference/`（規格與使用者聯網 AI 蒐集的語料，唯讀）

## 改了籤詩之後一定要做的事

```
cd ontime-lucky-day
npm run build:fortunes        # 檢查 + 產生 fortunes.generated.json 與 known-ids.json
npx vitest run && npx tsc --noEmit
# 重新部署 Edge Function（known-ids.json 變了；不重新部署，新籤的計數會被伺服器擋掉）
#   用 mcp__plugin_supabase_supabase__deploy_edge_function，專案 csykldmxxzlnwzbamswl，
#   檔案：supabase/functions/count/ 的 index.ts、logic.ts、known-ids.json，verify_jwt=false
node scripts/e2e-card-layout.mjs   # 需先 npx vite --port 5199 --host 127.0.0.1；新增長籤時重跑
git add -A && git commit && git push   # push 前先問使用者
```

## 常用指令（在 `ontime-lucky-day/`）

```
npm run dev / build / preview
npx vitest run
node scripts/e2e-smoke.mjs        # 需先 vite preview --port 4173；URL=線上網址 可測線上
node scripts/e2e-bad-paths.mjs    # 名字需用引擎重算（過日會失效）
python -X utf8 scripts/process-art.py   # art-src 原圖 → public/art
```
Bash 工具跑 Python 要加 `-X utf8`（Windows 中文會亂碼）。WebSearch 在公司 gateway 不可用。

## 這次 session 學到、之後要記得的

- **量測通過≠好看**：籤卡兩個版面問題是看截圖才發現。
- **檢查器會被規則牽著走**：寫手為了過關會做出怪改法。批次統計警告要搭配人眼抽樣。
- 寫入機密的動作（Supabase secrets）系統會擋，要請使用者自己在網頁填。
- Windows 下 `/tmp` 與 Node 的 `/tmp` 是不同位置，腳本檔案請放專案內。
