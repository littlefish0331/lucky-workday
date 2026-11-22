// 籤卡：用 Canvas 畫成 1080×1920 的圖，存圖與預覽用同一份。
// 美術到位前，底圖由程式繪製（紙紋、雙框、角飾）。
import { art, loadImage } from '../data/art';
import { stampDataUrl } from './stamp';
import type { Result } from './storage';
import { STAMP_CAPTION } from './stamp';
import { kindOf } from '../engine/types';

export const CARD_W = 1080;
export const CARD_H = 1920;
export const SITE_URL = 'https://littlefish0331.github.io/ontime-lucky-day/';
const SERIF = "'Noto Serif TC', 'LXGW WenKai TC', 'PMingLiU', serif";
const KAI = "'LXGW WenKai TC', 'Noto Serif TC', 'DFKai-SB', serif";

const PALETTE = {
  good: { paper: '#F3E6CC', paper2: '#EAD8B4', frame: '#C0392B', gold: '#B8872B', ink: '#1B1410', sub: '#6B4F3A', accent: '#C0392B' },
  bad: { paper: '#E3D5BC', paper2: '#D2C09E', frame: '#2B211B', gold: '#8A7550', ink: '#1B1410', sub: '#5A4636', accent: '#7A2A22' },
};

/** 把文字依寬度折行。中文逐字量，標點不放行首。 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const ch of [...text]) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      if (/[，。、！？：；」』）]/.test(ch)) {
        cur += ch;
        lines.push(cur);
        cur = '';
        continue;
      }
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: string, max: number, min: number, maxW: number, maxLines: number) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `${weight} ${min}px ${family}`;
  return { size: min, lines: wrap(ctx, text, maxW).slice(0, maxLines) };
}

function paper(ctx: CanvasRenderingContext2D, p: (typeof PALETTE)['good'], bad: boolean) {
  const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
  g.addColorStop(0, p.paper);
  g.addColorStop(1, p.paper2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  // 紙纖維
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#5a3a1a';
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) ctx.fillRect(r() * CARD_W, r() * CARD_H, 1 + r() * 14, 1 + r() * 1.4);
  ctx.globalAlpha = 1;
  // 雙框
  ctx.strokeStyle = p.frame;
  ctx.lineWidth = 8;
  ctx.strokeRect(46, 46, CARD_W - 92, CARD_H - 92);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(68, 68, CARD_W - 136, CARD_H - 136);
  // 角飾
  ctx.fillStyle = p.gold;
  for (const [x, y] of [[68, 68], [CARD_W - 68, 68], [68, CARD_H - 68], [CARD_W - 68, CARD_H - 68]]) {
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  if (bad) {
    ctx.strokeStyle = p.sub;
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      let x = 120 + r() * 800, y = 120 + r() * 300;
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += 20 + r() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function seal(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-0.12);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.92;
  ctx.strokeRect(-62, -62, 124, 124);
  ctx.lineWidth = 2;
  ctx.strokeRect(-54, -54, 108, 108);
  ctx.font = `700 52px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const t = [...text];
  ctx.fillText(t[0] ?? '', -22, -22);
  ctx.fillText(t[1] ?? '', 22, -22);
  ctx.fillText(t[2] ?? '', -22, 24);
  ctx.fillText(t[3] ?? '', 22, 24);
  ctx.restore();
}

/** 版面量測（測試用）：內文結束位置、註記位置、資訊區上緣。內文不能壓到資訊區。 */
export const layoutOf = new WeakMap<HTMLCanvasElement, { contentEnd: number; noteY: number; infoTop: number }>();

export interface CardOptions {
  /** 傳入時蓋上手印圖（來自美術）；否則用程式繪製 */
  stampImage?: CanvasImageSource | null;
}

const NOTE_TEXT = '原抽敲木魚下改判認命收下明天會更好大概化解已知悉神明閱準時下班完成';

export async function drawCard(r: Result, opt: CardOptions = {}): Promise<HTMLCanvasElement> {
  try {
    // 字型是分片載入的：要把這張卡會用到的每個字都交給 fonts.load，否則 Canvas 會畫出系統字型
    const all = [
      '準時下班宮第籤信眾今日煩惱你也來求一支看看今天能不能準時下班',
      r.level, r.snap.eye, ...r.snap.body, r.snap.tip, r.name, r.hao, r.pain, r.resolveTip ?? '', NOTE_TEXT, '0123456789',
    ].join('');
    await Promise.all([
      document.fonts.load(`700 80px ${SERIF}`, all),
      document.fonts.load(`400 80px ${SERIF}`, all),
      document.fonts.load(`400 80px ${KAI}`, all),
    ]);
  } catch {
    /* 字型載入失敗就用系統字型，仍然畫得出來 */
  }
  const cv = document.createElement('canvas');
  cv.width = CARD_W;
  cv.height = CARD_H;
  const ctx = cv.getContext('2d')!;
  const bad = kindOf(r.level) === 'bad';
  const p = bad ? PALETTE.bad : PALETTE.good;
  // 底圖：優先用美術；載入失敗就退回程式繪製的紙面，卡片仍然完整
  const bg = await loadImage(bad ? art.cardBad : art.cardGood);
  if (bg) ctx.drawImage(bg, 0, 0, CARD_W, CARD_H);
  else paper(ctx, p, bad);
  const stampArt = opt.stampImage === undefined ? await loadImage(art.stamp(r.stamp)) : opt.stampImage;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // 頂部：站名與籤號
  ctx.fillStyle = p.sub;
  ctx.font = `400 38px ${SERIF}`;
  ctx.fillText('準 時 下 班 宮', CARD_W / 2, 238);
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText(`第 ${String(r.snap.no).padStart(3, '0')} 籤`, CARD_W / 2, 286);

  // 等級
  ctx.fillStyle = p.accent;
  ctx.font = `700 150px ${SERIF}`;
  ctx.fillText(r.level, CARD_W / 2, 446);
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(200, 486);
  ctx.lineTo(CARD_W - 200, 486);
  ctx.stroke();

  // 籤眼（最大的字，要能單獨被截圖）
  const eyeFit = fitFont(ctx, r.snap.eye, KAI, '400', 84, 52, 840, 4);
  ctx.fillStyle = p.ink;
  ctx.font = `400 ${eyeFit.size}px ${KAI}`;
  const lh = Math.round(eyeFit.size * 1.42);
  let y = 606;
  for (const ln of eyeFit.lines) {
    ctx.fillText(ln, CARD_W / 2, y);
    y += lh;
  }

  // 內文
  y += 20;
  ctx.fillStyle = p.sub;
  const bodyFont = 44;
  ctx.font = `400 ${bodyFont}px ${SERIF}`;
  for (const raw of r.snap.body) {
    for (const ln of wrap(ctx, raw, 860)) {
      ctx.fillText(ln, CARD_W / 2, y);
      y += 66;
    }
    y += 6;
  }

  // 叮嚀
  y += 26;
  ctx.fillStyle = p.accent;
  ctx.font = `700 42px ${SERIF}`;
  const tipLines = wrap(ctx, r.snap.tip, 860);
  for (const ln of tipLines) {
    ctx.fillText(ln, CARD_W / 2, y);
    y += 62;
  }

  // 化解／改判的註記（不能壓到下面的資訊區）
  const baseYLimit = 1390 - 50;
  const noteY = Math.min(Math.max(y + 30, 1200), baseYLimit - 30);
  if (r.outcome === 'rerolled' && r.originalLevel) {
    ctx.fillStyle = p.sub;
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillText(`原抽「${r.originalLevel}」・敲木魚 ${r.knocks ?? 0} 下・改判`, CARD_W / 2, noteY);
  } else if (r.outcome === 'resolved') {
    ctx.fillStyle = p.sub;
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillText(`敲木魚 ${r.knocks ?? 0} 下化解${r.resolveTip ? `：${r.resolveTip}` : ''}`.slice(0, 30), CARD_W / 2, noteY);
  } else if (r.outcome === 'kept') {
    ctx.fillStyle = p.sub;
    ctx.font = `400 34px ${SERIF}`;
    ctx.fillText('認命收下。明天會更好（大概）', CARD_W / 2, noteY);
  }

  // 底部資訊區：名字、法號、日期、手印
  const baseY = 1390;
  ctx.strokeStyle = p.gold;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(140, baseY - 50);
  ctx.lineTo(CARD_W - 140, baseY - 50);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'left';
  ctx.fillStyle = p.sub;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText('信眾', 150, baseY + 10);
  ctx.fillStyle = p.ink;
  ctx.font = `700 60px ${SERIF}`;
  ctx.fillText(r.name.slice(0, 8), 150, baseY + 78);
  ctx.fillStyle = p.accent;
  const haoFit = fitFont(ctx, r.hao, SERIF, '700', 50, 34, 520, 1);
  ctx.font = `700 ${haoFit.size}px ${SERIF}`;
  ctx.fillText(r.hao, 150, baseY + 142);
  ctx.fillStyle = p.sub;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText(`今日煩惱：${r.pain || '（神明已讀不回）'}`.slice(0, 18), 150, baseY + 198);
  ctx.fillText(r.date.replace(/-/g, '／'), 150, baseY + 246);

  // 手印
  const sx = 790, sy = baseY + 60, ss = 290;
  const st: CanvasImageSource = stampArt ?? (() => { const i = new Image(); i.src = stampDataUrl(r.stamp, 360); return i; })();
  if (st instanceof HTMLImageElement && !st.complete) await new Promise<void>((res) => { st.onload = () => res(); st.onerror = () => res(); });
  ctx.save();
  // 美術手印已經帶旋轉與縮放的設定；圖片版需要自己套用，程式繪製版在 renderStamp 內已套用
  ctx.translate(sx, sy + 40 + ss / 2 - ss / 2);
  if (stampArt) {
    ctx.rotate((r.stamp.rot * Math.PI) / 180);
    ctx.scale(r.stamp.scale, r.stamp.scale);
  }
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.95;
  try { ctx.drawImage(st, -ss / 2, -ss / 2, ss, ss); } catch { /* 手印畫不出來就留白 */ }
  ctx.restore();
  const cap = STAMP_CAPTION[r.stamp.kind];
  ctx.textAlign = 'center';
  if (cap) {
    ctx.fillStyle = p.accent;
    ctx.font = `700 30px ${SERIF}`;
    ctx.fillText(cap, sx, sy + ss / 2 + 70);
  }
  // 印章
  // 印章蓋進底圖上方的圓圈（圓心約 540,116、直徑約 114）
  seal(ctx, 540, 117, bad ? '神明已閱' : '準時下班', p.accent, 0.6);

  // 網址與邀請
  ctx.textAlign = 'center';
  ctx.fillStyle = p.sub;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText('你也來求一支，看看今天能不能準時下班', CARD_W / 2, 1782);
  ctx.fillStyle = p.accent;
  ctx.font = `700 32px ${SERIF}`;
  ctx.fillText(SITE_URL.replace('https://', '').replace(/\/$/, ''), CARD_W / 2, 1832);

  layoutOf.set(cv, { contentEnd: y, noteY, infoTop: baseY - 50 });
  return cv;
}

export function canvasToBlob(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}
