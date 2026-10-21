// IA locale : joue son tour seule, puis rend la main au joueur.
import * as effects from '../engine/card-effects.js';
import * as combat from '../engine/combat.js';
import * as activ from '../engine/activations.js';
import { S, card, game, persist, hooks } from './core.js';
import { animateAttack, banner } from './fx.js';

const pause = (ms = 650) => new Promise(r => setTimeout(r, ms));
const step = async (ms) => { persist(); hooks.render(); await pause(ms); };

// Le joueur peut-il répondre à l'attaque annoncée ? Si oui, l'IA attend sa décision.
export function playerCanReact(m) {
  const a = m.pendingAttack, p = m.players[0];
  if (!a || a.playerIndex !== 1) return false;
  const momentum = m.outOfTurnMomentumUsed[0] < 1 && !(p.status.noMomentumThroughTurn >= m.turnNumber)
    && p.hand.some(id => card(id)?.category === 'Momentum' && card(id).rapid && effects.momentumRequirement(m, 0, card(id)).ok);
  return momentum || game.reactionOptions(m, 0).length > 0;
}

function summon(m) {
  const p = m.players[1];
  const fighters = p.hand.map(card).filter(c => c?.category === 'Catcheur').sort((a, b) => b.attack - a.attack);
  for (const c of fighters) {
    let sacrifices = [];
    if (c.rarity === 'SSR' && !p.status.freeSsrSummon) {
      const board = [...p.active, ...p.passive].map(f => ({ f, c: card(f.cardId) })).sort((a, b) => a.f.endurance - b.f.endurance);
      const sr = board.find(x => x.c.rarity === 'SR'), rs = board.filter(x => x.c.rarity === 'R');
      if (sr) sacrifices = [sr.f.instanceId];
      else if (rs.length >= 2) sacrifices = rs.slice(0, 2).map(x => x.f.instanceId);
      else continue;
    }
    const position = game.legalPositions(p)[0];
    if (position && game.normalSummon(m, 1, c, sacrifices, position).ok) return true;
  }
  return false;
}

function playMomentum(m) {
  const p = m.players[1];
  for (const id of p.hand) {
    const c = card(id);
    if (c?.category !== 'Momentum' || c.rapid || p.limits.momentum >= 1) continue;
    if (!effects.momentumRequirement(m, 1, c).ok) continue;
    const direct = game.DIRECT_SUMMON_RULES[c.id] && game.directSummonOptions(m, 1, c)[0];
    if (game.DIRECT_SUMMON_RULES[c.id] && !direct) continue;
    if (c.id === 'momentum-16' || c.id === 'momentum-24') continue; // choix trop riches : l'IA ne les joue pas encore
    if (!game.playMomentum(m, 1, c).ok) continue;
    if (direct) game.resolveDirectSummon(m, 1, c, direct.cardId, direct.positions[0]);
    else effects.autoResolveMomentum(m, 1, c);
    return c;
  }
  return null;
}

const end = (m, pi, f) => combat.effective(m, pi, f).endurance;

function chooseTarget(m, attacker) {
  const p = m.players[1], d = m.players[0];
  const targets = d.active.filter(t => !m.usedTargets.includes(t.instanceId));
  const direct = Math.max(0, p.active.length - d.active.length) > m.directAttacksUsed;
  const power = combat.effective(m, 1, attacker).attack;
  const ko = targets.filter(t => end(m, 0, t) <= power).sort((a, b) => combat.effective(m, 0, b).attack - combat.effective(m, 0, a).attack)[0];
  if (ko) return ko.instanceId;
  if (direct) return 'direct';
  return targets.sort((a, b) => end(m, 0, a) - end(m, 0, b))[0]?.instanceId ?? null;
}

// L'IA utilise son attaque spéciale dès que la condition imprimée est remplie.
function attackOptions(m, fighter, target) {
  const sp = combat.specialAvailable(m, 1, fighter);
  if (!sp || sp.cost) return {};
  const d = m.players[0];
  if (sp.targets === 'two') return d.active.length >= 2 ? { special: fighter.cardId, targets: d.active.slice(0, 2).map(f => f.instanceId) } : {};
  if (sp.targets.startsWith('all')) return d.active.length >= 2 && combat.specialBonusAgainst(m, 1, fighter, d.active[0]) != null ? { special: fighter.cardId } : {};
  const t = target === 'direct' ? null : d.active.find(f => f.instanceId === target);
  return combat.specialBonusAgainst(m, 1, fighter, t) != null ? { special: fighter.cardId } : {};
}

// L'IA active les effets de ses catcheurs : passifs, recherches et effets à cible (cible la plus forte).
function useEffects(m) {
  const p = m.players[1];
  let used = false;
  const strongest = list => list.map(t => ({ t, f: combat.fightersOf(m.players[t.pi]).find(x => x.instanceId === t.instanceId) })).sort((a, b) => combat.effective(m, a.t.pi, b.f).attack - combat.effective(m, a.t.pi, a.f).attack)[0]?.t;
  for (const f of combat.fightersOf(p)) {
    if (!combat.fightersOf(p).includes(f)) continue;
    for (const [kind, key] of [['passif', 'passive'], ['spécial', 'special']]) {
      if (!card(f.cardId)?.effects.some(e => e.kind === kind)) continue;
      const full = `${f.cardId}:${key}`, mode = activ.effectMode(f.cardId, kind, { attackSpecial: combat.ATTACK_SPECIALS, search: effects.SEARCH_RULES });
      if (mode === 'toggle' && f.passiveUsedTurn !== m.turnNumber) used = game.activateWrestlerEffect(m, 1, f.instanceId, 'passive').ok || used;
      else if (mode === 'search' && effects.searchOptions(m, 1, full).length && game.activateWrestlerEffect(m, 1, f.instanceId, key).ok) {
        effects.resolveSearch(m, 1, full, effects.searchOptions(m, 1, full)[0].cardId, card(f.cardId).displayName);
        used = true;
      } else if (mode === 'activated' && !activ.activationCheck(m, 1, full, f)) {
        const e = activ.ACTIVATED[full], option = e.summon ? activ.summonCandidates(m, 1, e.summon, { leaving: e.leaves ? f : null })[0] : null;
        const targets = (e.targets ?? []).map(spec => strongest(activ.targetCandidates(m, 1, spec)));
        used = activ.activate(m, 1, full, f.instanceId, { targets, cardId: option?.cardId, position: option?.positions[0] }).ok || used;
      }
    }
  }
  return used;
}

export async function runAI() {
  const m = S.match;
  if (!m || m.turn !== 1 || m.winner !== null || S.busy) return;
  S.busy = true;
  try {
    await pause(500);
    if (m.phase === 'actions') {
      if (summon(m)) await step();
      const p = m.players[1];
      const manager = p.hand.map(card).find(c => c?.category === 'Manager');
      if (manager && !p.manager && !p.limits.manager && game.playManager(m, 1, manager).ok) {
        if (['managers-02', 'managers-05'].includes(manager.id)) effects.managerEffect(m, 1);
        await step();
        if (manager.id === 'managers-02' && summon(m)) await step();
      }
      const object = p.hand.map(card).find(c => c?.category === 'Objet');
      const holder = [...p.active].sort((a, b) => b.attack - a.attack)[0];
      if (object && holder && !p.limits.object && game.equipObject(m, 1, object, holder.instanceId).ok) await step();
      const momentum = playMomentum(m);
      if (momentum) { banner(`L’IA joue <b>${momentum.displayName}</b>`); await step(900); }
      if (useEffects(m)) await step();
      m.phase = 'attacks';
      await step(400);
    }
    const p = m.players[1];
    for (const fighter of [...p.active]) {
      if (m.turn !== 1 || m.winner !== null || m.attackLock || p.status.noAttackThroughTurn >= m.turnNumber) break;
      if (m.pendingAttack) return; // une attaque attend la réponse du joueur
      if (!p.active.includes(fighter) || !combat.canAttack(m, 1, fighter).ok) continue;
      const target = chooseTarget(m, fighter);
      if (!target) continue;
      const options = attackOptions(m, fighter, target);
      if (!game.declareAttack(m, 1, fighter.instanceId, target, options).ok && !game.declareAttack(m, 1, fighter.instanceId, target).ok) continue;
      if (options.special) banner(`L’IA : <b>${combat.ATTACK_SPECIALS[options.special].name}</b>`);
      await step(350);
      if (playerCanReact(m)) return; // reprise après « Laisser passer » ou la réponse
      await animateAttack(m.pendingAttack);
      if (m.pendingAttack) game.resolveAttack(m);
      await step();
    }
    if (m.turn === 1 && m.winner === null && !m.pendingAttack) {
      game.endTurn(m);
      S.selected = null;
      persist();
      hooks.render();
    }
  } catch (error) {
    console.error('Erreur pendant le tour de l’IA', error);
  } finally {
    S.busy = false;
    persist();
  }
}

// Pendant le tour du joueur, l'IA répond à une attaque avec « Contre » si le coup fait mal.
export function aiReact(m) {
  const a = m.pendingAttack, p = m.players[1];
  if (!a || a.playerIndex !== 0) return false;
  const ids = a.targets ?? [a.targetId];
  const painful = ids[0] === 'direct' ? a.attack >= 50 : ids.some(id => { const t = p.active.find(f => f.instanceId === id); return t && end(m, 1, t) <= a.attack; }) || ids.length > 1;
  if (!painful) return false;
  const answer = game.reactionOptions(m, 1)[0];
  if (answer) return game.useReaction(m, 1, answer.key, answer.fighterId ?? null).ok;
  if (m.outOfTurnMomentumUsed[1] >= 1 || p.status.noMomentumThroughTurn >= m.turnNumber || !p.hand.includes('momentum-20')) return false;
  return game.playMomentum(m, 1, card('momentum-20')).ok;
}
