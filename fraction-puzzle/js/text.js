// 문제 문장과 틀렸을 때의 설명 글. 글은 '조각' 배열로 만든다:
// 글자(string), 정수(number), 수({t:'f'|'d'})가 섞여 있고, 화면은 수를 분수 모양으로, 음성은 한국어로 읽는다.
import { toMixed, toDecimalString } from './rational.js';
import { F, D, val, say, jo, totalNum, koInt } from './num.js';
import { needCells, givenCells, resultOf, cardPoint } from './judge.js';

const isNum = (x) => x && typeof x === 'object' && (x.t === 'f' || x.t === 'd');

export function speechOf(segs) {
  return segs.map((s) => {
    if (typeof s === 'number') return koInt(s);
    if (isNum(s)) return say(s);
    return String(s)
      .replace(/\s\+\s/g, ' 더하기 ').replace(/\s[−-]\s/g, ' 빼기 ')
      .replace(/\s=\s/g, ' 는 ').replace(/✕/g, '엑스')
      .replace(/\(>, =, <\)/g, '');
  }).join('').replace(/\s+/g, ' ').trim();
}

export function plainOf(segs) {
  return segs.map((s) => (isNum(s) ? (s.t === 'd' ? toDecimalString(val(s), s.p) : s.n === 0 ? String(s.w) : s.w ? `${s.w} ${s.n}/${s.d}` : `${s.n}/${s.d}`) : String(s))).join('');
}

// 유리수를 분수 모양(분모 d) 또는 소수 모양으로
function asFrac(q, d) {
  const m = toMixed(q, d);
  return F(m.w, m.n, d);
}
function asDec(q) {
  const s = toDecimalString(q);
  const [a, b = ''] = s.split('.');
  return D(Number(a + b), b.length);
}
const PLACE = { 1: 10, 2: 100 };
const LETTERS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];
export const pointName = (i) => LETTERS[i];

// ---------- 문제 문장 ----------
export function prompt(p) {
  if (p.kind === 'make') {
    const T = p.target;
    if (p.model === 'pizza') {
      if (p.story === 'rest') return ['피자 한 판을 똑같이 나눠서 ', p.eaten, '만큼 먹었어요. 남은 피자만큼 칠해 보세요.'];
      if (p.write === 'mixed') return [T, '만큼 칠하고, 대분수나 자연수로 바꿔 써 보세요.'];
      if (p.write === 'improper') return [T, '만큼 칠하고, 가분수로 바꿔 써 보세요.'];
      if (p.units > 1) return ['피자를 똑같이 나누고 ', T, '만큼 칠해 보세요. 피자는 여러 판 쓸 수 있어요.'];
      return ['피자를 똑같이 나누고 ', T, '만큼 칠해 보세요.'];
    }
    const thing = p.model === 'bar10' ? '막대' : '모눈';
    if (p.write === 'dec') return [`${thing} 한 개가 1이에요. `, T, '만큼 칠하고, 소수로 써 보세요.'];
    if (p.write === 'frac') return [`${thing} 한 개가 1이에요. `, T, '만큼 칠하고, 분수로 써 보세요.'];
    return [`${thing} 한 개가 1이에요. `, T, '만큼 칠해 보세요.'];
  }
  if (p.kind === 'compare') {
    const thing = p.model === 'grid100' ? '모눈' : '막대';
    return [`두 수만큼 ${thing}에 칠해 보고, 알맞은 기호(>, =, <)를 골라 보세요.`];
  }
  if (p.kind === 'op') {
    if (p.op === '+') return ['더하는 수만큼 새 색으로 더 칠하고, 답을 써 보세요.'];
    return ['칠한 칸을 눌러 빼는 수만큼 ✕로 지우고, 남은 양을 써 보세요.'];
  }
  if (p.kind === 'line-place') return ['깃발을 끌어서 ', p.target, jo(p.target, '이/가'), ' 있는 자리에 꽂아 보세요.'];
  if (p.kind === 'line-cards') return ['카드를 끌어서 수직선의 알맞은 점에 놓아 보세요. 크기가 같은 분수와 소수는 같은 점에 가요.'];
  return [''];
}

// 음성으로 읽을 문제 (덧셈·뺄셈은 식은 화면 가운데에 크게 있으니 음성에만 붙인다)
export function promptSpeech(p) {
  const segs = prompt(p);
  if (p.kind === 'op') return speechOf([p.a, p.op === '+' ? ' + ' : ' − ', p.b, '. ', ...segs]);
  return speechOf(segs);
}

// ---------- 틀렸을 때 설명 ----------

function commonAnswerErr(reason) {
  if (reason === 'empty') return [['답 칸이 비어 있어요. 아래 숫자 단추를 눌러 써 보세요.']];
  if (reason === 'half') return [['분수는 분자와 분모를 둘 다 써야 해요.']];
  if (reason === 'zero') return [['분모에는 0을 쓸 수 없어요. 똑같이 몇 조각으로 나눴는지 써요.']];
  return null;
}

function explainMake(p, res, r) {
  const T = p.target;
  const L = [];
  if (r.reason === 'cuts') {
    const d = T.d;
    if (r.same) L.push(['크기는 같아요! 하지만 분모가 ', d, jo(d, '이니까/니까'), ' 피자를 ', d, '조각으로 나눠야 해요.']);
    else L.push(['분모 ', d, jo(d, '은/는'), ' 피자 한 판을 ', d, '조각으로 똑같이 나눈다는 뜻이에요. 지금은 ', r.got, '조각이에요.']);
    if (T.w > 0) L.push([T, jo(T, '은/는'), ' 꽉 찬 피자 ', T.w, '판과 ', T.n, '조각이에요.']);
    else L.push(['분자 ', T.n, jo(T.n, '은/는'), ' 그중에서 ', T.n, '조각을 칠한다는 뜻이에요.']);
    return L;
  }
  if (r.reason === 'count') {
    if (p.model === 'pizza') {
      L.push(['칠한 조각이 ', r.got, '개예요. ', T, jo(T, '이/가'), ' 되려면 ', r.need, '조각을 칠해야 해요.']);
      if (p.story === 'rest') L.push(['먹은 ', p.eaten.n, '조각을 빼면 ', T.d, ' − ', p.eaten.n, ' = ', T.n, '조각이 남아요.']);
    } else if (p.model === 'bar10') {
      L.push(['막대 한 칸은 ', D(1, 1), jo(D(1, 1), '이에요/예요'), '. ', T, jo(T, '은/는'), ' ', D(1, 1), jo(D(1, 1), '이/가'), ' ', r.need, '개라서 ', r.need, '칸을 칠해요.']);
      L.push(['지금은 ', r.got, '칸을 칠했어요.']);
    } else {
      L.push(['모눈 작은 한 칸은 ', D(1, 2), ', 한 줄(10칸)은 ', D(1, 1), jo(D(1, 1), '이에요/예요'), '.']);
      if (r.place === 'small') L.push([T, jo(T, '은/는'), ' ', D(1, 1), jo(D(1, 1), '이/가'), ' ', (r.need / 10), '개예요. 그래서 ', (r.need / 10), '줄, ', r.need, '칸을 칠해요.']);
      else if (r.place === 'big') L.push([T, jo(T, '은/는'), ' ', D(1, 2), jo(D(1, 2), '이/가'), ' ', r.need, '개예요. 작은 칸 ', r.need, '개만 칠해요.']);
      else L.push([T, jo(T, '은/는'), ' 작은 칸 ', r.need, '개예요. 지금은 ', r.got, '칸을 칠했어요.']);
    }
    return L;
  }
  const c = commonAnswerErr(r.reason);
  if (c) return c;
  const v = val(T);
  if (p.write === 'dec') {
    const ans = asDec(v);
    L.push(['분모가 10인 분수는 소수 한 자리 수, 분모가 100인 분수는 소수 두 자리 수로 써요.']);
    L.push([T, ' = ', ans]);
    return L;
  }
  if (p.write === 'frac') {
    const per = PLACE[T.p];
    L.push(['소수 한 자리 수는 분모가 10인 분수, 소수 두 자리 수는 분모가 100인 분수로 쓸 수 있어요.']);
    L.push([T, ' = ', asFrac(v, per)]);
    return L;
  }
  const d = T.d;
  const total = totalNum(T);
  const N = total % d;
  const W = (total - N) / d;
  if (p.write === 'mixed') {
    if (r.reason === 'form' && N === 0) L.push(['피자 ', W, '판이 꽉 찼어요. 이럴 때는 자연수 ', W, jo(W, '으로/로'), ' 써요.']);
    else if (r.reason === 'form') L.push(['대분수는 자연수와 진분수로 써요. 꽉 찬 피자 ', W, '판과 ', N, '조각이 남아요.']);
    else if (r.reason === 'denom') L.push(['조각 크기는 바뀌지 않아요. 분모는 그대로 ', d, jo(d, '으로/로'), ' 써요.']);
    else L.push(['칠한 피자를 세어 봐요. 꽉 찬 피자 ', W, '판', N ? ['과 ', N, '조각'].join('') : '', '이에요. ', d, '조각이 모이면 1판이에요.']);
    const ans = N ? F(W, N, d) : F(W, 0, d);
    L.push([T, ' = ', ans]);
    return L;
  }
  // improper
  if (r.reason === 'form') L.push(['가분수는 분자가 분모와 같거나 분모보다 큰 분수예요. 자연수 칸을 비우고 써요.']);
  else if (r.reason === 'denom') L.push(['조각 크기는 바뀌지 않아요. 분모는 그대로 ', d, jo(d, '으로/로'), ' 써요.']);
  L.push(['조각을 모두 세어 봐요: ', T.w, '판 × ', d, '조각 + ', T.n, '조각 = ', total, '조각']);
  L.push([T, ' = ', F(0, total, d)]);
  return L;
}

function explainCompare(p, res, r) {
  const L = [];
  if (r.reason === 'paint') {
    const x = r.side === 'a' ? p.a : p.b;
    L.push([r.side === 'a' ? '위' : '아래', '쪽 ', x, jo(x, '이/가'), ' 되려면 ', r.need, '칸을 칠해야 해요. 지금은 ', r.got, '칸이에요.']);
    return L;
  }
  const { a, b } = p;
  const why = r.why;
  if (why === 'sameD') L.push(['분모가 같으면 한 조각의 크기가 같아요. 분자(조각 수)가 큰 쪽이 더 커요.']);
  else if (why === 'unit') L.push(['단위분수는 분모가 클수록 한 조각이 작아져요. 막대 길이를 비교해 봐요.']);
  else if (why === 'mixed') L.push(['대분수는 자연수 부분을 먼저 비교하고, 같으면 분수 부분을 비교해요.']);
  else if (why === 'improper') L.push(['분모가 같은 가분수는 분자가 큰 쪽이 더 커요.']);
  else if (why === 'cross') {
    const imp = a.w === 0 ? a : b;
    L.push(['가분수를 대분수로 바꿔서 비교해 봐요: ', imp, ' = ', asFrac(val(imp), imp.d)]);
  } else if (why === 'places') {
    const one = a.p === 1 ? a : b;
    const two = D(one.i * 10, 2);
    L.push(['자릿수가 많다고 더 큰 수가 아니에요. ', one, jo(one, '은/는'), ' ', two, jo(two, '과/와'), ' 같아요.']);
    L.push(['칠한 칸 수를 비교해 봐요: ', (needCells(p)[0]), '칸과 ', (needCells(p)[1]), '칸']);
  } else {
    L.push(['소수는 자연수 부분부터, 그다음 소수 첫째 자리, 둘째 자리 순서로 비교해요.']);
    L.push(['칠한 칸 수를 비교해 봐요: ', (needCells(p)[0]), '칸과 ', (needCells(p)[1]), '칸']);
  }
  L.push(['그래서 ', a, ` ${r.want} `, b]);
  return L;
}

function explainOp(p, res, r) {
  const L = [];
  const sym = p.op === '+' ? '+' : '−';
  if (r.reason === 'mark') {
    if (p.op === '+') L.push([p.b, jo(p.b, '은/는'), ' ', r.need, '칸이에요. 새 색으로 ', r.need, '칸을 더 칠해 봐요. 지금은 ', r.got, '칸이에요.']);
    else L.push([p.b, '만큼 지우려면 칠한 칸 ', r.need, '개를 눌러 ✕ 표시를 해요. 지금은 ', r.got, '개예요.']);
    return L;
  }
  const c = commonAnswerErr(r.reason);
  if (c) return c;
  const want = resultOf(p);
  const A = givenCells(p);
  const B = needCells(p);
  const R = p.op === '+' ? A + B : A - B;
  if (p.answerType === 'frac') {
    const d = p.a.d;
    if (r.reason === 'denoms') L.push(['분모끼리는 더하지 않아요! 조각 크기(분모)는 그대로 두고, 조각 수(분자)만 더해요.']);
    else if (r.reason === 'borrow') L.push(['분수 부분끼리 뺄 수 없을 때는 자연수에서 1을 빌려 와요. 1 = ', F(0, d, d)]);
    else if (r.reason === 'form') L.push(['분수 부분이 1과 같거나 1보다 커요. ', d, '조각이 모이면 자연수 1로 받아올림해요.']);
    else if (r.reason === 'denom') L.push(['같은 크기의 조각끼리 계산하니까 분모는 그대로 ', d, jo(d, '이에요/예요'), '.']);
    L.push(['칸을 세어 봐요: ', A, '칸 ', sym, ' ', B, '칸 = ', R, '칸 (한 칸은 ', F(0, 1, d), ')']);
    L.push([p.a, ` ${sym} `, p.b, ' = ', asFrac(want, d)]);
    return L;
  }
  const unit = p.model === 'bar10' ? D(1, 1) : D(1, 2);
  if (r.reason === 'align') {
    const one = p.a.p === 1 ? p.a : p.b;
    L.push(['소수점끼리 줄을 맞춰서 같은 자리끼리 계산해요. ', one, jo(one, '은/는'), ' ', D(one.i * 10, 2), jo(D(one.i * 10, 2), '과/와'), ' 같아요.']);
  }
  L.push(['칸을 세어 봐요: ', A, '칸 ', sym, ' ', B, '칸 = ', R, '칸 (한 칸은 ', unit, ')']);
  L.push([p.a, ` ${sym} `, p.b, ' = ', asDec(want)]);
  return L;
}

function stepNum(line, likeT) {
  const s = line.step;
  if (likeT === 'd' && (s.d === 10 || s.d === 100)) return D(1, s.d === 10 ? 1 : 2);
  return F(0, s.n, s.d);
}

function explainLine(p, res, r) {
  const L = [];
  const T = p.target;
  const st = stepNum(p.line, T.t);
  const k = r.want;
  const startLab = p.labels.find((l) => l.k === 0).num;
  L.push(['눈금 한 칸은 ', st, jo(st, '이에요/예요'), '. ', startLab, '에서 ', k, '칸 가면 ', T, jo(T, '이에요/예요'), '.']);
  const v = val(T);
  if (T.t === 'f' && (T.d === 10 || T.d === 100)) L.push([T, ' = ', asDec(v)]);
  else if (T.t === 'd') L.push([T, ' = ', asFrac(v, PLACE[T.p])]);
  if (r.got !== undefined && r.got !== null && Math.abs(r.got - k) === 1) L.push(['한 칸 차이예요! 0에서부터 한 칸씩 다시 세어 봐요.']);
  return L;
}

function explainCards(p, res, r) {
  if (r.reason === 'unplaced') return [['아직 놓지 않은 카드가 있어요. 카드를 모두 점에 놓아 봐요.']];
  const L = [['분모가 10인 분수는 소수 한 자리 수로, 분모가 100인 분수는 소수 두 자리 수로 나타내요.']];
  p.points.forEach((_, i) => {
    const pair = p.cards.filter((c) => cardPoint(p, c) === i);
    const fr = pair.find((c) => c.num.t === 'f').num;
    const de = pair.find((c) => c.num.t === 'd').num;
    L.push([`${pointName(i)}: `, fr, ' = ', de]);
  });
  return L;
}

export function explain(p, res, r) {
  switch (p.kind) {
    case 'make': return explainMake(p, res, r);
    case 'compare': return explainCompare(p, res, r);
    case 'op': return explainOp(p, res, r);
    case 'line-place': return explainLine(p, res, r);
    case 'line-cards': return explainCards(p, res, r);
    default: return [['다시 해 봐요.']];
  }
}

export const PRAISE = ['정답이에요! 멋져요!', '딩동댕! 잘했어요!', '훌륭해요!', '완벽해요!', '최고예요!', '맞았어요! 척척이네요!'];
export const OOPS = ['앗, 아쉬워요! 그림으로 볼까요?', '거의 다 왔어요! 그림을 같이 봐요.', '괜찮아요, 틀리면서 배워요!'];

