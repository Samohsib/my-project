// 우리나라 지도 탐험 — 화면 흐름
import { project } from './geo.js';
import { hitTest, judge, hintLevel } from './judge.js';
import { STAGES, buildCatalog, makeRound, stageProgress, bookPages, josa } from './quiz.js';
import { createStore } from './store.js';
import * as sound from './sound.js';
import { otterSVG, iconSVG, stampSVG, REGION_COLORS } from './art.js';
import { MapView } from './map.js';

const $ = (id) => document.getElementById(id);
const STAGE_ICONS = { 1: 'region', 2: 'city', 3: 'palace', 4: 'mountain' };

async function loadData() {
  const files = {
    sido: 'data/geo/sido.json',
    rivers: 'data/geo/rivers.json',
    regions: 'data/regions.json',
    cities: 'data/cities.json',
    places: 'data/places.json',
    nature: 'data/nature.json',
  };
  const entries = await Promise.all(Object.entries(files).map(async ([k, url]) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} 를 못 읽음`);
    return [k, await res.json()];
  }));
  return Object.fromEntries(entries);
}

const store = createStore();
let cat;
let data;
let map;
let layers;
const play = { stage: 1, round: [], idx: 0, wrong: 0, assist: 0, locked: true, firstTry: 0, newStamps: [] };

// ---------- 화면 바꾸기 ----------
function show(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.dataset.screen === name));
  $('backBtn').hidden = name === 'home';
  document.body.dataset.screen = name;
  if (name !== 'play') sound.stop();
}

function updateStampCount() {
  $('stampCount').textContent = store.countStamps();
}

function setSoundButton() {
  const on = store.sound;
  sound.setEnabled(on);
  $('soundBtn').textContent = on ? '소리 켜짐' : '소리 꺼짐';
  $('soundBtn').setAttribute('aria-pressed', String(on));
}

// ---------- 처음 화면 ----------
function renderHome() {
  $('homeOtter').innerHTML = otterSVG('idle');
  const grid = $('stageGrid');
  grid.replaceChildren();
  for (const s of STAGES) {
    const { got, total } = stageProgress(s.n, cat, store.stamps);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `stage-card s${s.n}`;
    btn.dataset.stage = s.n;
    btn.innerHTML = `${iconSVG(STAGE_ICONS[s.n])}
      <div style="flex:1;min-width:0">
        <div class="num">${s.n}단계</div>
        <div class="ttl">${s.title}</div>
        <div class="dsc">${s.desc}</div>
        <div class="bar"><i style="width:${Math.round((100 * got) / total)}%"></i></div>
        <div class="cnt">도장 ${got} / ${total}</div>
      </div>`;
    btn.addEventListener('click', () => startStage(s.n));
    grid.appendChild(btn);
  }
  updateStampCount();
}

// ---------- 놀이 ----------
function layersFor(stage) {
  return {
    1: { labels: false },
    2: { labels: false, cities: true }, // 이름표가 도시 점과 겹쳐서 2단계에서는 숨김
    3: { labels: true },
    4: { labels: true, mountains: true, rivers: true },
  }[stage];
}

function kindOfHit(mode, id) {
  if (mode === 'region') return 'region';
  if (mode === 'city') return 'city';
  return cat.mountains.some((m) => m.id === id) ? 'mountain' : 'river';
}

function nameOf(kind, id) {
  if (kind === 'region') return cat.byCode[id].name;
  if (kind === 'city') return cat.cities.find((c) => c.id === id).name;
  if (kind === 'mountain') return cat.mountains.find((m) => m.id === id).name;
  return cat.rivers.find((r) => r.id === id).name;
}

function isThis(name) {
  return josa(name, '이에요/예요');
}

function startStage(n) {
  sound.unlock();
  play.stage = n;
  play.round = makeRound(n, cat, store.stamps);
  play.idx = 0;
  play.firstTry = 0;
  play.newStamps = [];
  show('play');
  map.resetView();
  map.setLayers(layersFor(n));
  $('summary').hidden = true;
  $('result').hidden = true;
  $('guideOtter').innerHTML = otterSVG('idle');
  setTimeout(() => $('mapTip').classList.add('gone'), 8000);
  showQuestion();
}

function showQuestion() {
  const q = play.round[play.idx];
  play.wrong = 0;
  play.assist = 0;
  play.locked = false;
  map.clearMarks();
  if (q.focus) map.mark('region', q.region, 'is-focus');
  $('stageChip').textContent = `${q.stage}단계`;
  $('qProgress').textContent = `${play.idx + 1} / ${play.round.length}`;
  $('prompt').textContent = q.prompt;
  setFeedback('', '');
  $('guideOtter').innerHTML = otterSVG('idle');
  $('result').hidden = true;
  document.body.dataset.question = q.key;
  sound.speak(q.prompt);
}

function setFeedback(text, cls) {
  const f = $('feedback');
  f.textContent = text;
  f.className = `feedback ${cls || ''}`;
}

function answerKind(q) {
  return kindOfHit(q.mode, q.answer);
}

// 도움 단계 보여 주기 (틀렸을 때와 '힌트 보기'에서 함께 씀)
function applyHint(q, level) {
  const parts = [];
  if (level >= 2) {
    parts.push(`힌트: ${q.hint}`);
    if (q.region && q.mode !== 'region') map.mark('region', q.region, 'is-hint');
  }
  if (level >= 3) {
    map.mark(answerKind(q), q.answer, 'is-pulse');
    parts.push('반짝이는 곳을 눌러 봐!');
  }
  return parts.join(' ');
}

function onMapTap({ xy, tol }) {
  if (document.body.dataset.screen !== 'play' || play.locked) return;
  const q = play.round[play.idx];
  const hit = hitTest(q.mode, xy, layers, tol);
  const res = judge(q, hit);
  document.body.dataset.lastJudge = res;
  if (res === 'none') {
    const msg = {
      region: '거기는 바다예요. 땅(시·도)을 눌러 봐!',
      city: '도시는 하얀 동그라미예요. 동그라미를 눌러 봐!',
      nature: '산은 갈색 세모, 강은 파란 줄이에요. 그걸 눌러 봐!',
    }[q.mode];
    setFeedback(msg, '');
    sound.sfx.tap();
    return;
  }
  if (res === 'wrong') {
    play.wrong += 1;
    const kind = kindOfHit(q.mode, hit);
    map.mark(kind, hit, 'is-wrong', 1000);
    if (kind === 'city' || kind === 'mountain') map.mark(kind, hit, 'is-named');
    const level = Math.max(hintLevel(play.wrong), play.assist);
    const extra = applyHint(q, level);
    const msg = `여긴 ${isThis(nameOf(kind, hit))}. ${extra || '다시 찾아볼까?'}`;
    setFeedback(msg, 'bad');
    $('guideOtter').innerHTML = otterSVG('think');
    sound.sfx.wrong();
    sound.speak(msg);
    return;
  }
  onCorrect(q);
}

function onCorrect(q) {
  play.locked = true;
  const firstTry = play.wrong === 0 && play.assist === 0;
  if (firstTry) play.firstTry += 1;
  const isNew = store.addStamp(q.stampId, q.stage, firstTry);
  if (isNew) play.newStamps.push(q);
  const kind = answerKind(q);
  map.mark(kind, q.answer, 'is-right');
  if (q.pin) map.showPin(q.pin, q.title);
  updateStampCount();

  const region = q.region ? cat.byCode[q.region] : null;
  $('resIcon').innerHTML = iconSVG(q.icon, q.color);
  $('resStamp').innerHTML = stampSVG({ name: q.stampName, stage: q.stage, sub: region && q.stage !== 1 ? region.short : '' });
  $('resTitle').textContent = q.title;
  let sub = isNew ? '새 도장을 받았어요!' : '이미 받은 도장이에요. 또 맞혔네!';
  if (q.stage === 3) sub = `${region.name}에 있어요 · ${sub}`;
  $('resSub').textContent = sub;
  $('resFact').textContent = q.fact;
  $('nextBtn').textContent = play.idx + 1 < play.round.length ? '다음 문제 ▶' : '결과 보기 ▶';
  $('result').hidden = false;
  $('guideOtter').innerHTML = otterSVG('happy');
  setFeedback(firstTry ? '한 번에 맞혔어요!' : '찾았어요! 잘했어요.', 'good');
  sound.sfx.right();
  setTimeout(() => sound.sfx.stamp(), 380);
  let where = `${q.title}! `;
  if (q.stage === 3) {
    where = q.kind === '특산물'
      ? `${josa(q.title, '은/는')} ${region.name}의 특산물이에요. `
      : `${josa(q.title, '은/는')} ${region.name}에 있어요. `;
  }
  sound.speak(`정답! ${where}${q.fact}`);
}

function next() {
  $('result').hidden = true;
  if (play.idx + 1 < play.round.length) {
    play.idx += 1;
    showQuestion();
  } else {
    showSummary();
  }
}

function showSummary() {
  store.finishRound();
  map.clearMarks();
  const n = play.round.length;
  $('sumOtter').innerHTML = otterSVG('happy');
  $('sumTitle').textContent = '한 판 끝!';
  $('sumText').textContent = `${n}문제 가운데 ${play.firstTry}문제를 한 번에 맞혔어요. 새 도장 ${play.newStamps.length}개!`;
  $('sumStamps').innerHTML = play.newStamps.map((q) => stampSVG({ name: q.stampName, stage: q.stage })).join('');
  $('summary').hidden = false;
  sound.speak(`한 판 끝! 새 도장을 ${play.newStamps.length}개 받았어요.`);
}

// ---------- 도장 수첩 ----------
function regionShapeSVG(code) {
  const r = cat.byCode[code];
  const polys = r.geometry.coordinates;
  // 가장 큰 덩어리 기준으로 상자를 잡는다 (먼 섬 때문에 너무 작아지지 않게)
  const main = polys.reduce((a, b) => (b[0].length > a[0].length ? b : a));
  const pts = main[0].map(project);
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const pad = Math.max(x1 - x0, y1 - y0) * 0.08;
  const d = polys.map((p) => p.map((ring) => 'M' + ring.map((c) => project(c).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('');
  return `<svg class="shape" viewBox="${(x0 - pad).toFixed(1)} ${(y0 - pad).toFixed(1)} ${(x1 - x0 + 2 * pad).toFixed(1)} ${(y1 - y0 + 2 * pad).toFixed(1)}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${d}" fill="${REGION_COLORS[code]}" stroke="#6c7a89" stroke-width="${(Math.max(x1 - x0, y1 - y0) / 60).toFixed(2)}"/></svg>`;
}

function renderBook() {
  const pages = bookPages(cat);
  const grid = $('bookGrid');
  grid.replaceChildren();
  let got = 0;
  let total = 0;
  for (const page of pages) {
    const have = page.slots.filter((s) => store.hasStamp(s.stampId)).length;
    got += have;
    total += page.slots.length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `book-card${have === page.slots.length ? ' full' : ''}`;
    btn.dataset.page = page.code;
    const shape = page.code === 'rivers' ? iconSVG('river') : regionShapeSVG(page.code);
    btn.innerHTML = `${shape}<div class="nm">${page.short}</div><div class="ct">${have} / ${page.slots.length}</div>
      <div class="dots">${page.slots.map((s) => `<i class="${store.hasStamp(s.stampId) ? 'on' : ''}"></i>`).join('')}</div>`;
    btn.addEventListener('click', () => openPage(page));
    grid.appendChild(btn);
  }
  $('bookSub').textContent = `모은 도장 ${got} / ${total} · 시·도를 누르면 도장을 볼 수 있어요`;
}

function openPage(page) {
  const isRiver = page.code === 'rivers';
  const r = isRiver ? null : cat.byCode[page.code];
  $('pageShape').innerHTML = isRiver ? iconSVG('river') : regionShapeSVG(page.code);
  $('pageTitle').textContent = page.name;
  $('pageOffice').textContent = isRiver ? '한강 · 낙동강 · 금강 · 영산강 · 섬진강' : `${r.office.label}: ${r.office.place}`;
  $('pageFact').textContent = isRiver ? '4단계에서 파란 강줄기를 찾아 누르면 강 도장을 받아요.' : r.fact + (r.office.note ? ` (${r.office.note})` : '');
  $('pageStamps').innerHTML = page.slots.map((s) => {
    const have = store.hasStamp(s.stampId);
    return `<div class="slot${have ? '' : ' empty'}">${stampSVG({ name: s.stampName, stage: s.stage, got: have })}
      <div class="nm">${s.name}</div><div class="kd">${s.stage}단계 · ${s.kind}</div></div>`;
  }).join('');
  $('pageView').hidden = false;
}

// ---------- 자료 출처 ----------
function renderAbout() {
  const sido = data.sido.meta;
  const rv = data.rivers.meta;
  $('aboutBody').innerHTML = `
    <p>탐험가 <b>달수</b>와 함께 지도를 손가락으로 눌러 우리나라 시·도, 도시, 명소, 산과 강을 찾는 놀이예요.
    두 손가락으로 벌리면 지도가 커지고, 한 손가락으로 끌면 움직여요. 틀리면 달수가 힌트를 줘요.</p>
    <div class="note">행정구역은 <b>2026년 10월</b> 기준이에요. 2026년 7월 1일 전라남도와 광주광역시가 합쳐져 <b>전남광주통합특별시</b>가 되었어요.
    전남광주통합특별시는 광주·무안·순천(동부) 세 청사를 함께 쓰고, 주사무소 한 곳을 따로 정했는지는 아직 확인하지 못했어요.</div>
    <h3>지도 경계</h3>
    <ul>
      <li>${sido.source}<br>원자료: ${sido.upstream}<br>라이선스: ${sido.license}<br>
      <a href="https://github.com/vuski/admdongkor">github.com/vuski/admdongkor</a> · <a href="https://sgis.kostat.go.kr">sgis.kostat.go.kr</a></li>
      <li>가공: ${sido.processing}</li>
    </ul>
    <h3>강줄기</h3>
    <ul><li>${rv.license}<br>가공: ${rv.processing}</li></ul>
    <h3>도시·명소·산의 위치</h3>
    <ul><li>Wikidata 좌표 (CC0) — 항목마다 번호를 data 폴더 JSON에 적어 두었어요.</li></ul>
    <h3>특산물</h3>
    <ul><li>${cat.giSource.title}<br><a href="${cat.giSource.url}">${cat.giSource.url}</a></li></ul>
    <h3>그림·캐릭터</h3>
    <ul><li>탐험가 달수와 모든 그림은 이 앱을 위해 새로 그린 것이에요.</li></ul>
    <h3>소리</h3>
    <ul><li>위쪽 '소리' 단추로 음성 안내와 효과음을 끄고 켤 수 있어요.
    아이패드에서 목소리가 안 나오면 설정 → 손쉬운 사용 → 읽기 및 말하기에서 한국어 음성을 확인해 주세요.
    (지금 기기 한국어 음성: ${sound.hasKoreanVoice() ? '있음' : '찾지 못함'})</li></ul>
    <button class="btn danger" id="resetBtn" type="button">도장 모두 지우기</button>`;
  $('resetBtn').addEventListener('click', () => {
    if (confirm('모은 도장을 모두 지울까요? 되돌릴 수 없어요.')) {
      store.reset();
      updateStampCount();
      renderHome();
      show('home');
    }
  });
}

// ---------- 시작 ----------
async function main() {
  data = await loadData();
  cat = buildCatalog(data);
  map = new MapView($('mapHost'), cat);
  layers = {
    regions: cat.regions.map((r) => ({ code: r.code, geometry: r.geometry })),
    cities: cat.cities.map((c) => ({ id: c.id, xy: project(c.ll) })),
    mountains: cat.mountains.map((m) => ({ id: m.id, xy: project(m.ll) })),
    rivers: cat.rivers.map((r) => ({ id: r.id, xys: r.lines.map((l) => l.map(project)) })),
  };
  map.onTap(onMapTap);
  // '두 손가락으로…' 안내는 지도를 한 번 만지거나 조금 지나면 사라진다
  const hideTip = () => $('mapTip').classList.add('gone');
  $('mapHost').addEventListener('pointerdown', hideTip, { once: true });

  $('backBtn').addEventListener('click', () => {
    renderHome();
    show('home');
  });
  $('stampPill').addEventListener('click', () => {
    renderBook();
    show('book');
  });
  $('soundBtn').addEventListener('click', () => {
    store.setSound(!store.sound);
    setSoundButton();
    if (store.sound) {
      sound.unlock();
      sound.speak('소리를 켰어요.');
    }
  });
  $('openBook').addEventListener('click', () => {
    renderBook();
    show('book');
  });
  $('openAbout').addEventListener('click', () => {
    renderAbout();
    show('about');
  });
  $('pageClose').addEventListener('click', () => {
    $('pageView').hidden = true;
  });
  $('pageView').addEventListener('click', (e) => {
    if (e.target === $('pageView')) $('pageView').hidden = true;
  });
  $('nextBtn').addEventListener('click', next);
  $('againBtn').addEventListener('click', () => startStage(play.stage));
  $('sumBook').addEventListener('click', () => {
    renderBook();
    show('book');
  });
  $('sumHome').addEventListener('click', () => {
    renderHome();
    show('home');
  });
  $('hintBtn').addEventListener('click', () => {
    if (play.locked) return;
    const q = play.round[play.idx];
    play.assist = Math.min(3, Math.max(2, play.assist + 1));
    const msg = applyHint(q, Math.max(play.assist, hintLevel(play.wrong)));
    setFeedback(msg, '');
    sound.speak(msg);
  });
  $('replayBtn').addEventListener('click', () => {
    const q = play.round[play.idx];
    if (q) sound.speak(q.prompt);
  });
  $('zoomIn').addEventListener('click', () => map.zoomBy(1.5));
  $('zoomOut').addEventListener('click', () => map.zoomBy(1 / 1.5));
  $('zoomReset').addEventListener('click', () => map.resetView());

  // 사파리 화면 확대(핀치) 막기 — 지도 확대는 앱이 직접 한다
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  addEventListener('pointerdown', () => sound.unlock(), { passive: true });
  addEventListener('touchend', () => sound.unlock(), { passive: true });

  setSoundButton();
  renderHome();
  show('home');
  $('loading').classList.add('done');
  document.body.dataset.ready = '1';

  // 테스트·디버깅용 (지도 좌표 ↔ 화면 좌표)
  window.__koreaMap = { map, cat, play, store, project };

  // 서비스워커(오프라인 저장)는 https 또는 localhost 에서만 켜진다
  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

main().catch((err) => {
  $('loading').textContent = `지도를 불러오지 못했어요: ${err.message}`;
  console.error(err);
});

