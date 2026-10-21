// Effets de cartes résolus automatiquement par le moteur.
// Chaque règle reprend le texte imprimé (voir docs/AUDIT-CARTES.md). Un effet
// absent d'ici reste en résolution manuelle : le joueur lit la carte et applique.
import {
  addHistory,
  lookupCard,
  resolveMomentum,
  specialSummon,
  legalPositions,
  DIRECT_SUMMON_RULES,
} from './game-engine.js';
import { heal, addModifier, effective } from './combat.js';
import { momentumTargetsAvailable, TARGET_MOMENTA, SUMMON_MOMENTA, targetCandidates, summonCandidates, resolveTargetMomentum, resolveSummonMomentum } from './activations.js';

const fighters = player => [...player.active, ...player.passive];
const cardsOnField = player => [
  ...fighters(player).map(f => f.cardId),
  ...(player.manager ? [player.manager.cardId] : []),
  ...player.objects.map(o => o.cardId),
];
const mentionsBloodline = card => /bloodline/i.test(`${card.displayName} ${card.effects.map(e => e.text).join(' ')}`);
const isNamed = (cardId, name) => lookupCard(cardId)?.displayName.toLowerCase() === name;

// « Ajoutez … depuis le deck à la main ». `names` = cartes acceptées, `filter` = condition libre.
export const SEARCH_RULES = Object.freeze({
  'momentum-05': { filter: c => c.category === 'Momentum', what: 'une carte Momentum' },                  // Promo Stratégique
  'wyatt-05': { names: ['catcheur-39', 'wyatt-04'], what: 'Bray Wyatt' },                                  // Suivez les buses
  'momentum-26': { names: ['catcheur-18'], what: 'Sheamus', optional: true },                              // Botte Celte
  'wyatt-11:passive': { filter: c => c.category === 'Momentum' && mentionsBloodline(c), what: 'un Momentum qui cite la Bloodline' }, // Sami Zayn
  'wyatt-10:special': { names: ['managers-01'], what: 'Paul Heyman' },                                     // Jimmy Uso
});

// « Piochez 2 cartes si … ».
export const DRAW_RULES = Object.freeze({
  'momentum-08': { amount: 2, when: p => cardsOnField(p).some(id => lookupCard(id)?.rarity === 'SSR'), reason: 'Il faut contrôler une carte SSR.' },
  'momentum-15': { amount: 2, when: p => fighters(p).some(f => lookupCard(f.cardId)?.faction), reason: 'Il faut contrôler un membre d’une faction.' },
  'momentum-17': { amount: 2, when: p => p.active.some(f => isNamed(f.cardId, 'jey uso')), reason: 'Jey Uso doit être actif.' },
});

export function searchOptions(state, playerIndex, ruleKey) {
  const rule = SEARCH_RULES[ruleKey], player = state.players[playerIndex];
  if (!rule) return [];
  const ids = [...new Set(player.deck)].filter(id => {
    const c = lookupCard(id);
    return c?.playable !== false && (rule.names ? rule.names.includes(id) : rule.filter(c));
  });
  return ids.map(id => ({ cardId: id, copies: player.deck.filter(x => x === id).length }));
}

export function takeFromDeck(state, playerIndex, cardId, sourceName) {
  const player = state.players[playerIndex], at = player.deck.indexOf(cardId);
  if (at < 0) return { ok: false, reason: 'Cette carte n’est plus dans le deck.' };
  player.deck.splice(at, 1);
  player.hand.push(cardId);
  addHistory(state, `${sourceName} : ${player.name} ajoute ${lookupCard(cardId)?.displayName ?? 'une carte'} du deck à sa main.`);
  return { ok: true };
}

function drawAvailable(state, playerIndex, amount, sourceName) {
  const player = state.players[playerIndex], drawn = Math.min(amount, player.deck.length);
  for (let i = 0; i < drawn; i += 1) player.hand.push(player.deck.shift());
  addHistory(state, `${sourceName} : ${player.name} pioche ${drawn} carte${drawn > 1 ? 's' : ''}.`);
  return drawn;
}

// Conditions imprimées « Si … » des Momenta.
const activeNamed = (p, name) => p.active.some(f => isNamed(f.cardId, name) || (name === 'roman reigns' && isNamed(f.cardId, 'roman reings')));
export const MOMENTUM_CONDITIONS = Object.freeze({
  'momentum-04': { when: p => !cardsOnField(p).some(id => lookupCard(id)?.rarity === 'SSR'), reason: 'Tu ne dois contrôler aucune SSR.' },
  'momentum-06': { when: p => p.active.some(f => lookupCard(f.cardId)?.rarity === 'SSR'), reason: 'Un catcheur SSR doit être actif.' },
  'momentum-07': { when: p => fighters(p).some(f => isNamed(f.cardId, 'kevin owens')), reason: 'Il faut contrôler Kevin Owens.' },
  'momentum-10': { when: (p, s, pi) => (s.koThisTurn?.[pi] ?? 0) > 0, reason: 'Aucun de tes catcheurs n’a été mis K.O. ce tour-ci.' },
  'momentum-11': { when: p => p.active.length >= 2, reason: 'Il faut 2 catcheurs actifs.' },
  'momentum-13': { when: p => activeNamed(p, 'roman reigns'), reason: 'Roman Reigns doit être actif.' },
});

const shieldMembers = ids => ids.filter(id => lookupCard(id)?.category === 'Catcheur' && lookupCard(id)?.faction === 'The Shield');

// Une carte Momentum peut-elle être jouée maintenant ? Évite de gaspiller une
// carte dont la condition imprimée n'est pas remplie.
export function momentumRequirement(state, playerIndex, card) {
  const player = state.players[playerIndex];
  const draw = DRAW_RULES[card.id] ?? MOMENTUM_CONDITIONS[card.id];
  if (draw && !draw.when(player, state, playerIndex)) return { ok: false, reason: draw.reason };
  const targeting = momentumTargetsAvailable(state, playerIndex, card.id);
  if (targeting) return { ok: false, reason: targeting };
  const search = SEARCH_RULES[card.id];
  if (search && !search.optional && !searchOptions(state, playerIndex, card.id).length) return { ok: false, reason: `Aucune carte ${search.what} ne reste dans ton deck.` };
  if (card.id === 'momentum-24') {
    if (!shieldMembers(fighters(player).map(f => f.cardId)).length) return { ok: false, reason: 'Il faut contrôler un membre du Shield.' };
    if (!shieldMembers(player.deck).length) return { ok: false, reason: 'Aucun membre du Shield ne reste dans ton deck.' };
    if (!legalPositions(player).length) return { ok: false, reason: 'Plus de place sur le ring.' };
  }
  if (card.id === 'momentum-16' && !player.grave.some(id => lookupCard(id)?.category === 'Catcheur')) return { ok: false, reason: 'Aucun catcheur au cimetière.' };
  if (card.id === 'momentum-01' && !player.active.some(f => lookupCard(f.cardId)?.faction === 'The Bloodline')) return { ok: false, reason: 'Un membre de The Bloodline doit être actif.' };
  return { ok: true };
}

// Résolution immédiate des Momenta sans choix du joueur. Renvoie null si la
// carte demande un choix (recherche, invocation, cimetière…) ou reste manuelle.
export function resolveSimpleMomentum(state, playerIndex, card) {
  const player = state.players[playerIndex], opponent = state.players[1 - playerIndex];
  if (DRAW_RULES[card.id]) {
    drawAvailable(state, playerIndex, DRAW_RULES[card.id].amount, card.displayName);
  } else if (card.id === 'momentum-12') {
    opponent.status.noMomentumThroughTurn = state.turnNumber;
    addHistory(state, `Stop Momentum : ${opponent.name} ne peut plus jouer de Momentum ce tour-ci.`);
  } else if (card.id === 'momentum-01') {
    opponent.status.noSsrSacrificeThroughTurn = state.turnNumber;
    addHistory(state, `Domination Totale : ${opponent.name} ne peut plus sacrifier pour invoquer une SSR ce tour-ci.`);
  } else if (card.id === 'momentum-04') {
    player.limits.momentum -= 2;
    addHistory(state, 'Momentum imprévu : 2 cartes Momentum supplémentaires peuvent être jouées ce tour-ci.');
  } else if (card.id === 'momentum-06') {
    for (const f of fighters(player)) heal(state, playerIndex, f, 10, 'Ambulance');
  } else if (card.id === 'momentum-10') {
    drawAvailable(state, playerIndex, state.koThisTurn?.[playerIndex] ?? 0, card.displayName);
  } else if (card.id === 'momentum-11') {
    for (const f of fighters(player)) addModifier(f, 'attack', 5, state.turnNumber, 'momentum-11');
    addHistory(state, 'Puissance de groupe : tous tes catcheurs gagnent +5 ATT ce tour-ci.');
  } else if (card.id === 'momentum-13') {
    opponent.status.effectsCancelledThroughTurn = state.turnNumber;
    addHistory(state, `Acknowledge Me : tous les effets de ${opponent.name} sont annulés ce tour-ci.`);
  } else return null;
  resolveMomentum(state, playerIndex);
  return { ok: true };
}

// Recherche dans le deck déclenchée par un Momentum (carte en résolution) ou un effet de catcheur.
export function resolveSearch(state, playerIndex, ruleKey, cardId, sourceName) {
  const option = searchOptions(state, playerIndex, ruleKey).find(o => o.cardId === cardId);
  if (cardId && !option) return { ok: false, reason: 'Cette carte ne correspond pas à l’effet.' };
  if (cardId) takeFromDeck(state, playerIndex, cardId, sourceName);
  if (ruleKey === 'momentum-26') {
    state.botteCeltesBoostPlayer = playerIndex;
    state.botteCeltesBoostTurn = state.turnNumber;
    addHistory(state, 'Botte Celte : si Sheamus attaque ce tour-ci, il gagne +15 ATT.');
  }
  if (state.players[playerIndex].resolvingMomentum?.cardId === ruleKey) resolveMomentum(state, playerIndex);
  return { ok: true };
}

// Triple Power Bombe : jusqu'à deux membres du Shield depuis le deck.
export function shieldSummonOptions(state, playerIndex) {
  return [...new Set(shieldMembers(state.players[playerIndex].deck))];
}

export function resolveShieldSummon(state, playerIndex, placements) {
  if (placements.length > 2) return { ok: false, reason: 'Deux membres du Shield au maximum.' };
  const allowed = shieldSummonOptions(state, playerIndex);
  if (placements.some(p => !allowed.includes(p.cardId))) return { ok: false, reason: 'Un membre choisi n’est pas dans le deck.' };
  for (const { cardId, position } of placements) {
    const result = specialSummon(state, playerIndex, lookupCard(cardId), 'deck', position);
    if (!result.ok) return result;
  }
  addHistory(state, `Triple Power Bombe invoque ${placements.map(p => lookupCard(p.cardId).displayName).join(' et ') || 'aucun membre'} depuis le deck.`);
  resolveMomentum(state, playerIndex);
  return { ok: true };
}

// Effets de managers automatisés (une fois par partie).
export function managerEffect(state, playerIndex, options = {}) {
  const player = state.players[playerIndex], manager = player.manager;
  if (!manager || manager.used) return { ok: false, reason: 'Effet du manager indisponible.' };
  const once = player.status.onceUsed ?? (player.status.onceUsed = []);
  if (manager.cardId === 'managers-02') {
    if (once.includes('managers-02')) return { ok: false, reason: 'Mr. McMahon a déjà servi pendant cette partie.' };
    player.status.freeSsrSummon = true;
    once.push('managers-02');
    addHistory(state, 'Mr. McMahon : la prochaine invocation normale d’un SSR se fait sans sacrifice.');
  } else if (manager.cardId === 'managers-05') {
    if (once.includes('managers-05')) return { ok: false, reason: 'Stephanie McMahon a déjà servi pendant cette partie.' };
    if (state.turn !== playerIndex) return { ok: false, reason: 'À utiliser pendant ton tour.' };
    player.limits.momentum -= 1;
    once.push('managers-05');
    addHistory(state, 'Stephanie McMahon : une carte Momentum supplémentaire peut être jouée ce tour-ci.');
  } else if (manager.cardId === 'managers-04') {
    const r = teddyLong(state, playerIndex, options);
    if (!r.ok) return r;
  } else {
    return { ok: false, reason: 'Cet effet de manager est permanent : il s’applique tout seul.' };
  }
  manager.used = true;
  return { ok: true, automatic: true };
}

// Teddy Long : deux catcheurs de la même faction, depuis la main, sans sacrifice.
export function teddyLongOptions(state, playerIndex) {
  const hand = state.players[playerIndex].hand.map(lookupCard).filter(c => c?.category === 'Catcheur' && c.faction && c.playable !== false);
  return [...new Set(hand.map(c => c.faction))].filter(f => hand.filter(c => c.faction === f).length >= 2).map(faction => ({ faction, cardIds: [...new Set(hand.filter(c => c.faction === faction).map(c => c.id))] }));
}

function teddyLong(state, playerIndex, { cardIds = [], positions = [] } = {}) {
  const player = state.players[playerIndex];
  if (state.turn !== playerIndex || state.phase !== 'actions') return { ok: false, reason: 'À utiliser pendant ta phase d’action.' };
  const cards = cardIds.map(lookupCard);
  if (cards.length !== 2 || !cards[0]?.faction || cards[0].faction !== cards[1]?.faction) return { ok: false, reason: 'Choisis deux catcheurs de la même faction.' };
  const hand = [...player.hand];
  for (const id of cardIds) { const at = hand.indexOf(id); if (at < 0) return { ok: false, reason: 'Ces deux catcheurs doivent être dans ta main.' }; hand.splice(at, 1); }
  for (const [i, id] of cardIds.entries()) {
    const r = specialSummon(state, playerIndex, lookupCard(id), 'hand', positions[i]);
    if (!r.ok) return r;
  }
  addHistory(state, `Teddy Long : ${cards.map(c => c.displayName).join(' et ')} entrent sur le ring.`);
  return { ok: true };
}

// Résolution complète pour l'IA : prend toujours une option légale raisonnable.
export function autoResolveMomentum(state, playerIndex, card) {
  if (resolveSimpleMomentum(state, playerIndex, card)) return;
  if (SEARCH_RULES[card.id]) {
    resolveSearch(state, playerIndex, card.id, searchOptions(state, playerIndex, card.id)[0]?.cardId, card.displayName);
    return;
  }
  if (TARGET_MOMENTA[card.id]) {
    const strongest = list => [...list].sort((a, b) => effective(state, a.pi, find(state, b)).attack - effective(state, a.pi, find(state, a)).attack)[0];
    const targets = TARGET_MOMENTA[card.id].targets.map(spec => strongest(targetCandidates(state, playerIndex, spec)));
    if (targets.every(Boolean) && resolveTargetMomentum(state, playerIndex, card.id, targets).ok) return;
  }
  if (SUMMON_MOMENTA[card.id]) {
    const option = summonCandidates(state, playerIndex, SUMMON_MOMENTA[card.id].summon)[0];
    const discard = state.players[playerIndex].hand.find(id => lookupCard(id)?.category !== 'Catcheur') ?? state.players[playerIndex].hand[0];
    if (option && resolveSummonMomentum(state, playerIndex, card.id, { discard, summonId: option.cardId, position: option.positions[0] }).ok) return;
  }
  if (DIRECT_SUMMON_RULES[card.id]) return; // géré par l'appelant (choix de position)
  if (state.players[playerIndex].resolvingMomentum) resolveMomentum(state, playerIndex);
}
const find = (state, t) => fighters(state.players[t.pi]).find(f => f.instanceId === t.instanceId);
