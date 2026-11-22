// 美術素材路徑。原圖在 art-src/，用 scripts/process-art.py 處理成 public/art/*.webp。
// 規格與重新生成的 prompt 見 docs/ART-PROMPTS.md。
import type { StampSpec } from '../lib/storage';

const B = import.meta.env.BASE_URL;
export const art = {
  hero: `${B}art/hero.webp`,
  cylinder: `${B}art/cylinder.webp`,
  stick: `${B}art/stick.webp`,
  woodfish: `${B}art/woodfish.webp`,
  mallet: `${B}art/mallet.webp`,
  jiaobei: { flat: `${B}art/jiaobei-flat.webp`, round: `${B}art/jiaobei-round.webp` },
  cardGood: `${B}art/card-good.webp`,
  cardBad: `${B}art/card-bad.webp`,
  deity: (stage: 0 | 1 | 2 | 3) => `${B}art/deity-${stage}.webp`,
  stamp: (s: StampSpec) => `${B}art/stamp-${s.kind}-${s.idx}.webp`,
} as const;

/** 載入圖片；失敗回傳 null，呼叫端改用程式繪製的暫代版，遊戲不會壞。 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
