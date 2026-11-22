# 角色美術 prompt：績效伯伯、發薪婆婆、旺財、胖橘（2026-11-22）

> 給使用者轉交 Codex (Image 2.6)。成品放進 `ontime-lucky-day/art-src/`（原圖，不進 git），我再處理成 webp 放進 `public/art/`。
> 驗收仍用 `docs/ART-PROMPTS.md` 開頭的 **6 關**。分批給、不用一次全好。

## 角色表

| 角色 | 是什麼 | 美術狀態 | 預計負責的主題（待使用者確認） |
|---|---|---|---|
| 績效伯伯 | 白鬍子老神明，識別證、打卡單 | **已有**（現有 `deity-0..3.webp`），只改名，不重生 | 辦公室、業務接案 |
| 發薪婆婆 | 白髮包頭的老神明，紅包袋與金元寶 | **要新生** | 錢與年終、服務輪班 |
| 旺財 | 柴犬，勤奮、加班、忠心 | **要新生** | 工程師 |
| 胖橘 | 橘色胖貓，摸魚、擠不進捷運 | **要新生** | 通勤 |

順帶一個可愛的接點：現有手印有貓掌與狗掌，卡上本來就會寫「由 🐱／🐶 代為簽收」，之後可以改成「胖橘代為簽收」「旺財代為簽收」。

## 怎麼分批

| 批次 | 內容 | 張數 | 沒有它會怎樣 |
|---|---|---|---|
| **A 必要** | 發薪婆婆表情 sheet、旺財表情 sheet、胖橘表情 sheet | 3 | 沒有它，第三位以後的神明沒有圖，木魚頁無法顯示 |
| **B 加分** | 旺財與胖橘的動作圖，各 4 張 | 8 | 沒有就只有表情圖，揭曉頁少了變化 |

**一致性技巧**：每個 prompt 都請附上參考圖。
- 發薪婆婆：附 `public/art/deity-0.webp`（績效伯伯），要求「同一位畫家、同樣的線條與上色」。
- 旺財、胖橘：先附 `deity-0.webp` 對齊風格，生出表情 sheet 後，**再把 sheet 裡 60% 那格裁出來當角色參考圖**，生動作圖時一起附上。

## 共同風格（每個 prompt 開頭貼上）

```
Flat vector illustration with subtle paper-cut texture, Taiwanese temple folk-art mixed with office-worker humor. Palette: vermilion red #C0392B, antique gold #D4A64A, deep ink #1B1410, warm paper #F3E6CC. Bold clean shapes, slightly rounded corners, friendly and a little silly. Thick dark outline cartoon style with chibi proportions, matching the attached reference image. No text. No drop shadow outside the object. Object centered with generous margin.
```

**背景**：真正透明背景的 PNG，不要棋盤格。做不到就改純白 #FFFFFF 平塗並告訴我，我會去背。

---

## A1 發薪婆婆表情 sheet

- 檔名 `granny-sheet.png`，2048×512（1×4，每格 512×512），透明底。
- 四格是木魚進度的 0%、30%、60%、90%，**同一人、同一姿勢，只有臉與光環變**。
- 附參考圖：`deity-0.webp`。

```
[貼共同風格]
A cute chibi Taiwanese temple deity named "Payday Granny": kind round face with rosy cheeks, white hair in a neat bun with a gold hairpin, round golden halo behind the head, traditional red-and-gold robe, a blank white office ID badge on a lanyard around the neck, holding a plump blank red envelope in one hand and a small gold ingot in the other. Bust-up, front view.
Make a 1x4 sheet, 2048x512, TRANSPARENT background, four 512x512 cells, SAME character and SAME pose in all four, only the face, envelope and halo change:
1) 0%: deadpan half-lidded eyes, flat mouth, holding the red envelope tightly against her chest, dull halo.
2) 30%: one eyebrow lifts, a tiny smile starting, envelope loosened a little, halo slightly brighter.
3) 60%: warm smile, envelope held out toward the viewer, a few gold sparkles.
4) 90%: big joyful laugh with eyes closed, halo blazing, gold coins and sparkles around her.
```

**驗收**：四格明顯是同一人；和績效伯伯放一起像同一位畫家；識別證空白（不要有字）。

## A2 旺財表情 sheet

- 檔名 `wangcai-sheet.png`，2048×512（1×4），透明底。附參考圖：`deity-0.webp`。

```
[貼共同風格]
A cute chibi Shiba Inu named "Wangcai", dressed like a temple guardian-deity: cream-and-red-sand coat with white cheeks and chest, two small tan dots above the eyes, a red-and-gold collar with a small gold bell, a small golden halo floating above the head, a blank white office ID badge on a lanyard around the neck. Bust-up, front view, ears upright.
Make a 1x4 sheet, 2048x512, TRANSPARENT background, four 512x512 cells, SAME character and SAME pose in all four, only the face and halo change:
1) 0%: deadpan half-lidded eyes, flat mouth, ears slightly flat, dull halo.
2) 30%: one tan-dot eyebrow lifts, ears perk up, a tiny smile starting, halo slightly brighter.
3) 60%: warm closed-mouth smile, bright eyes, halo brighter.
4) 90%: big open-mouth laugh with tongue out, eyes squeezed shut with joy, halo blazing with sparkles.
```

## A3 胖橘表情 sheet

- 檔名 `pangju-sheet.png`，2048×512（1×4），透明底。附參考圖：`deity-0.webp`。

```
[貼共同風格]
A cute chibi chubby orange tabby cat named "Pangju", dressed like a temple guardian-deity: round pumpkin-shaped face with big round cheeks, orange tabby stripes on the forehead, white chest and muzzle, a red-and-gold collar with a small gold bell, a small golden halo floating above the head, a blank white office ID badge on a lanyard around the neck. Bust-up, front view.
Make a 1x4 sheet, 2048x512, TRANSPARENT background, four 512x512 cells, SAME character and SAME pose in all four, only the face and halo change:
1) 0%: deadpan half-lidded eyes, flat mouth, lazy, dull halo.
2) 30%: one eye opens wider, whiskers lift, a tiny smile starting, halo slightly brighter.
3) 60%: smug closed-eye smile, cheeks puffed, halo brighter.
4) 90%: big open-mouth laugh, eyes squeezed shut, halo blazing with sparkles.
```

**A2、A3 驗收**：旺財和胖橘放在一起，體型比例、線條粗細、光環大小一致；識別證空白；貓不能畫成瘦貓。

---

## B 動作圖（加分，各 1024×1024，透明底，單張出圖）

通用規則：每張都附「角色參考圖」（該角色的 60% 那格）加 `deity-0.webp`。**畫面裡只有該角色與必要道具，不要其他人物。** 保持光環、項圈、識別證。

### 旺財（4 張）

| 檔名 | 情境 | 用在哪 |
|---|---|---|
| `wangcai-typing.png` | 戴黑框眼鏡打電腦（擬人坐姿） | 工程師凶籤 |
| `wangcai-mrt.png` | 擠捷運，被兩側擠扁 | 通勤、凶籤 |
| `wangcai-payday.png` | 不戴眼鏡，尾巴搖，舉起薪資袋 | 吉籤 |
| `wangcai-overtime.png` | 深夜趴在桌上、舌頭吐出來 | 下下籤 |

```
[貼共同風格]
Same character as the attached reference ("Wangcai" the chibi Shiba Inu with golden halo, bell collar and blank ID badge). 1024x1024, TRANSPARENT background, full body, one character only.
Pose: <貼下面其中一段>
```

- **typing**：sits upright at a tiny desk, typing on a laptop with both paws, wearing thick black round-rim glasses, dark circles under the eyes, an iced coffee cup beside the laptop, determined but exhausted face. Only the desk and laptop, no room background.
- **mrt**：standing, one paw gripping a hanging subway hand strap above, a backpack worn on the front, body squeezed flat from both sides by two cropped vertical edges of the frame (suggesting a packed train, with no other people shown), puffed cheeks, a single sweat drop.
- **payday**：no glasses, tail wagging mid-air, both paws holding up a plump blank red salary envelope overhead, sparkles around, big happy open mouth.
- **overtime**：slumped over a desk at night, tongue out, a lamp glowing, a tall stack of papers, eyes spiraling, ID badge hanging over the edge of the desk.

### 胖橘（4 張）

| 檔名 | 情境 | 用在哪 |
|---|---|---|
| `pangju-yarn.png` | 玩毛線球，被線纏成一團 | 小凶、搞笑 |
| `pangju-mrt.png` | 擠捷運，像貓餅被壓扁在門邊 | 通勤、凶籤 |
| `pangju-glasses.png` | 戴圓框小眼鏡看報表 | 辦公室、吉 |
| `pangju-keyboard.png` | 睡在鍵盤上摸魚 | 小吉、大吉 |

```
[貼共同風格]
Same character as the attached reference ("Pangju" the chubby orange tabby cat with golden halo, bell collar and blank ID badge). 1024x1024, TRANSPARENT background, full body, one character only.
Pose: <貼下面其中一段>
```

- **yarn**：no glasses, sitting on the floor batting a big red yarn ball, the yarn wrapped around its body and tail in a hopeless tangle, mischievous grin.
- **mrt**：flattened like a loaf pressed against a cropped vertical edge of the frame (suggesting a train door), one paw reaching for a hanging hand strap above, cheeks squished, expression of quiet resignation. No other people.
- **glasses**：sitting upright wearing tiny round glasses, a pencil behind one ear, holding up a printed spreadsheet (no readable text, just blank grid lines) with a very serious face.
- **keyboard**：lying belly-down on top of a computer keyboard, eyes closed with one eye slightly open, tail hanging off the side, ID badge draped over the keys.

**B 驗收**：縮到 1/4 仍認得是誰、在做什麼；同一角色在 4 張裡長得一樣；凶籤用的要「慘得好笑」，不要陰森；全部透明底、邊緣乾淨。

## 收到之後我會做

1. 檢查尺寸、透明度、檔案大小（單張 ≤ 300KB，必要時轉 webp）。
2. 跑 `scripts/process-art.py` 輸出到 `public/art/`。
3. 沒收到之前，木魚頁用現有神像暫代，不會壞。
