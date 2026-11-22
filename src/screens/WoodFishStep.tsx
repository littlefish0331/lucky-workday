import { useEffect, useRef, useState } from 'react';
import { Deity, Mallet, WoodFish } from '../components/ui';
import { CRIT_QUIPS, DEITY_STAGES, HINTS, KNOCK_QUIPS } from '../data/texts';
import { buzz } from '../lib/haptics';
import { useLater } from '../lib/hooks';

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/**
 * 敲木魚積陰德。target 是要敲的次數，玩家看不到（只看神像表情變化）。
 * 暴擊一次算 5 下；onDone 回傳實際敲了幾下。
 */
export function WoodFishStep({ kind, target, onDone }: { kind: 'reroll' | 'resolve'; target: number; onDone: (taps: number) => void }) {
  const [, setTick] = useState(0);
  const [hit, setHit] = useState(false);
  const [quip, setQuip] = useState('');
  const [auto, setAuto] = useState(false);
  const progress = useRef(0);
  const taps = useRef(0);
  const done = useRef(false);
  const later = useLater();

  const knock = () => {
    if (done.current) return;
    const crit = Math.random() < 0.08;
    taps.current += 1;
    progress.current = Math.min(target, progress.current + (crit ? 5 : 1));
    setQuip(crit ? pick(CRIT_QUIPS) : pick(KNOCK_QUIPS));
    setHit(true);
    later(() => setHit(false), 70);
    buzz(crit ? [20, 20, 40] : 12);
    if (progress.current >= target) {
      done.current = true;
      setAuto(false);
      buzz([60, 40, 120]);
      const n = taps.current;
      later(() => onDone(n), 1100);
    }
    setTick((t) => t + 1);
  };

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(knock, 210);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  const ratio = progress.current / target;
  const stage = ratio >= 1 ? 3 : ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0;
  const d = DEITY_STAGES[stage];

  return (
    <div className="screen stack center">
      <h2>{kind === 'reroll' ? '敲木魚積陰德' : '敲木魚化解'}</h2>
      <p className="sub">
        {done.current ? '功德圓滿。' : kind === 'reroll' ? '敲到神明願意再給你一次機會。' : '再敲一輪，把這支籤化掉。'}
        <br />
        {HINTS.woodfish}
      </p>
      <div className={`deity s${stage}`}>
        <Deity stage={stage as 0 | 1 | 2 | 3} done={done.current} />
      </div>
      <div className="quip" aria-live="polite">
        {done.current ? '神明：好啦好啦，給你一次。' : quip || d.say}
      </div>
      <button className="woodwrap" onPointerDown={(e) => { e.preventDefault(); knock(); }} aria-label="敲木魚" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knock(); } }}>
        <WoodFish hit={hit} />
        <Mallet hit={hit} />
      </button>
      <div className="count" aria-label={`已敲 ${taps.current} 下`}>{taps.current}</div>
      <div className="grow" />
      <button className="btn ghost" onClick={() => setAuto((a) => !a)} disabled={done.current}>
        {auto ? '停止自動敲' : '我手痠了，幫我敲'}
      </button>
    </div>
  );
}
