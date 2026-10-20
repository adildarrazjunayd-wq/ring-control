// Écran de duel « Arcade Titantron » : barres de vie, écran géant, plateau, main.
import { normalSummonRequirement } from '../engine/rules.js';
import * as effects from '../engine/card-effects.js';
import { S, card, esc, game, CARD_BACK, KIND_LABEL } from './core.js';
import { cardFacts } from './screens.js';

const fightersOf = p => [...p.active, ...p.passive];
const myTurn = m => m.turn === 0 && m.winner === null;
const hasEffect = (c, kind) => c.effects?.some(e => e.kind === kind);
const act = (label, attrs, sub = '', cls = '') => ({ label, attrs, sub, cls });

// ---------- Actions légales selon la carte choisie ----------

export function handActions(m, id) {
  const c = card(id), p = m.players[0], acting = myTurn(m) && m.phase === 'actions', out = [];
  if (!c || !p.hand.includes(id)) return out;
  if (c.category === 'Catcheur' && acting && !p.limits.normal && normalSummonRequirement(c).allowed) {
    const positions = game.legalPositions(p);
    if (c.rarity === 'SSR' && !p.status.freeSsrSummon) {
      const board = fightersOf(p).map(f => card(f.cardId)?.rarity);
      const canSac = board.includes('SR') || board.filter(r => r === 'R').length >= 2;
      out.push(act('Invoquer avec sacrifice', `data-act="summonSSR" data-id="${id}" ${canSac ? '' : 'disabled'}`, canSac ? 'Sacrifie 1 SR ou 2 R' : 'Il faut un SR ou deux R sur ton ring', 'hot'));
    } else {
      const free = c.rarity === 'SSR' ? ' · sans sacrifice (McMahon)' : '';
      for (const pos of positions) out.push(act(pos === 'active' ? 'Invoquer en actif' : 'Invoquer en passif', `data-act="summon" data-id="${id}" data-pos="${pos}"`, (pos === 'active' ? 'Peut attaquer' : 'Protégé, n’attaque pas') + free, pos === 'active' ? 'hot' : ''));
      if (!positions.length) out.push(act('Ring complet', 'disabled', '5 catcheurs maximum'));
    }
  }
  if (c.category === 'Manager' && acting && !p.limits.manager && !p.manager) out.push(act('Jouer le manager', `data-act="playManager" data-id="${id}"`, 'Occupe ton emplacement Manager', 'hot'));
  if (c.category === 'Objet' && acting && !p.limits.object) {
    for (const f of fightersOf(p)) out.push(act(`Équiper à ${esc(card(f.cardId).displayName)}`, `data-act="equip" data-id="${id}" data-iid="${f.instanceId}"`, `${f.attack} ATT · ${f.endurance} END`));
  }
  if (c.category === 'Momentum') {
    const reaction = m.pendingAttack?.playerIndex === 1 && c.rapid && m.outOfTurnMomentumUsed[0] < 1;
    const own = acting && !c.rapid && p.limits.momentum < 1;
    if (own || reaction) {
      const blocked = p.status.noMomentumThroughTurn >= m.turnNumber ? { ok: false, reason: 'Un effet t’empêche de jouer un Momentum ce tour.' } : momentumCheck(m, c);
      out.push(act(c.rapid ? 'Jouer en réponse ⚡' : 'Jouer le Momentum', `data-act="momentum" data-id="${id}" ${blocked.ok ? '' : 'disabled'}`, blocked.ok ? (c.rapid ? 'Réponse à l’attaque annoncée' : 'Un Momentum par tour') : blocked.reason, 'hot'));
    } else if (c.rapid && acting) out.push(act('Momentum rapide ⚡', 'disabled', 'Se joue quand l’IA annonce une attaque'));
  }
  return out;
}

function momentumCheck(m, c) {
  const req = effects.momentumRequirement(m, 0, c);
  if (!req.ok) return req;
  if (game.DIRECT_SUMMON_RULES[c.id] && !game.directSummonOptions(m, 0, c).length) return { ok: false, reason: 'Aucun catcheur éligible ou plus de place sur le ring.' };
  return { ok: true };
}

function fighterActions(m, pi, f) {
  const p = m.players[pi], c = card(f.cardId), out = [];
  if (pi === 0 && myTurn(m) && m.phase === 'attacks' && f.position === 'active' && !m.usedAttackers.includes(f.instanceId) && !m.attackLock && !(p.status.noAttackThroughTurn >= m.turnNumber)) {
    const d = m.players[1], direct = Math.max(0, p.active.length - d.active.length) > m.directAttacksUsed;
    if (direct || d.active.some(x => !m.usedTargets.includes(x.instanceId))) out.push(act('Attaquer !', `data-act="attack" data-iid="${f.instanceId}"`, `${f.attack} ATT · choisis ta cible sur le ring`, 'hot'));
  }
  if (pi === 0 && myTurn(m) && m.phase === 'actions') {
    if (!p.limits.move) {
      if (f.position === 'active' && p.active.length > 1 && p.passive.length < 2) out.push(act('Passer en passif', `data-act="move" data-iid="${f.instanceId}" data-dest="passive"`, 'Un déplacement par tour'));
      if (f.position === 'passive' && p.active.length < 3) out.push(act('Passer en actif', `data-act="move" data-iid="${f.instanceId}" data-dest="active"`, 'Un déplacement par tour'));
    }
    if (hasEffect(c, 'passif')) {
      const used = f.passiveUsedTurn === m.turnNumber;
      out.push(act('Activer l’effet passif', `data-act="passive" data-iid="${f.instanceId}" ${used ? 'disabled' : ''}`, used ? 'Déjà activé ce tour' : 'Une fois par tour'));
    }
    if (f.position === 'active' && hasEffect(c, 'spécial') && c.id !== 'wyatt-11') {
      out.push(act('Activer l’effet spécial', `data-act="special" data-iid="${f.instanceId}" ${f.specialUsed ? 'disabled' : ''}`, f.specialUsed ? 'Déjà utilisé' : 'Une fois tant qu’il reste sur le ring'));
    }
  }
  return out;
}

function managerActions(m, pi) {
  const p = m.players[pi];
  if (pi !== 0 || !p.manager || p.manager.used || m.winner !== null) return [];
  return [act('Activer l’effet du manager', 'data-act="managerEffect"', 'Une fois pendant sa présence', 'hot')];
}

const corrections = (pi, f) => `<details class="manual"><summary>Correction manuelle</summary><div>${[['attack', 'ATT'], ['endurance', 'END']].flatMap(([stat, label]) => [-5, 5].map(d => `<button class="btn small ghost" data-act="adjust" data-pi="${pi}" data-iid="${f.instanceId}" data-stat="${stat}" data-delta="${d}">${label} ${d > 0 ? '+' : ''}${d}</button>`)).join('')}</div></details>`;

// ---------- Titantron ----------

function selectedCard(m) {
  const sel = S.selected;
  if (!sel) return null;
  if (sel.kind === 'hand') return m.players[0].hand.includes(sel.id) ? { id: sel.id, actions: handActions(m, sel.id) } : null;
  if (sel.kind === 'fighter') {
    const f = fightersOf(m.players[sel.pi]).find(x => x.instanceId === sel.id);
    return f ? { id: f.cardId, fighter: f, pi: sel.pi, actions: fighterActions(m, sel.pi, f) } : null;
  }
  if (sel.kind === 'manager') { const mg = m.players[sel.pi].manager; return mg ? { id: mg.cardId, actions: managerActions(m, sel.pi) } : null; }
  return { id: sel.id, actions: [] };
}

function statusScreen(m) {
  if (m.winner !== null) return { kicker: 'FIN DU MATCH', title: m.winner === 0 ? 'VICTOIRE !' : 'DÉFAITE', text: esc(m.history[0]) };
  if (m.pendingAttack?.playerIndex === 1) return { kicker: '⚡ FENÊTRE DE RÉPONSE', title: 'L’IA ATTAQUE !', text: 'Réponds avec un Momentum rapide ou laisse passer l’attaque.' };
  if (m.turn === 1) return { kicker: `TOUR ${m.turnNumber}`, title: 'L’IA JOUE…', text: esc(m.history[0]) };
  if (m.phase === 'attacks') return { kicker: `TOUR ${m.turnNumber} · COMBAT`, title: 'À L’ATTAQUE !', text: 'Clique sur un de tes catcheurs actifs, puis sur sa cible.' };
  return { kicker: `TOUR ${m.turnNumber} · ACTIONS`, title: 'À TOI DE JOUER', text: 'Les cartes jouables brillent dans ta main. Survole une carte pour la lire, clique pour agir.' };
}

function titantron(m) {
  if (S.targeting) {
    const p = m.players[0], f = p.active.find(x => x.instanceId === S.targeting);
    if (f) {
      const d = m.players[1], direct = Math.max(0, p.active.length - d.active.length) > m.directAttacksUsed;
      return `<div class="tron targeting"><img src="/${card(f.cardId).image}" alt=""><div class="tron-body"><span class="k">COMBAT · ${f.attack} ATT</span><h2>CHOISIS LA CIBLE</h2><p>Clique sur un catcheur actif de l’IA qui brille.${direct ? ' Ou frappe directement ses PV.' : ''}</p><div class="tron-actions">${direct ? `<button class="btn hot" data-act="target" data-target="direct">Attaque directe ▶</button>` : ''}<button class="btn ghost" data-act="cancelTarget">Annuler</button></div></div></div>`;
    }
  }
  const sel = selectedCard(m), id = sel?.id ?? S.hovered, c = id && card(id);
  if (!c) {
    const s = statusScreen(m);
    return `<div class="tron idle"><div class="tron-body"><span class="k">${s.kicker}</span><h2>${s.title}</h2><p>${s.text}</p></div></div>`;
  }
  const f = sel?.fighter, stats = f ? `<div class="live-stats"><span>${f.attack} <small>ATT</small></span><span class="${f.endurance < f.baseEndurance ? 'hurt' : ''}">${f.endurance}<small>/${f.baseEndurance} END</small></span></div>` : '';
  const actions = (sel?.actions ?? []).map(a => `<button class="btn ${a.cls}" ${a.attrs}><b>${a.label}</b>${a.sub ? `<small>${a.sub}</small>` : ''}</button>`).join('');
  return `<div class="tron ${sel ? 'pinned' : ''}"><img src="/${c.image}" alt="${esc(c.displayName)}" data-act="zoom" data-id="${c.id}"><div class="tron-body"><div class="facts">${cardFacts(c)}</div><h2>${esc(c.displayName)}</h2>${stats}<div class="tron-effects">${c.effects.map(e => `<p><b>${KIND_LABEL[e.kind]} :</b> ${esc(e.text)}</p>`).join('') || '<p class="muted">Aucun effet imprimé.</p>'}</div>${sel ? `<div class="tron-actions">${actions || '<p class="hint">Aucune action possible avec cette carte pour l’instant.</p>'}${f ? corrections(sel.pi, f) : ''}</div>` : '<p class="hint">Clique la carte pour voir ses actions.</p>'}</div></div>`;
}

// ---------- Plateau ----------

function life(m, pi) {
  const p = m.players[pi], pct = Math.max(0, Math.min(100, p.hp / 5));
  return `<div class="life ${pi ? 'ai' : 'me'}">
    <div class="who"><b>${pi ? 'L’IA' : 'VOUS'}</b><small>${m.turn === pi && m.winner === null ? '● À SON TOUR' : ''}</small></div>
    <button class="gauge" data-act="hp" data-pi="${pi}" data-hp="${pi}" title="Points de vie"><i style="width:${pct}%"></i></button>
    <div class="pv">${p.hp}<small>PV</small></div>
    <div class="chips"><span>MAIN <b>${p.hand.length}</b></span><span>DECK <b>${p.deck.length}</b></span><span>MOMENTUM <b>${m.turn === pi ? `${Math.max(0, p.limits.momentum)}/1` : '—'}</b></span></div>
  </div>`;
}

function fighterCard(m, pi, f) {
  const c = card(f.cardId), sel = S.selected?.kind === 'fighter' && S.selected.id === f.instanceId;
  const targetable = S.targeting && pi === 1 && f.position === 'active' && !m.usedTargets.includes(f.instanceId);
  const spent = m.turn === pi && m.usedAttackers.includes(f.instanceId);
  const objects = m.players[pi].objects.filter(o => o.fighterId === f.instanceId);
  const cls = [sel && 'sel', targetable && 'target', spent && 'spent', f.endurance < f.baseEndurance && 'hurt', m.pendingAttack?.targetId === f.instanceId && 'aimed', m.pendingAttack?.attackerId === f.instanceId && 'attacking'].filter(Boolean).join(' ');
  return `<button class="fcard ${cls}" data-act="${targetable ? 'target' : 'select'}" data-kind="fighter" data-pi="${pi}" data-id="${f.instanceId}" data-target="${f.instanceId}" data-fighter="${pi}:${f.instanceId}" data-preview="${c.id}" aria-label="${esc(c.displayName)} ${f.attack} ATT ${f.endurance} END"><img src="/${c.image}" alt=""><span class="pill"><b class="at">${f.attack}<i> ATT</i></b><b class="en">${f.endurance}<i> END</i></b></span>${objects.length ? `<span class="equip" title="${objects.map(o => esc(card(o.cardId).displayName)).join(', ')}">⚙ ${objects.length}</span>` : ''}</button>`;
}

function zone(m, pi, kind) {
  const list = m.players[pi][kind], count = kind === 'active' ? 3 : 2;
  const slots = Array.from({ length: count }, (_, i) => list[i] ? fighterCard(m, pi, list[i]) : `<div class="slot">${kind === 'active' ? 'ACTIF' : 'PASSIF'}</div>`).join('');
  return `<div class="zone ${kind}"><div class="zt">${kind === 'active' ? 'ACTIFS' : 'PASSIFS'} ${list.length}/${count}</div><div class="slots">${slots}</div></div>`;
}

function support(m, pi) {
  const p = m.players[pi];
  const mg = p.manager ? `<button class="mini ${S.selected?.kind === 'manager' && S.selected.pi === pi ? 'sel' : ''} ${p.manager.used ? 'spent' : ''}" data-act="select" data-kind="manager" data-pi="${pi}" data-id="${p.manager.cardId}" data-preview="${p.manager.cardId}"><img src="/${card(p.manager.cardId).image}" alt=""></button>` : '<div class="mini empty">—</div>';
  const objects = p.objects.map(o => `<button class="mini obj" data-act="select" data-kind="card" data-pi="${pi}" data-id="${o.cardId}" data-preview="${o.cardId}"><img src="/${card(o.cardId).image}" alt=""></button>`).join('');
  const momenta = [...p.ongoingMomentum, ...(p.resolvingMomentum ? [p.resolvingMomentum] : [])].map(o => `<button class="mini mom" data-act="select" data-kind="card" data-pi="${pi}" data-id="${o.cardId}" data-preview="${o.cardId}"><img src="/${card(o.cardId).image}" alt=""></button>`).join('');
  return `<div class="support"><div class="zt">MANAGER</div>${mg}${objects ? `<div class="zt">OBJETS</div><div class="minis">${objects}</div>` : ''}${momenta ? `<div class="zt">MOMENTUM</div><div class="minis">${momenta}</div>` : ''}</div>`;
}

function piles(m, pi) {
  const p = m.players[pi], top = p.grave.at(-1);
  return `<div class="piles"><button class="pile deck" data-act="pile" data-pi="${pi}" data-zone="deck" ${pi ? 'disabled' : ''}><img src="/${CARD_BACK}" alt=""><b>${p.deck.length}</b><small>DECK</small></button><button class="pile grave" data-act="pile" data-pi="${pi}" data-zone="grave">${top ? `<img src="/${card(top).image}" alt="">` : '<span class="void"></span>'}<b>${p.grave.length}</b><small>CIMETIÈRE</small></button></div>`;
}

const side = (m, pi) => `<div class="side ${pi ? 'ai' : 'me'}">${piles(m, pi)}${zone(m, pi, 'active')}${zone(m, pi, 'passive')}${support(m, pi)}</div>`;

function reaction(m) {
  const a = m.pendingAttack;
  if (!a || a.playerIndex !== 1) return '';
  const p = m.players[0], attacker = m.players[1].active.find(f => f.instanceId === a.attackerId);
  const target = a.targetId === 'direct' ? 'TES PV' : esc(card(p.active.find(f => f.instanceId === a.targetId)?.cardId)?.displayName);
  const canMomentum = m.outOfTurnMomentumUsed[0] < 1 && !(p.status.noMomentumThroughTurn >= m.turnNumber);
  const rapid = canMomentum ? [...new Set(p.hand)].map(card).filter(c => c?.category === 'Momentum' && c.rapid && momentumCheck(m, c).ok) : [];
  const roman = a.targetId !== 'direct' && /roman reigns/i.test(card(p.active.find(f => f.instanceId === a.targetId)?.cardId)?.displayName ?? '');
  const sami = roman ? p.active.find(f => f.cardId === 'wyatt-11' && !f.specialUsed) : null;
  return `<div class="reaction"><div class="r-head">⚡ ${esc(card(attacker?.cardId)?.displayName)} <small>${a.attack} ATT</small> ➜ ${target}</div><div class="r-actions">${rapid.map(c => `<button class="btn hot" data-act="momentum" data-id="${c.id}" data-preview="${c.id}"><b>${esc(c.displayName)}</b><small>Momentum rapide</small></button>`).join('')}${sami ? `<button class="btn hot" data-act="sami" data-iid="${sami.instanceId}"><b>Sami Zayn protège Roman</b><small>Effet spécial : annule l’attaque</small></button>` : ''}<button class="btn" data-act="letPass"><b>Laisser passer</b><small>${a.targetId === 'direct' ? `-${a.attack} PV` : `-${a.attack} END`}</small></button></div></div>`;
}

function hand(m) {
  const p = m.players[0], n = p.hand.length;
  const cards = p.hand.map((id, i) => {
    const c = card(id), off = i - (n - 1) / 2, sel = S.selected?.kind === 'hand' && S.selected.id === id;
    const playable = handActions(m, id).some(a => !a.attrs.includes('disabled'));
    return `<button class="hcard ${sel ? 'sel' : ''} ${playable ? 'can' : ''}" style="--r:${off * Math.min(5, 40 / n)}deg;--y:${Math.abs(off) ** 2 * Math.min(4, 30 / n)}px;--i:${i}" data-act="select" data-kind="hand" data-id="${id}" data-preview="${id}" title="${esc(c.displayName)}"><img src="/${c.image}" alt="${esc(c.displayName)}">${c.rapid ? '<i class="bolt">⚡</i>' : ''}</button>`;
  }).join('');
  return `<div class="hand">${cards || '<p class="muted">Main vide</p>'}</div>`;
}

function controls(m) {
  if (m.winner !== null) return '<div class="controls"><button class="btn hot big" data-act="go" data-page="lobby">REJOUER ▶</button></div>';
  if (m.turn === 1) return '<div class="controls"><button class="btn big" disabled>L’IA JOUE…</button></div>';
  if (m.pendingAttack) return '<div class="controls"></div>';
  return `<div class="controls">${m.phase === 'actions' ? '<button class="btn hot big" data-act="toAttacks">COMBAT ▶</button>' : '<button class="btn hot big" data-act="endTurn">FIN DU TOUR ▶</button>'}</div>`;
}

function phases(m) {
  const cur = m.winner !== null ? 'fin' : m.turn === 1 ? 'ia' : m.phase === 'actions' ? 'actions' : 'combat';
  return `<div class="phases">${[['actions', 'ACTIONS'], ['combat', 'COMBAT'], ['ia', 'TOUR IA']].map(([k, l]) => `<span class="${cur === k ? 'on' : ''}">${l}</span>`).join('')}</div>`;
}

function result(m) {
  if (m.winner === null) return '';
  const win = m.winner === 0;
  return `<div class="result ${win ? 'win' : 'lose'}"><div><h1>${win ? 'VICTOIRE !' : 'K.-O. !'}</h1><p>${esc(m.history[0])}</p><div class="row">${'<button class="btn hot big" data-act="go" data-page="lobby">Rejouer</button><button class="btn ghost big" data-act="go" data-page="home">Accueil</button><button class="btn ghost big" data-act="dismissResult">Voir le plateau</button>'}</div></div></div>`;
}

export function duel(m) {
  return `<div class="duel ${S.targeting ? 'is-targeting' : ''}">
    <section class="top">${life(m, 0)}${titantron(m)}${life(m, 1)}</section>
    <section class="stage"><div class="board">${side(m, 1)}<div class="midline"><span class="vs">VS</span><button class="ticker" data-act="log">${esc(m.history[0] ?? '')}<small>JOURNAL ▸</small></button></div>${side(m, 0)}</div>${reaction(m)}</section>
    <footer class="handbar">${phases(m)}${hand(m)}${controls(m)}</footer>
    ${S.hideResult ? '' : result(m)}
    <div class="duel-tools"><button class="btn small ghost" data-act="quit">✕ Quitter</button></div>
  </div>`;
}

export function refreshTitantron(m) {
  const el = document.querySelector('.duel .tron');
  if (el) el.outerHTML = titantron(m);
}
