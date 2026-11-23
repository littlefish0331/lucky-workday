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

export const BATCH_SIZE = 6;

/** 行業鈕底下的小字：取該行業前三個痛點的名稱，讓人一眼看出「這一行在說什麼」 */
export function topicHint(topic: Topic): string {
  return PAINS.filter((p) => p.topic === topic)
    .slice(0, 3)
    .map((p) => p.label)
    .join('、');
}

/**
 * 步驟②的第二層：選好行業後，從該行業的痛點抽一批（預設 6 個）。
 * `seen` 是這個行業已經出現過的 id，「換一批」時盡量不重複；沒看過的不夠一批時，
 * 把這一輪重新計，並用看過的補滿，所以每一批一定湊滿 6 個。
 */
export function pickPainBatch(topic: Topic, seen: Set<string>, rand: () => number = Math.random, size = BATCH_SIZE): Pain[] {
  const all = PAINS.filter((p) => p.topic === topic);
  const shuffle = (a: Pain[]) => {
    const b = a.slice();
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const batch = shuffle(all.filter((p) => !seen.has(p.id))).slice(0, size);
  if (batch.length < size) {
    all.forEach((p) => seen.delete(p.id));
    const taken = new Set(batch.map((p) => p.id));
    batch.push(...shuffle(all.filter((p) => !taken.has(p.id))).slice(0, size - batch.length));
  }
  batch.forEach((p) => seen.add(p.id));
  return batch;
}

export { TOPICS };
