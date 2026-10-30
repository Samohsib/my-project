// 논리 퍼즐 모음 — 화면 고르기(주소 # 뒤로 화면을 나눈다)
//   #/                    첫 화면
//   #/p/스도쿠종류         퍼즐 고르기 (단계·오늘의 퍼즐·연습)
//   #/play/종류/단계/모드  놀이 (모드: daily | practice)
//   #/records             내 기록

import { h } from './dom.js';
import { owl, icon, puzzleArt, flame } from './art.js';
import { data, save, resetAll } from './store.js';
import { voice } from './voice.js';
import { sound } from './sound.js';
import { PUZZLES, PUZZLE_IDS, UNLOCK_AFTER } from '../core/catalog.js';
import { streakInfo, isUnlocked, levelKey, formatTime, recentDays } from '../core/records.js';
import { dateKey, koreanDate, weekday } from '../core/dates.js';
import { playScreen, saveKeyFor } from './game.js';
import { showRules } from './rules.js';

const app = document.getElementById('app');
let current = null;

const nav = {
  go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
  // 같은 주소라도 새로 그린다 (다음 연습 판)
  replay(type, levelId, mode) {
    const hash = `#/play/${type}/${levelId}/${mode}`;
    if (location.hash === hash) route(); else location.hash = hash;
  },
};

function mount(screen) {
  if (current?.destroy) current.destroy();
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  app.replaceChildren(screen.el);
  current = screen;
  screen.shown?.();
}

function voiceButton(onChange) {
  const b = h('button', { class: `icon-btn${voice.on ? '' : ' off'}`, 'aria-label': '음성 안내 켜고 끄기' }, icon(voice.on ? 'soundOn' : 'soundOff'));
  b.onclick = () => {
    voice.set(!voice.on);
    b.classList.toggle('off', !voice.on);
    b.replaceChildren(icon(voice.on ? 'soundOn' : 'soundOff'));
    if (voice.on) voice.say('음성 안내를 켰어요.');
    onChange?.();
  };
  return b;
}

const lastLevelOf = (type) => {
  const id = data.lastLevel[type];
  const levels = PUZZLES[type].levels;
  return levels.some((l) => l.id === id) ? id : levels[0].id;
};

// ---------- 첫 화면 ----------
function homeScreen() {
  const today = dateKey();
  const st = streakInfo(data.rec, today);
  const doneToday = (type) => Object.keys(data.rec.daily[today] || {}).some((k) => k.startsWith(`${type}:`));
  const cards = PUZZLE_IDS.map((type) => {
    const p = PUZZLES[type];
    const done = doneToday(type);
    return h('a', { class: `pcard theme-${type}`, href: `#/p/${type}`, 'data-type': type, onclick: () => sound.play('tap') },
      puzzleArt(type),
      h('div', { class: 'txt' },
        h('h2', {}, p.name),
        h('p', {}, p.tagline),
        h('span', { class: `today${done ? ' done' : ''}` }, done ? '오늘의 퍼즐 완료!' : '오늘의 퍼즐이 기다려요')));
  });
  const msg = st.todayDone
    ? `오늘도 해냈어요! ${st.current}일 연속이에요. 다른 퍼즐도 해 볼까요?`
    : st.current
      ? `어제까지 ${st.current}일 연속! 오늘의 퍼즐을 풀면 ${st.current + 1}일이 돼요.`
      : '오늘의 퍼즐을 하나 풀면 연속 기록이 시작돼요. 어떤 퍼즐부터 할까요?';
  const el = h('section', { class: 'screen home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'brand' }, owl('normal'), h('div', {}, h('h1', {}, '논리 퍼즐 모음'), h('p', {}, '부엉이 토리와 머리 쓰는 놀이'))),
      h('div', { class: 'top-btns' },
        h('a', { class: 'streak', href: '#/records', 'aria-label': '연속 기록' }, flame(), `${st.current}일`),
        h('a', { class: 'icon-btn', href: '#/records', 'aria-label': '내 기록' }, icon('chart')),
        voiceButton())),
    h('div', { class: 'cards' }, cards),
    h('div', { class: 'coach-line' }, owl(st.todayDone ? 'happy' : 'normal'), h('span', {}, msg)));
  return { el };
}

// ---------- 퍼즐 고르기 ----------
function selectScreen(type) {
  const p = PUZZLES[type];
  const today = dateKey();
  let levelId = lastLevelOf(type);
  if (!isUnlocked(data.rec, type, levelId)) levelId = p.levels[0].id;

  const levelsBox = h('div', { class: 'levels', role: 'radiogroup', 'aria-label': '단계' });
  const modesBox = h('div', { class: 'modes' });
  const intro = {
    sudoku: '가로줄, 세로줄, 굵은 네모 안에 숫자가 한 번씩만 들어가요. 작은 판부터 시작해서 9×9까지 올라가 봐요!',
    nonogram: '줄마다 적힌 숫자만큼 칸을 이어서 칠해요. 다 칠하면 숨은 그림이 나타나요!',
    futoshiki: '줄마다 숫자가 한 번씩, 그리고 칸 사이 부등호(<, >)를 지켜요. 뾰족한 쪽이 작은 수예요!',
  }[type];

  function draw() {
    levelsBox.replaceChildren(...p.levels.map((l, k) => {
      const open = isUnlocked(data.rec, type, l.id);
      const key = levelKey(type, l.id);
      const solvedN = data.rec.solved[key] || 0;
      const best = data.rec.best[key];
      const info = open
        ? (solvedN ? `${solvedN}판 풀었어요 · 최고 ${formatTime(best)}` : '아직 안 풀었어요')
        : `${p.levels[k - 1].label}를 ${UNLOCK_AFTER}판 풀면 열려요`;
      return h('button', {
        class: `level${l.id === levelId ? ' sel' : ''}${open ? '' : ' locked'}`, role: 'radio', 'aria-checked': String(l.id === levelId), 'data-level': l.id,
        onclick: () => {
          if (!open) { sound.play('oops'); voice.say(info); return; }
          sound.play('tap');
          levelId = l.id;
          data.lastLevel[type] = l.id; save();
          draw();
        },
      }, h('b', {}, open ? null : icon('lock'), l.label), h('small', {}, info));
    }));

    const lv = p.levels.find((l) => l.id === levelId);
    const daily = (data.rec.daily[today] || {})[levelKey(type, levelId)];
    const dSave = data.saves[saveKeyFor('daily', type, levelId, today)];
    const pSave = data.saves[saveKeyFor('practice', type, levelId)];
    const dailySub = daily ? `오늘 ${formatTime(daily.s)}에 풀었어요!` : dSave ? `하던 판 이어서 하기 · ${koreanDate(today)}` : `${koreanDate(today)} · ${lv.label}`;
    const practiceSub = pSave && !pSave.solved ? '하던 연습 판 이어서 하기' : '새 판이 끝없이 나와요';
    modesBox.replaceChildren(
      h('a', { class: 'mode daily', href: `#/play/${type}/${levelId}/daily`, 'data-mode': 'daily' }, icon('calendar'), h('span', {}, h('b', {}, '오늘의 퍼즐'), h('small', {}, dailySub))),
      h('a', { class: 'mode practice', href: `#/play/${type}/${levelId}/practice`, 'data-mode': 'practice' }, icon('dice'), h('span', {}, h('b', {}, '연습하기'), h('small', {}, practiceSub))));
  }
  draw();

  const el = h('section', { class: `screen select theme-${type}` },
    h('header', { class: 'bar' },
      h('a', { class: 'icon-btn', href: '#/', 'aria-label': '첫 화면으로' }, icon('back')),
      h('div', { class: 'bar-title' }, p.name),
      h('button', { class: 'btn', onclick: () => showRules(type, p.levels.find((l) => l.id === levelId)) }, icon('book'), '규칙 보기'),
      voiceButton()),
    h('div', { class: 'select-body' },
      h('div', { class: 'intro' }, puzzleArt(type), h('p', {}, intro)),
      h('div', { class: 'section-title' }, '단계 고르기'),
      levelsBox,
      modesBox));
  return { el };
}

// ---------- 내 기록 ----------
function recordsScreen() {
  const today = dateKey();
  const st = streakInfo(data.rec, today);
  const days = recentDays(data.rec, today, 14).map((d) => h('div', { class: `day${d.count ? ' on' : ''}${d.date === today ? ' today' : ''}`, title: d.date },
    h('i', {}, d.count ? icon('check') : null), h('span', {}, d.date === today ? '오늘' : weekday(d.date))));

  const rowsFor = (type) => PUZZLES[type].levels.map((l) => {
    const k = levelKey(type, l.id);
    const open = isUnlocked(data.rec, type, l.id);
    return h('tr', {},
      h('td', {}, `${PUZZLES[type].name} ${l.label}`),
      h('td', {}, open ? `${data.rec.solved[k] || 0}판` : '잠김'),
      h('td', {}, data.rec.best[k] != null ? formatTime(data.rec.best[k]) : '-'));
  });

  const sw = (on, label, set) => {
    const s = h('button', { class: `switch${on ? ' on' : ''}`, role: 'switch', 'aria-checked': String(on), 'aria-label': label });
    s.onclick = () => { const v = !s.classList.contains('on'); s.classList.toggle('on', v); s.setAttribute('aria-checked', String(v)); set(v); };
    return h('div', { class: 'toggle-row' }, h('span', {}, label), s);
  };

  const el = h('section', { class: 'screen records' },
    h('header', { class: 'bar' },
      h('a', { class: 'icon-btn', href: '#/', 'aria-label': '첫 화면으로' }, icon('back')),
      h('div', { class: 'bar-title' }, '내 기록')),
    h('div', { class: 'records-body' },
      h('div', { class: 'box' },
        h('div', { class: 'streak-big' }, flame('flame'),
          h('div', {}, h('b', {}, `${st.current}일 연속`),
            h('small', {}, st.todayDone ? '오늘의 퍼즐을 풀었어요!' : '오늘의 퍼즐을 풀면 하루가 더해져요.'),
            h('br'), h('small', {}, `가장 길었던 기록: ${st.best}일`))),
        h('div', { class: 'days' }, days)),
      h('div', { class: 'box' }, h('h3', {}, '퍼즐별 기록'),
        h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, h('th', {}, '퍼즐'), h('th', {}, '푼 판'), h('th', {}, '가장 빠른 기록'))),
          h('tbody', {}, PUZZLE_IDS.flatMap(rowsFor)))),
      h('div', { class: 'box settings' }, h('h3', {}, '설정'),
        sw(voice.on, '음성 안내', (v) => { voice.set(v); if (v) voice.say('음성 안내를 켰어요.'); }),
        sw(sound.on, '효과음', (v) => { sound.set(v); if (v) sound.play('put'); }),
        h('div', { class: 'toggle-row' }, h('span', {}, '기록을 모두 지우기 (어른과 함께)'),
          h('button', { class: 'btn danger', onclick: () => {
            if (confirm('정말 모든 기록과 하던 판을 지울까요? 되돌릴 수 없어요.')) { resetAll(); route(); }
          } }, '지우기')))));
  return { el };
}

// ---------- 주소에 따라 화면 바꾸기 ----------
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [page, type, levelId, mode] = parts;
  if (page === 'p' && PUZZLES[type]) return mount(selectScreen(type));
  if (page === 'records') return mount(recordsScreen());
  if (page === 'play' && PUZZLES[type] && PUZZLES[type].levels.some((l) => l.id === levelId) && (mode === 'daily' || mode === 'practice')) {
    if (!isUnlocked(data.rec, type, levelId)) { location.replace(`#/p/${type}`); return; }
    data.lastLevel[type] = levelId;
    save();
    return mount(playScreen({ type, levelId, mode, nav }));
  }
  return mount(homeScreen());
}

addEventListener('hashchange', route);
document.addEventListener('gesturestart', (e) => e.preventDefault()); // 손가락 두 개로 확대 막기
route();

// 오프라인 캐시: https나 localhost에서만 서비스 워커를 쓸 수 있다
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
