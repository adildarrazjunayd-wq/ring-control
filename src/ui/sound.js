// Bruitages « ambiance catch », fabriqués par le navigateur (aucun fichier à télécharger) :
// cloche du ring, foule, coups, chutes, pyrotechnie d'entrée. Coupables depuis le bouton son.
let enabled = localStorage.getItem('ring-control-sound') !== 'off';
let ctx = null, master = null, noise = null, crowdLoop = null;

export const soundOn = () => enabled;

export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem('ring-control-sound', enabled ? 'on' : 'off'); } catch { /* ignore */ }
  if (!enabled) stopCrowd();
  return enabled;
}

function audio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!ctx) {
    ctx = new Audio();
    master = ctx.createGain();
    master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    // Bruit blanc réutilisé pour la foule, les coups et les souffles.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Petit outil : enveloppe attaque/déclin sur un gain.
function env(gain, t, peak, attack, decay) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq, t, { type = 'sine', peak = 0.2, attack = 0.005, decay = 0.4, to = null } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  env(g, t, peak, attack, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function hiss(t, { filter = 'bandpass', freq = 1000, q = 1, peak = 0.2, attack = 0.01, decay = 0.3, sweepTo = null } = {}) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise;
  src.loop = true;
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay);
  f.Q.value = q;
  env(g, t, peak, attack, decay);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + attack + decay + 0.05);
}

// Cloche du ring : partiels métalliques inharmoniques qui résonnent.
function bell(t, hits = 1) {
  for (let i = 0; i < hits; i += 1) {
    const s = t + i * 0.32;
    for (const [ratio, peak] of [[1, 0.16], [2.76, 0.1], [5.4, 0.06], [8.93, 0.035]]) tone(820 * ratio, s, { peak, attack: 0.002, decay: 1.6 / ratio + 0.3 });
  }
}

// Foule : bruit filtré qui monte puis redescend, avec un léger tremblement.
function crowd(t, { peak = 0.12, attack = 0.25, decay = 1.6, freq = 900 } = {}) {
  hiss(t, { freq, q: 0.6, peak, attack, decay });
  hiss(t + 0.05, { freq: freq * 2.2, q: 1.2, peak: peak * 0.5, attack, decay: decay * 0.8 });
}

function punch(t, power = 1) {
  tone(140, t, { type: 'sine', peak: 0.5 * power, attack: 0.003, decay: 0.18, to: 45 });
  hiss(t, { filter: 'lowpass', freq: 2500, peak: 0.35 * power, attack: 0.002, decay: 0.09 });
}

function slam(t) {
  tone(90, t, { type: 'sine', peak: 0.6, attack: 0.004, decay: 0.45, to: 32 });
  hiss(t, { filter: 'lowpass', freq: 900, peak: 0.4, attack: 0.003, decay: 0.35 });
  hiss(t + 0.02, { filter: 'highpass', freq: 3000, peak: 0.08, attack: 0.002, decay: 0.15 }); // claquement du tapis
}

const SOUNDS = {
  tap: t => tone(1200, t, { type: 'triangle', peak: 0.05, decay: 0.05 }),
  phase: t => { tone(523, t, { type: 'square', peak: 0.05, decay: 0.12 }); tone(784, t + 0.1, { type: 'square', peak: 0.05, decay: 0.2 }); },
  // Entrée sur le ring : souffle pyrotechnique + explosion + foule.
  summon: t => { hiss(t, { freq: 300, sweepTo: 4000, q: 2, peak: 0.18, attack: 0.25, decay: 0.2 }); slam(t + 0.42); crowd(t + 0.45, { peak: 0.1, decay: 1.4 }); },
  effect: t => { [880, 1175, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, { type: 'triangle', peak: 0.06, decay: 0.35 })); hiss(t, { freq: 6000, q: 3, peak: 0.04, attack: 0.05, decay: 0.4 }); },
  attack: t => { hiss(t, { freq: 600, sweepTo: 2500, q: 1.5, peak: 0.12, attack: 0.08, decay: 0.12 }); },
  hit: t => { punch(t, 1); crowd(t + 0.05, { peak: 0.08, attack: 0.05, decay: 0.8, freq: 1100 }); },
  ko: t => { slam(t); bell(t + 0.35, 3); crowd(t + 0.3, { peak: 0.2, attack: 0.3, decay: 2.5 }); },
  bell: t => bell(t, 3),
  coin: t => { for (let i = 0; i < 9; i += 1) tone(2400 + (i % 2) * 300, t + i * 0.16, { type: 'triangle', peak: 0.04, decay: 0.06 }); },
  cheer: t => crowd(t, { peak: 0.18, attack: 0.3, decay: 2 }),
  boo: t => { hiss(t, { freq: 320, q: 4, peak: 0.12, attack: 0.3, decay: 1.4 }); tone(150, t, { type: 'sawtooth', peak: 0.03, attack: 0.3, decay: 1.2, to: 110 }); },
  win: t => { bell(t, 3); crowd(t + 0.2, { peak: 0.25, attack: 0.5, decay: 3 }); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + 0.9 + i * 0.14, { type: 'square', peak: 0.05, decay: 0.4 })); },
  lose: t => { bell(t, 3); [392, 330, 262, 196].forEach((f, i) => tone(f, t + 0.9 + i * 0.22, { type: 'sawtooth', peak: 0.05, decay: 0.45 })); hiss(t + 0.5, { freq: 320, q: 4, peak: 0.1, attack: 0.3, decay: 1.6 }); },
};

export function sfx(kind = 'tap') {
  if (!enabled || !audio()) return;
  try { (SOUNDS[kind] ?? SOUNDS.tap)(ctx.currentTime + 0.01); } catch { /* audio indisponible */ }
}

// Rumeur de la foule en fond pendant le duel, très discrète.
export function startCrowd() {
  if (!enabled || crowdLoop || !audio()) return;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
  src.buffer = noise;
  src.loop = true;
  f.type = 'bandpass';
  f.frequency.value = 700;
  f.Q.value = 0.5;
  g.gain.value = 0.018;
  lfo.frequency.value = 0.15;
  depth.gain.value = 0.008;
  lfo.connect(depth).connect(g.gain);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
  crowdLoop = { src, lfo };
}

export function stopCrowd() {
  if (!crowdLoop) return;
  try { crowdLoop.src.stop(); crowdLoop.lfo.stop(); } catch { /* déjà arrêté */ }
  crowdLoop = null;
}
