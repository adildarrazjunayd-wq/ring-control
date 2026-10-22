// Effets que le joueur déclenche lui-même (effets passifs « à action », effets spéciaux hors attaque,
// effets depuis le cimetière, Momenta qui visent une carte) et choix déclenchés par l'arrivée au cimetière.
import { addHistory, emit, lookupCard, specialSummon, legalPositions, resolveMomentum, activateWrestlerEffect, sendFighterToGrave } from './game-engine.js';
import { effective, effectsOff, is, fightersOf, addModifier, checkKOs, heal, draw, bloodlineComplete, snapshotStatus, stampWhy, markNwo, chooseMark, markOptions, canSendToPassive, sendToPassive } from './combat.js';

const label = id => lookupCard(id)?.displayName ?? 'la carte';
const text = c => `${c.displayName} ${c.effects.map(e => e.text).join(' ')}`;
const wyattFamily = c => c.faction === 'Wyatt Family' || /wyatt family/i.test(text(c)) || is(c.id, 'bray wyatt');
const myTurn = (state, pi) => state.turn === pi && state.phase === 'actions' && state.winner === null;
const once = p => (p.status.onceUsed ??= []);

// ---------- Cibles ----------
// Une cible : { side: 'me' | 'opp', zone: 'active' | 'passive' | 'any', filter?(state, pi, f) }.
export function targetCandidates(state, pi, spec) {
  const side = spec.side === 'me' ? pi : 1 - pi, p = state.players[side];
  const pool = spec.zone === 'active' ? p.active : spec.zone === 'passive' ? p.passive : fightersOf(p);
  return pool.filter(f => !spec.filter || spec.filter(state, pi, f)).map(f => ({ pi: side, instanceId: f.instanceId }));
}
const findIn = (state, t) => fightersOf(state.players[t.pi]).find(f => f.instanceId === t.instanceId);

// ---------- Invocations par effet ----------
// Une invocation : { sources: ['hand' | 'deck' | 'grave'], filter(card) }.
// `leaving` : catcheur qui quitte le ring juste avant l'invocation (Luke Harper).
export function summonCandidates(state, pi, spec, { leaving = null } = {}) {
  const p = state.players[pi];
  const positions = legalPositions(leaving ? { active: p.active.filter(x => x !== leaving), passive: p.passive.filter(x => x !== leaving) } : p);
  if (!positions.length) return [];
  const out = [], seen = new Set();
  const noSsr = (p.status.noSsrSummonThroughTurn ?? 0) >= state.turnNumber; // Décret de l'Authority
  for (const source of spec.sources) {
    for (const id of p[source === 'grave' ? 'grave' : source]) {
      const c = lookupCard(id);
      if (seen.has(id) || !c || c.category !== 'Catcheur' || c.playable === false || (noSsr && c.rarity === 'SSR') || !spec.filter(c)) continue;
      seen.add(id);
      out.push({ cardId: id, source, positions });
    }
  }
  return out;
}

function summonFrom(state, pi, option, position, why) {
  const r = specialSummon(state, pi, lookupCard(option.cardId), option.source, position, { anytime: true });
  if (r.ok) addHistory(state, `${why} : ${label(option.cardId)} entre sur le ring.`);
  return r;
}

// ---------- Effets activables ----------
// check → raison du refus ou null ; target(s) → cibles à choisir ; summon → invocation à choisir ; run → résolution.
const opp = (filter) => ({ side: 'opp', zone: 'any', filter });
export const ACTIVATED = Object.freeze({
  'catcheur-01:special': { name: 'Guillotine Hold', targets: [opp()], run: (s, pi, f, [t]) => { t.noAttackUntil = s.turnNumber + 1; return `${label(t.cardId)} ne pourra pas attaquer au prochain tour`; } },
  'catcheur-04:special': { name: 'Curb Stomp', targets: [opp()], run: (s, pi, f, [t]) => { t.passivesOffUntil = s.turnNumber + 1; return `les effets passifs de ${label(t.cardId)} sont annulés pendant 1 tour`; } },
  'catcheur-07:special': { name: 'Dirty Deeds', targets: [opp((s, pi, t) => effective(s, 1 - pi, t).endurance > 60)], run: (s, pi, f, [t]) => { const cut = Math.ceil(effective(s, 1 - pi, t).endurance / 2); t.endurance -= cut; return `l’END de ${label(t.cardId)} est réduite de moitié (-${cut})`; } },
  'catcheur-13:passive': { name: 'Prédateur Apex', run: (s, pi) => { s.players[1 - pi].status.effectsCancelledThroughTurn = s.turnNumber; return 'tous les effets adverses sont annulés ce tour-ci'; } },
  'catcheur-16:special': { name: 'South of Heaven', targets: [{ side: 'opp', zone: 'active' }], run: (s, pi, f, [t]) => { t.halfDamageUntil = s.turnNumber + 1; return `${label(t.cardId)} inflige moitié moins de dégâts au prochain tour`; } },
  'catcheur-26:passive': { name: 'Force positive', run: (s, pi) => { for (const x of s.players[pi].active) heal(s, pi, x, 5, 'Big E'); return 'tes catcheurs actifs regagnent 5 END'; } },
  'catcheur-28:passive': { name: 'Stratégiste du ring', check: (s, pi, f) => (f.position === 'active' ? null : 'Xavier Woods doit être actif.'), run: (s, pi) => { draw(s, pi, 1, 'Xavier Woods'); return 'une carte supplémentaire est piochée'; } },
  'catcheur-36:passive': { name: 'Straight Edge Icon', run: (s, pi) => { for (const x of s.players[pi].active) heal(s, pi, x, 5, 'CM Punk'); return 'tes catcheurs actifs regagnent 5 END'; } },
  'catcheur-31:passive': { name: 'D-Generation-X', summon: { sources: ['deck'], filter: c => c.faction === 'DX' } },
  'catcheur-31:special': { name: 'Pedigree', check: (s, pi, f) => (s.players[pi].objects.some(o => o.fighterId === f.instanceId) ? null : 'Triple H doit porter un objet.'), run: (s, pi, f) => { f.attack += 5; return 'Triple H gagne +5 ATT'; } },
  'catcheur-32:passive': { name: 'Sweet Chin Music', targets: [opp()], run: (s, pi, f, [t]) => { t.noAttackUntil = s.turnNumber + 1; return `${label(t.cardId)} est endormi : pas d’attaque au prochain tour`; } },
  'catcheur-33:special': { name: 'Hornswoggle', onceKey: 'catcheur-33', summon: { sources: ['deck'], filter: c => is(c.id, 'hornswoggle') } },
  'catcheur-38:passive': { name: 'Tsunami Splash', onceKey: 'catcheur-38', check: (s, pi, f) => (f.tookDamage ? null : 'Bronson Reed doit avoir subi des dégâts.'), targets: [opp()], run: (s, pi, f, [t]) => { t.noAttackUntil = s.turnNumber + 1; return `${label(t.cardId)} est endormi`; } },
  'wyatt-03:special': { name: 'Appel de Bray Wyatt', leaves: true, summon: { sources: ['hand'], filter: c => is(c.id, 'bray wyatt') }, before: (s, pi, f) => sendFighterToGrave(s, pi, f, 'sacrifié par son effet') },
  'wyatt-04:passive': { name: 'Famille réunie', summon: { sources: ['grave'], filter: wyattFamily } },
  'wyatt-09:special': { name: 'Appel de Jimmy', summon: { sources: ['deck'], filter: c => is(c.id, 'jimmy uso') }, after: (s, pi, f) => { f.noAttackUntil = s.turnNumber; } },
  'wyatt-10:passive': { name: 'Frappe de Jimmy', check: (s, pi, f) => (f.position === 'active' && s.players[pi].active.some(x => x !== f && lookupCard(x.cardId)?.faction === 'The Bloodline') ? null : 'Jimmy Uso et un autre membre de la Bloodline doivent être actifs.'), targets: [{ side: 'opp', zone: 'active' }], run: (s, pi, f, [t]) => { t.endurance -= 10; return `${label(t.cardId)} subit 10 dégâts`; } },
  'auth-05:special': { name: 'Appel du boss', leaves: true, summon: { sources: ['hand', 'deck'], filter: c => is(c.id, 'seth rollins') }, before: (s, pi, f) => sendFighterToGrave(s, pi, f, 'envoyé au cimetière par son effet') },
  'nwo-03:special': { name: 'The Outsiders', summon: { sources: ['deck'], filter: c => is(c.id, 'kevin nash') }, after: (s, pi, f) => { f.noAttackUntil = s.turnNumber; } },
  'evo-04:special': { name: 'Woooo !', leaves: true, summon: { sources: ['hand', 'deck'], filter: c => is(c.id, 'triple h') }, before: (s, pi, f) => sendFighterToGrave(s, pi, f, 'sacrifié par son effet') },
  // Depuis le cimetière.
  'wyatt-02:grave': { name: 'Erick Rowan (cimetière)', grave: true, banish: true, targets: [{ side: 'me', zone: 'any', filter: (s, pi, t) => is(t.cardId, 'bray wyatt') }], run: (s, pi, f, [t]) => { addModifier(t, 'attack', 20, s.turnNumber, 'wyatt-02'); return 'Bray Wyatt gagne +20 ATT ce tour-ci'; } },
  'wyatt-03:grave': { name: 'Luke Harper (cimetière)', grave: true, perTurn: true, check: (s, pi) => (s.players[pi].active.some(x => is(x.cardId, 'bray wyatt')) ? null : 'Bray Wyatt doit être sur ton ring, en zone ACTIVE (pas passive).'), targets: [opp()], run: (s, pi, f, [t]) => { t.noAttackUntil = s.turnNumber + 1; return `${label(t.cardId)} est endormi`; } },
});

// Mode d'un effet imprimé, pour l'affichage.
const AUTO = new Set(['catcheur-01:passive', 'catcheur-02:passive', 'catcheur-03:passive', 'catcheur-04:passive', 'catcheur-05:passive', 'catcheur-06:passive', 'catcheur-07:passive', 'catcheur-08:passive', 'catcheur-09:passive', 'catcheur-10:passive', 'catcheur-11:passive', 'catcheur-12:passive', 'catcheur-14:passive', 'catcheur-15:passive', 'catcheur-16:passive', 'catcheur-18:passive', 'catcheur-19:passive', 'catcheur-20:passive', 'catcheur-21:passive', 'catcheur-22:passive', 'catcheur-24:passive', 'catcheur-25:passive', 'catcheur-34:passive', 'catcheur-35:passive', 'catcheur-39:passive', 'catcheur-32:special', 'wyatt-01:passive', 'wyatt-02:passive', 'wyatt-08:passive', 'wyatt-09:passive', 'nwo-01:passive', 'nwo-02:passive', 'nwo-03:passive', 'nwo-04:passive', 'nwo-05:passive', 'auth-01:passive', 'auth-02:passive', 'auth-03:passive', 'auth-04:passive', 'evo-01:passive', 'evo-02:passive', 'evo-03:passive', 'evo-04:passive']);
// Effets automatiques sans bouton « Activer » (déclenchés par l'arrivée au cimetière ou sur le ring).
const NO_TOGGLE = ['wyatt-01', 'wyatt-02', 'nwo-01', 'nwo-05', 'auth-02', 'evo-04'];
const REACTION = new Set(['catcheur-10:special', 'catcheur-13:special', 'wyatt-11:special', 'wyatt-01:special', 'auth-03:special', 'auth-05:passive']);
export function effectMode(cardId, kind, { attackSpecial, search } = {}) {
  const key = `${cardId}:${kind === 'passif' ? 'passive' : 'special'}`;
  if (AUTO.has(key)) return kind === 'passif' && !NO_TOGGLE.includes(cardId) ? 'toggle' : 'auto';
  if (REACTION.has(key)) return 'reaction';
  if (ACTIVATED[key]) return 'activated';
  if (search?.[key]) return 'search';
  if (kind === 'spécial' && attackSpecial?.[cardId]) return 'attack';
  if (cardId === 'wyatt-02' || cardId === 'wyatt-03') return 'grave';
  return 'manual';
}

export function activationCheck(state, pi, key, f) {
  const e = ACTIVATED[key], p = state.players[pi];
  if (!e) return 'Effet inconnu.';
  if (!myTurn(state, pi)) return 'À utiliser pendant ta phase d’action.';
  if (effectsOff(state, pi)) return 'Tes effets sont annulés ce tour-ci.';
  if (e.grave) {
    const id = key.split(':')[0];
    if (!p.grave.includes(id)) return 'La carte n’est pas au cimetière.';
    if (e.perTurn && (p.status.graveUsed ?? []).includes(`${key}@${state.turnNumber}`)) return 'Déjà utilisé ce tour.';
  } else {
    if (!f) return 'Catcheur introuvable.';
    const kind = key.endsWith(':passive') ? 'passive' : 'special';
    if (kind === 'passive' && f.passiveUsedTurn === state.turnNumber) return 'Effet passif déjà utilisé ce tour.';
    if (kind === 'special' && (f.specialUsed || f.position !== 'active')) return f.specialUsed ? 'Effet spécial déjà utilisé.' : 'Un catcheur passif ne peut pas utiliser son effet spécial.';
    if (kind === 'passive' && (f.passivesOffUntil ?? 0) >= state.turnNumber) return 'Ses effets passifs sont annulés.';
  }
  if (e.onceKey && once(p).includes(e.onceKey)) return 'Déjà utilisé pendant cette partie.';
  const reason = e.check?.(state, pi, f);
  if (reason) return reason;
  for (const spec of e.targets ?? []) if (!targetCandidates(state, pi, spec).length) return 'Aucune cible possible.';
  if (e.summon && !summonCandidates(state, pi, e.summon, { leaving: e.leaves ? f : null }).length) return 'Aucun catcheur à invoquer (ou plus de place).';
  return null;
}

// options : { targets: [{pi, instanceId}], cardId, position } selon l'effet.
export function activate(state, pi, key, sourceId, options = {}) {
  const e = ACTIVATED[key], p = state.players[pi];
  const f = sourceId ? fightersOf(p).find(x => x.instanceId === sourceId) : null;
  const refused = activationCheck(state, pi, key, f);
  if (refused) return { ok: false, reason: refused };
  const targets = (e.targets ?? []).map((spec, i) => {
    const t = options.targets?.[i];
    return t && targetCandidates(state, pi, spec).some(c => c.instanceId === t.instanceId) ? findIn(state, t) : null;
  });
  if (targets.some(t => !t)) return { ok: false, reason: 'Choisis une cible valide.' };
  let option = null;
  if (e.summon) {
    option = summonCandidates(state, pi, e.summon, { leaving: e.leaves ? f : null }).find(o => o.cardId === options.cardId);
    if (!option || !option.positions.includes(options.position)) return { ok: false, reason: 'Choisis le catcheur et sa position.' };
  }
  // L'effet est consommé dès l'activation (cahier des charges §11).
  if (e.grave) {
    const id = key.split(':')[0];
    emit(state, { kind: 'effect', pi, cardId: id, title: 'Effet depuis le cimetière', sub: e.name });
    if (e.banish) { p.grave.splice(p.grave.indexOf(id), 1); (p.banished ??= []).push(id); }
    if (e.perTurn) (p.status.graveUsed ??= []).push(`${key}@${state.turnNumber}`);
  } else activateWrestlerEffect(state, pi, f.instanceId, key.endsWith(':passive') ? 'passive' : 'special');
  if (e.onceKey) once(p).push(e.onceKey);
  e.before?.(state, pi, f);
  if (option) {
    const r = summonFrom(state, pi, option, options.position, e.name);
    if (!r.ok) return r;
  }
  const snap = snapshotStatus(state);
  const result = e.run?.(state, pi, f, targets);
  e.after?.(state, pi, f);
  stampWhy(state, snap, e.name);
  if (result) addHistory(state, `${e.name} : ${result}.`);
  checkKOs(state);
  return { ok: true };
}

// ---------- Momenta qui visent une carte ou invoquent ----------
const meActive = { side: 'me', zone: 'active' };
export const TARGET_MOMENTA = Object.freeze({
  'momentum-02': { targets: [meActive, { side: 'me', zone: 'passive' }], run: (s, pi, [a, b]) => { const p = s.players[pi]; p.active[p.active.indexOf(a)] = b; p.passive[p.passive.indexOf(b)] = a; a.position = 'passive'; b.position = 'active'; return `${label(b.cardId)} remplace ${label(a.cardId)} sur le ring`; } },
  'momentum-03': { targets: [meActive], run: (s, pi, [t]) => { addModifier(t, 'attack', 15, s.turnNumber, 'momentum-03'); return `${label(t.cardId)} gagne +15 ATT ce tour-ci (il perdra 5 END après son attaque)`; } },
  'momentum-09': { targets: [{ side: 'me', zone: 'active', filter: (s, pi, t) => effective(s, pi, t).endurance >= 70 }], run: (s, pi, [t]) => { s.extraAttacks[t.instanceId] = (s.extraAttacks[t.instanceId] ?? 0) + 1; return `${label(t.cardId)} peut attaquer deux fois ce tour-ci`; } },
  'momentum-14': { targets: [meActive], run: (s, pi, [t]) => { t.attack += 15; t.noAttackUntil = s.turnNumber + 2; return `${label(t.cardId)} gagne +15 ATT mais ne pourra pas attaquer au prochain tour`; } },
  'momentum-18': { targets: [{ side: 'opp', zone: 'active' }], run: (s, pi, [t]) => { t.passivesOffUntil = s.turnNumber; return `l’effet passif de ${label(t.cardId)} est annulé ce tour-ci`; } },
  // Too Sweet : marque un actif adverse, puis 15 dégâts à chaque catcheur adverse marqué.
  'nwo-08': { targets: [{ side: 'opp', zone: 'active' }], run: (s, pi, [t]) => {
    markNwo(s, t, 'Too Sweet');
    const marked = fightersOf(s.players[1 - pi]).filter(x => x.nwoMark);
    for (const x of marked) { x.endurance -= 15; x.tookDamage = true; x.hitTurn = s.turnNumber; }
    return `15 dégâts à ${marked.map(x => label(x.cardId)).join(', ')}`;
  } },
  // Best for Business : un actif adverse part en zone passive et y reste pendant son prochain tour.
  'auth-08': { targets: [{ side: 'opp', zone: 'active', filter: (s, pi, t) => canSendToPassive(s, 1 - pi, t) }], run: (s, pi, [t]) => { sendToPassive(s, 1 - pi, t, 'Best for Business', s.turnNumber + 1); return `${label(t.cardId)} est envoyé en zone passive`; } },
});
export const SUMMON_MOMENTA = Object.freeze({
  'wyatt-06': { summon: { sources: ['deck'], filter: c => wyattFamily(c) }, discard: true },
  'wyatt-12': { summon: { sources: ['deck'], filter: c => is(c.id, 'jey uso') }, after: (s, pi) => { s.players[pi].status.extraMomentumTurn = s.turnNumber + 2; } },
  'auth-09': { summon: { sources: ['hand', 'deck'], filter: c => c.faction === 'The Authority' && ['R', 'SR'].includes(c.rarity) }, after: (s, pi) => { s.players[pi].status.handicapTurn = s.turnNumber; } },
  'nwo-09': { summon: { sources: ['hand', 'deck'], filter: c => c.faction === 'nWo' && ['R', 'SR'].includes(c.rarity) }, after: (s, pi) => { if (!effectsOff(s, pi)) chooseMark(s, pi, 'nWo 4 Life', 'nwo-09'); } },
  'evo-07': { summon: { sources: ['hand', 'deck'], filter: c => c.faction === 'Evolution' && ['R', 'SR'].includes(c.rarity) } },
});

export function momentumTargetsAvailable(state, pi, cardId) {
  const tm = TARGET_MOMENTA[cardId], sm = SUMMON_MOMENTA[cardId];
  if (tm) return tm.targets.every(spec => targetCandidates(state, pi, spec).length) ? null : 'Aucune cible possible pour cette carte.';
  if (sm) {
    if (!summonCandidates(state, pi, sm.summon).length) return 'Aucun catcheur à invoquer ou plus de place.';
    if (sm.discard && state.players[pi].hand.filter(id => id !== cardId).length < 1) return 'Il faut une autre carte à défausser.';
  }
  return null;
}

export function resolveTargetMomentum(state, pi, cardId, targets) {
  const tm = TARGET_MOMENTA[cardId];
  if (state.players[pi].resolvingMomentum?.cardId !== cardId) return { ok: false, reason: 'Ce Momentum n’est pas en résolution.' };
  const found = tm.targets.map((spec, i) => (targets[i] && targetCandidates(state, pi, spec).some(c => c.instanceId === targets[i].instanceId) ? findIn(state, targets[i]) : null));
  if (found.some(t => !t)) return { ok: false, reason: 'Choisis une cible valide.' };
  const snap = snapshotStatus(state);
  addHistory(state, `${label(cardId)} : ${tm.run(state, pi, found)}.`);
  stampWhy(state, snap, label(cardId));
  resolveMomentum(state, pi);
  checkKOs(state);
  return { ok: true };
}

export function resolveSummonMomentum(state, pi, cardId, { discard, summonId, position }) {
  const sm = SUMMON_MOMENTA[cardId], p = state.players[pi];
  if (p.resolvingMomentum?.cardId !== cardId) return { ok: false, reason: 'Ce Momentum n’est pas en résolution.' };
  if (sm.discard) {
    const at = p.hand.indexOf(discard);
    if (at < 0) return { ok: false, reason: 'Choisis la carte à défausser.' };
  }
  const option = summonCandidates(state, pi, sm.summon).find(o => o.cardId === summonId);
  if (!option || !option.positions.includes(position)) return { ok: false, reason: 'Choisis le catcheur et sa position.' };
  if (sm.discard) { p.hand.splice(p.hand.indexOf(discard), 1); p.grave.push(discard); addHistory(state, `${p.name} défausse ${label(discard)}.`); }
  const r = summonFrom(state, pi, option, position, label(cardId));
  if (!r.ok) return r;
  sm.after?.(state, pi);
  resolveMomentum(state, pi);
  return { ok: true };
}

// ---------- The Bloodline Rassemblement (wyatt-13) ----------
// Reste active tant que Roman Reigns, Jey Uso, Jimmy Uso et Sami Zayn sont sur le ring.
// Permet d'invoquer Roman Reigns depuis le deck (une fois par partie).
const romanFromDeck = { sources: ['deck'], filter: c => is(c.id, 'roman reigns') };
export function rassemblementOptions(state, pi) {
  return once(state.players[pi]).includes('wyatt-13') ? [] : summonCandidates(state, pi, romanFromDeck);
}

export function rassemblementCheck(state, pi) {
  const p = state.players[pi], on = n => fightersOf(p).some(f => is(f.cardId, n));
  const missing = ['jey uso', 'jimmy uso', 'sami zayn'].filter(n => !on(n));
  if (missing.length) return 'Il faut Jey Uso, Jimmy Uso et Sami Zayn sur le ring.';
  if (!on('roman reigns') && !rassemblementOptions(state, pi).length) return 'Roman Reigns n’est ni sur le ring ni invocable depuis ton deck.';
  return null;
}

export function resolveRassemblement(state, pi, { cardId = null, position = null } = {}) {
  const p = state.players[pi];
  if (p.resolvingMomentum?.cardId !== 'wyatt-13') return { ok: false, reason: 'Ce Momentum n’est pas en résolution.' };
  if (cardId) {
    const option = rassemblementOptions(state, pi).find(o => o.cardId === cardId);
    if (!option || !option.positions.includes(position)) return { ok: false, reason: 'Choisis Roman Reigns et sa position.' };
    const r = summonFrom(state, pi, option, position, 'The Bloodline Rassemblement');
    if (!r.ok) return r;
    once(p).push('wyatt-13');
  }
  const keep = bloodlineComplete(state, pi);
  resolveMomentum(state, pi, { keepActive: keep });
  if (keep) addHistory(state, 'The Bloodline Rassemblement : la Bloodline frappe à +10 ATT et peut attaquer les catcheurs passifs.');
  return { ok: true };
}

// ---------- Choix déclenchés par l'arrivée au cimetière ----------
const CHOICES = {
  'wyatt-01': { title: 'Braun Strowman', what: 'une carte Wyatt Family du deck à envoyer au cimetière', options: p => p.deck.filter(id => wyattFamily(lookupCard(id))), apply: (s, pi, id) => { const p = s.players[pi]; p.deck.splice(p.deck.indexOf(id), 1); p.grave.push(id); return `${label(id)} est envoyé du deck au cimetière`; } },
  'wyatt-02': { title: 'Erick Rowan', what: 'une carte qui cite la Wyatt Family (R ou SR) à ajouter à ta main', options: p => p.deck.filter(id => wyattFamily(lookupCard(id)) && ['R', 'SR'].includes(lookupCard(id).rarity)), apply: (s, pi, id) => { const p = s.players[pi]; p.deck.splice(p.deck.indexOf(id), 1); p.hand.push(id); return `${label(id)} est ajouté à la main`; } },
  'auth-02': { title: 'Kane : Directeur des opérations', what: 'une carte Authority de ton deck à ajouter à ta main', options: p => p.deck.filter(id => id.startsWith('auth-')), apply: (s, pi, id) => { const p = s.players[pi]; p.deck.splice(p.deck.indexOf(id), 1); p.hand.push(id); return `${label(id)} est ajouté à la main`; } },
  'evo-04': { title: 'Ric Flair : Mentor', what: 'un membre d’Evolution de ton deck à ajouter à ta main', options: p => p.deck.filter(id => lookupCard(id)?.faction === 'Evolution' && lookupCard(id)?.category === 'Catcheur'), apply: (s, pi, id) => { const p = s.players[pi]; p.deck.splice(p.deck.indexOf(id), 1); p.hand.push(id); return `${label(id)} est ajouté à la main`; } },
  'wyatt-07': { title: 'Lanterne de l’obscurité', what: 'un Momentum du cimetière à reprendre en main', options: p => p.grave.filter(id => lookupCard(id)?.category === 'Momentum'), apply: (s, pi, id) => { const p = s.players[pi]; p.grave.splice(p.grave.indexOf(id), 1); p.hand.push(id); return `${label(id)} revient en main`; } },
};

export function queueGraveTriggers(state, pi, cardIds) {
  if (effectsOff(state, pi)) return;
  for (const id of cardIds) {
    if (!CHOICES[id] || !choiceOptions(state, { pi, key: id }).length) continue;
    const choice = { pi, key: id, id: crypto.randomUUID() };
    if (state.players[pi].role === 'ai') resolveChoice(state, choice.id, choiceOptions(state, choice)[0], choice);
    else (state.pendingChoices ??= []).push(choice);
  }
}

// Choix « marque nWo » : `key: 'mark'`, les options sont les instanceId des actifs adverses à marquer.
export function choiceInfo(choice) { if (choice.key === 'mark') return { title: choice.why, what: 'l’adversaire actif à marquer nWo' }; const c = CHOICES[choice.key]; return { title: c.title, what: c.what }; }
export function choiceOptions(state, choice) {
  if (choice.key === 'mark') return markOptions(state, choice.pi, choice.exclude).map(f => f.instanceId);
  return [...new Set(CHOICES[choice.key].options(state.players[choice.pi]))];
}

// cardId null = le joueur renonce (ces effets sont tous facultatifs, sauf la marque nWo qui est obligatoire).
export function resolveChoice(state, choiceId, cardId, direct = null) {
  const list = state.pendingChoices ??= [];
  const choice = direct ?? list.find(c => c.id === choiceId);
  if (!choice) return { ok: false, reason: 'Choix introuvable.' };
  if (choice.key === 'mark') return resolveMarkChoice(state, choice, cardId);
  if (!direct) list.splice(list.indexOf(choice), 1);
  if (!cardId) return { ok: true };
  if (!choiceOptions(state, choice).includes(cardId)) return { ok: false, reason: 'Carte non valide.' };
  addHistory(state, `${CHOICES[choice.key].title} : ${CHOICES[choice.key].apply(state, choice.pi, cardId)}.`);
  emit(state, { kind: 'reveal', pi: choice.pi, cardIds: [cardId], title: choice.key === 'wyatt-01' ? 'Envoyée au cimetière' : 'Ajoutée à la main', sub: CHOICES[choice.key].title });
  return { ok: true };
}

function resolveMarkChoice(state, choice, instanceId) {
  const list = state.pendingChoices;
  if (!choiceOptions(state, choice).length) { list.splice(list.indexOf(choice), 1); return { ok: true }; } // plus aucune cible
  if (!choiceOptions(state, choice).includes(instanceId)) return { ok: false, reason: 'Choisis un actif adverse pas encore marqué.' };
  list.splice(list.indexOf(choice), 1);
  markNwo(state, state.players[1 - choice.pi].active.find(f => f.instanceId === instanceId), choice.why);
  // Les autres marques en attente qui n'ont plus de cible possible tombent.
  state.pendingChoices = list.filter(c => c.key !== 'mark' || choiceOptions(state, c).length);
  return { ok: true };
}

export { heal, draw };
