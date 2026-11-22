# 新 session 的初始 Prompt

> 把下面整段貼給新的 Claude Code session。`docs/STATUS.md` 已是最新（2026-11-22 傍晚）。

```
你接手「打工庇佑廟 Lucky Workday」（原名「準時下班宮」，改名還沒做進程式）。
網站 https://lucky-workday.vercel.app/ ，repo：littlefish0331/lucky-workday（git 在 ontime-lucky-day/ 內），部署在 Vercel，push 到 main 自動上線。
V1 已上線，不是從零開始。你的工作是照使用者的回饋調整、維護內容。

【先讀，依序】
1. 專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. ontime-lucky-day/docs/STATUS.md：現況、使用者已確認的決定、回饋簡報逐頁待辦、施工順序、阻塞事項。最重要，讀完再動手。
3. ontime-lucky-day/docs/SPEC.md（V1 規格；要改任何數字先問使用者）。
4. 只在寫或審籤詩時：content/WRITING-GUIDE.md、reference/ai-response-02.md（台灣諧音梗 56 條與「打工」語感，只取台灣原生、認得度高、非過氣的）。
5. 只在做美術時：docs/ART-PROMPTS.md（6 關驗收）、docs/ART-PROMPTS-CHARACTERS.md。

【不要做】
- 不要碰 preview-version/（舊版）。
- 不要把 Redis token 或任何機密寫進 repo、前端、對話。Supabase secrets 由使用者自己填。
- 不要自己想諧音梗（使用者說過怪怪的）；要用就從 ai-response-02.md 取。
- 不要只憑檢查器通過就說「好了」：流程類改動要用 scripts/e2e-smoke.mjs 在真實瀏覽器跑過，版面類改動要看截圖。
- 被 Claude Code 權限分類器擋下的動作（git push、deploy_edge_function、刪 repo 等）不要繞路；告訴使用者要加哪條 /permissions 規則，或請他自己執行。
- Python 不要加 -I（會擋掉 Pillow）。Bash 跑 Python 用 python -X utf8。

【開始前，先跑這三個確認環境是好的】
  cd ontime-lucky-day && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs
（若 art-src/ 不在，代表換了電腦，美術原圖需向使用者要。）

【第一件事：確認三個阻塞（STATUS.md 開頭有細節）】
1. Edge Function 還沒重新部署：新網域目前被線上版擋（403 origin），新站計數壞掉但遊戲正常；線上 known-ids 也比 repo 舊。使用者已口頭授權你部署，但工具層曾被分類器擋下。請請他到 /permissions 加 mcp__plugin_supabase_supabase__deploy_edge_function，再部署（檔案 index.ts、logic.ts、known-ids.json，專案 csykldmxxzlnwzbamswl，verify_jwt=false），部署後用新網址跑 e2e-smoke。
2. 本機 commit 信箱已改成 littlefish0331@gmail.com，遠端還是舊的。請使用者自己執行：cd ontime-lucky-day && git push --force-with-lease origin main
3. art-src/ 已有新角色圖（發薪婆婆、旺財、胖橘共 11 張＋旺財擠捷運重生版）。

【之後照 STATUS.md「新 session 的施工順序」做】
改名「打工庇佑廟」（標語「職場很莫名其廟，來拜一下」）＋木魚「功德」＋簡報小改 → 美術處理與四神明依主題切換 → 投票機制（有感／沒感，設計已確認）→ 諧音籤 → 手印互動與擲筊動畫。
搖晃手機搖籤、擲筊改 Three.js 這兩項使用者還沒拍板，做之前先問；搖手機在 iOS 要點一下授權，會改變 SPEC「不跳權限視窗」。
可獨立的工作平行派 subagent：改檔案的範圍事先切開，避免互相覆蓋。寫籤詩用 write-fortunes skill，美術 prompt 用 codex-art-prompt skill。

【工作方式】
- 複雜流程與決策寫進 dev-notes/（dev-note skill，要有 mermaid 或步驟動畫）。第 3 篇還沒寫：搬到 Vercel、回饋整理、投票機制。
- WebSearch 在公司 gateway 不可用；需要網路資訊時，寫「prompt＋預期格式」給使用者，他用聯網 AI 查完貼回 reference/。
- 之後可以主動提的討論（使用者說「只是討論」，不要直接動手）：賺錢方式（加贊助連結前先確認 Vercel Hobby 條款）、聖誕節延伸、交換願望的遊戲、V1.1（每支籤獨立預覽圖／揪同事合籤／年度籤冊）、V2（使用者投稿一句話）。
- Context 到 65% 要提醒使用者，並更新 STATUS.md。
```
