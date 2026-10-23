// Écran « VERSUS » avant chaque partie (contre l'IA ou en ligne), façon jeu de combat :
// la carte maîtresse de chaque deck arrive de chaque côté, puis un gros « VS ».
import { card, esc } from './core.js';
import { sfx } from './sound.js';

// Carte maîtresse d'un deck : celle choisie pour le deck (`star`), sinon le catcheur le plus fort de la faction
// la plus présente, sinon le catcheur le plus fort du deck (SSR d'abord).
const RARITY = { SSR: 2, SR: 1, R: 0 };
export function deckStar(cards = [], star = null) {
  if (star && card(star)) return star;
  const wrestlers = [...new Set(cards)].map(card).filter(c => c?.category === 'Catcheur');
  if (!wrestlers.length) return cards[0] ?? null;
  const factions = wrestlers.filter(c => c.faction).map(c => c.faction);
  const main = factions.sort((a, b) => factions.filter(f => f === b).length - factions.filter(f => f === a).length)[0];
  const score = c => (c.faction && c.faction === main ? 1000 : 0) + (RARITY[c.rarity] ?? 0) * 200 + c.attack + c.endurance;
  return wrestlers.sort((a, b) => score(b) - score(a))[0].id;
}

// left / right : { cardId, player, deck }. Se ferme seul après quelques secondes, ou au clic / à une touche.
export function showVersus(left, right) {
  return new Promise(resolve => {
    const side = (s, cls) => {
      const c = card(s.cardId);
      return `<div class="vs-side ${cls}"><div class="vs-card"><img src="${c?.image ?? ''}" alt=""></div>
        <div class="vs-tag"><small>${esc(s.player)}</small><b>${esc(c?.displayName ?? '')}</b><span>${esc(s.deck ?? '')}</span></div></div>`;
    };
    const el = document.createElement('div');
    el.className = 'versus';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `${left.deck} contre ${right.deck}`);
    el.innerHTML = `${side(left, 'left')}${side(right, 'right')}<div class="vs-mid"><span class="vs-word">VS</span></div><p class="vs-skip">Clique pour commencer</p>`;
    document.body.append(el);
    sfx('bell');
    setTimeout(() => sfx('hit'), 650);
    setTimeout(() => sfx('cheer'), 900);
    let done = false;
    const close = () => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey);
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 350);
    };
    const onKey = e => { if (['Enter', ' ', 'Escape'].includes(e.key)) { e.preventDefault(); close(); } };
    // Un clic trop rapide ne coupe pas l'entrée des cartes.
    setTimeout(() => { el.addEventListener('click', close); document.addEventListener('keydown', onKey); el.classList.add('ready'); }, 700);
    setTimeout(close, 4200);
  });
}
