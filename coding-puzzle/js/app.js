// 코딩 퍼즐 앱: 화면 바꾸기, 실행·한 단계·처음부터, 별 매기기, 안내 창
import { LEVELS, CHAPTERS } from './levels.js';
import { parseMap, run, countBlocks, starsFor, twoStarLimit, CONDITIONS } from './engine.js';
import { Board } from './board.js';
import { Editor, LABELS } from './editor.js';
import { store } from './store.js';
import { sfx, speak, stopSpeak, unlock } from './sound.js';
import { robotBadge, STAR_ICON, BLOCK_ICONS } from './art.js';

const $ = sel => document.querySelector(sel);
const SPEED = { slow: 1.6, normal: 1, fast: 0.45 };
const BASE_MS = { move: 430, turn: 330, bump: 600, check: 380 };

const chapterOf = lv => CHAPTERS.find(c => lv.id.startsWith(`${c.n}-`));
const levelIndex = id => LEVELS.findIndex(l => l.id === id);

function isUnlocked(i) {
  if (store.settings.unlockAll || i === 0) return true;
  return store.starsOf(LEVELS[i - 1].id) > 0 || store.starsOf(LEVELS[i].id) > 0;
}

function starsHTML(n, total = 3) {
  let s = '';
  for (let i = 0; i < total; i++) s += STAR_ICON(i < n);
  return `<span class="stars">${s}</span>`;
}

function goalText(world) {
  const s = world.stars.length;
  if (s && world.flag) return `별 ${s}개를 모두 줍고 깃발까지 가요`;
  if (s) return `별 ${s}개를 모두 주워요`;
  return '깃발까지 가요';
}

// ───────── 안내 창 ─────────
const modal = {
  open(html, { cls = '', onClose } = {}) {
    const root = $('#modal');
    root.innerHTML = `<div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div>`;
    root.classList.add('on');
    this.onClose = onClose;
    return root.querySelector('.sheet');
  },
  close() {
    const root = $('#modal');
    root.classList.remove('on');
    root.innerHTML = '';
    const f = this.onClose; this.onClose = null;
    f?.();
  },
  get isOpen() { return $('#modal').classList.contains('on'); },
};

function pick(title, options, current, kind) {
  return new Promise(resolve => {
    const sheet = modal.open(`
      <h2>${title}</h2>
      <div class="pick ${kind}">${options.map(o =>
        `<button type="button" class="opt${o.value === current ? ' cur' : ''}" data-v="${o.value}">${o.label}</button>`).join('')}</div>
      <div class="row"><button type="button" class="btn ghost" data-close>그만두기</button></div>`,
    { cls: 'picker', onClose: () => resolve(null) });
    sheet.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      const o = options.find(x => String(x.value) === b.dataset.v);
      sfx.tap();
      modal.onClose = null;
      modal.close();
      resolve(o ? o.value : null);
    }));
  });
}

// ───────── 첫 화면 (판 고르기) ─────────
function renderHome() {
  $('#homeRobot').innerHTML = robotBadge();
  const total = LEVELS.length * 3;
  $('#totalStars').innerHTML = `${STAR_ICON(true)}<b>${store.totalStars()}</b> / ${total}`;
  const wrap = $('#chapters');
  wrap.innerHTML = '';
  for (const ch of CHAPTERS) {
    const levels = LEVELS.map((l, i) => ({ l, i })).filter(({ l }) => l.id.startsWith(`${ch.n}-`));
    const got = levels.reduce((n, { l }) => n + store.starsOf(l.id), 0);
    const sec = document.createElement('section');
    sec.className = `chapter theme-${ch.theme}`;
    sec.innerHTML = `
      <div class="ch-head">
        <div class="ch-badge">${ch.n}장</div>
        <div class="ch-name"><b>${ch.name}</b><span>${ch.title}</span></div>
        <div class="ch-stars">${STAR_ICON(true)} ${got}/${levels.length * 3}</div>
      </div>
      <div class="ch-levels"></div>`;
    const grid = sec.querySelector('.ch-levels');
    for (const { l, i } of levels) {
      const b = document.createElement('button');
      b.type = 'button';
      const open = isUnlocked(i);
      const st = store.starsOf(l.id);
      b.className = `lv${open ? '' : ' locked'}${st ? ' done' : ''}`;
      b.dataset.id = l.id;
      b.setAttribute('aria-label', `${l.id} ${l.title}${open ? '' : ' (잠김)'}`);
      b.innerHTML = open
        ? `<span class="lv-num">${l.id.split('-')[1]}</span><span class="lv-name">${l.title}</span>${starsHTML(st)}`
        : `<span class="lv-num">${l.id.split('-')[1]}</span><span class="lock">🔒</span>`;
      b.disabled = !open;
      b.addEventListener('click', () => { sfx.tap(); openLevel(l.id); });
      grid.appendChild(b);
    }
    wrap.appendChild(sec);
  }
  // 이어서 하기
  const next = nextLevelToPlay();
  const cont = $('#continueBtn');
  cont.hidden = !next;
  if (next) {
    cont.innerHTML = `▶ <b>${next.id}</b> ${next.title} 하러 가기`;
    cont.onclick = () => { sfx.tap(); openLevel(next.id); };
  }
}

function nextLevelToPlay() {
  const i = LEVELS.findIndex((l, j) => isUnlocked(j) && !store.starsOf(l.id));
  return i >= 0 ? LEVELS[i] : null;
}

function show(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === screen));
  document.body.dataset.screen = screen;
}

function goHome() {
  stopRun();
  stopSpeak();
  renderHome();
  show('home');
}

// ───────── 판 하기 ─────────
let level = null, world = null, board = null, editor = null;
const runner = { mode: 'edit', res: null, idx: 0, token: 0 };

function openLevel(id) {
  const lv = LEVELS.find(l => l.id === id);
  if (!lv) return;
  stopRun();
  level = lv;
  world = parseMap(lv.map);
  const ch = chapterOf(lv);
  store.last = id;
  document.body.dataset.theme = ch.theme;
  $('#lvId').textContent = lv.id;
  $('#lvName').textContent = lv.title;
  $('#goalText').textContent = goalText(world);
  board.load(world, ch.theme, lv.map);
  editor.load(lv, store.programOf(id));
  $('#play').classList.toggle('has-fn', lv.blocks.includes('P'));
  updateCount();
  resetRun();
  show('play');
  say(`${lv.title}. ${goalText(world)}.`, 'hello');
  introIfNeeded(lv);
}

function introIfNeeded(lv) {
  const ch = chapterOf(lv);
  const first = LEVELS.find(l => l.id.startsWith(`${ch.n}-`));
  if (first.id === lv.id && !store.seen(`ch${ch.n}`)) {
    store.markSeen(`ch${ch.n}`);
    const icons = ch.newBlocks.map(k => `<div class="blk k-${k} demo"><div class="head"><span class="ico">${BLOCK_ICONS[k]}</span><span class="lbl">${k === 'rep' ? '반복' : LABELS[k]}</span></div></div>`).join('');
    const sheet = modal.open(`
      <div class="intro-badge">${ch.n}장</div>
      <h2>${ch.name} <small>${ch.title}</small></h2>
      <div class="demo-row">${icons}</div>
      <p class="big-text">${ch.intro}</p>
      <div class="row"><button type="button" class="btn primary" data-close>시작! ▶</button></div>`, { cls: 'intro' });
    say(ch.intro);
    return sheet;
  }
  if (lv.newCond && !store.seen(`cond-${lv.newCond}`)) {
    store.markSeen(`cond-${lv.newCond}`);
    modal.open(`
      <h2>새 조건이 생겼어요</h2>
      <div class="demo-row"><div class="blk k-if demo"><div class="head"><span class="ico">${BLOCK_ICONS.if}</span><span class="lbl">만약</span><span class="cond">${CONDITIONS[lv.newCond]}</span></div></div></div>
      <p class="big-text">${lv.hint}</p>
      <div class="row"><button type="button" class="btn primary" data-close>알겠어요!</button></div>`, { cls: 'intro' });
    say(lv.hint);
  }
}

function updateCount() {
  const n = editor.count;
  $('#count').textContent = `블록 ${n}개`;
  $('#target').innerHTML = `${STAR_ICON(true)}${STAR_ICON(true)}${STAR_ICON(true)} <b>${level.best}개</b> 이하`;
  $('#undoBtn').disabled = !editor.canUndo;
  $('#clearBtn').disabled = n === 0;
}

function say(text, kind = 'info') {
  const b = $('#bubble');
  b.textContent = text;
  b.dataset.kind = kind;
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('pop');
  speak(text);
}

function updateStarCounter(got) {
  const s = world.stars.length;
  $('#goalCount').innerHTML = s ? `${STAR_ICON(true)} ${got}/${s}` : '';
}

function setButtons() {
  const m = runner.mode;
  const runBtn = $('#runBtn');
  runBtn.classList.toggle('pause', m === 'playing');
  runBtn.innerHTML = m === 'playing'
    ? '<span class="ic">⏸</span><span>멈춤</span>'
    : `<span class="ic">▶</span><span>${m === 'paused' ? '계속' : '실행'}</span>`;
  $('#stepBtn').disabled = m === 'done';
  $('#resetBtn').disabled = m === 'edit';
  editor.setLocked(m === 'playing' || m === 'paused');
  document.body.dataset.run = m;
}

function resetRun() {
  runner.token++;
  runner.mode = 'edit';
  runner.res = null;
  runner.idx = 0;
  board.reset();
  editor.clearHighlight();
  updateStarCounter(0);
  setButtons();
}

function stopRun() { runner.token++; }

function prepare() {
  const res = run(world, editor.program);
  runner.res = res;
  runner.idx = 0;
  board.reset();
  updateStarCounter(0);
  if (res.reason === 'empty') {
    say('먼저 블록을 쌓아 주세요! 블록 상자의 블록을 눌러 보세요.', 'bad');
    sfx.fail();
    return false;
  }
  return true;
}

async function showNext(token, factor) {
  const ev = runner.res.events[runner.idx];
  editor.highlight(ev);
  if (ev.kind === 'move') sfx.step();
  if (ev.kind === 'turn') sfx.turn();
  if (ev.kind === 'check') sfx.check();
  if (ev.kind === 'bump') sfx.bump();
  await board.show(ev, BASE_MS[ev.kind] * factor);
  if (token !== runner.token) return false;
  if (ev.star != null) { sfx.star(); updateStarCounter(ev.got); }
  runner.idx++;
  return true;
}

async function play() {
  const token = ++runner.token;
  runner.mode = 'playing';
  setButtons();
  const factor = SPEED[store.settings.speed] || 1;
  while (runner.idx < runner.res.events.length) {
    const ok = await showNext(token, factor);
    if (!ok || token !== runner.token) return;
    if (runner.mode !== 'playing') return;    // 멈춤을 눌렀다
    await new Promise(r => setTimeout(r, 40 * factor));
    if (token !== runner.token || runner.mode !== 'playing') return;
  }
  finish();
}

async function step() {
  if (runner.mode === 'edit' || runner.mode === 'done') {
    resetRun();
    if (!prepare()) { resetRun(); return; }
    runner.mode = 'paused';
    setButtons();
    say('한 단계씩 해 볼게요. 한 단계 버튼을 계속 눌러요.', 'info');
  } else if (runner.mode === 'playing') {
    runner.mode = 'paused';
    setButtons();
    return;
  }
  if (runner.stepping) return;
  runner.stepping = true;
  const token = runner.token;
  try {
    if (runner.idx < runner.res.events.length) await showNext(token, 1);
    if (token === runner.token && runner.idx >= runner.res.events.length) finish();
  } finally {
    runner.stepping = false;
  }
}

function onRun() {
  unlock();
  if (runner.mode === 'playing') { runner.mode = 'paused'; setButtons(); return; }
  if (runner.mode === 'paused') { play(); return; }
  resetRun();
  if (!prepare()) { resetRun(); return; }
  play();
}

const FAIL = {
  wall: () => '쾅! 앞이 막혀 있었어요. 빨갛게 빛난 블록을 고쳐 볼까요?',
  tooLong: () => '너무 오래 걸려요! 반복 횟수를 줄여 볼까요?',
  tooDeep: () => '나만의 블록이 너무 깊이 들어가요.',
  notDone: res => res.starsLeft > 0
    ? `블록이 다 끝났는데 별이 ${res.starsLeft}개 남았어요.`
    : '블록이 다 끝났는데 깃발까지 못 갔어요. 조금 더 가 볼까요?',
};

function finish() {
  const res = runner.res;
  runner.mode = 'done';
  setButtons();
  editor.setLocked(false);
  if (res.ok) {
    win();
  } else {
    sfx.fail();
    say(FAIL[res.reason]?.(res) || '앗, 다시 해 볼까요?', 'bad');
    if (res.reason !== 'wall') editor.clearHighlight();
  }
}

function win() {
  const n = countBlocks(editor.program);
  const stars = starsFor(n, level.best);
  const before = store.starsOf(level.id);
  store.recordClear(level.id, stars, n);
  sfx.win();
  confetti();
  const i = levelIndex(level.id);
  const next = LEVELS[i + 1];
  const ch = chapterOf(level);
  const chapterDone = !next || chapterOf(next) !== ch;
  const tip = stars === 3
    ? (n < level.best ? `와! 목표보다 ${level.best - n}개나 적어요. 정말 대단해요!` : '최소 블록으로 깼어요. 완벽해요!')
    : stars === 2
      ? `블록을 ${level.best}개까지 줄이면 별 3개!`
      : `블록을 ${twoStarLimit(level.best)}개 이하로 줄이면 별 2개, ${level.best}개 이하면 별 3개!`;
  const extra = chapterDone && before === 0
    ? `<p class="chapter-done">${next ? `${ch.n}장 끝! 이제 ${chapterOf(next).n}장 「${chapterOf(next).name}」이 열렸어요.` : '모든 판을 다 깼어요! 최고의 코딩 박사!'}</p>` : '';
  setTimeout(() => {
    if (level.id !== LEVELS[i].id) return;
    const sheet = modal.open(`
      <div class="win-robot">${robotBadge()}</div>
      <h2>성공!</h2>
      <div class="win-stars s${stars}">${starsHTML(stars)}</div>
      <p class="big-text">블록 <b>${n}개</b>로 깼어요.</p>
      <p class="tip">${tip}</p>
      ${extra}
      <div class="row">
        <button type="button" class="btn ghost" data-act="again">다시 하기</button>
        ${next ? '<button type="button" class="btn primary" data-act="next">다음 판 ▶</button>' : '<button type="button" class="btn primary" data-act="home">판 목록</button>'}
      </div>`, { cls: 'win' });
    sheet.querySelector('[data-act="again"]').addEventListener('click', () => { sfx.tap(); modal.close(); resetRun(); });
    sheet.querySelector('[data-act="next"]')?.addEventListener('click', () => { sfx.tap(); modal.onClose = null; modal.close(); openLevel(next.id); });
    sheet.querySelector('[data-act="home"]')?.addEventListener('click', () => { sfx.tap(); modal.onClose = null; modal.close(); goHome(); });
    say(`성공! 별 ${['', '한', '두', '세'][stars]} 개! ${tip}`, 'good');
  }, 650);
}

function confetti() {
  const fx = $('#fx');
  const colors = ['#facc15', '#f97316', '#22c55e', '#3b82f6', '#ec4899', '#a855f7'];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = `${Math.random() * 0.35}s`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
    p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
    fx.appendChild(p);
  }
  setTimeout(() => fx.replaceChildren(), 2600);
}

// ───────── 힌트 · 설정 ─────────
function openHint() {
  sfx.tap();
  const used = level.blocks.map(k => `<span class="chip k-${k}">${BLOCK_ICONS[k]} ${k === 'rep' ? '반복' : LABELS[k]}</span>`).join('');
  modal.open(`
    <h2>💡 힌트</h2>
    <p class="big-text">${level.hint}</p>
    <p class="tip">별 3개: 블록 <b>${level.best}개</b> 이하 · 별 2개: <b>${twoStarLimit(level.best)}개</b> 이하</p>
    <div class="chips">${used}</div>
    <div class="row"><button type="button" class="btn primary" data-close>알겠어요</button></div>`, { cls: 'hint' });
  speak(level.hint);
}

function openSettings() {
  sfx.tap();
  const s = store.settings;
  const sheet = modal.open(`
    <h2>⚙️ 설정</h2>
    <div class="set">
      <label class="set-row"><span>🗣️ 음성 안내</span><input type="checkbox" data-k="voice" ${s.voice ? 'checked' : ''}><i></i></label>
      <label class="set-row"><span>🔔 효과음</span><input type="checkbox" data-k="sfx" ${s.sfx ? 'checked' : ''}><i></i></label>
      <div class="set-row"><span>🐢 실행 빠르기 🐇</span>
        <div class="seg">${[['slow', '느리게'], ['normal', '보통'], ['fast', '빠르게']].map(([v, t]) =>
          `<button type="button" data-speed="${v}" class="${s.speed === v ? 'cur' : ''}">${t}</button>`).join('')}</div></div>
      <label class="set-row grown"><span>🔓 모든 판 열기 <small>(어른용)</small></span><input type="checkbox" data-k="unlockAll" ${s.unlockAll ? 'checked' : ''}><i></i></label>
      <div class="set-row grown"><span>🧹 기록 모두 지우기</span><button type="button" class="btn small danger" data-reset>지우기</button></div>
    </div>
    <p class="tip">음성은 아이패드 설정에 한국어 목소리가 있어야 나와요.</p>
    <div class="row"><button type="button" class="btn primary" data-close>닫기</button></div>`, {
    cls: 'settings', onClose: () => { refreshVoiceBtn(); if (document.body.dataset.screen === 'home') renderHome(); },
  });
  sheet.querySelectorAll('input[data-k]').forEach(inp => inp.addEventListener('change', () => {
    store.setSetting(inp.dataset.k, inp.checked);
    if (inp.dataset.k === 'voice' && !inp.checked) stopSpeak();
    sfx.tap();
  }));
  sheet.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => {
    store.setSetting('speed', b.dataset.speed);
    sheet.querySelectorAll('[data-speed]').forEach(x => x.classList.toggle('cur', x === b));
    sfx.tap();
  }));
  sheet.querySelector('[data-reset]').addEventListener('click', () => {
    const btn = sheet.querySelector('[data-reset]');
    if (btn.dataset.sure) { store.resetAll(); modal.close(); goHome(); return; }
    btn.dataset.sure = '1';
    btn.textContent = '정말 지울까요?';
  });
}

function refreshVoiceBtn() {
  const on = store.settings.voice;
  const b = $('#voiceBtn');
  b.innerHTML = on ? '🔊' : '🔇';
  b.setAttribute('aria-label', on ? '음성 안내 끄기' : '음성 안내 켜기');
  b.classList.toggle('off', !on);
}

// ───────── 시작 ─────────
function init() {
  board = new Board($('#board'));
  editor = new Editor({
    palette: $('#palette'), workspace: $('#workspace'), pick,
    onChange: () => {
      store.saveProgram(level.id, editor.program);
      updateCount();
      if (runner.mode !== 'edit') resetRun();
    },
    onMessage: text => { sfx.fail(); say(text, 'bad'); },
    sfx,
  });

  $('#runBtn').addEventListener('click', () => { sfx.tap(); onRun(); });
  $('#stepBtn').addEventListener('click', () => { unlock(); step(); });
  $('#resetBtn').addEventListener('click', () => { sfx.tap(); resetRun(); say('처음 자리로 돌아왔어요.', 'info'); });
  $('#undoBtn').addEventListener('click', () => { sfx.tap(); editor.undo(); });
  $('#clearBtn').addEventListener('click', () => {
    const b = $('#clearBtn');
    if (!b.dataset.sure) {
      b.dataset.sure = '1';
      b.classList.add('sure');
      b.querySelector('span:last-child').textContent = '한 번 더!';
      setTimeout(() => { delete b.dataset.sure; b.classList.remove('sure'); b.querySelector('span:last-child').textContent = '다 지우기'; }, 2200);
      return;
    }
    delete b.dataset.sure;
    b.classList.remove('sure');
    b.querySelector('span:last-child').textContent = '다 지우기';
    sfx.remove();
    editor.clearAll();
  });
  $('#backBtn').addEventListener('click', () => { sfx.tap(); goHome(); });
  $('#hintBtn').addEventListener('click', openHint);
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settingsBtn2').addEventListener('click', openSettings);
  $('#voiceBtn').addEventListener('click', () => {
    store.setSetting('voice', !store.settings.voice);
    refreshVoiceBtn();
    if (store.settings.voice) { unlock(); speak('음성 안내를 켰어요.'); } else stopSpeak();
  });
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal' || e.target.closest('[data-close]')) { sfx.tap(); modal.close(); }
  });
  refreshVoiceBtn();

  // 아이패드에서 확대·당겨서 새로고침 막기, 첫 터치에 소리 켜기
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  window.addEventListener('pointerdown', unlock, { passive: true, once: true });
  window.addEventListener('touchend', unlock, { passive: true, once: true });

  renderHome();
  show('home');
  // 시험·스크린샷용: 주소 끝에 #1-3 처럼 붙이면 그 판을 바로 연다
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && LEVELS.some(l => l.id === hash) && isUnlocked(levelIndex(hash))) openLevel(hash);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
