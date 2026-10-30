// 틀렸을 때 보여 주는 그림: 바르게 칠한 판, 내가 한 것, 수직선의 정답 자리, 소수 세로셈
import { Board, PAINT, GIVEN, CROSS } from './board.js';
import { NumberLine } from './numberline.js';
import { html, val } from './num.js';
import { needCells, givenCells, resultOf } from './judge.js';
import { toDecimalString } from './rational.js';
import { pointName } from './text.js';

const h = (tag, cls, inner = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (inner) e.innerHTML = inner;
  return e;
};

function filled(n, count, kind = PAINT) {
  const s = new Int8Array(n);
  for (let i = 0; i < count; i++) s[i] = kind;
  return s;
}

function numberCells(board, count) {
  if (board.units * board.cells > 40 || board.model === 'grid100') return;
  for (let i = 0; i < count; i++) board.label(i, String(i + 1));
}

function figure(caption, board, cls = '') {
  const f = h('figure', `ex-fig ${cls}`);
  f.appendChild(board.root);
  f.appendChild(h('figcaption', '', caption));
  return f;
}

// 소수 세로셈 (소수점 줄 맞추기)
function columnCalc(p) {
  const P = Math.max(p.a.p, p.b.p);
  const sa = toDecimalString(val(p.a), P), sb = toDecimalString(val(p.b), P);
  const sr = toDecimalString(resultOf(p), P);
  const width = Math.max(sa.length, sb.length, sr.length);
  const row = (s, sign = '') => `<tr><td class="sg">${sign}</td>${s.padStart(width, ' ').split('').map((c) => `<td class="${c === '.' ? 'pt' : ''}">${c.trim()}</td>`).join('')}</tr>`;
  return h('table', 'colcalc', `${row(sa)}${row(sb, p.op === '+' ? '+' : '−')}<tr class="rule"><td colspan="${width + 1}"></td></tr>${row(sr)}`);
}

export function explainPicture(p, res, r, snap) {
  const wrap = h('div', 'ex-pic');
  const boards = [];
  const add = (b) => { boards.push(b); return b; };

  if (p.kind === 'make') {
    const cells = p.model === 'pizza' ? p.target.d : p.cells;
    const need = needCells(p);
    if ((r.reason === 'cuts' || r.reason === 'count') && snap) {
      const mine = add(new Board({ model: p.model, units: p.units, cells: snap.cells, interactive: false, states: snap.state, tone: 'mine' }));
      wrap.appendChild(figure('내가 한 것', mine, 'mine'));
    }
    const good = add(new Board({ model: p.model, units: p.units, cells, interactive: false, states: filled(p.units * cells, need) }));
    numberCells(good, need);
    wrap.appendChild(figure(`이렇게 해요: ${html(p.target)}`, good, 'good'));
  } else if (p.kind === 'compare') {
    const [na, nb] = needCells(p);
    const col = h('div', 'ex-cmp');
    [[p.a, p.cellsA, na, 'a'], [p.b, p.cellsB, nb, 'b']].forEach(([num, cells, n, tone]) => {
      const b = add(new Board({ model: p.model, units: p.units, cells, interactive: false, states: filled(p.units * cells, n), tone, layout: 'row' }));
      const row = h('div', 'cmp-row', `<div class="cmp-label">${html(num)}</div>`);
      row.appendChild(b.root);
      col.appendChild(row);
    });
    wrap.appendChild(col);
    if (r.reason === 'sign') wrap.appendChild(h('div', 'ex-big', `${html(p.a)}<span class="sg">${r.want}</span>${html(p.b)}`));
  } else if (p.kind === 'op') {
    const A = givenCells(p), B = needCells(p);
    const s = filled(p.units * p.cells, A, GIVEN);
    if (p.op === '+') for (let i = A; i < A + B; i++) s[i] = PAINT;
    else for (let i = A - B; i < A; i++) s[i] = CROSS;
    const b = add(new Board({ model: p.model, units: p.units, cells: p.cells, interactive: false, states: s, tone: 'op', layout: p.model === 'grid100' ? 'auto' : 'col' }));
    const fig = figure(`${html(p.a)} ${p.op === '+' ? '+' : '−'} ${html(p.b)}`, b, 'good');
    wrap.appendChild(fig);
    if (p.answerType === 'dec') wrap.appendChild(columnCalc(p));
  } else if (p.kind === 'line-place') {
    const marks = [{ k: r.want, cls: 'good', inner: html(p.target) }];
    if (typeof r.got === 'number' && r.got !== r.want) marks.push({ k: r.got, cls: 'mine', inner: '내 깃발' });
    wrap.appendChild(new NumberLine({ line: p.line, labels: p.labels, mode: 'static', marks }).root);
  } else if (p.kind === 'line-cards') {
    // 점 이름만 달고, 어떤 카드가 가는지는 아래 설명 줄에 쓴다
    const marks = p.points.map((k, i) => ({ k, cls: 'good', inner: pointName(i) }));
    wrap.appendChild(new NumberLine({ line: p.line, labels: p.labels, mode: 'static', marks }).root);
  }

  return {
    el: wrap,
    // w: 그림 칸의 너비. 그림 둘레 여백(20)과 그림 사이 간격(18)을 빼고 나눈다
    fit(w, hgt) {
      if (!boards.length) return;
      if (p.kind === 'compare') boards.forEach((b) => b.fit(w - 110, hgt / 2 - 10));
      else if (boards.length === 2) boards.forEach((b) => b.fit((w - 18 - 48) / 2, hgt - 40));
      else boards[0].fit((p.kind === 'op' && p.answerType === 'dec' ? w - 240 : w) - 20, hgt - 40);
    },
  };
}
