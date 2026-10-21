// Tour de l'IA à l'écran : le cerveau (src/engine/ai-brain.js) choisit, ce fichier enchaîne
// les actions avec des pauses et des annonces pour que le joueur suive ce qui se passe.
import * as effects from '../engine/card-effects.js';
import * as brain from '../engine/ai-brain.js';
import { S, card, game, persist, hooks, esc } from './core.js';
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

// Actions annoncées en grand (les petites, comme activer un passif, restent dans le journal).
const BIG = /^(invoque|joue|active Mr|active Stephanie|active Teddy|Appel|Famille|D-Generation|Hornswoggle|Guillotine|Sweet|Tsunami|Curb|Dirty|South|Prédateur)/;

export async function runAI() {
  const m = S.match;
  if (!m || m.turn !== 1 || m.winner !== null || S.busy) return;
  S.busy = true;
  try {
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
        await step(BIG.test(action.label) ? 1300 : 350); // laisse le temps de voir la carte montrée en grand
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
      if (plan.options.special) banner(`L’IA : <b>${esc(card(plan.options.special)?.effects.find(e => e.kind === 'spécial')?.text.split(':')[0] ?? 'attaque spéciale')}</b>`);
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

// Pendant le tour du joueur, l'IA répond quand le coup lui ferait vraiment mal.
export function aiReact(m) {
  const p = m.players[1];
  if (!brain.shouldReact(m, 1)) return false;
  const answer = game.reactionOptions(m, 1)[0];
  if (answer) return game.useReaction(m, 1, answer.key, answer.fighterId ?? null).ok;
  if (m.outOfTurnMomentumUsed[1] >= 1 || p.status.noMomentumThroughTurn >= m.turnNumber || !p.hand.includes('momentum-20')) return false;
  return game.playMomentum(m, 1, card('momentum-20')).ok;
}
