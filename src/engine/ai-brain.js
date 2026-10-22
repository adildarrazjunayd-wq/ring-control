// Cerveau de l'IA : à chaque étape, il note toutes les actions possibles et choisit la meilleure.
// En répétant ce choix, l'IA enchaîne naturellement les combos de faction
// (chercher la carte clé, invoquer, activer, renforcer, puis attaquer).
// Aucun affichage ici : ce fichier pourra servir côté serveur.
import * as game from './game-engine.js';
import * as fx from './card-effects.js';
import * as combat from './combat.js';
import * as act from './activations.js';

const { lookupCard: card, legalPositions } = game;
const { fightersOf, effective, is, nameOf } = combat;
const RARITY = { SSR: 25, SR: 12, R: 0 };

export const fighterValue = (state, pi, f) => { const e = effective(state, pi, f); return e.attack + e.endurance * 0.5 + (RARITY[card(f.cardId)?.rarity] ?? 0); };
const cardValue = c => (c?.attack ?? 0) + (c?.endurance ?? 0) * 0.5 + (RARITY[c?.rarity] ?? 0);
const uniq = list => [...new Set(list)];
const strongest = (state, list) => list.map(t => ({ t, f: fightersOf(state.players[t.pi]).find(x => x.instanceId === t.instanceId) }))
  .sort((a, b) => fighterValue(state, b.t.pi, b.f) - fighterValue(state, a.t.pi, a.f))[0]?.t;

// Bonus de synergie quand la carte `c` rejoint le ring du joueur `pi`.
export function synergy(state, pi, c) {
  const p = state.players[pi], ring = fightersOf(p).map(f => card(f.cardId)), name = nameOf(c.id);
  let s = 0;
  if (c.faction) s += 10 * ring.filter(x => x.faction === c.faction).length;
  if (combat.BLOODLINE_CORE.includes(name)) {
    const have = new Set(ring.map(x => nameOf(x.id)).filter(n => combat.BLOODLINE_CORE.includes(n)));
    if (!have.has(name)) { s += 12; if (have.size === 3) s += 40 + (p.hand.includes('wyatt-13') ? 30 : 0); }
  }
  if (c.faction === 'The Shield') s += 8 * ring.filter(x => x.faction === 'The Shield').length;
  if (is(c.id, 'bray wyatt') && ring.some(x => x.faction === 'Wyatt Family')) s += 15;
  if (c.faction === 'Wyatt Family' && ring.some(x => is(x.id, 'bray wyatt'))) s += 15;
  if (p.manager?.cardId === 'managers-01' && (is(c.id, 'roman reigns') || is(c.id, 'brock lesnar'))) s += 20;
  if (p.manager?.cardId === 'managers-03' && c.faction) s += 10;
  return s;
}

// ---------- Actions de la phase principale ----------

function summonOptions(state, pi) {
  const p = state.players[pi], out = [];
  if (p.limits.normal && !((p.limits.extraNormal ?? 0) > 0)) return out;
  const positions = legalPositions(p);
  for (const id of uniq(p.hand)) {
    const c = card(id);
    if (c?.category !== 'Catcheur' || c.playable === false) continue;
    let sacrifices = [], cost = 0;
    if (c.rarity === 'SSR' && !p.status.freeSsrSummon && !(c.id === 'nwo-01' && combat.hoganFree(state, pi))) {
      const board = fightersOf(p).map(f => ({ f, v: fighterValue(state, pi, f), r: card(f.cardId).rarity })).sort((a, b) => a.v - b.v);
      const single = board.find(x => x.r === 'SR' || x.r === 'SSR'), rs = board.filter(x => x.r === 'R').slice(0, 2);
      const pick = [single ? [single] : null, rs.length === 2 ? rs : null].filter(Boolean).sort((a, b) => a.reduce((n, x) => n + x.v, 0) - b.reduce((n, x) => n + x.v, 0))[0];
      if (!pick) continue;
      sacrifices = pick.map(x => x.f.instanceId);
      cost = pick.reduce((n, x) => n + x.v, 0);
    } else if (!positions.length) continue;
    const position = p.active.length < 3 || sacrifices.some(id => p.active.some(f => f.instanceId === id)) ? 'active' : 'passive';
    const gain = cardValue(c) + synergy(state, pi, c) + (sacrifices.length ? 0 : 20) - cost;
    out.push({ score: gain * 0.6, label: `invoque ${c.displayName}`, run: () => game.normalSummon(state, pi, c, sacrifices, position) });
  }
  return out;
}

function managerOptions(state, pi) {
  const p = state.players[pi], out = [], ring = fightersOf(p);
  if (!p.limits.manager && !p.manager) {
    for (const id of uniq(p.hand)) {
      const c = card(id);
      if (c?.category !== 'Manager') continue;
      let s = 15;
      if (id === 'managers-01') s = 30 + (ring.some(f => is(f.cardId, 'roman reigns') || is(f.cardId, 'brock lesnar')) ? 25 : 0);
      if (id === 'managers-02') s = 20 + (p.hand.some(h => card(h)?.rarity === 'SSR' && card(h)?.category === 'Catcheur') ? 20 : 0);
      if (id === 'managers-03') s = 25 + (p.active.some(f => card(f.cardId).faction) ? 20 : 0);
      if (id === 'managers-04') s = 15 + (fx.teddyLongOptions(state, pi).length ? 25 : 0);
      if (id === 'managers-05') s = 15 + (p.hand.filter(h => card(h)?.category === 'Momentum' && !card(h).rapid).length >= 2 ? 15 : 0);
      if (id === 'nwo-06') s = 25 + 10 * ring.filter(f => combat.isNwoMember(f.cardId)).length;
      out.push({ score: s, label: `joue le manager ${c.displayName}`, run: () => game.playManager(state, pi, c) });
    }
  }
  const m = p.manager;
  if (m?.cardId === 'nwo-06') {
    const target = [...state.players[1 - pi].active].filter(f => !f.nwoMark).sort((a, b) => fighterValue(state, 1 - pi, b) - fighterValue(state, 1 - pi, a))[0];
    if (target && !fx.bischoffCheck(state, pi, 'mark')) out.push({ score: 22, label: 'Eric Bischoff marque un adversaire', run: () => fx.managerEffect(state, pi, { mode: 'mark', targets: [{ instanceId: target.instanceId }] }) });
    const best = fx.searchOptions(state, pi, 'nwo-06').map(o => card(o.cardId)).sort((a, b) => cardValue(b) - cardValue(a))[0];
    if (best && !fx.bischoffCheck(state, pi, 'search')) out.push({ score: 20, label: 'Eric Bischoff cherche une carte nWo', run: () => fx.managerEffect(state, pi, { mode: 'search', cardId: best.id }) });
  }
  if (m && !m.used && m.cardId !== 'nwo-06') {
    if (m.cardId === 'managers-02' && !p.limits.normal && p.hand.some(h => card(h)?.rarity === 'SSR' && card(h)?.category === 'Catcheur') && legalPositions(p).length) out.push({ score: 45, label: 'active Mr. McMahon', run: () => fx.managerEffect(state, pi) });
    if (m.cardId === 'managers-05' && p.limits.momentum >= 1 && p.hand.some(h => card(h)?.category === 'Momentum' && !card(h).rapid && fx.momentumRequirement(state, pi, card(h)).ok)) out.push({ score: 30, label: 'active Stephanie McMahon', run: () => fx.managerEffect(state, pi) });
    if (m.cardId === 'managers-04') {
      const group = fx.teddyLongOptions(state, pi)[0], positions = legalPositions(p);
      if (group && group.cardIds.length >= 2 && fightersOf(p).length <= 3 && positions.length) {
        const ids = group.cardIds.slice(0, 2), pos = [p.active.length < 3 ? 'active' : 'passive', p.active.length < 2 ? 'active' : 'passive'];
        out.push({ score: ids.reduce((n, id) => n + cardValue(card(id)), 0) * 0.5, label: 'active Teddy Long', run: () => fx.managerEffect(state, pi, { cardIds: ids, positions: pos }) });
      }
    }
  }
  return out;
}

function objectScore(state, pi, o, f) {
  const active = f.position === 'active', e = effective(state, pi, f);
  switch (o) {
    case 'objets-01': return active ? 10 * state.players[1 - pi].active.length : 2;
    case 'objets-02': return active ? 20 : 4;
    case 'objets-03': return active ? 18 : 3;
    case 'objets-04': return active && e.attack >= 50 ? 26 : 2;
    case 'objets-05': return 20 + (is(f.cardId, 'roman reigns') ? 18 : 0) + (active ? 5 : 0);
    case 'objets-06': return 15 + (['edge', 'triple h', 'randy orton'].some(n => is(f.cardId, n)) ? 12 : 0) + (state.players[pi].limits.normal && state.players[pi].hand.some(h => card(h)?.category === 'Catcheur' && card(h).rarity !== 'SSR') ? 18 : 0);
    case 'objets-07': return 25 + (['catcheur-08', 'catcheur-06', 'catcheur-03'].includes(f.cardId) ? 15 : 0);
    case 'objets-08': return 15 + (is(f.cardId, 'john cena') || is(f.cardId, 'cm punk') ? 22 : 0);
    case 'wyatt-07': return is(f.cardId, 'bray wyatt') ? 25 : 1;
    case 'nwo-07': return combat.isNwoMember(f.cardId) ? 22 + (active ? 8 : 0) : -1;
    default: return 5;
  }
}

function objectOptions(state, pi) {
  const p = state.players[pi], out = [];
  if (p.limits.object) return out;
  for (const id of uniq(p.hand)) {
    if (card(id)?.category !== 'Objet') continue;
    for (const f of fightersOf(p)) out.push({ score: objectScore(state, pi, id, f), label: `équipe ${card(id).displayName}`, run: () => game.equipObject(state, pi, card(id), f.instanceId) });
  }
  return out;
}

function momentumScore(state, pi, c) {
  const p = state.players[pi], d = state.players[1 - pi], id = c.id;
  if (c.rapid || p.limits.momentum >= 1 || p.status.noMomentumThroughTurn >= state.turnNumber || !fx.momentumRequirement(state, pi, c).ok) return -1;
  if (game.DIRECT_SUMMON_RULES[id]) {
    const opts = game.directSummonOptions(state, pi, c);
    return opts.length ? Math.max(...opts.map(o => cardValue(card(o.cardId)) + synergy(state, pi, card(o.cardId)))) * 0.7 + 15 : -1;
  }
  const dmg = fightersOf(p).filter(f => f.endurance < f.baseEndurance).length;
  switch (id) {
    case 'wyatt-13': return 95;
    case 'momentum-24': return 30 + 25 * Math.min(2, fx.shieldSummonOptions(state, pi).length);
    case 'momentum-16': return Math.max(0, ...p.grave.filter(g => card(g)?.category === 'Catcheur').map(g => cardValue(card(g)))) * 0.6;
    case 'nwo-08': return 15 * (fightersOf(d).filter(f => f.nwoMark).length + (d.active.some(f => !f.nwoMark) ? 1 : 0));
    case 'wyatt-06': case 'wyatt-12': case 'nwo-09': return Math.max(0, ...act.summonCandidates(state, pi, act.SUMMON_MOMENTA[id].summon).map(o => cardValue(card(o.cardId)))) * 0.6;
    case 'momentum-05': case 'wyatt-05': case 'momentum-26': return 25;
    case 'momentum-08': case 'momentum-15': case 'momentum-17': return 30;
    case 'momentum-04': return p.hand.filter(h => card(h)?.category === 'Momentum' && !card(h).rapid).length >= 3 ? 25 : 2;
    case 'momentum-11': return 6 * p.active.length;
    case 'momentum-03': return p.active.length ? 15 : -1;
    case 'momentum-14': return p.active.length ? 12 : -1;
    case 'momentum-09': return d.active.length ? 20 : 4;
    case 'momentum-18': return d.active.some(f => combat.passiveOn(state, 1 - pi, f)) ? 18 : 2;
    case 'momentum-13': return fightersOf(d).some(f => combat.passiveOn(state, 1 - pi, f)) || d.manager ? 25 : 2;
    case 'momentum-06': return 8 * dmg;
    case 'momentum-07': return d.active.length ? 25 : 4;
    default: return 5;
  }
}

// Joue un Momentum et résout ses choix au mieux.
function runMomentum(state, pi, c) {
  const r = game.playMomentum(state, pi, c);
  if (!r.ok) return r;
  if (game.DIRECT_SUMMON_RULES[c.id]) {
    const best = game.directSummonOptions(state, pi, c).sort((a, b) => cardValue(card(b.cardId)) + synergy(state, pi, card(b.cardId)) - cardValue(card(a.cardId)) - synergy(state, pi, card(a.cardId)))[0];
    return best ? game.resolveDirectSummon(state, pi, c, best.cardId, best.positions[0]) : game.resolveMomentum(state, pi);
  }
  if (c.id === 'momentum-24') {
    const p = state.players[pi], ids = fx.shieldSummonOptions(state, pi).slice(0, 2);
    let active = p.active.length, total = fightersOf(p).length;
    const placements = [];
    for (const id of ids) {
      if (total >= 5) break;
      const position = active < 3 ? 'active' : 'passive';
      if (position === 'passive' && p.passive.length + placements.filter(x => x.position === 'passive').length >= 2) break;
      placements.push({ cardId: id, position });
      total += 1;
      if (position === 'active') active += 1;
    }
    return fx.resolveShieldSummon(state, pi, placements);
  }
  if (c.id === 'momentum-16') {
    const p = state.players[pi], best = uniq(p.grave.filter(g => card(g)?.category === 'Catcheur')).sort((a, b) => cardValue(card(b)) - cardValue(card(a)))[0];
    const pos = legalPositions(p)[0];
    if (best && pos) { game.reviveFromGrave(state, pi, card(best), pos); }
    return game.resolveMomentum(state, pi);
  }
  fx.autoResolveMomentum(state, pi, c);
  return { ok: true };
}

function momentumOptions(state, pi) {
  const p = state.players[pi];
  return uniq(p.hand).map(card).filter(c => c?.category === 'Momentum')
    .map(c => ({ score: momentumScore(state, pi, c), label: `joue ${c.displayName}`, run: () => runMomentum(state, pi, c) }))
    .filter(o => o.score > 0);
}

function activationScore(state, pi, key, f) {
  const d = state.players[1 - pi], p = state.players[pi];
  const enemyAtt = Math.max(0, ...d.active.map(x => effective(state, 1 - pi, x).attack));
  const e = act.ACTIVATED[key];
  if (e.summon) {
    const best = Math.max(0, ...act.summonCandidates(state, pi, e.summon, { leaving: e.leaves ? f : null }).map(o => cardValue(card(o.cardId)) + synergy(state, pi, card(o.cardId))));
    return best * 0.6 - (e.leaves ? fighterValue(state, pi, f) * 0.5 : 0);
  }
  switch (key) {
    case 'catcheur-01:special': case 'catcheur-32:passive': case 'catcheur-38:passive': case 'wyatt-03:grave': return d.active.length ? 15 + enemyAtt / 3 : -1;
    case 'catcheur-16:special': return d.active.length ? 15 + enemyAtt / 4 : -1;
    case 'catcheur-04:special': return fightersOf(d).some(x => combat.passiveOn(state, 1 - pi, x)) ? 20 : 3;
    case 'catcheur-07:special': return 15 + Math.max(0, ...fightersOf(d).map(x => effective(state, 1 - pi, x).endurance)) / 4;
    case 'catcheur-13:passive': return fightersOf(d).filter(x => combat.passiveOn(state, 1 - pi, x)).length * 10 + (d.manager ? 10 : 0) + 2;
    case 'catcheur-26:passive': case 'catcheur-36:passive': return 4 * p.active.length;
    case 'catcheur-28:passive': return 25;
    case 'catcheur-31:special': return 15;
    case 'wyatt-10:passive': return 12 + (d.active.some(x => effective(state, 1 - pi, x).endurance <= 10) ? 50 : 0);
    case 'wyatt-02:grave': return p.active.some(x => is(x.cardId, 'bray wyatt') && combat.canAttack(state, pi, x).ok) ? 22 : -1;
    default: return 10;
  }
}

function pickTargets(state, pi, specs, key) {
  return specs.map(spec => {
    const list = act.targetCandidates(state, pi, spec);
    if (key === 'catcheur-07:special') return list.sort((a, b) => effective(state, b.pi, fightersOf(state.players[b.pi]).find(x => x.instanceId === b.instanceId)).endurance - effective(state, a.pi, fightersOf(state.players[a.pi]).find(x => x.instanceId === a.instanceId)).endurance)[0];
    return strongest(state, list);
  });
}

function effectOptions(state, pi) {
  const p = state.players[pi], out = [];
  for (const f of fightersOf(p)) {
    for (const [kind, key] of [['passif', 'passive'], ['spécial', 'special']]) {
      if (!card(f.cardId)?.effects.some(e => e.kind === kind)) continue;
      const full = `${f.cardId}:${key}`;
      const mode = act.effectMode(f.cardId, kind, { attackSpecial: combat.ATTACK_SPECIALS, search: fx.SEARCH_RULES });
      if (mode === 'toggle' && f.passiveUsedTurn !== state.turnNumber && !((f.passivesOffUntil ?? 0) >= state.turnNumber)) {
        out.push({ score: 35, label: `active l’effet passif de ${card(f.cardId).displayName}`, run: () => game.activateWrestlerEffect(state, pi, f.instanceId, 'passive') });
      } else if (mode === 'search' && fx.searchOptions(state, pi, full).length) {
        const used = key === 'passive' ? f.passiveUsedTurn === state.turnNumber : f.specialUsed;
        if (used) continue;
        out.push({ score: 30, label: `utilise l’effet de ${card(f.cardId).displayName}`, run: () => {
          const r = game.activateWrestlerEffect(state, pi, f.instanceId, key);
          if (!r.ok) return r;
          const opts = fx.searchOptions(state, pi, full).map(o => o.cardId);
          const pick = opts.find(id => id === 'wyatt-13' && act.rassemblementCheck(state, pi) === null) ?? opts[0];
          return fx.resolveSearch(state, pi, full, pick, card(f.cardId).displayName);
        } });
      } else if (mode === 'activated' && !act.activationCheck(state, pi, full, f)) {
        const e = act.ACTIVATED[full];
        out.push({ score: activationScore(state, pi, full, f), label: e.name, run: () => {
          const option = e.summon ? act.summonCandidates(state, pi, e.summon, { leaving: e.leaves ? f : null }).sort((a, b) => cardValue(card(b.cardId)) - cardValue(card(a.cardId)))[0] : null;
          return act.activate(state, pi, full, f.instanceId, { targets: pickTargets(state, pi, e.targets ?? [], full), cardId: option?.cardId, position: option?.positions[0] });
        } });
      }
    }
  }
  for (const key of ['wyatt-02:grave', 'wyatt-03:grave']) {
    if (!p.grave.includes(key.split(':')[0]) || act.activationCheck(state, pi, key, null)) continue;
    const e = act.ACTIVATED[key];
    out.push({ score: activationScore(state, pi, key, null), label: e.name, run: () => act.activate(state, pi, key, null, { targets: pickTargets(state, pi, e.targets ?? [], key) }) });
  }
  return out;
}

function moveOptions(state, pi) {
  const p = state.players[pi], out = [];
  if (p.limits.move) return out;
  for (const f of p.active) {
    if (p.active.length > 1 && p.passive.length < 2 && effective(state, pi, f).endurance <= 25) out.push({ score: 12, label: `protège ${card(f.cardId).displayName}`, run: () => game.moveFighter(state, pi, f.instanceId, 'passive') });
  }
  for (const f of p.passive) {
    if (p.active.length < 3 && effective(state, pi, f).attack >= 50 && effective(state, pi, f).endurance > 30) out.push({ score: 10, label: `envoie ${card(f.cardId).displayName} au combat`, run: () => game.moveFighter(state, pi, f.instanceId, 'active') });
    // Échange : un passif en forme remplace un actif très blessé.
    const tired = [...p.active].sort((a, b) => effective(state, pi, a).endurance - effective(state, pi, b).endurance)[0];
    if (tired && effective(state, pi, tired).endurance <= 25 && effective(state, pi, f).endurance > 40) out.push({ score: 14, label: `échange ${card(tired.cardId).displayName} et ${card(f.cardId).displayName}`, run: () => game.swapFighters(state, pi, tired.instanceId, f.instanceId) });
  }
  return out;
}

// Meilleure action de la phase principale (ou null). `skip` : actions déjà tentées sans succès.
export function bestMainAction(state, pi, skip = new Set()) {
  const all = [...effectOptions(state, pi), ...summonOptions(state, pi), ...managerOptions(state, pi), ...momentumOptions(state, pi), ...objectOptions(state, pi), ...moveOptions(state, pi)];
  return all.filter(o => o.score > 4 && !skip.has(o.label)).sort((a, b) => b.score - a.score)[0] ?? null;
}

// ---------- Attaques ----------

function hitScore(state, pi, target, dmg) {
  const d = state.players[1 - pi];
  if (!target) return dmg >= d.hp ? 10000 : dmg * 0.9 + 5;
  const end = effective(state, 1 - pi, target).endurance;
  return dmg >= end ? 80 + fighterValue(state, 1 - pi, target) : dmg * 0.45;
}

export function bestAttack(state, pi) {
  const p = state.players[pi], d = state.players[1 - pi];
  if (state.turnNumber === 1 || state.attackLock || p.status.noAttackThroughTurn >= state.turnNumber) return null;
  let best = null;
  const consider = (score, plan) => { if (score > 0 && (!best || score > best.score)) best = { score, ...plan }; };
  for (const f of p.active) {
    if (!combat.canAttack(state, pi, f).ok) continue;
    const sp = combat.specialAvailable(state, pi, f);
    const variants = [{ special: null, ladder: false }];
    if (sp && !sp.cost) variants.push({ special: f.cardId, ladder: false });
    if (p.objects.some(o => o.fighterId === f.instanceId && o.cardId === 'objets-01')) variants.push({ special: null, ladder: true });
    for (const v of variants) {
      const type = v.ladder ? 'all-active' : v.special ? sp.targets : 'one';
      const base = { playerIndex: pi, attackerId: f.instanceId, special: v.special, ladder: v.ladder, first: state.usedAttackers.length === 0 };
      // Les attaques spéciales nWo qui posent la marque valent un peu plus qu'une attaque simple.
      const cost = ['nwo-02', 'nwo-04', 'nwo-05'].includes(v.special) ? -3 : v.special || v.ladder ? 12 : 0;
      if (type === 'all-active' || type === 'all-ring') {
        const targets = (type === 'all-ring' ? fightersOf(d) : d.active);
        if (!targets.length || (v.special && combat.specialBonusAgainst(state, pi, f, d.active[0] ?? null) == null)) continue;
        const a = { ...base, targets: targets.map(t => t.instanceId) };
        consider(targets.reduce((n, t) => n + hitScore(state, pi, t, combat.previewDamage(state, a, t.instanceId)), 0) - cost, { attackerId: f.instanceId, target: 'multi', options: { special: v.special, ladder: v.ladder } });
        continue;
      }
      const pool = (combat.canHitPassive(state, pi, f) ? fightersOf(d) : d.active).filter(t => !state.usedTargets.includes(t.instanceId) && (!v.special || combat.specialBonusAgainst(state, pi, f, t) != null));
      const scored = pool.map(t => ({ t, s: hitScore(state, pi, t, combat.previewDamage(state, { ...base, targets: [t.instanceId] }, t.instanceId)) })).sort((a, b) => b.s - a.s);
      if (type === 'two') {
        if (scored.length >= 2) consider(scored[0].s + scored[1].s - cost, { attackerId: f.instanceId, target: 'multi', options: { special: v.special, targets: [scored[0].t.instanceId, scored[1].t.instanceId] } });
        continue;
      }
      for (const { t, s } of scored) {
        const extra = v.special === 'catcheur-08' ? d.active.filter(x => x !== t).sort((a, b) => effective(state, 1 - pi, b).endurance - effective(state, 1 - pi, a).endurance)[0] : null;
        consider(s - cost, { attackerId: f.instanceId, target: t.instanceId, options: { special: v.special, secondTarget: extra?.instanceId ?? null } });
      }
      const directOk = combat.directAttackAllowed(state, pi) && (!v.special || (type === 'one' && combat.specialBonusAgainst(state, pi, f, null) != null));
      if (directOk) consider(hitScore(state, pi, null, combat.previewDamage(state, { ...base, targets: ['direct'] }, 'direct')) - cost, { attackerId: f.instanceId, target: 'direct', options: { special: v.special } });
    }
  }
  return best;
}

// ---------- Réponse à une attaque adverse ----------

export function shouldReact(state, pi) {
  const a = state.pendingAttack;
  if (!a || a.playerIndex === pi) return false;
  const p = state.players[pi], ids = a.targets ?? [a.targetId];
  if (ids[0] === 'direct') return a.attack >= 50 || p.hp - a.attack <= 100;
  return ids.length > 1 || ids.some(id => {
    const t = fightersOf(p).find(f => f.instanceId === id);
    return t && effective(state, pi, t).endurance <= a.attack && fighterValue(state, pi, t) >= 70;
  });
}
