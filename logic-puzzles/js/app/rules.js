// 퍼즐 규칙 설명 (만 10세가 읽기 쉬운 말)

import { h, svg } from './dom.js';
import { owl } from './art.js';
import { voice } from './voice.js';

function exampleSudoku() {
  // 4×4 정답 판 하나: 같은 숫자가 줄·네모마다 한 번씩
  const g = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
  let s = '';
  g.forEach((v, i) => {
    const r = Math.floor(i / 4), c = i % 4;
    const x = 4 + c * 40 + (c >= 2 ? 4 : 0), y = 4 + r * 40 + (r >= 2 ? 4 : 0);
    const hl = r === 1 ? '#e2eeff' : c === 2 ? '#fff6cf' : '#fff';
    s += `<rect x="${x}" y="${y}" width="38" height="38" rx="5" fill="${hl}"/><text x="${x + 19}" y="${y + 27}" text-anchor="middle" font-size="22" font-weight="900" fill="#26213f" font-family="sans-serif">${v}</text>`;
  });
  return svg(`<svg viewBox="0 0 170 170"><rect width="170" height="170" rx="12" fill="#26213f"/>${s}</svg>`);
}

function exampleNonogram() {
  // 한 줄 예: 단서 '2 1' → ■■ □ ■ □
  const line = [1, 1, 0, 1, 0];
  let s = '<text x="30" y="32" text-anchor="middle" font-size="20" font-weight="900" fill="#26213f" font-family="sans-serif">2 1</text>';
  line.forEach((v, k) => {
    s += `<rect x="${58 + k * 32}" y="10" width="30" height="30" rx="4" fill="${v ? '#1f9d6b' : '#fff'}" stroke="#26213f" stroke-width="2"/>`;
  });
  const line2 = [0, 1, 1, 1, 0];
  s += '<text x="30" y="76" text-anchor="middle" font-size="20" font-weight="900" fill="#26213f" font-family="sans-serif">3</text>';
  line2.forEach((v, k) => {
    s += `<rect x="${58 + k * 32}" y="54" width="30" height="30" rx="4" fill="${v ? '#1f9d6b' : '#fff'}" stroke="#26213f" stroke-width="2"/>`;
  });
  return svg(`<svg viewBox="0 0 222 94">${s}</svg>`);
}

function exampleFutoshiki() {
  const box = (x, y, t) => `<rect x="${x}" y="${y}" width="44" height="44" rx="9" fill="#fff" stroke="#26213f" stroke-width="3"/><text x="${x + 22}" y="${y + 31}" text-anchor="middle" font-size="24" font-weight="900" fill="#ea7a1c" font-family="sans-serif">${t}</text>`;
  const lt = (x, y, rot) => `<path d="M${x + 6} ${y - 9} L${x - 5} ${y} L${x + 6} ${y + 9}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="#26213f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg(`<svg viewBox="0 0 200 140">${box(6, 6, 1)}${lt(70, 28, 0)}${box(90, 6, 3)}
    ${lt(28, 70, 90)}${box(6, 90, 2)}<text x="160" y="36" font-size="18" font-weight="800" fill="#26213f" font-family="sans-serif">1 &lt; 3</text>
    <text x="66" y="118" font-size="18" font-weight="800" fill="#26213f" font-family="sans-serif">위 1 &lt; 아래 2</text></svg>`);
}

export const RULES = {
  sudoku: (lv) => ({
    title: '스도쿠 규칙',
    items: [
      `가로줄 하나에 1부터 ${lv.size}까지 숫자가 한 번씩 들어가요.`,
      '세로줄 하나에도 한 번씩 들어가요.',
      '굵은 선으로 묶인 네모 안에도 한 번씩 들어가요.',
      '빈칸을 모두 채우면 성공!',
    ],
    how: '빈칸을 누르고 숫자 단추를 눌러요. 같은 숫자를 한 번 더 누르면 지워져요. ‘메모’를 켜면 들어갈 것 같은 숫자를 작게 적어 둘 수 있어요.',
    example: exampleSudoku,
  }),
  nonogram: () => ({
    title: '네모로직 규칙',
    items: [
      '줄 옆과 위에 있는 숫자는, 그 줄에서 이어서 칠해야 하는 칸의 수예요.',
      '숫자가 여러 개면 그 순서대로 칠하고, 묶음과 묶음 사이에는 빈칸이 한 칸 이상 있어요.',
      '모든 가로줄과 세로줄이 숫자와 맞으면 숨은 그림이 나타나요!',
    ],
    how: '칸을 누르면 칠해지고, 손가락으로 쭉 밀면 여러 칸을 한 번에 칠해요. ‘X 표시’로 바꾸면 비워 둘 칸에 X를 쳐 둘 수 있어요. 다 맞은 줄의 숫자는 흐려져요.',
    example: exampleNonogram,
  }),
  futoshiki: (lv) => ({
    title: '부등호 퍼즐 규칙',
    items: [
      `가로줄 하나에 1부터 ${lv.size}까지 숫자가 한 번씩 들어가요.`,
      '세로줄 하나에도 한 번씩 들어가요.',
      '칸 사이에 부등호가 있으면 꼭 지켜요. 벌어진 쪽이 큰 수, 뾰족한 쪽이 작은 수예요.',
      '위아래 칸 사이의 ∧, ∨ 도 똑같아요. 뾰족한 쪽이 작은 수!',
    ],
    how: '빈칸을 누르고 숫자 단추를 눌러요. 부등호가 맞지 않으면 기호가 빨개져요. ‘메모’로 후보 숫자를 적어 두면 편해요.',
    example: exampleFutoshiki,
  }),
};

export function showRules(type, level, onClose) {
  const r = RULES[type](level);
  const close = () => { ov.remove(); voice.stop(); onClose?.(); };
  const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-label': r.title, onclick: (e) => { if (e.target === ov) close(); } },
    h('div', { class: 'sheet rules' },
      h('h2', {}, r.title),
      h('div', { class: 'example' }, owl('normal'), r.example()),
      h('ol', {}, r.items.map((t) => h('li', {}, t))),
      h('p', { class: 'how' }, r.how),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: () => voice.say([...r.items, r.how].join(' ')) }, '읽어 주세요'),
        h('button', { class: 'btn primary', 'data-act': 'close', onclick: close }, '알겠어요!'))));
  document.getElementById('app').append(ov);
}
