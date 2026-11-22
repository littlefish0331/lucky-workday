import { useEffect, useRef, useState } from 'react';
import { canReroll, isBad, needsDecision } from '../lib/play';
import { drawCard, SITE_URL } from '../lib/card';
import { copyText, saveCard, shareTexts, threadsIntentUrl, withUrl } from '../lib/share';
import type { Result } from '../lib/storage';

export function CardView({
  r, isToday, onReroll, onKeep, onResolve, onBook, onHome,
}: {
  r: Result;
  isToday: boolean;
  onReroll: () => void;
  onKeep: () => void;
  onResolve: () => void;
  onBook: () => void;
  onHome: () => void;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState('');
  // 文案進頁面時隨機挑一種；使用者發文前會自己編輯，所以不提供「換一則」
  const [shareIdx] = useState(() => Math.floor(Math.random() * 3));
  const cv = useRef<HTMLCanvasElement | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    let alive = true;
    setImg(null);
    setFailed(false);
    drawCard(r)
      .then((c) => {
        if (!alive) return;
        cv.current = c;
        setImg(c.toDataURL('image/png'));
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [r]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const say = (t: string) => {
    setToast(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(''), 2600);
  };

  const texts = shareTexts(r);
  const decide = isToday && needsDecision(r);
  const first = isToday && canReroll(r);
  const pending = decide || first;

  const onSave = async () => {
    if (!cv.current) return;
    try {
      const via = await saveCard(cv.current, `打工庇佑廟-${r.date}.png`);
      if (via === 'share') say('已交給系統。選「儲存圖片」就會進相簿');
      else if (via === 'download') say('圖片已下載。手機也可以長按圖片存圖');
      else if (via === 'longpress') say('請長按上面的圖片，選「儲存圖片」');
    } catch {
      say('存圖失敗，請長按上面的圖片儲存');
    }
  };
  const onCopy = async () => say((await copyText(withUrl(texts[shareIdx % texts.length]))) ? '文案已複製' : '複製失敗，請手動選取文字');

  return (
    <div className="screen stack">
      {toast && <div className="toast" role="status">{toast}</div>}
      <div className="cardwrap">
        {img ? (
          <img className="cardimg" src={img} alt={`${r.level}：${r.snap.eye}`} />
        ) : (
          <div className="cardskel">{failed ? '籤卡畫不出來，請重新整理' : '神明正在提筆……'}</div>
        )}
      </div>

      <p className="invite">
        你也來求一支，看看今天能不能準時下班
        <br />
        <b>{SITE_URL.replace('https://', '').replace(/\/$/, '')}</b>
      </p>

      {pending && (
        <div className="stack">
          {first && <p className="note">這支籤……要不要再問一次？敲木魚積功德，神明可能願意重抽。</p>}
          {decide && <p className="note">重抽之後還是凶。認命收下，或再敲一輪木魚化解。</p>}
        </div>
      )}

      <div className="actions stack">
        {first && <button className="btn gold" onClick={onReroll}>敲木魚積功德，重抽一次</button>}
        {decide && <button className="btn gold" onClick={onResolve}>再敲一輪木魚，化解它</button>}
        {pending && <button className="btn ghost" onClick={onKeep}>認命，收下這支</button>}
        {!pending && (
          <>
            <button className="btn" onClick={onSave} disabled={!img}>存成圖片</button>
            <div className="sharebox" aria-label="分享文案">{texts[shareIdx % texts.length]}</div>
            <div className="row">
              <a className="btn gold" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }} href={threadsIntentUrl(texts[shareIdx % texts.length])} target="_blank" rel="noopener noreferrer">
                去 Threads 發文
              </a>
              <button className="btn ghost" onClick={onCopy}>複製文案</button>
            </div>
            {isBad(r) && r.outcome === 'kept' && <p className="note">認命的人最有福氣。明天的籤，明天再說。</p>}
          </>
        )}
        {pending && <button className="btn ghost" onClick={onSave} disabled={!img}>先把這張存下來</button>}
        <div className="row">
          <button className="link" onClick={onBook}>我的籤冊</button>
          <button className="link" onClick={onHome}>回廟口</button>
        </div>
      </div>
    </div>
  );
}
