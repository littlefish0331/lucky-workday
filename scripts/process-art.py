#!/usr/bin/env python
"""把 Codex 生成的原圖（art-src/）處理成網頁用素材（public/art/）。
用法（在 ontime-lucky-day/ 底下）：  python -X utf8 scripts/process-art.py
做的事：切 sheet、白底墨印轉透明並統一墨色、清掉去背殘留的孤立小點、裁掉多餘透明邊、縮圖、轉 webp。
原檔不會被改動；缺哪一張就略過那一張並提示。"""
import os
import sys

import numpy as np
from PIL import Image

SRC, OUT = "art-src", "public/art"
INK = (179, 38, 30)  # #B3261E
os.makedirs(OUT, exist_ok=True)


def load(name):
    path = f"{SRC}/{name}"
    if not os.path.exists(path):
        print(f"  略過（找不到）{name}")
        return None
    return Image.open(path).convert("RGBA")


def remove_small_components(alpha, min_area):
    """刪掉面積小於 min_area 的孤立連通元件（8 鄰域）。用 bytearray 讓純 Python 夠快。"""
    h, w = alpha.shape
    flat = bytearray((alpha > 0).astype(np.uint8).tobytes())
    seen = bytearray(h * w)
    removed = 0
    for s in range(h * w):
        if not flat[s] or seen[s]:
            continue
        seen[s] = 1
        stack, comp = [s], [s]
        while stack:
            p = stack.pop()
            y, x = divmod(p, w)
            for yy in (y - 1, y, y + 1):
                if yy < 0 or yy >= h:
                    continue
                base = yy * w
                for xx in (x - 1, x, x + 1):
                    if xx < 0 or xx >= w:
                        continue
                    q = base + xx
                    if flat[q] and not seen[q]:
                        seen[q] = 1
                        stack.append(q)
                        comp.append(q)
        if len(comp) < min_area:
            removed += len(comp)
            for q in comp:
                flat[q] = 0
    keep = np.frombuffer(bytes(flat), dtype=np.uint8).reshape(h, w) > 0
    return keep, removed


def clean(im, thr=24, min_area=60):
    a = np.array(im)
    al = a[..., 3].copy()
    al[al < thr] = 0
    keep, removed = remove_small_components(al, min_area)
    al[~keep] = 0
    a[..., 3] = al
    a[al == 0, :3] = 0
    return Image.fromarray(a, "RGBA"), removed


def bbox(im, thr=8):
    al = np.array(im)[..., 3]
    ys, xs = np.where(al > thr)
    return (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1) if len(xs) else (0, 0, im.width, im.height)


def trim(im, pad=6):
    x0, y0, x1, y1 = bbox(im)
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im, max_side=None, width=None, height=None):
    if width:
        r = width / im.width
    elif height:
        r = height / im.height
    else:
        r = max_side / max(im.size)
    r = min(r, 1.0)
    return im.resize((max(1, round(im.width * r)), max(1, round(im.height * r))), Image.LANCZOS)


def save(im, name, q=90):
    path = f"{OUT}/{name}"
    im.save(path, "WEBP", quality=q, method=6)
    print(f"  {name:22s} {im.width}x{im.height}  {os.path.getsize(path)//1024:4d} KB")


def ink_to_alpha(im):
    """白底墨印 → 透明底、固定墨色。以綠色通道當墨量：墨最深處完全不透明。"""
    rgb = np.array(im.convert("RGB")).astype(float)
    g = rgb[..., 1]
    g_ink = np.percentile(g, 0.5)
    al = np.clip((255 - g) / max(1.0, 255 - g_ink), 0, 1)
    al[al < 0.07] = 0
    out = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    out[..., 0], out[..., 1], out[..., 2] = INK
    out[..., 3] = (al * 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def cells(im, cols, rows):
    cw, ch = im.width // cols, im.height // rows
    return [im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(rows) for c in range(cols)]


print("== 手印（白底墨印 → 透明、統一墨色）==")
for kind, cols, rows in [("finger", 2, 2), ("palm", 2, 1), ("cat", 3, 1), ("dog", 3, 1)]:
    im = load(f"stamp-{kind}.png")
    if im is None:
        continue
    for i, cell in enumerate(cells(im, cols, rows)):
        t = ink_to_alpha(cell)
        t, _ = clean(t, thr=18, min_area=12)
        save(fit(t, max_side=360), f"stamp-{kind}-{i}.webp", 92)

print("== 神像 4 個表情 ==")
im = load("deity-sheet.png")
if im:
    for i, cell in enumerate(cells(im, 4, 1)):
        c, n = clean(cell)
        save(fit(c, max_side=400), f"deity-{i}.webp", 90)

for src, out, kw, tag in [
    ("fortune-cylinder.png", "cylinder.webp", dict(height=620), "籤筒"),
    ("fortune-stick.png", "stick.webp", dict(height=520), "籤枝"),
    ("woodfish.png", "woodfish.webp", dict(width=640), "木魚"),
    ("mallet.png", "mallet.webp", dict(width=720), "木槌"),
]:
    print(f"== {tag} ==")
    im = load(src)
    if im:
        c, n = clean(im)
        print(f"  清掉 {n} 個殘留像素")
        save(fit(trim(c), **kw), out, 90)

print("== 筊杯（平面、圓面）==")
im = load("jiaobei-sheet.png")
if im:
    a, b = cells(im, 2, 1)
    a, _ = clean(a)
    b, _ = clean(b)
    # 兩格用同一個外框裁切，確保兩個筊杯大小對得上
    ba, bb = bbox(a), bbox(b)
    box = (min(ba[0], bb[0]) - 6, min(ba[1], bb[1]) - 6, max(ba[2], bb[2]) + 6, max(ba[3], bb[3]) + 6)
    save(fit(a.crop(box), width=300), "jiaobei-flat.webp", 92)
    save(fit(b.crop(box), width=300), "jiaobei-round.webp", 92)

print("== 籤紙底圖與首頁背景 ==")
for src, out, w in [("card-good.png", "card-good.webp", 1080), ("card-bad.png", "card-bad.webp", 1080), ("hero-gate.png", "hero.webp", 828)]:
    im = load(src)
    if im:
        print(f"  原圖尺寸 {im.size}")
        save(fit(im.convert("RGB"), width=w), out, 86)

total = sum(os.path.getsize(f"{OUT}/{f}") for f in os.listdir(OUT) if f.endswith(".webp"))
print(f"\n共 {len([f for f in os.listdir(OUT) if f.endswith('.webp')])} 個檔案，{total//1024} KB")
