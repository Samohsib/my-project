// 꽃가루
const COLORS = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#6c5ce7', '#f78c1f'];

export function confetti(count = 70) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let k = 0; k < count; k++) {
    const i = document.createElement('i');
    i.style.left = `${Math.random() * 100}%`;
    i.style.background = COLORS[k % COLORS.length];
    i.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    i.style.animationDelay = `${Math.random() * 0.5}s`;
    i.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(i);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4000);
}
