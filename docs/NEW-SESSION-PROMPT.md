# 新 session 的初始 Prompt

> 把下面整段貼給新的 Claude Code session。`docs/STATUS.md` 已是最新（2026-11-22 深夜，第三個 session 結束）。

```
你接手「打工庇佑廟 Lucky Workday」（程式裡已改名，舊名「準時下班宮」只會出現在舊紀錄與開發筆記）。
網站 https://lucky-workday.vercel.app/ ，repo：littlefish0331/lucky-workday（git 在 ontime-lucky-day/ 內），部署在 Vercel，push 到 main 自動上線。
V1 已上線，上一個 session 又做完並上線了：投票（有感／沒感）、搖手機搖籤、擲筊 Three.js 3D。你的工作是照使用者的回饋繼續做、維護內容。

【先讀，依序】
1. 專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. ontime-lucky-day/docs/STATUS.md：現況、使用者已確認的決定、「等使用者回報什麼」、下一步施工順序。最重要，讀完再動手。
3. ontime-lucky-day/docs/SPEC.md（V1 規格；要改任何數字先問使用者。部分內容已過時，見 STATUS 最後一條施工項）。
4. 只在寫或審籤詩時：content/WRITING-GUIDE.md、reference/ai-response-02.md（台灣諧音梗，只取台灣原生、認得度高、非過氣的）。

【不要做】
- 不要碰 preview-version/（舊版）。
- 不要把 Redis token 或任何機密寫進 repo、前端、對話。Supabase secrets 由使用者自己填。
- 不要自己想諧音梗（使用者說過怪怪的）；要用就從 ai-response-02.md 取。
- 不要只憑檢查器通過就說「好了」：流程類改動要用 e2e 腳本在真實瀏覽器跑過，版面與美術類改動要看截圖。跑完要看到「全部通過」那行與 exit code；整段沒輸出不是通過，是崩潰，要查。
- 被 Claude Code 權限分類器擋下的動作（npm install、終止程序等）不要繞路；告訴使用者，請他自己執行或加 /permissions 規則。git push 平常要先問；使用者在對話中明確要求時才推。
- 請使用者用生成 AI 做圖時，只給「一小段可直接貼的 prompt＋一行規格」。使用者嫌過長文件太複雜。
- Python 不要加 -I（會擋掉 Pillow）。Bash 跑 Python 用 python -X utf8。
- e2e 不要寫死動畫等待時間（3D 擲筊比 2D 長），要等狀態。
- `git add` 一律指定檔案，不要 `-A`（`shots/`、`.preview.log` 等暫存不進 repo）。

【開始前，先跑這三個確認環境是好的】
  cd "C:/Users/YoujunYu/Desktop/Youjun-disk/18-Claude-Code/wage-slave-luck-draw-temple/ontime-lucky-day" && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs
（預期：vitest 90 通過、tsc 無輸出、籤詩 530 張 0 錯誤。
 注意 1：cd 要用「大寫 C:」的完整路徑。cwd 磁碟機代號是小寫 c: 時，vitest 會全部失敗（Cannot read properties of undefined (reading 'config')），那是環境問題、不是程式壞了。
 注意 2：若 art-src/ 不在，代表換了電腦，美術原圖需向使用者要。）

【第一件事】
先查實際狀態，不要信文件：`git ls-remote origin refs/heads/main` 與 `git rev-list --count origin/main..HEAD`。
預期：遠端與本機都是 d3ad985、領先 0、工作區乾淨；Edge Function 是 v7。若不一致，先弄清楚原因再動手。

【然後：使用者的實機回報（最優先）】
使用者已在手機上測過這次上線的功能，**結果會貼在這個對話裡**。STATUS.md 的「等使用者回報什麼」有一張清單（搖手機、擲筊 3D、投票、存圖與 Threads、震動）。
- 他貼回來之後，先逐項處理他回報的問題，再做後面的施工順序。內容不完整就逐項追問，不要自己假設。
- 搖手機太難搖／太容易誤觸：調 src/lib/shake.ts 的 SHAKE_DEFAULTS.threshold（現 11）與 Steps.tsx 的 SHAKE_STEP（現 0.05）。這些數字是我依典型值估的，**沒有實機驗證過**。
- 擲筊卡頓、等太久、版面怪：鏡頭在 jiaobei-scene.ts；軌跡高度與落點在 jiaobei-physics.ts。要不要在搖籤頁預先下載 three（多約 140KB，換來幾乎看不到「筊杯準備中……」）由使用者決定。
- 投票：他實測投過之後，用 Upstash MCP（redis_run_command，HGETALL otld:vu / otld:vd，資料庫 id 見 CLAUDE.md）確認票真的寫進去了。這是投票唯一還沒驗證的環節。注意他自己測的票也會被計入。
- 如實告訴他：搖手機只用合成事件驗過、擲筊只用軟體 WebGL 驗過，所以他的實機結果比我的測試更可信。

【再來：照 STATUS.md「下一步施工順序」做】
手印互動重做 → 職業標籤與「選了某類卻抽到別類」（先和使用者討論，再動手）→ 諧音籤（先問是新增張數還是改寫現有籤的一句）→ 第 3 篇開發筆記（dev-note skill）→ 更新 CLAUDE.md／SPEC／README 的名稱與網址。
手印的震動：Android 可 navigator.vibrate，iOS Safari 據我所知不支援（未驗證），要有畫面備援並如實告訴使用者。
改了籤詩 → 一定要重新部署 Edge Function（known-ids.json 變了；不部署，新籤的計數與投票會被伺服器擋）。部署用 mcp__plugin_supabase_supabase__deploy_edge_function，專案 csykldmxxzlnwzbamswl，檔案 index.ts／logic.ts／known-ids.json，verify_jwt=false。
可獨立的工作平行派 subagent：改檔案的範圍事先切開，避免互相覆蓋；子代理回報要自己抽查（看圖、跑測試），不要照單全收。寫籤詩用 write-fortunes skill，美術 prompt 用 codex-art-prompt skill。

【工作方式】
- 複雜流程與決策寫進 dev-notes/（dev-note skill，要有 mermaid 或步驟動畫）。
- WebSearch 在公司 gateway 不可用；需要網路資訊時，寫「prompt＋預期格式」給使用者，他用聯網 AI 查完貼回 reference/。
- 跑 e2e 用 scripts/with-preview.mjs（自己啟動並關閉預覽伺服器，不留背景程序）：
    npm run build && node scripts/with-preview.mjs scripts/e2e-smoke.mjs
  其他腳本：e2e-vote、e2e-shake、e2e-toss3d（這三支自己啟動伺服器，直接跑）、e2e-bad-paths（名字只在當天有效，見腳本）。
  測線上：URL=https://lucky-workday.vercel.app/ node scripts/e2e-smoke.mjs
- 之後可以主動提的討論（使用者說「只是討論」，不要直接動手）：賺錢方式（加贊助連結前先確認 Vercel Hobby 條款）、聖誕節延伸、交換願望的遊戲、V1.1（每支籤獨立預覽圖／揪同事合籤／年度籤冊）、V2（使用者投稿一句話）。
- Context 到 65% 要提醒使用者，並更新 STATUS.md。
```
