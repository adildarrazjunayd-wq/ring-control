import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from '../src/engine/game-engine.js';
import * as combat from '../src/engine/combat.js';
import * as act from '../src/engine/activations.js';
import * as fx from '../src/engine/card-effects.js';
import * as ai from '../src/engine/ai-brain.js';

const cards = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const byId = id => cards.find(c => c.id === id);
game.configureCardLookup(byId);
const playable = cards.filter(c => c.playable);
const deck = Array.from({ length: 40 }, (_, i) => playable[i % playable.length].id);
let n = 0;
const slot = (id, pos = 'active', passiveOn = true) => ({ instanceId: `${id}#${n++}`, cardId: id, attack: byId(id).attack, endurance: byId(id).endurance, baseEndurance: byId(id).endurance, position: pos, specialUsed: false, passiveUsedTurn: 0, modifiers: [], passiveActiveUntil: passiveOn ? 999 : 0 });
function duel(me = [], opp = [], phase = 'attacks', { passives = true } = {}) {
  const s = game.createMatch(deck, deck, { random: () => 0 });
  s.turnNumber = 3;
  for (const p of s.players) { p.hand = []; p.deck = []; }
  s.players[0].active = me.map(id => slot(id, 'active', passives));
  s.players[1].active = opp.map(id => slot(id));
  s.phase = phase;
  return s;
}
const hit = (s, a, t, opts) => { const r = game.declareAttack(s, 0, a.instanceId, t === 'direct' ? 'direct' : t.instanceId, opts); assert.equal(r.ok, true, r.reason); game.resolveAttack(s); };
const BROCK = 'catcheur-03', LASHLEY = 'catcheur-11', HORN = 'catcheur-33'; // SSR 65/105, R 45/65, R 30/50

test('catalogue : 9 cartes Evolution jouables, Triple H SSR 70/100, Tous pour un est rapide', () => {
  const evo = cards.filter(c => c.id.startsWith('evo-'));
  assert.equal(evo.length, 9);
  assert.ok(evo.every(c => c.playable && c.image === `public/cards/${c.id}.png`));
  assert.deepEqual([byId('evo-01').rarity, byId('evo-01').attack, byId('evo-01').endurance], ['SSR', 70, 100]);
  assert.deepEqual(cards.filter(c => c.faction === 'Evolution').map(c => c.id), ['evo-01', 'evo-02', 'evo-03', 'evo-04']);
  assert.equal(byId('evo-09').rapid, true);
});

test('Meute : un seul coup, ATT additionnées avec Le Leader (+15) et Le Muscle (+10)', () => {
  const s = duel(['evo-01', 'evo-02'], [BROCK, HORN]);
  const [hhh, batista] = s.players[0].active, [brock] = s.players[1].active;
  const r = game.declareAttack(s, 0, hhh.instanceId, brock.instanceId, { pack: [batista.instanceId] });
  assert.equal(r.ok, true, r.reason);
  assert.equal(s.pendingAttack.attack, (70 + 15) + (60 + 10));
  game.resolveAttack(s);
  assert.equal(s.players[1].active.includes(brock), false); // 155 dégâts : Brock (105 END) est mis K.O.
  assert.deepEqual(s.usedAttackers, [hhh.instanceId, batista.instanceId]);
});

test('Meute sans effets passifs activés : seulement les ATT additionnées', () => {
  const s = duel(['evo-01', 'evo-02'], [BROCK], 'attacks', { passives: false });
  const [hhh, batista] = s.players[0].active, [brock] = s.players[1].active;
  hit(s, hhh, brock, { pack: [batista.instanceId] });
  assert.equal(brock.endurance, 105 - 130);
});

test('Meute : une fois par tour, jamais sur les PV, les participants se reposent au tour suivant', () => {
  const s = duel(['evo-01', 'evo-02', 'evo-03'], [HORN]);
  const [hhh, batista, orton] = s.players[0].active;
  assert.equal(game.declareAttack(s, 0, hhh.instanceId, 'direct', { pack: [batista.instanceId] }).ok, false);
  hit(s, hhh, s.players[1].active[0], { pack: [batista.instanceId] });
  // Une 2e meute le même tour est refusée, même avec un autre duo.
  assert.match(combat.packCheck(s, 0, orton), /une seule/i);
  // Repos : ils ne peuvent pas attaquer à leur prochain tour (tour 5), puis à nouveau au tour 7.
  assert.equal(hhh.noAttackUntil, s.turnNumber + 2);
  assert.equal(batista.noAttackUntil, s.turnNumber + 2);
  s.turnNumber = 5; s.usedAttackers = []; s.usedTargets = [];
  assert.equal(combat.canAttack(s, 0, hhh).ok, false);
  assert.equal(combat.canAttack(s, 0, orton).ok, true);
  s.turnNumber = 7;
  assert.equal(combat.canAttack(s, 0, hhh).ok, true);
});

test('Meute : il faut un autre membre d’Evolution actif qui peut attaquer (pas un catcheur hors faction)', () => {
  const s = duel(['evo-01', LASHLEY], [BROCK]);
  const [hhh, lashley] = s.players[0].active;
  assert.ok(combat.packCheck(s, 0, hhh));
  assert.equal(game.declareAttack(s, 0, hhh.instanceId, s.players[1].active[0].instanceId, { pack: [lashley.instanceId] }).ok, false);
});

test('Assaut Total : la meute peut réunir 3 membres (2 partenaires), sinon un seul partenaire', () => {
  const s = duel(['evo-01', 'evo-02', 'evo-03'], [BROCK], 'attacks', { passives: false });
  const [hhh, batista, orton] = s.players[0].active, [brock] = s.players[1].active;
  assert.equal(game.declareAttack(s, 0, hhh.instanceId, brock.instanceId, { pack: [batista.instanceId, orton.instanceId] }).ok, false);
  s.phase = 'actions';
  s.players[0].hand = ['evo-08'];
  assert.equal(game.playMomentum(s, 0, byId('evo-08')).ok, true);
  assert.equal(fx.resolveSimpleMomentum(s, 0, byId('evo-08')).ok, true);
  s.phase = 'attacks';
  hit(s, hhh, brock, { pack: [batista.instanceId, orton.instanceId] });
  assert.equal(brock.endurance, 105 - (70 + 60 + 55)); // Orton sans son passif activé
  for (const f of [hhh, batista, orton]) assert.equal(f.noAttackUntil, s.turnNumber + 2);
});

test('Masse : +10 ATT sur un membre d’Evolution, +10 dégâts de plus en meute ; seulement sur Evolution', () => {
  const s = duel(['evo-02', 'evo-04', LASHLEY], [BROCK, HORN], 'actions', { passives: false });
  const [batista, flair, lashley] = s.players[0].active;
  s.players[0].hand = ['evo-06'];
  assert.equal(game.equipObject(s, 0, byId('evo-06'), lashley.instanceId).ok, false);
  assert.equal(game.equipObject(s, 0, byId('evo-06'), batista.instanceId).ok, true);
  assert.equal(combat.effective(s, 0, batista).attack, 70);
  s.phase = 'attacks';
  const [brock] = s.players[1].active;
  hit(s, batista, brock, { pack: [flair.instanceId] });
  assert.equal(brock.endurance, 105 - ((70 + 10) + 45));
});

test('Manager Evolution : +5 ATT par autre membre d’Evolution sur le ring', () => {
  const s = duel(['evo-01', 'evo-02', LASHLEY], [], 'actions', { passives: false });
  s.players[0].passive = [slot('evo-04', 'passive', false)];
  s.players[0].manager = { cardId: 'evo-05', used: false };
  const [hhh, batista, lashley] = s.players[0].active;
  assert.equal(combat.effective(s, 0, hhh).attack, 70 + 10);      // Batista et Flair
  assert.equal(combat.effective(s, 0, batista).attack, 60 + 10);
  assert.equal(combat.effective(s, 0, lashley).attack, 45);       // pas membre d'Evolution
});

test('Randy Orton : +15 contre une SSR ; Punt Kick +10 et la cible n’attaque pas à son prochain tour', () => {
  const s = duel(['evo-03'], [BROCK, LASHLEY]);
  const [orton] = s.players[0].active, [brock, lashley] = s.players[1].active;
  assert.equal(combat.previewDamage(s, { playerIndex: 0, attackerId: orton.instanceId, targets: [brock.instanceId] }), 55 + 15);
  assert.equal(combat.previewDamage(s, { playerIndex: 0, attackerId: orton.instanceId, targets: [lashley.instanceId] }), 55);
  hit(s, orton, brock, { special: 'evo-03' });
  assert.equal(brock.endurance, 105 - (55 + 15 + 10));
  assert.equal(brock.noAttackUntil, s.turnNumber + 1);
});

test('Pedigree : +20 dégâts et pioche 1 carte si l’adversaire est mis K.O. ; Batista Bomb : +25 puis -10 END', () => {
  const s = duel(['evo-01'], [HORN, BROCK]);
  s.players[0].deck = ['momentum-05'];
  const [hhh] = s.players[0].active;
  hit(s, hhh, s.players[1].active[0], { special: 'evo-01' });
  assert.ok(s.players[0].hand.includes('momentum-05'));
  const s2 = duel(['evo-02'], [BROCK]);
  const [batista] = s2.players[0].active, [brock] = s2.players[1].active;
  hit(s2, batista, brock, { special: 'evo-02' });
  assert.equal(brock.endurance, 105 - 85);
  assert.equal(batista.endurance, 80 - 10);
});

test('Meute + attaque spéciale du meneur : le bonus spécial s’ajoute au coup commun', () => {
  const s = duel(['evo-01', 'evo-02'], [BROCK, HORN], 'attacks', { passives: false });
  s.players[0].deck = ['momentum-05'];
  const [hhh, batista] = s.players[0].active, [brock] = s.players[1].active;
  hit(s, hhh, brock, { special: 'evo-01', pack: [batista.instanceId] });
  assert.equal(s.players[1].active.includes(brock), false); // 70 + 20 + 60 = 150
  assert.ok(s.players[0].hand.includes('momentum-05'));     // K.O. avec Pedigree : pioche
  assert.equal(hhh.specialUsed, true);
});

test('Ric Flair : Mentor (choix d’un membre d’Evolution du deck) puis Woooo ! fait entrer Triple H', () => {
  const s = duel([], [BROCK], 'actions');
  s.players[0].hand = ['evo-04'];
  s.players[0].deck = ['evo-02', 'evo-01', 'evo-06', 'catcheur-33'];
  assert.equal(game.normalSummon(s, 0, byId('evo-04'), [], 'active').ok, true);
  const choice = s.pendingChoices.find(c => c.key === 'evo-04');
  assert.deepEqual(act.choiceOptions(s, choice), ['evo-02', 'evo-01']);
  assert.equal(act.resolveChoice(s, choice.id, 'evo-02').ok, true);
  assert.ok(s.players[0].hand.includes('evo-02'));
  const flair = s.players[0].active[0];
  assert.equal(act.activationCheck(s, 0, 'evo-04:special', flair), null);
  assert.equal(act.activate(s, 0, 'evo-04:special', flair.instanceId, { cardId: 'evo-01', position: 'active' }).ok, true);
  assert.deepEqual(s.players[0].active.map(f => f.cardId), ['evo-01']);
  assert.ok(s.players[0].grave.includes('evo-04'));
  assert.equal(s.players[0].deck.includes('evo-01'), false);
});

test('Woooo ! est refusé quand le Décret de l’Authority interdit les SSR (Flair n’est pas perdu)', () => {
  const s = duel(['evo-04'], [BROCK], 'actions');
  s.players[0].deck = ['evo-01'];
  s.players[0].status.noSsrSummonThroughTurn = s.turnNumber;
  const flair = s.players[0].active[0];
  assert.ok(act.activationCheck(s, 0, 'evo-04:special', flair));
  assert.ok(s.players[0].active.includes(flair));
});

test('L’IA joue Ric Flair : elle prend Triple H en priorité avec Mentor', () => {
  const s = duel([], [BROCK], 'actions');
  s.players[0].role = 'ai';
  s.players[0].hand = ['evo-04'];
  s.players[0].deck = ['evo-03', 'evo-01'];
  game.normalSummon(s, 0, byId('evo-04'), [], 'active');
  assert.ok(s.players[0].hand.includes('evo-01'));
});

test('Evolution Is A Mystery : invoque un membre R ou SR (main ou deck), pas Triple H', () => {
  const s = duel([], [BROCK], 'actions');
  s.players[0].hand = ['evo-07'];
  s.players[0].deck = ['evo-01', 'evo-03'];
  assert.equal(game.playMomentum(s, 0, byId('evo-07')).ok, true);
  assert.deepEqual(act.summonCandidates(s, 0, act.SUMMON_MOMENTA['evo-07'].summon).map(o => o.cardId), ['evo-03']);
  assert.equal(act.resolveSummonMomentum(s, 0, 'evo-07', { summonId: 'evo-03', position: 'active' }).ok, true);
  assert.equal(s.players[0].active[0].cardId, 'evo-03');
});

test('Tous pour un : annule une attaque contre un membre d’Evolution si un autre membre est actif', () => {
  const s = duel([BROCK], ['evo-01', 'evo-02']);
  const [brock] = s.players[0].active, [hhh] = s.players[1].active;
  s.players[1].hand = ['evo-09'];
  assert.equal(game.declareAttack(s, 0, brock.instanceId, hhh.instanceId).ok, true);
  assert.equal(fx.momentumRequirement(s, 1, byId('evo-09')).ok, true);
  assert.equal(game.playMomentum(s, 1, byId('evo-09')).ok, true);
  assert.equal(s.pendingAttack, null);
  assert.equal(hhh.endurance, 100);
  assert.ok(s.players[1].grave.includes('evo-09'));
  assert.equal(s.players[0].status.noAttackThroughTurn >= s.turnNumber, false); // l'attaquant n'est pas bloqué pour le reste du tour
});

test('Tous pour un est refusé si la cible est seule membre d’Evolution actif', () => {
  const s = duel([BROCK], ['evo-01', LASHLEY]);
  const [brock] = s.players[0].active, [hhh] = s.players[1].active;
  s.players[1].hand = ['evo-09'];
  game.declareAttack(s, 0, brock.instanceId, hhh.instanceId);
  assert.equal(fx.momentumRequirement(s, 1, byId('evo-09')).ok, false);
  assert.equal(game.playMomentum(s, 1, byId('evo-09')).ok, false);
  assert.ok(s.players[1].hand.includes('evo-09'));
});

test('Une meute annulée (Contre) laisse les deux catcheurs au repos : ils ont gâché leur attaque', () => {
  const s = duel(['evo-01', 'evo-02'], [BROCK]);
  const [hhh, batista] = s.players[0].active, [brock] = s.players[1].active;
  s.players[1].hand = ['momentum-20'];
  game.declareAttack(s, 0, hhh.instanceId, brock.instanceId, { pack: [batista.instanceId] });
  assert.equal(game.playMomentum(s, 1, byId('momentum-20')).ok, true);
  assert.equal(brock.endurance, 105);
  assert.equal(hhh.noAttackUntil, s.turnNumber + 2);
  assert.equal(batista.noAttackUntil, s.turnNumber + 2);
});

test('L’IA lance une meute quand le coup commun met K.O. une cible qu’un seul catcheur n’abattrait pas', () => {
  const s = duel(['evo-01', 'evo-02'], [BROCK]);
  const plan = ai.bestAttack(s, 0);
  assert.ok(plan.options?.pack?.length, 'l’IA devrait attaquer en meute');
  const r = game.declareAttack(s, 0, plan.attackerId, plan.target, plan.options);
  assert.equal(r.ok, true, r.reason);
  game.resolveAttack(s);
  assert.equal(s.players[1].active.length, 0);
});

test('Le deck signature Evolution contient les 9 cartes, 40 cartes, 2 exemplaires maximum', async () => {
  const { SIGNATURE_DECKS } = await import('../data/signature-decks.js');
  const evo = SIGNATURE_DECKS.find(d => d.id === 'evolution');
  assert.equal(evo.cards.length, 40);
  for (let i = 1; i <= 9; i += 1) assert.equal(evo.cards.filter(id => id === `evo-0${i}`).length, 2);
});
