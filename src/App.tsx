import { useEffect, useMemo, useRef, useState } from 'react';
import { art } from './data/art';
import { FORTUNES, SPECIAL_YIN, fortuneById } from './data/fortunes';
import type { Pain } from './data/pains';
import { drawFortune, knocksNeeded } from './engine/draw';
import { normalizeName, taipeiDateKey } from './engine/rng';
import { kindOf, type Topic } from './engine/types';
import { fetchStats, countHit, countKnock, type Stats } from './lib/api';
import { applyKeep, applyReroll, applyResolve, buildResult } from './lib/play';
import { clearBook, findResult, loadStore, randomStamp, saveResult, setName as persistName, type Result, type StampSpec } from './lib/storage';
import { BookView } from './screens/BookView';
import { CardView } from './screens/CardView';
import { NameStep, PainStep, ShakeStep, StampStep, TossStep } from './screens/Steps';
import { WoodFishStep } from './screens/WoodFishStep';

type View =
  | { s: 'home' }
  | { s: 'name' }
  | { s: 'pain' }
  | { s: 'stamp' }
  | { s: 'shake' }
  | { s: 'toss' }
  | { s: 'card'; r: Result; today: boolean }
  | { s: 'wood'; kind: 'reroll' | 'resolve'; topic: Topic; target: number }
  | { s: 'book' };

export function App() {
  const [store, setStore] = useState(loadStore);
  const [view, setView] = useState<View>({ s: 'home' });
  const [stats, setStats] = useState<Stats | null>(null);
  const play = useRef<{ name: string; honorific: string; pain: Pain | null; stamp: StampSpec; result: Result | null }>({
    name: '', honorific: '', pain: null, stamp: randomStamp(), result: null,
  });
  const date = useMemo(() => taipeiDateKey(), []);

  useEffect(() => {
    let alive = true;
    fetchStats().then((s) => alive && setStats(s));
    return () => { alive = false; };
  }, []);

  // 手機瀏覽器的返回鍵：回到首頁而不是離開網站
  useEffect(() => {
    const onPop = () => setView({ s: 'home' });
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = (v: View) => {
    if (v.s !== 'home') history.pushState({ s: v.s }, '');
    window.scrollTo(0, 0);
    setView(v);
  };

  const commit = (r: Result) => {
    play.current.result = r;
    setStore(saveResult(r));
    return r;
  };

  const start = () => {
    const name = store.name;
    // 回訪：同名同日已經抽過 → 直接給看，不重跑儀式
    const hit = name ? findResult(store, name, date) : null;
    if (hit) { play.current.result = hit; return go({ s: 'card', r: hit, today: true }); }
    play.current.stamp = randomStamp();
    play.current.honorific = store.honorific ?? '';
    go({ s: 'name' });
  };

  const afterName = (name: string, honorific: string) => {
    setStore(persistName(name, honorific || undefined));
    play.current.name = name;
    play.current.honorific = honorific;
    const hit = findResult(loadStore(), name, date);
    if (hit) { play.current.result = hit; return go({ s: 'card', r: hit, today: true }); }
    go({ s: 'pain' });
  };

  /** 儀式結束：抽籤、記錄、計數、進入籤卡 */
  const reveal = (special?: 'yin') => {
    const { name, honorific, pain, stamp } = play.current;
    const topic = pain?.topic ?? 'office';
    const fortune = special
      ? SPECIAL_YIN
      : drawFortune(FORTUNES, { name, dateKey: date, attempt: 0, pain: pain?.label ?? null, topic });
    if (!fortune) return go({ s: 'home' });
    const r = commit(buildResult({ name, honorific, date, pain: special ? '' : pain?.label ?? '', topic, stamp, fortune, special }));
    if (!special) countHit(fortune.id);
    go({ s: 'card', r, today: true });
  };

  const startWood = (kind: 'reroll' | 'resolve') => {
    const r = play.current.result;
    if (!r) return;
    go({ s: 'wood', kind, topic: r.topic, target: knocksNeeded(kind === 'resolve' ? 'resolve' : r.level) });
  };

  const afterWood = (kind: 'reroll' | 'resolve', taps: number) => {
    const r = play.current.result;
    if (!r) return go({ s: 'home' });
    countKnock(Math.min(40, Math.max(1, taps)));
    if (kind === 'resolve') {
      const next = commit(applyResolve(r, taps));
      return go({ s: 'card', r: next, today: true });
    }
    const pain = play.current.pain;
    const next = drawFortune(FORTUNES, {
      name: r.name, dateKey: r.date, attempt: 1, pain: pain?.label ?? r.pain, topic: pain?.topic ?? r.topic, excludeIds: [r.fortuneId],
    });
    if (!next) return go({ s: 'card', r, today: true });
    const out = commit(applyReroll(r, next, taps));
    countHit(next.id);
    go({ s: 'card', r: out, today: true });
  };

  const openFromBook = (r: Result) => {
    const isToday = r.date === date && normalizeName(r.name) === normalizeName(store.name);
    if (isToday) play.current.result = r;
    go({ s: 'card', r, today: isToday });
  };

  const v = view;
  return (
    <div className="app">
      {v.s === 'home' && (
        <div className="screen center">
          <div className="hero" style={{ backgroundImage: `url(${art.hero})` }}>
            <div className="brand">
              <h1>打工庇佑廟</h1>
              <p className="tagline">職場很莫名其廟，來拜一下</p>
            </div>
            <button className="btn cta" onClick={start}>{store.name && findResult(store, store.name, date) ? '看今天的籤' : '進廟求籤'}</button>
            {store.book.length > 0 && <button className="link" onClick={() => go({ s: 'book' })}>我的籤冊（{store.book.length}）</button>}
            <div className="small stats" aria-live="polite">
              {stats && stats.today > 0 ? `今天已有 ${stats.today.toLocaleString()} 位打工人求籤` : ' '}
            </div>
            <footer>籤詩純屬娛樂，人生由你作主。</footer>
          </div>
        </div>
      )}

      {v.s === 'name' && <NameStep initial={store.name} initialHonorific={store.honorific ?? ''} onSubmit={afterName} />}
      {v.s === 'pain' && <PainStep honorific={play.current.honorific} onPick={(p) => { play.current.pain = p; go({ s: 'stamp' }); }} />}
      {v.s === 'stamp' && <StampStep name={play.current.name} pain={play.current.pain?.label ?? ''} spec={play.current.stamp} onDone={() => go({ s: 'shake' })} />}
      {v.s === 'shake' && <ShakeStep onDone={() => go({ s: 'toss' })} />}
      {v.s === 'toss' && <TossStep onDone={(k) => reveal(k === 'yin' ? 'yin' : undefined)} />}
      {v.s === 'wood' && <WoodFishStep key={v.kind} kind={v.kind} target={v.target} topic={v.topic} onDone={(n) => afterWood(v.kind, n)} />}
      {v.s === 'card' && (
        <CardView
          r={v.r}
          isToday={v.today}
          onReroll={() => startWood('reroll')}
          onResolve={() => startWood('resolve')}
          onKeep={() => { const r = play.current.result; if (r) go({ s: 'card', r: commit(applyKeep(r)), today: true }); }}
          onBook={() => go({ s: 'book' })}
          onHome={() => go({ s: 'home' })}
        />
      )}
      {v.s === 'book' && (
        <BookView book={store.book} onOpen={openFromBook} onClear={() => setStore(clearBook())} onHome={() => go({ s: 'home' })} />
      )}
    </div>
  );
}

// 保留給測試與除錯：確認陰筊隱藏款屬於吉側，不會誤入「重抽」流程
export const _debug = { fortuneById, kindOf };
