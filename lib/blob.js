// Hand-drawn "boiling" blob, same math as the design canvas.
export function blob(shape, jitter, amp = 0.05) {
  let s = shape;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const a1 = r() * 6.28, a2 = r() * 6.28, a3 = r() * 6.28;
  let j = jitter;
  const q = () => { j = (j * 7919 + 104729) % 233280; return j / 233280; };
  const pts = [];
  for (let i = 0; i < 140; i++) {
    const t = (i / 140) * 6.2832;
    const k = 1 + 0.09 * Math.sin(2 * t + a1) + 0.05 * Math.sin(3 * t + a2) + 0.03 * Math.sin(5 * t + a3) + (q() - 0.5) * amp;
    pts.push((100 + k * 88 * Math.cos(t)).toFixed(1) + ' ' + (100 + k * 88 * Math.sin(t)).toFixed(1));
  }
  return 'M' + pts.join(' L') + ' Z';
}
export const tri = (seed) => [blob(seed, 11), blob(seed, 23), blob(seed, 37)];
