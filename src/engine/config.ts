// 所有遊戲數字集中在這裡。要調整機率或次數，只改這個檔案（並先和使用者確認）。
import type { Level, Season } from './types';

/** 等級出現率，總和 = 1。好運 55%、壞運 45%。 */
export const LEVEL_RATE: Record<Level, number> = {
  上上籤: 0.06,
  大吉: 0.12,
  吉: 0.17,
  小吉: 0.2,
  小凶: 0.18,
  凶: 0.14,
  大凶: 0.08,
  下下籤: 0.05,
};

/** 擲筊：第一擲機率。笑筊後的第二擲保證聖筊。 */
export const JIAOBEI_RATE = { sheng: 0.75, xiao: 0.22, yin: 0.03 } as const;

/** 木魚：需要敲的次數範圍（含頭尾）。玩家看不到目標。 */
export const KNOCKS: Record<Level | 'resolve', [number, number]> = {
  上上籤: [0, 0],
  大吉: [0, 0],
  吉: [0, 0],
  小吉: [0, 0],
  小凶: [8, 14],
  凶: [12, 20],
  大凶: [16, 26],
  下下籤: [20, 32],
  resolve: [24, 36],
};

/** 挑籤權重：痛點相同 ×4、主題相同 ×2、其他 ×1 */
export const WEIGHT = { pain: 4, topic: 2, other: 1 } as const;

/** 時令籤的出現窗口（台北時間，含頭尾）。回傳 true 表示現在可以出現。 */
export const SEASON_WINDOW: Record<Season, (month: number, day: number) => boolean> = {
  yearend: (m, d) => (m === 11 && d >= 15) || m === 12 || m === 1,
  tailparty: (m, d) => (m === 11 && d >= 25) || m === 12 || m === 1 || (m === 2 && d <= 10),
  newyear: (m, d) => (m === 12 && d >= 22) || (m === 1 && d <= 6),
  cny: (m, d) => (m === 1 && d >= 10) || (m === 2 && d <= 24),
  payday: (_m, d) => d >= 25 || d <= 10,
};

/** 一個名字最多保留幾個字（防止亂塞） */
export const NAME_MAX = 12;
