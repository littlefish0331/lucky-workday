// 手印：程式繪製的暫代版（墨跡質感）。美術到位後由 HAS_ART.stamps 切換成圖片。
import { createRng } from '../engine/rng';
import type { StampSpec } from './storage';

export const INK = '#B3261E';

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fill();
}

function drawFinger(ctx: CanvasRenderingContext2D, s: number, idx: number, rand: () => number) {
  const c = s / 2;
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.9;
  blob(ctx, c, c, s * 0.3, s * 0.4, 0.15 * (idx - 1.5));
  // 指紋：以不同位移的同心橢圓線條畫成弓、箕、斗，4 款各有不同
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = s * 0.018;
  const rings = 9 + idx;
  for (let i = 1; i <= rings; i++) {
    const t = i / (rings + 1);
    ctx.beginPath();
    const ox = (idx % 2 ? 1 : -1) * s * 0.04 * (1 - t);
    const oy = idx >= 2 ? -s * 0.08 * (1 - t) : s * 0.05 * (1 - t);
    ctx.ellipse(c + ox, c + oy, s * 0.3 * t, s * 0.4 * t, 0.15 * (idx - 1.5), idx === 3 ? 0.4 : 0.1, Math.PI * (idx === 3 ? 1.8 : 1.95));
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  void rand;
}

function drawPalm(ctx: CanvasRenderingContext2D, s: number, idx: number) {
  const c = s / 2;
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.9;
  blob(ctx, c, c + s * 0.14, s * 0.27, s * 0.27 + (idx ? s * 0.02 : 0));
  const fingers = [
    [-0.22, -0.16, 0.055, 0.14, -0.35],
    [-0.09, -0.27, 0.055, 0.17, -0.1],
    [0.05, -0.3, 0.055, 0.18, 0.04],
    [0.18, -0.22, 0.052, 0.15, 0.25],
  ];
  fingers.forEach(([dx, dy, rx, ry, rot]) => blob(ctx, c + dx * s, c + dy * s, rx * s, ry * s, rot));
  blob(ctx, c - s * 0.3, c + s * 0.02, s * 0.06, s * 0.14, -0.9); // 拇指
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(c + (i - 1) * s * 0.07, c + s * 0.1 + i * s * 0.04, s * (0.14 + i * 0.02), 3.5, 5.2);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawPaw(ctx: CanvasRenderingContext2D, s: number, dog: boolean, idx: number) {
  const c = s / 2;
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.9;
  if (dog) {
    // 狗掌：偏方的大肉墊 + 四個橢圓趾
    ctx.beginPath();
    ctx.moveTo(c - s * 0.2, c + s * 0.3);
    ctx.quadraticCurveTo(c - s * 0.3, c + s * 0.02, c, c - s * 0.02);
    ctx.quadraticCurveTo(c + s * 0.3, c + s * 0.02, c + s * 0.2, c + s * 0.3);
    ctx.quadraticCurveTo(c, c + s * 0.38, c - s * 0.2, c + s * 0.3);
    ctx.fill();
    blob(ctx, c - s * 0.27, c - s * 0.12, s * 0.07, s * 0.1, -0.3);
    blob(ctx, c - s * 0.1, c - s * 0.26, s * 0.075, s * 0.11, -0.08);
    blob(ctx, c + s * 0.1, c - s * 0.26, s * 0.075, s * 0.11, 0.08);
    blob(ctx, c + s * 0.27, c - s * 0.12, s * 0.07, s * 0.1, 0.3);
    if (idx !== 1) {
      ctx.globalAlpha = 0.9;
      [-0.27, 0.27].forEach((dx) => blob(ctx, c + dx * s, c - s * 0.25, s * 0.018, s * 0.026, dx > 0 ? 0.5 : -0.5));
    }
  } else {
    // 貓掌：愛心形肉墊 + 四顆小豆趾
    ctx.beginPath();
    ctx.moveTo(c, c + s * 0.34);
    ctx.bezierCurveTo(c - s * 0.36, c + s * 0.12, c - s * 0.2, c - s * 0.06, c, c + s * 0.06);
    ctx.bezierCurveTo(c + s * 0.2, c - s * 0.06, c + s * 0.36, c + s * 0.12, c, c + s * 0.34);
    ctx.fill();
    blob(ctx, c - s * 0.26, c - s * 0.06, s * 0.065, s * 0.085, -0.4);
    blob(ctx, c - s * 0.09, c - s * 0.22, s * 0.07, s * 0.095, -0.1);
    blob(ctx, c + s * 0.09, c - s * 0.22, s * 0.07, s * 0.095, 0.1);
    blob(ctx, c + s * 0.26, c - s * 0.06, s * 0.065, s * 0.085, 0.4);
  }
}

function make(size: number): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  return { cv, ctx: cv.getContext('2d')! };
}

/** 回傳一張墨印的 Canvas（透明底）。同一個 spec 每次畫出來一樣。 */
export function renderStamp(spec: StampSpec, size = 360): HTMLCanvasElement {
  const { cv, ctx } = make(size);
  const rand = createRng(`stamp|${spec.kind}|${spec.idx}|${spec.rot}`);
  ctx.translate(size / 2, size / 2);
  ctx.rotate((spec.rot * Math.PI) / 180);
  ctx.scale(spec.scale, spec.scale);
  ctx.translate(-size / 2, -size / 2);
  if (spec.kind === 'finger') drawFinger(ctx, size, spec.idx, rand);
  else if (spec.kind === 'palm') drawPalm(ctx, size, spec.idx);
  else drawPaw(ctx, size, spec.kind === 'dog', spec.idx);
  // 墨跡質感：隨機擦掉小點與邊緣缺口
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.6;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 1 + rand() * size * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  return cv;
}

export function stampDataUrl(spec: StampSpec, size = 240): string {
  return renderStamp(spec, size).toDataURL('image/png');
}

export const STAMP_CAPTION: Record<StampSpec['kind'], string> = {
  finger: '',
  palm: '',
  cat: '貓咪代為簽收',
  dog: '狗狗代為簽收',
};
