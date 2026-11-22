# 新 session 的初始 Prompt

> 把下面整段貼給新的 Claude Code session。`docs/STATUS.md` 已是最新（2026-11-20 晚，V1 已上線）。

```
你接手「準時下班宮」（網站 https://littlefish0331.github.io/ontime-lucky-day/ ，repo：littlefish0331/ontime-lucky-day）。
V1 已上線，不是從零開始。你的工作是照使用者的回饋調整、維護內容，並在適當時機和他討論後續方向。

【先讀，依序】
1. 專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. ontime-lucky-day/docs/STATUS.md（現況、待辦、風險、常用指令、改籤詩後必做的事）。最重要。
3. ontime-lucky-day/docs/SPEC.md（已確認的規格；要改任何數字先問使用者）。
4. 只在寫或審籤詩時：ontime-lucky-day/content/WRITING-GUIDE.md。
5. 只在做美術時：ontime-lucky-day/docs/ART-PROMPTS.md（含 6 關驗收標準）。

【不要做】
- 不要碰 preview-version/（舊版）。
- 不要把 Redis token 或任何機密寫進 repo、前端、對話。Supabase secrets 由使用者自己填。
- git push、重新部署 Edge Function、建立或刪除雲端資源之前，先問使用者。
- 不要只憑檢查器通過就說「好了」：流程類改動要用 scripts/e2e-smoke.mjs 在真實瀏覽器跑過，版面類改動要看截圖。

【開始前，先跑這三個確認環境是好的，再回報現況與你打算做的第一件事】
  cd ontime-lucky-day && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs
（git 在 ontime-lucky-day/ 內。若 art-src/ 不在，代表換了電腦，美術原圖需向使用者要。）

【最可能的第一件事】問使用者：實機測試（iPhone/Android 的震動、存圖到相簿、Threads 發文）有沒有問題？
籤詩抽樣的標註結果（有感／普通／沒感）給了嗎？若有，用 write-fortunes skill 重寫沒感覺的，
然後依 STATUS.md 的「改了籤詩之後一定要做的事」重新部署。

【之後可以主動提的討論（使用者說「只是討論」，不要直接動手）】
賺錢方式（buy me a coffee 等）、聖誕節延伸、交換願望的遊戲、V1.1（每支籤獨立預覽圖／揪同事合籤／年度籤冊）、V2（使用者投稿一句話）。

【工作方式】
- 複雜流程與決策寫進 dev-notes/（用 dev-note skill，要有 mermaid 或步驟動畫）。
- 寫籤詩用 write-fortunes skill（會平行叫 fortune-writer 與 fortune-reviewer）。
- 需要新美術用 codex-art-prompt skill（你無法生圖，使用者會轉給 Codex）。
- WebSearch 在公司 gateway 不可用；需要網路資訊時，寫「prompt＋預期格式」給使用者，他用聯網 AI 查完貼回 reference/。
- Bash 工具跑 Python 要加 -X utf8。
- Context 到 65% 要提醒使用者，並更新 STATUS.md。
```
