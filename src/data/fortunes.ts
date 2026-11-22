import raw from './fortunes.generated.json';
import type { Fortune } from '../engine/types';

export const FORTUNES = raw as unknown as Fortune[];
const index = new Map(FORTUNES.map((f) => [f.id, f]));
export const fortuneById = (id: string): Fortune | undefined => index.get(id);

/** 陰筊的隱藏款。不在籤池裡，只有擲出陰筊（3%）才會拿到，不計入 Redis 計數。 */
export const SPECIAL_YIN: Fortune = {
  id: 'yin-00000',
  no: 0,
  level: '小吉',
  topic: 'office',
  pain: '',
  style: 'murmur',
  eye: '神明已讀不回',
  body: ['你的問題，祂看到了。', '祂決定不回。'],
  tip: '宜：自己決定　忌：再問一次',
  season: null,
  expires: null,
  meme: null,
};
