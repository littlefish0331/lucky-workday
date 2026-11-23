// 互動素材：圖片版。圖片載入失敗時整個元件仍然可用（alt 文字加 CSS 底色）。
import { art } from '../data/art';
import type { Deity as DeityInfo } from '../data/deities';
import { stampDataUrl } from '../lib/stamp';
import type { StampSpec } from '../lib/storage';

/** 印章（seal）是程式畫的、沒有圖檔：同一個 spec 只畫一次，之後重用 */
const sealCache = new Map<string, string>();
function sealDataUrl(spec: StampSpec): string {
  const k = `${spec.text}|${spec.rot}|${spec.scale}`;
  let u = sealCache.get(k);
  if (!u) {
    u = stampDataUrl(spec, 360);
    sealCache.set(k, u);
  }
  return u;
}

/** bob：籤筒上下偏移（px，正值往下）。握著籤筒上下搖的感覺：順著偏移方向微微歪一點 */
export function Cylinder({ bob = 0, progress = 0, popped = false }: { bob?: number; progress?: number; popped?: boolean }) {
  return (
    <div className="cyl" style={{ transform: `translateY(${bob}px) rotate(${bob * 0.2}deg)` }}>
      <img className="cyl-img" src={art.cylinder} alt="籤筒" draggable={false} />
      {popped && <img className="cyl-stick" src={art.stick} alt="" aria-hidden="true" draggable={false} />}
      {progress > 0 && !popped && <i className="cyl-bar" style={{ width: `${progress * 100}%` }} />}
    </div>
  );
}

/** 筊杯：flat 平面、round 圓面（有高光）。聖筊 = 一平一圓，笑筊 = 兩平，陰筊 = 兩圓。 */
export function Block({ face, flying, mirror }: { face: 'flat' | 'round'; flying?: boolean; mirror?: boolean }) {
  return <img className={`block${flying ? ' flying' : ''}${mirror ? ' mirror' : ''}`} src={art.jiaobei[face]} alt="" aria-hidden="true" draggable={false} />;
}

export function WoodFish({ hit }: { hit: boolean }) {
  return <img className={`woodfish${hit ? ' hit' : ''}`} src={art.woodfish} alt="木魚" draggable={false} />;
}

export function Mallet({ hit }: { hit: boolean }) {
  return <img className={`mallet${hit ? ' hit' : ''}`} src={art.mallet} alt="" aria-hidden="true" draggable={false} />;
}

export function Deity({ deity, stage, done }: { deity: DeityInfo; stage: 0 | 1 | 2 | 3; done?: boolean }) {
  // 角色圖載入失敗就退回績效伯伯，木魚畫面不會空掉
  return (
    <img
      className={`deity-img s${stage}${done ? ' done' : ''}`}
      src={deity.frame(done ? 3 : stage)}
      alt={deity.name}
      draggable={false}
      onError={(e) => {
        const fb = art.deity(done ? 3 : stage);
        if (e.currentTarget.src !== new URL(fb, location.href).href) e.currentTarget.src = fb;
      }}
    />
  );
}

/**
 * 蓋好的手印。旋轉與縮放用 CSS 變數（--rot、--scale）交給樣式表組合，這樣動畫（slam）和定位
 * （left/top 置中）可以和它們同時存在，不會互相蓋掉 transform。
 */
export function StampImg({ spec, className, style }: { spec: StampSpec; className?: string; style?: React.CSSProperties }) {
  const seal = spec.kind === 'seal';
  const src = seal ? sealDataUrl(spec) : art.stamp(spec);
  const vars = { '--rot': `${spec.rot}deg`, '--scale': spec.scale } as React.CSSProperties;
  return <img className={className} src={src} alt={seal ? '印章' : '手印'} draggable={false} style={{ ...style, ...vars }} />;
}
