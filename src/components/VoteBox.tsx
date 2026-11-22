import { useState } from 'react';
import type { Deity } from '../data/deities';
import { sendVote } from '../lib/api';
import { votes, type Vote } from '../lib/vote';

/**
 * 籤卡下方的「有感／沒感」。不畫進存圖；票數不公開；每支籤只能投一次、不能改。
 * 送出失敗也照樣顯示神明的回應（計數失敗不能影響遊戲）。
 * 用 key={fortuneId} 掛載，重抽換成新的籤時會重新開始。
 */
export function VoteBox({ fid, deity }: { fid: string; deity: Deity }) {
  const [voted, setVoted] = useState<Vote | null>(() => votes.get(fid));

  const cast = (v: Vote) => {
    if (votes.set(fid, v)) sendVote(fid, v);
    setVoted(votes.get(fid) ?? v);
  };

  if (voted) {
    return (
      <div className="vote done" role="status">
        <img className="vote-deity" src={deity.frame(voted === 'up' ? 3 : 0)} alt="" aria-hidden="true" draggable={false} />
        <p>
          <b>{deity.name}</b>
          <span>{deity.vote[voted]}</span>
        </p>
      </div>
    );
  }
  return (
    <div className="vote">
      <p className="vote-q">這支籤，你有感嗎？</p>
      <div className="row">
        <button className="btn ghost" onClick={() => cast('up')}>有感</button>
        <button className="btn ghost" onClick={() => cast('down')}>沒感</button>
      </div>
    </div>
  );
}
