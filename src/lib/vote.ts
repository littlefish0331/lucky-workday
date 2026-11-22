// 「有感／沒感」投票的本機記錄。每支籤只能投一次、不能改票。
// 只存在這支手機裡（和玩家名字一樣）；送到伺服器的只有「籤 id ＋ 有感或沒感」，不含名字。
export type Vote = 'up' | 'down';

type Backing = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'otld:votes:v1';
/** 最多記幾筆；超過就丟掉最舊的（籤冊最多 120 筆，這裡留寬一點，含重抽掉的那支） */
export const VOTES_MAX = 400;

export function createVoteStore(backing: () => Backing | null) {
  let mem: Record<string, Vote> | null = null;

  const load = (): Record<string, Vote> => {
    if (mem) return mem;
    const out: Record<string, Vote> = {};
    try {
      const raw = backing()?.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as unknown;
        if (p && typeof p === 'object') {
          for (const [k, v] of Object.entries(p as Record<string, unknown>)) if (v === 'up' || v === 'down') out[k] = v;
        }
      }
    } catch {
      /* 隱私模式或資料壞掉：當作沒投過 */
    }
    mem = out;
    return out;
  };

  return {
    get: (fid: string): Vote | null => load()[fid] ?? null,
    /** 投票。這支籤已經投過就不改，回傳 false。 */
    set(fid: string, v: Vote): boolean {
      const all = load();
      if (all[fid]) return false;
      all[fid] = v;
      const keys = Object.keys(all);
      for (const k of keys.slice(0, Math.max(0, keys.length - VOTES_MAX))) delete all[k];
      try {
        backing()?.setItem(KEY, JSON.stringify(all));
      } catch {
        /* 寫不進去也不影響遊戲，這次只記在記憶體 */
      }
      return true;
    },
  };
}

export const votes = createVoteStore(() => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
});
