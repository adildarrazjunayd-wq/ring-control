// Animations du duel : entrée sur le ring, dégâts, K.-O., attaque.
// On compare l'état avant/après chaque affichage, ce qui anime aussi bien les
// actions du joueur que celles de l'IA sans les coder une par une.
import { $, card, esc, CARD_BACK } from './core.js';
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
      if (delta && el) {
        const r = el.getBoundingClientRect();
        if (delta < 0) burst(r);
        floatText(r, delta < 0 ? `${delta}` : `+${delta}`, delta < 0 ? 'dmg' : 'heal', delta < 0 ? 'END' : 'END');
        el.classList.add(delta < 0 ? 'fx-hit' : 'fx-heal');
        hit ||= delta < 0;
      }
    }
    for (const [id, info] of previous.fighters) {
      if (!now.fighters.has(id) && info.rect) { koSplash(info.rect, card(info.cardId)?.displayName); ko = true; }
    }
    now.hp.forEach((hp, pi) => {
      const delta = hp - previous.hp[pi];
      const bar = $(`[data-hp="${pi}"]`);
      if (delta && bar) {
        floatText(bar.getBoundingClientRect(), delta < 0 ? `${delta}` : `+${delta}`, delta < 0 ? 'dmg big' : 'heal big', 'PV');
        if (delta < 0) {
          bar.classList.add('fx-shake');
          $('.board')?.classList.add('fx-shake');
          const flash = document.createElement('div');
          flash.className = `fx-screen ${pi === 0 ? 'me' : 'ai'}`;
          document.body.append(flash);
          setTimeout(() => flash.remove(), 600);
          hit = true;
        }
      }
    });
    if (ko) sfx('ko'); else if (hit) sfx('hit');
  }
  previous = now;
  drainEvents(match);
}

// Onde de choc à l'endroit du coup.
function burst(rect) {
  const el = document.createElement('div');
  el.className = 'fx-burst';
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + rect.height / 2}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 700);
}

function floatText(rect, text, cls, unit = '') {
  const el = document.createElement('div');
  el.className = `fx-float ${cls}`;
  el.innerHTML = `${esc(text)}${unit ? `<small>${unit}</small>` : ''}`;
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

// ---------- Cartes montrées en grand (façon Duel Links) ----------
// Le moteur remplit match.fxQueue ; on les montre l'une après l'autre sans bloquer le jeu.
const shows = [];
let showing = false;
const SOUND_OF = { effect: 'effect', reveal: 'reveal', draw: 'reveal', summon: 'summon', card: 'card' };

export function drainEvents(match, { silent = false } = {}) {
  const events = match?.fxQueue ?? [];
  if (!events.length) return;
  match.fxQueue = [];
  if (silent) return;
  shows.push(...events);
  if (!showing) nextShow();
}

// Texte imprimé à rappeler sous la carte, pour comprendre ce que fait l'adversaire.
function printedText(ev) {
  const c = card(ev.cardId);
  if (!c || ev.kind === 'draw' || ev.kind === 'reveal') return '';
  if (ev.kind === 'summon') return c.attack != null ? `${c.attack} ATT · ${c.endurance} END` : '';
  const kind = /passif/i.test(ev.title ?? '') ? 'passif' : /spécial/i.test(ev.title ?? '') ? 'spécial' : null;
  return (c.effects.find(e => e.kind === kind) ?? c.effects[0])?.text ?? '';
}

let waiters = [];
let skipping = false; // « Tout passer » : les actions suivantes de l'IA défilent sans attendre

// Résolue quand plus aucune carte n'est montrée : l'IA attend ce moment pour continuer.
export function whenShowsDone() {
  return showing || shows.length ? new Promise(resolve => waiters.push(resolve)) : Promise.resolve();
}
export function resetSkip() { skipping = false; }

function nextShow() {
  const ev = shows.shift();
  if (!ev) { showing = false; waiters.splice(0).forEach(resolve => resolve()); return; }
  showing = true;
  // Les actions de l'IA attendent un clic « OK » ; les tiennes défilent seules.
  const confirm = ev.pi === 1 && !skipping;
  const faces = ev.kind === 'draw' && ev.pi === 1 ? ev.cardIds.map(() => null) : (ev.cardIds ?? [ev.cardId]);
  const el = document.createElement('div');
  el.className = `cardshow ${ev.pi === 1 ? 'ai' : 'me'} ${ev.kind} ${confirm ? 'confirm' : ''}`;
  const imgs = faces.map(id => `<img src="/${id ? card(id)?.image : CARD_BACK}" alt="">`).join('');
  const sub = ev.kind === 'draw' && ev.pi === 1 ? `${ev.sub} · ${faces.length} carte${faces.length > 1 ? 's' : ''}` : ev.sub;
  const text = confirm ? printedText(ev) : '';
  const left = shows.filter(x => x.pi === 1).length;
  el.innerHTML = `<div class="cs-ribbon"><small>${ev.pi === 1 ? 'L’IA' : 'TOI'}</small>${esc(ev.title ?? '')}</div>
    <div class="cs-cards n${Math.min(faces.length, 3)}">${imgs}</div>
    ${sub ? `<div class="cs-sub">${esc(sub)}</div>` : ''}
    ${text ? `<p class="cs-text">${esc(text)}</p>` : ''}
    ${confirm ? `<div class="cs-buttons"><button class="btn hot big" data-cs="next">OK ${left ? `▶ (${left} de plus)` : '▶'}</button>${left ? '<button class="btn ghost" data-cs="skip">Tout passer</button>' : ''}</div>` : ''}`;
  document.body.append(el);
  sfx(SOUND_OF[ev.kind] ?? 'effect');
  const close = () => {
    if (!el.isConnected) return;
    document.removeEventListener('keydown', onKey);
    el.classList.add('out');
    setTimeout(() => { el.remove(); nextShow(); }, 200);
  };
  const onKey = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); close(); } };
  if (confirm) {
    el.querySelector('[data-cs="next"]').addEventListener('click', close);
    el.querySelector('[data-cs="skip"]')?.addEventListener('click', () => { skipping = true; close(); });
    document.addEventListener('keydown', onKey);
    el.querySelector('[data-cs="next"]').focus();
  } else {
    setTimeout(close, ev.kind === 'summon' ? 650 : 1150);
  }
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
