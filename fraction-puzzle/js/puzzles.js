// 문제 종류마다 놀이판(가운데)과 도구(옆/아래)를 꾸민다.
// 각 퍼즐은 { response(), relayout(), lock(), destroy() } 를 돌려준다.
import { Board } from './board.js';
import { NumberLine } from './numberline.js';
import { Keypad } from './keypad.js';
import { html, jo } from './num.js';
import { needCells, givenCells } from './judge.js';
import { sfx } from './audio.js';

const h = (tag, cls, inner = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (inner) e.innerHTML = inner;
  return e;
};

function goButton(label, onClick) {
  const b = h('button', 'go', label);
  b.dataset.act = 'check';
  b.addEventListener('click', onClick);
  return b;
}

// 놀이판 안쪽 크기 (안쪽 여백 빼고)
function sizeOf(el) {
  const cs = getComputedStyle(el);
  return {
    w: el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  };
}

// ---------- 나누고 칠하기 ----------
function makePuzzle(p, ctx) {
  const { stage, side } = ctx;
  const variable = p.model === 'pizza' && p.cells === null;
  let cuts = variable ? 1 : p.cells;
  const need = needCells(p);
  const word = p.model === 'pizza' ? '조각' : '칸';
  const tools = h('div', 'tools');
  let cutEl = null;
  if (variable) {
    const st = h('div', 'stepper', `
      <div class="tool-title">피자 나누기</div>
      <div class="step-row">
        <button class="step" data-act="less" aria-label="조각 줄이기">−</button>
        <div class="cuts"><b data-cuts>1</b><span>조각</span></div>
        <button class="step" data-act="more" aria-label="조각 늘리기">+</button>
      </div>`);
    cutEl = st.querySelector('[data-cuts]');
    st.querySelector('[data-act=less]').addEventListener('click', () => setCuts(cuts - 1));
    st.querySelector('[data-act=more]').addEventListener('click', () => setCuts(cuts + 1));
    tools.appendChild(st);
  }
  const counter = h('div', 'counter', `칠한 ${word} <b data-count>0</b>개`);
  tools.appendChild(counter);
  side.appendChild(tools);

  const board = new Board({
    model: p.model, units: p.units, cells: cuts, tag: 'main',
    layout: p.model === 'bar10' ? 'col' : 'auto',
    onChange: (n) => { sfx.pop(); update(n); },
  });
  stage.appendChild(board.root);

  let pad = null;
  if (p.write) {
    pad = new Keypad({ type: p.write === 'dec' ? 'dec' : 'frac' });
    side.appendChild(pad.root);
  }
  side.appendChild(goButton('확인', () => ctx.submit()));

  function setCuts(n) {
    n = Math.max(1, Math.min(12, n));
    if (n === cuts) return;
    cuts = n;
    cutEl.textContent = n;
    sfx.cut();
    board.setCells(n);
    relayout();
  }
  function update(n = board.count()) {
    counter.querySelector('[data-count]').textContent = n;
    if (pad) {
      const ready = n === need && (!variable || cuts === p.target.d);
      pad.setEnabled(ready, ready ? '' : '먼저 알맞게 칠해요');
    }
  }
  function relayout() { const s = sizeOf(stage); board.fit(s.w - 8, s.h - 8); }
  update(0);
  return {
    board, pad,
    response: () => ({ cuts, painted: board.count(), answer: pad ? pad.value() : undefined }),
    relayout,
    lock(on) { board.setEnabled(!on); },
    destroy() { board.destroy(); },
  };
}

// ---------- 크기 비교 ----------
function comparePuzzle(p, ctx) {
  const { stage, side } = ctx;
  const [needA, needB] = needCells(p);
  const rows = [];
  const mk = (num, cells, tone, need, tag) => {
    const row = h('div', 'cmp-row');
    const lab = h('div', 'cmp-label', `${html(num)}<span class="ok-mark">✔</span>`);
    const board = new Board({
      model: p.model, units: p.units, cells, tone, layout: p.model === 'grid100' ? 'auto' : 'row', tag,
      onChange: (n) => { sfx.pop(); lab.classList.toggle('ok', n === need); update(); },
    });
    row.append(lab, board.root);
    stage.appendChild(row);
    rows.push({ row, lab, board });
    return board;
  };
  const A = mk(p.a, p.cellsA, 'a', needA, 'a');
  const B = mk(p.b, p.cellsB, 'b', needB, 'b');
  stage.classList.add('stage-cmp');

  const tools = h('div', 'tools');
  const expr = h('div', 'cmp-expr', `${html(p.a)}<span class="sign-slot" data-sign-slot>?</span>${html(p.b)}`);
  const hint = h('div', 'pad-hint', '두 막대를 먼저 칠해요');
  const signs = h('div', 'signs');
  let chosen = null;
  ['<', '=', '>'].forEach((s) => {
    const b = h('button', 'sign', s);
    b.dataset.sign = s;
    b.addEventListener('click', () => {
      if (signs.classList.contains('off')) return;
      chosen = s;
      expr.querySelector('[data-sign-slot]').textContent = s;
      ctx.submit();
    });
    signs.appendChild(b);
  });
  tools.append(expr, signs, hint);
  side.appendChild(tools);

  function update() {
    const ready = A.count() === needA && B.count() === needB;
    signs.classList.toggle('off', !ready);
    hint.textContent = ready ? '어느 쪽이 클까요? 기호를 눌러요' : (p.model === 'grid100' ? '두 모눈을 먼저 알맞게 칠해요' : '두 막대를 먼저 알맞게 칠해요');
  }
  // 막대는 길이를 견주도록 늘 위아래로, 모눈은 화면이 넓으면 나란히 놓는다
  function relayout() {
    const s = sizeOf(stage);
    const wide = p.model === 'grid100' && s.w > s.h * 1.1;
    stage.classList.toggle('side-by-side', wide);
    if (wide) {
      const labH = rows[0].lab.getBoundingClientRect().height + 12;
      rows.forEach((r) => r.board.fit(s.w / 2 - 20, s.h - labH - 8));
    } else {
      const labW = rows[0].lab.getBoundingClientRect().width + 16;
      rows.forEach((r) => r.board.fit(s.w - labW - 8, s.h / 2 - 16));
    }
  }
  update();
  return {
    response: () => ({ paintA: A.count(), paintB: B.count(), sign: chosen }),
    relayout,
    lock(on) { A.setEnabled(!on); B.setEnabled(!on); },
    reset() { chosen = null; expr.querySelector('[data-sign-slot]').textContent = '?'; },
    destroy() { A.destroy(); B.destroy(); },
  };
}

// ---------- 덧셈·뺄셈 ----------
function opPuzzle(p, ctx) {
  const { stage, side } = ctx;
  const need = needCells(p);
  const plus = p.op === '+';
  const eq = h('div', 'eq', `${html(p.a)}<span class="op">${plus ? '+' : '−'}</span>${html(p.b)}<span class="op">=</span><span class="q">?</span>`);
  stage.appendChild(eq);
  stage.classList.add('stage-op');
  const board = new Board({
    model: p.model, units: p.units, cells: p.cells, given: givenCells(p), mode: plus ? 'paint' : 'cross',
    tone: 'op', tag: 'main', layout: p.model === 'grid100' ? 'auto' : 'col',
    onChange: (n) => { sfx.pop(); update(n); },
  });
  stage.appendChild(board.root);

  const tools = h('div', 'tools');
  const counter = h('div', 'counter', `${plus ? '더 칠한 칸' : '✕ 한 칸'} <b data-count>0</b>개 <span class="ok-mark">✔</span>`);
  tools.appendChild(counter);
  side.appendChild(tools);
  const pad = new Keypad({ type: p.answerType });
  side.appendChild(pad.root);
  side.appendChild(goButton('확인', () => ctx.submit()));

  function update(n = board.count()) {
    counter.querySelector('[data-count]').textContent = n;
    const ready = n === need;
    counter.classList.toggle('ok', ready);
    pad.setEnabled(ready, ready ? '' : plus ? '먼저 더하는 만큼 칠해요' : '먼저 빼는 만큼 ✕로 지워요');
  }
  function relayout() {
    const s = sizeOf(stage);
    board.fit(s.w - 8, s.h - eq.getBoundingClientRect().height - 20);
  }
  update(0);
  return {
    board, pad,
    response: () => ({ marked: board.count(), answer: pad.value() }),
    relayout,
    lock(on) { board.setEnabled(!on); },
    destroy() { board.destroy(); },
  };
}

// ---------- 수직선 ----------
function linePlacePuzzle(p, ctx) {
  const { stage, side } = ctx;
  const ask = h('div', 'line-ask', `${html(p.target)}<span>${jo(p.target, '은/는')} 어디일까요?</span>`);
  stage.appendChild(ask);
  const nl = new NumberLine({ line: p.line, labels: p.labels, mode: 'flag', onChange: () => sfx.tap() });
  stage.appendChild(nl.root);
  stage.classList.add('stage-line');
  const tools = h('div', 'tools', '<div class="pad-hint">깃발을 손가락으로 끌어서 옮겨요. 수직선을 톡 눌러도 돼요.</div>');
  side.appendChild(tools);
  side.appendChild(goButton('확인', () => ctx.submit()));
  return {
    nl,
    response: () => ({ tick: nl.tick }),
    relayout() {},
    lock(on) { nl.setEnabled(!on); },
    destroy() {},
  };
}

function lineCardsPuzzle(p, ctx) {
  const { stage, side } = ctx;
  const go = goButton('확인', () => ctx.submit());
  const nl = new NumberLine({
    line: p.line, labels: p.labels, mode: 'cards', points: p.points, cards: p.cards,
    onChange: (place) => { sfx.tap(); go.disabled = Object.keys(place).length < p.cards.length; },
  });
  stage.appendChild(nl.root);
  stage.classList.add('stage-line');
  const tools = h('div', 'tools', '<div class="pad-hint">분수 카드는 수직선 위 칸에, 소수 카드는 아래 칸에 들어가요. 카드를 톡 누르고 점을 눌러도 돼요.</div>');
  side.appendChild(tools);
  side.appendChild(go);
  go.disabled = true;
  return {
    nl,
    response: () => ({ place: { ...nl.place } }),
    relayout() {},
    lock(on) { nl.setEnabled(!on); },
    destroy() {},
  };
}

export function createPuzzle(p, ctx) {
  const make = { make: makePuzzle, compare: comparePuzzle, op: opPuzzle, 'line-place': linePlacePuzzle, 'line-cards': lineCardsPuzzle }[p.kind];
  const pz = make(p, ctx);
  requestAnimationFrame(() => pz.relayout());
  return pz;
}
