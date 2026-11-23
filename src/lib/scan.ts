// 蓋指印／蓋印章時的「線條一段一段亮起」動畫用的資料。純函式、不碰瀏覽器 API，所以可以在 vitest 裡測。
// 做法像手機設定指紋：一圈一圈的紋路從中心往外，一條一條被描亮。畫面只負責把這裡算出的比例畫出來。

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ───────── 指紋：同心橢圓弧 ───────── */

export const FP_W = 100;
export const FP_H = 130;
export const FP_RINGS = 12;

export interface Ring {
  /** SVG path（用 pathLength=1 搭配 stroke-dashoffset 就能一段一段描出來） */
  d: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** 指紋的紋路：由內往外 n 圈，每圈在不同位置留一個缺口（像弓、箕、斗），固定算法、每次都一樣 */
export function fingerRings(n = FP_RINGS): Ring[] {
  const out: Ring[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k + 1) / (n + 0.6);
    const rx = 5 + t * 40;
    const ry = 7 + t * 56;
    const cx = 50 + (1 - t) * 5;
    const cy = 66 - (1 - t) * 8;
    const gap = 24 + ((k * 37) % 5) * 14; // 缺口大小（度）
    const mid = 90 + ((k % 3) - 1) * 18; // 缺口位置（90 度 = 正下方）
    const a0 = ((mid + gap / 2) * Math.PI) / 180;
    const a1 = ((mid - gap / 2 + 360) * Math.PI) / 180;
    const p = (a: number) => `${r2(cx + rx * Math.cos(a))} ${r2(cy + ry * Math.sin(a))}`;
    out.push({ d: `M ${p(a0)} A ${r2(rx)} ${r2(ry)} 0 1 1 ${p(a1)}`, cx, cy, rx, ry });
  }
  return out;
}

/** 第 k 圈（0 起算，共 n 圈）在整體進度 p（0～1）時已經描完幾成：一圈接一圈，由內往外 */
export function ringFraction(p: number, k: number, n: number): number {
  return clamp01(p * n - k);
}

/* ───────── 印章：把名字刻成四字（或一～三字）方印 ───────── */

/**
 * 印章的字型。目前專案沒有隸書字型，先用已載入的 Noto Serif TC 粗體（接近印刷體方印）。
 * 之後找到可商用的隸書，只要換這兩個常數，並在 main.tsx 引入字型檔即可。
 */
export const SEAL_FONT_FAMILY = "'Noto Serif TC', 'LXGW WenKai TC', 'PMingLiU', serif";
export const SEAL_FONT_WEIGHT = 700;

const HAN = /\p{Script=Han}/u;

/** 名字裡可以刻上去的字：只取漢字、最多 4 個。英文、數字、符號、emoji 都略過 */
export function sealText(name: string): string {
  return [...name].filter((c) => HAN.test(c)).slice(0, 4).join('');
}

export interface SealCell {
  ch: string;
  /** 以 100×100 的方印為座標 */
  x: number;
  y: number;
  /** 字的大小 */
  size: number;
}

/** 方印的外框與內框（100×100 座標）。外框到 8～92，旋轉放大後仍在畫布內 */
export const SEAL_FRAME = { outer: { x: 8, y: 8, w: 84 }, inner: { x: 13, y: 13, w: 74 } } as const;

/** 每個字的位置。讀法像直書：先右欄由上往下，再左欄由上往下（所以第一個字在右上） */
export function sealCells(text: string): SealCell[] {
  const cs = [...text].slice(0, 4);
  const at = (ch: string, x: number, y: number, size: number): SealCell => ({ ch, x, y, size });
  if (cs.length === 1) return [at(cs[0], 50, 50, 58)];
  if (cs.length === 2) return [at(cs[0], 50, 31, 36), at(cs[1], 50, 69, 36)];
  if (cs.length === 3) return [at(cs[0], 69, 33, 34), at(cs[1], 69, 67, 34), at(cs[2], 31, 50, 34)];
  if (cs.length === 4) return [at(cs[0], 69, 31, 33), at(cs[1], 69, 69, 33), at(cs[2], 31, 31, 33), at(cs[3], 31, 69, 33)];
  return [];
}

/** 外框在整體進度 p 時描完幾成：前 30% 先把方框描完 */
export const sealBorderFraction = (p: number) => clamp01(p / 0.3);

/** 第 i 個字（共 n 個）亮起的比例：方框描完之後，字一個接一個由上往下亮 */
export function sealCharFraction(p: number, i: number, n: number): number {
  if (n <= 0) return 0;
  const start = 0.3 + (0.7 * i) / n;
  const end = 0.3 + (0.7 * (i + 1)) / n;
  return clamp01((p - start) / (end - start));
}
