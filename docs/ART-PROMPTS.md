# 美術素材清單與 Codex prompt（P0 共 13 張，上線必要）

> 給使用者轉交 Codex (Image 2.6)。成品放進 `ontime-lucky-day/public/art/`，檔名照下表。
> 沒收到之前，程式會用 CSS／SVG 暫代，所以**可以分批給、不用一次全好**。
> 建議順序：①手印 → ②神明 → ③籤筒＋籤枝 → ④木魚＋槌 → ⑤筊杯 → ⑥籤紙底 → ⑦首頁背景。

## 美術驗收標準（2026-11-20 訂，標準要高：要讓社群覺得好看、有特色、有共鳴）

收到的每一張圖都要過這 6 關，**任何一關沒過就退回重生**，不要為了趕上線放行：

1. **一眼認得**：縮到 1/4 大小仍能說出「這是什麼」。籤筒要像籤筒、木魚要像木魚。
2. **一套的**：放在同一個畫面上像同一位畫家畫的。線條粗細（有／無外框）、上色方式（平塗／有質感）、光影、飽和度要接近。混風格時，把偏離的那一張重生。
3. **有梗**：每個元素至少藏一個「上班族」的小細節（識別證、便利貼、打卡鐘、KPI 小紙條）。沒梗的圖只是廟宇素材，不會被轉貼。
4. **適合被截圖**：高對比、主體清楚、邊緣乾淨（無白邊、無彩邊、無殘留雜點）。
5. **字要對**：圖中若有中文，逐字檢查。錯一個字就退回，或改用無文字版本由程式疊字。
6. **情緒對**：吉籤相關要喜氣、好笑；凶籤相關要「慘得好笑」，不要陰森或驚悚。

**目前這批（2026-11-20）的判定**：神像（四個表情一致、識別證與打卡單是亮點）、籤筒（「籤」字正確、有粉紅便利貼）、首頁廟門（打卡鐘當香爐、貓）、兩張籤紙底圖（凶籤版的雨雲很有梗）都達標。**留意**：神像、木槌、筊杯是「有外框的卡通風」，籤筒、木魚、首頁是「有紙質紋理的繪本風」，兩種在同一個畫面上目前看起來還算協調，但不算完全統一。若之後想再提高，優先重生神像與筊杯成繪本質感，或反過來把籤筒與木魚重生成有外框卡通風。**不阻擋上線**。

## 共同風格（**每一個 prompt 的開頭都要貼上**）

```
Flat vector illustration with subtle paper-cut texture, Taiwanese temple folk-art mixed with office-worker humor. Palette: vermilion red #C0392B, antique gold #D4A64A, deep ink #1B1410, warm paper #F3E6CC. Bold clean shapes, slightly rounded corners, friendly and a little silly. No text unless specified. No drop shadow outside the object. Object centered with generous margin.
```

## 背景規則（先看這個，會影響我怎麼處理）

- **彩色插圖**（神明、籤筒、木魚、筊杯）：請輸出**真正透明背景的 PNG**。若做不到透明，改成「純白 #FFFFFF 平塗背景」並告訴我，我會去背。
- **墨印類**（手印）：一律**純白底、深紅墨色**，不要透明。我會用「正片疊底」把白色吃掉，墨跡邊緣會更自然。

---

## ① 手印（4 張 sheet）

| 檔名 | 尺寸 | 內容 |
|---|---|---|
| `stamp-finger.png` | 1024×1024 | 2×2 共 4 個指印 |
| `stamp-palm.png` | 1024×512 | 1×2 共 2 個掌印 |
| `stamp-cat.png` | 1536×512 | 1×3 共 3 個貓掌 |
| `stamp-dog.png` | 1536×512 | 1×3 共 3 個狗掌 |

**共同規則**：墨色 #B3261E（深朱紅）、純白 #FFFFFF 底、**每格互相不碰、與邊緣留 12% 以上空白**、墨量與角度每個都不同、不要陰影、不要紙紋。

```
[貼共同風格，但本項改為：no colors other than one ink color]
A 2x2 contact sheet, 1024x1024, of FOUR different fingerprint stamps (a thumb pressed in red seal ink on paper), each in its own 512x512 cell. Ink color deep vermilion #B3261E on PURE WHITE #FFFFFF background, no paper texture, no gradient, no shadow. Authentic inked-stamp feel: uneven ink density, slightly broken edges, visible ridge lines, tiny ink splatter. Each print differs in size, rotation (-25 to +25 degrees) and amount of ink. Generous white gap between cells, nothing touches the cell edges.
```

```
Same style and ink as above. A 1x2 sheet, 1024x512, of TWO different open-hand palm prints in vermilion seal ink on pure white. One slightly smudged, one crisp. Visible palm lines. Nothing touches the edges.
```

```
Same style and ink as above. A 1x3 sheet, 1536x512, of THREE different CAT paw prints in vermilion seal ink on pure white. Each is one big heart-shaped pad plus four small toe beans. Different sizes and angles; one is slightly smudged; cute and a little silly. Nothing touches the edges.
```

```
Same style and ink as above. A 1x3 sheet, 1536x512, of THREE different DOG paw prints in vermilion seal ink on pure white. Each is one wide pad plus four toe pads, with tiny claw dots on two of them. Different sizes and angles; one very muddy. Nothing touches the edges.
```

**驗收**：每格內的手印完整、邊緣沒被切到；墨色對得上；格與格之間看得出空白（我要用腳本切）。

---

## ② 神明「準時下班神」（1 張 sheet，4 個表情）

- 檔名 `deity-sheet.png`，2048×512（1×4，每格 512×512），**透明背景**。
- 4 格由左到右是木魚進度的四個階段：**0% 冷淡 → 30% 鬆動 → 60% 微笑 → 90% 大笑發光**。同時也用在抽到凶籤時（冷淡）與吉籤時（大笑）。

```
[貼共同風格]
A cute chibi Taiwanese temple deity named "On-time Clock-out God": round face, long white mustache, round golden halo behind the head, wearing a traditional red-and-gold robe, with a blank white office ID badge on a lanyard around the neck, holding a tiny punch-card in one hand. Bust-up, front view.
Make a 1x4 sheet, 2048x512, TRANSPARENT background, four 512x512 cells, SAME character and SAME pose in all four, only the face and halo change:
1) 0%: deadpan, half-lidded unimpressed eyes, flat mouth, dull halo.
2) 30%: one eyebrow lifts, a tiny smile starting, halo slightly brighter.
3) 60%: warm closed-eye smile, rosy cheeks, halo bright.
4) 90%: laughing with eyes closed, sparkles and radiating golden halo.
Nothing touches the cell edges.
```

**驗收**：四格是同一個角色、位置一致；背景透明（或純白）；識別證是空白的（不要有字）。

---

## ③ 籤筒與籤枝（2 張）

- `fortune-cylinder.png`，1024×1024，透明。
- `fortune-stick.png`，160×900（直立），透明。

```
[貼共同風格]
Front view of a red lacquered Taiwanese fortune-stick cylinder (籤筒): round body, gold bands top and bottom, a gold circle on the front containing the single Chinese character「籤」in bold brush calligraphy. About fifteen bamboo sticks poke out of the top at different heights, each with a vermilion-red tip. One stick has a tiny blank pink sticky note on it (office humor). 1024x1024, TRANSPARENT background.
```

```
[貼共同風格]
A single bamboo fortune stick, vertical, 160x900, TRANSPARENT background: pale bamboo body with fine grain, a rounded vermilion-red tip at the top, a tiny blank gold tag tied near the top. No text.
```

**驗收**：「籤」字清楚正確；籤枝尖端朝上；籤枝不要和筒子連在一起（兩張分開）。

---

## ④ 木魚與木槌（2 張）

- `woodfish.png`，1024×1024，透明。
- `mallet.png`，1024×256（水平放，槌頭在右），透明。

```
[貼共同風格]
A Chinese temple wooden fish (木魚) percussion block: round, glossy red-brown lacquer, carved fish-scale pattern and a slit mouth, resting on a small round red cushion. Three-quarter front view, chunky and cute. 1024x1024, TRANSPARENT background. It should look satisfying to tap.
```

```
[貼共同風格]
A wooden mallet for a temple wooden fish, horizontal, handle on the left, round padded red head on the right, a red cord with a small blank ID-badge tag tied near the handle (office humor). 1024x256, TRANSPARENT background.
```

---

## ⑤ 筊杯（1 張 sheet）

- `jiaobei-sheet.png`，1024×512（1×2），透明。
- 左：**平面朝上**；右：**圓面（凸面）朝上**。我會自己組合出聖筊、笑筊、陰筊。

```
[貼共同風格]
Top view of ONE red lacquered jiaobei (擲筊 moon block), a crescent / half-moon shape about the size of a kidney bean, shown twice in a 1x2 sheet, 1024x512, TRANSPARENT background, two 512x512 cells, SAME object in both:
Left cell: the FLAT side facing up, flat red with subtle wood grain, no highlight.
Right cell: the ROUND (convex) side facing up, glossy with a bright highlight and a gold edge line.
Both oriented with the curve opening to the right, nothing touches the cell edges.
```

**驗收**：左右是同一個形狀，只有朝向不同；兩邊看得出差異（平 vs 凸起有高光）。

---

## ⑥ 籤紙底圖（2 張，1080×1920 直式）

- `card-good.png`（吉側）、`card-bad.png`（凶側）。**不含任何文字**，文字由程式疊上去。
- 版面要求：中間約 70% 區域留空、低對比，因為要放大字；上方中央留一個小圓形空位（要蓋印章）。

```
[貼共同風格]
Portrait 1080x1920 background of a Taiwanese temple fortune slip, NO TEXT. Warm paper #F3E6CC with subtle fiber texture, a double border in vermilion and antique gold with lotus-and-cloud corner ornaments, a small EMPTY circle near the top center (for a seal), and a faint temple-roof silhouette at the very bottom. The central 70% of the card is mostly empty and low-contrast so large text can sit on it. Festive, lucky mood.
```

```
Same layout and size as the previous one, but the UNLUCKY version: paper slightly darker and aged, border in deep ink-black and dull gold, faint hairline cracks and tiny rain-cloud ornaments in the corners, a subtle grey-violet tint at the edges. Still elegant and readable, a bit gloomy but funny, NOT scary. NO TEXT. Central 70% mostly empty and low-contrast.
```

**驗收**：兩張版面一致（我用同一套座標疊字）；中間真的是空的；沒有任何文字或亂碼。

---

## ⑦ 首頁背景（1 張）

- `hero-gate.png`，1080×1920 直式。

```
[貼共同風格]
Portrait 1080x1920 hero background. A Taiwanese temple gate at dusk fills the upper 55%: red doors, tiled roof, two glowing red lanterns. Office humor: instead of an incense burner, a vintage punch-clock (打卡鐘) with incense sticks stuck in it, in front of the gate; a few blank yellow sticky notes tucked into the door frames; a small cat sitting on the stone steps. The lower 45% is calm dark ink-red ground and a stone path, almost EMPTY (UI will sit here). Low-key, dark and warm so white text is readable. NO TEXT anywhere.
```

---

## 加分（P1，不卡上線）：連結預覽圖與圖示

這兩張是**整個遊戲被看到最多次的圖**：貼連結時的預覽圖（`og.png`）、手機主畫面與瀏覽器分頁的圖示（`icon.png`）。品質標準要比上面的素材更高，請多生成幾張挑最好的。

**⚠ 這兩張必須含文字。** 圖像模型寫中文常出錯（缺筆畫、亂碼）。請**逐字檢查「準時下班宮」五個字是否正確**；若寫錯，改用「不含文字」版本，由我在程式裡疊字（兩個版本都請各出一張，我挑能用的）。

| 檔名 | 尺寸 | 用途 |
|---|---|---|
| `og.png` | 1200×630 | 連結預覽圖（Threads、LINE、FB 貼連結時顯示） |
| `og-notext.png` | 1200×630 | 同上但**完全不含文字**的備援版 |
| `icon.png` | 1024×1024 | 手機主畫面圖示與 favicon 來源（實際會縮到 180、64、32px） |

### og.png（1200×630，橫式）

```
[貼共同風格]
A wide 1200x630 social-share banner for a funny Taiwanese office-worker fortune game called "準時下班宮" (On-time Clock-out Temple). Composition: on the LEFT 55%, a big bold title in traditional Chinese brush-serif calligraphy "準時下班宮" in warm cream #F3E6CC with a thick vermilion #8E2A20 offset shadow, a smaller line under it "報上名來，神明替你看看今天能不能準時下班" in cream, and a small gold seal-style mark. On the RIGHT 45%, the cute chibi bearded temple deity wearing a red-and-gold robe with a blank white office ID badge, laughing happily with a glowing golden halo, holding up a fortune stick; behind him a vintage punch-clock (打卡鐘) with incense sticks stuck in it, two glowing red lanterns, and a small calico cat. Dark warm background (deep ink-red gradient #2A0F0B to #1B1410) with subtle gold cloud patterns. Safe margins of 60px on all sides so nothing is cropped when platforms crop to 1.91:1. High contrast, the title must be readable at thumbnail size (300px wide). The Chinese text must be written EXACTLY as: 準時下班宮 (five characters: 準, 時, 下, 班, 宮). Do not invent any other text.
```

```
Same composition and style as above but with ABSOLUTELY NO TEXT anywhere (no letters, no Chinese characters, no numbers, no watermark). Leave the left 55% as a calm dark area with only subtle cloud patterns, so a title can be added later.
```

**驗收**：五個字完全正確；縮到 300px 寬仍讀得到標題；神像是同一個角色（四方白鬍、紅金帽、空白識別證）；邊緣 60px 內沒有重要元素。

### icon.png（1024×1024，方形）

```
[貼共同風格]
An app icon, 1024x1024, centered composition with generous 15% safe margin. A vintage round punch-clock (打卡鐘) face in cream #F3E6CC with a thick gold #D4A64A rim, clock hands pointing exactly to 6:00 (it is clock-out time), a tiny red incense-stick pair rising from the top of the clock like a temple censer, on a solid vermilion red #C0392B rounded-square background (full-bleed, the platform will round the corners itself). Bold simple shapes that stay recognizable at 32x32 pixels. NO TEXT, no letters, no Chinese characters. No gradients on the outline, no photographic detail, no tiny decorations that disappear when small.
```

**驗收**：縮到 32×32 仍然認得出「鐘＋紅底」；沒有文字；指針是 6:00；背景是滿版紅色（我會自己裁圓角）。

### 收到後我會做的事

- `og.png`：檢查中文字是否正確；若正確就用，否則用 `og-notext.png` 加字。
- `icon.png`：產生 180、192、512、64、32 的尺寸，並更新 `index.html` 的 favicon 與主畫面圖示設定。

## 收到之後我會做的事

1. 檢查尺寸、是否透明、檔案大小（單張 ≤ 300KB，必要時壓縮成 webp）。
2. 切 sheet、處理墨印的正片疊底、去背（若是白底）。
3. 缺任何一張，程式都會用暫代圖，**不會壞掉**。
