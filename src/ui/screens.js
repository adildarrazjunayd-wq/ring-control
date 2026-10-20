// Écrans hors duel : accueil, choix du deck, decks, collection, fiche de carte.
import { DECK_MAX, COPIES_MAX, validateDeck } from '../engine/rules.js';
import { S, catalog, card, esc, btn, KIND_LABEL, SIGNATURE_DECKS } from './core.js';

const TYPES = ['Catcheur', 'Manager', 'Objet', 'Momentum'];
const playable = () => catalog.filter(c => c.playable);
const countIn = (deck, id) => deck.cards.filter(x => x === id).length;

export function effectsMarkup(c) {
  if (!c.effects?.length) return '<p class="muted">Aucun effet imprimé.</p>';
  return c.effects.map(e => `<article class="effect"><b>${KIND_LABEL[e.kind]}</b><p>${esc(e.text)}</p></article>`).join('');
}

export function cardFacts(c) {
  return [c.category, c.rarity, c.rapid ? '⚡ Rapide' : '', c.faction, c.attack != null ? `${c.attack} ATT · ${c.endurance} END` : '']
    .filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
}

export function cardDetail(c) {
  return `<div class="detail"><img src="/${c.image}" alt="${esc(c.displayName)}"><div><div class="facts">${cardFacts(c)}</div><h2>${esc(c.displayName)}</h2>${c.nickname ? `<p class="muted">${esc(c.nickname)}</p>` : ''}${effectsMarkup(c)}${c.playable ? '' : `<p class="warn">Carte exclue du jeu${c.excludedReason ? ` : ${esc(c.excludedReason)}` : ''}.</p>`}${btn('Fermer', 'data-act="close"', 'btn ghost')}</div></div>`;
}

const tile = (c, extra = '') => `<article class="tile" data-act="viewCard" data-id="${c.id}" data-type="${c.category}" data-name="${esc(`${c.displayName} ${c.faction ?? ''} ${c.effects.map(e => e.text).join(' ')}`.toLowerCase())}"><img loading="lazy" src="/${c.image}" alt="${esc(c.displayName)}"><div class="tile-meta"><b>${esc(c.displayName)}</b><small>${esc(c.category)} · ${c.rarity ?? ''}${c.rapid ? ' · ⚡' : ''}</small>${extra}</div></article>`;

const filters = () => `<div class="filters"><input class="input" data-filter="text" placeholder="Rechercher un nom, une faction, un effet…"><div class="chips">${['', ...TYPES].map(t => `<button class="chip ${t ? '' : 'on'}" data-act="filterType" data-type="${t}">${t || 'Toutes'}</button>`).join('')}</div></div>`;

export function home() {
  const sig = SIGNATURE_DECKS.map(d => `<article class="sig" data-act="chooseDeck" data-deck="signature:${d.id}"><img src="/${card(d.cardIds[0]).image}" alt=""><div><small>${esc(d.theme)}</small><b>${esc(d.name)}</b></div></article>`).join('');
  return `<section class="home">
    <div class="home-hero">
      <span class="kicker">WWE TCG · 1 joueur contre l’IA</span>
      <h1 class="logo">RING<br><em>CONTROL</em></h1>
      <p>Compose ton deck, monte sur le ring et mets l’IA K.-O. Les cartes et leurs règles restent celles que tu as créées.</p>
      <div class="row">${S.match && S.match.winner === null ? btn('▶ Reprendre le duel', 'data-act="resume"', 'btn hot big') : ''}${btn('Nouveau duel', 'data-act="go" data-page="lobby"', `btn ${S.match && S.match.winner === null ? '' : 'hot'} big`)}${btn('Mes decks', 'data-act="go" data-page="decks"', 'btn ghost big')}</div>
    </div>
    <div class="home-side"><h3>Decks signature</h3><div class="sig-list">${sig}</div>
      <div class="stats"><div><b>${playable().length}</b><small>cartes jouables</small></div><div><b>${S.decks.length}</b><small>decks perso</small></div><div><b>500</b><small>PV au départ</small></div></div></div>
  </section>`;
}

export function lobby() {
  const valid = S.decks.filter(d => validateDeck(d).valid);
  const choice = (value, name, sub, img) => `<button class="deck-pick ${S.chosenDeck === value ? 'on' : ''}" data-act="pickDeck" data-deck="${value}"><img src="/${img}" alt=""><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></button>`;
  const signatures = SIGNATURE_DECKS.map(d => choice(`signature:${d.id}`, d.name, `${d.theme} · ${d.cards.length} cartes`, card(d.cardIds[0]).image)).join('');
  const customs = valid.map(d => choice(`custom:${d.id}`, d.name, `Mon deck · ${d.cards.length} cartes`, card(d.cards.find(id => card(id)?.category === 'Catcheur') ?? d.cards[0])?.image ?? '')).join('');
  const unfinished = S.decks.length - valid.length;
  return `<section class="lobby">
    <header><span class="kicker">Préparation du combat</span><h1>Choisis ton deck</h1></header>
    <h3>Decks signature</h3><div class="deck-grid">${signatures}</div>
    <h3>Mes decks</h3><div class="deck-grid">${customs || '<p class="muted">Aucun deck personnel complet (40 cartes minimum).</p>'}</div>
    ${unfinished ? `<p class="muted">${unfinished} deck${unfinished > 1 ? 's' : ''} à compléter dans l’éditeur.</p>` : ''}
    <div class="row sticky">${btn('ENTRER DANS L’ARÈNE ▶', 'data-act="start"', 'btn hot big')}${S.match && S.match.winner === null ? btn('Reprendre la partie en cours', 'data-act="resume"', 'btn big') : ''}${btn('Éditeur de decks', 'data-act="go" data-page="decks"', 'btn ghost big')}</div>
  </section>`;
}

export function collection() {
  return `<section class="collection"><header><span class="kicker">${catalog.length} visuels · ${playable().length} jouables</span><h1>Collection</h1></header>${filters()}<div class="grid" data-grid>${catalog.map(c => tile(c)).join('')}</div></section>`;
}

export function decks() {
  const d = S.decks.find(x => x.id === S.deckId);
  const sig = SIGNATURE_DECKS.map(x => `<article class="sig-row"><img src="/${card(x.cardIds[0]).image}" alt=""><div><b>${esc(x.name)}</b><div class="row">${btn('Dupliquer', `data-act="duplicate" data-id="${x.id}"`, 'btn small')}${btn('Jouer', `data-act="chooseDeck" data-deck="signature:${x.id}"`, 'btn small hot')}</div></div></article>`).join('');
  const mine = S.decks.map(x => { const ok = validateDeck(x).valid; return `<article class="mine ${x.id === S.deckId ? 'on' : ''}"><button class="mine-open" data-act="openDeck" data-id="${x.id}"><b>${esc(x.name)}</b><small class="${ok ? 'ok' : 'warn'}">${x.cards.length} cartes · ${ok ? 'prêt' : 'à compléter'}</small></button>${btn('✕', `data-act="deleteDeck" data-id="${x.id}" title="Supprimer"`, 'btn small ghost')}</article>`; }).join('');
  return `<section class="decks">
    <aside class="decks-side">
      <h3>Decks signature</h3>${sig}
      <h3>Mes decks ${btn('＋ Nouveau', 'data-act="newDeck"', 'btn small hot')}</h3>${mine || '<p class="muted">Crée un deck vide ou duplique un deck signature.</p>'}
    </aside>
    ${d ? editor(d) : '<div class="decks-empty"><h2>Ouvre ou crée un deck</h2><p class="muted">Un deck contient 40 à 50 cartes, 2 exemplaires maximum de chaque carte.</p></div>'}
  </section>`;
}

function editor(d) {
  const check = validateDeck(d), full = d.cards.length >= DECK_MAX;
  const counts = [...new Set(d.cards)].map(id => ({ c: card(id), n: countIn(d, id) })).filter(x => x.c)
    .sort((a, b) => TYPES.indexOf(a.c.category) - TYPES.indexOf(b.c.category) || a.c.displayName.localeCompare(b.c.displayName, 'fr'));
  const byType = TYPES.map(t => ({ t, n: d.cards.filter(id => card(id)?.category === t).length }));
  const list = counts.map(({ c, n }) => `<div class="in-deck"><img src="/${c.image}" alt=""><span><b>${esc(c.displayName)}</b><small>${c.category} · ${c.rarity}</small></span><em>×${n}</em>${btn('−', `data-act="removeCard" data-id="${c.id}"`, 'btn small ghost')}${btn('+', `data-act="addCard" data-id="${c.id}" ${n >= COPIES_MAX || full ? 'disabled' : ''}`, 'btn small')}</div>`).join('');
  const pool = playable().map(c => { const n = countIn(d, c.id); return tile(c, `<button class="add ${n ? 'has' : ''}" data-act="addCard" data-id="${c.id}" ${n >= COPIES_MAX || full ? 'disabled' : ''}>${n >= COPIES_MAX ? 'MAX' : '＋'} ${n}/2</button>`); }).join('');
  return `<div class="editor">
    <div class="editor-head"><input class="input name" data-deck-name value="${esc(d.name)}" aria-label="Nom du deck"><div class="meter ${check.valid ? 'ok' : ''}"><b>${d.cards.length}</b>/40–50</div></div>
    <p class="${check.valid ? 'ok' : 'warn'}">${check.valid ? 'Deck prêt pour le combat.' : esc(check.errors[0])}</p>
    <div class="editor-body">
      <div class="pool">${filters()}<div class="grid" data-grid>${pool}</div></div>
      <aside class="deck-list"><div class="split">${byType.map(x => `<span>${x.t}s <b>${x.n}</b></span>`).join('')}</div>${list || '<p class="muted">Clique sur ＋ pour ajouter des cartes.</p>'}</aside>
    </div>
  </div>`;
}

// Filtres de la collection et de l'éditeur, appliqués sans réafficher la page.
export function applyFilters() {
  const text = (document.querySelector('[data-filter="text"]')?.value || '').toLowerCase().trim();
  const type = document.querySelector('.chip.on')?.dataset.type || '';
  for (const el of document.querySelectorAll('[data-grid] .tile')) {
    el.hidden = Boolean((type && el.dataset.type !== type) || (text && !el.dataset.name.includes(text)));
  }
}
