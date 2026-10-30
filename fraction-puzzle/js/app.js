// 화면 흐름: 첫 화면(단원 고르기) → 판 고르기 → 놀이(문제 3개) → 판 결과
//           첫 화면 → 도전 모드(섞어서 10문제, 하트 3개)
import { UNITS, unitById, makeStage, makeChallenge } from './problems.js';
import { judge } from './judge.js';
import { prompt, promptSpeech, explain, speechOf, PRAISE, OOPS } from './text.js';
import { html } from './num.js';
import { createPuzzle } from './puzzles.js';
import { explainPicture } from './explain-view.js';
import { jogak, kok, ICONS, STAR, HEART } from './art.js';
import { store } from './store.js';
import { sfx, speak, stopSpeak, unlock, setAudioOptions, hasKoreanVoice } from './audio.js';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const DECIMAL_UNITS = new Set(['decimal', 'dcompare', 'daddsub', 'line']);
const CHALLENGE_LEN = 10;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const segHTML = (segs) => segs.map((s) => (typeof s === 'object' ? html(s) : esc(s))).join('');
const buddyFor = (unitId, mood) => (DECIMAL_UNITS.has(unitId) ? kok(mood) : jogak(mood));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const S = {
  mode: 'stage', unit: null, level: 0, problems: [], idx: 0,
  mistakes: 0, triesHere: 0, hearts: 3, score: 0, pz: null, ro: null,
};

// ---------- 화면 바꾸기 ----------
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
  document.body.dataset.screen = id;
}

function renderVoiceButtons() {
  const on = store.settings.voice;
  $$('[data-act=voice]').forEach((b) => {
    b.textContent = on ? '🔊' : '🔇';
    b.setAttribute('aria-label', on ? '음성 안내 끄기' : '음성 안내 켜기');
    b.classList.toggle('off', !on);
  });
}

// ---------- 첫 화면 ----------
function renderHome() {
  $('#homeBuddy').innerHTML = jogak('happy', 'mascot big') + kok('happy', 'mascot big');
  const list = $('#unitList');
  list.innerHTML = '';
  UNITS.forEach((u, i) => {
    const got = store.unitStars(u.id), max = u.levels.length * 3;
    const b = document.createElement('button');
    b.className = 'unit-card';
    b.style.setProperty('--c', u.color);
    b.dataset.unit = u.id;
    b.innerHTML = `<span class="uc-num">${i + 1}</span><span class="uc-icon">${ICONS[u.icon]}</span>
      <span class="uc-title">${u.title}</span>
      <span class="uc-stars">${STAR(true)} ${got} / ${max}</span>`;
    b.addEventListener('click', () => openUnit(u.id));
    list.appendChild(b);
  });
  const c = document.createElement('button');
  c.className = 'unit-card challenge';
  c.dataset.unit = 'challenge';
  c.innerHTML = `<span class="uc-icon">${ICONS.challenge}</span><span class="uc-title">도전 모드</span>
    <span class="uc-stars">모든 단원 섞어서 ${CHALLENGE_LEN}문제 · 최고 ${store.challengeBest}점</span>`;
  c.addEventListener('click', startChallenge);
  list.appendChild(c);
  show('home');
}

// ---------- 판 고르기 ----------
function openUnit(id) {
  const u = unitById(id);
  S.unit = id;
  $('#unitTitle').textContent = u.title;
  $('#unitAbout').textContent = u.about;
  $('#unitBuddy').innerHTML = buddyFor(id, 'happy');
  $('#unitScreen').style.setProperty('--c', u.color);
  const list = $('#levelList');
  list.innerHTML = '';
  u.levels.forEach((_, lv) => {
    const open = store.unlocked(id, lv);
    const st = store.stars(id, lv);
    const b = document.createElement('button');
    b.className = `level${open ? '' : ' locked'}${st ? ' done' : ''}`;
    b.dataset.level = lv + 1;
    b.disabled = !open;
    b.innerHTML = `<span class="lv-n">${open ? lv + 1 : '🔒'}</span><span class="lv-stars">${[1, 2, 3].map((k) => STAR(st >= k)).join('')}</span>`;
    b.addEventListener('click', () => startStage(id, lv));
    list.appendChild(b);
  });
  show('unitScreen');
}

// ---------- 놀이 ----------
function startStage(unitId, level) {
  S.mode = 'stage';
  S.unit = unitId;
  S.level = level;
  S.problems = makeStage(unitId, level, Date.now());
  S.idx = 0;
  S.mistakes = 0;
  showProblem();
}

function startChallenge() {
  S.mode = 'challenge';
  S.unit = null;
  S.problems = makeChallenge(Date.now(), CHALLENGE_LEN);
  S.idx = 0;
  S.hearts = 3;
  S.score = 0;
  showProblem();
}

function renderProgress() {
  const dots = $('#dots');
  if (S.mode === 'stage') {
    dots.innerHTML = S.problems.map((_, i) => `<span class="dot${i < S.idx ? ' done' : i === S.idx ? ' now' : ''}"></span>`).join('');
    const u = unitById(S.unit);
    $('#where').innerHTML = `<b>${u.title}</b> <span>${S.level + 1}판 · ${S.idx + 1}/${S.problems.length}</span>`;
  } else {
    dots.innerHTML = [0, 1, 2].map((i) => HEART(i < S.hearts)).join('');
    const p = S.problems[S.idx];
    $('#where').innerHTML = `<b>도전 모드</b> <span>${S.idx + 1}/${S.problems.length} · ${unitById(p.unit).title} · ${S.score}점</span>`;
  }
}

function showProblem() {
  const p = S.problems[S.idx];
  S.triesHere = 0;
  if (S.pz) S.pz.destroy();
  const stage = $('#stage'), side = $('#side');
  stage.innerHTML = '';
  side.innerHTML = '';
  stage.className = 'stage';
  stage.dataset.kind = p.kind;
  stage.dataset.model = p.model || 'line';
  $('#play').style.setProperty('--c', unitById(p.unit).color);
  $('#buddy').innerHTML = buddyFor(p.unit, 'happy');
  const segs = prompt(p);
  $('#bubble').innerHTML = segHTML(segs);
  renderProgress();
  show('play');
  S.pz = createPuzzle(p, { stage, side, submit });
  speak(promptSpeech(p));
}

function submit() {
  const p = S.problems[S.idx];
  const res = S.pz.response();
  const r = judge(p, res);
  if (r.ok) onRight();
  else onWrong(p, res, r);
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  const colors = ['#ff9f1c', '#9b5de5', '#4d96ff', '#2bb673', '#ff5d8f', '#ffd43b'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.35}s`;
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    c.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    box.appendChild(c);
  }
  // 'go'는 초록 단추(.go)와 이름이 겹쳐 화면 전체가 초록으로 덮였다 — 색종이만의 이름을 쓴다
  box.classList.remove('falling');
  void box.offsetWidth;
  box.classList.add('falling');
}

function openSheet(build, kind) {
  const sheet = $('#sheet'), card = $('#sheetCard');
  card.innerHTML = '';
  card.className = `sheet-card ${kind}`;
  sheet.dataset.result = kind;
  build(card);
  sheet.hidden = false;
  S.pz?.lock(true);
}

function closeSheet() {
  $('#sheet').hidden = true;
  delete $('#sheet').dataset.result;
  S.pz?.lock(false);
}

function button(label, act, cls, onClick) {
  const b = document.createElement('button');
  b.className = `btn ${cls || ''}`;
  b.dataset.act = act;
  b.innerHTML = label;
  b.addEventListener('click', onClick);
  return b;
}

function onRight() {
  const p = S.problems[S.idx];
  if (S.mode === 'challenge') S.score++;
  sfx.right();
  confetti();
  const word = pick(PRAISE);
  speak(word);
  openSheet((card) => {
    card.innerHTML = `<div class="sh-buddy">${buddyFor(p.unit, 'joy')}</div><h3>${word}</h3>`;
    const row = document.createElement('div');
    row.className = 'sh-btns';
    row.appendChild(button('다음 ▶', 'next', 'primary', () => { closeSheet(); next(); }));
    card.appendChild(row);
  }, 'ok');
}

function onWrong(p, res, r) {
  sfx.wrong();
  S.triesHere++;
  if (S.mode === 'stage') S.mistakes++;
  else S.hearts--;
  if (S.mode === 'challenge') renderProgress();
  const lines = explain(p, res, r);
  const snap = S.pz.board ? { state: S.pz.board.state.slice(), cells: S.pz.board.cells } : null;
  const pic = explainPicture(p, res, r, snap);
  speak(speechOf(lines[0]));
  openSheet((card) => {
    card.innerHTML = `<div class="sh-head"><div class="sh-buddy small">${buddyFor(p.unit, 'oops')}</div><h3>${pick(OOPS)}</h3></div>`;
    card.appendChild(pic.el);
    const ul = document.createElement('ul');
    ul.className = 'ex-lines';
    ul.innerHTML = lines.map((l) => `<li>${segHTML(l)}</li>`).join('');
    card.appendChild(ul);
    const row = document.createElement('div');
    row.className = 'sh-btns';
    if (S.mode === 'challenge') {
      row.appendChild(button(S.hearts > 0 ? '다음 문제 ▶' : '결과 보기', 'next', 'primary', () => { closeSheet(); next(); }));
    } else {
      row.appendChild(button('다시 해 보기', 'retry', 'primary', () => { closeSheet(); S.pz.reset?.(); }));
    }
    card.appendChild(row);
  }, 'wrong');
  requestAnimationFrame(() => pic.fit(pic.el.clientWidth, Math.min(window.innerHeight * 0.4, 360)));
}

function next() {
  if (S.mode === 'challenge' && S.hearts <= 0) return finishChallenge();
  S.idx++;
  if (S.idx >= S.problems.length) return S.mode === 'stage' ? finishStage() : finishChallenge();
  showProblem();
}

function finishStage() {
  const u = unitById(S.unit);
  const stars = S.mistakes === 0 ? 3 : S.mistakes <= 2 ? 2 : 1;
  store.setStars(S.unit, S.level, stars);
  sfx.star();
  confetti();
  const hasNext = S.level + 1 < u.levels.length;
  speak(stars === 3 ? '한 판을 모두 맞혔어요! 별 세 개!' : `한 판 끝! 별 ${['', '한', '두', '세'][stars]} 개를 받았어요.`);
  openSheet((c) => {
    c.innerHTML = `<div class="sh-buddy">${buddyFor(S.unit, 'joy')}</div>
      <h3>${u.title} ${S.level + 1}판 끝!</h3>
      <div class="big-stars" data-stars="${stars}">${[1, 2, 3].map((k) => STAR(stars >= k)).join('')}</div>
      <p class="sh-note">${S.mistakes === 0 ? '한 번도 안 틀렸어요!' : `다시 해 본 횟수: ${S.mistakes}번`}</p>`;
    const row = document.createElement('div');
    row.className = 'sh-btns';
    row.appendChild(button('판 고르기', 'levels', '', () => { closeSheet(); openUnit(S.unit); }));
    row.appendChild(button('한 번 더', 'again', '', () => { closeSheet(); startStage(S.unit, S.level); }));
    if (hasNext) row.appendChild(button('다음 판 ▶', 'next-stage', 'primary', () => { closeSheet(); startStage(S.unit, S.level + 1); }));
    c.appendChild(row);
  }, 'stage-done');
}

function finishChallenge() {
  const best = store.recordChallenge(S.score);
  sfx.star();
  if (S.score > 0) confetti();
  speak(`도전 끝! ${S.score}점이에요.${best ? ' 최고 기록이에요!' : ''}`);
  openSheet((c) => {
    c.innerHTML = `<div class="sh-buddy">${jogak('joy')}${kok('joy')}</div>
      <h3>도전 끝! ${S.score}점</h3>
      <p class="sh-note">${S.hearts <= 0 ? '하트를 모두 썼어요. ' : ''}${best ? '🎉 새 최고 기록!' : `최고 기록: ${store.challengeBest}점`}</p>`;
    const row = document.createElement('div');
    row.className = 'sh-btns';
    row.appendChild(button('처음 화면', 'home', '', () => { closeSheet(); renderHome(); }));
    row.appendChild(button('다시 도전 ▶', 'again', 'primary', () => { closeSheet(); startChallenge(); }));
    c.appendChild(row);
  }, 'challenge-done');
}

function leavePlay() {
  stopSpeak();
  if (S.pz) { S.pz.destroy(); S.pz = null; }
  if (S.mode === 'stage') openUnit(S.unit);
  else renderHome();
}

// ---------- 설정 ----------
function openSettings() {
  const st = store.settings;
  openSheet((c) => {
    c.innerHTML = `<h3>설정</h3>
      <div class="set-row"><span>음성 안내 (문제를 읽어 줘요)</span><button class="toggle" data-set="voice">${st.voice ? '켜짐' : '꺼짐'}</button></div>
      <div class="set-row"><span>효과음</span><button class="toggle" data-set="sound">${st.sound ? '켜짐' : '꺼짐'}</button></div>
      <div class="set-row"><span>한국어 목소리</span><span class="set-info">${hasKoreanVoice() ? '있어요 ✔' : '못 찾았어요 (기기 설정 → 손쉬운 사용 → 읽기 및 말하기에서 한국어 음성을 받아 주세요)'}</span></div>
      <div class="set-row"><span>기록 지우기</span><button class="toggle danger" data-set="reset">지우기</button></div>`;
    $$('[data-set]', c).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.set;
      if (k === 'reset') {
        if (b.dataset.sure) { store.resetProgress(); b.textContent = '지웠어요'; b.disabled = true; return; }
        b.dataset.sure = '1';
        b.textContent = '정말 지울까요? 한 번 더 눌러요';
        return;
      }
      store.setSetting(k, !store.settings[k]);
      b.textContent = store.settings[k] ? '켜짐' : '꺼짐';
      setAudioOptions(store.settings);
      renderVoiceButtons();
    }));
    const row = document.createElement('div');
    row.className = 'sh-btns';
    row.appendChild(button('닫기', 'close', 'primary', () => { closeSheet(); if (document.body.dataset.screen === 'home') renderHome(); }));
    c.appendChild(row);
  }, 'settings');
}

function toggleVoice() {
  store.setSetting('voice', !store.settings.voice);
  setAudioOptions(store.settings);
  renderVoiceButtons();
  if (store.settings.voice) speak('음성 안내를 켰어요.');
}

// ---------- 시작 ----------
function init() {
  setAudioOptions(store.settings);
  renderVoiceButtons();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'voice') toggleVoice();
    else if (act === 'settings') openSettings();
    else if (act === 'home') renderHome();
    else if (act === 'leave') leavePlay();
    else if (act === 'repeat') speak(promptSpeech(S.problems[S.idx]));
  });
  ['pointerdown', 'touchend'].forEach((t) => addEventListener(t, unlock, { passive: true }));
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  const ro = new ResizeObserver(() => S.pz?.relayout());
  ro.observe($('#stage'));
  renderHome();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();

// 자동 시험(Playwright)이 지금 문제를 읽을 수 있게 열어 둔다 (읽기 전용 사본)
window.fractionPuzzle = { problem: () => (S.problems[S.idx] ? structuredClone(S.problems[S.idx]) : null) };
