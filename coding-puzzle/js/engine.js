// 코딩 퍼즐 명령 해석기
// 화면(DOM)과 상관없는 순수한 계산만 모아 둔 파일이라 Node에서도 그대로 시험할 수 있다.
//
// 프로그램 모양
//   { main: [블록...], fn: [블록...] }     fn = '나만의 블록' 안에 넣은 블록들
// 블록 모양
//   { k:'F' }                               앞으로 한 칸
//   { k:'L' } / { k:'R' }                   왼쪽 / 오른쪽으로 돌기
//   { k:'P' }                               나만의 블록 부르기
//   { k:'rep', n:3, body:[...] }            n번 반복
//   { k:'if', c:'wall', then:[...], else:[...] }   만약 ~이면 / 아니면
// 블록에 id가 있으면 실행 기록(events)에 그 id가 담겨서 화면에서 지금 도는 블록을 빛낼 수 있다.

// 방향: 0=위, 1=오른쪽, 2=아래, 3=왼쪽 (시계 방향)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const DIR_CHARS = { '^': 0, '>': 1, 'v': 2, '<': 3 };

// 지도 글자
//   .  빈 칸      *  별      F  깃발
//   #  바위      T  나무    ~  물     (셋 다 못 지나감)
//   ^ > v <  로봇이 처음 서 있는 곳과 보는 방향
export const BLOCKED_CHARS = '#T~';

export const CONDITIONS = {
  wall:  '앞이 막혔으면',
  open:  '앞이 뚫렸으면',
  left:  '왼쪽이 뚫렸으면',
  right: '오른쪽이 뚫렸으면',
};

export const MAX_EVENTS = 1000; // 로봇이 이만큼 움직여도 안 끝나면 멈춘다
export const MAX_DEPTH = 12;    // 블록 안에 블록이 너무 깊게 들어가면 멈춘다
export const REPEAT_MIN = 2;
export const REPEAT_MAX = 20;

export function parseMap(rows) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  const cells = [];
  const stars = [];
  let flag = null;
  let start = null;
  for (let y = 0; y < h; y++) {
    const line = [];
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] ?? '#';
      if (ch === '*') stars.push([x, y]);
      if (ch === 'F') flag = [x, y];
      if (ch in DIR_CHARS) start = { x, y, d: DIR_CHARS[ch] };
      line.push(BLOCKED_CHARS.includes(ch) ? ch : '.');
    }
    cells.push(line);
  }
  if (!start) throw new Error('지도에 로봇 출발점(^ > v <)이 없어요');
  return { w, h, cells, stars, flag, start };
}

export function isBlocked(world, x, y) {
  if (x < 0 || y < 0 || x >= world.w || y >= world.h) return true;
  return BLOCKED_CHARS.includes(world.cells[y][x]);
}

export function senses(world, s) {
  const look = d => {
    const [dx, dy] = DIRS[d];
    return !isBlocked(world, s.x + dx, s.y + dy);
  };
  return {
    open: look(s.d),
    left: look((s.d + 3) % 4),
    right: look((s.d + 1) % 4),
  };
}

export function testCondition(world, s, c) {
  const see = senses(world, s);
  switch (c) {
    case 'wall': return !see.open;
    case 'open': return see.open;
    case 'left': return see.left;
    case 'right': return see.right;
    default: throw new Error('모르는 조건: ' + c);
  }
}

export function goalReached(world, s) {
  if (!world.stars.length && !world.flag) return false; // 목표가 없는 연습 지도
  if (s.got.size < world.stars.length) return false;
  if (world.flag && (s.x !== world.flag[0] || s.y !== world.flag[1])) return false;
  return true;
}

class Stop {
  constructor(reason) { this.reason = reason; }
}

// 프로그램을 끝까지(또는 성공·실패할 때까지) 돌리고 기록을 돌려준다.
//   ok:     목표를 이뤘는지
//   reason: 'win' 성공 / 'wall' 벽에 쾅 / 'notDone' 끝났는데 목표가 남음
//           'tooLong' 너무 오래 걸림 / 'tooDeep' 너무 깊음 / 'empty' 블록이 없음
//   events: 화면에서 한 단계씩 보여 줄 일들
export function run(world, program, opts = {}) {
  const maxEvents = opts.maxEvents ?? MAX_EVENTS;
  const record = opts.record !== false;
  const main = program.main || [];
  const fn = program.fn || [];
  const from = opts.from || { ...world.start, got: new Set() };
  const s = { x: from.x, y: from.y, d: from.d, got: new Set(from.got) };
  const events = [];
  const loops = new Map(); // 반복 블록 id → 지금 몇 번째인지
  const stack = [];        // 지금 돌고 있는 블록 id들 (바깥 → 안쪽)
  let count = 0;

  const snapshot = () => ({ x: s.x, y: s.y, d: s.d, got: s.got.size });
  const emit = (kind, extra) => {
    count++;
    if (record) {
      events.push({
        kind, ...snapshot(), id: stack[stack.length - 1] ?? null,
        stack: stack.slice(), loops: Object.fromEntries(loops), ...extra,
      });
    }
    if (count >= maxEvents) throw new Stop('tooLong');
  };

  const exec = (list, depth) => {
    if (depth > MAX_DEPTH) throw new Stop('tooDeep');
    for (const b of list) {
      stack.push(b.id ?? null);
      switch (b.k) {
        case 'F': {
          const [dx, dy] = DIRS[s.d];
          const nx = s.x + dx, ny = s.y + dy;
          if (isBlocked(world, nx, ny)) {
            emit('bump', { tx: nx, ty: ny });
            throw new Stop('wall');
          }
          s.x = nx; s.y = ny;
          let star = -1;
          world.stars.forEach(([sx, sy], i) => {
            if (sx === nx && sy === ny && !s.got.has(i)) { s.got.add(i); star = i; }
          });
          emit('move', star >= 0 ? { star } : undefined);
          if (goalReached(world, s)) throw new Stop('win');
          break;
        }
        case 'L': s.d = (s.d + 3) % 4; emit('turn', { turn: 'L' }); break;
        case 'R': s.d = (s.d + 1) % 4; emit('turn', { turn: 'R' }); break;
        case 'P': exec(fn, depth + 1); break;
        case 'rep': {
          const n = b.n | 0;
          for (let i = 1; i <= n; i++) {
            if (b.id != null) loops.set(b.id, i);
            exec(b.body || [], depth + 1);
          }
          if (b.id != null) loops.delete(b.id);
          break;
        }
        case 'if': {
          const yes = testCondition(world, s, b.c);
          emit('check', { cond: b.c, result: yes });
          exec((yes ? b.then : b.else) || [], depth + 1);
          break;
        }
        default: throw new Error('모르는 블록: ' + b.k);
      }
      stack.pop();
    }
  };

  let reason = 'notDone';
  if (countBlocks(program) === 0) reason = 'empty';
  else {
    try { exec(main, 0); } catch (e) {
      if (e instanceof Stop) reason = e.reason; else throw e;
    }
  }
  return {
    ok: reason === 'win', reason, events,
    final: snapshot(), state: s, starsLeft: world.stars.length - s.got.size,
    onFlag: !!world.flag && s.x === world.flag[0] && s.y === world.flag[1],
  };
}

// ---------- 블록 세기 · 별 매기기 ----------

export function countList(list) {
  let n = 0;
  for (const b of list || []) {
    n++;
    if (b.k === 'rep') n += countList(b.body);
    if (b.k === 'if') n += countList(b.then) + countList(b.else);
  }
  return n;
}

export function countBlocks(program) {
  return countList(program.main) + countList(program.fn);
}

// 3별: 최소 블록 수 이하, 2별: 조금 넉넉하게, 1별: 깨기만 하면
export function twoStarLimit(best) {
  return best + (best <= 5 ? 2 : 3);
}

export function starsFor(blocks, best) {
  if (blocks <= best) return 3;
  if (blocks <= twoStarLimit(best)) return 2;
  return 1;
}

// ---------- 짧은 글로 프로그램 적기 (판 정답·시험용) ----------
//   F L R P            앞으로 / 왼쪽 / 오른쪽 / 나만의 블록
//   3(F L)             3번 반복
//   ?wall(R)(F)        만약 앞이 막혔으면 R, 아니면 F   (아니면 칸은 비워도 됨: ?wall(R)())
//   main / fn          빗금 뒤는 나만의 블록 안에 들어갈 블록

export function parseProgram(text) {
  const [mainText, fnText = ''] = text.split('/');
  return { main: parseList(mainText), fn: parseList(fnText) };
}

function parseList(text) {
  const src = text.replace(/\s+/g, '');
  let i = 0;
  const list = () => {
    const out = [];
    while (i < src.length && src[i] !== ')') out.push(one());
    return out;
  };
  const group = () => {
    if (src[i] !== '(') throw new Error(`'(' 가 필요해요: ${text}`);
    i++;
    const l = list();
    if (src[i] !== ')') throw new Error(`')' 가 필요해요: ${text}`);
    i++;
    return l;
  };
  const one = () => {
    const ch = src[i];
    if ('FLRP'.includes(ch)) { i++; return { k: ch }; }
    if (/\d/.test(ch)) {
      let num = '';
      while (/\d/.test(src[i])) num += src[i++];
      return { k: 'rep', n: Number(num), body: group() };
    }
    if (ch === '?') {
      i++;
      let c = '';
      while (/[a-z]/.test(src[i])) c += src[i++];
      if (!(c in CONDITIONS)) throw new Error('모르는 조건: ' + c);
      const then = group();
      const els = src[i] === '(' ? group() : [];
      return { k: 'if', c, then, else: els };
    }
    throw new Error(`모르는 글자 '${ch}': ${text}`);
  };
  const out = list();
  if (i !== src.length) throw new Error('괄호가 맞지 않아요: ' + text);
  return out;
}

export function formatProgram(program) {
  const fmt = list => (list || []).map(b => {
    if (b.k === 'rep') return `${b.n}(${fmt(b.body)})`;
    if (b.k === 'if') return `?${b.c}(${fmt(b.then)})(${fmt(b.else)})`;
    return b.k;
  }).join(' ');
  const fn = fmt(program.fn);
  return fn ? `${fmt(program.main)} / ${fn}` : fmt(program.main);
}

// 프로그램에 쓰인 블록 종류 (판에서 쓸 수 있는 블록인지 확인할 때)
export function kindsUsed(program) {
  const kinds = new Set();
  const conds = new Set();
  const walk = list => (list || []).forEach(b => {
    kinds.add(b.k);
    if (b.k === 'rep') walk(b.body);
    if (b.k === 'if') { conds.add(b.c); walk(b.then); walk(b.else); }
  });
  walk(program.main);
  walk(program.fn);
  if ((program.fn || []).length) kinds.add('fnDef');
  return { kinds, conds };
}
