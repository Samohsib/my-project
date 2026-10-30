// 자동 풀이기
// 판에서 쓸 수 있는 블록으로 '블록 수 B개 이하'인 프로그램을 빠짐없이 찾아본다.
// 프로그램을 앞에서부터 한 덩어리씩 붙여 가며 해석기로 그때그때 돌려 보고,
//  - 벽에 부딪히면 그 뒤는 볼 필요가 없고
//  - 같은 자리·같은 방향·같은 별 수에 '남은 블록 수가 더 적게' 다시 오면 볼 필요가 없다.
// 그래서 찾았다면 진짜로 그 블록 수로 풀 수 있고, 못 찾았다면(시간 안에 다 봤다면)
// B개 이하로는 풀 수 없다는 뜻이다.
//
//   node tools/solver.mjs            모든 판: 적어 둔 최소 블록 수보다 짧은 답이 있는지 찾아본다
//   node tools/solver.mjs 2-5 3-1    몇 판만
//   LIMIT_MS=60000 node tools/solver.mjs   판마다 더 오래 찾기
import { parseMap, run, formatProgram, REPEAT_MIN, REPEAT_MAX } from '../js/engine.js';

const isTurn = b => b.k === 'L' || b.k === 'R';

// 같은 일을 하는 프로그램을 여러 번 만들지 않도록 줄이는 규칙
//  - L R, R L, L L L 은 만들지 않는다. R R 은 L L 과 같으니 L L 만 만든다.
//  - 돌기만 들어 있는 반복, 두 칸이 똑같은 만약 블록은 만들지 않는다.
function okPrefix(first, rest) {
  if (!isTurn(first) || !rest.length || !isTurn(rest[0])) return true;
  const a = first.k, b = rest[0].k;
  if (a !== b || a === 'R') return false;
  if (rest.length > 1 && rest[1].k === a) return false;
  return true;
}

const key = list => list.map(b => {
  if (b.k === 'rep') return `${b.n}(${key(b.body)})`;
  if (b.k === 'if') return `?${b.c}(${key(b.then)})(${key(b.else)})`;
  return b.k;
}).join('');

export function makeEnumerator({ allowRep = false, conds = [], nMax = 8 }) {
  const memo = new Map();
  function stmts(size, withP) {
    const k = `s${size}${withP ? 'p' : ''}`;
    if (memo.has(k)) return memo.get(k);
    const out = [];
    if (size === 1) {
      out.push({ k: 'F' }, { k: 'L' }, { k: 'R' });
      if (withP) out.push({ k: 'P' });
    } else {
      if (allowRep) {
        for (const body of seqs(size - 1, withP)) {
          if (body.every(isTurn)) continue;
          for (let n = REPEAT_MIN; n <= nMax; n++) out.push({ k: 'rep', n, body });
        }
      }
      for (const c of conds) {
        for (let a = 1; a <= size - 1; a++) {
          for (const then of seqs(a, withP)) {
            for (const els of seqs(size - 1 - a, withP)) {
              if (key(then) === key(els)) continue;
              out.push({ k: 'if', c, then, else: els });
            }
          }
        }
      }
    }
    memo.set(k, out);
    return out;
  }
  function seqs(size, withP) {
    if (size === 0) return [[]];
    const k = `q${size}${withP ? 'p' : ''}`;
    if (memo.has(k)) return memo.get(k);
    const out = [];
    for (let first = 1; first <= size; first++) {
      for (const st of stmts(first, withP)) {
        for (const rest of seqs(size - first, withP)) {
          if (okPrefix(st, rest)) out.push([st, ...rest]);
        }
      }
    }
    memo.set(k, out);
    return out;
  }
  return { seqs, stmts };
}

const stateKey = s => `${s.x},${s.y},${s.d},${[...s.got].sort().join('.')}`;

// 블록 수 budget개 이하로 푸는 프로그램을 찾는다.
//   찾음:       { found:true, size, program, text }
//   다 봤는데 없음: { found:false, complete:true }
//   시간이 모자람:  { found:false, complete:false }
export function solve(level, { budget, maxStmt = 5, timeLimitMs = 20000 } = {}) {
  const world = parseMap(level.map);
  const blocks = new Set(level.blocks);
  const conds = blocks.has('if') ? (level.conds || ['wall']) : [];
  const nMax = level.nMax ?? REPEAT_MAX; // 아이가 고를 수 있는 반복 횟수 전부
  const en = makeEnumerator({ allowRep: blocks.has('rep'), conds, nMax });
  const t0 = Date.now();
  let sims = 0;
  // 한 덩어리(블록 하나와 그 안에 든 것)는 maxStmt개까지만 만들어 보므로,
  // budget이 그보다 크면 '빠짐없이 다 봤다'고 말할 수 없다.
  const complete = budget <= maxStmt;

  const timeUp = () => (++sims & 1023) === 0 && Date.now() - t0 > timeLimitMs;

  const fnSizes = blocks.has('P') ? [0, ...range(2, budget - 1)] : [0];
  for (const fnSize of fnSizes) {
    const fnList = fnSize ? en.seqs(fnSize, false) : [[]];
    for (const fn of fnList) {
      const start = { ...world.start, got: new Set() };
      const visited = new Map([[stateKey(start), budget - fnSize]]);
      const path = [];
      const dfs = (state, remaining) => {
        for (let size = 1; size <= Math.min(remaining, maxStmt); size++) {
          for (const st of en.stmts(size, fnSize > 0)) {
            if (timeUp()) throw new Error('timeout');
            const r = run(world, { main: [st], fn }, { record: false, from: state });
            if (r.ok) { path.push(st); return true; }
            if (r.reason !== 'notDone') continue;
            const rem = remaining - size;
            if (rem <= 0) continue;
            const k = stateKey(r.state);
            if ((visited.get(k) ?? -1) >= rem) continue;
            visited.set(k, rem);
            path.push(st);
            if (dfs(r.state, rem)) return true;
            path.pop();
          }
        }
        return false;
      };
      try {
        if (dfs(start, budget - fnSize)) {
          const program = { main: path, fn };
          // 해석기로 처음부터 한 번 더 돌려서 확인
          if (!run(world, program, { record: false }).ok) throw new Error('풀이기 오류: ' + formatProgram(program));
          return { found: true, program, text: formatProgram(program), size: countProgram(program), sims, ms: Date.now() - t0 };
        }
      } catch (e) {
        if (e.message !== 'timeout') throw e;
        return { found: false, complete: false, sims, ms: Date.now() - t0 };
      }
    }
  }
  return { found: false, complete, sims, ms: Date.now() - t0 };
}

function countProgram(p) {
  const c = l => l.reduce((n, b) => n + 1 + (b.k === 'rep' ? c(b.body) : 0) + (b.k === 'if' ? c(b.then) + c(b.else) : 0), 0);
  return c(p.main) + c(p.fn);
}

function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

// 명령줄에서 돌릴 때
if (import.meta.url === `file://${process.argv[1]}`) {
  const { LEVELS } = await import('../js/levels.js');
  const pick = process.argv.slice(2);
  const limit = Number(process.env.LIMIT_MS || 20000);
  const maxStmt = Number(process.env.MAX_STMT || 5);
  for (const lv of LEVELS) {
    if (pick.length && !pick.includes(lv.id)) continue;
    const r = solve(lv, { budget: lv.best - 1, maxStmt, timeLimitMs: limit });
    const tag = r.found ? `⚠ 더 짧은 답 ${r.size}개: ${r.text}`
      : r.complete ? '✓ 최소 (더 짧은 답 없음)'
      : (r.ms >= limit ? '… 시간 초과' : `… 한 덩어리 ${maxStmt}개까지만 봄: 더 짧은 답 못 찾음`);
    console.log(`${lv.id.padEnd(5)} 3별=${String(lv.best).padStart(2)}  ${tag}  (${r.sims}번, ${r.ms}ms)`);
  }
}
