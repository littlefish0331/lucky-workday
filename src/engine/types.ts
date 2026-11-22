export const LEVELS = ['上上籤', '大吉', '吉', '小吉', '小凶', '凶', '大凶', '下下籤'] as const;
export type Level = (typeof LEVELS)[number];

export const GOOD_LEVELS: readonly Level[] = ['上上籤', '大吉', '吉', '小吉'];
export const BAD_LEVELS: readonly Level[] = ['小凶', '凶', '大凶', '下下籤'];

export type Kind = 'good' | 'bad';
export const kindOf = (level: Level): Kind => (GOOD_LEVELS.includes(level) ? 'good' : 'bad');

export const TOPICS = ['office', 'engineer', 'sales', 'service', 'commute', 'money'] as const;
export type Topic = (typeof TOPICS)[number];

export const STYLES = ['quote', 'notice', 'dialogue', 'checklist', 'murmur', 'yiji'] as const;
export type Style = (typeof STYLES)[number];

export const SEASONS = ['yearend', 'tailparty', 'newyear', 'cny', 'payday'] as const;
export type Season = (typeof SEASONS)[number];

export interface Fortune {
  /** 內容雜湊，穩定，Redis 計數用 */
  id: string;
  /** 籤號，僅供顯示 */
  no: number;
  level: Level;
  topic: Topic;
  pain: string;
  style: Style;
  /** 籤眼：卡片上最大的字 */
  eye: string;
  body: string[];
  tip: string;
  season: Season | null;
  /** 限時籤：YYYY-MM-DD（含當天）之後不再出現。時事梗用，常青籤為 null */
  expires: string | null;
  meme: string | null;
}

export type Jiaobei = 'sheng' | 'xiao' | 'yin';
