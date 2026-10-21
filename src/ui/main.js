// Point d'entrée de l'interface.
import { S, $, hooks, modal, esc, card } from './core.js';
import * as activ from '../engine/activations.js';
import * as screens from './screens.js';
import { duel, refreshTitantron } from './duel.js';
import { actions, go } from './actions.js';
import { broadcast } from './net.js';
import { runAI } from './ai.js';
import { beforeRender, afterRender } from './fx.js';
import { soundOn, startCrowd, stopCrowd } from './sound.js';

const TITLES = { home: 'Accueil', lobby: 'Nouveau duel', decks: 'Decks', collection: 'Collection', duel: 'Duel' };

function render() {
  const view = $('#view');
  const inDuel = S.page === 'duel' && S.match;
  document.body.classList.toggle('in-duel', Boolean(inDuel));
  if (!inDuel) stopCrowd();
  if (inDuel) beforeRender(S.match);
  view.innerHTML = inDuel ? duel(S.match)
    : S.page === 'duel' || S.page === 'lobby' ? screens.lobby()
    : S.page === 'decks' ? screens.decks()
    : S.page === 'collection' ? screens.collection()
    : screens.home();
  if (inDuel) afterRender(S.match);
  if (inDuel) showPendingChoice();
  for (const el of document.querySelectorAll('[data-nav]')) el.classList.toggle('on', el.dataset.page === S.page || (S.page === 'duel' && el.dataset.page === 'lobby'));
  document.title = `${TITLES[S.page] ?? ''} · Ring Control`;
}
hooks.render = render;
hooks.go = go;
hooks.afterPersist = broadcast; // en ligne, l'hôte envoie la partie à jour à son adversaire

// Effet déclenché par une carte arrivée au cimetière : le joueur choisit (ou renonce).
function showPendingChoice() {
  const choice = S.match.pendingChoices?.find(c => c.pi === 0);
  if (!choice || $('#modal').open) return;
  const info = activ.choiceInfo(choice), ids = activ.choiceOptions(S.match, choice);
  modal(`<h2>${esc(info.title)}</h2><p>Tu peux choisir ${esc(info.what)}.</p><div class="opts">${ids.map(id => `<button class="opt row" data-act="choicePick" data-choice="${choice.id}" data-id="${id}"><img src="${card(id).image}" alt=""><b>${esc(card(id).displayName)}</b><small>${card(id).category} · ${card(id).rarity}</small></button>`).join('')}</div><button class="btn ghost" data-act="choicePick" data-choice="${choice.id}">Ne rien prendre</button>`);
}

document.addEventListener('click', event => {
  if (S.page === 'duel' && S.match) startCrowd(); // le son ne peut démarrer qu'après un clic
  const el = event.target.closest('[data-act]');
  if (!el) {
    // Un clic dans le vide du plateau désélectionne la carte.
    if (S.page === 'duel' && event.target.closest('.stage') && (S.selected || S.targeting)) { S.selected = null; S.targeting = null; render(); }
    return;
  }
  if (el.disabled || (S.waiting && S.page === 'duel')) return; // action en route vers l'hôte
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
if (S.match) S.match.fxQueue = []; // ne pas rejouer les animations d'une partie reprise
render();
if (S.match?.turn === 1 && S.match.winner === null && !S.match.pendingAttack) runAI();
