import { useState } from 'react';
import { plainHao } from '../engine/hao';
import { kindOf } from '../engine/types';
import type { Result } from '../lib/storage';

export function BookView({ book, onOpen, onClear, onHome }: { book: Result[]; onOpen: (r: Result) => void; onClear: () => void; onHome: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen stack">
      <h2>我的籤冊</h2>
      <p className="sub">只存在這支手機裡。換手機、清除瀏覽資料就會不見，想留著的籤請先存成圖片。</p>
      {book.length === 0 ? (
        <p className="note" style={{ padding: '40px 0' }}>還沒有籤。去求一支吧。</p>
      ) : (
        <ul className="book">
          {book.map((r) => (
            <li key={`${r.date}|${r.name}`}>
              <button onClick={() => onOpen(r)}>
                <span className={`lv ${kindOf(r.level) === 'good' ? 'g' : 'b'}`}>{r.level}</span>
                <span className="eye">{r.snap.eye}</span>
                <span className="meta">
                  {r.date}・{r.name}・{plainHao(r.hao)}
                  {r.outcome === 'rerolled' && '・改判'}
                  {r.outcome === 'resolved' && '・已化解'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grow" />
      {book.length > 0 &&
        (confirm ? (
          <div className="row">
            <button className="btn ghost" onClick={() => setConfirm(false)}>算了</button>
            <button className="btn" onClick={() => { onClear(); setConfirm(false); }}>確定清空</button>
          </div>
        ) : (
          <button className="link" onClick={() => setConfirm(true)}>清空籤冊</button>
        ))}
      <button className="btn" onClick={onHome}>回廟口</button>
    </div>
  );
}
