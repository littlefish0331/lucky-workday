# 新 session 的初始 Prompt

> 當對話 context 接近 65%，或想換一個乾淨的 session 時，把下面整段貼給新的 Claude Code。
> 同時請確認 `docs/STATUS.md` 是最新的（舊 session 結束前要先更新它）。

```
你接手「準時下班宮」（repo：littlefish0331/ontime-lucky-day）。目標 2026-11-22 前上線 V1。

請依序做：
1. 讀專案根目錄的 CLAUDE.md（鐵則與工作方式，必須遵守）。
2. 讀 ontime-lucky-day/docs/STATUS.md（目前進度、待辦、風險、常用指令）。這是最重要的一份。
3. 讀 ontime-lucky-day/docs/SPEC.md（已和使用者確認的規格；要改任何數字先問使用者）。
4. 讀 ontime-lucky-day/content/WRITING-GUIDE.md（只在要寫或審籤詩時）。

不要做的事：
- 不要碰 preview-version/（舊版，只參考）。
- 不要把 Redis token 或任何機密寫進 repo、前端或對話。
- git push、部署、建立或刪除雲端資源之前，先問使用者。

開始前先跑這三個，確認環境是好的，再回報給我現況與你打算做的第一件事：
  cd ontime-lucky-day && npx vitest run && npx tsc --noEmit && node scripts/check-fortunes.mjs

你的工作方式：複雜流程寫進 dev-notes/（用 dev-note skill）；寫籤詩用 write-fortunes skill；
需要新美術用 codex-art-prompt skill（你無法生圖）；網路搜尋被公司 gateway 擋掉，
需要時寫「prompt＋預期格式」給我，我用聯網 AI 查完貼回 reference/。
Context 到 65% 要提醒我並更新 STATUS.md。
```
