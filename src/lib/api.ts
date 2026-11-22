// 計數 API。任何失敗都靜默忽略：數字不顯示而已，遊戲不能因此壞掉。
// 這裡只有 Supabase 的網址與 publishable key，這兩個設計上就是公開的。
// Redis 的 token 只存在 Edge Function 的 secrets，不在前端。
const URL = import.meta.env.VITE_COUNT_URL ?? 'https://csykldmxxzlnwzbamswl.supabase.co/functions/v1/count';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_euSy1cj7J2BfLW9elFBXbQ_MYjeO01r';

export interface Stats {
  total: number;
  today: number;
  knocks: number;
}

async function post(body: unknown, timeoutMs = 4000): Promise<Record<string, unknown> | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY },
      body: JSON.stringify(body),
      signal: ctl.signal,
      keepalive: true,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const countHit = (fid: string) => void post({ action: 'hit', fid });
export const countKnock = (n: number) => void post({ action: 'knock', n });
/** 有感／沒感。送出失敗也沒關係：玩家這邊照樣看到神明的回應。 */
export const sendVote = (fid: string, v: 'up' | 'down') => void post({ action: 'vote', fid, v });

export async function fetchStats(): Promise<Stats | null> {
  const r = await post({ action: 'stats' });
  if (!r || r.ok !== true) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return { total: num(r.total), today: num(r.today), knocks: num(r.knocks) };
}
