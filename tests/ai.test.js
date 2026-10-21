import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from '../src/engine/game-engine.js';
import * as brain from '../src/engine/ai-brain.js';
import * as combat from '../src/engine/combat.js';
import { AI_DECKS } from '../data/ai-decks.js';

const cards = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
game.configureCardLookup(id => cards.find(c => c.id === id));

// Générateur pseudo-aléatoire reproductible.
const seeded = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function playTurn(s) {
  const pi = s.turn, skip = new Set();
  for (let i = 0; i < 25; i += 1) {
    const a = brain.bestMainAction(s, pi, skip);
    if (!a) break;
    const before = s.history.length, r = a.run();
    if ((r && r.ok === false) || s.history.length === before) skip.add(a.label);
    if (s.winner !== null) return;
  }
  s.phase = 'attacks';
  for (let i = 0; i < 8 && s.winner === null; i += 1) {
    const plan = brain.bestAttack(s, pi);
    if (!plan || !game.declareAttack(s, pi, plan.attackerId, plan.target, plan.options).ok) break;
    const answer = brain.shouldReact(s, 1 - pi) && game.reactionOptions(s, 1 - pi)[0];
    if (answer) game.useReaction(s, 1 - pi, answer.key, answer.fighterId ?? null);
    if (s.pendingAttack) game.resolveAttack(s);
  }
  if (s.winner === null) game.endTurn(s);
}

test('l’IA joue des parties complètes deck contre deck sans erreur', () => {
  let finished = 0, specials = 0, summons = 0;
  for (let g = 0; g < 10; g += 1) {
    const a = AI_DECKS[g % AI_DECKS.length], b = AI_DECKS[(g + 2) % AI_DECKS.length];
    const s = game.createMatch(a.cards, b.cards, { random: seeded(g + 7), first: g % 2 });
    s.players[0].role = 'ai';
    for (let t = 0; t < 120 && s.winner === null; t += 1) playTurn(s);
    if (s.winner !== null) finished += 1;
    specials += s.history.filter(h => /attaque spéciale/.test(h)).length;
    summons += s.history.filter(h => /invoque/.test(h)).length;
  }
  assert.ok(finished >= 8, `${finished}/10 parties terminées`);
  assert.ok(specials > 0, 'l’IA utilise des attaques spéciales');
  assert.ok(summons > 20, 'l’IA invoque des catcheurs');
});

test('l’IA complète la Bloodline et joue The Bloodline Rassemblement quand elle le peut', () => {
  const s = game.createMatch(AI_DECKS[0].cards, AI_DECKS[1].cards, { random: seeded(3), first: 1 });
  s.turnNumber = 3;
  const p = s.players[1];
  const slot = id => ({ instanceId: id + 'x', cardId: id, attack: cards.find(c => c.id === id).attack, endurance: cards.find(c => c.id === id).endurance, baseEndurance: cards.find(c => c.id === id).endurance, position: 'active', modifiers: [], specialUsed: false, passiveUsedTurn: 0 });
  p.active = [slot('catcheur-21'), slot('catcheur-22'), slot('wyatt-11')];
  p.hand = ['wyatt-13'];
  p.deck = ['catcheur-01', ...p.deck];
  const skip = new Set();
  for (let i = 0; i < 10; i += 1) { const a = brain.bestMainAction(s, 1, skip); if (!a) break; const r = a.run(); if (r?.ok === false) skip.add(a.label); }
  assert.ok(combat.bloodlineComplete(s, 1));
  assert.ok(p.ongoingMomentum.some(o => o.cardId === 'wyatt-13'));
});

test('l’IA vise le K.O. plutôt que des dégâts partiels', () => {
  const s = game.createMatch(AI_DECKS[0].cards, AI_DECKS[1].cards, { random: seeded(5), first: 1 });
  s.turnNumber = 3;
  s.phase = 'attacks';
  const mk = (id, iid) => ({ instanceId: iid, cardId: id, attack: cards.find(c => c.id === id).attack, endurance: cards.find(c => c.id === id).endurance, baseEndurance: cards.find(c => c.id === id).endurance, position: 'active', modifiers: [], specialUsed: true, passiveUsedTurn: 0 });
  s.players[1].active = [mk('catcheur-19', 'braun')];
  const weak = mk('catcheur-33', 'horn'), big = mk('catcheur-01', 'roman');
  s.players[0].active = [big, weak];
  const plan = brain.bestAttack(s, 1);
  assert.equal(plan.target, 'horn');
});
