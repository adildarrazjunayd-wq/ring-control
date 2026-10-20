// Bruitages synthétisés (aucun fichier audio à télécharger). Coupables depuis le bouton son.
let enabled = localStorage.getItem('ring-control-sound') !== 'off';
let ctx = null;

const PATTERNS = {
  tap: { wave: 'triangle', tones: [420], volume: 0.03 },
  summon: { wave: 'triangle', tones: [440, 660, 880], volume: 0.04 },
  effect: { wave: 'triangle', tones: [740, 980], volume: 0.035 },
  phase: { wave: 'triangle', tones: [330, 520], volume: 0.035 },
  attack: { wave: 'sawtooth', tones: [180, 110], volume: 0.06 },
  hit: { wave: 'square', tones: [140, 70], volume: 0.07 },
  ko: { wave: 'sawtooth', tones: [300, 200, 120, 60], volume: 0.08, step: 0.09 },
  win: { wave: 'triangle', tones: [523, 659, 784, 1046], volume: 0.06, step: 0.12 },
  lose: { wave: 'triangle', tones: [392, 330, 262, 196], volume: 0.05, step: 0.14 },
};

export const soundOn = () => enabled;

export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem('ring-control-sound', enabled ? 'on' : 'off'); } catch { /* ignore */ }
  return enabled;
}

export function sfx(kind = 'tap') {
  if (!enabled) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  const pattern = PATTERNS[kind] || PATTERNS.tap;
  if (!Audio) return;
  try {
    ctx ??= new Audio();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime, step = pattern.step ?? 0.055;
    pattern.tones.forEach((hz, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), t = now + i * step;
      osc.type = pattern.wave;
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(pattern.volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.08);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + step + 0.1);
    });
  } catch { /* audio indisponible */ }
}
