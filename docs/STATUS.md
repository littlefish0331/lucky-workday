# 目前進度（新 session 先看這份）

最後更新：2026-11-22 傍晚。Context 在這個 session 用到約 55% 時交接。

## 一句話現況

V1 已搬到 **Vercel**：https://lucky-workday.vercel.app/ ，repo 改為 **`littlefish0331/lucky-workday`**（公開）。舊 repo `ontime-lucky-day` 與 GitHub Pages 已由使用者刪除。
使用者的 9 頁實測回饋（`reference/feedback-01.pptx`）已逐頁讀完並整理在下方，**程式還沒動**。籤詩與諧音梗素材（`reference/ai-response-02.md`）、角色美術（`art-src/`）都已到位，等著接進去。

## 先處理的三件事（阻塞中）

| # | 事項 | 狀態 | 怎麼辦 |
|---|---|---|---|
| 1 | **Edge Function 重新部署** | **被 Claude Code 的權限分類器擋下**（使用者口頭已授權，但工具層仍擋）。新網域 `lucky-workday.vercel.app` 目前被線上版拒絕（HTTP 403，`reason: origin`），所以**新站不顯示今日人數、計數沒進 Redis**；遊戲本身正常 | 請使用者在 `/permissions` 加 `mcp__plugin_supabase_supabase__deploy_edge_function` 後再部署。檔案：`supabase/functions/count/` 的 `index.ts`、`logic.ts`、`known-ids.json`，專案 `csykldmxxzlnwzbamswl`，`verify_jwt=false`。**線上的 known-ids 比 repo 舊**（例如線上有 `0452b5c8`、repo 沒有；repo 有 `6eaa87dc`、線上沒有，至少十幾筆不同），所以新籤的計數現在也被擋，更需要部署 |
| 2 | **改 commit 信箱並 force push** | 本機已改寫（見下方「git 狀態」）；**push 尚未做**，因為我的 git push 會被擋 | 使用者自己跑：`cd ontime-lucky-day && git push --force-with-lease origin main`。推完 Vercel 會自動重新部署 |
| 3 | **旺財擠捷運** | 使用者已重生，檔案在 `art-src/wangcai-mrt.png`，**我看過：臉是柴犬、沒有貓鬚、兩側只有直條，合格** | 跑 `process-art.py` 時一起處理 |

## git 狀態

- 本機 `main` 比遠端多 2 個 commit（網址搬家、交接文件）。
- 所有 commit 的作者與提交者信箱已改為 `littlefish0331@gmail.com`（本機 repo 設定也已改）。**遠端還是舊信箱 `youjun.yu@ibm.com`，force push 後才會換掉**。
- 改寫前有備份分支 `backup-before-email-rewrite`（只在本機，確認遠端沒問題後可刪）。
- Vercel 與 GitHub 已連好：push 到 `main` 就自動部署（production）。專案 `lucky-workday`，id `prj_CI7RwyMSwUqqc8yIJoU816v0mAsi`，團隊 `youjuns-projects`（`team_IzBxrz0HlLp7LxzfLHPRvUOi`），Hobby 方案。

## 使用者已確認的決定（2026-11-22）

| 項目 | 決定 |
|---|---|
| 名稱 | 中文「**打工庇佑廟**」，英文「**Lucky Workday**」。標語「**職場很莫名其廟，來拜一下**」 |
| 木魚計數 | 用「**功德**」（不是陰德）。碎念字串 `+1 功德：…` |
| 神明（四位） | **績效伯伯**（現有神像，辦公室、業務接案）、**發薪婆婆**（錢與年終、服務輪班）、**旺財**（柴犬，工程師）、**胖橘**（橘貓，通勤）。光環畫法不統一沒關係 |
| 手印落款 | 貓掌改「胖橘代為簽收」、狗掌改「旺財代為簽收」 |
| 投票 | 「有感／沒感」，位置在籤卡下方、**不進存圖**；票數**不公開**；角色專屬回應（下表） |
| 諧音梗 | **不取代**既有籤，改「隨機添加」進籤裡。只用 `reference/ai-response-02.md` 裡「台灣原生、認得度高、非過氣」的梗；整批約 8%、每張最多一個、笑點放最後。**不自創**（使用者否決過 Claude 自己想的那批）。新增 `pun` 欄位 |
| commit 信箱 | `littlefish0331@gmail.com`，允許 force push |
| 順序 | 使用者說之後照 Claude 的順序做，可平行派 subagent |

**投票回應句**（按完後依「這支籤的負責神明」顯示）：

| 神明 | 有感 | 沒感 |
|---|---|---|
| 績效伯伯 | 這支籤，今年考績甲等 | 已列入改善計畫，下季再看 |
| 發薪婆婆 | 加發一個紅包，功德 +1 | 這支籤本月獎金減半 |
| 旺財 | 汪！（尾巴搖到出現殘影） | 汪……（低頭回去 debug） |
| 胖橘 | 呼嚕嚕 | （翻身繼續睡，不負責） |

## 投票機制的設計（已與使用者討論同意）

- 前端：新增 `{ action: 'vote', fid, v: 'up' | 'down' }`；同一支籤只能投一次、不能改票，用 localStorage 記；送出失敗也照樣顯示回應句。
- 伺服器（`logic.ts`＋`index.ts`）：驗證 fid 已知；同 IP 對同一支籤一天一票（沿用 `SET NX EX`）；寫入 `otld:vu`、`otld:vd` 兩個 hash（和 `otld:f` 同款）；每票約 2 個 Redis 指令。
- **籤 id = `sha1(等級|籤眼)` 前 8 碼**（`scripts/build-fortunes.mjs:28`）。改籤眼或等級，舊票就不會算到新句子；只改內文則票保留。**重寫籤詩前先把成績存成檔案。**
- 早期票很稀疏（每支籤要累積上萬次抽籤才有 10 票），所以先看「分類成績」：依等級、主題、籤型、有沒有諧音分組算有感率。讀票用 Upstash 工具讀 `otld:vu`／`otld:vd`，存成 `content/samples/votes-日期.md`。
- Upstash 免費額度 50 萬指令／月；本月到 11/22 整個資料庫只用了 698 個。

## 回饋簡報（`reference/feedback-01.pptx`）逐頁待辦

| 頁 | 使用者意見 | 要做的事 |
|---|---|---|
| 1 首頁 | 畫面太暗、太陰沉 | 整體變亮（背景、色調）。**看截圖驗證** |
| 2 報名 | 說明句太像 AI；「存在手機裡」不用講；「同名同日同籤」不用講；「報上名來」太硬 | 刪兩句說明；標題改成信士、信女、小女、小弟之類的稱呼；加趣味選項（路過看看、誠心發問…） |
| 3 痛點 | 「最近，哪件事最痛」→「今天 OO 有什麼困擾」，OO 依上一頁選擇變化；「換一批」不要顯示「共 90 種」；「選一個。神明會往這個方向多看一眼」很怪；選了某類卻抽到別類籤很怪 | 改口語問句；拿掉數字；重想這句；考慮「職業標籤」（現有 6 個主題其實就是職業）：先選職業、再問困擾，籤上預先標好標籤，抽出來更準 |
| 4 手印 | 「立契約」有點可怕；看不出是印泥；按住只晃動、想要真震動；手印效果參考手機設定指紋的動畫（線條一部分一部分出現）；流程改成先按印泥、再選蓋在哪、手印出現在按下的位置、按下時震動、沒蓋完提示「按久一點」 | 換詞；重做互動。**震動：Android 可用 `navigator.vibrate`，iOS Safari 網頁據我所知不支援（未驗證），要保留畫面備援，並告訴使用者實情** |
| 5 搖籤 | 籤筒太可愛、不符整體風格，參考真廟宇、可以更長；想改成搖晃手機 | 籤筒美術重生（要新 prompt）。**搖手機需 DeviceMotion；iOS 要使用者點一下授權，會推翻 SPEC「不跳權限視窗」，使用者還沒拍板；建議做法：手機搖＋拖曳備援** |
| 6 擲筊 | 流程好；正面圖周圍有黃邊；動畫不夠流暢、擲完要散落隨機位置、拋起要有大小變化；考慮 Three.js | 黃邊是當初 prompt 要求的金邊，只有圓面有、平面沒有，造成不一致，**筊杯重生（要新 prompt）**。動畫先用現有技術做順；是否上 Three.js 要使用者拍板（包體積會變大） |
| 7 籤卡 | 風格比上次好很多；內容不一定是使用者要的；不提供再抽是因為真實求籤不換籤；「交班本寫了 2 頁，連冰箱都有交代」斷行不好看；「T・準時下班居士」**法號不要取姓名第一字**；「你也來求一支…」與網址移到籤外面，讓籤保持本體；想想圖片長度要不要改 | 法號改成只有稱號（`src/engine/hao.ts` 的 `nameMark` 不再使用）；調整折行（`src/lib/card.ts`）；頁尾文字與網址移到卡外的 UI；重新檢查長籤版面（`scripts/e2e-card-layout.mjs`） |
| 8 分享 | 不要「換一則」，文案隨機出現；「去 Threads 發文」與「複製文案」放同一行 | 改 `src/screens/CardView.tsx`、`src/lib/share.ts`；**看截圖** |
| 9 截圖 | 分享出去的樣子可以 | 保持 |

## 新美術（已在 `art-src/`，尚未處理進 `public/art/`）

11 張：`granny-sheet`（發薪婆婆，2048×512，4 表情）、`wangcai-sheet`、`pangju-sheet`，以及動作圖 `wangcai-typing/mrt/payday/overtime`、`pangju-yarn/mrt/glasses/keyboard`（各 1024×1024）。

- 檢查：全部真透明底；三張 sheet 的格線都沒被畫穿；各格內容範圍在 512 格內。原檔 540–994KB，需轉 webp 壓到 ≤ 300KB。
- 胖橘擠捷運（`pangju-mrt`）背景有零星殘點，`process-art.py` 的清點步驟會處理，處理後要**看圖**。
- **`scripts/process-art.py` 還沒加這些角色**，要新增。現有只處理 `deity-sheet`。
- 程式現在只有一尊神像（`src/data/art.ts` 的 `deity(stage)`、`src/components/ui.tsx`、`src/screens/WoodFishStep.tsx`），要改成依主題換角色。**沒收到圖的角色要有暫代，不能壞。**
- **還需要請使用者轉 Codex 的新圖**：①`og.jpg`（字燒在圖裡，要改成新名稱與標語）；②長條廟宇式籤筒；③筊杯（去黃邊、平面與圓面一致）；④（視情況）首頁調亮的版本。用 `codex-art-prompt` skill 寫 prompt。
- 角色 prompt 檔：`docs/ART-PROMPTS-CHARACTERS.md`。

## 諧音梗與時事語料（`reference/ai-response-02.md`，155 行）

- 一、25 條非政治時事＋10 個 11 月流行用語（**12/5 起時事籤到期後可用來補**）。
- 二、**56 條台灣諧音梗用例**（七類，附來源、認得度、流行狀態、台灣原生／兩岸共用）。
- (a) 10 個老到翻白眼的梗（**不要用**）；(b) 「打工」語感：台灣單用時多指工讀兼職，「打工人」是 2020 年對岸流行語、台灣有人借用，「打工仔」有港式色彩，中性說法是「上班族」。→ 名稱已定「打工庇佑廟」，使用者看過仍選它；文案裡「打工」與「上班族」交替用即可。(c) 排除與不確定項，其中 #22「人生在世 Bee嘴兩字」、#34「一場騙橘」地域不確定；「大橘為重」「喵不可言」「汪事如意」兩岸都有人用。
- **寫諧音籤前**：先和使用者確認是「新增張數」還是「改寫現有籤的一句」。改籤眼會改 id（舊票作廢），所以優先考慮新增，或只改內文。新增要同步調 SPEC 的配額、`check-fortunes` 的配額檢查，並重新部署 Edge Function。

## 新 session 的施工順序（已與使用者確認）

1. 先確認三件阻塞事項：使用者放行 Edge Function 部署並完成 force push；部署後用新網址跑 `URL=https://lucky-workday.vercel.app/ node scripts/e2e-smoke.mjs`（**上次跑 14 項過、1 項失敗，失敗原因已查明：新網域被 Edge Function 擋，造成 3 個 console 載入錯誤；部署後應全過**）。
2. 改名「打工庇佑廟」＋功德＋標語＋簡報小改（文案、版面、法號、頁尾移出卡外、分享鈕合併）。可平行派 subagent，改檔案的範圍要事先切開。
3. 美術處理與四神明依主題切換；籤卡簽收字樣。
4. 投票機制（前端＋Edge Function＋測試），再部署 Edge Function 一次。
5. 諧音籤（`write-fortunes`，派寫手＋審稿）。
6. 手印互動、擲筊動畫（待使用者拍板搖手機與 Three.js）。
7. 寫第 3 篇開發筆記（`dev-note` skill）：搬到 Vercel、回饋整理、投票機制。**目前還沒寫。**
8. 更新 `CLAUDE.md`、`SPEC.md`、`README.md` 的名稱與網址（`CLAUDE.md` 的網址已先改）。

## 已完成並驗證（V1 當時，仍有效）

| 項目 | 驗證方式 |
|---|---|
| 遊戲流程 | `scripts/e2e-smoke.mjs`，真實 Edge 390×844，15 項 |
| 凶籤三條路線 | `scripts/e2e-bad-paths.mjs`，19 項。名字用引擎預算，**只在算出當天有效** |
| 籤卡排版 | `scripts/e2e-card-layout.mjs`，最長的 38 張×2 結局，最小間距 70px |
| 引擎、計數邏輯 | vitest 52 項；`npx tsc --noEmit` |
| 籤詩 530 張 | `check-fortunes` 0 錯誤 0 警告 |
| 機密 | 前端只有 Supabase URL 與 publishable key；Redis token 只在 Edge Function secrets；整段 git 歷史掃描 0 命中 |

這個 session 開頭重跑：vitest 52 通過、tsc 通過、check-fortunes 通過；改網址後再跑一次也通過。

## 已知風險與未驗證

- iPhone 網頁震動：據我所知不支援（未驗證）。使用者提到想要手機真震動，要如實告訴他。
- 存圖到相簿依機型而異；Threads 發文是否開 App 未驗證。**使用者簡報裡沒提實機的震動與存圖結果，回報時要問**。
- 籤詩共鳴度未經真人檢驗（`node scripts/sample-fortunes.mjs 30` 的標註使用者還沒給）；投票機制就是為此而做。
- Vercel Hobby 方案限個人非商業用途；我沒查到明確條文。**加贊助連結（buy me a coffee）之前要先確認條款。**
- Vercel 專案的 Node 設成 26.x，你本機是 24；目前建置成功，未處理。
- `art-src/` 只在本機、不進 git（現在約 35MB）；換電腦會遺失。
- 流行梗會過期：整批梗占比 ≤ 15%，`meme` 欄方便下架。
- 陰筊隱藏款只有 1 支（`SPECIAL_YIN`），不在 530 支內、不計數。

## 工具權限（這個專案會被擋的）

Claude Code 的自動模式分類器擋過：`git push`、`git remote set-url`＋commit 的組合（第一次；之後單純 commit 可以）、`deploy_edge_function`、`delete_repository`、`authorize_team_access`（放行後可用）。擋下時**不要繞路**，請使用者在 `/permissions` 加規則或自己執行。

## 重要識別

- 網站：https://lucky-workday.vercel.app/
- GitHub：`littlefish0331/lucky-workday`（git 在 `ontime-lucky-day/` 內，不是上層資料夾；資料夾名稱還沒改）
- Supabase：專案 `ontime-lucky-day`，ref `csykldmxxzlnwzbamswl`；Function `https://csykldmxxzlnwzbamswl.supabase.co/functions/v1/count`
- Upstash Redis：`free-tier`（id 見 CLAUDE.md），key 前綴 `otld:`
- 上層還有 `preview-version/`（舊版，不要動）、`reference/`（規格與聯網 AI 蒐集的語料，唯讀）

## 改了籤詩之後一定要做的事

```
cd ontime-lucky-day
npm run build:fortunes        # 檢查 + 產生 fortunes.generated.json 與 known-ids.json
npx vitest run && npx tsc --noEmit
# 重新部署 Edge Function（known-ids.json 變了；不重新部署，新籤的計數會被伺服器擋掉）
#   用 mcp__plugin_supabase_supabase__deploy_edge_function，專案 csykldmxxzlnwzbamswl，
#   檔案：supabase/functions/count/ 的 index.ts、logic.ts、known-ids.json，verify_jwt=false
node scripts/e2e-card-layout.mjs   # 需先 npx vite --port 5199 --host 127.0.0.1；新增長籤時重跑
git add -A && git commit           # push 前先問使用者（push 會被擋，由使用者自己推）
```

## 常用指令（在 `ontime-lucky-day/`）

```
npm run dev / build / preview
npx vitest run
node scripts/e2e-smoke.mjs        # 需先 vite preview --port 4173；URL=線上網址 可測線上
node scripts/e2e-bad-paths.mjs    # 名字需用引擎重算（過日會失效）
python -X utf8 scripts/process-art.py   # art-src 原圖 → public/art
```

## 這個 session 學到、之後要記得的

- **Python 不要加 `-I`**：隔離模式會連使用者安裝的 Pillow 一起擋掉（`No module named PIL`）。這台沒有 numpy，`process-art.py` 用到的部分以實際能跑為準。
- **WebSearch 在公司 gateway 不可用**（每次都回 400）。需要網路資訊就寫 prompt 給使用者，結果放 `reference/`。
- **別自己想諧音梗**：使用者明確說我想的怪怪的。要用，就從 `ai-response-02.md` 取。
- 抽查聯網 AI 的回傳檔再用：第一次使用者貼的結果其實是 P1 的舊內容，兩個檔案內容相同；先看標題與檔案日期，不要直接信檔名。
- **量測通過≠好看**：版面改動要看截圖。
- **檢查器會被規則牽著走**：寫手為了過關會做出怪改法。批次統計警告要搭配人眼抽樣。
- 寫入機密的動作（Supabase secrets）系統會擋，要請使用者自己在網頁填。
- Windows 下 `/tmp` 與 Node 的 `/tmp` 是不同位置，腳本檔案請放專案內。
