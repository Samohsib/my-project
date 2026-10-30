// 판 만들기 도우미: 출발점과 프로그램을 주면 로봇이 지나간 길만 뚫린 지도를 그려 준다.
//   node tools/trace.mjs <가로> <세로> <x> <y> <방향 ^>v<> "<프로그램>" [별이 될 칸 번호들]
// 예) node tools/trace.mjs 7 7 1 5 ">" "4(F L F R)" 2 4
// (칸 번호: 출발점이 0, 한 칸 갈 때마다 1씩)
import { parseProgram, DIRS } from '../js/engine.js';

export function trace(W, H, sx, sy, dch, text, stars = []) {
  const dirs = { '^': 0, '>': 1, 'v': 2, '<': 3 };
  let x = sx, y = sy, d = dirs[dch];
  const path = [[x, y]];
  const prog = parseProgram(text);
  const exec = list => list.forEach(b => {
    if (b.k === 'F') { x += DIRS[d][0]; y += DIRS[d][1]; path.push([x, y]); }
    else if (b.k === 'L') d = (d + 3) % 4;
    else if (b.k === 'R') d = (d + 1) % 4;
    else if (b.k === 'P') exec(prog.fn);
    else if (b.k === 'rep') for (let i = 0; i < b.n; i++) exec(b.body);
  });
  exec(prog.main);
  const grid = Array.from({ length: H }, () => Array(W).fill('T'));
  path.forEach(([px, py]) => {
    if (px < 0 || py < 0 || px >= W || py >= H) throw new Error(`밖으로 나감: ${px},${py}`);
    grid[py][px] = '.';
  });
  stars.forEach(i => { const [px, py] = path[i]; grid[py][px] = '*'; });
  const [fx, fy] = path[path.length - 1];
  grid[fy][fx] = 'F';
  grid[sy][sx] = dch;
  return { rows: grid.map(r => r.join('')), path };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [w, h, sx, sy, dch, text, ...starArgs] = process.argv.slice(2);
  const { rows, path } = trace(+w, +h, +sx, +sy, dch, text, starArgs.map(Number));
  console.log(rows.map(r => `    '${r}',`).join('\n'));
  console.log(`// 길이 ${path.length - 1}칸, 끝 (${path.at(-1)})`);
}
