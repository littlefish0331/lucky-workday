# 美術 prompt V2：OG 預覽圖、廟宇式長籤筒、筊杯（2026-11-22）

> 給使用者轉交 Codex (Image 2.6)。成品放進 `ontime-lucky-day/art-src/`（原圖，不進 git），我再處理成 `public/art/` 的 webp。
> 起因是回饋簡報：籤筒太可愛、筊杯正面有黃邊、改名後 OG 圖要換字。
> 驗收仍用 `docs/ART-PROMPTS.md` 開頭的 **6 關**，這份文件每張圖另有針對性的驗收。

## 總覽（可分批給，建議照這個順序）

| # | 素材 | 優先 | 請 Codex 出的檔名（放 `art-src/`） | 尺寸 | 最終去向 |
|---|---|---|---|---|---|
| ① | 廟宇式長籤筒 | **必要** | `fortune-cylinder-v2.png` | 1024×1536 直式，透明底 | `public/art/cylinder.webp` |
| ② | 筊杯（平面＋圓面） | **必要** | `jiaobei-v2-sheet.png` | 1024×512（1×2），透明底 | `public/art/jiaobei-flat.webp`、`jiaobei-round.webp` |
| ③ | OG 預覽圖 | **必要** | `og-v2-notext.png`（無字版，主力）；`og-v2.png`（含字版，抽獎用） | 1200×630（1.91:1） | 後製加字 → `public/og.jpg` |
| ④ | 單支籤（跳出來那支） | 加分，建議 | `fortune-stick-v2.png` | 1024×1536 直式，透明底 | `public/art/stick.webp` |

檔名都加 `-v2`，不會蓋掉舊原圖。舊圖留著對照。

## 先看我查到的三件事

### A. 筊杯「黃邊」的原因（已量測確認）

舊 `jiaobei-sheet.png` 的圓面（右格）在深色外框內側有一圈**金色細線**，平面（左格）沒有。這是當初 prompt 寫了「a gold edge line」造成的，不是去背殘留。我用腳本量「物件最外緣 6px 環內的黃／橘像素比例」：

| 格 | 黃／橘像素比例 |
|---|---|
| 左格（平面） | **0.0%** |
| 右格（圓面） | **27.4%** |

所以兩面不一致、圓面在深色底上看起來像一圈黃邊。**新版兩面都不准有任何金線、描邊、光暈。**
另外，舊籤筒與神像的邊緣有去背殘留的橘黃小點（放在黑底上看得到），這是另一個黃邊來源，所以驗收要同時看「深色底」與「淺色底」。

### B. 現有籤筒為什麼「太可愛」（已量測）

- 筒身寬高比約 **1:1.3**（矮胖罐子），含籤頭整體約 1:1.96。
- 籤枝又粗又短（寬高約 1:7），像冰棒棍。
- 正面貼一顆金色圓章寫「籤」，像貼紙，不像廟裡的東西。
- 粉紅便利貼是亮點，但配上矮胖罐子，整體偏玩具。

真實廟宇的籤筒是**細長的木筒**，筒身高約寬的 2 倍以上，籤枝細長成一束。

### C. `og-notext.png` 是什麼

1200×630 橫幅。深暗紅背景，左半邊是空的，只有幾朵金色線條祥雲；右半邊（約 x 690–1075）是**笑到瞇眼的白鬍子老神明（績效伯伯）**：紅金官帽加金色光環、識別證（空白）、舉著一支紅頭籤，身後兩盞紅燈籠、一台打卡鐘（插三炷香、冒煙），腳邊一隻三花貓。舊 `og.png` 就是在這張上疊字。
**要留意**：遊戲裡的貓已經定案是「胖橘」，OG 目前是三花貓。下面給了可選的換貓寫法。

## 共同規則

### 風格鎖（物件類：籤筒、單支籤）

現有的籤筒、木魚、首頁屬於「有紙質紋理、無外框的繪本風」，神像屬於「有外框的卡通風」。這次籤筒要往**木魚**那一側靠（光澤漆面、金色浮雕、無外框），**不要**往神像的粗外框卡通走。

```
Refined Taiwanese folk-art illustration with a subtle paper-grain texture, painted lacquer look with soft shading and a gentle gloss, NO outlines and no thick black strokes. Palette: vermilion red #C0392B (deeper #8E2A20 for shadow areas), antique gold #D4A64A, deep ink #1B1410, warm paper #F3E6CC. Grounded and dignified like a real temple object rather than cute or toy-like. No text unless specified. No drop shadow outside the object, no ground shadow. Object centered with generous margin.
```

### 風格鎖（筊杯專用，**去掉金色**）

```
Refined Taiwanese folk-art illustration with a subtle paper-grain texture, painted red lacquered wood with soft shading. Use ONE hue family only: lacquer red (#B23A26 mid-tone, #7E2418 shadow, #D2543F light). No gold, no yellow, no orange anywhere. No outlines. No text. Object centered with generous margin.
```

### 背景規則

- 要**真正的透明底 PNG（真 alpha）**，不要棋盤格圖案。
- 做不到透明就改「純白 #FFFFFF 平塗底」並告訴我，我會去背，並多做一步「邊緣去黃」。
- 不要帶地面陰影、橢圓底影、桌面、牆（程式端會自己加陰影）。

### 參考圖怎麼附（會影響結果，請照做）

| 圖 | 附什麼 | 不要附什麼 |
|---|---|---|
| 籤筒 | `woodfish.png`（取漆面光澤與金色浮雕的感覺） | **不要附舊籤筒**（會把矮胖與金圓章帶回來） |
| 筊杯 | **第一輪不附任何圖**（舊筊杯與木魚都有金色，會被帶進來） | 舊 `jiaobei-sheet.png` |
| OG | `og-notext.png`（鎖定構圖與角色） | 舊 `og.png`（有舊名稱，會被抄回去） |

---

## ① 廟宇式長籤筒

### 用途與規格

- 用在手機直立畫面的「搖籤」步驟：置中、**左右晃動**（程式以筒底為軸心旋轉），籤頭跳出一支。
- 檔名 `fortune-cylinder-v2.png`，**1024×1536 直式**，透明底，單一物件，不要場景。
- 若 Codex 只能出 1024×1024，請改出 1024×1024 並把物件縮到畫面高度 90%，我會自己裁。

### 比例與構圖（給 Codex 的硬性數字）

| 項目 | 目標 | 可接受範圍 |
|---|---|---|
| 筒身（不含籤）寬：高 | **1 : 2.1**（約 510 × 1050 px） | 1 : 1.9 ～ 1 : 2.3 |
| 含籤頭整體 寬：高 | 約 1 : 2.6 | 1 : 2.5 ～ 1 : 2.9 |
| 籤頭露出筒口的高度 | 約筒身高的 27%（約 280 px） | 22% ～ 32% |
| 單支籤寬度 | 約筒身寬的 1/10 | 1/12 ～ 1/9 |
| 物件上方留白 | ≥ 7%（≥ 110 px，給籤頭與跳出的籤） | |
| 物件下方留白 | ≥ 5% | |
| 左右留白 | 各 ≥ 22% | |
| 中軸線 | 筒身中心在 x = 50%，左右大致對稱 | |

對照：舊籤筒筒身 1:1.3、整體 1:1.96。新版筒身要明顯更長。
為什麼要左右對稱：程式會以筒底為軸心晃動，若籤束偏向一邊，晃起來會歪。
手機上顯示寬度預計約 150–160 px，所以筒身高約 330 px、整體約 410 px，放得進 390×844 的畫面。

### Prompt A（帶「籤」字，主力）

```
[貼「風格鎖（物件類）」]
Front view of a TALL, SLENDER traditional Taiwanese temple fortune-stick canister (籤筒) of the kind that stands on a temple altar, one single object, vertical, centered, on a 1024x1536 portrait canvas with a TRANSPARENT background.

PROPORTIONS (very important): the canister body is a long straight cylinder, its height about 2.1 times its width (body about 510 px wide and 1050 px tall on the canvas). A slightly flared foot ring of darker brown wood at the bottom and a slightly thicker rounded lip at the top. Eye-level view tilted down only about 8 degrees so the top rim shows as a thin ellipse. Tall and slender, never chubby, never squat, never a toy.

MATERIAL: deep vermilion-red lacquered wood (#9E2F1F to #B83A27) with faint vertical wood grain showing through, a soft gloss highlight running down the left third (same lacquer feel as the attached wooden-fish reference). Two thin antique-gold bands, each only about 3% of the body height, one just below the top lip and one just above the foot ring. In the middle of the body, ONE large Chinese character「籤」painted vertically in hand-brushed antique-gold calligraphy directly on the lacquer, with no circle, no badge, no frame around it. The character must be exactly: 籤 (bamboo radical on top, 韱 underneath, 23 strokes, Traditional form, NOT the simplified 签).

CONTENTS: a tight bundle of about 25 slender flat bamboo fortune sticks standing in the canister, fanned out only slightly, the bundle roughly symmetrical around the center axis, tallest sticks near the middle. The sticks are pale natural bamboo (#D9B97F) with fine grain, each about one tenth of the canister width, with flat rounded-rectangle heads painted vermilion red, heads BLANK (no numbers, no text). Heads rise to slightly different heights; the exposed part above the rim is about 27% of the body height (about 280 px).

ONE tiny office-humor detail only: a small blank pink sticky note stuck near the top of one stick, about two sticks wide. Nothing else.

COMPOSITION: whole object centered on the vertical axis; at least 7% empty space above the tallest stick head, at least 5% below the base, at least 22% empty on each side. Flat bottom edge. No floor, no table, no ground shadow, no background.
```

### Prompt B（無字備援版，由程式或後製疊「籤」字）

把 Prompt A 的 MATERIAL 段裡「In the middle of the body, ONE large Chinese character……」整句換成：

```
In the middle of the lower body, a restrained carved-relief motif of three layered auspicious clouds (祥雲) in antique gold, subtle and low in contrast. NO text, NO letters, NO Chinese characters anywhere on the object.
```

### 負面條件（貼在 prompt 最後）

```
Avoid: a circular gold badge or sticker, cartoon face, thick black outline, short fat jar shape, a lid, a dragon, incense, hands, table, floor, ground shadow, glow, numbers on the sticks, any text other than the single character 籤, watermark.
```

### 驗收清單（除了 6 關，再加這些）

1. **長度**：用小畫家（左下角會顯示像素）量筒身寬與高，高 ÷ 寬落在 1.9～2.3。
2. **一眼認得**：縮到 1/4，仍看得出是「廟裡的長籤筒＋一束籤」，不是花瓶、筆筒或爆米花桶。
3. **不可愛**：沒有圓章、沒有矮胖輪廓；便利貼是唯一的梗，而且小。
4. **「籤」字**（Prompt A）：竹字頭、下面是「韱」，不是「签」或缺筆的怪字。錯了就改用 Prompt B。
5. **對稱**：把圖水平翻轉後，看起來幾乎一樣穩（籤束沒有明顯偏一邊）。
6. **一套的**：和 `woodfish.png` 並排，像同一位畫家（光澤漆面、金色細節、無外框）。
7. **籤頭**：紅色、空白、沒有數字；籤枝是細長扁條，不是冰棒棍。
8. **透明底**：真 alpha，沒有地面陰影；放在深色（#1B1410）與淺色（#F3E6CC）底上，邊緣都沒有白邊或橘黃碎點。

### 失敗時怎麼微調

| 症狀 | 加這一句 |
|---|---|
| 還是矮胖 | `The canister is VERY TALL and SLENDER: its height is more than twice its width. Draw it narrower and longer.` |
| 又出現金色圓章 | `No circle, no badge, no round frame. The character is painted straight onto the red lacquer.` |
| 籤太粗、像冰棒棍 | `The sticks are thin slats, each only one tenth of the canister width, about 30 of them, densely packed.` |
| 籤頭太少、露出不夠 | `About 27% of the canister height is visible as sticks above the rim.` |
| 籤束歪向一邊 | `Perfectly symmetrical bundle, like a gently opened fan, centered on the vertical axis.` |
| 「籤」字寫錯 | 改 Prompt B（無字版），我用字型或手寫體疊字 |
| 物件被裁到邊 | `Leave 8% empty margin on top and bottom and 25% on each side.` |
| 底下有橢圓影子 | `No shadow of any kind under the object. The bottom edge is a clean flat edge on transparent pixels.` |
| 邊緣有橘黃碎點 | 改要求「純白 #FFFFFF 平塗底」，我去背並去黃 |

### 單支籤（跳出來那支）要不要重做？

**建議重做，但排在最後（加分，不卡上線）。**

現有 `fortune-stick.png`：淡竹色、圓頭紅帽、黑繩加金牌，顏色與質感其實和新筒可以搭。問題只有**比例**：它寬高約 **1:8.3**，是舊筒那種粗短籤；新筒的籤細長（約 1:20 以上），兩者並排會變成「筒子寫實、籤是卡通」。
如果不想重做，暫代做法：程式端把舊籤枝橫向縮到約 55% 寬，可以接受，但金牌會變扁。

```
[貼「風格鎖（物件類）」]
A single slender flat bamboo fortune stick, vertical, centered on a 1024x1536 portrait canvas with a TRANSPARENT background. Length about 90% of the canvas height, width about 1/20 of its length (about 70 px wide: slender, not chunky). Pale natural bamboo (#D9B97F) with fine vertical grain lines. A flat rounded-rectangle head at the TOP painted vermilion red (#B83A27), blank, no numbers. Just below the head, a very short thin black cord with a tiny blank antique-gold tag hanging from it (an office-badge gag). Same bamboo color and head shape as the sticks in the canister. No ground shadow, no text, no background.
```

驗收：紅頭在上、竹色與新筒的籤一致、細長（高 ÷ 寬 ≥ 15）、金牌空白。
程式端之後要把它縮到約籤筒高度的 55–60%（我來調 CSS，不用你處理）。

---

## ② 筊杯（平面 flat、圓面 round）

### 用途與規格

- 用在「擲筊」步驟，每個顯示寬度約 92 px，程式會左右鏡射、組合出聖筊、笑筊、陰筊。
- 檔名 `jiaobei-v2-sheet.png`，**1024×512（1×2）**，兩格各 512×512，透明底。**左 = 平面朝上，右 = 圓面（凸面）朝上。** 格式和舊 sheet 相同，我的處理腳本不用改。
- 新增的硬規格：
  - **兩面都沒有黃邊、金邊、描邊、光暈。**
  - 同樣的紅、同樣的木紋、同樣的外形與大小。**只有「平 vs 凸」的光影不同。**
  - 外形與舊版一致：像字母 C 的胖月牙，**開口朝右**，兩端圓鈍，最厚處約全長的 40%。
  - 月牙高度約佔格高 72%，四周留白 ≥ 12%。

### Prompt

```
[貼「風格鎖（筊杯專用）」]
A 1x2 sheet, 1024x512, TRANSPARENT background, two 512x512 cells. It shows the SAME single red wooden jiaobei (擲筊 divination moon block) twice, top-down orthographic view, identical size, identical position and identical outline silhouette in both cells.

SHAPE: a fat crescent, like a halved kidney bean or the letter "C" opening to the right, rounded blunt ends, thickest in the middle (about 40% of its length). The crescent is about 72% of the cell height, centered, with at least 12% empty margin on every side.

MATERIAL (identical in both cells): the same red lacquered wood: the same red, the same fine curved wood-grain lines running along its length in a slightly darker red, the same satin finish.

ONLY these differ:
LEFT cell = the FLAT face up: a flat plane, evenly lit, uniform red with the faint grain, no highlight, no gradient, no sense of bulge.
RIGHT cell = the ROUND (convex) face up: the same red, shaded as a smooth bulging dome: one soft warm-white highlight inside the upper-left area (kept at least 10% of the object's width away from the edge), gradually darker toward the right side and lower part, grain lines bending gently with the curvature.

EDGES (very important): each block simply ends in a clean, crisp edge where the red surface stops. The edge is just the same red as the body (slightly deeper on the dome). The object is surrounded only by fully transparent pixels.
```

### 負面條件（貼在 prompt 最後，只寫一次、寫簡短）

```
Avoid: any outline, stroke or border line of any color; gold, yellow or orange trim; rim light, glow, halo, aura or bloom; drop shadow, contact shadow or any shadow; inner line near the edge; text; background.
```

**為什麼這樣寫**：模型看到「lacquer、temple」就容易自動加金邊。所以正面描述只講「紅色表面在邊緣自然結束」，**不要**在正面描述裡出現 gold、glow、shiny edge、ornate、trim、bevel 這些字；禁止的詞只集中在最後一句負面條件，不要散在各處（反覆提到反而會被畫出來）。

### 驗收清單

1. **兩面都沒有任何黃色或金色外圍**，也沒有深色描邊或光暈。
2. **輪廓一致**：把兩格互相比對，位置、大小、外形一樣（用看圖軟體快速切換兩格最容易看出）。
3. **同紅、同木紋**：兩格紅色色相一致，木紋方向一致。
4. **平 vs 凸一眼分得出**：縮到 1/4，圓面有明顯的高光與暗部，平面是均勻的紅。這點最重要，擲筊結果靠它判讀。
5. **放在深色底與淺色底上都沒有黃色外圍**：我會把圖合成到 #1B1410、#F3E6CC、#FFFFFF 三種底色，輸出預覽給你看（存在 `art-src/_check/`，不進 git）。
6. **透明底、邊緣乾淨**：我會跑附錄的檢查，**外緣 6px 環內的黃／橘像素比例要 < 2%**。基準：舊圓面 27.4%、舊平面 0.0%。
7. 這張**不加上班族梗**（豁免第 3 關）：只有 92 px 寬，加了也看不到，反而干擾判讀平面與凸面。

### 失敗時怎麼微調

| 症狀 | 微調 |
|---|---|
| 圓面還是有金邊／黃邊 | 在最後再加一句：`The edge of the dome is deep red, darker than the body. There is no gold at all in this image.` 仍然有就改走「兩步法」（下面） |
| 兩格大小或形狀不一樣 | 改走兩步法 |
| 左右兩格看不出差別 | `The left block is completely flat and matte with zero highlight. The right block has a strong glossy dome highlight and a clear dark shadow side.` |
| 出現深色描邊 | `Soft shading only. The silhouette is defined by color change from red to transparent, never by a line.` |
| 出現陰影或光暈 | `Pure transparent surroundings. No light effects outside the object.` |
| 質感太平、不像木頭 | 第二輪才附 `woodfish.png`，並加 `Copy ONLY the red lacquer finish of the attached image and ignore all gold decorations in it.` |
| 不是 C 形、像香蕉或葉子 | `A fat C-shaped crescent opening to the right, both ends rounded and blunt, like half of a kidney bean.` |

**兩步法（最穩）**：
1. 先只生**平面**一張（1024×1024，其他條件同上）。
2. 附上這張當參考圖，再生：`Same object, same size, same position, same outline and same red wood-grain as the attached image, but now the ROUND convex side faces up: ...`（接 RIGHT cell 那段與 EDGES、負面條件）。
3. 兩張檔案分開給我（`jiaobei-v2-flat.png`、`jiaobei-v2-round.png`），我自己組成 sheet。

---

## ③ OG 預覽圖（連結預覽，Threads／LINE／FB）

### 用途與規格

- 貼連結時顯示的圖。最終檔 **`public/og.jpg`，1200×630（1.91:1），JPG，品質約 85，≤ 300 KB**（舊檔 87 KB）。
- 要燒進圖的字：
  - 主標：**打工庇佑廟**
  - 英文小標：**Lucky Workday**
  - 標語：**職場很莫名其廟，來拜一下**
- 若 Codex 只能出 1536×1024 等其他比例：請用最接近 1.91:1 的橫幅，我會裁成 1200×630，所以**重要內容都放在畫面高度中間 80% 內**；四邊留 60px 安全距離（平台會裁）。

### 建議流程：先生無字版，字用後製加（強烈建議）

圖像模型最容易出錯的就是繁體中文字。這次要寫的字有 **庇、佑、廟**，加上 11 字標語與英文，**至少有 4 個出錯機會**，錯一個字整張就不能用（6 關第 5 關）。而且名字、標語之後還可能再改，後製加字不用重生圖。

| 路線 | 做法 | 風險 |
|---|---|---|
| **A（推薦，最快）** | 直接用現有 `og-notext.png` 當底，後製加字，不用 Codex | 底圖的雲紋位置要避開字；背景偏暗 |
| **B** | 用下面「無字版 prompt」重生 `og-v2-notext.png`（雲紋移出文字區、背景略亮、可換胖橘），再後製加字 | 要多挑圖 |
| **C（抽獎）** | 用「含字版 prompt」生 6–8 張，挑**每個字都對**的 | 大概率沒有一張全對；全對才可用，否則回到 A／B |

建議：先走 A，把整套 OG 做出來看效果；想升級畫面（貓換胖橘、背景調亮）再做 B；C 有空再試。

### 無字版 prompt（B 路線，附 `og-notext.png` 當構圖參考）

```
[貼 docs/ART-PROMPTS.md 的「共同風格」]
Use the attached image as the exact composition reference: keep the same layout, the same laughing white-bearded chibi temple deity and the same props. A wide 1.91:1 banner, 1200x630, with ABSOLUTELY NO TEXT anywhere (no letters, no Chinese characters, no numbers, no watermark, no writing on the lanterns, and the clock face has only tick marks and hands, hands pointing to 6:00).

RIGHT SIDE (from about 56% to 92% of the width): the cute chibi bearded temple deity in a red-and-gold robe with a red-and-gold official cap and a round glowing golden halo, a blank white office ID badge on a lanyard, laughing happily with eyes closed, one hand holding up a single fortune stick with a red tip and small sparkle lines. Behind and beside him: two plain red lanterns hanging (no characters on them), a vintage punch-clock (打卡鐘) on a small wooden table with three incense sticks and a thin curl of smoke, and a small cat sitting at his feet. [貓：沿用三花貓 / 或改成：a chubby orange tabby cat with a small golden halo and a red-and-gold bell collar]

LEFT SIDE (from 0% to about 56%): a calm, EMPTY dark area reserved for a title. Inside the zone x 5%–58%, y 18%–82% there must be NO ornaments at all. Only a few tiny, low-contrast gold line clouds are allowed, and only near the far top-left corner and the far bottom-left corner.

BACKGROUND: deep warm red-maroon, slightly lighter around the deity as a soft warm glow (#4A1712 near the center to #2A0F0B at the edges), very subtle paper grain. Keep the deity, lanterns and props at least 60 px away from every edge. High contrast, the deity reads clearly at thumbnail size. Keep all important content inside the central 80% of the height.
```

### 含字版 prompt（C 路線，抽獎）

把上面無字版整段貼上，**刪掉第一段裡所有 NO TEXT 的句子**，在最後加：

```
TEXT (the only text allowed, written in the LEFT zone, left-aligned, in this order from top to bottom):
1) Title, very large, one line, 5 Traditional Chinese characters, heavy bold brush-serif style, warm cream #F3E6CC fill with a thick vermilion #8E2A20 offset shadow: 打工庇佑廟
   Character by character: 打 (hand radical + 丁), 工, 庇 (广 radical + 比), 佑 (person radical + 右), 廟 (广 radical + 朝, Traditional, 15 strokes).
   庇 must NOT be 底 or 疵. 佑 must NOT be 估 or 祐. 廟 must NOT be the simplified 庙.
2) Small English line under the title, exactly: Lucky Workday (two words, capital L and capital W, no hyphen, no other words), antique-gold #D4A64A, widely letter-spaced.
3) Tagline under that, smaller, cream: 職場很莫名其廟，來拜一下
   Character by character: 職 場 很 莫 名 其 廟 ，來 拜 一 下 (Traditional Chinese used in Taiwan; 職 and 場 must NOT be the simplified 职 and 场).
Do not write any other text anywhere. Do not add a signature, a watermark, a seal with characters, or writing on the lanterns, clock or ID badge.
```

### 後製加字指引（A、B 路線；1200×630 畫布）

**字型**：**Noto Serif TC**（思源宋體，Google Fonts，SIL OFL 開源授權，可商用）。和網站內文的 `--serif` 同一家族，繁體字形完整，庇、佑、廟都有。標題用 **Black (900)**，其餘用 **Bold (700)**。
另一個選擇：想要更圓潤可愛可試「**粉圓 jf open 粉圓**」（開源、台灣出品），但它偏圓體，和宋體的廟味不同；做不出味道再換。
**工具**：Figma（內建 Google Fonts）、Photopea（免費網頁版）、Canva 皆可。
**不想自己做**：把 `og-v2-notext.png`（或 `og-notext.png`）放進 `art-src/`，把 NotoSerifTC 字型檔放進 `art-src/fonts/`，叫我用 Pillow 合成，位置與顏色照下表。

| 元素 | 字型與大小 | 顏色與效果 | 位置（以 1200×630 畫布為準，±10 px 可調） |
|---|---|---|---|
| 主標「打工庇佑廟」 | Noto Serif TC Black，**112 px**，字距 +2 px | 填色 `#F3E6CC`；朱紅 `#8E2A20` 實心陰影，往右下偏移 (5, 6) px、不模糊；外加 2 px `#1B1410` 外框 | 靠左，**左緣 x = 96**；字框垂直置中於 **y ≈ 245**（寬約 570，右緣約 x = 666，不要碰到神像的衣服與燈籠，約 x ≥ 690 起） |
| 英文「Lucky Workday」 | Noto Serif TC Bold，**40 px**，字距 +0.2em（約 +8 px） | `#D4A64A` | 左緣 x = 100，垂直置中 **y ≈ 338** |
| 標語「職場很莫名其廟，來拜一下」 | Noto Serif TC Bold，**36 px** | `#F3E6CC`；其中「**莫名其廟**」四個字改 `#D4A64A`，把諧音梗點出來（可選） | 左緣 x = 100，垂直置中 **y ≈ 415**（寬約 470） |
| 小印章（可選） | 沿用 `og-notext.png` 左側那種金色祥雲小標，約 56 px | 金色線條 | 標語下方，x = 100、y ≈ 480；不放也行 |

整塊文字約佔 y 185–435，置中於 y ≈ 310，和右邊神像（約 y 105–505）的重心對齊。
**路線 A 的注意**：`og-notext.png` 的雲紋在 (125–250, 145–185)、(420–540, 130–165)、(130–270, 435–475)、(475–570, 450–475)。字塊放在上表位置時，標語底邊約 y = 433，離左下雲紋只剩約 20 px；太擠就整塊上移 10 px，或用背景色把雲紋蓋掉（背景只是暗色漸層，好補）。

**輸出**：sRGB、JPG 品質 82–88、1200×630、≤ 300 KB，存成 **`public/og.jpg`**（覆蓋舊檔）。

### 驗收清單

1. **逐字對**：「打、工、庇、佑、廟」五個字、英文「Lucky Workday」、標語 11 個字加逗號，全部和上面一致，沒有簡體（庙、职、场）。
2. **縮圖可讀**：縮到 300 px 寬，主標仍清楚；標語讀不到可以接受（它是次要資訊），但英文不能糊成一團。
3. **安全距離**：四邊 60 px 內沒有重要元素；用 1.91:1 的最窄裁切框（1200×628）蓋上去也不缺東西。
4. **沒有多餘文字**：沒有亂碼、簽名、浮水印；燈籠、打卡鐘、識別證都沒有字。
5. **同一個角色**：神明和遊戲內的績效伯伯一致（四方白鬍、紅金帽、空白識別證）；若換成胖橘，要和 `pangju-sheet.png` 是同一隻（橘虎斑、圓臉、光環、項圈）。
6. **不陰沉**：背景是暖深紅而不是近黑；神明表情是笑的；整體喜氣。
7. 邊緣乾淨，沒有彩邊或殘留雜點（這張是不透明圖，主要看神像輪廓）。

### 失敗時怎麼微調

| 症狀 | 微調 |
|---|---|
| 字寫錯（庇、佑、廟最常錯） | **不要再重生**，回 A／B 後製加字 |
| 左側不夠空、雲紋或裝飾蓋到文字區 | `The left 56% of the image is completely empty dark background with zero ornaments.` |
| 神明太大、侵入左側 | `The deity group occupies only the right 36% of the width, with 60 px margin from the right edge.` |
| 燈籠、時鐘上出現字 | `The lanterns are plain red with no characters. The clock face has only tick marks and two hands.` |
| 背景還是太暗 | `Background deep warm red-maroon (#4A1712), clearly red rather than black, with a soft warm glow behind the deity.` |
| 多出文字或浮水印 | `Absolutely no text of any kind anywhere in the image.` |
| 貓畫成瘦貓、或不是橘的 | `A chubby round orange tabby cat with a big round face, white chest, a small golden halo and a red-and-gold bell collar.` |
| 輸出比例不對（例如 1:1） | `Wide banner, aspect ratio 1.91:1, landscape orientation.` |

### 上線後的提醒

各平台會依「網址」快取預覽圖。換了 `og.jpg` 之後，Threads、LINE、FB 可能還顯示舊圖。處理方式：用各平台的分享偵錯工具重新抓取，或讓我把 `index.html` 裡的圖片網址加上版本參數（例如 `og.jpg?v=2`）強制換新。這屬於對外動作，部署前我會先問你。

---

## 收到之後我會做的事

1. 檢查尺寸、是否真透明、檔案大小（單張 ≤ 300 KB，必要時轉 webp）。
2. 籤筒、單支籤：更新 `scripts/process-art.py` 的來源檔名，輸出沿用 `cylinder.webp`、`stick.webp`（`art.ts` 不用改路徑）。
3. 籤筒進場後調 `src/styles.css`：`.cyl` 寬度由 210 px 改成約 150–160 px、軸心 `transform-origin` 對到筒底（約 50% 92–94%）、`.cyl-stick` 的彈出位置與大小；跑 `node scripts/e2e-smoke.mjs` 並看 390×844 截圖。
4. 筊杯：`process-art.py` 的 sheet 切法不變。我會輸出深／淺／白三種底色的預覽，給你確認沒有黃邊。
5. OG：加字（若走後製）、輸出 `public/og.jpg`，同步檢查 `index.html` 的 og 標題與描述已改成新名稱與新標語。
6. 缺哪一張，程式都有暫代圖，不會壞。

## 附錄：黃邊檢查腳本（收圖後我會跑）

```python
# python -X utf8 check_edge.py <圖檔> [格數]
# 量「物件最外緣 6px 環」內黃／橘像素的比例。紅漆的色相約 0–12 度，不會被誤算。
import sys
import numpy as np
from PIL import Image, ImageFilter

def ring_yellow_ratio(img, ring_px=6):
    rgba = img.convert("RGBA")
    a = rgba.split()[3].point(lambda v: 255 if v > 8 else 0)
    inner = a.filter(ImageFilter.MinFilter(2 * ring_px + 1))
    ring = (np.array(a) > 0) & ~(np.array(inner) > 0)
    h, s, v = [np.array(c) for c in rgba.convert("RGB").convert("HSV").split()]
    yellow = (h >= 14) & (h <= 46) & (s >= 90) & (v >= 110)   # PIL 色相 0-255，約等於 20-65 度
    n = ring.sum()
    return (yellow & ring).sum() / n * 100 if n else 0.0, int(n)

im = Image.open(sys.argv[1])
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 1
w = im.width // cols
for i in range(cols):
    r, n = ring_yellow_ratio(im.crop((i * w, 0, (i + 1) * w, im.height)))
    print(f"cell {i}: 外緣環內黃/橘像素 {r:.1f}%（環像素 {n}）")
```

基準值（舊 `jiaobei-sheet.png`，格數 2）：左格 0.0%，右格 27.4%。新版兩格都要 < 2%。
