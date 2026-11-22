import { JIAOBEI_RATE, KNOCKS, LEVEL_RATE, SEASON_WINDOW, WEIGHT } from './config';
import { createRng, normalizeName, randInt } from './rng';
import { LEVELS, type Fortune, type Jiaobei, type Level, type Topic } from './types';

export interface DrawInput {
  name: string;
  /** 台北日期 YYYY-MM-DD */
  dateKey: string;
  /** 第幾次抽：0 = 第一次，1 = 木魚後重抽 */
  attempt: number;
  /** 玩家在步驟②選的痛點 label */
  pain?: string | null;
  topic?: Topic | null;
  /** 重抽時排除的 id（例如上一支） */
  excludeIds?: string[];
}

export function seasonActive(season: Fortune['season'], dateKey: string): boolean {
  if (!season) return true;
  const [, m, d] = dateKey.split('-').map(Number);
  return SEASON_WINDOW[season](m, d);
}

/** 可以出現嗎：時令窗口內，而且沒有過期（日期字串可直接比大小）。 */
export function isLive(f: Pick<Fortune, 'season' | 'expires'>, dateKey: string): boolean {
  return seasonActive(f.season, dateKey) && (!f.expires || f.expires >= dateKey);
}

export function pickLevel(rand: () => number): Level {
  let r = rand();
  for (const lv of LEVELS) {
    r -= LEVEL_RATE[lv];
    if (r < 0) return lv;
  }
  return LEVELS[LEVELS.length - 1];
}

/** 若該等級沒有可抽的籤，往相鄰等級找（先近後遠） */
function levelsByDistance(level: Level): Level[] {
  const i = LEVELS.indexOf(level);
  return [...LEVELS].sort((a, b) => Math.abs(LEVELS.indexOf(a) - i) - Math.abs(LEVELS.indexOf(b) - i));
}

export function drawFortune(pool: readonly Fortune[], input: DrawInput): Fortune | null {
  // 種子只有名字、日期、第幾次。等級由種子決定，所以換痛點不能重抽等級；
  // 痛點只影響「同一個等級裡」挑哪一支（權重）。
  const seed = `${normalizeName(input.name)}|${input.dateKey}|${input.attempt}`;
  const rand = createRng(seed);
  const level = pickLevel(rand);

  const exclude = new Set(input.excludeIds ?? []);
  const inWindow = pool.filter((f) => isLive(f, input.dateKey));

  for (const lv of levelsByDistance(level)) {
    let cands = inWindow.filter((f) => f.level === lv);
    const withoutExcluded = cands.filter((f) => !exclude.has(f.id));
    if (withoutExcluded.length) cands = withoutExcluded;
    if (!cands.length) continue;

    const weights = cands.map((f) =>
      input.pain && f.pain === input.pain ? WEIGHT.pain : input.topic && f.topic === input.topic ? WEIGHT.topic : WEIGHT.other,
    );
    let r = rand() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cands.length; i++) {
      r -= weights[i];
      if (r < 0) return cands[i];
    }
    return cands[cands.length - 1];
  }
  return null;
}

/**
 * 擲筊。throwNo 從 1 開始。
 * 第 1 擲：聖 75%、笑 22%、陰 3%。第 2 擲（笑筊之後）保證聖筊，避免玩家卡關。
 */
export function throwJiaobei(throwNo: number, rand: () => number = Math.random): Jiaobei {
  if (throwNo >= 2) return 'sheng';
  const r = rand();
  if (r < JIAOBEI_RATE.sheng) return 'sheng';
  if (r < JIAOBEI_RATE.sheng + JIAOBEI_RATE.xiao) return 'xiao';
  return 'yin';
}

/** 木魚要敲幾下。吉側回傳 0。 */
export function knocksNeeded(kind: Level | 'resolve', rand: () => number = Math.random): number {
  const [min, max] = KNOCKS[kind];
  return max === 0 ? 0 : randInt(rand, min, max);
}
