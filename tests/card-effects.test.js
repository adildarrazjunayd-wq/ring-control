import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from '../src/engine/game-engine.js';
import * as fx from '../src/engine/card-effects.js';

const cards = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const byId = id => cards.find(c => c.id === id);
game.configureCardLookup(byId);
const playable = cards.filter(c => c.playable);
const deck = Array.from({ length: 40 }, (_, i) => playable[i % playable.length].id);
const fresh = () => { const s = game.createMatch(deck, deck, { random: () => 0 }); s.players[0].hand = []; s.players[0].deck = []; return s; };
const slot = (id, pos = 'active') => ({ instanceId: 'i-' + id + Math.random(), cardId: id, attack: byId(id).attack, endurance: byId(id).endurance, position: pos });
const play = (s, id) => { s.players[0].hand.push(id); return game.playMomentum(s, 0, byId(id)); };

test('Sami Zayn ne propose que les Momenta qui citent la Bloodline', () => {
  const s = fresh();
  s.players[0].deck.push('momentum-01', 'wyatt-13', 'momentum-13', 'momentum-20');
  assert.deepEqual(fx.searchOptions(s, 0, 'wyatt-11:passive').map(o => o.cardId).sort(), ['momentum-01', 'wyatt-13']);
  assert.equal(fx.resolveSearch(s, 0, 'wyatt-11:passive', 'wyatt-13', 'Sami Zayn').ok, true);
  assert.deepEqual(s.players[0].hand, ['wyatt-13']);
});

test('Promo Stratégique ajoute le Momentum choisi et part au cimetière', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('momentum-20', 'catcheur-01');
  assert.equal(play(s, 'momentum-05').ok, true);
  assert.equal(fx.resolveSearch(s, 0, 'momentum-05', 'momentum-20', 'Promo').ok, true);
  assert.deepEqual(p.hand, ['momentum-20']);
  assert.deepEqual(p.grave, ['momentum-05']);
  assert.equal(p.resolvingMomentum, null);
});

test('Botte Celte : Sheamus va en main et gagne +15 ATT s’il attaque ce tour', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('catcheur-18');
  play(s, 'momentum-26');
  fx.resolveSearch(s, 0, 'momentum-26', 'catcheur-18', 'Botte Celte');
  assert.ok(p.hand.includes('catcheur-18'));
  assert.equal(s.botteCeltesBoostPlayer, 0);
  assert.equal(s.botteCeltesBoostTurn, s.turnNumber);
});

test('Rappel Stratégique exige une SSR et pioche 2 cartes', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('objets-01', 'objets-02', 'objets-03');
  assert.equal(fx.momentumRequirement(s, 0, byId('momentum-08')).ok, false);
  p.active.push(slot('catcheur-01'));
  assert.equal(fx.momentumRequirement(s, 0, byId('momentum-08')).ok, true);
  play(s, 'momentum-08');
  fx.resolveSimpleMomentum(s, 0, byId('momentum-08'));
  assert.deepEqual(p.hand, ['objets-01', 'objets-02']);
});

test('Triple Power Bombe invoque jusqu’à deux membres du Shield depuis le deck', () => {
  const s = fresh(), p = s.players[0];
  p.active.push(slot('catcheur-05'));
  p.deck.push('catcheur-06', 'catcheur-08', 'catcheur-01');
  assert.equal(fx.momentumRequirement(s, 0, byId('momentum-24')).ok, true);
  assert.deepEqual(fx.shieldSummonOptions(s, 0).sort(), ['catcheur-06', 'catcheur-08']);
  play(s, 'momentum-24');
  const r = fx.resolveShieldSummon(s, 0, [{ cardId: 'catcheur-06', position: 'active' }, { cardId: 'catcheur-08', position: 'passive' }]);
  assert.equal(r.ok, true);
  assert.equal(p.active.length, 2);
  assert.equal(p.passive.length, 1);
  assert.equal(p.limits.normal, false);
});

test('Mr. McMahon permet une invocation SSR sans sacrifice, une seule fois par partie', () => {
  const s = fresh(), p = s.players[0];
  p.manager = { cardId: 'managers-02', used: false, expiresAfterTurn: null };
  assert.equal(fx.managerEffect(s, 0).ok, true);
  p.hand.push('catcheur-01');
  assert.equal(game.normalSummon(s, 0, byId('catcheur-01'), [], 'active').ok, true);
  assert.equal(p.status.freeSsrSummon, false);
  p.manager = { cardId: 'managers-02', used: false, expiresAfterTurn: null };
  assert.equal(fx.managerEffect(s, 0).ok, false);
});

test('Stop Momentum empêche l’adversaire de jouer un Momentum ce tour', () => {
  const s = fresh();
  fx.resolveSimpleMomentum(s, 0, byId('momentum-12'));
  assert.equal(s.players[1].status.noMomentumThroughTurn, s.turnNumber);
});

test('Domination Totale bloque les sacrifices pour une SSR adverse ce tour', () => {
  const s = fresh(), ai = s.players[1];
  s.turn = 1;
  s.phase = 'actions';
  ai.active = [slot('catcheur-06')];
  ai.hand = ['catcheur-01'];
  fx.resolveSimpleMomentum(s, 0, byId('momentum-01'));
  const r = game.normalSummon(s, 1, byId('catcheur-01'), [ai.active[0].instanceId], 'active');
  assert.equal(r.ok, false);
});
