// 퍼즐 종류와 단계, 그리고 씨앗으로 판을 만드는 곳.
// 같은 씨앗 → 같은 판. 오늘의 퍼즐 씨앗은 날짜로 만든다.

import { makeRng } from './rng.js';
import { generateSudoku } from './sudoku.js';
import { generateNonogram } from './nonogram.js';
import { generateFutoshiki } from './futoshiki.js';

export const PUZZLES = {
  sudoku: {
    id: 'sudoku',
    name: '스도쿠',
    tagline: '숫자를 한 번씩만!',
    levels: [
      { id: '4', label: '4×4', size: 4, givens: 6 },
      { id: '6', label: '6×6', size: 6, givens: 14 },
      { id: '9', label: '9×9', size: 9, givens: 32 },
    ],
  },
  nonogram: {
    id: 'nonogram',
    name: '네모로직',
    tagline: '숫자 따라 칠하면 그림이 짠!',
    levels: [
      { id: '5', label: '5×5', size: 5, opts: { density: 0.6 } },
      { id: '7', label: '7×7', size: 7, opts: { density: 0.56, symmetric: 0.5 } },
      { id: '10', label: '10×10', size: 10, opts: { density: 0.52, smooth: 1, symmetric: 0.5 } },
    ],
  },
  futoshiki: {
    id: 'futoshiki',
    name: '부등호 퍼즐',
    tagline: '크다 작다를 지켜요',
    levels: [
      { id: '4', label: '4×4', size: 4, opts: { minGivens: 2, minIneqs: 7 } },
      { id: '5', label: '5×5', size: 5, opts: { minGivens: 3, minIneqs: 10 } },
      { id: '6', label: '6×6', size: 6, opts: { minGivens: 4, minIneqs: 14 } },
    ],
  },
};

export const PUZZLE_IDS = Object.keys(PUZZLES);

// 다음 단계가 열리려면 앞 단계를 몇 판 풀어야 하는지
export const UNLOCK_AFTER = 2;

export function getLevel(type, levelId) {
  const p = PUZZLES[type];
  if (!p) throw new Error(`없는 퍼즐: ${type}`);
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) throw new Error(`없는 단계: ${type} ${levelId}`);
  return level;
}

export const dailySeed = (date, type, levelId) => `daily|${date}|${type}|${levelId}`;
export const practiceSeed = (type, levelId, number) => `practice|${type}|${levelId}|${number}`;

export function makePuzzle(type, levelId, seed) {
  const level = getLevel(type, levelId);
  const rng = makeRng(seed);
  let p;
  if (type === 'sudoku') p = generateSudoku(rng, level.size, level.givens);
  else if (type === 'nonogram') p = generateNonogram(rng, level.size, level.opts);
  else p = generateFutoshiki(rng, level.size, level.opts);
  return { ...p, type, levelId, seed };
}

export const dailyPuzzle = (date, type, levelId) => makePuzzle(type, levelId, dailySeed(date, type, levelId));
