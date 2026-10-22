import {
  canMovePosition,
  canDirectAttack,
  normalSummonRequirement,
  validateNormalSummon,
} from './rules.js';
import * as combat from './combat.js';
import { queueGraveTriggers } from './activations.js';

export const ZONES = Object.freeze({ ACTIVE: 'active', PASSIVE: 'passive' });

const copy = value => structuredClone(value);

export function shuffleDeck(deck, random = Math.random) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makePlayer(name, role, deck, random) {
  const shuffled = shuffleDeck(deck, random);
  return {
    name,
    role,
    hp: 500,
    deck: shuffled.slice(5),
    hand: shuffled.slice(0, 5),
    active: [],
    passive: [],
    manager: null,
    objects: [],
    resolvingMomentum: null,
    ongoingMomentum: [],
    grave: [],
    status: { noAttackThroughTurn: 0, noMomentumThroughTurn: 0 },
    limits: { normal: false, manager: false, object: false, momentum: 0, move: false },
  };
}

// first : joueur qui commence (0 = humain, 1 = IA), décidé par le pile ou face.
export function createMatch(humanDeck, aiDeck, { random = Math.random, first = 0 } = {}) {
  if (!Array.isArray(humanDeck) || !Array.isArray(aiDeck)) throw new TypeError('Deux decks sont nécessaires.');
  const state = {
    players: [makePlayer('Vous', 'human', humanDeck, random), makePlayer('IA', 'ai', aiDeck, random)],
    turn: 0,
    turnNumber: 1,
    phase: 'actions',
    winner: null,
    pendingAttack: null,
    attackLock: false,
    outOfTurnMomentumUsed: [0, 0],
    directAttacksUsed: 0,
    usedAttackers: [],
    usedTargets: [],
    momentumsThisTurn: [0, 0],
    koThisTurn: [0, 0],
    extraAttacks: {},
    pendingChoices: [],
    history: [],
    createdAt: Date.now(),
    matchId: crypto.randomUUID(),
  };
  state.history.push('Le match commence : chaque joueur pioche 5 cartes.');
  state.firstPlayer = first;
  beginTurn(state, first, { opening: true });
  draw(state, first, 1);
  return state;
}

// Événements à montrer en grand à l'écran (carte jouée, effet activé, carte prise dans le deck…).
// L'interface les lit puis vide la file ; le moteur ne s'en sert pas pour les règles.
export function emit(state, event) {
  (state.fxQueue ??= []).push(event);
  if (state.fxQueue.length > 12) state.fxQueue.shift();
}

const effectName = (cardId, kind) => (rarityLookup(cardId)?.effects.find(e => e.kind === kind)?.text ?? '').split(':')[0].trim();

export function addHistory(state, message) {
  state.history.unshift(message);
  state.history = state.history.slice(0, 200);
}

export function beginTurn(state, playerIndex, { opening = false } = {}) {
  if (state.winner !== null) return { ok: false, reason: 'La partie est terminée.' };
  state.turn = playerIndex;
  state.turnNumber += opening ? 0 : 1;
  state.phase = 'actions';
  state.pendingAttack = null;
  state.attackLock = false;
  state.outOfTurnMomentumUsed = [0, 0];
  state.directAttacksUsed = 0;
  state.usedAttackers = [];
  state.usedTargets = [];
  const player = state.players[playerIndex];
  player.limits = { normal: false, manager: false, object: false, momentum: 0, move: false };
  for (const fighter of [...player.active, ...player.passive]) fighter.passiveUsedTurn = 0;
  if (!opening) {
    expireAtTurnStart(player, state.turnNumber);
    if (!draw(state, playerIndex)) return { ok: false, reason: `${player.name} perd : son deck est vide.` };
    combat.startOfTurn(state, playerIndex);
    combat.checkKOs(state);
  }
  return { ok: true };
}

function expireAtTurnStart(player, turnNumber) {
  player.active = player.active.filter(x => x.expiresAfterTurn !== turnNumber);
  player.passive = player.passive.filter(x => x.expiresAfterTurn !== turnNumber);
  player.objects = player.objects.filter(x => x.expiresAfterTurn !== turnNumber);
  player.ongoingMomentum = player.ongoingMomentum.filter(x => x.expiresAfterTurn !== turnNumber);
  if (player.manager?.expiresAfterTurn === turnNumber) player.manager = null;
}

export function draw(state, playerIndex, amount = 1) {
  const player = state.players[playerIndex];
  for (let i = 0; i < amount; i += 1) {
    if (!player.deck.length) {
      state.winner = 1 - playerIndex;
      addHistory(state, `${player.name} doit piocher mais son deck est vide : ${state.players[state.winner].name} gagne.`);
      return false;
    }
    player.hand.push(player.deck.shift());
  }
  if (amount > 0) addHistory(state, `${player.name} pioche ${amount} carte${amount === 1 ? '' : 's'}.`);
  return true;
}

export function endTurn(state) {
  if (state.winner !== null || state.pendingAttack) return { ok: false, reason: 'Résolvez d’abord l’action en cours.' };
  const current = state.players[state.turn];
  addHistory(state, `Fin du tour de ${current.name}.`);
  const result = beginTurn(state, 1 - state.turn);
  return result.ok ? { ok: true } : result;
}

function slotFor(card, position, instanceId = crypto.randomUUID()) {
  return {
    instanceId,
    cardId: card.id,
    attack: card.attack ?? null,
    endurance: card.endurance ?? null,
    baseEndurance: card.endurance ?? null,
    position,
    specialUsed: false,
    passiveUsedTurn: 0,
    modifiers: [],
  };
}

function getCards(player) {
  return [...player.active, ...player.passive];
}

function removeFromHand(player, cardId) {
  const index = player.hand.indexOf(cardId);
  if (index < 0) return false;
  player.hand.splice(index, 1);
  return true;
}

export function normalSummon(state, playerIndex, card, sacrificeIds = [], position = ZONES.ACTIVE) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Invocation normale possible pendant votre phase d’action.' };
  const bonusSummon = player.limits.normal && (player.limits.extraNormal ?? 0) > 0; // Big Gold
  if (player.limits.normal && !bonusSummon) return { ok: false, reason: 'Votre invocation normale a déjà été utilisée ce tour.' };
  if (!card || card.category !== 'Catcheur' || !player.hand.includes(card.id)) return { ok: false, reason: 'Cette carte Catcheur n’est pas dans votre main.' };
  if (card.attack == null || card.endurance == null) return { ok: false, reason: 'Les statistiques originales de cette carte doivent être vérifiées.' };
  if (card.rarity === 'SSR' && (player.status.noSsrSummonThroughTurn ?? 0) >= state.turnNumber) return { ok: false, reason: 'Décret de l’Authority : impossible d’invoquer une SSR pour l’instant.' };
  const capacity = position === ZONES.ACTIVE ? player.active.length < 3 : player.passive.length < 2 && player.active.length > 0;
  if (!capacity || getCards(player).length >= 5) return { ok: false, reason: 'Aucune place légale dans cette zone.' };
  const sacrifices = sacrificeIds.map(id => getCards(player).find(x => x.instanceId === id)).filter(Boolean);
  // Hulk Hogan : sans sacrifice si Scott Hall et Kevin Nash sont sur le ring.
  const hogan = card.id === 'nwo-01' && sacrifices.length === 0 && combat.hoganFree(state, playerIndex);
  // Mr. McMahon : une invocation SSR sans sacrifice, une fois par partie.
  const mcmahon = !hogan && card.rarity === 'SSR' && player.status.freeSsrSummon && sacrifices.length === 0;
  const free = hogan || mcmahon;
  if (!free) {
    const validation = validateNormalSummon(card, sacrifices.map(x => ({ category: 'Catcheur', rarity: getCardRarity(x.cardId) })));
    if (!validation.valid) return { ok: false, reason: validation.reason };
  }
  if (sacrifices.length && card.rarity === 'SSR' && player.status.noSsrSacrificeThroughTurn >= state.turnNumber) {
    return { ok: false, reason: 'Domination Totale : impossible de sacrifier pour invoquer une SSR ce tour-ci.' };
  }
  for (const sacrifice of sacrifices) moveToGrave(state, playerIndex, sacrifice.instanceId, 'sacrifice');
  removeFromHand(player, card.id);
  const fighter = slotFor(card, position);
  player[position].push(fighter);
  if (bonusSummon) player.limits.extraNormal -= 1;
  player.limits.normal = true;
  if (mcmahon) player.status.freeSsrSummon = false;
  emit(state, { kind: 'summon', pi: playerIndex, cardId: card.id, title: 'Invocation' });
  addHistory(state, `${player.name} invoque normalement ${card.displayName}${sacrifices.length ? ` en sacrifiant ${sacrifices.length} catcheur${sacrifices.length === 1 ? '' : 's'}` : hogan ? ' sans sacrifice (Hall et Nash sont sur le ring)' : mcmahon ? ' sans sacrifice grâce à Mr. McMahon' : ''}.`);
  combat.onEnter(state, playerIndex, fighter);
  return { ok: true, fighter };
}

let rarityLookup = () => null;
export function configureCardLookup(lookup) { rarityLookup = lookup; }
export function lookupCard(cardId) { return rarityLookup(cardId); }
function getCardRarity(cardId) { return rarityLookup(cardId)?.rarity ?? null; }

export function specialSummon(state, playerIndex, card, source, position = ZONES.ACTIVE, { anytime = false } = {}) {
  const player = state.players[playerIndex];
  // `anytime` : invocation provoquée par un Momentum rapide, pendant le tour adverse.
  if (state.winner !== null || (!anytime && (state.turn !== playerIndex || state.phase !== 'actions'))) return { ok: false, reason: 'Invocation spéciale possible pendant votre phase d’action.' };
  if (!card || card.category !== 'Catcheur') return { ok: false, reason: 'Seul un catcheur peut être invoqué.' };
  if (card.attack == null || card.endurance == null) return { ok: false, reason: 'Les statistiques originales de cette carte doivent être vérifiées.' };
  if (card.rarity === 'SSR' && (player.status.noSsrSummonThroughTurn ?? 0) >= state.turnNumber) return { ok: false, reason: 'Décret de l’Authority : impossible d’invoquer une SSR pour l’instant.' };
  const capacity = position === ZONES.ACTIVE ? player.active.length < 3 : player.passive.length < 2 && player.active.length > 0;
  if (!capacity || getCards(player).length >= 5) return { ok: false, reason: 'Aucune place légale dans cette zone.' };
  const sourceZone = source === 'grave' ? player.grave : source === 'deck' ? player.deck : player.hand;
  const at = sourceZone.indexOf(card.id);
  if (at < 0) return { ok: false, reason: 'Carte introuvable dans la zone choisie.' };
  sourceZone.splice(at, 1);
  const fighter = slotFor(card, position);
  player[position].push(fighter);
  addHistory(state, `${player.name} invoque spécialement ${card.displayName} depuis ${source === 'grave' ? 'le cimetière' : source === 'deck' ? 'le deck' : 'la main'}.`);
  emit(state, { kind: 'summon', pi: playerIndex, cardId: card.id, title: source === 'deck' ? 'Invoqué depuis le deck' : source === 'grave' ? 'Retour du cimetière' : 'Invocation spéciale' });
  combat.onEnter(state, playerIndex, fighter);
  return { ok: true, fighter };
}

export function moveFighter(state, playerIndex, instanceId, destination) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Déplacement possible pendant votre phase d’action.' };
  const source = player.active.some(x => x.instanceId === instanceId) ? 'active' : player.passive.some(x => x.instanceId === instanceId) ? 'passive' : null;
  if (!source || !['active', 'passive'].includes(destination)) return { ok: false, reason: 'Position de départ ou d’arrivée invalide.' };
  if (destination === 'active' && (player.passive.find(x => x.instanceId === instanceId)?.lockedPassiveUntil ?? 0) >= state.turnNumber) return { ok: false, reason: 'Best for Business : ce catcheur ne peut pas revenir en actif ce tour-ci.' };
  const allowed = canMovePosition({ from: source, to: destination, activeCount: player.active.length, passiveCount: player.passive.length, movedThisTurn: player.limits.move });
  if (!allowed) return { ok: false, reason: 'Limite de déplacement ou capacité de zone atteinte.' };
  const from = player[source], at = from.findIndex(x => x.instanceId === instanceId), [fighter] = from.splice(at, 1);
  fighter.position = destination;
  player[destination].push(fighter);
  player.limits.move = true;
  addHistory(state, `${player.name} déplace ${rarityLookup(fighter.cardId)?.displayName ?? 'un catcheur'} vers la zone ${destination === 'active' ? 'active' : 'passive'}.`);
  combat.checkKOs(state);
  return { ok: true };
}

// Échange un catcheur actif et un catcheur passif : compte comme le déplacement du tour.
// Utile quand les deux zones sont pleines (3 actifs, 2 passifs).
export function swapFighters(state, playerIndex, activeId, passiveId) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Déplacement possible pendant votre phase d’action.' };
  if (player.limits.move) return { ok: false, reason: 'Tu as déjà changé une position ce tour-ci.' };
  const a = player.active.findIndex(x => x.instanceId === activeId), b = player.passive.findIndex(x => x.instanceId === passiveId);
  if (a < 0 || b < 0) return { ok: false, reason: 'Choisis un catcheur actif et un catcheur passif.' };
  if ((player.passive[b].lockedPassiveUntil ?? 0) >= state.turnNumber) return { ok: false, reason: 'Best for Business : ce catcheur ne peut pas revenir en actif ce tour-ci.' };
  const up = player.passive[b], down = player.active[a];
  player.active[a] = up;
  player.passive[b] = down;
  up.position = 'active';
  down.position = 'passive';
  player.limits.move = true;
  addHistory(state, `${player.name} échange ${rarityLookup(down.cardId)?.displayName} (passe en passif) et ${rarityLookup(up.cardId)?.displayName} (passe en actif).`);
  combat.checkKOs(state);
  return { ok: true };
}

export function playManager(state, playerIndex, card) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Un manager se joue pendant votre phase d’action.' };
  if (!card || card.category !== 'Manager' || !removeFromHand(player, card.id)) return { ok: false, reason: 'Manager absent de la main.' };
  if (player.limits.manager) { player.hand.push(card.id); return { ok: false, reason: 'Le manager de ce tour a déjà été joué.' }; }
  if (player.manager) { player.hand.push(card.id); return { ok: false, reason: 'Votre emplacement Manager est occupé.' }; }
  player.manager = { cardId: card.id, used: false, expiresAfterTurn: null };
  player.limits.manager = true;
  addHistory(state, `${player.name} joue le manager ${card.displayName}.`);
  emit(state, { kind: 'card', pi: playerIndex, cardId: card.id, title: 'Manager' });
  return { ok: true };
}

export function equipObject(state, playerIndex, card, fighterId) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Un objet s’équipe pendant votre phase d’action.' };
  if (!card || card.category !== 'Objet' || !player.hand.includes(card.id)) return { ok: false, reason: 'Objet absent de la main.' };
  if (player.limits.object) return { ok: false, reason: 'Un objet a déjà été joué ce tour.' };
  const fighter = getCards(player).find(x => x.instanceId === fighterId);
  if (!fighter) return { ok: false, reason: 'Choisissez le catcheur à équiper.' };
  if (card.id === 'nwo-07' && !combat.isNwoMember(fighter.cardId)) return { ok: false, reason: 'Le Spray s’équipe uniquement sur un catcheur nWo.' };
  if (card.id === 'auth-07' && !combat.isAuthority(fighter.cardId)) return { ok: false, reason: 'La mallette s’équipe uniquement sur un membre de l’Authority.' };
  removeFromHand(player, card.id);
  player.objects.push({ instanceId: crypto.randomUUID(), cardId: card.id, fighterId, expiresAfterTurn: null });
  player.limits.object = true;
  addHistory(state, `${player.name} équipe ${rarityLookup(fighter.cardId)?.displayName ?? 'un catcheur'} avec ${card.displayName}.`);
  emit(state, { kind: 'card', pi: playerIndex, cardId: card.id, title: 'Objet équipé', sub: rarityLookup(fighter.cardId)?.displayName });
  // Effets immédiats des objets (« ce tour-ci »).
  if (card.id === 'objets-06') { player.limits.extraNormal = (player.limits.extraNormal ?? 0) + 1; addHistory(state, 'Big Gold : une invocation supplémentaire est possible ce tour-ci.'); }
  if (card.id === 'nwo-07' && !combat.effectsOff(state, playerIndex)) combat.chooseMark(state, playerIndex, 'Spray', 'nwo-07');
  if (card.id === 'objets-07') { player.limits.momentum -= 1; addHistory(state, 'Ceinture poids lourd : deux Momenta peuvent être joués par tour.'); }
  if (card.id === 'objets-08' && (combat.is(fighter.cardId, 'john cena') || combat.is(fighter.cardId, 'cm punk'))) {
    state.extraAttacks[fighterId] = (state.extraAttacks[fighterId] ?? 0) + 1;
    addHistory(state, `Ceinture « The Champ » : ${rarityLookup(fighter.cardId).displayName} peut attaquer deux fois ce tour-ci.`);
  }
  combat.checkKOs(state);
  return { ok: true };
}

// Mallette Money in the Bank : défaussée, son porteur attaque une fois de plus ce tour-ci avec +20 ATT.
export function cashInBriefcase(state, playerIndex, fighterId) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || !['actions', 'attacks'].includes(state.phase) || state.pendingAttack) return { ok: false, reason: 'La mallette s’encaisse pendant ton tour.' };
  const at = player.objects.findIndex(o => o.fighterId === fighterId && o.cardId === 'auth-07');
  const fighter = player.active.find(x => x.instanceId === fighterId);
  if (at < 0 || !fighter) return { ok: false, reason: 'Ce catcheur actif ne porte pas la mallette.' };
  player.grave.push(player.objects.splice(at, 1)[0].cardId);
  state.extraAttacks[fighterId] = (state.extraAttacks[fighterId] ?? 0) + 1;
  (fighter.modifiers ??= []).push({ stat: 'attack', value: 20, until: state.turnNumber, source: 'auth-07' });
  addHistory(state, `${player.name} encaisse la mallette : ${rarityLookup(fighter.cardId)?.displayName} peut attaquer une fois de plus ce tour-ci, avec +20 ATT.`);
  emit(state, { kind: 'effect', pi: playerIndex, cardId: 'auth-07', title: 'Cash-in !', sub: rarityLookup(fighter.cardId)?.displayName });
  return { ok: true };
}

export function activateWrestlerEffect(state, playerIndex, fighterId, kind) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Les effets se jouent pendant votre phase d’action.' };
  const activeIndex = player.active.findIndex(x => x.instanceId === fighterId);
  const passiveIndex = player.passive.findIndex(x => x.instanceId === fighterId);
  const fighter = activeIndex >= 0 ? player.active[activeIndex] : player.passive[passiveIndex];
  if (!fighter) return { ok: false, reason: 'Catcheur introuvable.' };
  if (kind === 'passive') {
    if (fighter.passiveUsedTurn === state.turnNumber) return { ok: false, reason: 'Cet effet passif a déjà été activé ce tour.' };
    fighter.passiveUsedTurn = state.turnNumber;
    fighter.passiveActiveUntil = state.turnNumber + 1; // actif jusqu'au début de son prochain tour
  } else if (kind === 'special') {
    if (activeIndex < 0) return { ok: false, reason: 'Un catcheur passif ne peut pas utiliser son effet spécial.' };
    if (fighter.specialUsed) return { ok: false, reason: 'Cet effet spécial a déjà été utilisé pendant cette présence en jeu.' };
    fighter.specialUsed = true;
  } else return { ok: false, reason: 'Type d’effet inconnu.' };
  addHistory(state, `${player.name} active l’effet ${kind === 'passive' ? 'passif' : 'spécial'} de ${rarityLookup(fighter.cardId)?.displayName ?? 'son catcheur'}.`);
  emit(state, { kind: 'effect', pi: playerIndex, cardId: fighter.cardId, title: kind === 'passive' ? 'Effet passif' : 'Effet spécial', sub: effectName(fighter.cardId, kind === 'passive' ? 'passif' : 'spécial') });
  return { ok: true, fighter };
}

export function playMomentum(state, playerIndex, card, { allowTimingException = false } = {}) {
  const player = state.players[playerIndex];
  if (state.winner !== null || !card || card.category !== 'Momentum' || !player.hand.includes(card.id)) return { ok: false, reason: 'Momentum absent de la main.' };
  const ownAction = state.turn === playerIndex && state.phase === 'actions' && !card.rapid;
  // The lightning mark means a response Momentum: it can be used after the
  // opponent announces an attack, while that attack is pending.
  const response = state.turn !== playerIndex && Boolean(card.rapid) && Boolean(state.pendingAttack) && state.phase === 'reaction';
  if (!ownAction && !response) return { ok: false, reason: 'Ce Momentum ne peut pas être joué à ce moment.' };
  if (ownAction && player.limits.momentum >= 1) return { ok: false, reason: 'La limite de Momentum de ce tour est atteinte.' };
  if (response && state.outOfTurnMomentumUsed[playerIndex] >= 1) return { ok: false, reason: 'Vous avez déjà joué un Momentum rapide pendant ce tour adverse.' };
  if (player.status.noMomentumThroughTurn >= state.turnNumber) return { ok: false, reason: 'Un effet empêche ce joueur de jouer un Momentum.' };
  removeFromHand(player, card.id);
  player.resolvingMomentum = { cardId: card.id, controller: playerIndex, rapid: Boolean(card.rapid), pendingAttackId: state.pendingAttack?.id ?? null };
  if (ownAction) player.limits.momentum += 1;
  if (response) state.outOfTurnMomentumUsed[playerIndex] += 1;
  addHistory(state, `${player.name} joue ${card.rapid ? 'un Momentum rapide' : 'un Momentum'} : ${card.displayName}.`);
  (state.momentumsThisTurn ??= [0, 0])[playerIndex] += 1;
  emit(state, { kind: 'card', pi: playerIndex, cardId: card.id, title: card.rapid ? 'Momentum rapide !' : 'Momentum' });
  if (player.active.some(f => f.cardId === 'catcheur-34' && combat.passiveOn(state, playerIndex, f))) combat.draw(state, playerIndex, 1, 'Cody Rhodes : Héritier de la gloire');
  if (card.id === 'momentum-20' && state.pendingAttack) counterPendingAttack(state, playerIndex, card);
  return { ok: true, response };
}

export function resolveMomentum(state, playerIndex, { keepActive = false } = {}) {
  const player = state.players[playerIndex], resolution = player?.resolvingMomentum;
  if (!resolution) return { ok: false, reason: 'Aucun Momentum en résolution.' };
  const card = rarityLookup(resolution.cardId);
  player.resolvingMomentum = null;
  if (keepActive) player.ongoingMomentum.push({ cardId: card.id, controller: playerIndex, expiresAfterTurn: null });
  else player.grave.push(card.id);
  addHistory(state, `${card.displayName} ${keepActive ? 'reste active' : 'est envoyé au cimetière'} après résolution.`);
  return { ok: true };
}

function counterPendingAttack(state, counterPlayer, card) {
  const attack = state.pendingAttack;
  if (!attack) return;
  const attacker = state.players[attack.playerIndex];
  attacker.status.noAttackThroughTurn = state.turnNumber;
  state.pendingAttack = null;
  state.phase = 'attacks';
  state.attackLock = true;
  const controller = state.players[counterPlayer];
  controller.grave.push(card.id);
  controller.resolvingMomentum = null;
  addHistory(state, `${card.displayName} répond à l’attaque annoncée : l’attaque est annulée et ${attacker.name} ne peut plus attaquer ce tour. L’attaque déclarée est consommée.`);
}

// options : { special: cardId de l'attaque spéciale, targets: [ids] pour les attaques multiples,
// secondTarget: id (Triple Powerbomb), ladder: true (Échelle), discard: id du Momentum sacrifié (Go to Sleep) }.
export function declareAttack(state, playerIndex, attackerId, targetId = 'direct', options = {}) {
  const player = state.players[playerIndex], defender = state.players[1 - playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'attacks' || state.pendingAttack) return { ok: false, reason: 'Aucune attaque ne peut être déclarée maintenant.' };
  if (player.status.noAttackThroughTurn >= state.turnNumber || state.attackLock) return { ok: false, reason: 'Un effet empêche toute nouvelle attaque ce tour.' };
  if (state.turnNumber === 1) return { ok: false, reason: 'Pas d’attaque au tout premier tour : l’adversaire n’a pas encore joué.' };
  const attacker = player.active.find(x => x.instanceId === attackerId);
  if (!attacker) return { ok: false, reason: 'Seuls les catcheurs actifs peuvent attaquer.' };
  const allowed = combat.canAttack(state, playerIndex, attacker);
  if (!allowed.ok) return allowed;
  const { special = null, ladder = false } = options;
  const sp = special ? combat.specialAvailable(state, playerIndex, attacker) : null;
  if (special && (special !== attacker.cardId || !sp)) return { ok: false, reason: 'Cette attaque spéciale est indisponible.' };
  if (ladder && !player.objects.some(o => o.fighterId === attackerId && o.cardId === 'objets-01')) return { ok: false, reason: 'Ce catcheur ne porte pas l’Échelle.' };
  let targets;
  const multi = ladder ? 'all-active' : sp && ['two', 'all-active', 'all-ring'].includes(sp.targets) ? sp.targets : null;
  if (multi === 'all-active') targets = defender.active.map(x => x.instanceId);
  else if (multi === 'all-ring') targets = getCards(defender).map(x => x.instanceId);
  else if (multi === 'two') {
    targets = [...new Set(options.targets ?? [])];
    if (targets.length !== Math.min(2, defender.active.length) || targets.some(id => !defender.active.some(x => x.instanceId === id))) return { ok: false, reason: 'Choisis deux catcheurs actifs adverses.' };
  } else {
    const guard = combat.forcedTarget(state, playerIndex);
    if (guard && targetId !== guard) return { ok: false, reason: 'Big Show (Garde du corps) doit être attaqué en premier.' };
    if (targetId === 'direct') {
      if (!combat.directAttackAllowed(state, playerIndex)) return { ok: false, reason: 'Le nombre d’attaques directes autorisé ce tour est atteint.' };
    } else {
      const pool = combat.canHitPassive(state, playerIndex, attacker) ? getCards(defender) : defender.active;
      if (!pool.some(x => x.instanceId === targetId)) return { ok: false, reason: 'Une attaque doit viser un catcheur actif adverse.' };
      if (state.usedTargets.includes(targetId) && !combat.canRetarget(state, playerIndex, attacker)) return { ok: false, reason: 'Ce catcheur adverse a déjà été ciblé ce tour.' };
    }
    targets = [targetId];
  }
  if (!targets.length) return { ok: false, reason: 'Aucune cible.' };
  if (sp && !multi) {
    const target = targetId === 'direct' ? null : getCards(defender).find(x => x.instanceId === targetId);
    if (combat.specialBonusAgainst(state, playerIndex, attacker, target) == null) return { ok: false, reason: 'La condition de l’attaque spéciale n’est pas remplie contre cette cible.' };
  } else if (sp && combat.specialBonusAgainst(state, playerIndex, attacker, defender.active[0] ?? null) == null && sp.targets === 'all-active') {
    return { ok: false, reason: 'La condition de l’attaque spéciale n’est pas remplie.' };
  }
  if (sp?.cost === 'momentum') {
    const discard = options.discard ?? player.hand.find(id => rarityLookup(id)?.category === 'Momentum');
    if (!discard || rarityLookup(discard)?.category !== 'Momentum' || !removeFromHand(player, discard)) return { ok: false, reason: 'Il faut sacrifier une carte Momentum de ta main.' };
    player.grave.push(discard);
    addHistory(state, `${player.name} sacrifie ${rarityLookup(discard).displayName} pour Go to Sleep.`);
  }
  const first = state.usedAttackers.length === 0;
  state.usedAttackers.push(attackerId);
  if (targets[0] === 'direct') state.directAttacksUsed += 1;
  else for (const id of targets) if (!state.usedTargets.includes(id)) state.usedTargets.push(id);
  if (sp) {
    attacker.specialUsed = true;
    emit(state, { kind: 'effect', pi: playerIndex, cardId: attacker.cardId, title: 'Attaque spéciale', sub: sp.name });
  }
  state.pendingAttack = { id: crypto.randomUUID(), playerIndex, attackerId, targetId: targets.length > 1 ? 'multi' : targets[0], targets, special: sp ? special : null, ladder, first, secondTarget: options.secondTarget ?? null };
  state.pendingAttack.attack = combat.previewDamage(state, state.pendingAttack);
  state.phase = 'reaction';
  const names = targets.map(id => (id === 'direct' ? 'les PV adverses' : rarityLookup(getCards(defender).find(x => x.instanceId === id)?.cardId)?.displayName ?? 'un catcheur'));
  addHistory(state, `${player.name} annonce ${sp ? `l’attaque spéciale ${sp.name} de` : ladder ? 'une attaque à l’Échelle de' : 'l’attaque de'} ${rarityLookup(attacker.cardId)?.displayName ?? 'son catcheur'} ${targets[0] === 'direct' ? 'sur' : 'contre'} ${names.join(', ')}.`);
  return { ok: true, pendingAttack: state.pendingAttack };
}

export function resolveAttack(state) {
  const attack = state.pendingAttack;
  if (!attack) return { ok: false, reason: 'Aucune attaque à résoudre.' };
  state.pendingAttack = null;
  state.phase = 'attacks';
  attack.targets ??= [attack.targetId]; // attaques sauvegardées avant la mise à jour
  combat.resolveCombat(state, attack);
  return { ok: true };
}

// Réponses possibles à l'attaque annoncée (hors Momenta rapides).
export function reactionOptions(state, playerIndex) {
  const a = state.pendingAttack, p = state.players[playerIndex];
  if (!a || state.phase !== 'reaction' || a.playerIndex === playerIndex || combat.effectsOff(state, playerIndex)) return [];
  const targets = (a.targets ?? [a.targetId]).map(id => getCards(p).find(x => x.instanceId === id)).filter(Boolean);
  const out = [];
  const roman = targets.some(t => combat.is(t.cardId, 'roman reigns')), bray = targets.some(t => combat.is(t.cardId, 'bray wyatt'));
  for (const f of p.active) {
    if (f.specialUsed) continue;
    if (f.cardId === 'wyatt-11' && roman) out.push({ key: 'wyatt-11', fighterId: f.instanceId, label: 'Sami Zayn protège Roman', detail: 'Effet spécial : annule l’attaque' });
    if (f.cardId === 'catcheur-10') out.push({ key: 'catcheur-10', fighterId: f.instanceId, label: 'Claymore Kick (Drew McIntyre)', detail: 'Annule l’attaque, 5 dégâts à l’attaquant' });
    if (f.cardId === 'catcheur-13') out.push({ key: 'catcheur-13', fighterId: f.instanceId, label: 'RKO (Randy Orton)', detail: 'Annule l’attaque, 10 dégâts à l’attaquant' });
    if (f.cardId === 'auth-03') out.push({ key: 'auth-03', fighterId: f.instanceId, label: 'RKO Outta Nowhere (Randy Orton)', detail: 'Annule l’attaque, 15 dégâts à l’attaquant' });
  }
  // J&J Security : se sacrifie pour protéger Seth Rollins.
  const jj = getCards(p).find(x => x.cardId === 'auth-05');
  if (jj && targets.some(t => combat.is(t.cardId, 'seth rollins'))) out.push({ key: 'auth-05', fighterId: jj.instanceId, label: 'J&J Security protège Rollins', detail: 'J&J part au cimetière, l’attaque est annulée' });
  const once = p.status.onceUsed ?? [];
  for (const t of targets) {
    const gold = p.objects.some(o => o.fighterId === t.instanceId && o.cardId === 'objets-06');
    if (gold && !once.includes('objets-06') && ['edge', 'triple h', 'randy orton'].some(n => combat.is(t.cardId, n))) out.push({ key: 'objets-06', fighterId: t.instanceId, label: 'Big Gold : éviter l’attaque', detail: 'Une fois par partie' });
  }
  if (bray && p.grave.includes('wyatt-01')) out.push({ key: 'wyatt-01', label: 'Braun Strowman (cimetière)', detail: 'Bannir Strowman pour annuler l’attaque sur Bray Wyatt' });
  return out;
}

export function useReaction(state, playerIndex, key, fighterId = null) {
  const option = reactionOptions(state, playerIndex).find(o => o.key === key && (!fighterId || o.fighterId === fighterId));
  if (!option) return { ok: false, reason: 'Cette réponse n’est pas disponible.' };
  const p = state.players[playerIndex], a = state.pendingAttack, attacker = state.players[a.playerIndex].active.find(x => x.instanceId === a.attackerId);
  const fighter = option.fighterId && getCards(p).find(x => x.instanceId === option.fighterId);
  if (['wyatt-11', 'catcheur-10', 'catcheur-13', 'auth-03'].includes(key)) fighter.specialUsed = true;
  if (key === 'auth-05') sendFighterToGrave(state, playerIndex, fighter, 'sacrifié pour protéger Seth Rollins');
  if (key === 'objets-06') (p.status.onceUsed ??= []).push('objets-06');
  if (key === 'wyatt-01') { p.grave.splice(p.grave.indexOf('wyatt-01'), 1); (p.banished ??= []).push('wyatt-01'); }
  state.pendingAttack = null;
  state.phase = 'attacks';
  addHistory(state, `${option.label} : l’attaque est annulée.`);
  emit(state, { kind: 'effect', pi: playerIndex, cardId: fighter?.cardId ?? key, title: 'Attaque annulée !', sub: option.label });
  const counter = { 'catcheur-10': 5, 'catcheur-13': 10, 'auth-03': 15 }[key];
  if (counter && attacker) { attacker.endurance -= counter; addHistory(state, `${rarityLookup(attacker.cardId)?.displayName} subit ${counter} dégâts.`); combat.checkKOs(state); }
  return { ok: true };
}

// Ancien nom conservé pour Sami Zayn.
export function counterAttackWithWrestlerEffect(state, playerIndex, fighterId) {
  return useReaction(state, playerIndex, 'wyatt-11', fighterId);
}

export function finishMatch(state, winner, reason) {
  state.winner = winner;
  state.phase = 'finished';
  addHistory(state, `${state.players[winner].name} gagne : ${reason}`);
}

export function sendFighterToGrave(state, playerIndex, fighter, reason = 'K.-O.') {
  const player = state.players[playerIndex];
  const zone = fighter.position === 'passive' ? player.passive : player.active;
  const at = zone.findIndex(x => x.instanceId === fighter.instanceId);
  if (at >= 0) zone.splice(at, 1);
  player.grave.push(fighter.cardId);
  const equipment = player.objects.filter(x => x.fighterId === fighter.instanceId);
  for (const object of equipment) {
    player.grave.push(object.cardId);
    addHistory(state, `${rarityLookup(object.cardId)?.displayName ?? 'Un objet'} est envoyé au cimetière avec son porteur.`);
  }
  player.objects = player.objects.filter(x => x.fighterId !== fighter.instanceId);
  addHistory(state, `${rarityLookup(fighter.cardId)?.displayName ?? 'Le catcheur'} est ${reason} et envoyé au cimetière.`);
  queueGraveTriggers(state, playerIndex, [fighter.cardId, ...equipment.map(o => o.cardId)]);
}

export function moveToGrave(state, playerIndex, instanceId, reason = 'déplacé') {
  const player = state.players[playerIndex];
  const fighter = getCards(player).find(x => x.instanceId === instanceId);
  if (!fighter) return { ok: false, reason: 'Catcheur introuvable.' };
  sendFighterToGrave(state, playerIndex, fighter, reason);
  return { ok: true };
}

export function adjustFighter(state, playerIndex, fighterId, stat, delta, reason = 'ajustement manuel') {
  const player = state.players[playerIndex], fighter = getCards(player).find(x => x.instanceId === fighterId);
  if (!fighter || !['attack', 'endurance'].includes(stat) || !Number.isFinite(delta)) return { ok: false, reason: 'Ajustement invalide.' };
  const before = fighter[stat];
  fighter[stat] += delta;
  addHistory(state, `${rarityLookup(fighter.cardId)?.displayName ?? 'Le catcheur'} : ${stat === 'attack' ? 'ATT' : 'END'} ${before} → ${fighter[stat]} (${reason}).`);
  combat.checkKOs(state);
  return { ok: true };
}

export function adjustPlayerHP(state, playerIndex, delta, reason = 'ajustement manuel') {
  const player = state.players[playerIndex];
  if (!Number.isFinite(delta)) return { ok: false, reason: 'Variation de PV invalide.' };
  const before = player.hp;
  player.hp += delta;
  addHistory(state, `${player.name} : PV ${before} → ${player.hp} (${reason}).`);
  if (player.hp <= 0 && state.winner === null) finishMatch(state, 1 - playerIndex, `${player.name} tombe à ${player.hp} PV.`);
  return { ok: true };
}

export function reviveFromGrave(state, playerIndex, card, position) {
  const player = state.players[playerIndex], at = player.grave.indexOf(card.id);
  if (at < 0 || card.category !== 'Catcheur') return { ok: false, reason: 'Ce catcheur n’est pas au cimetière.' };
  if (position !== 'active' && position !== 'passive') return { ok: false, reason: 'Choisissez actif ou passif.' };
  if (position === 'active' && player.active.length >= 3) return { ok: false, reason: 'Les emplacements actifs sont pleins.' };
  if (position === 'passive' && (player.passive.length >= 2 || player.active.length === 0)) return { ok: false, reason: 'Aucun emplacement passif légal.' };
  if (getCards(player).length >= 5) return { ok: false, reason: 'Le terrain contient déjà cinq catcheurs.' };
  player.grave.splice(at, 1);
  const fighter = slotFor(card, position);
  player[position].push(fighter);
  emit(state, { kind: 'summon', pi: playerIndex, cardId: card.id, title: 'Retour du cimetière' });
  addHistory(state, `${player.name} fait revenir ${card.displayName} du cimetière en position ${position === 'active' ? 'active' : 'passive'}, avec ${fighter.endurance} END.`);
  combat.onEnter(state, playerIndex, fighter);
  return { ok: true, fighter };
}

export function getActiveCharacters(player) { return copy(player.active); }
export function getAllCharacters(player) { return copy(getCards(player)); }


// ---------------------------------------------------------------------------
// Momenta à invocation directe (texte imprimé : « invoquez … directement »).
// Règle confirmée par le propriétaire : si le catcheur n'est pas en main, on le
// cherche dans le deck puis on l'invoque. Les limites de terrain restent
// respectées (3 actifs, 2 passifs, 5 max, au moins un actif pour un passif).
// `names` = cartes du catalogue acceptées ; `any` = n'importe quel catcheur ;
// `absentOnly` = condition « s'il n'est pas sur le ring » ; `sources` = zones.
// Les invocations spéciales ne consomment pas l'invocation normale.
// ---------------------------------------------------------------------------
export const DIRECT_SUMMON_RULES = Object.freeze({
  'momentum-19': { any: true, sources: ['hand'] },                                   // NEVER GIVE UP
  'momentum-21': { names: ['catcheur-03'], absentOnly: true, sources: ['hand', 'deck'] }, // LE RETOUR DE LA BÊTE
  'momentum-22': { names: ['catcheur-04', 'catcheur-06'], sources: ['hand', 'deck'] },    // VisionNAIRE Stratégique
  'momentum-23': { names: ['catcheur-12'], sources: ['hand', 'deck'] },              // Symphonie du Ring générale
  'momentum-27': { names: ['catcheur-34'], sources: ['hand', 'deck'] },              // american dream
  'momentum-28': { names: ['catcheur-36'], sources: ['hand', 'deck'] },              // culte de la personnalité
  'momentum-29': { names: ['catcheur-35'], absentOnly: true, sources: ['hand', 'deck'] }, // the champ
  'momentum-30': { names: ['catcheur-31'], sources: ['hand', 'deck'] },              // time to play the game
});

export function legalPositions(player) {
  const total = getCards(player).length, positions = [];
  if (player.active.length < 3 && total < 5) positions.push(ZONES.ACTIVE);
  if (player.active.length > 0 && player.passive.length < 2 && total < 5) positions.push(ZONES.PASSIVE);
  return positions;
}

export function directSummonOptions(state, playerIndex, momentumCard) {
  const rule = DIRECT_SUMMON_RULES[momentumCard?.id], player = state.players[playerIndex];
  if (!rule) return [];
  const positions = legalPositions(player);
  if (!positions.length) return [];
  const onRing = new Set(getCards(player).map(x => x.cardId));
  const options = [], seen = new Set();
  for (const source of rule.sources) {
    const zone = source === 'deck' ? player.deck : player.hand;
    for (const id of zone) {
      if (seen.has(id)) continue;
      const c = rarityLookup(id);
      if (!c || c.category !== 'Catcheur' || c.attack == null || c.endurance == null || c.playable === false) continue;
      if (!rule.any && !rule.names.includes(id)) continue;
      if (rule.absentOnly && rule.names.some(n => onRing.has(n))) continue;
      if (source === 'deck' && player.hand.includes(id)) continue; // main d'abord
      seen.add(id);
      options.push({ cardId: id, source, positions });
    }
  }
  return options;
}

export function resolveDirectSummon(state, playerIndex, momentumCard, targetCardId, position) {
  const player = state.players[playerIndex];
  if (player.resolvingMomentum?.cardId !== momentumCard?.id) return { ok: false, reason: 'Ce Momentum n’est pas en résolution.' };
  const option = directSummonOptions(state, playerIndex, momentumCard).find(o => o.cardId === targetCardId);
  if (!option) return { ok: false, reason: 'Ce catcheur n’est pas invocable avec cet effet.' };
  if (!option.positions.includes(position)) return { ok: false, reason: 'Aucune place légale dans cette position.' };
  const target = rarityLookup(targetCardId);
  const summoned = specialSummon(state, playerIndex, target, option.source, position, { anytime: Boolean(player.resolvingMomentum.rapid) });
  if (!summoned.ok) return summoned;
  addHistory(state, `${momentumCard.displayName} : ${target.displayName} est invoqué directement ${position === 'active' ? 'en actif' : 'en passif'}, sans consommer l’invocation normale.`);
  resolveMomentum(state, playerIndex);
  return { ok: true };
}
