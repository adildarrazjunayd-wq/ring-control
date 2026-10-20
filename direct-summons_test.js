import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from './game-engine.js';

const cards = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'));
const byId = id => cards.find(c => c.id === id);
game.configureCardLookup(byId);
const playable = cards.filter(c => c.playable);
const deck = Array.from({ length: 40 }, (_, i) => playable[i % playable.length].id);
const fresh = () => { const s = game.createMatch(deck, deck, { random: () => 0 }); s.players[0].hand = []; s.players[0].deck = []; return s; };
const slot = (id, pos = 'active') => ({ instanceId: 'i-' + id + Math.random(), cardId: id, attack: byId(id).attack, endurance: byId(id).endurance, position: pos });
const play = (s, id) => { s.players[0].hand.push(id); return game.playMomentum(s, 0, byId(id)); };

test('chaque règle d’invocation directe pointe vers un Momentum et des catcheurs jouables du catalogue', () => {
  for (const [mid, rule] of Object.entries(game.DIRECT_SUMMON_RULES)) {
    assert.equal(byId(mid)?.category, 'Momentum', mid);
    for (const n of rule.names ?? []) assert.ok(byId(n)?.category === 'Catcheur' && byId(n).playable, n);
  }
});

test('VisionNAIRE Stratégique : Seth Rollins est cherché dans le deck puis placé sur le terrain, au choix du joueur', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('catcheur-04', 'catcheur-06', 'catcheur-05');
  assert.equal(play(s, 'momentum-22').ok, true);
  const opts = game.directSummonOptions(s, 0, byId('momentum-22'));
  assert.deepEqual(opts.map(o => o.cardId).sort(), ['catcheur-04', 'catcheur-06']); // les deux Seth, pas Dean Ambrose
  const r = game.resolveDirectSummon(s, 0, byId('momentum-22'), 'catcheur-06', 'active');
  assert.equal(r.ok, true);
  assert.equal(p.active.length, 1); assert.equal(p.active[0].cardId, 'catcheur-06');
  assert.equal(p.deck.includes('catcheur-06'), false);
  assert.equal(p.grave.at(-1), 'momentum-22'); assert.equal(p.resolvingMomentum, null);
  assert.equal(p.limits.normal, false); // l’invocation normale n’est pas consommée
});

test('si le catcheur est déjà en main, c’est la copie en main qui est invoquée', () => {
  const s = fresh(), p = s.players[0];
  p.hand.push('catcheur-12'); p.deck.push('catcheur-12');
  play(s, 'momentum-23');
  const [o] = game.directSummonOptions(s, 0, byId('momentum-23'));
  assert.equal(o.source, 'hand');
  game.resolveDirectSummon(s, 0, byId('momentum-23'), 'catcheur-12', 'active');
  assert.equal(p.deck.filter(x => x === 'catcheur-12').length, 1);
  assert.equal(p.hand.includes('catcheur-12'), false);
});

test('Le Retour de la Bête et The Champ exigent que le catcheur ne soit pas déjà sur le ring', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('catcheur-03'); p.active.push(slot('catcheur-03'));
  p.hand.push('momentum-21');
  assert.equal(game.directSummonOptions(s, 0, byId('momentum-21')).length, 0);
  p.active.length = 0;
  assert.equal(game.directSummonOptions(s, 0, byId('momentum-21')).length, 1);
});

test('les limites de terrain restent respectées (5 catcheurs max)', () => {
  const s = fresh(), p = s.players[0];
  for (const id of ['catcheur-05', 'catcheur-08', 'catcheur-02']) p.active.push(slot(id));
  for (const id of ['catcheur-07', 'catcheur-09']) p.passive.push(slot(id, 'passive'));
  p.deck.push('catcheur-31'); p.hand.push('momentum-30');
  assert.equal(game.directSummonOptions(s, 0, byId('momentum-30')).length, 0);
});

test('un catcheur hors règle est refusé et le Momentum reste en résolution', () => {
  const s = fresh(), p = s.players[0];
  p.deck.push('catcheur-05', 'catcheur-34'); play(s, 'momentum-27');
  const r = game.resolveDirectSummon(s, 0, byId('momentum-27'), 'catcheur-05', 'active');
  assert.equal(r.ok, false); assert.ok(p.resolvingMomentum);
  assert.equal(game.resolveDirectSummon(s, 0, byId('momentum-27'), 'catcheur-34', 'passive').ok, false); // aucun actif : passif illégal
  assert.equal(game.resolveDirectSummon(s, 0, byId('momentum-27'), 'catcheur-34', 'active').ok, true);
});
