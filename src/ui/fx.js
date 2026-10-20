// Animations du duel : entrée sur le ring, dégâts, K.-O., attaque.
// On compare l'état avant/après chaque affichage, ce qui anime aussi bien les
// actions du joueur que celles de l'IA sans les coder une par une.
import { $, card } from './core.js';
import { sfx } from './sound.js';

let previous = null; // { matchId, fighters: Map(instanceId -> {endurance, rect}), hp: [a, b] }

function snapshot(match) {
  const fighters = new Map();
  match.players.forEach((p, pi) => {
    for (const f of [...p.active, ...p.passive]) {
      const el = document.querySelector(`[data-fighter="${pi}:${f.instanceId}"]`);
      fighters.set(f.instanceId, { endurance: f.endurance, cardId: f.cardId, rect: el?.getBoundingClientRect() ?? null });
    }
  });
  return { matchId: match.matchId, fighters, hp: match.players.map(p => p.hp), hand: [...match.players[0].hand] };
}

// Seules les cartes nouvellement piochées glissent dans la main.
function dealNewCards(before) {
  const left = [...before];
  for (const el of document.querySelectorAll('.hcard')) {
    const at = left.indexOf(el.dataset.id);
    if (at >= 0) left.splice(at, 1);
    else el.classList.add('fx-deal');
  }
}

// À appeler juste avant de remplacer le HTML du duel.
export function beforeRender(match) {
  if (match && previous?.matchId === match.matchId) {
    // Rafraîchit les positions à l'écran avant qu'elles ne disparaissent.
    for (const [id, info] of previous.fighters) {
      const el = document.querySelector(`[data-fighter$=":${id}"]`);
      if (el) info.rect = el.getBoundingClientRect();
    }
  }
}

// À appeler juste après : joue les animations des changements constatés.
export function afterRender(match) {
  if (!match) { previous = null; return; }
  const now = snapshot(match);
  dealNewCards(previous?.matchId === match.matchId ? previous.hand : []);
  if (previous?.matchId === match.matchId) {
    let ko = false, hit = false;
    for (const [id, info] of now.fighters) {
      const before = previous.fighters.get(id);
      const el = document.querySelector(`[data-fighter$=":${id}"]`);
      if (!before) { el?.classList.add('fx-enter'); continue; }
      const delta = info.endurance - before.endurance;
      if (delta && el) { floatText(el.getBoundingClientRect(), `${delta > 0 ? '+' : ''}${delta} END`, delta < 0 ? 'dmg' : 'heal'); el.classList.add(delta < 0 ? 'fx-hit' : 'fx-heal'); hit ||= delta < 0; }
    }
    for (const [id, info] of previous.fighters) {
      if (!now.fighters.has(id) && info.rect) { koSplash(info.rect, card(info.cardId)?.displayName); ko = true; }
    }
    now.hp.forEach((hp, pi) => {
      const delta = hp - previous.hp[pi];
      const bar = $(`[data-hp="${pi}"]`);
      if (delta && bar) {
        floatText(bar.getBoundingClientRect(), `${delta > 0 ? '+' : ''}${delta} PV`, delta < 0 ? 'dmg big' : 'heal big');
        if (delta < 0) { bar.classList.add('fx-shake'); $('.board')?.classList.add('fx-shake'); hit = true; }
      }
    });
    if (ko) sfx('ko'); else if (hit) sfx('hit');
  }
  previous = now;
}

function floatText(rect, text, cls) {
  const el = document.createElement('div');
  el.className = `fx-float ${cls}`;
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 3}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1400);
}

function koSplash(rect, name) {
  const el = document.createElement('div');
  el.className = 'fx-ko';
  el.innerHTML = `K.-O. !<small>${name ?? ''}</small>`;
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1600);
}

export function banner(text, cls = '') {
  const el = document.createElement('div');
  el.className = `fx-banner ${cls}`;
  el.innerHTML = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 1500);
}

// Rayon de l'attaquant vers sa cible, avant la résolution des dégâts.
export function animateAttack(attack) {
  if (!attack) return Promise.resolve();
  return new Promise(resolve => {
    const from = document.querySelector(`[data-fighter="${attack.playerIndex}:${attack.attackerId}"]`);
    const to = attack.targetId === 'direct'
      ? document.querySelector(`[data-hp="${1 - attack.playerIndex}"]`)
      : document.querySelector(`[data-fighter="${1 - attack.playerIndex}:${attack.targetId}"]`);
    sfx('attack');
    if (!from || !to) { setTimeout(resolve, 400); return; }
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    const x = a.left + a.width / 2, y = a.top + a.height / 2, dx = b.left + b.width / 2 - x, dy = b.top + b.height / 2 - y;
    const beam = document.createElement('div');
    beam.className = 'fx-beam';
    beam.style.left = `${x}px`;
    beam.style.top = `${y}px`;
    beam.style.setProperty('--len', `${Math.hypot(dx, dy)}px`);
    beam.style.setProperty('--angle', `${Math.atan2(dy, dx)}rad`);
    const spark = document.createElement('div');
    spark.className = 'fx-spark';
    spark.style.left = `${x + dx}px`;
    spark.style.top = `${y + dy}px`;
    from.classList.add('fx-lunge');
    document.body.append(beam, spark);
    setTimeout(() => { beam.remove(); spark.remove(); from.classList.remove('fx-lunge'); resolve(); }, 700);
  });
}
