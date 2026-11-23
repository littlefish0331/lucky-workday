import { useEffect, useRef, useState, type FormEvent, type PointerEvent as RPointerEvent } from 'react';
import { Block, Cylinder, StampImg } from '../components/ui';
import { HONORIFICS, honorificById } from '../data/honorifics';
import { HINTS } from '../data/texts';
import { TOPICS, TOPIC_LABEL, pickPainBatch, topicHint, type Pain } from '../data/pains';
import type { Topic } from '../engine/types';
import { NAME_MAX } from '../engine/config';
import { throwJiaobei } from '../engine/draw';
import { normalizeName } from '../engine/rng';
import type { Jiaobei } from '../engine/types';
import { buzz, vibrate } from '../lib/haptics';
import { reduceMotion, useLater } from '../lib/hooks';
import { planThrow, type BlockPlan } from '../lib/jiaobei-physics';
import type { JiaobeiScene } from '../lib/jiaobei-scene';
import { listenShake, motionSupport, requestMotionPermission } from '../lib/motion';
import { FP_H, FP_W, SEAL_FONT_FAMILY, SEAL_FONT_WEIGHT, SEAL_FRAME, fingerRings, ringFraction, sealBorderFraction, sealCells, sealCharFraction } from '../lib/scan';
import { STAMP_CAPTION } from '../lib/stamp';
import type { StampSpec } from '../lib/storage';

const FINGER_RINGS = fingerRings();
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

/* ① 信眾留名（稱呼為選填） */
export function NameStep({ initial, initialHonorific, onSubmit }: { initial: string; initialHonorific: string; onSubmit: (name: string, honorific: string) => void }) {
  const [v, setV] = useState(initial);
  const [h, setH] = useState(initialHonorific);
  const inputRef = useRef<HTMLInputElement>(null);
  const ok = normalizeName(v).length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ok) return;
    const name = v.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
    // 實驗（沒有 iPhone 實機驗證）：iOS 在搖籤頁搖手機會跳「還原輸入」，推測是這個輸入框留下的打字紀錄。
    // 換頁前先讓輸入框失焦、並直接把 DOM 的值清空（程式寫入 value 會讓瀏覽器丟掉這筆編輯紀錄）。
    // 要直接寫 DOM：這個元件會在同一次更新裡被卸載，setV('') 來不及生效。
    const el = inputRef.current;
    if (el) {
      el.blur();
      el.value = '';
    }
    onSubmit(name, h);
  };
  return (
    <form className="screen stack center" onSubmit={submit}>
      <Steps at={1} />
      <h2>信眾請留名</h2>
      <div className="grow" />
      <input
        ref={inputRef}
        className="field"
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={NAME_MAX}
        placeholder="你的名字或暱稱"
        autoComplete="off"
        autoCapitalize="off"
        enterKeyHint="go"
        aria-label="你的名字或暱稱"
        autoFocus
      />
      <div className="chips" role="radiogroup" aria-label="稱呼（可不選）">
        {HONORIFICS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={h === o.id}
            className={`chip${h === o.id ? ' on' : ''}`}
            onClick={() => setH(h === o.id ? '' : o.id)}
          >
            {o.chip}
          </button>
        ))}
      </div>
      <div className="grow" />
      <button className="btn" type="submit" disabled={!ok}>
        就是我
      </button>
    </form>
  );
}

/* ② 先選行業，再選今天的困擾（選了行業，抽籤就只抽那個行業的籤，所以第一層不能省） */
export function PainStep({ honorific, onPick }: { honorific: string; onPick: (p: Pain) => void }) {
  const seen = useRef(new Set<string>()); // 各行業已看過的痛點 id（id 不重複，放同一個 Set 就夠）
  const [topic, setTopic] = useState<Topic | null>(null);
  const [batch, setBatch] = useState<Pain[]>([]);
  const ask = honorificById(honorific).ask;

  const choose = (t: Topic) => {
    setBatch(pickPainBatch(t, seen.current));
    setTopic(t);
    window.scrollTo(0, 0);
  };

  if (!topic) {
    return (
      <div className="screen stack">
        <Steps at={2} />
        <h2>{ask}，是哪一行的？</h2>
        <div className="pains" role="list">
          {TOPICS.map((t) => (
            <button key={t} className="topic" role="listitem" onClick={() => choose(t)}>
              <b>{TOPIC_LABEL[t]}</b>
              <span>{topicHint(t)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen stack">
      <Steps at={2} />
      <h2>{ask}，今天有什麼困擾？</h2>
      <p className="sub">{TOPIC_LABEL[topic]}的困擾，選一個最像的</p>
      <div className="pains" role="list">
        {batch.map((p) => (
          <button key={p.id} className="pain" role="listitem" onClick={() => onPick(p)}>
            <b>{p.label}</b>
            <span>{p.hint}</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn ghost" onClick={() => setBatch(pickPainBatch(topic, seen.current))}>
          換一批
        </button>
        <button className="btn ghost" onClick={() => setTopic(null)}>
          換行業
        </button>
      </div>
    </div>
  );
}

/* ③ 蓋指印（或印章）：不用再按紅印泥，直接按住框起來的蓋章區 1 秒。
 * 指紋（或方印）在按下的位置，一圈一圈、一個字一個字亮起，像手機設定指紋的掃描動畫。
 * 貓掌、狗掌是趣味變化：你按指印，牠們代簽。 */
const HOLD_MS = 1000;
const SCAN_SIZE = 124; // 掃描圖示的邊長（px），和蓋好的手印同大
export function StampStep({ name, pain, spec, onDone }: { name: string; pain: string; spec: StampSpec; onDone: () => void }) {
  const [p, setP] = useState(0);
  const [hold, setHold] = useState(false);
  const [signed, setSigned] = useState(false);
  const [short, setShort] = useState(false); // 剛剛沒按滿，要提示「按久一點」
  const [at, setAt] = useState<{ x: number; y: number } | null>(null); // 掃描圖示中心，相對於蓋章區
  const raf = useRef(0);
  const t0 = useRef(0);
  const marks = useRef(0);
  const pRef = useRef(0);
  const doneRef = useRef(false);
  const zone = useRef<HTMLDivElement>(null);
  const later = useLater();
  const isSeal = spec.kind === 'seal';

  const stop = () => {
    cancelAnimationFrame(raf.current);
    if (!doneRef.current) {
      if (pRef.current > 0.02) setShort(true); // 有按下去、但沒按滿才提示
      pRef.current = 0;
      setHold(false);
      setP(0);
    }
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const tick = () => {
    const t = Math.min(1, (performance.now() - t0.current) / HOLD_MS);
    pRef.current = t;
    setP(t);
    const m = Math.floor(t * 4);
    if (m > marks.current && t < 1) {
      marks.current = m;
      vibrate(12); // 只在有震動功能的裝置震（Android）；不做畫面微震
    }
    if (t >= 1) {
      doneRef.current = true;
      setSigned(true);
      setHold(false);
      vibrate([40, 30, 70]);
      later(onDone, 1100);
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const start = (clientX?: number, clientY?: number) => {
    if (doneRef.current) return;
    const z = zone.current?.getBoundingClientRect();
    if (z) {
      // 掃描圖示放在手指按下的位置，但不能超出蓋章區
      const half = SCAN_SIZE / 2;
      const cx = clientX == null ? z.width / 2 : clientX - z.left;
      const cy = clientY == null ? z.height / 2 : clientY - z.top;
      setAt({ x: Math.min(z.width - half, Math.max(half, cx)), y: Math.min(z.height - half, Math.max(half, cy)) });
    }
    marks.current = 0;
    pRef.current = 0;
    t0.current = performance.now();
    setShort(false);
    setHold(true);
    raf.current = requestAnimationFrame(tick);
  };

  const sub = signed ? '登記完成。' : short ? HINTS.stampShort : isSeal ? HINTS.stampSeal : HINTS.stamp;
  return (
    <div className="screen stack center">
      <Steps at={3} />
      <h2>{isSeal ? '蓋個印章' : '蓋個指印'}</h2>
      <div className="contract">
        <h3>求籤登記單</h3>
        <div>
          信眾 <b>{name}</b>，因「<b>{pain}</b>」之事，來本廟求籤一支。
        </div>
        <div>抽到什麼都不退貨，明天的班照樣要上。</div>
      </div>
      <p className="sub" role="status">{sub}</p>
      <div
        ref={zone}
        className={`stampzone${hold ? ' hold' : ''}${signed ? ' done' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={isSeal ? '按住 1 秒，蓋印章' : '按住 1 秒，蓋指印'}
        onPointerDown={(e: RPointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          start(e.clientX, e.clientY);
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
      >
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
        {!hold && !signed && <span className="zone-tip">{short ? HINTS.stampShort : '按在這裡'}</span>}
        {hold && at && <ScanMark spec={spec} p={p} x={at.x} y={at.y} />}
        {signed && <SignedMark spec={spec} at={at} />}
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

/** 按住時的掃描動畫：指紋一圈一圈亮起，或方印先描框、再一個字一個字亮 */
function ScanMark({ spec, p, x, y }: { spec: StampSpec; p: number; x: number; y: number }) {
  const style = { left: x - SCAN_SIZE / 2, top: y - SCAN_SIZE / 2, width: SCAN_SIZE, height: SCAN_SIZE };
  if (spec.kind === 'seal') {
    const cells = sealCells(spec.text ?? '');
    const border = sealBorderFraction(p);
    const { outer, inner } = SEAL_FRAME;
    return (
      <svg className="scan" style={style} viewBox="0 0 100 100" aria-hidden="true">
        <rect x={outer.x} y={outer.y} width={outer.w} height={outer.w} className="scan-dim" />
        <rect x={inner.x} y={inner.y} width={inner.w} height={inner.w} className="scan-dim thin" />
        <rect x={outer.x} y={outer.y} width={outer.w} height={outer.w} className="scan-lit" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
        <rect x={inner.x} y={inner.y} width={inner.w} height={inner.w} className="scan-lit thin" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - border} />
        {cells.map((c, i) => (
          <text
            key={i}
            x={c.x}
            y={c.y}
            fontSize={c.size}
            fontFamily={SEAL_FONT_FAMILY}
            fontWeight={SEAL_FONT_WEIGHT}
            textAnchor="middle"
            dominantBaseline="central"
            className="scan-char"
            style={{ opacity: 0.16 + 0.84 * sealCharFraction(p, i, cells.length) }}
          >
            {c.ch}
          </text>
        ))}
      </svg>
    );
  }
  return (
    <svg className="scan" style={style} viewBox={`0 0 ${FP_W} ${FP_H}`} aria-hidden="true">
      {FINGER_RINGS.map((r, k) => (
        <g key={k}>
          <path d={r.d} className="scan-dim" />
          <path d={r.d} className="scan-lit" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ringFraction(p, k, FINGER_RINGS.length)} />
        </g>
      ))}
    </svg>
  );
}

/** 蓋好之後：指印／印章蓋在按下的位置；貓掌、狗掌是「代為簽收」，蓋在框的中央，旁邊多一行字 */
function SignedMark({ spec, at }: { spec: StampSpec; at: { x: number; y: number } | null }) {
  const proxy = spec.kind === 'cat' || spec.kind === 'dog';
  const pos = proxy || !at ? { left: '50%', top: '50%' } : { left: at.x, top: at.y };
  return (
    <>
      <StampImg className="signed on" spec={spec} style={pos} />
      {proxy && <span className="proxy-cap">{STAMP_CAPTION[spec.kind]}</span>}
    </>
  );
}

/* ④ 搖籤筒：像握著籤筒一樣，拿著手機上下搖；或用手指上下拖曳。兩種同時有效 */
/** 手機搖一下加多少進度（0～1）。約 14 下籤就跳出來；門檻放寬後同樣的搖法會多算很多下，所以進度不再加大 */
const SHAKE_STEP = 0.07;
/** 籤筒上下晃動的幅度（px） */
const BOB = 16;
export function ShakeStep({ onDone }: { onDone: () => void }) {
  const [prog, setProg] = useState(0);
  const [bob, setBob] = useState(0); // 籤筒上下偏移（px）
  const [popped, setPopped] = useState(false);
  // 搖手機的狀態：off = 不支援或沒授權（只剩拖曳）；ask = iOS 要點一下授權；on = 正在聽
  const [motion, setMotion] = useState<'off' | 'ask' | 'on'>(() => (motionSupport() === 'ask' ? 'ask' : motionSupport() === 'ready' ? 'on' : 'off'));
  const [motionLive, setMotionLive] = useState(false);
  const [denied, setDenied] = useState(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const startY = useRef(0);
  const moved = useRef(0);
  const progRef = useRef(0);
  const doneRef = useRef(false);
  const flip = useRef(1);
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
      setBob(0);
      buzz([30, 30, 80]);
      later(onDone, 1000);
    }
  };

  // 搖手機：每搖一下，進度加一點、籤筒往上或往下頓一下
  const addRef = useRef(add);
  addRef.current = add;
  useEffect(() => {
    if (motion !== 'on') return;
    return listenShake({
      onStroke: () => {
        flip.current = -flip.current;
        setBob(BOB * flip.current);
        later(() => setBob(0), 160); // 沒再搖就回正；繼續搖的話下一下會再蓋過去
        addRef.current(SHAKE_STEP);
      },
      onLive: () => setMotionLive(true),
      onNoData: () => setMotion((m) => (m === 'on' ? 'off' : m)), // 桌機或沒有感測器：安靜退回只剩拖曳
    });
  }, [motion]);

  const allow = async () => {
    const r = await requestMotionPermission();
    if (r === 'granted') setMotion('on');
    else {
      setMotion('off');
      setDenied(true);
    }
  };

  const hint = popped ? '一支籤跳出來了！' : motionLive ? '握住手機上下搖，或上下拖曳籤筒' : HINTS.shake;

  return (
    <div className="screen stack center">
      <Steps at={4} />
      <h2>搖籤筒</h2>
      <p className="sub">{hint}</p>
      {motion === 'ask' && !popped && (
        <button className="btn ghost shake-allow" onClick={allow}>
          用搖手機的方式搖
        </button>
      )}
      {denied && !popped && <p className="note">沒開感應也沒關係，用手指上下拖曳就行。</p>}
      <div className="grow" />
      <div
        className="stage"
        role="button"
        tabIndex={0}
        aria-label="搖籤筒。上下拖曳，或按 Enter 搖動"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = { x: e.clientX, y: e.clientY };
          startY.current = e.clientY;
          moved.current = 0;
        }}
        onPointerMove={(e) => {
          if (last.current == null) return;
          // 進度算「手指走過的總距離」，不分方向：有人還是橫著拖也不會卡住；籤筒的晃動只看上下
          const d = Math.hypot(e.clientX - last.current.x, e.clientY - last.current.y);
          last.current = { x: e.clientX, y: e.clientY };
          moved.current += d;
          setBob(Math.max(-BOB, Math.min(BOB, (e.clientY - startY.current) / 3)));
          add(d / 1100);
        }}
        onPointerUp={() => {
          last.current = null;
          setBob(0);
          if (moved.current < 8) add(0.12);
        }}
        onPointerCancel={() => {
          last.current = null;
          setBob(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setBob((b) => (b > 0 ? -10 : 10));
            add(0.12);
          }
        }}
      >
        <Cylinder bob={bob} progress={prog} popped={popped} />
      </div>
      <div className="meter" aria-hidden="true">
        <i style={{ width: `${prog * 100}%` }} />
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ⑤ 擲筊
 * 3D 版（three.js，進到這一頁才動態載入）：結果由 throwJiaobei 先決定，動畫只負責「演出」那個結果，
 * 筊杯每次落在地面不同位置。載入失敗、沒有 WebGL、或使用者要求減少動畫時，退回原本的 2D 版。 */
const FACES: Record<Jiaobei, ['flat' | 'round', 'flat' | 'round']> = { sheng: ['flat', 'round'], xiao: ['flat', 'flat'], yin: ['round', 'round'] };
const WORDS: Record<Jiaobei, string> = { sheng: '聖筊！', xiao: '笑筊……神明笑了', yin: '陰筊……' };

export function TossStep({ onDone }: { onDone: (kind: 'sheng' | 'yin') => void }) {
  const [faces, setFaces] = useState<['flat' | 'round', 'flat' | 'round']>(['round', 'flat']);
  const [flying, setFlying] = useState(false);
  const [verdict, setVerdict] = useState<Jiaobei | null>(null);
  const [throwNo, setThrowNo] = useState(1);
  // 3D：loading = 還在載入；ready = 可以用；off = 不用（失敗、減少動畫、沒有 WebGL）
  const [gl, setGl] = useState<'loading' | 'ready' | 'off'>(() => (reduceMotion() ? 'off' : 'loading'));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<JiaobeiScene | null>(null);
  const later = useLater();

  useEffect(() => {
    if (gl !== 'loading') return;
    let alive = true;
    let made: JiaobeiScene | null = null;
    // 載入太久（慢網路）就放棄 3D、改用 2D，不讓玩家一直等。之後才載好的場景會被丟掉
    const giveUp = window.setTimeout(() => {
      if (!sceneRef.current) {
        alive = false;
        setGl('off');
      }
    }, 6000);
    (async () => {
      try {
        const cv = canvasRef.current;
        if (!cv) throw new Error('no canvas');
        const { createScene } = await import('../lib/jiaobei-scene');
        made = await createScene(cv);
        if (!alive) return made.dispose();
        window.clearTimeout(giveUp);
        sceneRef.current = made;
        setGl('ready');
      } catch {
        window.clearTimeout(giveUp);
        if (alive) setGl('off');
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(giveUp);
      made?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onResize = () => sceneRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** 揭曉：顯示判定、震動，聖筊／陰筊之後進到下一步，笑筊要再擲一次 */
  const reveal = (v: Jiaobei) => {
    setFlying(false);
    setVerdict(v);
    buzz(v === 'sheng' ? [30, 40, 60] : 40);
    if (v === 'sheng') later(() => onDone('sheng'), 1100);
    else if (v === 'yin') later(() => onDone('yin'), 1500);
    else setThrowNo(2);
  };

  const toss = () => {
    if (flying) return;
    setVerdict(null);
    setFlying(true);
    buzz(20);
    const v = throwJiaobei(throwNo); // 結果先決定
    setFaces(FACES[v]);
    if (gl === 'ready' && sceneRef.current) {
      const plans: readonly [BlockPlan, BlockPlan] = planThrow(v, Math.floor(Math.random() * 2 ** 31));
      sceneRef.current.play(plans, () => later(() => reveal(v), 250));
    } else {
      later(() => reveal(v), 900);
    }
  };

  const label = gl === 'loading' ? '筊杯準備中……' : flying ? '擲出去了……' : verdict === 'xiao' ? '再擲一次' : '擲筊';
  const use3d = gl !== 'off';
  return (
    <div className="screen stack center">
      <Steps at={5} />
      <h2>擲筊</h2>
      <p className="sub">{verdict === 'xiao' ? '神明覺得好笑，再擲一次。' : HINTS.toss}</p>
      <div className="grow" />
      {/* canvas 永遠掛著（載入完成前就要量到尺寸）；3D 不可用時用 CSS 隱藏，改顯示 2D 版 */}
      <canvas ref={canvasRef} className={`toss-canvas${use3d ? '' : ' off'}`} aria-hidden="true" data-gl={gl} />
      {!use3d && (
        <div className="blocks" aria-live="polite">
          <Block face={faces[0]} flying={flying} />
          <Block face={faces[1]} flying={flying} mirror />
        </div>
      )}
      <div className={`verdict ${verdict ?? ''}`} aria-live="polite">{verdict ? WORDS[verdict] : ' '}</div>
      <div className="grow" />
      <button className="btn" onClick={toss} disabled={gl === 'loading' || flying || verdict === 'sheng' || verdict === 'yin'}>
        {label}
      </button>
    </div>
  );
}
