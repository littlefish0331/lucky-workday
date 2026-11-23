import { describe, expect, it } from 'vitest';
import { FP_RINGS, fingerRings, ringFraction, sealBorderFraction, sealCharFraction, sealCells, sealText } from '../src/lib/scan';

describe('指紋掃描動畫的資料', () => {
  it('固定算出 12 圈，每圈都有可畫的 path，而且每次結果一樣', () => {
    const a = fingerRings();
    expect(a.length).toBe(FP_RINGS);
    expect(a.every((r) => /^M [\d. -]+ A [\d. ]+ 0 1 1 [\d. -]+$/.test(r.d))).toBe(true);
    expect(fingerRings()).toEqual(a);
  });

  it('由內往外：半徑一圈比一圈大，而且都在 100×130 的畫布裡', () => {
    const rs = fingerRings();
    for (let i = 1; i < rs.length; i++) {
      expect(rs[i].rx).toBeGreaterThan(rs[i - 1].rx);
      expect(rs[i].ry).toBeGreaterThan(rs[i - 1].ry);
    }
    for (const r of rs) {
      expect(r.cx - r.rx).toBeGreaterThanOrEqual(0);
      expect(r.cx + r.rx).toBeLessThanOrEqual(100);
      expect(r.cy - r.ry).toBeGreaterThanOrEqual(0);
      expect(r.cy + r.ry).toBeLessThanOrEqual(130);
    }
  });

  it('進度 0 時全暗、進度 1 時全亮；中間一圈接一圈（不會後面的圈比前面先亮）', () => {
    const n = FP_RINGS;
    for (let k = 0; k < n; k++) {
      expect(ringFraction(0, k, n)).toBe(0);
      expect(ringFraction(1, k, n)).toBe(1);
    }
    for (const p of [0.1, 0.33, 0.5, 0.77, 0.95]) {
      for (let k = 1; k < n; k++) expect(ringFraction(p, k, n)).toBeLessThanOrEqual(ringFraction(p, k - 1, n));
    }
    // 進度 50%：前 6 圈全亮、後 6 圈全暗
    expect(ringFraction(0.5, 5, n)).toBe(1);
    expect(ringFraction(0.5, 6, n)).toBe(0);
  });

  it('進度會被夾在 0～1（超出也不爆）', () => {
    expect(ringFraction(-1, 3, 12)).toBe(0);
    expect(ringFraction(9, 3, 12)).toBe(1);
  });
});

describe('印章', () => {
  it('只取漢字、最多 4 個；沒有漢字就是空字串', () => {
    expect(sealText('王小明')).toBe('王小明');
    expect(sealText('  王 小 明  ')).toBe('王小明');
    expect(sealText('Amy王')).toBe('王');
    expect(sealText('歐陽小明明')).toBe('歐陽小明');
    expect(sealText('Amy')).toBe('');
    expect(sealText('😀 007')).toBe('');
    expect(sealText('')).toBe('');
  });

  it('1～4 個字的排版：數量對、都在內框裡、不重疊、第一個字在最右上', () => {
    for (const t of ['王', '王小', '王小明', '王小明陳']) {
      const cells = sealCells(t);
      expect(cells.length).toBe([...t].length);
      for (const c of cells) {
        expect(c.x - c.size / 2).toBeGreaterThanOrEqual(13);
        expect(c.x + c.size / 2).toBeLessThanOrEqual(87);
        expect(c.y - c.size / 2).toBeGreaterThanOrEqual(13);
        expect(c.y + c.size / 2).toBeLessThanOrEqual(87);
      }
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++) {
          const apart = Math.max(Math.abs(cells[i].x - cells[j].x), Math.abs(cells[i].y - cells[j].y));
          expect(apart).toBeGreaterThanOrEqual((cells[i].size + cells[j].size) / 2 - 1); // 方塊不重疊（容許 1 單位的誤差）
        }
    }
    const four = sealCells('甲乙丙丁');
    expect(four[0].x).toBeGreaterThan(four[2].x); // 右欄先
    expect(four[0].y).toBeLessThan(four[1].y); // 同欄由上往下
  });

  it('動畫順序：先描方框，描完才一個字一個字亮；進度 1 時全部亮', () => {
    expect(sealBorderFraction(0)).toBe(0);
    expect(sealBorderFraction(0.15)).toBeCloseTo(0.5);
    expect(sealBorderFraction(0.3)).toBe(1);
    expect(sealCharFraction(0.3, 0, 4)).toBe(0); // 框剛描完，字還沒開始
    expect(sealCharFraction(1, 3, 4)).toBe(1);
    for (const n of [1, 2, 3, 4]) {
      for (const p of [0.35, 0.6, 0.85]) for (let i = 1; i < n; i++) expect(sealCharFraction(p, i, n)).toBeLessThanOrEqual(sealCharFraction(p, i - 1, n));
      expect(sealCharFraction(1, n - 1, n)).toBe(1);
    }
    expect(sealCharFraction(0.5, 0, 0)).toBe(0); // 沒有字也不爆
  });
});
