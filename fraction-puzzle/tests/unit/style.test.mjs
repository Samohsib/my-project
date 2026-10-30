// 화면 모양 시험: 색종이 판에 붙이는 이름이 다른 모양(단추 등)과 겹치지 않는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../css/app.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../js/app.js', import.meta.url), 'utf8');

test('색종이 판에 붙이는 이름은 색종이 규칙에서만 쓴다', () => {
  const body = app.slice(app.indexOf('function confetti()'));
  const added = body.match(/box\.classList\.add\('([\w-]+)'\)/);
  assert.ok(added, 'confetti()에서 붙이는 이름을 찾지 못함');
  const name = added[1];
  // .이름 이 나오는 자리는 모두 .confetti.이름 이어야 한다 (예전엔 'go'가 초록 단추 .go 와 겹쳐 화면이 초록으로 덮였다)
  const uses = [...css.matchAll(new RegExp(`(\\S*)\\.${name}(?![\\w-])`, 'g'))];
  assert.ok(uses.length > 0, `.confetti.${name} 규칙이 없음`);
  for (const m of uses) assert.match(m[0], new RegExp(`\\.confetti\\.${name}$`), `다른 규칙과 겹침: ${m[0]}`);
});
