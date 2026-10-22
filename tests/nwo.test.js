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
function duel(me = [], opp = [], phase = 'attacks') {
  const s = game.createMatch(deck, deck, { random: () => 0 });
  s.turnNumber = 3;
  for (const p of s.players) { p.hand = []; p.deck = []; }
  s.players[0].active = me.map(id => slot(id));
  s.players[1].active = opp.map(id => slot(id));
  s.phase = phase;
  return s;
}
const hit = (s, a, t, opts) => { const r = game.declareAttack(s, 0, a.instanceId, t.instanceId, opts); assert.equal(r.ok, true, r.reason); game.resolveAttack(s); };
const eff = (s, pi, f) => combat.effective(s, pi, f);
// Cibles adverses solides (Gunther 85 END, Roman 105 END).
const TANK = 'catcheur-01', TANK2 = 'catcheur-03';

test('catalogue : 9 cartes nWo jouables avec leur image', () => {
  const nwo = cards.filter(c => c.id.startsWith('nwo-'));
  assert.equal(nwo.length, 9);
  assert.deepEqual(nwo.filter(c => c.faction === 'nWo').map(c => c.id), ['nwo-01', 'nwo-02', 'nwo-03', 'nwo-04', 'nwo-05']);
  assert.ok(nwo.every(c => c.playable && c.image === `public/cards/${c.id}.png`));
});

test('Scott Hall (passif activé) marque l’adversaire qu’il attaque', () => {
  const s = duel(['nwo-03'], [TANK]);
  const [hall] = s.players[0].active, [t] = s.players[1].active;
  hit(s, hall, t);
  assert.equal(t.nwoMark, true);
  assert.equal(t.endurance, 105 - 50);
});

test('Scott Hall sans passif activé ne marque pas', () => {
  const s = duel([], [TANK]);
  s.players[0].active = [slot('nwo-03', 'active', false)];
  hit(s, s.players[0].active[0], s.players[1].active[0]);
  assert.ok(!s.players[1].active[0].nwoMark);
});

test('Scott Hall (spécial) invoque Kevin Nash du deck sans sacrifice, puis Hall ne peut pas attaquer', () => {
  const s = duel(['nwo-03'], [TANK], 'actions');
  s.players[0].deck = ['nwo-02', 'catcheur-33'];
  const hall = s.players[0].active[0];
  const r = act.activate(s, 0, 'nwo-03:special', hall.instanceId, { cardId: 'nwo-02', position: 'active' });
  assert.equal(r.ok, true, r.reason);
  assert.ok(s.players[0].active.some(f => f.cardId === 'nwo-02'));
  assert.equal(s.players[0].deck.includes('nwo-02'), false);
  assert.equal(combat.canAttack(s, 0, hall).ok, false);
});

test('Kevin Nash : -10 dégâts reçus seulement si Scott Hall est sur son ring', () => {
  const s = duel(['catcheur-11'], ['nwo-02', 'nwo-03']);
  s.players[1].passive = [];
  const [lashley] = s.players[0].active, [nash] = s.players[1].active;
  hit(s, lashley, nash); // Lashley 45 ATT, pas de +5 (Nash a 80 END), -10
  assert.equal(nash.endurance, 80 - 35);
  const s2 = duel(['catcheur-11'], ['nwo-02']);
  hit(s2, s2.players[0].active[0], s2.players[1].active[0]);
  assert.equal(s2.players[1].active[0].endurance, 80 - 45);
});

test('Kevin Nash (Jackknife) : +15 dégâts et marque 2 adversaires', () => {
  const s = duel(['nwo-02'], [TANK, TANK2]);
  const [nash] = s.players[0].active, [roman, brock] = s.players[1].active;
  hit(s, nash, roman, { special: 'nwo-02' });
  assert.equal(roman.endurance, 105 - 70);
  assert.equal(roman.nwoMark, true);
  assert.equal(brock.nwoMark, true);
});

test('Scott Steiner : +10 contre un marqué, et son spécial marque + endort', () => {
  const s = duel(['nwo-04', 'nwo-04'], [TANK, TANK2]);
  const [st1, st2] = s.players[0].active, [roman, brock] = s.players[1].active;
  roman.nwoMark = true;
  hit(s, st1, roman);
  assert.equal(roman.endurance, 105 - 65);
  hit(s, st2, brock, { special: 'nwo-04' });
  assert.equal(brock.nwoMark, true);
  assert.equal(brock.endurance, 105 - 55); // Brock Lesnar : 105 END
  assert.equal(brock.noAttackUntil, s.turnNumber + 1);
});

test('X-Pac marque un adversaire à son arrivée, et Bronco Buster pioche contre un marqué', () => {
  const s = duel(['nwo-03'], [TANK, TANK2], 'actions');
  s.players[0].hand = ['nwo-05'];
  s.players[0].deck = ['catcheur-33', 'catcheur-33'];
  const r = game.normalSummon(s, 0, byId('nwo-05'), [], 'active');
  assert.equal(r.ok, true, r.reason);
  const [roman, brock] = s.players[1].active;
  assert.equal(roman.nwoMark, true); // le plus fort (75 ATT avec Domination)
  assert.ok(!brock.nwoMark);
  s.phase = 'attacks';
  const xpac = s.players[0].active.find(f => f.cardId === 'nwo-05');
  hit(s, xpac, roman, { special: 'nwo-05' });
  assert.equal(roman.endurance, 105 - 55);
  assert.equal(s.players[0].hand.length, 1);
});

test('Hulk Hogan : sans sacrifice si Hall et Nash sont là, et marque tous les actifs adverses', () => {
  const s = duel(['nwo-03', 'nwo-02'], [TANK, TANK2], 'actions');
  s.players[0].hand = ['nwo-01'];
  const r = game.normalSummon(s, 0, byId('nwo-01'), [], 'active');
  assert.equal(r.ok, true, r.reason);
  assert.ok(s.players[1].active.every(f => f.nwoMark));
  const s2 = duel(['nwo-03'], [TANK], 'actions');
  s2.players[0].hand = ['nwo-01'];
  assert.equal(game.normalSummon(s2, 0, byId('nwo-01'), [], 'active').ok, false);
});

test('Hulk Hogan (Leg Drop) : seulement sur un marqué, +20, et vole le catcheur mis K.O.', () => {
  const s = duel(['nwo-01'], ['catcheur-33', TANK2]);
  const [hogan] = s.players[0].active, [horn, brock] = s.players[1].active;
  assert.equal(combat.specialBonusAgainst(s, 0, hogan, brock), null);
  horn.nwoMark = true;
  hit(s, hogan, horn, { special: 'nwo-01' });
  assert.equal(s.players[1].active.includes(horn), false);
  const stolen = s.players[0].active.find(f => f.cardId === 'catcheur-33');
  assert.ok(stolen);
  assert.equal(stolen.endurance, 25);
  assert.ok(!stolen.nwoMark);
});

test('Eric Bischoff : marque OU cherche, une fois par tour, et les marqués perdent 5 ATT', () => {
  const s = duel(['nwo-03'], [TANK, TANK2], 'actions');
  s.players[0].manager = { cardId: 'nwo-06', used: false };
  s.players[0].deck = ['nwo-05', 'catcheur-33'];
  const [roman] = s.players[1].active;
  const before = eff(s, 1, roman).attack;
  assert.equal(fx.managerEffect(s, 0, { mode: 'mark', targets: [{ instanceId: roman.instanceId }] }).ok, true);
  assert.equal(roman.nwoMark, true);
  assert.equal(eff(s, 1, roman).attack, before - 5);
  assert.equal(fx.managerEffect(s, 0, { mode: 'search', cardId: 'nwo-05' }).ok, false); // déjà utilisé ce tour
  s.turnNumber += 2;
  assert.equal(fx.managerEffect(s, 0, { mode: 'search', cardId: 'nwo-05' }).ok, true);
  assert.ok(s.players[0].hand.includes('nwo-05'));
});

test('Spray : seulement sur un nWo, +5 ATT, marque à l’équipement et à chaque coup', () => {
  const s = duel(['nwo-04', 'catcheur-11'], [TANK, TANK2], 'actions');
  s.players[0].hand = ['nwo-07', 'nwo-07'];
  const [steiner, lashley] = s.players[0].active, [roman, brock] = s.players[1].active;
  assert.equal(game.equipObject(s, 0, byId('nwo-07'), lashley.instanceId).ok, false);
  assert.equal(game.equipObject(s, 0, byId('nwo-07'), steiner.instanceId).ok, true);
  assert.equal(eff(s, 0, steiner).attack, 60);
  assert.equal(roman.nwoMark, true);
  s.phase = 'attacks';
  steiner.passiveActiveUntil = 0;
  hit(s, steiner, brock);
  assert.equal(brock.nwoMark, true);
});

test('Too Sweet : marque un actif puis 15 dégâts à chaque marqué', () => {
  const s = duel(['nwo-03'], [TANK, TANK2, 'catcheur-33'], 'actions');
  s.players[0].hand = ['nwo-08'];
  const [roman, brock, horn] = s.players[1].active;
  roman.nwoMark = true;
  assert.equal(game.playMomentum(s, 0, byId('nwo-08')).ok, true);
  const r = act.resolveTargetMomentum(s, 0, 'nwo-08', [{ pi: 1, instanceId: brock.instanceId }]);
  assert.equal(r.ok, true, r.reason);
  assert.equal(roman.endurance, 105 - 15);
  assert.equal(brock.endurance, 105 - 15);
  assert.equal(horn.endurance, 50);
  assert.ok(s.players[0].grave.includes('nwo-08'));
});

test('nWo 4 Life : invoque un nWo R/SR (main ou deck) sans sacrifice puis marque', () => {
  const s = duel(['nwo-03'], [TANK], 'actions');
  s.players[0].hand = ['nwo-09', 'nwo-01'];
  s.players[0].deck = ['nwo-02'];
  assert.equal(game.playMomentum(s, 0, byId('nwo-09')).ok, true);
  const ids = act.summonCandidates(s, 0, act.SUMMON_MOMENTA['nwo-09'].summon).map(o => o.cardId);
  assert.deepEqual(ids, ['nwo-02']); // Hogan (SSR) refusé
  const r = act.resolveSummonMomentum(s, 0, 'nwo-09', { summonId: 'nwo-02', position: 'active' });
  assert.equal(r.ok, true, r.reason);
  assert.ok(s.players[0].active.some(f => f.cardId === 'nwo-02'));
  assert.equal(s.players[1].active[0].nwoMark, true);
});

test('la marque apparaît dans les effets en cours', () => {
  const s = duel([], [TANK]);
  combat.markNwo(s, s.players[1].active[0], 'Test');
  assert.ok(combat.activeEffects(s, 1).some(e => e.icon === '🎯'));
});

test('l’IA joue un deck nWo sans erreur pendant 40 parties', () => {
  const nwoDeck = ['nwo-01', 'nwo-02', 'nwo-03', 'nwo-04', 'nwo-05', 'nwo-06', 'nwo-07', 'nwo-08', 'nwo-09', 'catcheur-11', 'catcheur-14', 'catcheur-24', 'catcheur-25', 'momentum-05', 'momentum-08', 'momentum-15', 'momentum-20', 'momentum-07', 'objets-05', 'objets-03'].flatMap(id => [id, id]);
  for (let g = 0; g < 40; g++) {
    const s = game.createMatch(nwoDeck, nwoDeck, { first: g % 2 });
    s.players[0].role = 'ai';
    for (let turn = 0; turn < 60 && s.winner === null; turn++) {
      const pi = s.turn, skip = new Set();
      for (let i = 0; i < 30; i++) { const a = ai.bestMainAction(s, pi, skip); if (!a) break; const r = a.run(); if (r && r.ok === false) skip.add(a.label); s.pendingChoices = []; }
      s.phase = 'attacks';
      for (let i = 0; i < 6 && s.winner === null; i++) { const b = ai.bestAttack(s, pi); if (!b) break; const r = game.declareAttack(s, pi, b.attackerId, b.target, b.options); if (!r.ok) break; game.resolveAttack(s); }
      if (s.winner === null) game.endTurn(s);
    }
    for (const p of s.players) for (const f of [...p.active, ...p.passive]) assert.ok(Number.isFinite(f.endurance));
  }
});
