# 新 session 的初始 Prompt

> 把下面整段貼給新的 Claude Code session。`docs/STATUS.md` 已是最新（2026-11-23，第四個 session 結束）。

```
你接手「打工庇佑廟 Lucky Workday」（程式裡已改名，舊名「準時下班宮」只會出現在舊紀錄與開發筆記）。
網站 https://lucky-workday.vercel.app/ ，repo：littlefish0331/lucky-workday（git 在 ontime-lucky-day/ 內），部署在 Vercel，push 到 main 自動上線。
V1 已上線，且已有投票（有感／沒感）、搖手機搖籤、擲筊 Three.js 3D。你的工作是照使用者的回饋繼續做、維護內容。

【先讀，依序】
1. 專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. ontime-lucky-day/docs/STATUS.md：現況、使用者已拍板的決定、「下一步」的順序、手印的完整規格。最重要，讀完再動手。
3. ontime-lucky-day/docs/SPEC.md（V1 規格；部分內容已過時，STATUS「下一步」第 6 項列了哪裡過時）。
4. 只在寫或審籤詩時：content/WRITING-GUIDE.md、reference/ai-response-02.md（台灣諧音梗，只取台灣原生、認得度高、非過氣的）。

【不要做】
- 不要把 Redis token 或任何機密寫進 repo、前端、對話。Supabase secrets 由使用者自己填。
- 不要自己想諧音梗（使用者說過怪怪的）；要用就從 ai-response-02.md 取。
- 不要只憑檢查器通過就說「好了」：流程類改動要用 e2e 腳本在真實瀏覽器跑過，版面與美術類改動要看截圖，不能只看量測數字。跑完要看到「全部通過」或「N 項通過，0 項失敗」那行與 exit code；整段沒輸出不是通過，是崩潰，要查。
- 被 Claude Code 權限分類器擋下的動作（刪檔、npm install、終止程序、Redis 寫入等）不要繞路；告訴使用者，請他自己執行或加 /permissions 規則。git push 平常要先問；使用者在對話中明確要求時才推。
- 請使用者用生成 AI 做圖時，只給「一小段可直接貼的 prompt＋一行規格」。使用者嫌長文件複雜。
- Python 不要加 -I（會擋掉 Pillow）。Bash 跑 Python 用 python -X utf8。讀 pptx 中文也要用 python-pptx（markitdown 在這台會亂碼）。
- e2e 不要寫死動畫等待時間，要等狀態。
- `git add` 一律指定檔案，不要 `-A`（`shots/`、`.tmp-*`、`export/` 等暫存不進 repo）。暫存腳本用完要刪。
- 不要憑記憶說「某某不支援」：iPhone 能不能震動、iPhone「還原」彈窗為何出現，我都沒有實機證據，要如實說「沒驗證」。

【開始前，先跑這三個確認環境是好的】
  cd "C:/Users/YoujunYu/Desktop/Youjun-disk/18-Claude-Code/wage-slave-luck-draw-temple/ontime-lucky-day" && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs
（預期：vitest 94 通過、tsc 無輸出、籤詩 530 張 0 錯誤。
 注意 1：cd 要用「大寫 C:」的完整路徑。cwd 磁碟機代號是小寫 c: 時，vitest 會全部失敗（Cannot read properties of undefined (reading 'config')），那是環境問題、不是程式壞了。
 注意 2：若 art-src/ 不在，代表換了電腦，美術原圖需向使用者要。）

【第一件事】
先查實際狀態，不要信文件：`git ls-remote origin refs/heads/main` 與 `git rev-list --count origin/main..HEAD` 與 `git status --short`。
預期：遠端 8f71d9e（已上線）；本機領先 3 個 commit（清理資產、抽籤權重改乙案、文件交接）、尚未 push；Edge Function 是 v7。若不一致，先弄清楚原因再動手。
然後問使用者三件小事（STATUS「下一步」第 0 項）：
  (a) iPhone 的「還原」彈窗出現在哪一頁？（只有搖籤頁會聽搖動；若在報名頁就是輸入框造成的，若在搖籤頁要換方向查）
  (b) 請他再搖一次手機：門檻已從 11 降到 8，好不好搖、走路會不會誤觸？
  (c) 本機 3 個 commit 可以推嗎？（推之前先 npm run build && node scripts/with-preview.mjs scripts/e2e-smoke.mjs，預期 17 項通過）

【然後：照 STATUS.md「下一步」的順序做（使用者都已同意）】
1. 步驟② 改成「先選行業（6 個）→ 再選今天的困擾（該行業 15 個，一次 6 個可換一批）」。抽籤權重已改成選了行業只抽該行業（同痛點 ×12、同主題 ×1、別主題 ×0），所以這一步做完，玩家才不會在畫面上看到混著 6 個行業。改了流程要同步改 e2e 腳本（它們都用 .pain 的第一顆）。
2. 手印互動重做。規格使用者已拍板，寫在 STATUS「手印互動重做：使用者已拍板的規格」：標題「蓋個指印」；先按紅印泥、再按想蓋的位置、指紋在按下處一段一段出現（參考手機設定指紋的動畫）；框出蓋章區或四角標示；按 1 秒；沒按滿提示「按久一點」；只有 Android 震動，iPhone 不震也不要畫面微震；掌印畫面「改成別的」——**這點使用者沒說改成什麼，要先問，不要自己決定**。舊紀錄的 stamp.kind 若是 palm，籤卡與籤冊仍要能顯示。
3. 補張數少的痛點（90 個痛點每個 4～9 張；最少的是被主管追蹤、已讀就消失、月票省錢、分紅何時發，各 4 張）。用 write-fortunes skill，派寫手＋審稿。先問使用者補幾張、是否同時做諧音籤。改了籤詩 → npm run build:fortunes、check-fortunes、一定要重新部署 Edge Function（known-ids.json 變了；不部署，新籤的計數與投票會被伺服器擋）。部署用 mcp__plugin_supabase_supabase__deploy_edge_function，專案 csykldmxxzlnwzbamswl，檔案 index.ts／logic.ts／known-ids.json，verify_jwt=false。
4. 諧音籤：先問是「新增張數」還是「改寫現有籤的一句」（改籤眼會改 id、舊票作廢）。
5. 第 3 篇開發筆記（dev-note skill）：搬到 Vercel、回饋整理、投票、四神明、og 圖、抽籤權重為何改（舊權重下選了痛點 70% 抽到別的主題、只有 3.7% 抽到同痛點；新權重實測 39%／61%／0%）。
6. 更新 CLAUDE.md、SPEC.md、README.md（名稱、網址、已刪的 preview-version、權重）。
另外：使用者還沒回填 export/fortunes.xlsx（籤詩檢視表，執行 python -X utf8 scripts/export-fortunes.py 可重產）。他回填後，依「你的判斷」欄逐項改 content/batches/*.json。

【工作方式】
- 複雜流程與決策寫進 dev-notes/（dev-note skill，要有 mermaid 或步驟動畫）。
- 可獨立的工作平行派 subagent：改檔案的範圍事先切開，避免互相覆蓋；子代理回報要自己抽查（看圖、跑測試），不要照單全收。
- WebSearch 在公司 gateway 不可用，WebFetch 查搜尋引擎也會被擋；需要網路資訊時，寫「prompt＋預期格式」給使用者，他用聯網 AI 查完貼回 reference/。
- 跑 e2e 用 scripts/with-preview.mjs（自己啟動並關閉預覽伺服器，不留背景程序）：
    npm run build && node scripts/with-preview.mjs scripts/e2e-smoke.mjs
  其他腳本：e2e-vote、e2e-shake、e2e-toss3d（這三支自己啟動伺服器，直接跑）、e2e-bad-paths（名字只在當天有效，見腳本）。
  測線上：URL=https://lucky-workday.vercel.app/ node scripts/e2e-smoke.mjs
- 之後可以主動提的討論（使用者說「只是討論」，不要直接動手）：賺錢方式（加贊助連結前先確認 Vercel Hobby 條款）、聖誕節延伸、交換願望的遊戲、V1.1（每支籤獨立預覽圖／揪同事合籤／年度籤冊）、V2（使用者投稿一句話）。
- Context 到 65% 要提醒使用者，並更新 STATUS.md。
```
