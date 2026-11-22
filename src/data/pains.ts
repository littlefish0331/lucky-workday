import raw from './pains.json';
import { TOPICS, type Topic } from '../engine/types';

export interface Pain {
  id: string;
  topic: Topic;
  label: string;
  hint: string;
}
export const TOPIC_LABEL = raw.topics as Record<Topic, string>;
export const PAINS = raw.pains as Pain[];

/**
 * 步驟②的六個選項：每個主題挑一個，所以不同行業的人都找得到自己。
 * `seen` 是已經出現過的 id，「換一批」時盡量不重複；全部看完才重置。
 */
export function pickPainBatch(seen: Set<string>, rand: () => number = Math.random): Pain[] {
  const batch: Pain[] = [];
  for (const t of TOPICS) {
    const all = PAINS.filter((p) => p.topic === t);
    let fresh = all.filter((p) => !seen.has(p.id));
    if (!fresh.length) {
      all.forEach((p) => seen.delete(p.id));
      fresh = all;
    }
    const p = fresh[Math.floor(rand() * fresh.length)];
    seen.add(p.id);
    batch.push(p);
  }
  for (let i = batch.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [batch[i], batch[j]] = [batch[j], batch[i]];
  }
  return batch;
}
