// Bruitages fabriqués par le navigateur (aucun fichier à télécharger).
// Version du 21/10/2026 : sons ronds et propres (ondes douces filtrées + petite réverbération d'arène),
// sans bruit de foule. Coupables depuis le bouton son.
let enabled = localStorage.getItem('ring-control-sound') !== 'off';
let ctx = null, out = null, verb = null;

export const soundOn = () => enabled;

export function toggleSound() {
  enabled = !enabled;
  try { localStorage.setItem('ring-control-sound', enabled ? 'on' : 'off'); } catch { /* ignore */ }
  return enabled;
}

// Gardés pour compatibilité : plus de rumeur de foule en fond.
export function startCrowd() {}
export function stopCrowd() {}

function audio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  if (!ctx) {
    ctx = new Audio();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    out = ctx.createGain();
    out.gain.value = 0.55;
    out.connect(comp).connect(ctx.destination);
    // Réverbération courte et douce (impulsion décroissante générée).
    const len = ctx.sampleRate * 1.4, impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const conv = ctx.createConvolver(), damp = ctx.createBiquadFilter();
    conv.buffer = impulse;
    damp.type = 'lowpass';
    damp.frequency.value = 3200;
    verb = ctx.createGain();
    verb.gain.value = 0.22;
    verb.connect(conv).connect(damp).connect(out);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Une note douce : onde + filtre passe-bas + enveloppe, envoyée aussi dans la réverbération.
function note(freq, t, { type = 'sine', vol = 0.12, attack = 0.008, decay = 0.35, to = null, cutoff = 4000, wet = 1 } = {}) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  o.connect(f).connect(g);
  g.connect(out);
  if (wet) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s).connect(verb); }
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

const chord = (freqs, t, opts) => freqs.forEach((f, i) => note(f, t + i * (opts?.spread ?? 0), opts));

// Coup : grosse basse qui chute + petit « clac » adouci.
function thump(t, power = 1) {
  note(150, t, { vol: 0.35 * power, attack: 0.003, decay: 0.22, to: 48, wet: 0.3 });
  note(900, t, { type: 'triangle', vol: 0.05 * power, attack: 0.001, decay: 0.04, to: 300, cutoff: 2500, wet: 0.2 });
}

// Cloche du ring : deux partiels propres, longue résonance.
function bell(t, hits = 3) {
  for (let i = 0; i < hits; i += 1) {
    const s = t + i * 0.28;
    note(1046, s, { vol: 0.09, attack: 0.002, decay: 1.1 });
    note(2637, s, { vol: 0.035, attack: 0.002, decay: 0.6 });
    note(523, s, { vol: 0.04, attack: 0.004, decay: 0.9 });
  }
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, A4 = 440, F4 = 349.2, D5 = 587.3;

const SOUNDS = {
  tap: t => note(1400, t, { type: 'triangle', vol: 0.03, attack: 0.002, decay: 0.05, wet: 0 }),
  phase: t => { note(G5, t, { type: 'triangle', vol: 0.07, decay: 0.18 }); note(C6, t + 0.09, { type: 'triangle', vol: 0.07, decay: 0.3 }); },
  // Entrée sur le ring : montée + accord lumineux + impact.
  summon: t => { note(220, t, { vol: 0.08, attack: 0.18, decay: 0.05, to: 880 }); chord([C5, E5, G5, C6], t + 0.2, { type: 'triangle', vol: 0.06, decay: 0.6, spread: 0.035 }); thump(t + 0.2, 0.7); },
  // Effet activé : scintillement cristallin.
  effect: t => chord([E6, G6, C6 * 2, G6 * 1.5], t, { vol: 0.045, decay: 0.5, spread: 0.06 }),
  // Carte révélée (prise dans le deck, piochée) : petit « ding-ding ».
  reveal: t => { note(G5, t, { vol: 0.08, decay: 0.25 }); note(C6, t + 0.08, { vol: 0.08, decay: 0.5 }); },
  card: t => { note(D5, t, { type: 'triangle', vol: 0.07, decay: 0.2 }); note(A4 * 2, t + 0.07, { type: 'triangle', vol: 0.07, decay: 0.45 }); },
  attack: t => note(500, t, { type: 'triangle', vol: 0.06, attack: 0.01, decay: 0.16, to: 1400, cutoff: 3000, wet: 0.3 }),
  hit: t => thump(t, 1),
  ko: t => { thump(t, 1.3); note(392, t + 0.15, { type: 'triangle', vol: 0.08, decay: 0.7, to: 98 }); bell(t + 0.4, 3); },
  bell: t => bell(t, 3),
  coin: t => { for (let i = 0; i < 8; i += 1) note(2400 + (i % 2) * 400, t + i * 0.15, { vol: 0.03, attack: 0.001, decay: 0.08, wet: 0.4 }); },
  cheer: t => chord([C5, E5, G5, C6], t, { type: 'triangle', vol: 0.07, decay: 0.7, spread: 0.08 }),
  boo: t => { note(E5, t, { type: 'triangle', vol: 0.07, decay: 0.3 }); note(C5 * 0.9, t + 0.18, { type: 'triangle', vol: 0.07, decay: 0.6 }); },
  win: t => { bell(t, 3); chord([C5, E5, G5, C6, E6], t + 0.9, { type: 'triangle', vol: 0.07, decay: 1.2, spread: 0.12 }); },
  lose: t => { bell(t, 3); chord([G5, E5, C5, F4], t + 0.9, { type: 'triangle', vol: 0.06, decay: 0.9, spread: 0.22 }); },
};

export function sfx(kind = 'tap') {
  if (!enabled || !audio()) return;
  try { (SOUNDS[kind] ?? SOUNDS.tap)(ctx.currentTime + 0.01); } catch { /* audio indisponible */ }
}
