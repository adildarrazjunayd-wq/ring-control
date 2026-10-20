// Point d'entrée de l'interface.
import { S, $, hooks } from './core.js';
import * as screens from './screens.js';
import { duel, refreshTitantron } from './duel.js';
import { actions } from './actions.js';
import { runAI } from './ai.js';
import { beforeRender, afterRender } from './fx.js';
import { soundOn } from './sound.js';

const TITLES = { home: 'Accueil', lobby: 'Nouveau duel', decks: 'Decks', collection: 'Collection', duel: 'Duel' };

function render() {
  const view = $('#view');
  const inDuel = S.page === 'duel' && S.match;
  document.body.classList.toggle('in-duel', Boolean(inDuel));
  if (inDuel) beforeRender(S.match);
  view.innerHTML = inDuel ? duel(S.match)
    : S.page === 'duel' || S.page === 'lobby' ? screens.lobby()
    : S.page === 'decks' ? screens.decks()
    : S.page === 'collection' ? screens.collection()
    : screens.home();
  if (inDuel) afterRender(S.match);
  for (const el of document.querySelectorAll('[data-nav]')) el.classList.toggle('on', el.dataset.page === S.page || (S.page === 'duel' && el.dataset.page === 'lobby'));
  document.title = `${TITLES[S.page] ?? ''} · Ring Control`;
}
hooks.render = render;

document.addEventListener('click', event => {
  const el = event.target.closest('[data-act]');
  if (!el) {
    // Un clic dans le vide du plateau désélectionne la carte.
    if (S.page === 'duel' && event.target.closest('.stage') && (S.selected || S.targeting)) { S.selected = null; S.targeting = null; render(); }
    return;
  }
  if (el.disabled) return;
  const handler = actions[el.dataset.act];
  if (handler) handler(el.dataset, el);
});

// Survol : l'écran géant montre la carte, sans perdre la carte sélectionnée.
document.addEventListener('pointerover', event => {
  if (S.page !== 'duel' || !S.match) return;
  const el = event.target.closest('[data-preview]');
  const id = el?.dataset.preview ?? null;
  if (id === S.hovered || S.selected || S.targeting) return;
  S.hovered = id;
  refreshTitantron(S.match);
});

document.addEventListener('input', event => {
  if (event.target.matches('[data-filter="text"]')) screens.applyFilters();
  if (event.target.matches('[data-deck-name]')) {
    const deck = S.decks.find(d => d.id === S.deckId);
    if (deck) { deck.name = event.target.value; import('./core.js').then(c => c.persist()); }
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (S.selected || S.targeting) && !$('#modal').open) { S.selected = null; S.targeting = null; render(); }
});

window.addEventListener('popstate', event => {
  S.page = event.state?.ringControl ? event.state.page : 'home';
  S.selected = null;
  S.targeting = null;
  render();
});

const start = location.hash.slice(1);
S.page = TITLES[start] ? start : 'home';
history.replaceState({ ringControl: true, page: S.page }, '', `#${S.page}`);
$('[data-act="sound"]').textContent = soundOn() ? '🔊' : '🔇';
render();
if (S.match?.turn === 1 && S.match.winner === null && !S.match.pendingAttack) runAI();
