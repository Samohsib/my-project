// 코딩 퍼즐 판 모음
// 지도 글자:  .빈 칸  *별  F깃발  T나무  #바위  ~물   ^ > v < 로봇 출발(보는 방향)
// blocks: 그 판에서 쓸 수 있는 블록   F앞으로 L왼쪽 R오른쪽 rep반복 P나만의블록 if만약
// conds:  만약 블록에서 고를 수 있는 조건
// best:   별 3개를 받는 최소 블록 수 (solution이 그 수로 실제로 풀린다는 것을 시험으로 확인)
// solution: 정답 프로그램 (engine.js의 parseProgram 글 형식)

export const CHAPTERS = [
  {
    n: 1, name: '순서', title: '차례대로 걸어요', theme: 'meadow',
    intro: '반짝이는 블록을 위에서부터 차례대로 해요. 앞으로, 왼쪽으로 돌기, 오른쪽으로 돌기 블록을 쌓아서 깃발까지 데려다주세요!',
    newBlocks: ['F', 'L', 'R'],
  },
  {
    n: 2, name: '반복', title: '여러 번 되풀이해요', theme: 'desert',
    intro: '똑같은 일을 여러 번 할 땐 반복 블록! 안에 넣은 블록을 정한 횟수만큼 되풀이해요. 숫자를 누르면 횟수를 바꿀 수 있어요.',
    newBlocks: ['rep'],
  },
  {
    n: 3, name: '나만의 블록', title: '블록을 직접 만들어요', theme: 'snow',
    intro: '자주 쓰는 블록 묶음을 나만의 블록 칸에 넣어 두면, ★ 블록 하나로 언제든 불러 쓸 수 있어요. 나만의 블록은 반짝이가 보는 방향을 기준으로 움직여요.',
    newBlocks: ['P'],
  },
  {
    n: 4, name: '조건', title: '보고 판단해요', theme: 'cave',
    intro: '만약 블록은 반짝이가 주변을 보고 스스로 판단하게 해요. 앞이 막혔으면 이렇게, 아니면 저렇게! 반복 안에 넣으면 처음 보는 길도 척척 가요.',
    newBlocks: ['if'],
  },
];

const SEQ = ['F', 'L', 'R'];
const LOOP = ['F', 'L', 'R', 'rep'];
const FUNC0 = ['F', 'L', 'R', 'P'];
const FUNC = ['F', 'L', 'R', 'rep', 'P'];
const COND = ['F', 'L', 'R', 'rep', 'if'];

export const LEVELS = [
  // ───────── 1장. 순서 ─────────
  {
    id: '1-1', title: '첫 걸음', blocks: SEQ, best: 3, solution: 'F F F',
    hint: '앞으로 블록을 세 번 쌓고 실행을 눌러 봐요.',
    map: [
      'TTTTTT',
      'T~~~~T',
      'T>..FT',
      'T~~~~T',
      'TTTTTT',
    ],
  },
  {
    id: '1-2', title: '별 줍기', blocks: SEQ, best: 4, solution: 'F F F F',
    hint: '별이 있는 칸을 지나가면 별을 주워요. 별을 다 줍고 깃발로!',
    map: [
      'TTTTTTT',
      'T~~~~~T',
      'T>.*.FT',
      'T~~~~~T',
      'TTTTTTT',
    ],
  },
  {
    id: '1-3', title: '오른쪽으로 돌기', blocks: SEQ, best: 5, solution: 'F F R F F',
    hint: '돌기 블록은 제자리에서 방향만 바꿔요. 반짝이 눈이 어디를 보는지 살펴봐요.',
    map: [
      'TTTTT',
      'T..FT',
      'T.TTT',
      'T^TTT',
      'TTTTT',
    ],
  },
  {
    id: '1-4', title: '왼쪽으로 돌기', blocks: SEQ, best: 6, solution: 'F F L F F F',
    hint: '위로 올라간 다음 왼쪽으로 돌아요.',
    map: [
      'TTTTTT',
      'TF*..T',
      'TTTT.T',
      'TTTT^T',
      'TTTTTT',
    ],
  },
  {
    id: '1-5', title: '작은 계단', blocks: SEQ, best: 7, solution: 'F L F R F L F',
    hint: '앞으로, 왼쪽, 앞으로, 오른쪽… 계단을 한 칸씩 올라가요.',
    map: [
      'TTTTT',
      'TTTFT',
      'TT*.T',
      'T>.TT',
      'TTTTT',
    ],
  },
  {
    id: '1-6', title: 'ㄷ자 길', blocks: SEQ, best: 8, solution: 'F F R F F R F F',
    hint: '오른쪽으로 두 번 꺾어야 해요.',
    map: [
      'TTTTT',
      'T>..T',
      'TTT.T',
      'TF.*T',
      'TTTTT',
    ],
  },
  {
    id: '1-7', title: '뒤로 돌아', blocks: SEQ, best: 8, solution: 'F F L L F F F F',
    hint: '왼쪽으로 두 번 돌면 뒤를 보게 돼요.',
    map: [
      'TTTTTTT',
      'T~~~~~T',
      'T*.<.*T',
      'T~~~~~T',
      'TTTTTTT',
    ],
  },
  {
    id: '1-8', title: '갈림길', blocks: SEQ, best: 9, solution: 'F F F R F F R F F',
    hint: '막다른 길로 가지 않게 조심해요.',
    map: [
      'TTTTTT',
      'T.*.TT',
      'T.T..T',
      'T.TFTT',
      'T^TTTT',
      'TTTTTT',
    ],
  },
  {
    id: '1-9', title: 'ㄹ자 길', blocks: SEQ, best: 10, solution: 'F F F R F F R F F F',
    hint: '오른쪽으로 꺾고, 또 오른쪽으로 꺾어요.',
    map: [
      'TTTTTT',
      'T>...T',
      'TTTT.T',
      'TF*..T',
      'TTTTTT',
    ],
  },
  {
    id: '1-10', title: '들렀다 가기', blocks: SEQ, best: 11, solution: 'F F L F F L L F F F F',
    hint: '왼쪽 별을 먼저 줍고, 뒤로 돌아서 깃발로 가요.',
    map: [
      'TTTTTTT',
      'T*...FT',
      'TTT.TTT',
      'TTT^TTT',
      'TTTTTTT',
    ],
  },
  {
    id: '1-11', title: '구불구불 숲길', blocks: SEQ, best: 12, solution: 'F F F R F F R F F L F F',
    hint: '길을 손가락으로 따라가 보며 블록을 하나씩 쌓아요.',
    map: [
      'TTTTTTT',
      'T*..T.T',
      'T.T.T.T',
      'T.T*.FT',
      'T^TTTTT',
      'TTTTTTT',
    ],
  },
  {
    id: '1-12', title: '순서 졸업 시험', blocks: SEQ, best: 14, solution: 'F F L F F L F F R F F R F F',
    hint: '아래로, 오른쪽으로, 위로, 오른쪽으로, 아래로! 꺾는 방향을 잘 보세요.',
    map: [
      'TTTTTTT',
      'TvT*..T',
      'T.T.T.T',
      'T*..TFT',
      'TTTTTTT',
    ],
  },

  // ───────── 2장. 반복 ─────────
  {
    id: '2-1', title: '긴 복도', blocks: LOOP, best: 2, solution: '8(F)',
    hint: '반복 블록 안에 앞으로 블록을 넣고, 숫자를 눌러 횟수를 정해요.',
    map: [
      '~~~~~~~~~',
      '>.......F',
      '~~~~~~~~~',
    ],
  },
  {
    id: '2-2', title: 'ㄱ자 길', blocks: LOOP, best: 5, solution: '4(F) R 5(F)',
    hint: '반복 블록을 두 개 써 봐요. 그 사이에 돌기 블록!',
    map: [
      'T>..*.T',
      'TTTTT.T',
      'TTTTT*T',
      'TTTTT.T',
      'TTTTT.T',
      'TTTTTFT',
    ],
  },
  {
    id: '2-3', title: '반복 계단', blocks: LOOP, best: 5, solution: '3(F L F R)',
    hint: '계단 한 칸은 앞으로, 왼쪽, 앞으로, 오른쪽. 이걸 몇 번 하면 될까요?',
    map: [
      'TTTTTT',
      'TTTTFT',
      'TTT*.T',
      'TT*.TT',
      'T>.TTT',
      'TTTTTT',
    ],
  },
  {
    id: '2-4', title: '작은 네모', blocks: LOOP, best: 4, solution: '4(F L F)',
    hint: '네 귀퉁이의 별을 모두 주워요. 한 바퀴를 똑같은 조각 네 개로 나눠 봐요.',
    map: [
      'TTTTT',
      'T*.*T',
      'T.T.T',
      'T*>*T',
      'TTTTT',
    ],
  },
  {
    id: '2-5', title: '반복 안에 반복', blocks: LOOP, best: 4, solution: '4(3(F) L)',
    hint: '반복 블록 안에 반복 블록을 넣을 수 있어요. 한 변을 가는 반복을 네 번!',
    map: [
      'TTTTTT',
      'T*..*T',
      'T.TT.T',
      'TFTT.T',
      'T>..*T',
      'TTTTTT',
    ],
  },
  {
    id: '2-6', title: '지그재그', blocks: LOOP, best: 7, solution: '3(F F R F F L)',
    hint: '같은 모양이 몇 번 나오는지 세어 봐요.',
    map: [
      '>..TTTT',
      'TT.TTTT',
      'TT*..TT',
      'TTTT.TT',
      'TTTT*..',
      'TTTTTT.',
      'TTTTTTF',
    ],
  },
  {
    id: '2-7', title: '긴 네모', blocks: LOOP, best: 7, solution: '2(5(F) L 2(F) L)',
    hint: '긴 변, 짧은 변, 긴 변, 짧은 변… 두 번 되풀이돼요.',
    map: [
      'TTTTTTTT',
      'T*....*T',
      'TFTTTT.T',
      'T>....*T',
      'TTTTTTTT',
    ],
  },
  {
    id: '2-8', title: '다이아몬드', blocks: LOOP, best: 8, solution: '3(3(F L F R) F R)',
    hint: '계단 세 칸, 앞으로 한 칸, 오른쪽으로 돌기. 이걸 몇 번?',
    map: [
      'TTT.*TTT',
      'TT....TT',
      'T..TT..T',
      '>.TTTT..',
      'T~TTTT.*',
      'T~~TT..T',
      'TT~~..TT',
      'TTT*.TTT',
    ],
  },
  {
    id: '2-9', title: '십자 별', blocks: LOOP, best: 8, solution: '4(3(F) L L 3(F) R)',
    hint: '갔다가 돌아오고, 방향을 바꾸고… 네 번 되풀이해요.',
    map: [
      'TTT*TTT',
      'TTT.TTT',
      'TTT.TTT',
      '*..^..F',
      'TTT.TTT',
      'TTT.TTT',
      'TTT*TTT',
    ],
  },
  {
    id: '2-10', title: '산 넘기', blocks: LOOP, best: 10, solution: '3(F L F R) 3(F R F L)',
    hint: '올라가는 계단과 내려가는 계단은 꺾는 방향이 반대예요.',
    map: [
      'TTTTTTTT',
      'TTT*.TTT',
      'TT....TT',
      'T..TT..T',
      '>.TTTTFT',
    ],
  },
  {
    id: '2-11', title: '고리 두 개', blocks: LOOP, best: 8, solution: 'F 2(4(2(F) L) 4(F))',
    hint: '고리 하나를 한 바퀴 도는 반복, 다음 고리까지 가는 반복… 그 둘을 또 반복!',
    map: [
      'TTTTTTTT',
      'T*.*T*.*',
      'T.T.T.T.',
      '>.......',
      '~~~~~~~~',
    ],
  },
  {
    id: '2-12', title: '달팽이 집', blocks: LOOP, best: 12, solution: '3(6(F) R) 2(4(F) R) 2(2(F) R)',
    hint: '변의 길이가 6, 6, 6, 4, 4, 2, 2로 줄어들어요.',
    map: [
      '>.....*',
      'TTTTTT.',
      '.....T.',
      '.TTT.T.',
      '.TF..T.',
      '.TTTTT.',
      '*.....*',
    ],
  },

  // ───────── 3장. 나만의 블록 ─────────
  {
    id: '3-1', title: '계단 블록', blocks: FUNC0, best: 8, solution: 'P P P P / F L F R',
    hint: '나만의 블록 칸에 계단 한 칸(앞으로, 왼쪽, 앞으로, 오른쪽)을 넣고, 프로그램에서 ★ 블록을 여러 번 써요.',
    map: [
      'TTTTTTT',
      'TTTTTFT',
      'TTTT*.T',
      'TTT..TT',
      'TT*.TTT',
      'T>.TTTT',
      'TTTTTTT',
    ],
  },
  {
    id: '3-2', title: '세 칸씩 꺾기', blocks: FUNC0, best: 10, solution: 'P R P L P R P / F F F',
    hint: '앞으로 세 칸이 네 번 나와요. 그 사이에 꺾는 방향은 매번 달라요.',
    map: [
      '>..*TTT',
      'TTT.TTT',
      'TTT.TTT',
      'TTT*..*',
      'TTTTTT.',
      'TTTTTT.',
      'TTTTTTF',
    ],
  },
  {
    id: '3-3', title: '쉬어 가는 계단', blocks: FUNC, best: 10, solution: '3(P) F F 2(P) / F L F R',
    hint: '계단 세 칸, 평평한 길 두 칸, 계단 두 칸. 계단 한 칸을 나만의 블록으로!',
    map: [
      'TTTTTTTT',
      'TTTTTTTF',
      'TTTTTT..',
      'TTT*.*.T',
      'TT..TTTT',
      'T..TTTTT',
      '>.TTTTTT',
    ],
  },
  {
    id: '3-4', title: '들쭉날쭉 계단', blocks: FUNC, best: 11, solution: 'P F P P F F P / F L F R',
    hint: '계단 사이 평평한 길의 길이가 매번 달라요. 반복으로는 어렵지만 나만의 블록이라면!',
    map: [
      'TTTTTTTT',
      'TTTTTTTF',
      'TTTT..*.',
      'TTT..TTT',
      'T..*TTTT',
      '>.TTTTTT',
    ],
  },
  {
    id: '3-5', title: '별 빗', blocks: FUNC, best: 14, solution: 'P F P F F P / F L 2(F F L L) R',
    hint: '빗살 하나에 들어갔다 나오는 길을 나만의 블록으로 만들어요. 빗살 사이 거리는 제각각!',
    map: [
      'TTTTTTTT',
      'T*T*TT*T',
      'T.T.TT.T',
      '>......T',
      'TTTTTTTT',
    ],
  },
  {
    id: '3-6', title: '세 갈래 계단', blocks: FUNC, best: 14, solution: '2(P) F R 3(P) F R 2(P) / F L F R',
    hint: '계단 한 칸을 나만의 블록으로 만들면, 어느 방향으로 돌아도 그대로 쓸 수 있어요.',
    map: [
      'TT.*TTT',
      'T....TT',
      '>.TT..T',
      'TTTTT..',
      'TTTTT*.',
      'TTTT..T',
      'TTTTFTT',
    ],
  },
  {
    id: '3-7', title: '바위 세 개', blocks: FUNC, best: 13, solution: 'P F F P R P F / L 2(F R F) L',
    hint: '바위를 위로 돌아 넘는 길을 나만의 블록으로! 아래쪽으로 갈 때도 똑같이 쓸 수 있어요.',
    map: [
      '..*T.*.T',
      '>#...#..',
      'TTTTTT#*',
      'TTTTTT..',
      'TTTTTTFT',
    ],
  },
  {
    id: '3-8', title: '위아래 빗', blocks: FUNC, best: 19, solution: 'F L P R F F R P L F F F L P / 2(F F L L)',
    hint: '빗살에 들어갔다 제자리로 나오는 부분만 나만의 블록으로 만들면, 위로도 아래로도 쓸 수 있어요.',
    map: [
      'TTTTTTTT',
      'T*TTTT*T',
      'T.TTTT.T',
      '>......T',
      'TTT.TTTT',
      'TTT*TTTT',
      'TTTTTTTT',
    ],
  },

  // ───────── 4장. 조건 ─────────
  {
    id: '4-1', title: '막히면 오른쪽', blocks: COND, conds: ['wall'], best: 4, solution: '20(?wall(R)(F))',
    hint: '반복 안에 만약 블록! 앞이 막혔으면 오른쪽으로 돌고, 아니면 앞으로 가요.',
    map: [
      '>...*',
      'TTTT.',
      '.FTT.',
      '.TTT.',
      '*...*',
    ],
  },
  {
    id: '4-2', title: '막히면 왼쪽', blocks: COND, conds: ['wall'], best: 4, solution: '20(?wall(L)(F))',
    hint: '이번엔 꺾는 방향이 반대예요.',
    map: [
      'TTTTTT',
      'TT.*..',
      'TT.TT.',
      'TTFTT*',
      'TTTTT.',
      '>.....',
    ],
  },
  {
    id: '4-3', title: '울퉁불퉁 계단', blocks: COND, conds: ['wall'], best: 6, solution: '20(?wall(L F R)(F))',
    hint: '앞이 막혔으면 한 칸 올라가요(왼쪽, 앞으로, 오른쪽). 계단 높이가 달라도 괜찮아요!',
    map: [
      'TTTTTTTT',
      'TTTTT.*F',
      'TTTTT.TT',
      'TTTTT.TT',
      'TTTT..TT',
      'TT.*.TTT',
      'TT.TTTTT',
      '>..TTTTT',
    ],
  },
  {
    id: '4-4', title: '내려가는 계단', blocks: COND, conds: ['wall', 'open'], best: 6, solution: '20(?open(F)(R F L))',
    newCond: 'open',
    hint: '새 조건 "앞이 뚫렸으면"! 뚫렸으면 앞으로, 아니면 한 칸 내려가요.',
    map: [
      'TTTTTTTT',
      '>.*TTTTT',
      'TT.TTTTT',
      'TT..*TTT',
      'TTTT.TTT',
      'TTTT.TTT',
      'TTTT.*.F',
      'TTTTTTTT',
    ],
  },
  {
    id: '4-5', title: '왼쪽 길 찾기', blocks: COND, conds: ['wall', 'left'], best: 4, solution: '20(?left(L)() F)',
    newCond: 'left',
    hint: '새 조건 "왼쪽이 뚫렸으면"! 막다른 길에 속지 말고 왼쪽 길로 쏙.',
    map: [
      'TTTT.TT',
      'TTTT.TT',
      'TF*..TT',
      'TTTT.TT',
      'TTTT*TT',
      'TTTT.TT',
      '>......',
    ],
  },
  {
    id: '4-6', title: '오른쪽 길 찾기', blocks: COND, conds: ['wall', 'left', 'right'], best: 4, solution: '20(?right(R)() F)',
    newCond: 'right',
    hint: '오른쪽에 길이 보이면 바로 꺾어요.',
    map: [
      '>..*....',
      'TTTTTT.T',
      'TTFTTT.T',
      'TT.TTT*T',
      'TT.TTT.T',
      'T...*..T',
      'TTTTTT.T',
      'TTTTTTTT',
    ],
  },
  {
    id: '4-7', title: '꼬불꼬불 굴', blocks: COND, conds: ['wall', 'left', 'right'], best: 6, solution: '20(?left(L)() ?right(R)() F)',
    hint: '왼쪽으로도 오른쪽으로도 꺾여요. 만약 블록 두 개를 차례로 써 봐요.',
    map: [
      'TTTTTTTT',
      'T*....TT',
      'T.TTT.TT',
      'T...T.TT',
      'TTT.T.TT',
      '...*TFTT',
      '.TTTTTTT',
      '^TTTTTTT',
    ],
  },
  {
    id: '4-8', title: '막다른 길 미로', blocks: COND, conds: ['wall', 'left', 'right'], best: 6, solution: '20(?right(R)() ?wall(L)(F))',
    hint: '오른손으로 벽을 짚고 걷는다고 생각해 봐요. 오른쪽이 뚫렸으면 오른쪽으로, 막혔으면 왼쪽으로 돌기!',
    map: [
      '>....TT',
      'T.T.TTT',
      'T*T...F',
      'TTT*TTT',
      'TTTTTTT',
    ],
  },
  {
    id: '4-9', title: '들쭉날쭉 산', blocks: COND, conds: ['wall', 'left'], best: 6, solution: '20(?left(L)() ?wall(R)(F))',
    hint: '이번엔 왼손으로 벽을 짚어 봐요. 오르막도 내리막도 한 프로그램으로!',
    map: [
      'TTTTTTTT',
      'TT.*.TTT',
      'TT.T.TTT',
      'TT.T..TT',
      'T..TT.TT',
      'T.TTT.*F',
      '>.TTTTTT',
    ],
  },
  {
    id: '4-10', title: '어느 손으로?', blocks: COND, conds: ['wall', 'left', 'right'], best: 5, solution: '20(?wall(R)(F L))',
    hint: '오른손과 왼손 중 어느 쪽으로 벽을 짚어야 빠를까요? 비밀 하나: 만약 블록 하나로도 벽을 짚을 수 있어요. 앞으로 간 다음 왼쪽을 보고, 막혔으면 오른쪽으로!',
    map: [
      'TT....F',
      'TT*TTTT',
      'TT.TTTT',
      '>....TT',
      'T.TTTTT',
      'T.TTTTT',
      'T...TTT',
    ],
  },
  {
    id: '4-11', title: '빗 탐험대', blocks: COND, conds: ['wall', 'left', 'right'], best: 6, solution: '20(20(?wall(R)(F L)))',
    hint: '빗살마다 길이가 달라요. 벽을 짚고 걸으면 빗살 끝까지 들어갔다 나와요. 20번으로 모자라면 반복을 한 번 더 감싸요!',
    map: [
      'TTTTTTTT',
      'TTTTT*TT',
      'T*TTT.TT',
      'T.TTT.TT',
      'T.T*T.TT',
      '>......F',
      'TTTTTTTT',
    ],
  },
  {
    id: '4-12', title: '마지막 미로', blocks: COND, conds: ['wall', 'open', 'left', 'right'], best: 6, solution: '20(20(?wall(R)(F L)))',
    hint: '별 세 개가 막다른 길에 숨어 있어요. 어느 손으로 벽을 짚을지, 몇 번 반복할지 생각해 봐요.',
    map: [
      '>...*T*',
      '.TTTTT.',
      '.T*T...',
      '.T.T.T.',
      '...T.T.',
      '.TTT.T.',
      '.....TF',
    ],
  },
];
