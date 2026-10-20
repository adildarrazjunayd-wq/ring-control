import {
  canMovePosition,
  canDirectAttack,
  normalSummonRequirement,
  validateNormalSummon,
  resolveDamage,
} from './rules.js';

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

export function createMatch(humanDeck, aiDeck, { random = Math.random } = {}) {
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
    history: [],
    createdAt: Date.now(),
    matchId: crypto.randomUUID(),
  };
  state.history.push('Le match commence : chaque joueur pioche 5 cartes.');
  beginTurn(state, 0, { opening: true });
  draw(state, 0, 1);
  return state;
}

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
  if (player.limits.normal) return { ok: false, reason: 'Votre invocation normale a déjà été utilisée ce tour.' };
  if (!card || card.category !== 'Catcheur' || !player.hand.includes(card.id)) return { ok: false, reason: 'Cette carte Catcheur n’est pas dans votre main.' };
  if (card.attack == null || card.endurance == null) return { ok: false, reason: 'Les statistiques originales de cette carte doivent être vérifiées.' };
  const capacity = position === ZONES.ACTIVE ? player.active.length < 3 : player.passive.length < 2 && player.active.length > 0;
  if (!capacity || getCards(player).length >= 5) return { ok: false, reason: 'Aucune place légale dans cette zone.' };
  const sacrifices = sacrificeIds.map(id => getCards(player).find(x => x.instanceId === id)).filter(Boolean);
  // Mr. McMahon : une invocation SSR sans sacrifice, une fois par partie.
  const free = card.rarity === 'SSR' && player.status.freeSsrSummon && sacrifices.length === 0;
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
  player.limits.normal = true;
  if (free) player.status.freeSsrSummon = false;
  addHistory(state, `${player.name} invoque normalement ${card.displayName}${sacrifices.length ? ` en sacrifiant ${sacrifices.length} catcheur${sacrifices.length === 1 ? '' : 's'}` : free ? ' sans sacrifice grâce à Mr. McMahon' : ''}.`);
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
  const capacity = position === ZONES.ACTIVE ? player.active.length < 3 : player.passive.length < 2 && player.active.length > 0;
  if (!capacity || getCards(player).length >= 5) return { ok: false, reason: 'Aucune place légale dans cette zone.' };
  const sourceZone = source === 'grave' ? player.grave : source === 'deck' ? player.deck : player.hand;
  const at = sourceZone.indexOf(card.id);
  if (at < 0) return { ok: false, reason: 'Carte introuvable dans la zone choisie.' };
  sourceZone.splice(at, 1);
  player[position].push(slotFor(card, position));
  addHistory(state, `${player.name} invoque spécialement ${card.displayName} depuis ${source === 'grave' ? 'le cimetière' : source === 'deck' ? 'le deck' : 'la main'}.`);
  return { ok: true };
}

export function moveFighter(state, playerIndex, instanceId, destination) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Déplacement possible pendant votre phase d’action.' };
  const source = player.active.some(x => x.instanceId === instanceId) ? 'active' : player.passive.some(x => x.instanceId === instanceId) ? 'passive' : null;
  if (!source || !['active', 'passive'].includes(destination)) return { ok: false, reason: 'Position de départ ou d’arrivée invalide.' };
  const allowed = canMovePosition({ from: source, to: destination, activeCount: player.active.length, passiveCount: player.passive.length, movedThisTurn: player.limits.move });
  if (!allowed) return { ok: false, reason: 'Limite de déplacement ou capacité de zone atteinte.' };
  const from = player[source], at = from.findIndex(x => x.instanceId === instanceId), [fighter] = from.splice(at, 1);
  fighter.position = destination;
  player[destination].push(fighter);
  player.limits.move = true;
  addHistory(state, `${player.name} déplace ${rarityLookup(fighter.cardId)?.displayName ?? 'un catcheur'} vers la zone ${destination === 'active' ? 'active' : 'passive'}.`);
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
  return { ok: true };
}

export function equipObject(state, playerIndex, card, fighterId) {
  const player = state.players[playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'Un objet s’équipe pendant votre phase d’action.' };
  if (!card || card.category !== 'Objet' || !player.hand.includes(card.id)) return { ok: false, reason: 'Objet absent de la main.' };
  if (player.limits.object) return { ok: false, reason: 'Un objet a déjà été joué ce tour.' };
  const fighter = getCards(player).find(x => x.instanceId === fighterId);
  if (!fighter) return { ok: false, reason: 'Choisissez le catcheur à équiper.' };
  removeFromHand(player, card.id);
  player.objects.push({ instanceId: crypto.randomUUID(), cardId: card.id, fighterId, expiresAfterTurn: null });
  player.limits.object = true;
  addHistory(state, `${player.name} équipe ${rarityLookup(fighter.cardId)?.displayName ?? 'un catcheur'} avec ${card.displayName}.`);
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
  } else if (kind === 'special') {
    if (activeIndex < 0) return { ok: false, reason: 'Un catcheur passif ne peut pas utiliser son effet spécial.' };
    if (fighter.specialUsed) return { ok: false, reason: 'Cet effet spécial a déjà été utilisé pendant cette présence en jeu.' };
    fighter.specialUsed = true;
  } else return { ok: false, reason: 'Type d’effet inconnu.' };
  addHistory(state, `${player.name} active l’effet ${kind === 'passive' ? 'passif' : 'spécial'} de ${rarityLookup(fighter.cardId)?.displayName ?? 'son catcheur'}.`);
  return { ok: true, fighter };
}

export function counterAttackWithWrestlerEffect(state, playerIndex, fighterId, targetCardId) {
  const attack = state.pendingAttack;
  const player = state.players[playerIndex];
  if (!attack || state.phase !== 'reaction' || attack.playerIndex === playerIndex || attack.targetId === 'direct') {
    return { ok: false, reason: 'Aucune attaque admissible à annuler.' };
  }
  if (state.players[attack.playerIndex].active.find(x => x.instanceId === attack.targetId)?.cardId !== targetCardId) {
    return { ok: false, reason: 'La cible de cette attaque ne correspond pas à l’effet.' };
  }
  const fighter = [...player.active, ...player.passive].find(x => x.instanceId === fighterId);
  if (!fighter || fighter.cardId !== 'wyatt-11' || fighter.specialUsed) {
    return { ok: false, reason: 'L’effet spécial de Sami Zayn est indisponible.' };
  }
  fighter.specialUsed = true;
  state.pendingAttack = null;
  state.phase = 'attacks';
  addHistory(state, 'Sami Zayn annule l’attaque visant Roman Reigns avec son effet spécial.');
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

export function declareAttack(state, playerIndex, attackerId, targetId = 'direct') {
  const player = state.players[playerIndex], defender = state.players[1 - playerIndex];
  if (state.winner !== null || state.turn !== playerIndex || state.phase !== 'attacks' || state.pendingAttack) return { ok: false, reason: 'Aucune attaque ne peut être déclarée maintenant.' };
  if (player.status.noAttackThroughTurn >= state.turnNumber || state.attackLock) return { ok: false, reason: 'Un effet empêche toute nouvelle attaque ce tour.' };
  const attacker = player.active.find(x => x.instanceId === attackerId);
  if (!attacker) return { ok: false, reason: 'Seuls les catcheurs actifs peuvent attaquer.' };
  if (state.usedAttackers.includes(attackerId)) return { ok: false, reason: 'Ce catcheur a déjà attaqué ce tour.' };
  if (targetId === 'direct') {
    const directLimit = Math.max(0, player.active.length - defender.active.length);
    if (!canDirectAttack(player.active.length, defender.active.length) || state.directAttacksUsed >= directLimit) return { ok: false, reason: 'Le nombre d’attaques directes autorisé ce tour est atteint.' };
  } else {
    if (!defender.active.some(x => x.instanceId === targetId)) return { ok: false, reason: 'Une attaque doit viser un catcheur actif adverse.' };
    if (state.usedTargets.includes(targetId)) return { ok: false, reason: 'Ce catcheur adverse a déjà été ciblé ce tour.' };
  }
  state.usedAttackers.push(attackerId);
  if (targetId === 'direct') state.directAttacksUsed += 1;
  else state.usedTargets.push(targetId);
  const bonus = rarityLookup(attacker.cardId)?.id === 'catcheur-18' && state.botteCeltesBoostPlayer === playerIndex && state.botteCeltesBoostTurn === state.turnNumber ? 15 : 0;
  state.pendingAttack = { id: crypto.randomUUID(), playerIndex, attackerId, targetId, attack: attacker.attack + bonus };
  if (bonus) addHistory(state, `${rarityLookup(attacker.cardId)?.displayName ?? 'Sheamus'} gagne +15 ATT pour cette attaque grâce à Botte Celte.`);
  state.phase = 'reaction';
  addHistory(state, `${player.name} annonce l’attaque de ${rarityLookup(attacker.cardId)?.displayName ?? 'son catcheur'}${targetId === 'direct' ? ' sur les PV adverses' : ` contre ${rarityLookup(defender.active.find(x => x.instanceId === targetId).cardId)?.displayName ?? 'un catcheur'}`}.`);
  return { ok: true, pendingAttack: state.pendingAttack };
}

export function resolveAttack(state) {
  const attack = state.pendingAttack;
  if (!attack) return { ok: false, reason: 'Aucune attaque à résoudre.' };
  state.pendingAttack = null;
  state.phase = 'attacks';
  const attacker = state.players[attack.playerIndex];
  const defenderIndex = 1 - attack.playerIndex;
  const defender = state.players[defenderIndex];
  const fighter = attacker.active.find(x => x.instanceId === attack.attackerId);
  if (!fighter) return { ok: false, reason: 'L’attaquant a quitté le ring avant la résolution.' };
  if (attack.targetId === 'direct') {
    defender.hp -= attack.attack;
    addHistory(state, `${rarityLookup(fighter.cardId)?.displayName ?? 'Le catcheur'} inflige ${attack.attack} dégâts directs. ${defender.name} passe à ${defender.hp} PV.`);
    if (defender.hp <= 0) finishMatch(state, attack.playerIndex, `${defender.name} tombe à ${defender.hp} PV.`);
  } else {
    const at = defender.active.findIndex(x => x.instanceId === attack.targetId);
    if (at < 0) return { ok: false, reason: 'La cible a quitté le ring avant la résolution.' };
    const target = defender.active[at];
    const result = resolveDamage(target.endurance, attack.attack);
    target.endurance = result.remaining;
    addHistory(state, `${rarityLookup(fighter.cardId)?.displayName ?? 'Le catcheur'} inflige ${attack.attack} dégâts à ${rarityLookup(target.cardId)?.displayName ?? 'la cible'} : END ${target.endurance}.`);
    if (result.knockedOut) sendFighterToGrave(state, defenderIndex, target, 'K.-O.');
  }
  return { ok: true };
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
  if (stat === 'endurance' && fighter.endurance <= 0) sendFighterToGrave(state, playerIndex, fighter, 'K.-O.');
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
  addHistory(state, `${player.name} fait revenir ${card.displayName} du cimetière en position ${position === 'active' ? 'active' : 'passive'}, avec ${fighter.endurance} END.`);
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
