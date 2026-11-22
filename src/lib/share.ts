import { canvasToBlob, SITE_URL } from './card';
import type { Result } from './storage';
import { plainHao } from '../engine/hao';

/** 兩三種文案，進頁面時隨機挑一種。使用者發文前會自己再編輯，所以不提供「換一則」。 */
export function shareTexts(r: Result): string[] {
  const hao = plainHao(r.hao);
  const pain = r.pain ? `（今日煩惱：${r.pain}）` : '';
  const a = `我在打工庇佑廟抽到「${r.level}」，法號【${hao}】${pain}\n神明說：${r.snap.eye}\n你的法號是什麼？留言給我看`;
  const b = `神明賜我法號「${hao}」。\n${r.snap.eye}\n你也去求一支，留言比比看誰比較慘（或比較準時下班）`;
  const c = `今天的籤：${r.level}。${r.snap.eye}\n同事們，來報上法號`;
  return [a, b, c];
}

/** 複製時在文案後面接網址（Threads 發文連結本身另外帶 url，所以那邊不重複） */
export const withUrl = (text: string) => `${text}\n${SITE_URL}`;

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
      await nav.share({ files: [file], title: '打工庇佑廟' });
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
