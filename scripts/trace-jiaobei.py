"""從筊杯貼圖的透明度描出輪廓，輸出成 src/data/jiaobei-shape.ts。
3D 擲筊用這個輪廓擠出厚度，貼圖才會剛好對齊。換了筊杯圖就重跑一次：
    python -X utf8 scripts/trace-jiaobei.py
只用 Pillow（這台沒有 numpy）。
"""
from PIL import Image

SRC = 'public/art/jiaobei-flat.webp'
OUT = 'src/data/jiaobei-shape.ts'
EPS = 0.7  # 簡化輪廓的容許誤差（像素）

im = Image.open(SRC).convert('RGBA')
W, H = im.size
alpha = im.getchannel('A').load()


def inside(x, y):
    return 0 <= x < W and 0 <= y < H and alpha[x, y] >= 128


# Moore 鄰域描邊。8 個鄰居依順時針（影像座標，y 向下）
DIRS = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]

start = next((x, y) for y in range(H) for x in range(W) if inside(x, y))
contour = [start]
cur = start
back = 0  # 從「西邊」開始找（掃描時西邊一定是外面）
guard = W * H * 4
while guard:
    guard -= 1
    for k in range(8):
        d = (back + k) % 8
        nx, ny = cur[0] + DIRS[d][0], cur[1] + DIRS[d][1]
        if inside(nx, ny):
            # 新的 back = 剛才查過的最後一個外面格子，相對新位置的方向
            prev = (back + k - 1) % 8
            px_, py_ = cur[0] + DIRS[prev][0], cur[1] + DIRS[prev][1]
            cur = (nx, ny)
            back = DIRS.index((px_ - nx, py_ - ny)) if (px_ - nx, py_ - ny) in DIRS else (d + 4) % 8
            break
    else:
        break  # 孤立點
    if cur == start:
        break
    contour.append(cur)
assert len(contour) > 100, f'輪廓太短：{len(contour)}'


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-9
    idx, dmax = 0, 0.0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        return rdp(pts[: idx + 1], eps)[:-1] + rdp(pts[idx:], eps)
    return [pts[0], pts[-1]]


# 封閉曲線：從最遠的兩點切開再各自簡化
n = len(contour)
far = max(range(n), key=lambda i: (contour[i][0] - contour[0][0]) ** 2 + (contour[i][1] - contour[0][1]) ** 2)
a = rdp(contour[: far + 1], EPS)
b = rdp(contour[far:] + [contour[0]], EPS)
poly = a[:-1] + b[:-1]

# 像素中心 → 往外推半格，再轉成「高度 = 1、y 向上」的座標
cx = sum(p[0] for p in contour) / n
cy = sum(p[1] for p in contour) / n


def push(p):
    vx, vy = p[0] - cx, p[1] - cy
    # 往外推 0.5px 的近似：沿著離重心的方向
    m = (vx * vx + vy * vy) ** 0.5 or 1.0
    return (p[0] + 0.5 * vx / m, p[1] + 0.5 * vy / m)


pts = [push(p) for p in poly]
aspect = W / H
out_pts = [(round(x / H, 4), round(1 - y / H, 4)) for x, y in pts]

body = ',\n  '.join(f'[{x}, {y}]' for x, y in out_pts)
open(OUT, 'w', encoding='utf-8').write(
    f"""// 由 scripts/trace-jiaobei.py 從 {SRC} 的透明度描出來的輪廓（不要手改，換了圖就重跑）。
// 座標單位：筊杯高度 = 1，x 向右、y 向上；x 範圍 0～JIAOBEI_ASPECT。
// 3D 擲筊用它擠出厚度，並用同一組座標算貼圖的 UV，所以貼圖會剛好對齊。
export const JIAOBEI_ASPECT = {round(aspect, 4)};
export const JIAOBEI_OUTLINE: readonly (readonly [number, number])[] = [
  {body},
];
"""
)
print(f'原始輪廓 {len(contour)} 點 → 簡化 {len(out_pts)} 點，寬高比 {aspect:.4f}，輸出 {OUT}')
