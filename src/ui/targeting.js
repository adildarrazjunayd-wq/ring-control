// Mode « viser » : le joueur clique les cartes qui brillent sur le ring.
// S.targeting = { mode: 'attack', iid, special, ladder, discard, picked, pack?, packing? }
//            ou { mode: 'effect', kind: 'activate' | 'momentum', key, iid, specs, picked, name }.
// Attaque en meute : `packing` = on choisit d'abord les partenaires (mes catcheurs), puis la cible.
import * as combat from '../engine/combat.js';
import * as act from '../engine/activations.js';
import { S, card, esc } from './core.js';

const typeOf = t => (t.ladder ? 'all-active' : combat.ATTACK_SPECIALS[t.special]?.targets ?? 'one');

function attacker(m, t) { return m.players[0].active.find(f => f.instanceId === t.iid); }

export function directAllowed(m, t = S.targeting) {
  if (!t || t.mode !== 'attack' || typeOf(t) !== 'one' || t.picked.length || t.pack) return false; // la meute ne vise jamais les PV
  if (!combat.directAttackAllowed(m, 0) || combat.forcedTarget(m, 0)) return false;
  return !t.special || combat.specialBonusAgainst(m, 0, attacker(m, t), null) != null;
}

// Identifiants des catcheurs que l'on peut viser maintenant.
export function pickable(m, t = S.targeting) {
  if (!t) return new Set();
  if (t.mode === 'effect') return new Set(act.targetCandidates(m, 0, t.specs[t.picked.length] ?? {}).map(c => c.instanceId));
  const d = m.players[1], f = attacker(m, t), type = typeOf(t), picked = t.picked.map(x => x.instanceId);
  if (!f || type.startsWith('all')) return new Set();
  if (t.packing) return new Set(combat.packPartners(m, 0, f).filter(x => !t.pack.includes(x.instanceId)).map(x => x.instanceId));
  if (type === 'two') return new Set(d.active.filter(x => !picked.includes(x.instanceId)).map(x => x.instanceId));
  if (t.special === 'catcheur-08' && picked.length === 1) return new Set(d.active.filter(x => x.instanceId !== picked[0]).map(x => x.instanceId));
  const pool = combat.canHitPassive(m, 0, f) ? [...d.active, ...d.passive] : d.active;
  const guard = combat.forcedTarget(m, 0); // Big Show doit être attaqué en premier
  return new Set(pool.filter(x => (!guard || x.instanceId === guard) && (!m.usedTargets.includes(x.instanceId) || combat.canRetarget(m, 0, f)) && (!t.special || combat.specialBonusAgainst(m, 0, f, x) != null)).map(x => x.instanceId));
}

// Combien de cibles faut-il avant de lancer ?
export function needed(m, t = S.targeting) {
  if (t.mode === 'effect') return t.specs.length;
  const type = typeOf(t);
  if (type.startsWith('all')) return 0;
  if (type === 'two') return Math.min(2, m.players[1].active.length);
  if (t.special === 'catcheur-08') return 1 + (m.players[1].active.length > 1 ? 1 : 0);
  return 1;
}

export function targetingScreen(m) {
  const t = S.targeting;
  if (t.mode === 'effect') {
    const spec = t.specs[t.picked.length], who = spec?.side === 'me' ? 'un de tes catcheurs' : `un catcheur de ${esc(m.players[1].name)}`;
    const img = t.iid ? card([...m.players[0].active, ...m.players[0].passive].find(f => f.instanceId === t.iid)?.cardId)?.image : card(t.key.split(':')[0])?.image;
    if (t.kind === 'mark') return `<div class="tron targeting">${img ? `<img src="${img}" alt="">` : ''}<div class="tron-body"><span class="k">${esc(t.name)}</span><h2>🎯 QUI MARQUER ?</h2><p>Clique l’adversaire actif à marquer nWo (il brille sur le ring).</p></div></div>`;
    return `<div class="tron targeting">${img ? `<img src="${img}" alt="">` : ''}<div class="tron-body"><span class="k">${esc(t.name)}</span><h2>CHOISIS ${t.specs.length > 1 ? `LA CIBLE ${t.picked.length + 1}/${t.specs.length}` : 'LA CIBLE'}</h2><p>Clique ${who} qui brille sur le ring.</p><div class="tron-actions"><button class="btn ghost" data-act="cancelTarget">Annuler</button></div></div></div>`;
  }
  const f = attacker(m, t);
  if (!f) return '';
  const type = typeOf(t), sp = combat.ATTACK_SPECIALS[t.special];
  if (t.pack) return packScreen(m, t, f, sp);
  const name = t.ladder ? 'ÉCHELLE' : sp ? sp.name.toUpperCase() : 'ATTAQUE';
  const text = type.startsWith('all') ? `Frappe ${type === 'all-ring' ? 'tous les catcheurs' : 'tous les catcheurs actifs'} de ${esc(m.players[1].name)}.`
    : type === 'two' ? `Clique deux catcheurs actifs de ${esc(m.players[1].name)} (${t.picked.length}/${needed(m, t)}).`
    : t.special === 'catcheur-08' && t.picked.length ? 'Choisis l’autre catcheur actif dont l’END sera réduite de moitié.'
    : `Clique un catcheur de ${esc(m.players[1].name)} qui brille.${directAllowed(m, t) ? ' Ou frappe directement ses PV.' : ''}`;
  const buttons = [
    directAllowed(m, t) ? '<button class="btn hot" data-act="target" data-target="direct">Attaque directe ▶</button>' : '',
    type.startsWith('all') ? '<button class="btn hot" data-act="launch">Lancer l’attaque ▶</button>' : '',
    t.special === 'catcheur-08' && t.picked.length === 1 ? '<button class="btn" data-act="launch">Sans deuxième cible</button>' : '',
    '<button class="btn ghost" data-act="cancelTarget">Annuler</button>',
  ].join('');
  return `<div class="tron targeting"><img src="${card(f.cardId).image}" alt=""><div class="tron-body"><span class="k">COMBAT · ${combat.effective(m, 0, f).attack} ATT</span><h2>${esc(name)}</h2><p>${text}</p><div class="tron-actions">${buttons}</div></div></div>`;
}

// Attaque en meute : 1) les partenaires, 2) la cible adverse.
function packScreen(m, t, f, sp) {
  const me = m.players[0], crew = [f, ...t.pack.map(id => me.active.find(x => x.instanceId === id)).filter(Boolean)];
  const names = crew.map(x => esc(card(x.cardId).displayName)).join(' + '), max = combat.packMax(m, 0);
  const title = `ATTAQUE EN MEUTE${sp ? ` · ${sp.name.toUpperCase()}` : ''}`;
  const text = t.packing
    ? `Clique le membre d’Evolution qui frappe avec ${names} (il brille sur ton ring)${max > 1 ? ` · jusqu’à ${max} partenaires avec Assaut Total` : ''}.`
    : `${names} frappent ensemble. Clique le catcheur de ${esc(m.players[1].name)} qui brille. Tous les participants se reposeront au tour suivant.`;
  const go = t.packing && t.pack.length ? `<button class="btn hot" data-act="packGo">Continuer à ${crew.length} ▶</button>` : '';
  return `<div class="tron targeting"><img src="${card(f.cardId).image}" alt=""><div class="tron-body"><span class="k">🐺 MEUTE · ${crew.length} catcheur${crew.length > 1 ? 's' : ''}</span><h2>${esc(title)}</h2><p>${text}</p><div class="tron-actions">${go}<button class="btn ghost" data-act="cancelTarget">Annuler</button></div></div></div>`;
}
