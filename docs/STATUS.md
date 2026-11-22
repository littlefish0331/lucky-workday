# 目前進度（新 session 先看這份）

最後更新：2026-11-23（第四個 session，Context 用到約 55% 時交接）。

## 一句話現況

V1 在 **Vercel**：https://lucky-workday.vercel.app/ ，repo `littlefish0331/lucky-workday`（公開）。
**遠端 `main` ＝ `8f71d9e`（已上線）；本機領先 3 個 commit、尚未 push**：`62b03cc` 清理未使用資產、`2ee6593` 抽籤權重改乙案、再加一個「刪 ART-PROMPTS-V2、更新文件」的 commit。接手第一件事用 `git ls-remote origin refs/heads/main` 與 `git rev-list --count origin/main..HEAD` 查實際狀態。Edge Function 仍是 **v7**（這個 session 沒改籤詩，不需要重新部署）。

## 這個 session（第四個，2026-11-23）做了什麼

**使用者實機回報（2026-11-22）**：搖手機有點難搖，甚至會誤觸 iPhone 的「還原」；擲筊沒問題；木魚棒子頭尾反了。

| 項目 | 結果 |
|---|---|
| 木魚棒子 | **已修、已上線**（`8f71d9e`）。原圖握柄在左、紅球在右，CSS 改成 `scaleX(-1)` 讓紅球朝下對準木魚；敲下去壓到木魚頂。舊版還超出畫面右緣 8px（會橫向捲動），一併消掉。看過閒置與敲下去兩張截圖。 |
| 搖手機太難搖 | **已調、已上線**。門檻 11→8、release 5→4、每下進度 0.05→0.07（約 15 下出籤）。合成資料量測：幅度 10 就算（舊要 15）；走路、搭車顛簸仍 0 下，只有「用力走路（幅度 10）」會誤觸 1 下。**這是依回報方向調的估計，沒有實機驗證，下次要請使用者再搖一次。** |
| **iPhone「還原」彈窗** | **沒修，原因不確定。** 推測是「報名」頁的輸入框（輸入文字後搖手機會觸發 iOS 的「搖動以還原」）。但沒有實機、查資料也失敗（搜尋被擋）。**要先問使用者：彈窗出現在哪一頁？** 只有搖籤頁會聽搖動；若彈在搖籤頁就和輸入框無關，要換方向查。 |
| 抽籤權重（方案乙） | **已做、已 commit、未 push**（`2ee6593`）。選了行業只抽那個行業的籤：同痛點 ×12、同主題別痛點 ×1、別主題 ×0。真實籤池實測 3 個日期×90 痛點×40 人：同痛點 39.0%、同主題別痛點 61.0%、別主題 0%（舊權重是 3.7%／26%／70%）。每個「主題×等級」常駐籤最少 5 張（money／上上籤），沒有就退回同權重。vitest 90→94。 |
| 清理 | `preview-version/` 使用者已自行刪除。已刪 8 張未使用動作圖（`wangcai-typing/mrt/payday/overtime`、`pangju-yarn/mrt/glasses/keyboard`，原圖仍在 `art-src/`，`process-art.py` 清單清空並留註解）、`_debug` 匯出、`.clock-logo`、`docs/ART-PROMPTS-V2.md`（用完了）。暫存 `shots/` 已清。 |
| 籤詩檢視 | 新增 `scripts/export-fortunes.py` → `export/fortunes.xlsx`（`export/` 已加進 `.gitignore`）。530 張，含籤眼、內文、結語、主題、痛點、籤型、時令、梗；最右兩欄黃底「你的判斷」（下拉：保留／修改／刪除／再想想）與「備註」，另有公式統計頁。已逐張與 JSON 比對、統計公式用 LibreOffice 重算驗過 0 錯誤。**使用者還沒回填**。注意：`recalc.py` 在 Windows 跑不起來（缺 `AF_UNIX`），改用 `soffice --headless --convert-to xlsx` 轉一份再讀值。 |

**籤詩存放位置（使用者問過）**：沒有存進 PostgreSQL（Supabase `public` 沒有任何資料表）。原稿在 `content/batches/*.json`，網站用 `src/data/fortunes.generated.json`（打包進網站）；Redis（`otld:` 前綴）只存計數與票數，Edge Function 另有「籤 id→等級」對照 `known-ids.json`，不含籤文。

**使用者實機驗證過的**：擲筊沒問題。投票有 1 票寫進 Redis（`otld:vu` 的 `fdc6971f`＝1），所以「合法票寫進 Redis」這步通了；**同 IP 一天一票的限流仍沒驗到**。

## 下一步（這個順序）

### 0. 先處理（很小）
- 問使用者：iPhone 的「還原」彈窗出現在哪一頁？（見上）
- 請使用者再試一次搖手機，看新門檻好不好搖、會不會誤觸。
- 把本機 3 個 commit 推上去前先問使用者（push 平常要先問）。**推之前先跑 `npm run build && node scripts/with-preview.mjs scripts/e2e-smoke.mjs`。**

### 1. 步驟② 改成「先選行業 → 再選今天的困擾」（使用者已同意）
現在是一次給 6 個不同行業的痛點（每個主題挑一個），辦公室族要在 6 個裡找自己。改成：先出 6 個行業鈕（`TOPIC_LABEL`：辦公室、工程師、業務接案、服務輪班、通勤、錢與年終），點了才列出該行業的痛點（每主題 15 個，一次出 6 個、可「換一批」）。`PainStep` 在 `src/screens/Steps.tsx`、批次邏輯 `pickPainBatch` 在 `src/data/pains.ts`。**抽籤權重已改，這一步沒做完前，玩家選到的痛點仍會讓權重生效，但畫面上還是一次 6 個行業混著選。** e2e 的 `scripts/e2e-smoke.mjs`、`e2e-bad-paths.mjs`、`e2e-vote.mjs`、`e2e-shake.mjs` 都用 `.pain` 的第一顆，改了流程要同步改腳本。

### 2. 手印互動重做（使用者已拍板，細節見下一節）

### 3. 補張數少的痛點（使用者已同意）
全部 530 張裡，90 個痛點每個 4～9 張（4 張×4、5 張×32、6 張×34、7 張×13、8 張×4、9 張×3）。最少的 4 個：被主管追蹤（office）、已讀就消失（sales）、月票省錢（commute）、分紅何時發（money）；其次是 5 張的：缺人不補、救火成常態、主管看天氣、新人沒手冊（都是 office）等。**權重改成 12/1/0 之後，每個痛點被抽到的重複感會變強，所以優先補這些。** 用 `write-fortunes` skill；補完要 `npm run build:fortunes`、跑 `check-fortunes`、**重新部署 Edge Function**。先問使用者補幾張、要不要同時做諧音籤（見下）。

### 4. 諧音籤（`write-fortunes`；先問使用者是新增張數還是改寫現有籤的一句；只取 `reference/ai-response-02.md` 的梗，不自創）。

### 5. 第 3 篇開發筆記（`dev-note` skill）：搬到 Vercel、回饋整理、投票機制、四神明、og 圖自己疊字、抽籤權重為何改（70%→0% 的算法與實測）。**還沒寫。**

### 6. 更新 `CLAUDE.md`、`SPEC.md`、`README.md`
- `CLAUDE.md`：`preview-version/` 那行已改成「已刪除」（2026-11-23）。`SPEC.md` 的流程、法號格式、「不跳權限視窗」「陰德→功德」「500 支→530 支」「揪同事合籤」都過時；`SPEC.md` 第 43 行「挑籤權重：痛點相同×4、主題相同×2、其他×1」要改成 12/1/0。`README.md` 與 `package.json` 的名稱仍是「準時下班宮／ontime-lucky-day」。
- `docs/NEW-SESSION-PROMPT.md` 已更新成這個 session 的交接版。

## 手印互動重做：使用者已拍板的規格（2026-11-23）

使用者給了三支參考影片（vecteezy 的 fingerprint scanner animation，手機設定指紋那種「線條一段一段出現」的效果），並做了以下決定：

| 項目 | 決定 |
|---|---|
| 標題 | 「**蓋個指印**」（不是「蓋個手印」）。原本的「掌印」素材（`stamp-palm-0/1`）**畫面改成別的**，要做的是：不再用掌印，改用什麼畫面要和使用者再確認（可選：只留指印、或貓掌狗掌的「代為簽收」仍保留）。**先問，不要自己決定。** |
| 流程 | ① 先按紅印泥 → ② 再按「想蓋的位置」→ ③ 指紋出現在按下去的位置、**一段一段出現**（像手機設定指紋，不要一次整個出現）→ ④ 按滿 1 秒完成 → ⑤ 沒按滿，出現提示文字「按久一點」 |
| 蓋章區域 | **框出一個區域，或是四個角標示位置**（使用者的話）。不是整張單子都能蓋，我先前建議限制在單子下半部的簽署框，使用者同意用框／四角標示 |
| 時間 | **先按一秒即可** |
| 震動 | **只讓 Android 有**（`navigator.vibrate`）。iPhone 不震。**iPhone 也不要畫面微震**——只要做「指紋一段一段出現」的動畫、按久一點就好。所以手印這一步**不要再呼叫會觸發畫面 `jolt` 的 `buzz()`**（`lib/haptics.ts` 的 `buzz` 目前會同時做畫面微震，要另外寫只震動不微震的版本，或加參數） |
| 素材 | 指紋是點陣 webp（`stamp-finger-0..3`），要「一段一段出現」可用遮罩由中心往外或由下往上掃；若要真正一圈圈線條要 SVG 描線，需要重畫素材（**先用遮罩做，不夠好再請使用者重生**，只給一小段 prompt） |

目前實作在 `src/screens/Steps.tsx` 的 `StampStep`（按住紅色圓鈕 1 秒，手印在「求籤登記單」右下出現）、`src/lib/stamp.ts`、`src/lib/storage.ts` 的 `randomStamp`（指印 35%／掌印 25%／貓掌 20%／狗掌 20%）、籤卡上由 `src/lib/card.ts` 畫手印。**改了手印種類，籤卡與籤冊舊紀錄還要能顯示**（`Result.stamp` 存 `kind`＋`idx`，不能讓舊紀錄的 `palm` 圖消失）。

## 第三個 session（2026-11-22 深夜）：投票機制完成

- **投票已做完、已 commit 並 push（`27e6ea5`）、Edge Function 已部署 v7**。前端 `src/components/VoteBox.tsx`＋`src/lib/vote.ts`（本機記票，每支籤一次不能改）；伺服器 `vote` action（`parseVote`／`voteCommand`／`voteRateCommand`，同 IP 同一支籤一天一票，寫 `otld:vu`／`otld:vd`）。凶籤還沒決定（重抽／認命）與陰筊隱藏款不顯示投票。
- **驗證**：vitest 63 通過；`scripts/e2e-vote.mjs` 18 項（攔截 Supabase 請求，不污染正式票數）；線上 Function 用壞輸入探測（不存在的籤、票別錯、缺 fid、亂 fid、別人的 Origin→403、沒 apikey→401）都被正確擋掉，`stats` 正常。
- **還沒驗證**：真正的一張票寫進 Redis、同 IP 一天一票的限流。前端已上線，等使用者在線上投票後，用 Upstash 讀 `otld:vu`／`otld:vd` 確認。我刻意沒有對正式資料庫送合法的票。
- **只看過發薪婆婆那組的「有感」截圖**；績效伯伯、旺財、胖橘與「沒感」的版面沒逐一看。

## 第三個 session 後半：搖手機搖籤、擲筊 Three.js（已做、已測、**未經真機**）

**搖手機搖籤**（`src/lib/shake.ts` 偵測、`src/lib/motion.ts` 接線、`Steps.tsx` 的 `ShakeStep`）
- 手機搖與手指拖曳**同時有效**。iOS 才出現「用搖手機的方式搖」鈕（點了才呼叫 `requestPermission`，不點不偷聽）；拒絕授權只多一句「沒開感應也沒關係，用手指拖曳就行。」；桌機／沒有感測器／1.5 秒沒資料，授權鈕不出現、安靜退回只剩拖曳。
- 偵測器：低通濾波估重力、高通取去重力加速度，門檻 11 m/s²，兩下至少隔 130ms，超過 260ms 仍在門檻上強制重新武裝（轉圈搖不會卡成 1 下）。參數集中在 `SHAKE_DEFAULTS`，每下進度 `SHAKE_STEP = 0.05`（用力搖約 2.5 秒出籤）。
- 驗證：vitest 13 項（合成資料：放桌上、雜訊、慢傾斜、走路、輕搖、用力搖、轉圈搖、亂搖）；`scripts/e2e-shake.mjs` 25 項（桌機、Android、iOS 允許／拒絕、無 DeviceMotion、走路不誤觸），看過授權鈕與拒絕提示截圖。
- **沒有真機。** 門檻是依典型數值估的、不是實測。真機要回報：好不好搖出籤？走路會不會誤觸？iOS 授權視窗正常嗎？太難／太易就調 `threshold` 與 `SHAKE_STEP`。

**擲筊 Three.js**（`src/lib/jiaobei-scene.ts` 場景、`jiaobei-physics.ts` 軌跡、`src/data/jiaobei-shape.ts` 輪廓）
- 結果仍由 `throwJiaobei` **先決定**，動畫只「演出」該結果（不是物理模擬，所以畫面與判定永遠一致）。每次落點隨機散落、兩杯不疊（vitest 掃 5000 個 seed）；拋起時筊杯比落地時大約 39%（近大遠小）。
- 筊杯輪廓由 `scripts/trace-jiaobei.py` 從貼圖透明度描出（換了筊杯圖要重跑），貼圖與輪廓同一組 UV 對齊。圓面用「同輪廓、只畫 BackSide」的薄片（曾用旋轉 180° 的做法，邊緣會冒出鏡射的耳朵，已改掉，看過三種結果截圖）。
- **three 只在擲筊頁才動態載入**；首頁 `index.html` 不預載（已驗證 0 次）。失敗一律退回原本 2D：three 載入失敗、沒有 WebGL、`prefers-reduced-motion`（連 three 都不下載）、載入超過 6 秒放棄。載入中按鈕顯示「筊杯準備中……」且不可按。
- **包體積**：主程式 460,766 → 467,567 bytes（+6.8KB，gzip 147,217 → 149,498，+2.3KB；含搖手機與擲筊接線）；`jiaobei-scene` 獨立 chunk **567,734 bytes（gzip 141,469）**，只有進到擲筊頁才下載。three 固定 `0.187.0`（`@types/three` 同版）。
- 驗證：vitest 14 項（軌跡連續、落點、輪廓不打結）；`scripts/e2e-toss3d.mjs`（含三種退回 2D）；聖／笑／陰三種結果的落地截圖（`scripts/shot-toss-faces.mjs`）；鏡頭位置不是目測，是用軌跡掃描確認全程不出畫面。
- **只用軟體 WebGL（SwiftShader）驗過，沒有真機。** 真機要回報：低階手機掉不掉幀？載入要等多久（目前慢網路會先看到「筊杯準備中……」）？畫面比例對不對？
- 想過但沒做：在搖籤那一頁就預先下載 three，可以讓「筊杯準備中」幾乎看不到，代價是搖籤頁就會多下載約 140KB gzip。要不要做由使用者決定。
- 已知小事：three 0.187 已移除 `PCFSoftShadowMap`，場景改用 `PCFShadowMap`（影子邊緣較硬）。

**驗證腳本的改動**：`e2e-smoke`、`e2e-vote` 的擲筊迴圈改成等狀態（籤卡出現或「再擲一次」可按），不再寫死 1250ms（3D 動畫較長，寫死會誤判）。新增 `scripts/with-preview.mjs`（替 e2e 自己啟動並關閉預覽伺服器，不留背景程序）。

## 環境陷阱（這個 session 踩到）

- **vitest 在 cwd 磁碟機代號是小寫 `c:` 時全部失敗**（`Cannot read properties of undefined (reading 'config')`，連沒改過的檔案也是；Playwright 與 tsc 不受影響）。從大寫 `C:\...` 路徑執行就正常。工作目錄切換後可能變小寫，先 `cd "C:/Users/..."` 再跑。**不要誤判成自己改壞了程式。**
- **背景預覽伺服器被分類器擋下「終止程序」**：`Stop-Process` 這類指令不要繞路。改用「前景執行＋逾時」，或請使用者自己關（`Stop-Process -Id (Get-NetTCPConnection -LocalPort 4173 -State Listen).OwningProcess -Force`）。
- `.preview.log`、`shots/` 是暫存，不要 commit（`git add` 指定檔案，不用 `-A`）。

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
| 2 | push | `8f71d9e` 已推並上線；之後的 commit 見頂端「一句話現況」 | 推之前先問使用者 |
| 3 | ~~旺財擠捷運~~ | 已處理後因為沒用到，2026-11-23 隨動作圖一起刪除 | 原圖在 `art-src/wangcai-mrt.png` |

## git 狀態

- **以頂端「一句話現況」與現場查詢為準**（`git ls-remote origin refs/heads/main`、`git rev-list --count origin/main..HEAD`）。2026-11-23：遠端 `8f71d9e`（已上線）；本機再領先 3 個 commit 未推。
- 所有 commit 的作者與提交者信箱都是 `littlefish0331@gmail.com`。
- 改寫信箱前有備份分支 `backup-before-email-rewrite`（只在本機；遠端已確認沒問題，可刪）。
- Vercel 與 GitHub 已連好：push 到 `main` 就自動部署（production），約 20 秒上線。專案 `lucky-workday`，id `prj_CI7RwyMSwUqqc8yIJoU816v0mAsi`，團隊 `youjuns-projects`（`team_IzBxrz0HlLp7LxzfLHPRvUOi`），Hobby 方案。
- **使用者這次明確要我 push，所以 push 成功；平常沒有明說時，push 仍要先問**（分類器之前擋過 push，這次是使用者在對話中明確授權後才執行的）。

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
| 美術請求的方式 | 使用者覺得 `ART-PROMPTS-V2.md`（已刪）太複雜。**之後要請他用生成 AI 時，只給一小段可直接貼的 prompt＋一行規格，不要長文件** |
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
| 3 痛點 | **部分** | 問句、「換一批」已改。**抽籤權重已改成選了行業就只抽該行業**（`2ee6593`，未 push）；**步驟② 改成「先選行業→再選困擾」已與使用者說定，還沒做**（見「下一步」第 1 項）。不需要新增「職業標籤」：現有 6 個主題就是職業，籤上早已標好 `topic` |
| 4 手印 | **規格已定，還沒做** | 使用者 2026-11-23 拍板，見「手印互動重做：使用者已拍板的規格」。標題改「蓋個指印」、掌印畫面改別的（先問）、Android 才震、iPhone 不震也不微震、按 1 秒、框出蓋章區 |
| 5 搖籤 | **已做；實機回報太難搖，已調低門檻（待再試）** | 搖手機＋拖曳並存，iOS 授權鈕；門檻 8／進度 0.07。iPhone「還原」彈窗原因未查明 |
| 6 擲筊 | **已做；使用者實機確認沒問題** | Three.js 3D：散落隨機落點、拋起近大遠小；失敗退回 2D |
| 7 籤卡 | **已做** | 法號、邀請語移出、折行。**「交班本寫了 2 頁…」那張沒專門檢查** |
| 8 分享 | **已做** | |
| 9 截圖 | 保持 | |

## 美術現況

- 已處理進 `public/art/` 並接進程式：四位神明各 4 個表情、新籤筒、新筊杯。
- 動作圖 8 張（`wangcai-typing/mrt/payday/overtime`、`pangju-yarn/mrt/glasses/keyboard`）程式從未用到，**2026-11-23 已從 `public/art` 刪除**；原圖在 `art-src/`，要用時把檔名加回 `scripts/process-art.py` 的清單再跑一次。
- `public/art/stick.webp`（跳出來的那支籤）仍是舊圖，與新長籤筒比例略不搭；**要換的話才需要請使用者重生**（短 prompt 即可）。
- og 圖的貓是三花貓而不是胖橘；要換才需重生。
- 角色 prompt：`docs/ART-PROMPTS-CHARACTERS.md`。V2 prompt 檔（`ART-PROMPTS-V2.md`）已用完並刪除；使用者嫌長文件複雜，之後只給一小段可直接貼的 prompt。

## 諧音梗與時事語料（`reference/ai-response-02.md`，155 行）

- 一、25 條非政治時事＋10 個 11 月流行用語（**12/5 起時事籤到期後可用來補**）。
- 二、**56 條台灣諧音梗用例**（七類，附來源、認得度、流行狀態、台灣原生／兩岸共用）。
- (a) 10 個老到翻白眼的梗（**不要用**）；(b) 「打工」語感：台灣單用時多指工讀兼職，「打工人」是 2020 年對岸流行語、台灣有人借用，「打工仔」有港式色彩，中性說法是「上班族」。→ 名稱已定「打工庇佑廟」，使用者看過仍選它；文案裡「打工」與「上班族」交替用即可。(c) 排除與不確定項，其中 #22「人生在世 Bee嘴兩字」、#34「一場騙橘」地域不確定；「大橘為重」「喵不可言」「汪事如意」兩岸都有人用。
- **寫諧音籤前**：先和使用者確認是「新增張數」還是「改寫現有籤的一句」。改籤眼會改 id（舊票作廢），所以優先考慮新增，或只改內文。新增要同步調 SPEC 的配額、`check-fortunes` 的配額檢查，並重新部署 Edge Function。

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
- 上層有 `reference/`（規格與聯網 AI 蒐集的語料，唯讀）。`preview-version/`（舊版）已由使用者刪除，不用再提。

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
- **檢查器沒輸出≠通過**：`e2e-toss3d` 有一次整段沒有任何輸出，是腳本在例外中崩潰（等 `.verdict` 逾時），不是通過。跑完要看「全部通過」那行與 exit code，沒有就當失敗查。
- **e2e 不要寫死動畫時間**：3D 擲筊比 2D 長，寫死 `waitForTimeout(1250)` 會誤判。改成等狀態（籤卡出現或「再擲一次」可按）。聖筊／陰筊會在約 1.1～1.5 秒後自動換頁，要分析畫面就「先截圖、後分析」。
- **雜訊要驗到不是自己造成的**：vitest 全壞時，我先 `git stash` 對照乾淨樹也一樣壞，才確定是環境（小寫磁碟機代號），不是自己的改動。
- **前景＋自己關**：用 `scripts/with-preview.mjs` 或 e2e 腳本自己 spawn 預覽伺服器，不要背景啟動後留著（分類器擋終止程序）。
- **裝套件要使用者同意**：`npm install` 被分類器擋過，使用者自己執行後才能繼續；套件版本固定（`three@0.187.0`、`@types/three@0.187.0`）。
- **鏡頭、軌跡這類數字用量測，不要目測**：擲筊鏡頭是用軌跡掃描確認全程不出畫面，再看截圖；第一次目測的版本拋起時筊杯被切掉。
- **three.js 的圓面貼圖不要用旋轉 180° 做鏡像**：輪廓會左右反過來，邊緣冒出「耳朵」。用同輪廓、`BackSide`。
- **Windows 的 `git add` 會警告 LF→CRLF**：無害，照常。
- **使用者要求 push 時我才 push**：平常沒明說就先問；這次他在對話中明確要求，執行成功。
