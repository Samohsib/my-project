// 놀이 화면: 윗줄(뒤로·제목·시간·소리), 판, 길잡이 말, 되돌리기·힌트, 저장, 다 풀었을 때 축하.
// 판마다 다른 부분(그리기·입력·힌트 설명)은 number-board.js / nonogram-board.js가 맡는다.

import { h } from './dom.js';
import { icon, owl } from './art.js';
import { data, save } from './store.js';
import { voice } from './voice.js';
import { sound } from './sound.js';
import { PUZZLES, getLevel, makePuzzle, dailySeed, practiceSeed } from '../core/catalog.js';
import { recordSolve, formatTime, koreanDuration, levelKey, isUnlocked } from '../core/records.js';
import { dateKey } from '../core/dates.js';
import { createNumberBoard } from './number-board.js';
import { createNonogramBoard } from './nonogram-board.js';
import { showRules } from './rules.js';
import { confetti } from './fx.js';

const MAX_HISTORY = 600;

export function saveKeyFor(mode, type, levelId, date = dateKey()) {
  return mode === 'daily' ? `d|${date}|${type}|${levelId}` : `p|${type}|${levelId}`;
}

export function playScreen({ type, levelId, mode, nav }) {
  const info = PUZZLES[type];
  const level = getLevel(type, levelId);
  const today = dateKey();
  const key = saveKeyFor(mode, type, levelId, today);
  const lk = levelKey(type, levelId);

  // ----- 어떤 판을 할지 정하기 -----
  let saved = data.saves[key];
  let seed;
  if (mode === 'daily') {
    seed = dailySeed(today, type, levelId);
    if (saved && saved.seed !== seed) saved = null;
  } else if (saved && !saved.solved) {
    seed = saved.seed;
  } else {
    const no = data.practiceNo[lk] || 0;
    data.practiceNo[lk] = no + 1;
    seed = practiceSeed(type, levelId, no);
    saved = null;
  }
  const puzzle = makePuzzle(type, levelId, seed);
  const N = type === 'nonogram' ? puzzle.w * puzzle.h : puzzle.n * puzzle.n;
  const state = {
    v: saved ? saved.v.slice() : type === 'nonogram' ? new Array(N).fill(0) : puzzle.givens.slice(),
    m: saved ? saved.m.slice() : new Array(N).fill(0),
  };
  let history = saved ? saved.hist.slice() : [];
  let elapsed = saved ? saved.t : 0;
  let hints = saved ? saved.hints : 0;
  let solved = !!(saved && saved.solved);

  // ----- 시간 -----
  let since = null, tick = null, alive = true, paused = false, discarded = false;
  const now = () => elapsed + (since !== null ? (performance.now() - since) / 1000 : 0);
  const timerText = h('span', {}, formatTime(elapsed));
  const timerEl = h('div', { class: 'timer', 'aria-label': '걸린 시간' }, icon('clock'), timerText);
  function startTimer() {
    if (solved || since !== null || !alive || paused || document.hidden) return;
    since = performance.now();
    let n = 0;
    tick = setInterval(() => {
      timerText.textContent = formatTime(now());
      if (++n % 10 === 0) persist(); // 5초마다 저장
    }, 500);
  }
  function stopTimer() {
    if (since === null) return;
    elapsed = now();
    since = null;
    clearInterval(tick);
    timerText.textContent = formatTime(elapsed);
  }
  const onVis = () => { if (document.hidden) { stopTimer(); persist(true); } else startTimer(); };
  document.addEventListener('visibilitychange', onVis);

  function persist(now_ = false) {
    if (discarded) return;
    data.saves[key] = { seed, v: state.v, m: state.m, hist: history, t: now(), hints, solved };
    save(now_);
  }

  // ----- 길잡이 말 -----
  const coachText = h('p', {});
  let coachOwl = owl('normal');
  const coachEl = h('div', { class: 'coach', 'aria-live': 'polite' }, coachOwl, coachText);
  function coach(text, { mood = 'normal', tone = '', speak = false } = {}) {
    const fresh = owl(mood);
    coachOwl.replaceWith(fresh);
    coachOwl = fresh;
    coachEl.className = `coach ${tone}`;
    coachText.textContent = text;
    if (speak) voice.say(text);
  }

  // ----- 판 쪽에 넘겨줄 손잡이 -----
  const undoBtn = h('button', { class: 'btn', 'aria-label': '되돌리기', onclick: undo }, icon('undo'), '되돌리기');
  const hintBtn = h('button', { class: 'btn', 'aria-label': '힌트', onclick: hint }, icon('hint'), '힌트');
  const api = {
    puzzle, state, mode,
    get solved() { return solved; },
    coach,
    sound,
    // changes: [{ i, v, m }] — 바뀔 값. 한 번의 '되돌리기'로 함께 돌아간다.
    commit(changes, { asHint = false } = {}) {
      if (solved) return false;
      const step = [];
      for (const c of changes) {
        const m1 = c.m === undefined ? state.m[c.i] : c.m;
        if (state.v[c.i] === c.v && state.m[c.i] === m1) continue;
        step.push({ i: c.i, v0: state.v[c.i], m0: state.m[c.i], v1: c.v, m1 });
      }
      if (!step.length) return false;
      for (const s of step) { state.v[s.i] = s.v1; state.m[s.i] = s.m1; }
      history.push(asHint ? { h: 1, s: step } : { s: step });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      board.refresh();
      afterChange();
      return true;
    },
  };

  const board = type === 'nonogram' ? createNonogramBoard(api) : createNumberBoard(api);

  function afterChange() {
    updateButtons();
    if (board.check()) finish();
    else persist();
  }

  function updateButtons() {
    undoBtn.disabled = solved || history.length === 0;
    hintBtn.disabled = solved;
  }

  function undo() {
    if (solved) return;
    const last = history.pop();
    if (!last) return;
    for (const s of [...last.s].reverse()) { state.v[s.i] = s.v0; state.m[s.i] = s.m0; }
    sound.play('undo');
    board.refresh();
    board.afterUndo?.(last.s.map((s) => s.i));
    coach('한 번 되돌렸어요.', { mood: 'normal' });
    updateButtons();
    persist();
  }

  function hint() {
    if (solved) return;
    const res = board.hint();
    if (!res) return;
    hints++;
    sound.play(res.tone === 'warn' ? 'oops' : 'hint');
    if (res.changes && res.changes.length) api.commit(res.changes, { asHint: true });
    if (solved) return; // 힌트로 마지막 칸을 채웠다 → 축하는 finish()가 한다
    board.flash(res);
    coach(res.message, { mood: res.tone === 'warn' ? 'oops' : 'think', tone: res.tone || '', speak: true });
    persist();
  }

  // ----- 다 풀었을 때 -----
  function finish() {
    stopTimer();
    solved = true;
    const seconds = Math.max(1, Math.round(now()));
    elapsed = seconds;
    timerText.textContent = formatTime(seconds);
    const wasUnlocked = info.levels.map((l) => isUnlocked(data.rec, type, l.id));
    const result = recordSolve(data.rec, { type, levelId, mode, date: today, seconds, hints });
    const newlyOpen = info.levels.find((l, k) => !wasUnlocked[k] && isUnlocked(data.rec, type, l.id));
    persist(true);
    updateButtons();
    board.setSolved();
    sound.play('win');
    confetti();
    const said = [`와, 다 풀었어요! 걸린 시간은 ${koreanDuration(seconds)}이에요.`];
    if (result.isBest && data.rec.solved[lk] > 1) said.push('최고 기록이에요!');
    if (mode === 'daily' && result.streak.current > 1) said.push(`${result.streak.current}일 연속으로 풀었어요!`);
    if (newlyOpen) said.push(`이제 ${info.name} 다음 단계가 열렸어요!`);
    coach(said[0], { mood: 'happy', tone: 'yay' });
    voice.say(said.join(' '));
    setTimeout(() => { if (alive) showWin({ seconds, result, newlyOpen }); }, type === 'nonogram' ? 1100 : 600);
  }

  function showWin({ seconds, result, newlyOpen }) {
    const facts = [];
    if (result.isBest && data.rec.solved[lk] > 1) facts.push(h('span', { class: 'gold' }, '최고 기록!'));
    facts.push(hints ? h('span', {}, `힌트 ${hints}번`) : h('span', { class: 'gold' }, '힌트 없이 풀었어요'));
    if (mode === 'daily') facts.push(h('span', { class: 'gold' }, `연속 ${result.streak.current}일째`));
    facts.push(h('span', {}, `${level.label} ${data.rec.solved[lk]}판째`));
    if (newlyOpen) facts.push(h('span', { class: 'gold' }, `${newlyOpen.label} 단계가 열렸어요`));
    const close = () => ov.remove();
    const nextBtn = mode === 'practice'
      ? h('button', { class: 'btn primary', 'data-act': 'next', onclick: () => { close(); nav.replay(type, levelId, 'practice'); } }, icon('next'), '다음 판')
      : h('button', { class: 'btn primary', 'data-act': 'practice', onclick: () => { close(); nav.replay(type, levelId, 'practice'); } }, icon('dice'), '연습하기');
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-label': '다 풀었어요' },
      h('div', { class: 'sheet' },
        owl('happy'),
        h('h2', {}, '다 풀었어요!'),
        board.picture ? board.picture() : null,
        h('div', { class: 'big-time' }, formatTime(seconds)),
        h('div', { class: 'facts' }, facts),
        h('div', { class: 'row' },
          h('button', { class: 'btn', 'data-act': 'look', onclick: close }, '판 보기'),
          nextBtn),
        h('div', { class: 'row' },
          h('button', { class: 'btn', 'data-act': 'home', onclick: () => { close(); nav.go('#/'); } }, icon('home'), '처음 화면')),
      ));
    root.append(ov);
  }

  // ----- 화면 짜기 -----
  const titleText = mode === 'daily' ? `오늘의 ${info.name}` : `${info.name} 연습`;
  const voiceBtn = h('button', { class: `icon-btn${voice.on ? '' : ' off'}`, 'aria-label': '음성 안내 켜고 끄기' }, icon(voice.on ? 'soundOn' : 'soundOff'));
  voiceBtn.onclick = () => {
    voice.set(!voice.on);
    voiceBtn.classList.toggle('off', !voice.on);
    voiceBtn.replaceChildren(icon(voice.on ? 'soundOn' : 'soundOff'));
    coach(voice.on ? '음성 안내를 켰어요.' : '음성 안내를 껐어요.', { speak: true });
  };
  const rulesBtn = h('button', { class: 'icon-btn', 'aria-label': '규칙 보기', onclick: () => {
    paused = true; stopTimer();
    showRules(type, level, () => { paused = false; startTimer(); });
  } }, icon('book'));
  const newBtn = mode === 'practice'
    ? h('button', { class: 'btn', 'aria-label': '새 판', onclick: () => {
      if (!solved && history.length && !confirm('지금 판을 그만두고 새 판을 할까요?')) return;
      if (!solved) { discarded = true; delete data.saves[key]; save(); }
      nav.replay(type, levelId, 'practice');
    } }, icon('refresh'), '새 판')
    : null;

  const area = h('div', { class: 'board-area' }, board.el);
  const root = h('section', { class: `screen play theme-${type}`, 'data-seed': seed, 'data-type': type, 'data-level': levelId, 'data-mode': mode },
    h('header', { class: 'bar' },
      h('button', { class: 'icon-btn', 'aria-label': '뒤로', onclick: () => nav.go(`#/p/${type}`) }, icon('back')),
      h('div', { class: 'bar-title' }, titleText, h('span', { class: 'chip' }, level.label)),
      newBtn, timerEl, rulesBtn, voiceBtn),
    h('main', { class: 'play-main' }, area, h('aside', { class: 'panel' }, coachEl, board.panel(undoBtn, hintBtn))));

  const ro = new ResizeObserver(() => board.layout(area.clientWidth, area.clientHeight));
  ro.observe(area);

  board.refresh();
  updateButtons();
  if (solved) {
    board.setSolved();
    coach(mode === 'daily'
      ? `오늘의 퍼즐은 벌써 풀었어요! 기록은 ${koreanDuration(elapsed)}. 연습하기로 더 놀 수 있어요.`
      : `다 푼 판이에요. 기록은 ${koreanDuration(elapsed)}.`, { mood: 'happy', tone: 'yay' });
  } else if (saved) {
    coach('하던 판을 이어서 해요. 화이팅!');
  } else {
    const intro = board.intro();
    coach(intro, { speak: true });
  }
  persist();

  return {
    el: root,
    shown() { board.layout(area.clientWidth, area.clientHeight); startTimer(); },
    destroy() {
      alive = false;
      stopTimer();
      persist(true);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      board.destroy?.();
      voice.stop();
    },
  };
}
