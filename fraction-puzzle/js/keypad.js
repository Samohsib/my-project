// 큰 숫자 단추로 답 쓰기. 분수는 [자연수][분자/분모] 세 칸, 소수는 한 칸.
const LIMIT = { w: 2, n: 3, d: 3, x: 6 };

export class Keypad {
  constructor({ type = 'frac', onChange = null }) {
    this.type = type;
    this.onChange = onChange;
    this.vals = { w: '', n: '', d: '', x: '' };
    this.focus = type === 'frac' ? 'n' : 'x';
    const root = (this.root = document.createElement('div'));
    root.className = `keypad keypad-${type}`;
    const ans = document.createElement('div');
    ans.className = 'answer';
    if (type === 'frac') {
      ans.innerHTML = `
        <button class="box box-w" data-box="w" aria-label="자연수"></button>
        <div class="fr-boxes">
          <button class="box box-n" data-box="n" aria-label="분자"></button>
          <div class="fr-bar"></div>
          <button class="box box-d" data-box="d" aria-label="분모"></button>
        </div>`;
    } else {
      ans.innerHTML = '<button class="box box-x" data-box="x" aria-label="소수"></button>';
    }
    root.appendChild(ans);
    this.boxes = Object.fromEntries([...ans.querySelectorAll('[data-box]')].map((b) => [b.dataset.box, b]));
    Object.values(this.boxes).forEach((b) => b.addEventListener('click', () => { this.focus = b.dataset.box; this.paint(); }));
    const keys = document.createElement('div');
    keys.className = 'keys';
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', type === 'dec' ? '.' : '', '0', '⌫'];
    labels.forEach((k) => {
      const b = document.createElement('button');
      b.className = `key${k === '' ? ' blank' : ''}${k === '⌫' ? ' back' : ''}`;
      b.textContent = k;
      b.dataset.key = k === '⌫' ? 'back' : k;
      if (k === '') b.disabled = true;
      else b.addEventListener('click', () => this.press(b.dataset.key));
      keys.appendChild(b);
    });
    root.appendChild(keys);
    this.hint = document.createElement('div');
    this.hint.className = 'pad-hint';
    root.appendChild(this.hint);
    this.paint();
  }

  press(k) {
    if (this.disabled) return;
    const f = this.focus;
    let v = this.vals[f];
    if (k === 'back') v = v.slice(0, -1);
    else if (k === '.') { if (!v.includes('.')) v = (v || '0') + '.'; }
    else if (v.length < LIMIT[f]) v = v === '0' ? k : v + k;
    this.vals[f] = v;
    this.paint();
    if (this.onChange) this.onChange(this.value());
  }

  paint() {
    Object.entries(this.boxes).forEach(([k, b]) => {
      b.textContent = this.vals[k];
      b.classList.toggle('focus', k === this.focus);
      b.classList.toggle('empty', this.vals[k] === '');
    });
  }

  value() {
    if (this.type === 'dec') return this.vals.x;
    const num = (s) => (s === '' ? null : Number(s));
    return { w: num(this.vals.w), n: num(this.vals.n), d: num(this.vals.d) };
  }

  filled() {
    return this.type === 'dec' ? this.vals.x !== '' : this.vals.w !== '' || this.vals.n !== '' || this.vals.d !== '';
  }

  setEnabled(on, hint = '') {
    this.disabled = !on;
    this.root.classList.toggle('off', !on);
    this.hint.textContent = hint;
  }
}
