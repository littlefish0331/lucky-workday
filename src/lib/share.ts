import { canvasToBlob, SITE_URL } from './card';
import type { Result } from './storage';
import { kindOf } from '../engine/types';

/** 兩三種可選文案，結尾邀請留言互動。 */
export function shareTexts(r: Result): string[] {
  const bad = kindOf(r.level) === 'bad';
  const pain = r.pain ? `（今日煩惱：${r.pain}）` : '';
  const a = bad
    ? `我在準時下班宮抽到「${r.level}」，法號【${r.hao}】${pain}\n神明說：${r.snap.eye}\n你的法號是什麼？留言給我看`
    : `我在準時下班宮抽到「${r.level}」，法號【${r.hao}】${pain}\n神明說：${r.snap.eye}\n你的法號是什麼？留言給我看`;
  const b = `神明賜我法號「${r.hao}」。\n${r.snap.eye}\n你也去求一支，留言比比看誰比較慘（或比較準時下班）`;
  const c = `今天的籤：${r.level}。${r.snap.eye}\n同事們，來報上法號`;
  return [a, b, c];
}

export function threadsIntentUrl(text: string): string {
  return `https://www.threads.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(SITE_URL)}`;
}

export type SaveVia = 'share' | 'download' | 'longpress';

/**
 * 存圖。依序嘗試：系統分享選單（手機可直接存到相簿）→ 下載 → 長按存圖（呼叫端顯示圖片）。
 * 使用者取消分享時回傳 'cancel'，不當成錯誤。
 */
export async function saveCard(cv: HTMLCanvasElement, filename: string): Promise<SaveVia | 'cancel'> {
  const blob = await canvasToBlob(cv);
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: '準時下班宮' });
      return 'share';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancel';
      /* 其他錯誤就往下試下載 */
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return 'download';
  } catch {
    return 'longpress';
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
