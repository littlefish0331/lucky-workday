# 目前進度（新 session 先看這份）

最後更新：2026-11-22 深夜。Context 用到約 60% 時交接。

## 一句話現況

V1 在 **Vercel**：https://lucky-workday.vercel.app/ ，repo `littlefish0331/lucky-workday`（公開）。
本機有**幾個 commit 還沒推上線**（`3a6c54d` 改名與神明、`548480d` 新籤筒筊杯與 og，以及之後的交接文件 commit；確切個數用 `git rev-list --count origin/main..HEAD` 查，別信文件）。
**遠端 `main` 其實已經是 `94d36d1`、信箱也已是 `littlefish0331@gmail.com`**（用 `git ls-remote origin refs/heads/main` 查證，2026-11-22 深夜）——之前的 force push 早就完成了，所以**現在只要普通 push，不需要 force**：

```
cd ontime-lucky-day && git push origin main
```

我的 git push 被分類器擋，不要繞路，由使用者自己執行。推上去之前，線上看到的還是舊名「準時下班宮」；推完 Vercel 自動部署。**接手第一件事：問使用者推了沒。**

## 這個 session（2026-11-22 晚）做完並驗證的事

- **Edge Function 已部署（v6）**：新網域 200、舊網域 403，線上檔案與 repo 逐字相同。
- **簡報第 1、2、3、7、8 頁已改**：改名「打工庇佑廟」＋標語；首頁變亮（`--bg*` 與 `--ink` 分家）；報名頁「信眾請留名」＋選填稱呼（信士、信女、小女子、小弟、路過看看、誠心發問，存 `Result.honorific`／`Store.honorific`）；痛點頁「信士，今天有什麼困擾？」、按鈕「換一批」；法號只留稱號（`makeHao`；`plainHao()` 相容舊紀錄「明・…」）；籤卡拿掉邀請語與網址、移到卡外 `.invite`；折行先在標點換行（`card.ts` 的 `wrap`）；分享區拿掉「換一則」、文案隨機一種、兩顆按鈕同一行；`+1 功德`；簽收字樣「胖橘／旺財代為簽收」。
- **四位神明依主題切換**（`src/data/deities.ts`）：辦公室、業務→績效伯伯；錢、服務輪班→發薪婆婆；工程師→旺財；通勤→胖橘。木魚畫面的圖與台詞跟著換。新角色圖 20 個 webp 已處理並看過深淺底拼圖。**動作圖（wangcai-typing、pangju-yarn 等 8 張）已處理但程式還沒用。**
- **使用者重生的籤筒與筊杯已換上**：`art-src/fortune-cylinder-v2.png`、`jiaobei-v2-sheet.png`（`process-art.py` 已改讀 v2）。筊杯兩面最外緣黃橘像素 0%、深淺棕底都沒有色邊。籤筒是廟宇式長筒，**我把顯示寬度由 210 縮到 150px、籤枝跳出位置重調**，截圖看過；跳出的那支籤用的還是舊的 `stick.webp`（尺寸比例略不搭，使用者沒重生它）。
- **og.jpg 已重做**：用 `art-src/og-notext.png` 疊新名稱、LUCKY WORKDAY 與標語，字型與網站一致，看過成品。**og 圖裡的貓仍是三花貓，不是胖橘。** 社群平台可能快取舊預覽圖，貼連結沒更新是正常的。
- 驗證：vitest 52、tsc、check-fortunes 530 張 0 錯誤；`e2e-smoke` 15/15（線上、本機）；`e2e-bad-paths` 19/19（用當天名字，見下）。

## 還沒解決、需要留意的小事

1. `e2e-bad-paths` 曾有一次在路線 B 找不到「重抽」鈕而逾時，之後兩次都過。**推測**是 3% 的陰筊隱藏款（不能重抽），**沒有證實**。腳本已加失敗時印出按鈕清單。
2. `e2e-card-layout` 最小間距 30px（舊記錄 70px）。用舊版 `card.ts` 對照也是 30px，所以不是這次改動造成，**原因沒查**。
3. 簡報提的「交班本寫了 2 頁，連冰箱都有交代」那張，**沒有專門看新折行的樣子**。
4. 簡報第 3 頁「OO 依上一頁選擇變化」我解讀成稱呼（信士…）。使用者若指的是職業，要改。
5. 簡報第 3 頁「選了某類卻抽到別類籤很怪」＋「職業標籤」**還沒動**，需要和使用者討論設計（現有 6 個主題其實就是職業）。
6. 簡報第 4 頁（手印）只換了字眼（「蓋個手印」、「求籤登記單」），**互動沒重做**。
7. `e2e-bad-paths` 的名字只在當天有效：用 `scripts` 內說明，或在 vite dev 頁面用引擎重算。2026-11-22 有效的是 `測試6 測試4`。

## 阻塞事項狀態

| # | 事項 | 狀態 | 怎麼辦 |
|---|---|---|---|
| 1 | ~~Edge Function 重新部署~~ | **已完成（2026-11-22 晚）**。注意：之後只要改籤詩（known-ids 變動）或加投票，就要再部署一次 | 部署用 `mcp__plugin_supabase_supabase__deploy_edge_function`，專案 `csykldmxxzlnwzbamswl`，檔案 `index.ts`、`logic.ts`、`known-ids.json`，`verify_jwt=false` |
| 2 | **push 本機新 commit** | 舊的信箱 force push **已完成**（遠端已是新信箱）。現在只要普通 push；我的 push 會被分類器擋，由使用者執行 | `cd ontime-lucky-day && git push origin main`。推完 Vercel 自動部署 |
| 3 | ~~旺財擠捷運~~ | **已處理**（`public/art/wangcai-mrt.webp`），看過圖 | 程式還沒用 |

## git 狀態

- 遠端 `main` = `94d36d1`（2026-11-22 深夜查證）；本機在它之上多了 `3a6c54d`、`548480d` 與幾個交接文件 commit。
- 所有 commit 的作者與提交者信箱都是 `littlefish0331@gmail.com`，**遠端也已經是**（已實際查證，不是推測）。
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
| **搖手機搖籤（2026-11-22 深夜新拍板）** | **允許**。有不確定的事再和使用者討論。注意 iOS 要點一下授權（DeviceMotion），會改變 SPEC「不跳權限視窗」；建議手機搖＋拖曳備援，授權鈕要放在自然的位置（例如搖籤那一頁的一顆按鈕），不能卡關 |
| **擲筊改 Three.js（2026-11-22 深夜新拍板）** | **允許**。包體積會變大，要用動態載入（只在擲筊頁才載），並量測前後差異回報。有不確定的事再討論 |
| 美術請求的方式 | 使用者覺得 `ART-PROMPTS-V2.md` 太複雜。**之後要請他用生成 AI 時，只給一小段可直接貼的 prompt＋一行規格，不要長文件** |
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

## 回饋簡報（`reference/feedback-01.pptx`）逐頁現況

| 頁 | 狀態 | 備註 |
|---|---|---|
| 1 首頁變亮 | **已做**（等使用者看實機） | 底色與紅光調亮，主視覺插圖沒動；亮不亮是主觀的 |
| 2 報名 | **已做** | 「信眾請留名」＋稱呼 chips；兩句說明已刪 |
| 3 痛點 | **部分** | 問句、「換一批」已改。**「選了某類卻抽到別類很怪」＋職業標籤還沒動，要先和使用者討論設計**（現有 6 個主題其實就是職業：先選職業再問困擾、籤上預先標好） |
| 4 手印 | **只換字** | 「蓋個手印」「求籤登記單」。**互動沒重做**：先按印泥→選位置→手印出現在按下處→按下震動→沒蓋完提示「按久一點」→指紋動畫（線條一段一段出現）。震動：Android 可 `navigator.vibrate`，iOS Safari 網頁據我所知不支援（未驗證），要有畫面備援並如實告訴使用者 |
| 5 搖籤 | **籤筒圖已換；搖手機未做** | 搖手機已獲允許（見上表） |
| 6 擲筊 | **筊杯圖已換；動畫未做** | 要散落隨機位置、拋起大小變化；Three.js 已獲允許 |
| 7 籤卡 | **已做** | 法號、邀請語移出、折行。**「交班本寫了 2 頁…」那張沒專門檢查** |
| 8 分享 | **已做** | |
| 9 截圖 | 保持 | |

## 美術現況

- 已處理進 `public/art/` 並接進程式：四位神明各 4 個表情、新籤筒、新筊杯。
- 已處理但**程式還沒用**：動作圖 8 張（`wangcai-typing/mrt/payday/overtime`、`pangju-yarn/mrt/glasses/keyboard`，768×768 webp）。可用在投票回應、結果頁、時令籤配圖等，用法待討論。
- `public/art/stick.webp`（跳出來的那支籤）仍是舊圖，與新長籤筒比例略不搭；**要換的話才需要請使用者重生**（短 prompt 即可）。
- og 圖的貓是三花貓而不是胖橘；要換才需重生。
- 角色 prompt：`docs/ART-PROMPTS-CHARACTERS.md`；V2 prompt：`docs/ART-PROMPTS-V2.md`（太長，使用者嫌複雜，不要再照這個格式給）。

## 諧音梗與時事語料（`reference/ai-response-02.md`，155 行）

- 一、25 條非政治時事＋10 個 11 月流行用語（**12/5 起時事籤到期後可用來補**）。
- 二、**56 條台灣諧音梗用例**（七類，附來源、認得度、流行狀態、台灣原生／兩岸共用）。
- (a) 10 個老到翻白眼的梗（**不要用**）；(b) 「打工」語感：台灣單用時多指工讀兼職，「打工人」是 2020 年對岸流行語、台灣有人借用，「打工仔」有港式色彩，中性說法是「上班族」。→ 名稱已定「打工庇佑廟」，使用者看過仍選它；文案裡「打工」與「上班族」交替用即可。(c) 排除與不確定項，其中 #22「人生在世 Bee嘴兩字」、#34「一場騙橘」地域不確定；「大橘為重」「喵不可言」「汪事如意」兩岸都有人用。
- **寫諧音籤前**：先和使用者確認是「新增張數」還是「改寫現有籤的一句」。改籤眼會改 id（舊票作廢），所以優先考慮新增，或只改內文。新增要同步調 SPEC 的配額、`check-fortunes` 的配額檢查，並重新部署 Edge Function。

## 下一步施工順序

1. **問使用者 force push 做了沒**；推完後用 `URL=https://lucky-workday.vercel.app/ node scripts/e2e-smoke.mjs` 驗線上，並看線上首頁截圖是不是新名稱。
2. **投票機制**（設計見上方，前端＋Edge Function `vote` action＋測試），再部署 Edge Function 一次（部署權限使用者已設好）。
3. **搖手機搖籤**（DeviceMotion＋拖曳備援；iOS 授權鈕）。真機沒辦法在這邊測，要如實告訴使用者「只在桌機模擬過」，請他實機回報。
4. **擲筊 Three.js**（動態載入、散落隨機位置、拋起大小變化）。先量現有包大小。
5. **手印互動重做**（見上表第 4 頁）。
6. **職業標籤**與「選了某類卻抽到別類」的設計討論，再動手。
7. **諧音籤**（`write-fortunes`，派寫手＋審稿；先問使用者是新增張數還是改寫現有籤的一句；只取 `ai-response-02.md` 的梗）。改籤詩後務必重新部署 Edge Function。
8. 寫**第 3 篇開發筆記**（`dev-note` skill）：搬到 Vercel、回饋整理、投票機制、四神明、og 圖自己疊字的做法。**還沒寫。**
9. 更新 `CLAUDE.md`、`SPEC.md`、`README.md` 的名稱與網址（`CLAUDE.md` 的網址已先改；SPEC 的流程、法號格式、「不跳權限視窗」都要更新）。

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
- **子代理的回報要自己抽查**：這次美術子代理說「看過圖、沒問題」，我另外看了拼圖才採信；籤筒與筊杯也是我自己量邊緣黃橘比例、放到深／淺／棕三種底色看過才換上。
- **背景伺服器要自己關**：用 `Get-NetTCPConnection -LocalPort <埠>` 找 PID 再關；啟動後要輪詢到真的回應再跑測試（這次有一次起得太慢，e2e 吃到 connection refused）。
- **Edge 上跑 e2e 的名字**：`e2e-smoke` 輸入框標籤已改成「你的名字或暱稱」，腳本已同步；之後再改標籤要同步改腳本。
- **og 圖不用請使用者重生**：`art-src/og-notext.png` 在瀏覽器裡用網站字型疊字即可（Canvas，輸出 `public/og.jpg`），文字壓到神像時往左縮、往上挪。
- **分類器擋了 `git push`**：commit 可以做，push 要使用者自己執行。
- **交接文件裡的「狀態」要現場查證**：我這次沿用舊記錄寫了「遠端還是舊信箱、要 force push、領先 4 個」，實際遠端早已更新、也不是領先 4 個。寫進文件前用 `git ls-remote`／`git rev-list --count origin/main..HEAD` 查。
