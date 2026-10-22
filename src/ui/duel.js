// Écran de duel « Arcade Titantron » : barres de vie, écran géant, plateau, main.
import { normalSummonRequirement } from '../engine/rules.js';
import * as effects from '../engine/card-effects.js';
import * as combat from '../engine/combat.js';
import * as activ from '../engine/activations.js';
import { S, card, esc, game, CARD_BACK, KIND_LABEL } from './core.js';
import { cardFacts } from './screens.js';
import { pickable, directAllowed, targetingScreen } from './targeting.js';

const fightersOf = p => [...p.active, ...p.passive];
const myTurn = m => m.turn === 0 && m.winner === null;
const hasEffect = (c, kind) => c.effects?.some(e => e.kind === kind);
const act = (label, attrs, sub = '', cls = '') => ({ label, attrs, sub, cls });

// ---------- Actions légales selon la carte choisie ----------

export function handActions(m, id) {
  const c = card(id), p = m.players[0], acting = myTurn(m) && m.phase === 'actions', out = [];
  if (!c || !p.hand.includes(id)) return out;
  if (c.category === 'Catcheur' && acting && (!p.limits.normal || p.limits.extraNormal > 0) && normalSummonRequirement(c).allowed) {
    const positions = game.legalPositions(p);
    const hogan = c.id === 'nwo-01' && combat.hoganFree(m, 0);
    if (c.rarity === 'SSR' && !p.status.freeSsrSummon && !hogan) {
      const board = fightersOf(p).map(f => card(f.cardId)?.rarity);
      const canSac = board.includes('SR') || board.includes('SSR') || board.filter(r => r === 'R').length >= 2;
      out.push(act('Invoquer avec sacrifice', `data-act="summonSSR" data-id="${id}" ${canSac ? '' : 'disabled'}`, canSac ? 'Sacrifie 1 SR, 1 SSR ou 2 R' : 'Il faut 1 SR, 1 SSR ou 2 R sur ton ring', 'hot'));
    } else {
      const free = hogan ? ' · sans sacrifice (Hall et Nash)' : c.rarity === 'SSR' ? ' · sans sacrifice (McMahon)' : '';
      for (const pos of positions) out.push(act(pos === 'active' ? 'Invoquer en actif' : 'Invoquer en passif', `data-act="summon" data-id="${id}" data-pos="${pos}"`, (pos === 'active' ? 'Peut attaquer' : 'Protégé, n’attaque pas') + free, pos === 'active' ? 'hot' : ''));
      if (!positions.length) out.push(act('Ring complet', 'disabled', '5 catcheurs maximum'));
    }
  }
  if (c.category === 'Manager' && acting && !p.limits.manager && !p.manager) out.push(act('Jouer le manager', `data-act="playManager" data-id="${id}"`, 'Occupe ton emplacement Manager', 'hot'));
  if (c.category === 'Objet' && acting && !p.limits.object) {
    for (const f of fightersOf(p).filter(x => id !== 'nwo-07' || combat.isNwoMember(x.cardId))) { const e = combat.effective(m, 0, f); out.push(act(`Équiper à ${esc(card(f.cardId).displayName)}`, `data-act="equip" data-id="${id}" data-iid="${f.instanceId}"`, `${e.attack} ATT · ${e.endurance} END`)); }
  }
  if (c.category === 'Momentum') {
    const reaction = m.pendingAttack?.playerIndex === 1 && c.rapid && m.outOfTurnMomentumUsed[0] < 1;
    const own = acting && !c.rapid && p.limits.momentum < 1;
    if (own || reaction) {
      const blocked = p.status.noMomentumThroughTurn >= m.turnNumber ? { ok: false, reason: 'Un effet t’empêche de jouer un Momentum ce tour.' } : momentumCheck(m, c);
      out.push(act(c.rapid ? 'Jouer en réponse ⚡' : 'Jouer le Momentum', `data-act="momentum" data-id="${id}" ${blocked.ok ? '' : 'disabled'}`, blocked.ok ? (c.rapid ? 'Réponse à l’attaque annoncée' : 'Un Momentum par tour') : blocked.reason, 'hot'));
    } else if (c.rapid && acting) out.push(act('Momentum rapide ⚡', 'disabled', `Se joue quand ${esc(m.players[1].name)} annonce une attaque`));
  }
  return out;
}

function momentumCheck(m, c) {
  const req = effects.momentumRequirement(m, 0, c);
  if (!req.ok) return req;
  if (game.DIRECT_SUMMON_RULES[c.id] && !game.directSummonOptions(m, 0, c).length) return { ok: false, reason: 'Aucun catcheur éligible ou plus de place sur le ring.' };
  return { ok: true };
}

const modeOf = (cardId, kind) => activ.effectMode(cardId, kind, { attackSpecial: combat.ATTACK_SPECIALS, search: effects.SEARCH_RULES });
const MODE_LABEL = { toggle: 'à activer · dure jusqu’à ton prochain tour', auto: 'automatique', attack: 'au moment d’attaquer', reaction: 'en réponse à une attaque', activated: 'à activer', search: 'à activer', grave: 'depuis le cimetière', manual: 'à appliquer à la main' };

function fighterActions(m, pi, f) {
  const p = m.players[pi], c = card(f.cardId), out = [];
  if (pi === 0 && myTurn(m) && m.phase === 'attacks' && !m.attackLock && !(p.status.noAttackThroughTurn >= m.turnNumber)) {
    const can = combat.canAttack(m, 0, f);
    if (!can.ok) { if (f.position === 'active') out.push(act('Attaquer', 'disabled', can.reason)); }
    else {
      const eff = combat.effective(m, 0, f);
      out.push(act('Attaquer !', `data-act="attack" data-iid="${f.instanceId}"`, `${eff.attack} ATT · choisis ta cible sur le ring`, 'hot'));
      const sp = combat.specialAvailable(m, 0, f);
      if (sp) {
        const probe = { mode: 'attack', iid: f.instanceId, special: f.cardId, picked: [] };
        const ok = sp.targets.startsWith('all') ? combat.specialBonusAgainst(m, 0, f, m.players[1].active[0] ?? null) != null && m.players[1].active.length > 0 : pickable(m, probe).size > 0 || directAllowed(m, probe);
        out.push(act(`Attaque spéciale : ${esc(sp.name)}`, `data-act="attack" data-iid="${f.instanceId}" data-special="${f.cardId}" ${ok ? '' : 'disabled'}`, ok ? 'Effet spécial · une fois tant qu’il reste sur le ring' : 'Condition non remplie pour l’instant', 'hot'));
      }
      if (p.objects.some(o => o.fighterId === f.instanceId && o.cardId === 'objets-01')) out.push(act('Attaque à l’Échelle', `data-act="attack" data-iid="${f.instanceId}" data-ladder="1"`, '10 dégâts à chaque actif adverse, puis -10 END'));
    }
  }
  if (pi === 0 && myTurn(m) && m.phase === 'actions') {
    // Changement de position : une fois par tour (déplacement simple ou échange actif ↔ passif).
    if (p.limits.move) out.push(act(f.position === 'active' ? 'Passer en passif' : 'Passer en actif', 'disabled', 'Tu as déjà changé une position ce tour-ci'));
    else if (f.position === 'active') {
      if (p.passive.length < 2) out.push(act('Passer en passif', `data-act="move" data-iid="${f.instanceId}" data-dest="passive" ${p.active.length > 1 ? '' : 'disabled'}`, p.active.length > 1 ? 'Une fois par tour' : 'Il faut garder au moins un catcheur actif'));
      for (const x of p.passive) out.push(act(`Échanger avec ${esc(card(x.cardId).displayName)}`, `data-act="swap" data-a="${f.instanceId}" data-b="${x.instanceId}"`, `${esc(card(f.cardId).displayName)} passe en passif, ${esc(card(x.cardId).displayName)} en actif`));
    } else {
      if (p.active.length < 3) out.push(act('Passer en actif', `data-act="move" data-iid="${f.instanceId}" data-dest="active"`, 'Une fois par tour'));
      for (const x of p.active) out.push(act(`Échanger avec ${esc(card(x.cardId).displayName)}`, `data-act="swap" data-a="${x.instanceId}" data-b="${f.instanceId}"`, `${esc(card(f.cardId).displayName)} passe en actif, ${esc(card(x.cardId).displayName)} en passif`));
    }
    for (const [kind, key] of [['passif', 'passive'], ['spécial', 'special']]) {
      if (!hasEffect(c, kind)) continue;
      const mode = modeOf(c.id, kind), full = `${c.id}:${key}`, title = `Effet ${kind}`;
      const effectName = esc(c.effects.find(e => e.kind === kind).text.split(':')[0].trim());
      if (mode === 'toggle') {
        const on = (f.passiveActiveUntil ?? 0) >= m.turnNumber, used = f.passiveUsedTurn === m.turnNumber;
        const off = (f.passivesOffUntil ?? 0) >= m.turnNumber;
        out.push(act(`Effet passif : ${effectName}`, `data-act="passive" data-iid="${f.instanceId}" ${used || off ? 'disabled' : ''}`, off ? 'Annulé par un effet adverse' : used || on ? '✨ Actif jusqu’à ton prochain tour' : 'Activer · dure jusqu’à ton prochain tour', 'hot'));
      } else if (mode === 'attack' && f.position === 'active') {
        const sp = combat.specialAvailable(m, 0, f);
        if (sp && combat.canAttack(m, 0, f).ok && !m.attackLock) {
          const probe = { mode: 'attack', iid: f.instanceId, special: f.cardId, picked: [] };
          const ok = sp.targets.startsWith('all') ? m.players[1].active.length > 0 && combat.specialBonusAgainst(m, 0, f, m.players[1].active[0]) != null : pickable(m, probe).size > 0 || directAllowed(m, probe);
          out.push(act(`Attaque spéciale : ${esc(sp.name)}`, `data-act="attack" data-iid="${f.instanceId}" data-special="${f.cardId}" ${ok ? '' : 'disabled'}`, ok ? 'Passe en phase Combat et vise directement' : 'Condition non remplie pour l’instant', 'hot'));
        } else if (f.specialUsed) out.push(act(`Attaque spéciale : ${effectName}`, 'disabled', 'Déjà utilisée'));
      } else if (mode === 'activated') {
        const refused = activ.activationCheck(m, 0, full, f);
        out.push(act(`${title} : ${esc(activ.ACTIVATED[full].name)}`, `data-act="activate" data-key="${full}" data-iid="${f.instanceId}" ${refused ? 'disabled' : ''}`, refused ?? 'Activer', 'hot'));
      } else if (mode === 'search') {
        const used = key === 'passive' ? f.passiveUsedTurn === m.turnNumber : f.specialUsed;
        out.push(act(`${title} : chercher dans le deck`, `data-act="${key}" data-iid="${f.instanceId}" ${used ? 'disabled' : ''}`, used ? 'Déjà utilisé' : 'Activer', 'hot'));
      } else if (mode === 'manual' && (key === 'passive' || f.position === 'active')) {
        const used = key === 'passive' ? f.passiveUsedTurn === m.turnNumber : f.specialUsed;
        out.push(act(`${title} (manuel)`, `data-act="${key}" data-iid="${f.instanceId}" ${used ? 'disabled' : ''}`, used ? 'Déjà utilisé' : 'Applique le texte imprimé'));
      }
    }
  }
  return out;
}

function managerActions(m, pi) {
  const p = m.players[pi];
  if (pi === 0 && p.manager?.cardId === 'nwo-06' && m.winner === null) {
    const mark = effects.bischoffCheck(m, 0, 'mark'), search = effects.bischoffCheck(m, 0, 'search');
    return [
      act('Marquer nWo un adversaire', `data-act="bischoffMark" ${mark ? 'disabled' : ''}`, mark ?? 'Une fois par tour (au choix)', 'hot'),
      act('Chercher une carte nWo', `data-act="bischoffSearch" ${search ? 'disabled' : ''}`, search ?? 'Une fois par tour (au choix)', 'hot'),
    ];
  }
  if (pi !== 0 || !p.manager || p.manager.used || m.winner !== null || !['managers-02', 'managers-04', 'managers-05'].includes(p.manager.cardId)) return [];
  const teddy = p.manager.cardId === 'managers-04';
  const ok = !teddy || (myTurn(m) && m.phase === 'actions' && effects.teddyLongOptions(m, 0).length && game.legalPositions(p).length);
  return [act('Activer l’effet du manager', `data-act="managerEffect" ${ok ? '' : 'disabled'}`, ok ? 'Une fois pendant sa présence' : 'Il faut deux catcheurs d’une même faction en main', 'hot')];
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
  if (m.pendingAttack?.playerIndex === 1) return { kicker: '⚡ FENÊTRE DE RÉPONSE', title: `${esc(m.players[1].name.toUpperCase())} ATTAQUE !`, text: 'Réponds avec un Momentum rapide ou laisse passer l’attaque.' };
  if (m.pendingAttack?.playerIndex === 0) return { kicker: `TOUR ${m.turnNumber} · COMBAT`, title: 'ATTAQUE EN COURS !', text: esc(m.history[0]) };
  if (m.turn === 1) return { kicker: `TOUR ${m.turnNumber}`, title: `${esc(m.players[1].name.toUpperCase())} JOUE…`, text: esc(m.history[0]) };
  if (m.phase === 'attacks') return { kicker: `TOUR ${m.turnNumber} · COMBAT`, title: 'À L’ATTAQUE !', text: 'Clique sur un de tes catcheurs actifs, puis sur sa cible.' };
  return { kicker: `TOUR ${m.turnNumber} · ACTIONS`, title: 'À TOI DE JOUER', text: 'Les cartes jouables brillent dans ta main. Survole une carte pour la lire, clique pour agir.' };
}

function titantron(m) {
  if (S.targeting) {
    const screen = targetingScreen(m);
    if (screen) return screen;
  }
  const sel = selectedCard(m), id = sel?.id ?? S.hovered, c = id && card(id);
  if (!c) {
    const s = statusScreen(m);
    const phase = m.turn === 1 ? 2 : m.phase === 'actions' ? 0 : 1;
    const steps = [['1', 'ACTIONS', 'Invoque, joue tes cartes, active tes effets, change une position.'], ['2', 'COMBAT', 'Choisis un catcheur actif puis sa cible sur le ring.'], ['3', `TOUR DE ${esc(m.players[1].name.toUpperCase())}`, 'Valide chacune de ses actions avec « OK ».']];
    return `<div class="tron idle"><div class="tron-body"><span class="k">${s.kicker}</span><h2>${s.title}</h2><p>${s.text}</p>
      <ol class="guide">${steps.map(([n, t, d], i) => `<li class="${i === phase ? 'on' : ''}"><span>${n}</span><div><b>${t}</b><small>${d}</small></div></li>`).join('')}</ol>
      <p class="hint">Survole une carte pour lire ses effets en grand. Clique-la pour voir ses actions.</p></div></div>`;
  }
  const f = sel?.fighter ?? hoveredFighter(m, id), fpi = sel?.pi ?? (f && m.players[0].active.concat(m.players[0].passive).includes(f) ? 0 : 1);
  const stats = f ? fighterStats(m, fpi, f) : '';
  const actions = (sel?.actions ?? []).map(a => `<button class="btn ${a.cls}" ${a.attrs}><b>${a.label}</b>${a.sub ? `<small>${a.sub}</small>` : ''}</button>`).join('');
  const effectText = c.effects.map(e => { const mode = c.category === 'Catcheur' ? modeOf(c.id, e.kind) : null; return `<p><b>${KIND_LABEL[e.kind]} :</b> ${esc(e.text)}${mode ? ` <em class="mode ${mode}">${MODE_LABEL[mode]}</em>` : ''}</p>`; }).join('');
  return `<div class="tron ${sel ? 'pinned' : ''}"><img src="${c.image}" alt="${esc(c.displayName)}" data-act="zoom" data-id="${c.id}"><div class="tron-body"><div class="facts">${cardFacts(c)}</div><h2>${esc(c.displayName)}</h2>${stats}<div class="tron-effects">${effectText || '<p class="muted">Aucun effet imprimé.</p>'}</div>${sel ? `<div class="tron-actions">${actions || '<p class="hint">Aucune action possible avec cette carte pour l’instant.</p>'}${sel.fighter ? corrections(sel.pi, sel.fighter) : ''}</div>` : '<p class="hint">Clique la carte pour voir ses actions.</p>'}</div></div>`;
}

// Le survol d'un catcheur sur le ring montre aussi ses stats du moment.
function hoveredFighter(m, cardId) {
  const el = document.querySelector('.fcard:hover');
  if (!el || el.dataset.preview !== cardId) return null;
  return fightersOf(m.players[Number(el.dataset.pi)]).find(f => f.instanceId === el.dataset.id) ?? null;
}

// Au survol : stats du moment, et en toutes lettres d'où viennent les bonus et les états.
function fighterStats(m, pi, f) {
  const e = combat.effective(m, pi, f), tag = n => (n ? ` <small class="${n > 0 ? 'up' : 'down'}">(${n > 0 ? '+' : ''}${n})</small>` : '');
  const lines = [];
  for (const part of e.parts) lines.push(`<li class="${part.value > 0 ? 'up' : 'down'}"><b>${part.value > 0 ? '+' : ''}${part.value} ${part.stat === 'attack' ? 'ATT' : 'END'}</b> ${esc(part.source)}</li>`);
  const when = until => esc(combat.untilText(m, until, 0));
  if (combat.passiveOn(m, pi, f)) lines.push(`<li>✨ <b>Effet passif actif</b> · ${when(f.passiveActiveUntil)}</li>`);
  else if (card(f.cardId).effects.some(x => x.kind === 'passif')) lines.push(`<li class="muted">Effet passif non activé</li>`);
  if ((f.noAttackUntil ?? 0) >= m.turnNumber) lines.push(`<li class="down">💤 <b>Ne peut pas attaquer</b>${f.noAttackUntilWhy ? ` (${esc(f.noAttackUntilWhy)})` : ''} · ${when(f.noAttackUntil)}</li>`);
  if ((f.passivesOffUntil ?? 0) >= m.turnNumber) lines.push(`<li class="down">🚫 <b>Effets passifs annulés</b>${f.passivesOffUntilWhy ? ` (${esc(f.passivesOffUntilWhy)})` : ''} · ${when(f.passivesOffUntil)}</li>`);
  if ((f.halfDamageUntil ?? 0) >= m.turnNumber) lines.push(`<li class="down">½ <b>Inflige moitié moins de dégâts</b>${f.halfDamageUntilWhy ? ` (${esc(f.halfDamageUntilWhy)})` : ''} · ${when(f.halfDamageUntil)}</li>`);
  if (f.nwoMark) lines.push(`<li class="down">🎯 <b>Marqué nWo</b>${f.nwoMarkWhy ? ` (${esc(f.nwoMarkWhy)})` : ''} · tant qu’il reste sur le ring</li>`);
  if (f.specialUsed) lines.push('<li class="muted">Effet spécial déjà utilisé</li>');
  if (m.turn === pi && f.position === 'active') { const n = combat.attacksAllowed(m, pi, f), used = combat.attacksUsed(m, f); lines.push(`<li>⚔ Attaques ce tour : <b>${used}/${n}</b></li>`); }
  for (const o of m.players[pi].objects.filter(x => x.fighterId === f.instanceId)) lines.push(`<li>⚙ <b>${esc(card(o.cardId).displayName)}</b> équipé</li>`);
  return `<div class="live-stats"><span>${e.attack}${tag(e.bonusAtt)} <small>ATT</small></span><span class="${f.endurance < f.baseEndurance ? 'hurt' : ''}">${e.endurance}${tag(e.bonusEnd)}<small> END</small></span></div>${lines.length ? `<ul class="now">${lines.join('')}</ul>` : ''}`;
}

// Panneau « Effets en cours » : ce qui agit maintenant, pour toi et pour l'IA.
function effectsPanel(m) {
  const chip = until => (until == null ? ['perm', 'PERMANENT'] : until === m.turnNumber ? ['now', 'CE TOUR'] : ['next', 'PROCHAIN TOUR']);
  const section = (pi, title) => {
    const list = combat.activeEffects(m, pi);
    const items = list.map(x => {
      const [cls, label] = chip(x.until), img = x.cardId && card(x.cardId)?.image;
      return `<article class="fx-item ${x.tone ?? ''}" ${x.cardId ? `data-preview="${x.cardId}"` : ''} title="${esc(combat.untilText(m, x.until, 0))}">
        <div class="fx-thumb">${img ? `<img src="${img}" alt="">` : ''}<span>${x.icon}</span></div>
        <div class="fx-txt"><b>${esc(x.title)}</b>${x.text ? `<p>${esc(x.text)}</p>` : ''}</div>
        <em class="fx-chip ${cls}">${label}</em></article>`;
    }).join('');
    return `<section class="fx-side ${pi ? 'ai' : 'me'}"><h4><span>${title}</span><b>${list.length}</b></h4>${items || '<p class="fx-none">Aucun effet en cours</p>'}</section>`;
  };
  if (!S.effectsOpen) return `<aside class="fxp closed"><button class="fxp-toggle" data-act="toggleEffects" title="Afficher les effets en cours">◀<span>EFFETS EN COURS</span></button></aside>`;
  return `<aside class="fxp"><header><b>EFFETS EN COURS</b><button class="fxp-toggle" data-act="toggleEffects" title="Réduire">▶</button></header><div class="fxp-body">${section(1, esc(m.players[1].name.toUpperCase()))}${section(0, 'TOI')}</div></aside>`;
}

function statusBadges(m, f) {
  const out = [];
  if ((f.passiveActiveUntil ?? 0) >= m.turnNumber && !((f.passivesOffUntil ?? 0) >= m.turnNumber)) out.push(['✨', 'Effet passif actif']);
  if ((f.noAttackUntil ?? 0) >= m.turnNumber) out.push(['💤', 'Ne peut pas attaquer']);
  if ((f.passivesOffUntil ?? 0) >= m.turnNumber) out.push(['🚫', 'Effets passifs annulés']);
  if ((f.halfDamageUntil ?? 0) >= m.turnNumber) out.push(['½', 'Dégâts divisés par 2']);
  if (m.extraAttacks?.[f.instanceId]) out.push(['×2', 'Attaque deux fois']);
  if (f.nwoMark) out.push(['🎯', 'Marqué nWo']);
  return out;
}

// ---------- Plateau ----------

function life(m, pi) {
  const p = m.players[pi], pct = Math.max(0, Math.min(100, p.hp / 5));
  const turn = m.turn === pi && m.winner === null;
  return `<div class="life ${pi ? 'ai' : 'me'} ${turn ? 'turn' : ''} ${pct <= 25 ? 'low' : ''}">
    <div class="avatar">${pi ? esc(p.name === 'L’IA' ? 'IA' : p.name.slice(0, 2).toUpperCase()) : 'TOI'}</div>
    <div class="life-main">
      <div class="life-top"><b class="name">${pi ? esc(p.name.toUpperCase()) : 'VOUS'}</b>${turn ? '<span class="turn-tag">À SON TOUR</span>' : ''}<span class="pv">${p.hp}<small>PV</small></span></div>
      <button class="gauge" data-act="hp" data-pi="${pi}" data-hp="${pi}" title="Points de vie (clic : correction manuelle)"><i style="width:${pct}%"></i></button>
      <div class="chips"><span title="Cartes en main">✋ <b>${p.hand.length}</b> main</span><span title="Cartes dans le deck">🂠 <b>${p.deck.length}</b> deck</span><span title="Momenta encore jouables ce tour">⚡ <b>${m.turn === pi ? Math.max(0, 1 - p.limits.momentum) : '—'}</b> momentum</span></div>
    </div>
  </div>`;
}

function fighterCard(m, pi, f) {
  const c = card(f.cardId), sel = S.selected?.kind === 'fighter' && S.selected.id === f.instanceId;
  const targetable = S.targeting && targets.has(f.instanceId);
  const picked = S.targeting?.picked?.some(x => x.instanceId === f.instanceId);
  const spent = m.turn === pi && !combat.canAttack(m, pi, f).ok && f.position === 'active';
  const objects = m.players[pi].objects.filter(o => o.fighterId === f.instanceId);
  const e = combat.effective(m, pi, f);
  const aimed = m.pendingAttack && (m.pendingAttack.targets ?? [m.pendingAttack.targetId]).includes(f.instanceId);
  const cls = [sel && 'sel', targetable && 'target', picked && 'picked', spent && 'spent', f.endurance < f.baseEndurance && 'hurt', aimed && 'aimed', m.pendingAttack?.attackerId === f.instanceId && 'attacking'].filter(Boolean).join(' ');
  const badges = statusBadges(m, f).map(([icon, t]) => `<i title="${t}">${icon}</i>`).join('');
  return `<button class="fcard ${cls}" data-act="${targetable ? 'target' : 'select'}" data-kind="fighter" data-pi="${pi}" data-id="${f.instanceId}" data-target="${f.instanceId}" data-fighter="${pi}:${f.instanceId}" data-preview="${c.id}" aria-label="${esc(c.displayName)} ${e.attack} ATT ${e.endurance} END"><img src="${c.image}" alt=""><span class="pill"><b class="at ${e.bonusAtt > 0 ? 'up' : e.bonusAtt < 0 ? 'down' : ''}">${e.attack}<i> ATT</i></b><b class="en ${e.bonusEnd > 0 ? 'up' : e.bonusEnd < 0 ? 'down' : ''}">${e.endurance}<i> END</i></b></span>${objects.length ? `<span class="equip" title="${objects.map(o => esc(card(o.cardId).displayName)).join(', ')}">⚙ ${objects.length}</span>` : ''}${badges ? `<span class="badges">${badges}</span>` : ''}</button>`;
}

function zone(m, pi, kind) {
  const list = m.players[pi][kind], count = kind === 'active' ? 3 : 2;
  const slots = Array.from({ length: count }, (_, i) => list[i] ? fighterCard(m, pi, list[i]) : `<div class="slot">${kind === 'active' ? 'ACTIF' : 'PASSIF'}</div>`).join('');
  return `<div class="zone ${kind}"><div class="zt">${kind === 'active' ? 'ACTIFS' : 'PASSIFS'} ${list.length}/${count}</div><div class="slots">${slots}</div></div>`;
}

function support(m, pi) {
  const p = m.players[pi];
  const mg = p.manager ? `<button class="mini ${S.selected?.kind === 'manager' && S.selected.pi === pi ? 'sel' : ''} ${p.manager.used ? 'spent' : ''}" data-act="select" data-kind="manager" data-pi="${pi}" data-id="${p.manager.cardId}" data-preview="${p.manager.cardId}"><img src="${card(p.manager.cardId).image}" alt=""></button>` : '<div class="mini empty">—</div>';
  const objects = p.objects.map(o => `<button class="mini obj" data-act="select" data-kind="card" data-pi="${pi}" data-id="${o.cardId}" data-preview="${o.cardId}"><img src="${card(o.cardId).image}" alt=""></button>`).join('');
  const momenta = [...p.ongoingMomentum, ...(p.resolvingMomentum ? [p.resolvingMomentum] : [])].map(o => `<button class="mini mom" data-act="select" data-kind="card" data-pi="${pi}" data-id="${o.cardId}" data-preview="${o.cardId}"><img src="${card(o.cardId).image}" alt=""></button>`).join('');
  return `<div class="support"><div class="zt">MANAGER</div>${mg}${objects ? `<div class="zt">OBJETS</div><div class="minis">${objects}</div>` : ''}${momenta ? `<div class="zt">MOMENTUM</div><div class="minis">${momenta}</div>` : ''}</div>`;
}

const GRAVE_KEYS = ['wyatt-02:grave', 'wyatt-03:grave'];

function piles(m, pi) {
  const p = m.players[pi], top = p.grave.at(-1);
  // Un effet utilisable depuis le cimetière fait briller la pile.
  const graveReady = pi === 0 && GRAVE_KEYS.some(key => p.grave.includes(key.split(':')[0]) && !activ.activationCheck(m, 0, key, null));
  return `<div class="piles"><button class="pile deck" data-act="pile" data-pi="${pi}" data-zone="deck" ${pi ? 'disabled' : ''}><img src="${CARD_BACK}" alt=""><b>${p.deck.length}</b><small>DECK</small></button><button class="pile grave ${graveReady ? 'ready' : ''}" data-act="pile" data-pi="${pi}" data-zone="grave" title="${graveReady ? 'Un effet peut être activé depuis ton cimetière' : 'Voir le cimetière'}">${top ? `<img src="${card(top).image}" alt="">` : '<span class="void"></span>'}<b>${p.grave.length}</b><small>CIMETIÈRE</small>${graveReady ? '<em class="pile-fx">⚡ EFFET</em>' : ''}</button></div>`;
}

const side = (m, pi) => `<div class="side ${pi ? 'ai' : 'me'}">${piles(m, pi)}${zone(m, pi, 'active')}${zone(m, pi, 'passive')}${support(m, pi)}</div>`;

function reaction(m) {
  const a = m.pendingAttack;
  if (!a || a.playerIndex !== 1) return '';
  const p = m.players[0], attacker = m.players[1].active.find(f => f.instanceId === a.attackerId);
  const ids = a.targets ?? [a.targetId];
  const target = ids[0] === 'direct' ? 'TES PV' : ids.map(id => esc(card(fightersOf(p).find(f => f.instanceId === id)?.cardId)?.displayName)).join(', ');
  const canMomentum = m.outOfTurnMomentumUsed[0] < 1 && !(p.status.noMomentumThroughTurn >= m.turnNumber);
  const rapid = canMomentum ? [...new Set(p.hand)].map(card).filter(c => c?.category === 'Momentum' && c.rapid && momentumCheck(m, c).ok) : [];
  const answers = game.reactionOptions(m, 0);
  const sp = a.special ? combat.ATTACK_SPECIALS[a.special]?.name : a.ladder ? 'Échelle' : '';
  return `<div class="reaction"><div class="r-head">⚡ ${esc(card(attacker?.cardId)?.displayName)}${sp ? ` · ${esc(sp)}` : ''} <small>${a.attack} dégâts</small> ➜ ${target}</div><div class="r-actions">${rapid.map(c => `<button class="btn hot" data-act="momentum" data-id="${c.id}" data-preview="${c.id}"><b>${esc(c.displayName)}</b><small>Momentum rapide</small></button>`).join('')}${answers.map(o => `<button class="btn hot" data-act="react" data-key="${o.key}" data-iid="${o.fighterId ?? ''}"><b>${esc(o.label)}</b><small>${esc(o.detail)}</small></button>`).join('')}<button class="btn" data-act="letPass"><b>Laisser passer</b><small>${ids[0] === 'direct' ? `-${a.attack} PV` : `-${a.attack} END`}</small></button></div></div>`;
}

function hand(m) {
  const p = m.players[0], n = p.hand.length;
  const cards = p.hand.map((id, i) => {
    const c = card(id), off = i - (n - 1) / 2, sel = S.selected?.kind === 'hand' && S.selected.id === id;
    const playable = handActions(m, id).some(a => !a.attrs.includes('disabled'));
    return `<button class="hcard ${sel ? 'sel' : ''} ${playable ? 'can' : ''}" style="--r:${off * Math.min(5, 40 / n)}deg;--y:${Math.abs(off) ** 2 * Math.min(4, 30 / n)}px;--i:${i}" data-act="select" data-kind="hand" data-id="${id}" data-preview="${id}" title="${esc(c.displayName)}"><img src="${c.image}" alt="${esc(c.displayName)}">${c.rapid ? '<i class="bolt">⚡</i>' : ''}</button>`;
  }).join('');
  return `<div class="hand">${cards || '<p class="muted">Main vide</p>'}</div>`;
}

function controls(m) {
  if (m.winner !== null) return '<div class="controls"><button class="btn hot big" data-act="go" data-page="lobby">REJOUER ▶</button></div>';
  if (m.turn === 1) return `<div class="controls"><button class="btn big" disabled>${esc(m.players[1].name.toUpperCase())} JOUE…</button></div>`;
  if (m.pendingAttack) return '<div class="controls"></div>';
  if (m.turnNumber === 1) return '<div class="controls"><button class="btn hot big" data-act="endTurn"><b>FIN DU TOUR ▶</b><small>Pas d’attaque au 1er tour</small></button></div>';
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

let targets = new Set();

export function duel(m) {
  targets = pickable(m);
  const s = statusScreen(m);
  return `<div class="duel ${S.targeting ? 'is-targeting' : ''} ${S.effectsOpen ? 'fx-open' : 'fx-closed'}">
    <aside class="info">${titantron(m)}</aside>
    ${effectsPanel(m)}
    <section class="hud">${life(m, 0)}<div class="status"><span class="k">${s.kicker}</span><b>${s.title}</b><button class="btn small ghost" data-act="quit">✕ Quitter</button></div>${life(m, 1)}</section>
    <section class="stage"><div class="board">${side(m, 1)}<div class="midline"><span class="vs">VS</span><button class="ticker" data-act="log">${esc(m.history[0] ?? '')}<small>JOURNAL ▸</small></button></div>${side(m, 0)}</div>${reaction(m)}</section>
    <footer class="handbar">${phases(m)}${hand(m)}${controls(m)}</footer>
    ${S.hideResult ? '' : result(m)}
  </div>`;
}

export function refreshTitantron(m) {
  const el = document.querySelector('.duel .tron');
  if (el) el.outerHTML = titantron(m);
}
