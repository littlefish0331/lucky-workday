# 新 session 的初始 Prompt

> 把下面整段貼給新的 Claude Code session。`docs/STATUS.md` 已是最新（2026-11-22 深夜）。

```
你接手「打工庇佑廟 Lucky Workday」（程式裡已改名，舊名「準時下班宮」只會出現在舊紀錄與開發筆記）。
網站 https://lucky-workday.vercel.app/ ，repo：littlefish0331/lucky-workday（git 在 ontime-lucky-day/ 內），部署在 Vercel，push 到 main 自動上線。
V1 已上線。你的工作是照使用者的回饋繼續做、維護內容。

【先讀，依序】
1. 專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. ontime-lucky-day/docs/STATUS.md：這個 session 做了什麼、使用者已確認的決定、簡報逐頁現況、下一步施工順序。最重要，讀完再動手。
3. ontime-lucky-day/docs/SPEC.md（V1 規格；要改任何數字先問使用者。部分內容已過時，見 STATUS 最後一條施工項）。
4. 只在寫或審籤詩時：content/WRITING-GUIDE.md、reference/ai-response-02.md（台灣諧音梗，只取台灣原生、認得度高、非過氣的）。

【不要做】
- 不要碰 preview-version/（舊版）。
- 不要把 Redis token 或任何機密寫進 repo、前端、對話。Supabase secrets 由使用者自己填。
- 不要自己想諧音梗（使用者說過怪怪的）；要用就從 ai-response-02.md 取。
- 不要只憑檢查器通過就說「好了」：流程類改動要用 scripts/e2e-smoke.mjs 在真實瀏覽器跑過，版面與美術類改動要看截圖。
- 被 Claude Code 權限分類器擋下的動作（git push 等）不要繞路；告訴使用者，請他自己執行或加 /permissions 規則。
- 請使用者用生成 AI 做圖時，只給「一小段可直接貼的 prompt＋一行規格」。使用者嫌過長文件太複雜。
- Python 不要加 -I（會擋掉 Pillow）。Bash 跑 Python 用 python -X utf8。

【開始前，先跑這三個確認環境是好的】
  cd ontime-lucky-day && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs
（預期：vitest 52 通過、tsc 無輸出、籤詩 530 張 0 錯誤。若 art-src/ 不在，代表換了電腦，美術原圖需向使用者要。）

【第一件事】
先用 `git ls-remote origin refs/heads/main` 與 `git rev-list --count origin/main..HEAD` 查實際狀態。預期遠端是 94d36d1（信箱已是新的）、本機領先 `3a6c54d`、`548480d` 與幾個交接文件 commit，**不需要 force**。
問使用者有沒有執行：
  cd ontime-lucky-day && git push origin main
（我的 push 被分類器擋，只有他能推。）推完之後，用
  URL=https://lucky-workday.vercel.app/ node scripts/e2e-smoke.mjs
驗線上，並看線上首頁截圖確認是新名稱「打工庇佑廟」。Edge Function 已部署（v6），不用再處理。

【然後照 STATUS.md「下一步施工順序」做】
投票機制 → 搖手機搖籤 → 擲筊 Three.js → 手印互動重做 → 職業標籤（先和使用者討論）→ 諧音籤 → 第 3 篇開發筆記 → 更新 CLAUDE.md／SPEC／README 的名稱。
使用者已允許「搖手機搖籤」與「擲筊改 Three.js」，有不確定的事再和他討論。注意：搖手機在 iOS 要點一下授權；真機測不了，要如實告訴他「只在桌機模擬過」，請他實機回報。Three.js 要動態載入並量測包體積變化。
可獨立的工作平行派 subagent：改檔案的範圍事先切開，避免互相覆蓋；子代理回報要自己抽查（看圖、跑測試），不要照單全收。寫籤詩用 write-fortunes skill，美術 prompt 用 codex-art-prompt skill。

【工作方式】
- 複雜流程與決策寫進 dev-notes/（dev-note skill，要有 mermaid 或步驟動畫）。
- WebSearch 在公司 gateway 不可用；需要網路資訊時，寫「prompt＋預期格式」給使用者，他用聯網 AI 查完貼回 reference/。
- 之後可以主動提的討論（使用者說「只是討論」，不要直接動手）：賺錢方式（加贊助連結前先確認 Vercel Hobby 條款）、聖誕節延伸、交換願望的遊戲、V1.1（每支籤獨立預覽圖／揪同事合籤／年度籤冊）、V2（使用者投稿一句話）。
- Context 到 65% 要提醒使用者，並更新 STATUS.md。
```
