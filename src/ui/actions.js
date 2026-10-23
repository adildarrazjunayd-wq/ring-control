// Réactions aux clics. Chaque bouton porte data-act="nom" et ses paramètres en data-*.
import { DECK_MAX, COPIES_MAX } from '../engine/rules.js';
import * as effects from '../engine/card-effects.js';
import * as combat from '../engine/combat.js';
import * as activ from '../engine/activations.js';
import { S, card, esc, game, persist, hooks, toast, modal, closeModal, option, btn, SIGNATURE_DECKS } from './core.js';
import { pickable, needed } from './targeting.js';
import { AI_DECKS } from '../../data/ai-decks.js';
import { cardDetail, applyFilters } from './screens.js';
import { animateAttack, banner } from './fx.js';
import { runAI, aiReact } from './ai.js';
import { exec } from './net.js';
import * as net from './net.js';
import { sfx, toggleSound } from './sound.js';
import { showVersus, deckStar } from './versus.js';

const render = () => hooks.render();
const m = () => S.match;
const me = () => S.match.players[0];
const fighters = p => [...p.active, ...p.passive];
const done = (result, sound = 'tap') => {
  if (result && result.ok === false) { toast(result.reason); sfx('tap'); return false; }
  sfx(sound);
  S.selected = null;
  closeModal();
  persist();
  render();
  return true;
};
const positionOptions = (attr, positions) => positions.map(pos => option(pos === 'active' ? 'Placer en actif' : 'Placer en passif', pos === 'active' ? 'Peut attaquer' : 'N’attaque pas', `${attr} data-pos="${pos}"`)).join('');

export function go(page) {
  if (page !== S.page) history.pushState({ ringControl: true, page }, '', `#${page}`);
  S.page = page;
  S.selected = null;
  S.targeting = null;
  closeModal();
  render();
  window.scrollTo(0, 0);
}

function chosenDeck() {
  const [kind, id] = (S.chosenDeck ?? '').split(':');
  return kind === 'signature' ? SIGNATURE_DECKS.find(x => x.id === id) : S.decks.find(x => x.id === id);
}

function onlineName() {
  const name = (document.querySelector('[data-online-name]')?.value || localStorage.getItem('ring-control-name') || 'Joueur').trim().slice(0, 16);
  try { localStorage.setItem('ring-control-name', name); } catch { /* ignore */ }
  return name;
}

// Pile ou face : le joueur choisit, la pièce tourne, le gagnant commence.
function coinToss(deck, aiDeck) {
  S.pendingStart = { deck, aiDeck };
  modal(`<div class="coin-screen"><h2>PILE OU FACE ?</h2><p>Ton adversaire : <b>${esc(aiDeck.name)}</b>. Le gagnant du tirage commence (sans pouvoir attaquer au premier tour).</p><div class="coin"><div class="coin-face heads">FACE</div><div class="coin-face tails">PILE</div></div><div class="row center">${btn('FACE', 'data-act="coinPick" data-side="face"', 'btn hot big')}${btn('PILE', 'data-act="coinPick" data-side="pile"', 'btn hot big')}</div></div>`);
}

function newMatch(deck, aiDeck, first) {
  S.match = game.createMatch(deck.cards.slice(), aiDeck.cards.slice(), { first });
  S.match.players[0].name = 'Vous';
  S.match.players[1].name = 'L’IA';
  S.match.aiDeckName = aiDeck.name;
  S.hideResult = false;
  S.pendingStart = null;
  persist();
  go('duel');
  sfx('bell');
  if (first === 1) { banner('<b>L’IA COMMENCE</b>'); runAI(); } else banner('<b>À TOI DE COMMENCER !</b>');
}

// Momentum joué par le joueur : on enchaîne sur le bon choix selon la carte.
async function afterMomentum(c, result) {
  const match = m(), p = me();
  if (game.DIRECT_SUMMON_RULES[c.id]) {
    const opts = game.directSummonOptions(match, 0, c);
    modal(`<h2>${esc(c.displayName)}</h2><p>Choisis le catcheur à invoquer. S’il n’est pas dans ta main, il est pris dans ton deck. Ton invocation normale reste disponible.</p><div class="opts">${opts.map(o => { const t = card(o.cardId); return option(esc(t.displayName), `${t.rarity} · ${t.attack} ATT · ${t.endurance} END · depuis ${o.source === 'deck' ? 'le deck' : 'la main'}`, `data-act="directPick" data-mid="${c.id}" data-id="${o.cardId}"`); }).join('')}</div>${btn('Terminer sans invoquer', 'data-act="skipMomentum"', 'btn ghost')}`);
    return;
  }
  if ((c.id === 'momentum-20' || c.id === 'evo-09') && result.response) { done({ ok: true }, 'effect'); if (match.turn === 1) runAI(); return; }
  if (effects.isSimpleMomentum(c.id)) { done(await exec('simpleMomentum', c.id), 'effect'); return; }
  if (effects.SEARCH_RULES[c.id]) { searchModal(c.id, c.displayName); return; }
  if (c.id === 'wyatt-13') {
    const opts = activ.rassemblementOptions(match, 0), romanOn = fighters(p).some(f => combat.is(f.cardId, 'roman reigns'));
    if (!opts.length) { done(await exec('rassemblement', {}), 'effect'); return; }
    modal(`<h2>The Bloodline Rassemblement</h2><p>Tu peux invoquer Roman Reigns depuis ton deck (une seule fois dans la partie).</p><div class="opts">${opts.map(o => `<div class="opt row"><img src="${card(o.cardId).image}" alt=""><b>${esc(card(o.cardId).displayName)}</b>${o.positions.map(pos => btn(pos === 'active' ? 'Actif' : 'Passif', `data-act="rassemblement" data-id="${o.cardId}" data-pos="${pos}"`, 'btn small hot')).join('')}</div>`).join('')}</div>${romanOn ? btn('Ne pas invoquer', 'data-act="rassemblement"', 'btn ghost') : ''}`);
    return;
  }
  if (activ.TARGET_MOMENTA[c.id]) {
    S.targeting = { mode: 'effect', kind: 'momentum', key: c.id, iid: null, specs: activ.TARGET_MOMENTA[c.id].targets, picked: [], name: c.displayName };
    render();
    return;
  }
  if (activ.SUMMON_MOMENTA[c.id]) {
    const sm = activ.SUMMON_MOMENTA[c.id], opts = activ.summonCandidates(match, 0, sm.summon);
    const discard = sm.discard ? `<p>1. Choisis la carte à défausser :</p><div class="opts">${[...new Set(p.hand)].map((id, i) => `<label class="pick"><input type="radio" name="discard" data-discard value="${id}" ${i ? '' : 'checked'}><img src="${card(id).image}" alt=""><span>${esc(card(id).displayName)}</span></label>`).join('')}</div><p>2. Choisis le catcheur à invoquer :</p>` : `<p>Choisis le catcheur à invoquer depuis ${sm.summon.sources.includes('hand') ? 'ta main ou ton deck' : 'ton deck'} :</p>`;
    modal(`<h2>${esc(c.displayName)}</h2>${discard}<div class="opts">${opts.map(o => `<div class="opt row"><img src="${card(o.cardId).image}" alt=""><b>${esc(card(o.cardId).displayName)}</b>${o.positions.map(pos => btn(pos === 'active' ? 'Actif' : 'Passif', `data-act="summonMomentum" data-mid="${c.id}" data-id="${o.cardId}" data-pos="${pos}"`, 'btn small hot')).join('')}</div>`).join('')}</div>`);
    return;
  }
  if (c.id === 'momentum-24') {
    const ids = effects.shieldSummonOptions(match, 0);
    modal(`<h2>Triple Power Bombe</h2><p>Choisis jusqu’à deux membres du Shield dans ton deck et leur position.</p><div class="opts">${ids.map(id => `<label class="pick"><input type="checkbox" data-shield value="${id}"><img src="${card(id).image}" alt=""><span>${esc(card(id).displayName)} · ${card(id).rarity}</span><select data-shield-pos="${id}"><option value="active">Actif</option><option value="passive">Passif</option></select></label>`).join('')}</div>${btn('Invoquer', 'data-act="shieldConfirm"', 'btn hot')}`);
    return;
  }
  if (c.id === 'momentum-16') {
    const ids = [...new Set(p.grave.filter(id => card(id)?.category === 'Catcheur'))];
    const positions = game.legalPositions(p);
    modal(`<h2>Retour Inattendu</h2><p>Le catcheur revient avec son END imprimée complète. Choisis-le et sa position.</p><div class="opts">${ids.map(id => `<div class="opt row"><img src="${card(id).image}" alt=""><b>${esc(card(id).displayName)}</b>${positions.map(pos => btn(pos === 'active' ? 'Actif' : 'Passif', `data-act="revive" data-id="${id}" data-pos="${pos}"`, 'btn small hot')).join('')}</div>`).join('') || '<p>Aucune place libre sur le ring.</p>'}</div>${btn('Terminer sans catcheur', 'data-act="skipMomentum"', 'btn ghost')}`);
    return;
  }
  modal(`<div class="detail"><img src="${c.image}" alt=""><div><h2>${esc(c.displayName)}</h2><p class="muted">Cet effet se résout à la main : applique le texte ci-dessous (corrections ATT / END / PV disponibles en cliquant les cartes ou les barres de vie).</p>${c.effects.map(e => `<p>${esc(e.text)}</p>`).join('')}<div class="opts">${option('Effet appliqué', 'La carte part au cimetière', 'data-act="resolveManual"')}${option('Garder la carte active', 'Seulement si le texte le prévoit', 'data-act="resolveManual" data-keep="1"')}</div></div></div>`);
}

function searchModal(ruleKey, sourceName) {
  const rule = effects.SEARCH_RULES[ruleKey], opts = effects.searchOptions(m(), 0, ruleKey);
  modal(`<h2>${esc(sourceName)}</h2><p>Choisis ${esc(rule.what)} dans ton deck : la carte va dans ta main.</p><div class="opts">${opts.map(o => { const c = card(o.cardId); return `<button class="opt row" data-act="searchPick" data-rule="${ruleKey}" data-id="${o.cardId}" data-source="${esc(sourceName)}"><img src="${c.image}" alt=""><b>${esc(c.displayName)}</b><small>${c.category} · ${c.rarity} · ×${o.copies} dans le deck</small></button>`; }).join('') || '<p>Aucune carte correspondante dans ton deck.</p>'}</div>${rule.optional || !opts.length ? btn('Continuer sans carte', `data-act="searchPick" data-rule="${ruleKey}" data-source="${esc(sourceName)}"`, 'btn ghost') : ''}`);
}

async function resolvePlayerAttack() {
  if (S.online) { render(); return; } // en ligne, l'hôte résout ou attend la réponse adverse
  const match = m();
  S.busy = true;
  render();
  if (aiReact(match)) { banner('L’IA <b>annule l’attaque !</b>'); S.busy = false; done({ ok: true }, 'effect'); return; }
  await animateAttack(match.pendingAttack);
  if (match.pendingAttack) game.resolveAttack(match);
  S.busy = false;
  if (match.winner !== null) sfx(match.winner === 0 ? 'win' : 'lose');
  done({ ok: true }, 'hit');
}

export const actions = {
  // ----- navigation et réglages -----
  go: d => go(d.page),
  close: () => closeModal(),
  resume: () => { S.hideResult = false; go('duel'); },
  sound: (d, el) => { const on = toggleSound(); el.textContent = on ? '🔊' : '🔇'; el.classList.toggle('off', !on); sfx('tap'); },
  zoom: d => modal(`<img class="zoom" src="${card(d.id).image}" alt="">${btn('Fermer', 'data-act="close"', 'btn ghost')}`),
  viewCard: d => modal(cardDetail(card(d.id)), { wide: true }),
  filterType: (d, el) => { document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === el)); applyFilters(); },

  // ----- decks -----
  pickDeck: d => { S.chosenDeck = d.deck; render(); },
  // Consulter un deck sans le modifier (signature, perso ou deck de l'IA).
  viewDeck: d => { S.viewDeck = d.deck; try { sessionStorage.setItem('ring-control-view', d.deck); } catch { /* ignore */ } go('deck'); },
  editDeck: d => { S.deckId = d.id; go('decks'); },
  back: () => { if (history.state?.ringControl && history.length > 1) history.back(); else go('home'); },
  chooseDeck: d => { S.chosenDeck = d.deck; go('lobby'); },
  start: async () => {
    const deck = chosenDeck();
    if (!deck) { toast('Choisis un deck complet.'); return; }
    if (S.online) { toast('Quitte d’abord le mode en ligne.'); return; }
    if (S.match && S.match.winner === null && !confirm('Un duel est en cours. Le remplacer par un nouveau ?')) return;
    const aiDeck = AI_DECKS[Math.floor(Math.random() * AI_DECKS.length)];
    // Écran VERSUS : la carte maîtresse de chaque deck, puis le pile ou face.
    await showVersus({ cardId: deckStar(deck.cards, deck.star), player: 'TOI', deck: deck.name }, { cardId: deckStar(aiDeck.cards, aiDeck.star), player: 'L’IA', deck: aiDeck.name });
    coinToss(deck, aiDeck);
  },
  coinPick: d => {
    if (!S.pendingStart) return;
    const result = Math.random() < 0.5 ? 'face' : 'pile', won = result === d.side;
    const coin = document.querySelector('.coin');
    document.querySelectorAll('.coin-screen .btn').forEach(b => { b.disabled = true; });
    coin?.classList.add(result === 'face' ? 'spin-face' : 'spin-pile');
    sfx('coin');
    setTimeout(() => {
      const box = document.querySelector('.coin-screen');
      if (!box) return;
      box.insertAdjacentHTML('beforeend', `<p class="coin-result">${result.toUpperCase()} ! ${won ? 'Tu commences.' : 'L’IA commence.'}</p>${btn('ENTRER DANS L’ARÈNE ▶', `data-act="coinGo" data-first="${won ? 0 : 1}"`, 'btn hot big')}`);
      sfx(won ? 'cheer' : 'boo');
    }, 1700);
  },
  // ----- mode en ligne -----
  hostOnline: async d => {
    const deck = chosenDeck(), name = onlineName();
    if (!deck) { toast('Choisis d’abord un deck complet.'); return; }
    const session = net.savedSession();
    try {
      const me = { deck: deck.cards, name, deckName: deck.name, star: deckStar(deck.cards, deck.star) };
      await net.host(d.resume && session?.match ? { ...me, code: session.code, resume: session.match } : me);
    } catch (e) { toast(e.message); }
    render();
  },
  joinOnline: async d => {
    const deck = chosenDeck(), name = onlineName(), session = net.savedSession();
    const code = d.retry ? S.online?.code ?? session?.code : document.querySelector('[data-online-code]')?.value;
    if (!code || code.trim().length < 4) { toast('Tape le code de la salle.'); return; }
    if (!deck && !session?.deck) { toast('Choisis d’abord un deck complet.'); return; }
    const cards = deck?.cards ?? session.deck, deckName = deck?.name ?? session.deckName ?? 'Son deck';
    try { await net.join({ code, deck: cards, name, deckName, star: deckStar(cards, deck?.star ?? session?.star) }); } catch (e) { toast(e.message); }
  },
  leaveOnline: () => {
    if (!confirm('Quitter le mode en ligne ? (l’hôte peut reprendre la salle plus tard avec le même code)')) return;
    net.leave();
    go('lobby');
  },
  coinGo: d => { const { deck, aiDeck } = S.pendingStart ?? {}; if (!deck) return; closeModal(); newMatch(deck, aiDeck, Number(d.first)); },
  newDeck: () => { const d = { id: crypto.randomUUID(), name: `Deck ${S.decks.length + 1}`, cards: [] }; S.decks.push(d); S.deckId = d.id; persist(); render(); },
  duplicate: d => { const src = SIGNATURE_DECKS.find(x => x.id === d.id); const copy = { id: crypto.randomUUID(), name: `${src.name} — ma version`, cards: [...src.cards] }; S.decks.push(copy); S.deckId = copy.id; persist(); render(); toast('Deck dupliqué : tu peux le modifier.'); },
  openDeck: d => { S.deckId = d.id; render(); },
  deleteDeck: d => { const deck = S.decks.find(x => x.id === d.id); if (!deck || !confirm(`Supprimer « ${deck.name} » ?`)) return; S.decks = S.decks.filter(x => x.id !== d.id); if (S.deckId === d.id) S.deckId = S.decks[0]?.id ?? null; persist(); render(); },
  addCard: d => { const deck = S.decks.find(x => x.id === S.deckId); if (!deck || deck.cards.length >= DECK_MAX || deck.cards.filter(x => x === d.id).length >= COPIES_MAX) return; deck.cards.push(d.id); persist(); keepScroll(render); },
  removeCard: d => { const deck = S.decks.find(x => x.id === S.deckId); const at = deck?.cards.lastIndexOf(d.id) ?? -1; if (at < 0) return; deck.cards.splice(at, 1); persist(); keepScroll(render); },

  // ----- duel : sélection -----
  select: d => {
    if (S.targeting) return; // en mode visée, seules les cartes qui brillent réagissent
    const same = S.selected && S.selected.kind === d.kind && S.selected.id === d.id;
    S.selected = same ? null : { kind: d.kind, id: d.id, pi: Number(d.pi ?? 0) };
    sfx('tap');
    render();
  },
  pile: d => {
    const p = m().players[Number(d.pi)];
    if (d.zone === 'deck') {
      const tally = [...new Set(p.deck)].map(id => ({ c: card(id), n: p.deck.filter(x => x === id).length })).sort((a, b) => a.c.displayName.localeCompare(b.c.displayName, 'fr'));
      modal(`<h2>Ton deck · ${p.deck.length} cartes</h2><div class="list">${tally.map(x => `<div class="opt row"><img src="${x.c.image}" alt=""><b>${esc(x.c.displayName)}</b><small>${x.c.category} · ×${x.n}</small></div>`).join('')}</div>${btn('Fermer', 'data-act="close"', 'btn ghost')}`);
      return;
    }
    // Cartes qui ont un effet utilisable depuis le cimetière : image, texte et bouton « Activer ».
    const graveActs = Number(d.pi) === 0 ? ['wyatt-02:grave', 'wyatt-03:grave'].filter(key => p.grave.includes(key.split(':')[0])).map(key => {
      const id = key.split(':')[0], c = card(id), refused = activ.activationCheck(m(), 0, key, null);
      const text = c.effects[key.startsWith('wyatt-02') ? 1 : 0].text;
      return `<article class="grave-fx ${refused ? 'off' : 'on'}"><img src="${c.image}" alt=""><div><b>${esc(c.displayName)}</b><p>${esc(text)}</p>${refused ? `<small>✖ ${esc(refused)}</small>` : ''}</div>${btn(refused ? 'Indisponible' : 'Activer ▶', `data-act="graveEffect" data-key="${key}" ${refused ? 'disabled' : ''}`, 'btn hot')}</article>`;
    }).join('') : '';
    modal(`<h2>Cimetière · ${esc(p.name)}</h2>${graveActs ? `<h4 class="grave-title">EFFETS DEPUIS LE CIMETIÈRE</h4>${graveActs}` : ''}<h4 class="grave-title">TOUTES LES CARTES (${p.grave.length})</h4><div class="grid small">${p.grave.map(id => `<img src="${card(id).image}" alt="${esc(card(id).displayName)}" data-act="viewCard" data-id="${id}">`).join('') || '<p class="muted">Vide.</p>'}</div>${btn('Fermer', 'data-act="close"', 'btn ghost')}`, { wide: true });
  },
  log: () => modal(`<h2>Journal du match</h2><div class="log">${m().history.slice(0, 60).map(x => `<p>${esc(x)}</p>`).join('')}</div>${btn('Fermer', 'data-act="close"', 'btn ghost')}`),
  quit: () => { if (confirm('Quitter le duel ? Il reste sauvegardé et tu pourras le reprendre.')) go('home'); },
  dismissResult: () => { S.hideResult = true; render(); },

  // ----- duel : main -----
  summon: async d => done(await exec('normalSummon', d.id, [], d.pos), 'summon'),
  summonSSR: d => {
    const p = me(), c = card(d.id);
    const pool = fighters(p).map(f => ({ f, c: card(f.cardId) })).filter(x => ['R', 'SR', 'SSR'].includes(x.c.rarity));
    modal(`<h2>Invoquer ${esc(c.displayName)}</h2><p>Sacrifie <b>1 SR</b>, <b>1 SSR</b> ou <b>2 R</b> de ton ring.</p><div class="opts">${pool.map(x => `<label class="pick"><input type="checkbox" data-sac value="${x.f.instanceId}"><img src="${x.c.image}" alt=""><span>${esc(x.c.displayName)} · ${x.c.rarity}</span></label>`).join('')}</div><p>Position :</p><div class="row">${btn('Actif', `data-act="commitSSR" data-id="${d.id}" data-pos="active"`, 'btn hot')}${btn('Passif', `data-act="commitSSR" data-id="${d.id}" data-pos="passive"`, 'btn')}</div>`);
  },
  commitSSR: async d => done(await exec('normalSummon', d.id, [...document.querySelectorAll('[data-sac]:checked')].map(x => x.value), d.pos), 'summon'),
  playManager: async d => done(await exec('playManager', d.id), 'summon'),
  equip: async d => done(await exec('equip', d.id, d.iid), 'effect'),
  momentum: async d => {
    const c = card(d.id), result = await exec('playMomentum', d.id);
    if (!result.ok) { toast(result.reason); return; }
    sfx('effect');
    S.selected = null;
    persist();
    render();
    afterMomentum(c, result);
  },
  directPick: d => {
    const opt = game.directSummonOptions(m(), 0, card(d.mid)).find(o => o.cardId === d.id);
    if (!opt) { toast('Ce catcheur n’est plus disponible.'); return; }
    modal(`<h2>${esc(card(d.id).displayName)}</h2><p>Choisis sa position.</p><div class="opts">${positionOptions(`data-act="directPlace" data-mid="${d.mid}" data-id="${d.id}"`, opt.positions)}</div>`);
  },
  directPlace: async d => done(await exec('directSummon', d.mid, d.id, d.pos), 'summon'),
  skipMomentum: async () => done(await exec('resolveMomentum', {})),
  resolveManual: async d => done(await exec('resolveMomentum', { keepActive: Boolean(d.keep) }), 'effect'),
  searchPick: async d => done(await exec('resolveSearch', d.rule, d.id ?? null, d.source), 'effect'),
  shieldConfirm: async () => {
    const placements = [...document.querySelectorAll('[data-shield]:checked')].map(x => ({ cardId: x.value, position: document.querySelector(`[data-shield-pos="${x.value}"]`).value }));
    done(await exec('shieldSummon', placements), 'summon');
  },
  revive: async d => done(await exec('revive', d.id, d.pos), 'summon'),

  // ----- duel : catcheurs et managers -----
  move: async d => done(await exec('move', d.iid, d.dest)),
  swap: async d => done(await exec('swap', d.a, d.b)),
  toggleEffects: () => { S.effectsOpen = !S.effectsOpen; try { localStorage.setItem('ring-control-effects', S.effectsOpen ? 'open' : 'closed'); } catch { /* ignore */ } render(); },
  passive: async d => {
    const f = fighters(me()).find(x => x.instanceId === d.iid), key = `${f.cardId}:passive`;
    if (effects.SEARCH_RULES[key] && !effects.searchOptions(m(), 0, key).length) { toast(`Aucune carte « ${effects.SEARCH_RULES[key].what} » dans ton deck.`); return; }
    const r = await exec('wrestlerEffect', d.iid, 'passive');
    if (!r.ok) { toast(r.reason); return; }
    persist();
    if (effects.SEARCH_RULES[key]) { searchModal(key, card(f.cardId).displayName); return; }
    done(r, 'effect');
  },
  special: async d => {
    const f = fighters(me()).find(x => x.instanceId === d.iid), key = `${f.cardId}:special`;
    if (effects.SEARCH_RULES[key] && !effects.searchOptions(m(), 0, key).length) { toast(`Aucune carte « ${effects.SEARCH_RULES[key].what} » dans ton deck.`); return; }
    const r = await exec('wrestlerEffect', d.iid, 'special');
    if (!r.ok) { toast(r.reason); return; }
    persist();
    if (effects.SEARCH_RULES[key]) { searchModal(key, card(f.cardId).displayName); return; }
    done(r, 'effect');
  },
  managerEffect: async () => {
    if (me().manager?.cardId === 'managers-04') {
      const groups = effects.teddyLongOptions(m(), 0), positions = game.legalPositions(me());
      modal(`<h2>Teddy Long</h2><p>Coche deux catcheurs de la <b>même faction</b> dans ta main et choisis leur position.</p><div class="opts">${groups.flatMap(g => g.cardIds.map(id => `<label class="pick"><input type="checkbox" data-teddy value="${id}"><img src="${card(id).image}" alt=""><span>${esc(card(id).displayName)} · ${esc(g.faction)}</span><select data-teddy-pos="${id}">${positions.map(p => `<option value="${p}">${p === 'active' ? 'Actif' : 'Passif'}</option>`).join('')}</select></label>`)).join('')}</div>${btn('Invoquer', 'data-act="teddyConfirm"', 'btn hot')}`);
      return;
    }
    done(await exec('managerEffect', {}), 'effect');
  },
  // Eric Bischoff : marquer un actif adverse (on vise sur le ring) ou chercher une carte nWo.
  bischoffMark: () => {
    const refused = effects.bischoffCheck(m(), 0, 'mark');
    if (refused) { toast(refused); return; }
    S.targeting = { mode: 'effect', kind: 'manager', key: 'nwo-06', iid: null, specs: [{ side: 'opp', zone: 'active', filter: (s, pi, t) => !t.nwoMark }], picked: [], name: 'Eric Bischoff' };
    S.selected = null;
    render();
  },
  bischoffSearch: () => {
    const opts = effects.searchOptions(m(), 0, 'nwo-06');
    modal(`<h2>Eric Bischoff</h2><p>Choisis une carte nWo dans ton deck : elle va dans ta main.</p><div class="opts">${opts.map(o => { const c = card(o.cardId); return `<button class="opt row" data-act="bischoffPick" data-id="${o.cardId}"><img src="${c.image}" alt=""><b>${esc(c.displayName)}</b><small>${c.category} · ${c.rarity} · ×${o.copies} dans le deck</small></button>`; }).join('') || '<p>Aucune carte nWo dans ton deck.</p>'}</div>${btn('Annuler', 'data-act="close"', 'btn ghost')}`);
  },
  // The Authority (manager) : les deux Décrets.
  authorityPassive: () => {
    const refused = effects.authorityCheck(m(), 0, 'passive');
    if (refused) { toast(refused); return; }
    S.targeting = { mode: 'effect', kind: 'manager', managerMode: 'passive', key: 'auth-06', iid: null, specs: [{ side: 'opp', zone: 'active', filter: (s, pi, t) => combat.canSendToPassive(s, 1 - pi, t) }], picked: [], name: 'Décret de l’Authority' };
    S.selected = null;
    render();
  },
  authorityNoSsr: async () => done(await exec('managerEffect', { mode: 'nossr' }), 'effect'),
  cashIn: async d => done(await exec('cashIn', d.iid), 'effect'),
  bischoffPick: async d => done(await exec('managerEffect', { mode: 'search', cardId: d.id }), 'effect'),
  teddyConfirm: async () => {
    const ids = [...document.querySelectorAll('[data-teddy]:checked')].map(x => x.value);
    done(await exec('managerEffect', { cardIds: ids, positions: ids.map(id => document.querySelector(`[data-teddy-pos="${id}"]`).value) }), 'summon');
  },

  // Effets à activer (catcheur ou cimetière) : cibles sur le ring, ou catcheur à invoquer.
  activate: async d => {
    const e = activ.ACTIVATED[d.key], f = d.iid ? fighters(me()).find(x => x.instanceId === d.iid) : null;
    const refused = activ.activationCheck(m(), 0, d.key, f);
    if (refused) { toast(refused); return; }
    closeModal();
    if (e.targets) { S.targeting = { mode: 'effect', kind: 'activate', key: d.key, iid: d.iid || null, specs: e.targets, picked: [], name: e.name }; S.selected = null; render(); return; }
    if (e.summon) {
      const opts = activ.summonCandidates(m(), 0, e.summon, { leaving: e.leaves ? f : null });
      modal(`<h2>${esc(e.name)}</h2><p>Choisis le catcheur à invoquer et sa position.</p><div class="opts">${opts.map(o => `<div class="opt row"><img src="${card(o.cardId).image}" alt=""><b>${esc(card(o.cardId).displayName)}</b>${o.positions.map(pos => btn(pos === 'active' ? 'Actif' : 'Passif', `data-act="activateSummon" data-key="${d.key}" data-iid="${d.iid ?? ''}" data-id="${o.cardId}" data-pos="${pos}"`, 'btn small hot')).join('')}</div>`).join('')}</div>${btn('Annuler', 'data-act="close"', 'btn ghost')}`);
      return;
    }
    done(await exec('activate', d.key, d.iid || null, {}), 'effect');
  },
  activateSummon: async d => done(await exec('activate', d.key, d.iid || null, { cardId: d.id, position: d.pos }), 'summon'),
  graveEffect: d => actions.activate({ key: d.key }),
  choicePick: async d => done(await exec('resolveChoice', d.choice, d.id || null), d.id ? 'effect' : 'tap'),
  rassemblement: async d => done(await exec('rassemblement', d.id ? { cardId: d.id, position: d.pos } : {}), 'summon'),
  summonMomentum: async d => {
    const discard = document.querySelector('[data-discard]:checked')?.value ?? null;
    done(await exec('summonMomentum', d.mid, { discard, summonId: d.id, position: d.pos }), 'summon');
  },
  react: async d => {
    if (done(await exec('useReaction', d.key, d.iid || null), 'effect')) runAI();
  },
  adjust: async d => done(await exec('adjust', Number(d.pi), d.iid, d.stat, Number(d.delta))),
  hp: d => { const p = m().players[Number(d.pi)]; modal(`<h2>PV · ${esc(p.name)}</h2><p>Correction manuelle, pour appliquer un effet imprimé.</p><div class="row">${[-50, -10, 10, 50].map(n => btn(`${n > 0 ? '+' : ''}${n} PV`, `data-act="hpAdjust" data-pi="${d.pi}" data-delta="${n}"`, 'btn')).join('')}</div>`); },
  hpAdjust: async d => done(await exec('hpAdjust', Number(d.pi), Number(d.delta))),

  // ----- duel : combat -----
  toAttacks: async () => { const r = await exec('toAttacks'); if (r?.ok === false) { toast(r.reason); return; } S.selected = null; sfx('phase'); persist(); render(); },
  attack: d => {
    const t = { mode: 'attack', iid: d.iid, special: d.special || null, ladder: Boolean(d.ladder), picked: [] };
    S.selected = null;
    sfx('tap');
    // Go to Sleep : choisir le Momentum sacrifié avant la cible.
    if (combat.ATTACK_SPECIALS[t.special]?.cost === 'momentum' && !d.discard) {
      const ids = [...new Set(me().hand.filter(id => card(id)?.category === 'Momentum'))];
      modal(`<h2>Go to Sleep</h2><p>Sacrifie une carte Momentum de ta main.</p><div class="opts">${ids.map(id => `<button class="opt row" data-act="attack" data-iid="${d.iid}" data-special="${t.special}" data-discard="${id}"><img src="${card(id).image}" alt=""><b>${esc(card(id).displayName)}</b></button>`).join('')}</div>${btn('Annuler', 'data-act="close"', 'btn ghost')}`);
      return;
    }
    t.discard = d.discard || null;
    closeModal();
    S.targeting = t;
    render();
  },
  cancelTarget: () => { S.targeting = null; render(); },
  // Attaque en meute : on choisit d'abord le(s) partenaire(s), puis la cible.
  pack: d => {
    S.targeting = { mode: 'attack', iid: d.iid, special: d.special || null, ladder: false, picked: [], pack: [], packing: true };
    S.selected = null;
    sfx('tap');
    render();
  },
  packGo: () => { if (S.targeting?.pack?.length) { S.targeting.packing = false; render(); } },
  target: async d => {
    const t = S.targeting;
    if (!t || S.busy) return;
    if (d.target === 'direct') { launchAttack('direct'); return; }
    const pi = Number(d.pi ?? 1);
    if (!pickable(m()).has(d.target)) return;
    if (t.packing) {
      t.pack.push(d.target);
      sfx('tap');
      const f = me().active.find(x => x.instanceId === t.iid);
      if (t.pack.length >= combat.packMax(m(), 0) || !f || combat.packPartners(m(), 0, f).every(x => t.pack.includes(x.instanceId))) t.packing = false;
      render();
      return;
    }
    t.picked.push({ pi, instanceId: d.target });
    sfx('tap');
    if (t.picked.length < needed(m(), t)) { render(); return; }
    if (t.mode === 'attack') { launchAttack(t.picked[0].instanceId); return; }
    S.targeting = null;
    const r = t.kind === 'mark'
      ? await exec('resolveChoice', t.choiceId, t.picked[0].instanceId)
      : t.kind === 'activate'
      ? await exec('activate', t.key, t.iid, { targets: t.picked })
      : t.kind === 'manager'
        ? await exec('managerEffect', { mode: t.managerMode ?? 'mark', targets: t.picked.map(x => ({ instanceId: x.instanceId })) })
        : await exec('targetMomentum', t.key, t.picked);
    done(r, 'effect');
  },
  launch: () => launchAttack(S.targeting?.picked[0]?.instanceId ?? 'multi'),
  endTurn: async () => {
    const r = await exec('endTurn');
    if (!r.ok) { toast(r.reason); return; }
    S.selected = null;
    sfx('phase');
    banner(`<b>TOUR DE ${esc(m().players[1].name.toUpperCase())}</b>`);
    persist();
    render();
    runAI();
  },
  letPass: async () => {
    if (S.busy) return;
    S.busy = true;
    await animateAttack(m().pendingAttack);
    if (m().pendingAttack) await exec('resolveAttack');
    S.busy = false;
    if (m().winner !== null) sfx(m().winner === 0 ? 'win' : 'lose');
    done({ ok: true }, 'hit');
    runAI();
  },
};

async function launchAttack(target) {
  const t = S.targeting;
  if (!t) return;
  S.targeting = null;
  if (m().phase === 'actions') sfx('phase'); // attaque spéciale lancée depuis la phase Actions
  const ids = t.picked.map(x => x.instanceId);
  const r = await exec('declareAttack', t.iid, target, { special: t.special, ladder: t.ladder, discard: t.discard, targets: ids, secondTarget: t.special === 'catcheur-08' ? ids[1] : null, ...(t.pack?.length ? { pack: t.pack } : {}) });
  if (!r.ok) { toast(r.reason); render(); return; }
  resolvePlayerAttack();
}

// Garde la position de défilement de la liste de cartes après un réaffichage.
function keepScroll(fn) {
  const pool = document.querySelector('.pool'), list = document.querySelector('.deck-list');
  const top = [window.scrollY, pool?.scrollTop, list?.scrollTop];
  const text = document.querySelector('[data-filter="text"]')?.value, type = document.querySelector('.chip.on')?.dataset.type;
  fn();
  window.scrollTo(0, top[0]);
  if (pool) document.querySelector('.pool').scrollTop = top[1];
  if (list) document.querySelector('.deck-list').scrollTop = top[2];
  const input = document.querySelector('[data-filter="text"]');
  if (input && text) input.value = text;
  if (type) document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.type === type));
  applyFilters();
}
