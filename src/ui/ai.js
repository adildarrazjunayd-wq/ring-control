// Tour de l'IA à l'écran : le cerveau (src/engine/ai-brain.js) choisit, ce fichier enchaîne
// les actions avec des pauses et des annonces pour que le joueur suive ce qui se passe.
import * as effects from '../engine/card-effects.js';
import * as brain from '../engine/ai-brain.js';
import { S, card, game, persist, hooks, esc } from './core.js';
import { animateAttack, whenShowsDone, resetSkip } from './fx.js';

const pause = (ms = 650) => new Promise(r => setTimeout(r, ms));
const step = async (ms) => { persist(); hooks.render(); await pause(ms); };

// Le joueur peut-il répondre à l'attaque annoncée ? Si oui, l'IA attend sa décision.
// Le joueur `pi` peut-il répondre à l'attaque annoncée contre lui (Momentum rapide ou effet) ?
export function canReact(m, pi) {
  const a = m.pendingAttack, p = m.players[pi];
  if (!a || a.playerIndex === pi) return false;
  const momentum = m.outOfTurnMomentumUsed[pi] < 1 && !(p.status.noMomentumThroughTurn >= m.turnNumber)
    && p.hand.some(id => card(id)?.category === 'Momentum' && card(id).rapid && effects.momentumRequirement(m, pi, card(id)).ok);
  return momentum || game.reactionOptions(m, pi).length > 0;
}
export const playerCanReact = m => canReact(m, 0);

export async function runAI() {
  const m = S.match;
  if (!m || m.turn !== 1 || m.winner !== null || S.busy || S.online) return; // en ligne, pas d'IA
  S.busy = true;
  try {
    resetSkip();
    await pause(500);
    if (m.phase === 'actions') {
      const skip = new Set();
      for (let i = 0; i < 20 && m.turn === 1 && m.winner === null; i += 1) {
        const action = brain.bestMainAction(m, 1, skip);
        if (!action) break;
        const before = m.history.length;
        const result = action.run();
        if (result && result.ok === false) { skip.add(action.label); continue; }
        if (m.history.length === before) skip.add(action.label); // rien ne s'est passé : ne pas boucler
        await step(350);
        await whenShowsDone(); // chaque carte de l'IA attend ton « OK »
      }
      if (m.turn !== 1 || m.winner !== null) return;
      m.phase = 'attacks';
      await step(400);
    }
    for (let i = 0; i < 8; i += 1) {
      if (m.turn !== 1 || m.winner !== null || m.pendingAttack) break;
      const plan = brain.bestAttack(m, 1);
      if (!plan) break;
      const r = game.declareAttack(m, 1, plan.attackerId, plan.target, plan.options);
      if (!r.ok) break;
      await step(350);
      await whenShowsDone();
      if (playerCanReact(m)) return; // reprise après « Laisser passer » ou la réponse
      await animateAttack(m.pendingAttack);
      if (m.pendingAttack) game.resolveAttack(m);
      await step();
      await whenShowsDone();
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

// Pendant le tour du joueur, l'IA répond quand le coup lui ferait vraiment mal.
export function aiReact(m) {
  if (S.online) return false;
  const p = m.players[1];
  if (!brain.shouldReact(m, 1)) return false;
  const answer = game.reactionOptions(m, 1)[0];
  if (answer) return game.useReaction(m, 1, answer.key, answer.fighterId ?? null).ok;
  if (m.outOfTurnMomentumUsed[1] >= 1 || p.status.noMomentumThroughTurn >= m.turnNumber) return false;
  // Tous pour un (si la cible est un membre d'Evolution) passe avant le Contre.
  const rapid = ['evo-09', 'momentum-20'].find(id => p.hand.includes(id) && effects.momentumRequirement(m, 1, card(id)).ok);
  return rapid ? game.playMomentum(m, 1, card(rapid)).ok : false;
}
