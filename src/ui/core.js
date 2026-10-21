// Données partagées par toute l'interface : catalogue, état sauvegardé, petits outils DOM.
import * as game from '../engine/game-engine.js';
import { SIGNATURE_DECKS } from '../../data/signature-decks.js';

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const catalog = await fetch('/data/catalog.json').then(r => r.json());
const byId = new Map(catalog.map(c => [c.id, c]));
export const card = id => byId.get(id);
export const CARD_BACK = card('catcheur-40').image;
game.configureCardLookup(card);

export const KIND_LABEL = { passif: 'Effet passif', spécial: 'Effet spécial', effet: 'Effet' };

// Le stockage garde la même clé et la même forme qu'avant : les decks et la
// partie déjà enregistrés par le joueur restent lisibles.
const STORE = 'ring-control-v2';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { saved = {}; }

export const S = {
  decks: saved.decks || [],
  match: saved.match || null,
  page: 'home',
  deckId: (saved.decks || [])[0]?.id ?? null,
  chosenDeck: `signature:${SIGNATURE_DECKS[0].id}`,
  selected: null,   // { kind: 'hand'|'fighter'|'manager'|'object'|'card', id, pi }
  hovered: null,    // identifiant de carte survolée
  targeting: null,  // instanceId de l'attaquant qui choisit sa cible
  busy: false,
  effectsOpen: (() => { try { return localStorage.getItem('ring-control-effects') !== 'closed'; } catch { return true; } })(),
};

// Rempli par main.js : évite les imports circulaires entre écrans, actions et IA.
export const hooks = { render: () => {} };

export function persist() {
  try { localStorage.setItem(STORE, JSON.stringify({ decks: S.decks, match: S.match })); } catch { /* stockage indisponible */ }
}

export function toast(text) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
}

export function modal(html, { wide = false } = {}) {
  const el = $('#modal');
  el.className = wide ? 'wide' : '';
  el.innerHTML = html;
  if (!el.open) el.showModal();
}

export function closeModal() {
  const el = $('#modal');
  if (el.open) el.close();
}

export const btn = (label, attrs = '', cls = 'btn') => `<button class="${cls}" ${attrs}>${label}</button>`;
export const option = (title, detail, attrs = '') => `<button class="opt" ${attrs}><b>${title}</b>${detail ? `<small>${detail}</small>` : ''}</button>`;

export { game, SIGNATURE_DECKS };
