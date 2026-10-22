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
function duel(me = [], opp = [], phase = 'attacks', oppPassive = []) {
  const s = game.createMatch(deck, deck, { random: () => 0 });
  s.turnNumber = 3;
  for (const p of s.players) { p.hand = []; p.deck = []; }
  s.players[0].active = me.map(id => slot(id));
  s.players[1].active = opp.map(id => slot(id));
  s.players[1].passive = oppPassive.map(id => slot(id, 'passive'));
  s.phase = phase;
  return s;
}
const hit = (s, a, t, opts) => { const r = game.declareAttack(s, 0, a.instanceId, t === 'direct' ? 'direct' : t.instanceId, opts); assert.equal(r.ok, true, r.reason); game.resolveAttack(s); };
const TANK = 'catcheur-01', TANK2 = 'catcheur-03', HORN = 'catcheur-33';

test('catalogue : 9 cartes The Authority jouables, Rollins SSR 70/100', () => {
  const auth = cards.filter(c => c.id.startsWith('auth-'));
  assert.equal(auth.length, 9);
  assert.ok(auth.every(c => c.playable && c.image === `public/cards/${c.id}.png`));
  assert.deepEqual([byId('auth-01').rarity, byId('auth-01').attack, byId('auth-01').endurance], ['SSR', 70, 100]);
});

test('Rollins : Cash-in +15 contre un adversaire déjà touché (Match Handicap), Curb Stomp donne une 2e attaque après un K.O.', () => {
  const s = duel(['catcheur-11', 'auth-01'], [TANK, HORN]);
  const [lashley, rollins] = s.players[0].active, [roman, horn] = s.players[1].active;
  s.players[0].status.handicapTurn = s.turnNumber;
  hit(s, lashley, roman);                // Roman touché : 105 - 45
  hit(s, rollins, roman);                // déjà attaqué mais Rollins est de l'Authority : 70 + 15
  assert.equal(roman.endurance, 105 - 45 - 85);
  assert.equal(s.players[1].active.includes(roman), false);
  const s2 = duel(['auth-01'], [HORN, TANK]);
  const [r2] = s2.players[0].active, [h2] = s2.players[1].active;
  hit(s2, r2, h2, { special: 'auth-01' });
  assert.equal(s2.extraAttacks[r2.instanceId], 1);
  assert.equal(combat.canAttack(s2, 0, r2).ok, true);
});

test('Sans Match Handicap, on ne peut pas viser deux fois le même adversaire', () => {
  const s = duel(['catcheur-11', 'auth-01'], [TANK, TANK2]);
  const [lashley, rollins] = s.players[0].active, [roman] = s.players[1].active;
  hit(s, lashley, roman);
  assert.equal(game.declareAttack(s, 0, rollins.instanceId, roman.instanceId).ok, false);
});

test('Kane : à son arrivée, le joueur choisit une carte Authority du deck ; Chokeslam envoie la cible en zone passive', () => {
  const s = duel([], [TANK, TANK2], 'actions');
  s.players[0].hand = ['auth-02'];
  s.players[0].deck = ['auth-01', 'auth-07', 'catcheur-33'];
  assert.equal(game.normalSummon(s, 0, byId('auth-02'), [], 'active').ok, true);
  const choice = s.pendingChoices.find(c => c.key === 'auth-02');
  assert.deepEqual(act.choiceOptions(s, choice), ['auth-01', 'auth-07']);
  assert.equal(act.resolveChoice(s, choice.id, 'auth-07').ok, true);
  assert.ok(s.players[0].hand.includes('auth-07'));
  s.phase = 'attacks';
  const kane = s.players[0].active[0], [roman, brock] = s.players[1].active;
  hit(s, kane, brock, { special: 'auth-02' });
  assert.equal(brock.endurance, 105 - 70);
  assert.equal(brock.position, 'passive');
  assert.ok(s.players[1].passive.includes(brock));
  assert.equal(s.players[1].active.length, 1);
});

test('Chokeslam ne vide pas la zone active adverse (il faut garder un actif)', () => {
  const s = duel(['auth-02'], [TANK]);
  hit(s, s.players[0].active[0], s.players[1].active[0], { special: 'auth-02' });
  assert.equal(s.players[1].active.length, 1);
});

test('Orton : attaque la zone passive avec +10 (passif activé), et son RKO annule une attaque avec 15 dégâts', () => {
  const s = duel(['auth-03'], [TANK], 'attacks', [TANK2]);
  const [orton] = s.players[0].active, [brock] = s.players[1].passive;
  hit(s, orton, brock);
  assert.equal(brock.endurance, 105 - 65);
  const s2 = duel([], [], 'attacks');
  s2.players[0].active = [slot('catcheur-11')];
  s2.players[1].active = [slot('auth-03')];
  const lashley = s2.players[0].active[0];
  assert.equal(game.declareAttack(s2, 0, lashley.instanceId, s2.players[1].active[0].instanceId).ok, true);
  const opt = game.reactionOptions(s2, 1).find(o => o.key === 'auth-03');
  assert.ok(opt);
  assert.equal(game.useReaction(s2, 1, 'auth-03', opt.fighterId).ok, true);
  assert.equal(s2.pendingAttack, null);
  assert.equal(lashley.endurance, 65 - 15);
});

test('Orton sans passif activé ne peut pas viser la zone passive', () => {
  const s = duel([], [TANK], 'attacks', [TANK2]);
  s.players[0].active = [slot('auth-03', 'active', false)];
  assert.equal(game.declareAttack(s, 0, s.players[0].active[0].instanceId, s.players[1].passive[0].instanceId).ok, false);
});

test('Big Show : garde du corps (doit être attaqué en premier), et KO Punch +25 puis repos', () => {
  const s = duel(['catcheur-11', 'catcheur-03'], ['auth-04', TANK]);
  const [lashley, brock] = s.players[0].active, [show, roman] = s.players[1].active;
  assert.equal(game.declareAttack(s, 0, lashley.instanceId, roman.instanceId).ok, false);
  assert.equal(game.declareAttack(s, 0, lashley.instanceId, 'direct').ok, false);
  hit(s, lashley, show);
  assert.equal(game.declareAttack(s, 0, brock.instanceId, roman.instanceId).ok, true); // Big Show déjà attaqué
  const s2 = duel(['auth-04'], [TANK]);
  const [show2] = s2.players[0].active;
  hit(s2, show2, s2.players[1].active[0], { special: 'auth-04' });
  assert.equal(s2.players[1].active[0].endurance, 105 - 70);
  assert.equal(show2.noAttackUntil, s2.turnNumber + 2);
});

test('J&J Security : protège Rollins (réaction) et invoque Rollins du deck sans sacrifice', () => {
  const s = duel(['catcheur-11'], ['auth-01', 'auth-05']);
  const [lashley] = s.players[0].active, [rollins, jj] = s.players[1].active;
  game.declareAttack(s, 0, lashley.instanceId, rollins.instanceId);
  assert.ok(game.reactionOptions(s, 1).some(o => o.key === 'auth-05'));
  assert.equal(game.useReaction(s, 1, 'auth-05', jj.instanceId).ok, true);
  assert.equal(s.pendingAttack, null);
  assert.ok(s.players[1].grave.includes('auth-05'));
  assert.equal(rollins.endurance, 100);
  const s2 = duel(['auth-05'], [TANK], 'actions');
  s2.players[0].deck = ['auth-01'];
  const r = act.activate(s2, 0, 'auth-05:special', s2.players[0].active[0].instanceId, { cardId: 'auth-01', position: 'active' });
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(s2.players[0].active.map(f => f.cardId), ['auth-01']);
  assert.ok(s2.players[0].grave.includes('auth-05'));
});

test('Manager Authority : Décret zone passive OU pas de SSR, une fois par tour', () => {
  const s = duel(['auth-03'], [TANK, TANK2], 'actions');
  s.players[0].manager = { cardId: 'auth-06', used: false };
  const [roman] = s.players[1].active;
  assert.equal(fx.managerEffect(s, 0, { mode: 'passive', targets: [{ instanceId: roman.instanceId }] }).ok, true);
  assert.equal(roman.position, 'passive');
  assert.equal(fx.managerEffect(s, 0, { mode: 'nossr' }).ok, false); // déjà un Décret ce tour
  s.turnNumber += 2;
  assert.equal(fx.managerEffect(s, 0, { mode: 'nossr' }).ok, true);
  // L'adversaire ne peut plus invoquer de SSR pendant son prochain tour.
  s.turn = 1; s.turnNumber += 1;
  s.players[1].hand = ['catcheur-34'];
  s.players[1].limits.normal = false;
  assert.equal(game.normalSummon(s, 1, byId('catcheur-34'), [s.players[1].active[0].instanceId], 'active').ok, false);
});

test('MITB : seulement sur l’Authority ; encaissée, une attaque de plus avec +20 ATT', () => {
  const s = duel(['auth-03', 'catcheur-11'], [TANK, TANK2], 'actions');
  s.players[0].hand = ['auth-07', 'auth-07'];
  const [orton, lashley] = s.players[0].active;
  assert.equal(game.equipObject(s, 0, byId('auth-07'), lashley.instanceId).ok, false);
  assert.equal(game.equipObject(s, 0, byId('auth-07'), orton.instanceId).ok, true);
  assert.equal(game.cashInBriefcase(s, 0, orton.instanceId).ok, true);
  assert.equal(combat.effective(s, 0, orton).attack, 75);
  assert.equal(combat.attacksAllowed(s, 0, orton), 2);
  assert.ok(s.players[0].grave.includes('auth-07'));
});

test('Best for Business : un actif en zone passive, bloqué pendant son prochain tour', () => {
  const s = duel(['auth-03'], [TANK, TANK2], 'actions');
  s.players[0].hand = ['auth-08'];
  const [roman] = s.players[1].active;
  assert.equal(game.playMomentum(s, 0, byId('auth-08')).ok, true);
  assert.equal(act.resolveTargetMomentum(s, 0, 'auth-08', [{ pi: 1, instanceId: roman.instanceId }]).ok, true);
  assert.equal(roman.position, 'passive');
  s.turn = 1; s.turnNumber += 1; s.phase = 'actions'; s.players[1].limits.move = false;
  assert.equal(game.moveFighter(s, 1, roman.instanceId, 'active').ok, false);
  assert.equal(game.swapFighters(s, 1, s.players[1].active[0].instanceId, roman.instanceId).ok, false);
  s.turnNumber += 2;
  assert.equal(game.moveFighter(s, 1, roman.instanceId, 'active').ok, true);
});

test('Match Handicap : invoque un R ou SR de l’Authority (main ou deck), pas Rollins', () => {
  const s = duel(['auth-03'], [TANK], 'actions');
  s.players[0].hand = ['auth-09', 'auth-01'];
  s.players[0].deck = ['auth-04', 'auth-05'];
  game.playMomentum(s, 0, byId('auth-09'));
  const ids = act.summonCandidates(s, 0, act.SUMMON_MOMENTA['auth-09'].summon).map(o => o.cardId).sort();
  assert.deepEqual(ids, ['auth-04', 'auth-05']);
  assert.equal(act.resolveSummonMomentum(s, 0, 'auth-09', { summonId: 'auth-04', position: 'active' }).ok, true);
  assert.equal(s.players[0].status.handicapTurn, s.turnNumber);
});

test('Combo : Match Handicap → Kane (cherche J&J) → J&J invoque Rollins', () => {
  const s = duel([], [TANK], 'actions');
  s.players[0].active = [slot('catcheur-11')];
  s.players[0].hand = ['auth-09'];
  s.players[0].deck = ['auth-02', 'auth-05', 'auth-01'];
  game.playMomentum(s, 0, byId('auth-09'));
  act.resolveSummonMomentum(s, 0, 'auth-09', { summonId: 'auth-02', position: 'active' });
  const choice = s.pendingChoices.find(c => c.key === 'auth-02');
  act.resolveChoice(s, choice.id, 'auth-05');
  assert.equal(game.normalSummon(s, 0, byId('auth-05'), [], 'active').ok, true);
  const jj = s.players[0].active.find(f => f.cardId === 'auth-05');
  assert.equal(act.activate(s, 0, 'auth-05:special', jj.instanceId, { cardId: 'auth-01', position: 'active' }).ok, true);
  assert.ok(s.players[0].active.some(f => f.cardId === 'auth-01'));
});

test('l’IA joue un deck Authority sans erreur pendant 40 parties', () => {
  const authDeck = ['auth-01', 'auth-02', 'auth-03', 'auth-04', 'auth-05', 'auth-06', 'auth-07', 'auth-08', 'auth-09', 'catcheur-04', 'catcheur-19', 'catcheur-38', 'catcheur-11', 'catcheur-03', 'momentum-05', 'momentum-08', 'momentum-15', 'momentum-20', 'objets-05', 'managers-03'].flatMap(id => [id, id]);
  for (let g = 0; g < 40; g++) {
    const s = game.createMatch(authDeck, authDeck, { first: g % 2 });
    s.players[0].role = 'ai';
    for (let turn = 0; turn < 60 && s.winner === null; turn++) {
      const pi = s.turn, skip = new Set();
      for (let i = 0; i < 30; i++) { const a = ai.bestMainAction(s, pi, skip); if (!a) break; const r = a.run(); if (r && r.ok === false) skip.add(a.label); s.pendingChoices = []; }
      s.phase = 'attacks';
      for (let i = 0; i < 8 && s.winner === null; i++) { const b = ai.bestAttack(s, pi); if (!b) break; const r = game.declareAttack(s, pi, b.attackerId, b.target, b.options); assert.equal(r.ok, true, r.reason); game.resolveAttack(s); }
      if (s.winner === null) game.endTurn(s);
    }
    for (const p of s.players) for (const f of [...p.active, ...p.passive]) assert.ok(Number.isFinite(f.endurance));
  }
});
