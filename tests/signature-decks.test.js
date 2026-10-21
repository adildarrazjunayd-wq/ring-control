import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SIGNATURE_DECKS } from '../data/signature-decks.js';
import { validateDeck } from '../src/engine/rules.js';
import { AI_DECKS } from '../data/ai-decks.js';
const catalog = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));

test('les decks signature sont prêts à jouer et respectent les limites du deck', () => {
  assert.deepEqual(SIGNATURE_DECKS.map(deck => deck.id), ['bloodline', 'wyatt-family', 'main-event-legends']);
  for (const deck of SIGNATURE_DECKS) {
    assert.equal(deck.cards.length, 40, `${deck.name} contient exactement 40 cartes`);
    assert.equal(validateDeck(deck).valid, true, `${deck.name} doit respecter la limite d’exemplaires`);
    assert.ok(deck.cards.every(id => catalog.some(card => card.id === id && card.playable)), `${deck.name} ne contient que des cartes jouables`);
  }
});

test('les decks de l’IA sont valides et n’utilisent que des cartes jouables', () => {
  for (const d of AI_DECKS) {
    assert.equal(validateDeck(d).valid, true, d.name);
    for (const id of d.cards) assert.equal(catalog.find(c => c.id === id)?.playable, true, `${d.name} : ${id}`);
  }
});
