// Écrans hors duel : accueil, choix du deck, decks, collection, fiche de carte.
import { DECK_MAX, COPIES_MAX, validateDeck } from '../engine/rules.js';
import { S, catalog, card, esc, btn, KIND_LABEL, SIGNATURE_DECKS } from './core.js';
import { savedSession } from './net.js';
import { AI_DECKS } from '../../data/ai-decks.js';

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
  return `<div class="detail"><img src="${c.image}" alt="${esc(c.displayName)}"><div><div class="facts">${cardFacts(c)}</div><h2>${esc(c.displayName)}</h2>${c.nickname ? `<p class="muted">${esc(c.nickname)}</p>` : ''}${effectsMarkup(c)}${c.playable ? '' : `<p class="warn">Carte exclue du jeu${c.excludedReason ? ` : ${esc(c.excludedReason)}` : ''}.</p>`}${btn('Fermer', 'data-act="close"', 'btn ghost')}</div></div>`;
}

const tile = (c, extra = '') => `<article class="tile" data-act="viewCard" data-id="${c.id}" data-hover="${c.id}" data-type="${c.category}" data-name="${esc(`${c.displayName} ${c.faction ?? ''} ${c.effects.map(e => e.text).join(' ')}`.toLowerCase())}"><img loading="lazy" src="${c.image}" alt="${esc(c.displayName)}"><div class="tile-meta"><b>${esc(c.displayName)}</b><small>${esc(c.category)} · ${c.rarity ?? ''}${c.rapid ? ' · ⚡' : ''}</small>${extra}</div></article>`;

const filters = () => `<div class="filters"><input class="input" data-filter="text" placeholder="Rechercher un nom, une faction, un effet…"><div class="chips">${['', ...TYPES].map(t => `<button class="chip ${t ? '' : 'on'}" data-act="filterType" data-type="${t}">${t || 'Toutes'}</button>`).join('')}</div></div>`;

// ---------- Consulter un deck (signature, perso ou de l'IA), sans le modifier ----------
// `value` : « signature:id », « custom:id » ou « ai:id ».
const AI_ONLY = AI_DECKS.filter(d => !SIGNATURE_DECKS.some(s => s.id === d.id));
export function deckSource(value) {
  const [kind, id] = String(value ?? '').split(':');
  if (kind === 'signature') { const d = SIGNATURE_DECKS.find(x => x.id === id); return d && { kind, label: 'Deck signature', name: d.name, theme: d.theme, description: d.description, cards: d.cards }; }
  if (kind === 'custom') { const d = S.decks.find(x => x.id === id); return d && { kind, label: 'Mon deck', name: d.name, cards: d.cards, id }; }
  if (kind === 'ai') { const d = AI_ONLY.find(x => x.id === id); return d && { kind, label: 'Deck de l’IA (adversaire)', name: d.name, cards: d.cards }; }
  return null;
}
const RARITY_ORDER = { SSR: 0, SR: 1, R: 2 };
const seeBtn = (value, label = '👁 Voir les cartes') => btn(label, `data-act="viewDeck" data-deck="${value}"`, 'btn small see');
const coverOf = cards => card(cards.find(id => card(id)?.category === 'Catcheur' && card(id).rarity === 'SSR') ?? cards.find(id => card(id)?.category === 'Catcheur') ?? cards[0])?.image ?? '';

export function deckView() {
  let remembered = null;
  try { remembered = sessionStorage.getItem('ring-control-view'); } catch { /* ignore */ }
  const value = S.viewDeck ?? remembered ?? `signature:${SIGNATURE_DECKS[0].id}`, d = deckSource(value);
  if (!d) return `<section class="deckview"><h1>Deck introuvable</h1>${btn('← Retour', 'data-act="back"', 'btn big')}</section>`;
  const entries = [...new Set(d.cards)].map(id => ({ c: card(id), n: d.cards.filter(x => x === id).length })).filter(x => x.c);
  const count = (f) => entries.filter(x => f(x.c)).reduce((s, x) => s + x.n, 0);
  const stats = [
    ...TYPES.map(t => [`${t}s`, count(c => c.category === t)]),
    ...['SSR', 'SR', 'R'].map(r => [r, count(c => c.rarity === r)]),
  ].filter(([, n]) => n).map(([l, n]) => `<span><b>${n}</b> ${esc(l)}</span>`).join('');
  const block = ({ c, n }) => `<article class="dv-card" data-act="viewCard" data-id="${c.id}" data-hover="${c.id}" tabindex="0">
      <div class="dv-img"><img loading="lazy" src="${c.image}" alt="${esc(c.displayName)}"><span class="dv-n">×${n}</span></div>
      <div class="dv-text"><b class="dv-name">${esc(c.displayName)}</b>${c.nickname ? `<small class="muted">${esc(c.nickname)}</small>` : ''}<div class="facts">${cardFacts(c)}</div>${effectsMarkup(c)}</div>
    </article>`;
  // Les membres de la faction principale du deck d'abord, puis par rareté et par nom.
  const factions = entries.filter(x => x.c.faction).map(x => x.c.faction);
  const main = factions.sort((a, b) => factions.filter(f => f === b).length - factions.filter(f => f === a).length)[0];
  const rank = c => (c.faction && c.faction === main ? 0 : 1) * 10 + (RARITY_ORDER[c.rarity] ?? 9);
  const sections = TYPES.map(t => {
    const list = entries.filter(x => x.c.category === t).sort((a, b) => rank(a.c) - rank(b.c) || a.c.displayName.localeCompare(b.c.displayName, 'fr'));
    return list.length ? `<h2 class="dv-type">${esc(t.toUpperCase())}S <em>${list.reduce((s, x) => s + x.n, 0)}</em></h2><div class="dv-grid">${list.map(block).join('')}</div>` : '';
  }).join('');
  const play = d.kind !== 'ai' && validateDeck({ cards: d.cards }).valid ? btn('Jouer avec ce deck ▶', `data-act="chooseDeck" data-deck="${value}"`, 'btn hot big') : '';
  const edit = d.kind === 'custom' ? btn('Modifier ce deck', `data-act="editDeck" data-id="${d.id}"`, 'btn big') : d.kind === 'signature' ? btn('Copier pour le modifier', `data-act="duplicate" data-id="${value.split(':')[1]}"`, 'btn big') : '';
  return `<section class="deckview">
    <header class="dv-head"><img src="${coverOf(d.cards)}" alt=""><div>
      <span class="kicker">${esc(d.label)}${d.theme ? ` · ${esc(d.theme)}` : ''}</span>
      <h1>${esc(d.name)}</h1>
      ${d.description ? `<p class="dv-desc">${esc(d.description)}</p>` : ''}
      <div class="dv-stats"><span class="total"><b>${d.cards.length}</b> cartes</span>${stats}</div>
      <p class="muted dv-tip">Passe la souris sur une carte pour la voir en grand, ou clique dessus.</p>
      <div class="row">${play}${edit}${btn('← Retour', 'data-act="back"', 'btn ghost big')}</div>
    </div></header>
    ${sections}
  </section>`;
}

export function home() {
  const sig = SIGNATURE_DECKS.map(d => `<article class="sig" data-act="chooseDeck" data-deck="signature:${d.id}"><img src="${card(d.cardIds[0]).image}" alt=""><div><small>${esc(d.theme)}</small><b>${esc(d.name)}</b></div>${seeBtn(`signature:${d.id}`, '👁 Voir')}</article>`).join('');
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
  const choice = (value, name, sub, img) => `<div class="deck-pick-box"><button class="deck-pick ${S.chosenDeck === value ? 'on' : ''}" data-act="pickDeck" data-deck="${value}"><img src="${img}" alt=""><span><b>${esc(name)}</b><small>${esc(sub)}</small></span></button>${seeBtn(value)}</div>`;
  const signatures = SIGNATURE_DECKS.map(d => choice(`signature:${d.id}`, d.name, `${d.theme} · ${d.cards.length} cartes`, card(d.cardIds[0]).image)).join('');
  const customs = valid.map(d => choice(`custom:${d.id}`, d.name, `Mon deck · ${d.cards.length} cartes`, card(d.cards.find(id => card(id)?.category === 'Catcheur') ?? d.cards[0])?.image ?? '')).join('');
  const unfinished = S.decks.length - valid.length;
  const opponents = AI_ONLY.map(d => `<div class="deck-pick-box"><div class="deck-pick ai"><img src="${coverOf(d.cards)}" alt=""><span><b>${esc(d.name)}</b><small>Joué seulement par l’IA · ${d.cards.length} cartes</small></span></div>${seeBtn(`ai:${d.id}`)}</div>`).join('');
  return `<section class="lobby">
    <header><span class="kicker">Préparation du combat</span><h1>Choisis ton deck</h1></header>
    <h3>Decks signature</h3><div class="deck-grid">${signatures}</div>
    <h3>Mes decks</h3><div class="deck-grid">${customs || '<p class="muted">Aucun deck personnel complet (40 cartes minimum).</p>'}</div>
    ${unfinished ? `<p class="muted">${unfinished} deck${unfinished > 1 ? 's' : ''} à compléter dans l’éditeur.</p>` : ''}
    <h3>Les autres decks de l’IA <small class="muted">l’IA peut aussi jouer les decks signature</small></h3><div class="deck-grid">${opponents}</div>
    ${onlinePanel()}
    <div class="row sticky">${btn('CONTRE L’IA ▶', 'data-act="start"', 'btn hot big')}${S.match && S.match.winner === null && !S.online ? btn('Reprendre la partie en cours', 'data-act="resume"', 'btn big') : ''}${btn('Éditeur de decks', 'data-act="go" data-page="decks"', 'btn ghost big')}</div>
  </section>`;
}

// Bloc « Jouer en ligne » : créer une salle privée ou rejoindre celle d'un ami avec son code.
function onlinePanel() {
  const o = S.online, session = savedSession();
  const name = esc(localStorage.getItem('ring-control-name') || '');
  if (o) {
    const live = o.connected;
    return `<section class="online-box ${live ? 'live' : ''}">
      <h3>JOUER EN LIGNE</h3>
      ${o.role === 'host' ? `<p>Code de ta salle : <b class="room-code">${esc(o.code)}</b></p><p class="muted">Envoie ce code à ton adversaire : il le tape dans « Rejoindre ».</p>` : `<p>Salle <b class="room-code">${esc(o.code)}</b></p>`}
      <p class="online-status">${live ? '🟢' : '🟡'} ${esc(o.status ?? '')}</p>
      <div class="row">${S.match?.online || o.inMatch ? btn('Aller au ring ▶', 'data-act="go" data-page="duel"', 'btn hot') : ''}${o.role === 'guest' && !live ? btn('Se reconnecter', 'data-act="joinOnline" data-retry="1"', 'btn') : ''}${btn('Quitter le mode en ligne', 'data-act="leaveOnline"', 'btn ghost')}</div>
    </section>`;
  }
  const resumeHost = session?.role === 'host' && session.match && session.match.winner === null;
  const resumeGuest = session?.role === 'guest';
  return `<section class="online-box">
    <h3>JOUER EN LIGNE <small>avec un ami, chacun chez soi</small></h3>
    <label class="field">Ton pseudo <input class="input" data-online-name maxlength="16" placeholder="ex. Adil" value="${name}"></label>
    <div class="online-grid">
      <div><b>Créer une salle</b><p class="muted">Avec le deck choisi ci-dessus. Tu obtiens un code à envoyer.</p>${btn('Créer une partie privée', 'data-act="hostOnline"', 'btn hot')}${resumeHost ? btn(`Reprendre la salle ${esc(session.code)}`, 'data-act="hostOnline" data-resume="1"', 'btn') : ''}</div>
      <div><b>Rejoindre</b><p class="muted">Tape le code reçu. Ton deck choisi ci-dessus sera utilisé.</p><div class="row"><input class="input code" data-online-code maxlength="5" placeholder="CODE" value="${resumeGuest ? esc(session.code) : ''}">${btn('Rejoindre', 'data-act="joinOnline"', 'btn hot')}</div></div>
    </div>
  </section>`;
}

export function collection() {
  return `<section class="collection"><header><span class="kicker">${catalog.length} visuels · ${playable().length} jouables</span><h1>Collection</h1></header>${filters()}<div class="grid" data-grid>${catalog.map(c => tile(c)).join('')}</div></section>`;
}

export function decks() {
  const d = S.decks.find(x => x.id === S.deckId);
  const sig = SIGNATURE_DECKS.map(x => `<article class="sig-row"><img src="${card(x.cardIds[0]).image}" alt=""><div><b>${esc(x.name)}</b><div class="row">${seeBtn(`signature:${x.id}`, '👁 Voir')}${btn('Dupliquer', `data-act="duplicate" data-id="${x.id}"`, 'btn small')}${btn('Jouer', `data-act="chooseDeck" data-deck="signature:${x.id}"`, 'btn small hot')}</div></div></article>`).join('');
  const mine = S.decks.map(x => { const ok = validateDeck(x).valid; return `<article class="mine ${x.id === S.deckId ? 'on' : ''}"><button class="mine-open" data-act="openDeck" data-id="${x.id}"><b>${esc(x.name)}</b><small class="${ok ? 'ok' : 'warn'}">${x.cards.length} cartes · ${ok ? 'prêt' : 'à compléter'}</small></button>${btn('👁', `data-act="viewDeck" data-deck="custom:${x.id}" title="Voir les cartes"`, 'btn small see')}${btn('✕', `data-act="deleteDeck" data-id="${x.id}" title="Supprimer"`, 'btn small ghost')}</article>`; }).join('');
  const ai = AI_ONLY.map(x => `<article class="sig-row"><img src="${coverOf(x.cards)}" alt=""><div><b>${esc(x.name)}</b><div class="row">${seeBtn(`ai:${x.id}`, '👁 Voir')}<small class="muted">Joué par l’IA</small></div></div></article>`).join('');
  return `<section class="decks">
    <aside class="decks-side">
      <h3>Decks signature</h3>${sig}
      <h3>Mes decks ${btn('＋ Nouveau', 'data-act="newDeck"', 'btn small hot')}</h3>${mine || '<p class="muted">Crée un deck vide ou duplique un deck signature.</p>'}
      <h3>Decks de l’IA</h3>${ai}
    </aside>
    ${d ? editor(d) : '<div class="decks-empty"><h2>Ouvre ou crée un deck</h2><p class="muted">Un deck contient 40 à 50 cartes, 2 exemplaires maximum de chaque carte.</p></div>'}
  </section>`;
}

function editor(d) {
  const check = validateDeck(d), full = d.cards.length >= DECK_MAX;
  const counts = [...new Set(d.cards)].map(id => ({ c: card(id), n: countIn(d, id) })).filter(x => x.c)
    .sort((a, b) => TYPES.indexOf(a.c.category) - TYPES.indexOf(b.c.category) || a.c.displayName.localeCompare(b.c.displayName, 'fr'));
  const byType = TYPES.map(t => ({ t, n: d.cards.filter(id => card(id)?.category === t).length }));
  const list = counts.map(({ c, n }) => `<div class="in-deck" data-hover="${c.id}"><img src="${c.image}" alt=""><span><b>${esc(c.displayName)}</b><small>${c.category} · ${c.rarity}</small></span><em>×${n}</em>${btn('−', `data-act="removeCard" data-id="${c.id}"`, 'btn small ghost')}${btn('+', `data-act="addCard" data-id="${c.id}" ${n >= COPIES_MAX || full ? 'disabled' : ''}`, 'btn small')}</div>`).join('');
  const pool = playable().map(c => { const n = countIn(d, c.id); return tile(c, `<button class="add ${n ? 'has' : ''}" data-act="addCard" data-id="${c.id}" ${n >= COPIES_MAX || full ? 'disabled' : ''}>${n >= COPIES_MAX ? 'MAX' : '＋'} ${n}/2</button>`); }).join('');
  return `<div class="editor">
    <div class="editor-head"><input class="input name" data-deck-name value="${esc(d.name)}" aria-label="Nom du deck"><div class="meter ${check.valid ? 'ok' : ''}"><b>${d.cards.length}</b>/40–50</div>${d.cards.length ? btn('👁 Voir en grand', `data-act="viewDeck" data-deck="custom:${d.id}"`, 'btn see') : ''}</div>
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
