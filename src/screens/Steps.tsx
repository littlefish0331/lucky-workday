import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react';
import { Block, Cylinder, StampImg } from '../components/ui';
import { HINTS } from '../data/texts';
import { PAINS, TOPIC_LABEL, pickPainBatch, type Pain } from '../data/pains';
import { NAME_MAX } from '../engine/config';
import { throwJiaobei } from '../engine/draw';
import { normalizeName } from '../engine/rng';
import type { Jiaobei } from '../engine/types';
import { buzz } from '../lib/haptics';
import { useLater } from '../lib/hooks';
import type { StampSpec } from '../lib/storage';

const TOTAL_STEPS = 5;
export function Steps({ at }: { at: number }) {
  return (
    <div className="steps" aria-label={`第 ${at} 步，共 ${TOTAL_STEPS} 步`}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <i key={i} className={i < at ? 'on' : ''} />
      ))}
    </div>
  );
}

/* ① 報上名來 */
export function NameStep({ initial, onSubmit }: { initial: string; onSubmit: (name: string) => void }) {
  const [v, setV] = useState(initial);
  const ok = normalizeName(v).length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (ok) onSubmit(v.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX));
  };
  return (
    <form className="screen stack center" onSubmit={submit}>
      <Steps at={1} />
      <h2>報上名來</h2>
      <p className="sub">神明要登記信眾。暱稱也可以，名字只存在你的手機裡。</p>
      <div className="grow" />
      <input
        className="field"
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={NAME_MAX}
        placeholder="你的名字"
        autoComplete="off"
        autoCapitalize="off"
        enterKeyHint="go"
        aria-label="你的名字"
        autoFocus
      />
      <p className="small">同一個名字，同一天會抽到同一支籤。</p>
      <div className="grow" />
      <button className="btn" type="submit" disabled={!ok}>
        就是我
      </button>
    </form>
  );
}

/* ② 最痛的事 */
export function PainStep({ onPick }: { onPick: (p: Pain) => void }) {
  const seen = useRef(new Set<string>());
  const [batch, setBatch] = useState<Pain[]>(() => pickPainBatch(seen.current));
  return (
    <div className="screen stack">
      <Steps at={2} />
      <h2>最近，哪件事最痛？</h2>
      <p className="sub">選一個。神明會往這個方向多看一眼。</p>
      <div className="pains" role="list">
        {batch.map((p) => (
          <button key={p.id} className="pain" role="listitem" onClick={() => onPick(p)}>
            <small>{TOPIC_LABEL[p.topic]}</small>
            <b>{p.label}</b>
            <span>{p.hint}</span>
          </button>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setBatch(pickPainBatch(seen.current))}>
        都不是，換一批（共 {PAINS.length} 種）
      </button>
    </div>
  );
}

/* ③ 按手印立契約 */
export function StampStep({ name, pain, spec, onDone }: { name: string; pain: string; spec: StampSpec; onDone: () => void }) {
  const [p, setP] = useState(0);
  const [hold, setHold] = useState(false);
  const [signed, setSigned] = useState(false);
  const raf = useRef(0);
  const t0 = useRef(0);
  const marks = useRef(0);
  const doneRef = useRef(false);
  const later = useLater();
  const HOLD_MS = 1000;

  const stop = () => {
    cancelAnimationFrame(raf.current);
    if (!doneRef.current) {
      setHold(false);
      setP(0);
    }
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    const t = Math.min(1, (performance.now() - t0.current) / HOLD_MS);
    setP(t);
    const m = Math.floor(t * 4);
    if (m > marks.current && t < 1) {
      marks.current = m;
      buzz(12);
    }
    if (t >= 1) {
      doneRef.current = true;
      setSigned(true);
      setHold(false);
      buzz([40, 30, 70]);
      later(onDone, 1100);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const start = () => {
    if (doneRef.current) return;
    marks.current = 0;
    t0.current = performance.now();
    setHold(true);
    raf.current = requestAnimationFrame(tick);
  };

  const R = 91;
  const C = 2 * Math.PI * R;
  return (
    <div className="screen stack center">
      <Steps at={3} />
      <h2>立契約</h2>
      <div className="contract">
        <h3>職場求籤契約</h3>
        <div>
          立約人 <b>{name}</b>，因「<b>{pain}</b>」之事，自願向本宮求籤一支。
        </div>
        <div>抽到什麼都不退貨，明天的班照樣要上。</div>
        {signed && <StampImg className="signed on" spec={spec} />}
      </div>
      <div className="grow" />
      <p className="sub">{signed ? '契約成立。' : HINTS.stamp}</p>
      <button
        className={`inkpad${hold ? ' hold' : ''}`}
        onPointerDown={(e: RPointerEvent<HTMLButtonElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
        aria-label="按住 1 秒，蓋手印"
        disabled={signed}
      >
        <svg className="ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle className="bg" cx="100" cy="100" r={R} />
          <circle className="fg" cx="100" cy="100" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - p)} />
        </svg>
        {signed ? '成了' : '按住\n蓋手印'}
      </button>
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ④ 搖籤筒 */
export function ShakeStep({ onDone }: { onDone: () => void }) {
  const [prog, setProg] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [popped, setPopped] = useState(false);
  const last = useRef<number | null>(null);
  const startX = useRef(0);
  const moved = useRef(0);
  const progRef = useRef(0);
  const doneRef = useRef(false);
  const later = useLater();

  const add = (d: number) => {
    if (doneRef.current) return;
    const before = progRef.current;
    progRef.current = Math.min(1, before + d);
    setProg(progRef.current);
    if (Math.floor(progRef.current * 10) > Math.floor(before * 10)) buzz(8);
    if (progRef.current >= 1) {
      doneRef.current = true;
      setPopped(true);
      setTilt(0);
      buzz([30, 30, 80]);
      later(onDone, 1000);
    }
  };

  return (
    <div className="screen stack center">
      <Steps at={4} />
      <h2>搖籤筒</h2>
      <p className="sub">{popped ? '一支籤跳出來了！' : HINTS.shake}</p>
      <div className="grow" />
      <div
        className="stage"
        role="button"
        tabIndex={0}
        aria-label="搖籤筒。左右拖曳，或按 Enter 搖動"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = e.clientX;
          startX.current = e.clientX;
          moved.current = 0;
        }}
        onPointerMove={(e) => {
          if (last.current == null) return;
          const dx = Math.abs(e.clientX - last.current);
          last.current = e.clientX;
          moved.current += dx;
          setTilt(Math.max(-14, Math.min(14, (e.clientX - startX.current) / 8)));
          add(dx / 1100);
        }}
        onPointerUp={() => {
          last.current = null;
          setTilt(0);
          if (moved.current < 8) add(0.12);
        }}
        onPointerCancel={() => {
          last.current = null;
          setTilt(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setTilt((t) => (t > 0 ? -8 : 8));
            add(0.12);
          }
        }}
      >
        <Cylinder tilt={tilt} progress={prog} popped={popped} />
      </div>
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${prog * 100}%` }} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ⑤ 擲筊 */
const FACES: Record<Jiaobei, ['flat' | 'round', 'flat' | 'round']> = { sheng: ['flat', 'round'], xiao: ['flat', 'flat'], yin: ['round', 'round'] };
const WORDS: Record<Jiaobei, string> = { sheng: '聖筊！', xiao: '笑筊……神明笑了', yin: '陰筊……' };

export function TossStep({ onDone }: { onDone: (kind: 'sheng' | 'yin') => void }) {
  const [faces, setFaces] = useState<['flat' | 'round', 'flat' | 'round']>(['round', 'flat']);
  const [flying, setFlying] = useState(false);
  const [verdict, setVerdict] = useState<Jiaobei | null>(null);
  const [throwNo, setThrowNo] = useState(1);
  const later = useLater();

  const toss = () => {
    if (flying) return;
    setVerdict(null);
    setFlying(true);
    buzz(20);
    later(() => {
      const v = throwJiaobei(throwNo);
      setFaces(FACES[v]);
      setFlying(false);
      setVerdict(v);
      buzz(v === 'sheng' ? [30, 40, 60] : 40);
      if (v === 'sheng') later(() => onDone('sheng'), 1100);
      else if (v === 'yin') later(() => onDone('yin'), 1500);
      else setThrowNo(2);
    }, 900);
  };

  const label = flying ? '擲出去了……' : verdict === 'xiao' ? '再擲一次' : '擲筊';
  return (
    <div className="screen stack center">
      <Steps at={5} />
      <h2>擲筊</h2>
      <p className="sub">{verdict === 'xiao' ? '神明覺得好笑，再擲一次。' : HINTS.toss}</p>
      <div className="grow" />
      <div className="blocks" aria-live="polite">
        <Block face={faces[0]} flying={flying} />
        <Block face={faces[1]} flying={flying} mirror />
      </div>
      <div className={`verdict ${verdict ?? ''}`}>{verdict ? WORDS[verdict] : ' '}</div>
      <div className="grow" />
      <button className="btn" onClick={toss} disabled={flying || verdict === 'sheng' || verdict === 'yin'}>
        {label}
      </button>
    </div>
  );
}
