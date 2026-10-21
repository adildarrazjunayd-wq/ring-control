// Bonus, combat et déclencheurs automatiques des cartes.
// Règles d'application : docs/DECISIONS-REGLES.md (effets continus, déclenchés, attaques spéciales).
import { addHistory, lookupCard, sendFighterToGrave, finishMatch, legalPositions } from './game-engine.js';

// ---------- Outils ----------

const NAME_FIX = { 'roman reings': 'roman reigns', 'shawn michael': 'shawn michaels' };
export const nameOf = id => { const n = (lookupCard(id)?.displayName ?? '').toLowerCase(); return NAME_FIX[n] ?? n; };
export const is = (id, name) => nameOf(id) === name;
export const fightersOf = p => [...p.active, ...p.passive];
const factionOf = id => lookupCard(id)?.faction ?? null;
const label = id => lookupCard(id)?.displayName ?? 'Le catcheur';
const findFighter = (p, id) => fightersOf(p).find(f => f.instanceId === id);

// « Annule tous les effets adverses » (Randy Orton, Acknowledge Me) coupe tous les effets du joueur visé.
export const effectsOff = (state, pi) => (state.players[pi].status.effectsCancelledThroughTurn ?? 0) >= state.turnNumber;
// Un effet passif ne marche que si le joueur l'a activé (choix du propriétaire) : il dure jusqu'au début
// du tour suivant de son propriétaire, donc il protège aussi pendant le tour adverse.
export const passiveOn = (state, pi, f) => (f.passiveActiveUntil ?? 0) >= state.turnNumber && !effectsOff(state, pi) && !((f.passivesOffUntil ?? 0) >= state.turnNumber);
const has = (state, pi, f, id) => f.cardId === id && passiveOn(state, pi, f);
const onRing = (state, pi, id, zone) => (zone ? state.players[pi][zone] : fightersOf(state.players[pi])).find(f => has(state, pi, f, id));
const objectsOf = (state, pi, f) => (effectsOff(state, pi) ? [] : state.players[pi].objects.filter(o => o.fighterId === f.instanceId).map(o => o.cardId));
const managerIs = (state, pi, id) => !effectsOff(state, pi) && state.players[pi].manager?.cardId === id;
const momentumPlayed = (state, pi) => (state.momentumsThisTurn?.[pi] ?? 0) > 0;

// « Tous les membres de la Bloodline » = Roman Reigns, Jey Uso, Jimmy Uso et Sami Zayn (réponse du propriétaire).
export const BLOODLINE_CORE = ['roman reigns', 'jey uso', 'jimmy uso', 'sami zayn'];
export const bloodlineComplete = (state, pi) => BLOODLINE_CORE.every(n => fightersOf(state.players[pi]).some(f => is(f.cardId, n)));
export const rassemblementActive = (state, pi) => !effectsOff(state, pi) && state.players[pi].ongoingMomentum.some(o => o.cardId === 'wyatt-13') && bloodlineComplete(state, pi);
// The Bloodline Rassemblement : les membres de la Bloodline peuvent attaquer les catcheurs passifs.
export const canHitPassive = (state, pi, f) => rassemblementActive(state, pi) && factionOf(f.cardId) === 'The Bloodline';

export function heal(state, pi, f, amount, why) {
  f.endurance += amount; // pas de plafond (décision du propriétaire)
  addHistory(state, `${why} : ${label(f.cardId)} regagne ${amount} END.`);
}

export function draw(state, pi, amount, why) {
  const p = state.players[pi], n = Math.min(amount, p.deck.length);
  for (let i = 0; i < n; i += 1) p.hand.push(p.deck.shift());
  if (n) addHistory(state, `${why} : ${p.name} pioche ${n} carte${n > 1 ? 's' : ''}.`);
}

export function addModifier(f, stat, value, until, source) {
  (f.modifiers ??= []).push({ stat, value, until, source });
}

// ---------- Bonus continus ----------

export function statBonus(state, pi, f) {
  const p = state.players[pi];
  let att = 0, end = 0;
  for (const m of f.modifiers ?? []) {
    if (m.until != null && m.until < state.turnNumber) continue;
    if (m.stat === 'attack') att += m.value; else end += m.value;
  }
  if (factionOf(f.cardId) === 'The Bloodline' && onRing(state, pi, 'catcheur-01')) att += 5;           // Roman Reigns : Domination absolue
  if (has(state, pi, f, 'catcheur-20') && p.active.length === 1 && p.active[0] === f) att += 10;       // Jey Uso : One-Man Show
  if (has(state, pi, f, 'catcheur-21') && p.active.some(x => is(x.cardId, 'jimmy uso'))) att += 5;      // Jey Uso : Frère inséparable
  if (has(state, pi, f, 'catcheur-22') && p.active.some(x => is(x.cardId, 'jey uso'))) end += 5;        // Jimmy Uso : Duo de choc
  if (has(state, pi, f, 'catcheur-25')) att += 10;                                                     // Rey Mysterio
  if (onRing(state, pi, 'catcheur-34', 'active')) { att += 5; end += 5; }
  if (factionOf(f.cardId) === 'The Bloodline' && rassemblementActive(state, pi)) att += 10;           // The Bloodline Rassemblement                              // Cody Rhodes : Héritier de la gloire
  if (managerIs(state, pi, 'managers-01') && f.position === 'active' && (is(f.cardId, 'roman reigns') || is(f.cardId, 'brock lesnar'))) { att += 10; end += 10; } // Paul Heyman
  if (managerIs(state, pi, 'managers-03') && p.active.some(x => factionOf(x.cardId))) att += 10;       // Triple H (manager)
  for (const o of objectsOf(state, pi, f)) {
    if (o === 'objets-05') att += 10;                                                                  // Ceinture Universelle
    if (o === 'objets-08') end += 10;                                                                  // Ceinture « The Champ »
    if (o === 'wyatt-07' && is(f.cardId, 'bray wyatt')) { att += 10; end -= 10; }                      // Lanterne de l'obscurité
  }
  return { att, end };
}

export function effective(state, pi, f) {
  const b = statBonus(state, pi, f);
  return { attack: f.attack + b.att, endurance: f.endurance + b.end, bonusAtt: b.att, bonusEnd: b.end };
}

// ---------- Attaques spéciales (effet spécial utilisé au moment d'attaquer) ----------
// bonus(ctx) renvoie le bonus de dégâts, ou null si la condition imprimée n'est pas remplie.
// targets : 'one' (actif adverse ou PV), 'fighter' (actif adverse seulement), 'two' (deux actifs),
// 'all-active' (tous les actifs adverses), 'all-ring' (tous les catcheurs adverses).
const shieldMates = (state, pi, f) => state.players[pi].active.filter(x => x !== f && factionOf(x.cardId) === 'The Shield').length;
export const ATTACK_SPECIALS = Object.freeze({
  'catcheur-02': { name: 'Rock Bottom', targets: 'fighter', bonus: c => (c.tEnd < 70 ? 10 : null) },
  'catcheur-03': { name: 'F-5', targets: 'one', bonus: c => (c.f.wasAttacked ? 20 : null) },
  'catcheur-05': { name: 'Shield Bomb', targets: 'one', bonus: c => (shieldMates(c.state, c.pi, c.f) >= 2 ? 15 : null) },
  'catcheur-06': { name: 'Leap of Faith', targets: 'all-ring', bonus: () => 10 },
  'catcheur-08': { name: 'Triple Powerbomb', targets: 'fighter', bonus: c => (shieldMates(c.state, c.pi, c.f) >= 2 ? 25 : null) },
  'catcheur-09': { name: 'KO Stunner', targets: 'one', bonus: c => (c.p.active.length === 1 ? 20 : null) },
  'catcheur-12': { name: 'Powerbomb Symphony', targets: 'one', bonus: c => (c.f.wasAttacked ? 15 : null) },
  'catcheur-14': { name: 'Styles Clash', targets: 'one', bonus: c => (momentumPlayed(c.state, c.pi) ? 15 : null) },
  'catcheur-15': { name: 'Coup de Grâce', targets: 'fighter', bonus: c => (c.tEnd < 80 ? 0 : null), double: true },
  'catcheur-17': { name: 'Kinshasa', targets: 'one', bonus: () => 15, pierce: true },
  'catcheur-19': { name: 'Running Powerslam', targets: 'fighter', bonus: c => (c.tEnd > 80 ? 20 : null) },
  'catcheur-20': { name: 'Solo Superkick', targets: 'one', bonus: () => 20 },
  'catcheur-21': { name: 'Uso Splash', targets: 'one', bonus: c => (c.f.tookDamage ? 15 : null) },
  'catcheur-22': { name: 'Double Superkick', targets: 'two', bonus: () => 10 },
  'catcheur-23': { name: 'Samoan Spike', targets: 'fighter', bonus: c => (c.tEnd < 75 ? 20 : null) },
  'catcheur-24': { name: 'Spear', targets: 'fighter', bonus: c => (c.tEnd > 80 ? 15 : null) },
  'catcheur-25': { name: '619', targets: 'fighter', bonus: c => (c.tEnd < 80 ? 20 : null) },
  'catcheur-26': { name: 'Big Ending', targets: 'fighter', bonus: () => 25 },
  'catcheur-27': { name: 'Trouble in Paradise', targets: 'one', bonus: c => (momentumPlayed(c.state, c.pi) ? 15 : null) },
  'catcheur-34': { name: 'Cross Rhodes Exalté', targets: 'fighter', bonus: () => 25 },
  'catcheur-35': { name: 'You Can’t See Me', targets: 'fighter', bonus: () => 15 },
  'catcheur-36': { name: 'Go to Sleep', targets: 'fighter', bonus: () => 25, cost: 'momentum' },
  'catcheur-39': { name: 'Sister Abigail', targets: 'one', bonus: () => 25 },
  'wyatt-04': { name: 'Prise de contrôle', targets: 'fighter', bonus: () => 0 },
  'wyatt-08': { name: 'Attaque totale', targets: 'all-active', bonus: c => (effective(c.state, c.pi, c.f).endurance <= 55 ? 0 : null) },
});

export function specialAvailable(state, pi, f) {
  const sp = ATTACK_SPECIALS[f.cardId];
  if (!sp || f.specialUsed || f.position !== 'active') return null;
  if (sp.cost === 'momentum' && !state.players[pi].hand.some(id => lookupCard(id)?.category === 'Momentum')) return null;
  return sp;
}

// Le bonus d'une attaque spéciale contre une cible donnée (null = interdit).
export function specialBonusAgainst(state, pi, f, target) {
  const sp = specialAvailable(state, pi, f);
  if (!sp) return null;
  const tEnd = target ? effective(state, 1 - pi, target).endurance : null;
  if (!target && (sp.targets !== 'one')) return null;
  return sp.bonus({ state, pi, f, p: state.players[pi], target, tEnd });
}

// ---------- Calcul des dégâts ----------

function offense(state, a, f, target) {
  const pi = a.playerIndex, p = state.players[pi];
  const eff = effective(state, pi, f), tEnd = target ? effective(state, 1 - pi, target).endurance : null;
  let dmg = a.ladder ? 10 : eff.attack;
  if (a.ladder) return dmg;
  if (f.cardId === 'catcheur-18' && state.botteCeltesBoostPlayer === pi && state.botteCeltesBoostTurn === state.turnNumber) dmg += 15;
  if (passiveOn(state, pi, f)) {
    const mp = momentumPlayed(state, pi);
    if (f.cardId === 'catcheur-04' && mp) dmg += 5;                                                     // Seth Rollins : Opportuniste suprême
    if (f.cardId === 'catcheur-05' && f.tookDamage) dmg += 15;                                         // Dean Ambrose : Insaisissable
    if (f.cardId === 'catcheur-06' && state.usedAttackers.some(id => id !== f.instanceId && factionOf(findFighter(p, id)?.cardId) === 'The Shield')) dmg += 5;
    if (f.cardId === 'catcheur-08' && a.first) dmg += 5;                                               // Roman Reigns : Force brute
    if (f.cardId === 'catcheur-10' && eff.endurance > 30) dmg += 5;                                    // Drew McIntyre
    if (f.cardId === 'catcheur-11' && target && tEnd < 75) dmg += 5;                                   // Bobby Lashley
    if (f.cardId === 'catcheur-14' && target && tEnd < 80) dmg += 5;                                   // AJ Styles
    if (f.cardId === 'catcheur-15' && target && tEnd > 85) dmg += 10;                                  // Finn Balor
    if (f.cardId === 'catcheur-24' && mp) dmg += 5;                                                    // Edge
  }
  for (const o of objectsOf(state, pi, f)) {
    if (o === 'objets-02') dmg += 10;                                                                  // Bâton de Kendo
    if (o === 'objets-03' && target) dmg += 15;                                                        // Chaise en acier
    if (o === 'objets-04' && eff.attack >= 50) dmg += 20;                                              // Table
  }
  if (a.special) {
    const sp = ATTACK_SPECIALS[a.special];
    dmg += sp.bonus({ state, pi, f, p, target, tEnd }) ?? 0;
    if (sp.double) dmg *= 2;
  }
  return dmg;
}

function defense(state, a, f, target, dmg) {
  const di = 1 - a.playerIndex, d = state.players[di];
  const pierce = (f.cardId === 'catcheur-03' && passiveOn(state, a.playerIndex, f)) || ATTACK_SPECIALS[a.special]?.pierce;
  if (pierce) return Math.max(0, dmg);
  if (target && passiveOn(state, di, target)) {
    if (target.cardId === 'catcheur-12') dmg -= 10;                                                    // Gunther : Mur invincible
    if (target.cardId === 'catcheur-19') dmg -= 5;                                                     // Braun Strowman
    if (target.cardId === 'catcheur-20' && d.active.length === 1) dmg -= 5;                            // Jey Uso : One-Man Show
  }
  if (onRing(state, di, 'catcheur-39', 'active')) dmg -= 10;                                           // Bray Wyatt : Manipulation mentale
  if ((d.status.damageReductionUntil ?? 0) >= state.turnNumber && !effectsOff(state, di)) dmg -= 40;  // Défense inébranlable
  if ((f.halfDamageUntil ?? 0) >= state.turnNumber) dmg = Math.floor(dmg / 2);                         // Damien Priest : South of Heaven
  return Math.max(0, dmg);
}

export function previewDamage(state, a, targetId = a.targets?.[0]) {
  const p = state.players[a.playerIndex], f = p.active.find(x => x.instanceId === a.attackerId);
  if (!f) return 0;
  const target = targetId && targetId !== 'direct' ? findFighter(state.players[1 - a.playerIndex], targetId) : null;
  return defense(state, a, f, target, offense(state, a, f, target));
}

// ---------- Mise K.-O. ----------

// Un catcheur est K.-O. dès que son END effective (bonus compris) tombe à 0 ou moins.
export function checkKOs(state, killer = null) {
  let again = true;
  while (again) {
    again = false;
    for (const pi of [0, 1]) {
      for (const f of fightersOf(state.players[pi])) {
        if (effective(state, pi, f).endurance <= 0) { knockOut(state, pi, f, killer); again = true; break; }
      }
    }
  }
  for (const pi of [0, 1]) {
    const p = state.players[pi];
    for (const f of fightersOf(p)) delete f.endBeforeHit;
    // The Bloodline Rassemblement ne reste active que si les quatre membres sont sur le ring.
    const at = p.ongoingMomentum.findIndex(o => o.cardId === 'wyatt-13');
    if (at >= 0 && !bloodlineComplete(state, pi)) {
      p.ongoingMomentum.splice(at, 1);
      p.grave.push('wyatt-13');
      addHistory(state, 'The Bloodline Rassemblement quitte le jeu : la Bloodline n’est plus au complet.');
    }
  }
}

function knockOut(state, pi, f, killer) {
  const p = state.players[pi];
  // Jey Uso (wyatt-09) : il est mis K.O. à la place de Roman Reigns, qui reste sur le ring sans subir le coup.
  const stand = is(f.cardId, 'roman reigns') && fightersOf(p).find(x => x !== f && has(state, pi, x, 'wyatt-09'));
  if (stand) {
    f.endurance = Math.max(f.endBeforeHit ?? -Infinity, 1 - statBonus(state, pi, f).end);
    addHistory(state, 'Jey Uso est mis K.O. à la place de Roman Reigns.');
    knockOut(state, pi, stand, killer);
    return;
  }
  const cena = p.active.find(x => x !== f && has(state, pi, x, 'catcheur-35'));
  // Bray Wyatt (SSR) : prise de contrôle du catcheur mis K.-O. par son attaque spéciale.
  if (killer?.steal && killer.pi !== pi) {
    const thief = state.players[killer.pi], pos = legalPositions(thief)[0];
    if (pos) {
      const zone = f.position === 'passive' ? p.passive : p.active;
      zone.splice(zone.indexOf(f), 1);
      for (const o of p.objects.filter(x => x.fighterId === f.instanceId)) p.grave.push(o.cardId);
      p.objects = p.objects.filter(x => x.fighterId !== f.instanceId);
      Object.assign(f, { position: pos, endurance: Math.floor((lookupCard(f.cardId).endurance ?? 0) / 2), modifiers: [], specialUsed: false });
      thief[pos].push(f);
      addHistory(state, `Bray Wyatt prend le contrôle de ${label(f.cardId)} (END réduite de moitié).`);
      return;
    }
  }
  sendFighterToGrave(state, pi, f, 'K.-O.');
  state.koThisTurn ??= [0, 0];
  state.koThisTurn[pi] += 1;
  if (cena) draw(state, pi, 1, 'John Cena : Never Give Up');
  // Shawn Michaels : Boy Toy — le catcheur qui l'a mis K.-O. subit 25 dégâts.
  if (f.cardId === 'catcheur-32' && killer && !effectsOff(state, pi)) {
    const k = findFighter(state.players[killer.pi], killer.instanceId);
    if (k) { k.endurance -= 25; addHistory(state, `Shawn Michaels : Boy Toy inflige 25 dégâts à ${label(k.cardId)}.`); }
  }
}

// ---------- Résolution d'une attaque ----------

export function resolveCombat(state, a) {
  const pi = a.playerIndex, di = 1 - pi, p = state.players[pi], d = state.players[di];
  const f = p.active.find(x => x.instanceId === a.attackerId);
  if (!f) { addHistory(state, 'L’attaquant a quitté le ring : l’attaque est perdue.'); return; }
  const killer = { pi, instanceId: f.instanceId, steal: a.special === 'wyatt-04' };
  if (a.targets[0] === 'direct') {
    const dmg = previewDamage(state, a, 'direct');
    d.hp -= dmg;
    addHistory(state, `${label(f.cardId)} inflige ${dmg} dégâts directs. ${d.name} passe à ${d.hp} PV.`);
  }
  const hit = [];
  for (const id of a.targets) {
    if (id === 'direct') continue;
    const target = fightersOf(d).find(x => x.instanceId === id);
    if (!target) { addHistory(state, 'La cible a quitté le ring.'); continue; }
    const before = effective(state, di, target).endurance;
    let dmg = previewDamage(state, a, id);
    if (a.special === 'catcheur-20' && before > 80) dmg += 10;                                         // Solo Superkick : -10 END de plus
    target.endBeforeHit = target.endurance;
    target.endurance -= dmg;
    target.wasAttacked = true;
    if (dmg > 0) target.tookDamage = true;
    addHistory(state, `${label(f.cardId)} inflige ${dmg} dégâts à ${label(target.cardId)} : END ${effective(state, di, target).endurance}.`);
    hit.push(target);
  }
  afterAttack(state, a, f, hit);
  checkKOs(state, killer);
  // Soins des survivants « après avoir subi une attaque ».
  for (const t of hit) {
    if (!fightersOf(d).includes(t)) continue;
    if (has(state, di, t, 'catcheur-07')) heal(state, di, t, 10, 'Dean Ambrose : Résilience folle');
    if (has(state, di, t, 'catcheur-18')) heal(state, di, t, 5, 'Sheamus : Endurance celtique');
    if (d.active.some(x => has(state, di, x, 'catcheur-35'))) heal(state, di, t, 10, 'John Cena : Never Give Up');
  }
  if (a.special === 'catcheur-34') {
    const t = hit[0];
    if (t && fightersOf(d).includes(t) && effective(state, di, t).endurance < 50) { t.passivesOffUntil = state.turnNumber + 1; addHistory(state, `Cross Rhodes : les effets passifs de ${label(t.cardId)} sont annulés jusqu’à la fin de son prochain tour.`); }
    if (t && !fightersOf(d).includes(t)) for (const x of p.active) heal(state, pi, x, 10, 'Cross Rhodes Exalté');
  }
  if (a.special === 'catcheur-36') {
    const t = hit[0];
    if (t && fightersOf(d).includes(t) && effective(state, di, t).endurance < 50) {
      t.noAttackUntil = state.turnNumber + 1;
      d.status.noMomentumThroughTurn = Math.max(d.status.noMomentumThroughTurn ?? 0, state.turnNumber + 1);
      addHistory(state, `Go to Sleep : ${label(t.cardId)} ne pourra ni attaquer ni jouer de Momentum au prochain tour.`);
    }
  }
  if (a.special === 'catcheur-39' && hit[0] && fightersOf(d).includes(hit[0])) { hit[0].noAttackUntil = state.turnNumber + 1; addHistory(state, `Sister Abigail : ${label(hit[0].cardId)} ne pourra pas attaquer au prochain tour.`); }
  if (a.special === 'catcheur-08' && a.secondTarget) {
    const t2 = d.active.find(x => x.instanceId === a.secondTarget);
    if (t2) { const cut = Math.ceil(effective(state, di, t2).endurance / 2); t2.endurance -= cut; addHistory(state, `Triple Powerbomb : l’END de ${label(t2.cardId)} est réduite de moitié.`); checkKOs(state, killer); }
  }
  if (d.hp <= 0 && state.winner === null) finishMatch(state, pi, `${d.name} tombe à ${d.hp} PV.`);
}

function afterAttack(state, a, f, hit) {
  const pi = a.playerIndex, p = state.players[pi], d = state.players[1 - pi];
  const on = passiveOn(state, pi, f);
  if (on && f.cardId === 'catcheur-02') draw(state, pi, 1, 'The Rock : Charisme légendaire');
  if (on && f.cardId === 'catcheur-09') heal(state, pi, f, 10, 'Kevin Owens : Résilience du combattant');
  if (on && f.cardId === 'catcheur-16' && (hit.length || a.targets[0] === 'direct')) heal(state, pi, f, 5, 'Damien Priest : Équilibre du jugement');
  if (on && f.cardId === 'catcheur-04' && momentumPlayed(state, pi)) heal(state, pi, f, 5, 'Seth Rollins : Opportuniste suprême');
  if (a.special === 'catcheur-05' || a.special === 'catcheur-35') {
    d.status.noMomentumThroughTurn = Math.max(d.status.noMomentumThroughTurn ?? 0, a.special === 'catcheur-35' ? state.turnNumber + 1 : state.turnNumber);
  }
  if (a.ladder) { f.endurance -= 10; addHistory(state, `Échelle : ${label(f.cardId)} subit -10 END.`); return; }
  for (const o of [...objectsOf(state, pi, f)]) {
    if (o === 'objets-02') { d.status.noMomentumThroughTurn = Math.max(d.status.noMomentumThroughTurn ?? 0, state.turnNumber + 1); addHistory(state, `Bâton de Kendo : ${d.name} ne pourra pas jouer de Momentum au prochain tour.`); }
    if (o === 'objets-03' && hit.length) { f.endurance -= 5; addHistory(state, `Chaise en acier : ${label(f.cardId)} perd 5 END.`); }
    if (o === 'objets-04' && effective(state, pi, f).attack >= 50) {
      const at = p.objects.findIndex(x => x.fighterId === f.instanceId && x.cardId === 'objets-04');
      p.grave.push(p.objects.splice(at, 1)[0].cardId);
      addHistory(state, 'La Table est détruite après utilisation.');
    }
  }
  const ange = (f.modifiers ?? []).find(m => m.source === 'momentum-03' && m.until >= state.turnNumber && !m.paid);
  if (ange) { ange.paid = true; f.endurance -= 5; addHistory(state, `Saut de l’ange : ${label(f.cardId)} perd 5 END après l’attaque.`); }
}

// ---------- Début de tour ----------

export function startOfTurn(state, pi) {
  const p = state.players[pi];
  state.momentumsThisTurn = [0, 0];
  state.koThisTurn = [0, 0];
  state.extraAttacks = {};
  p.limits.extraNormal = 0;
  for (const f of fightersOf(p)) f.modifiers = (f.modifiers ?? []).filter(m => m.until == null || m.until >= state.turnNumber);
  if (!effectsOff(state, pi)) {
    for (const o of p.objects) {
      const f = findFighter(p, o.fighterId);
      if (!f) continue;
      if (o.cardId === 'objets-05' && is(f.cardId, 'roman reigns')) heal(state, pi, f, 5, 'Ceinture Universelle');
      if (o.cardId === 'objets-07' && ['catcheur-08', 'catcheur-06', 'catcheur-03'].includes(f.cardId)) { f.attack += 5; addHistory(state, `Ceinture poids lourd : ${label(f.cardId)} gagne +5 ATT.`); }
      if (o.cardId === 'objets-07') p.limits.momentum = Math.min(p.limits.momentum, -1);
    }
  }
  if (p.status.extraMomentumTurn === state.turnNumber) { p.limits.momentum -= 1; addHistory(state, 'Le bras droit du chef tribal : 2 Momenta autorisés ce tour.'); }
}

// ---------- Droits d'attaque ----------

export function attacksAllowed(state, pi, f) {
  let n = 1 + (state.extraAttacks?.[f.instanceId] ?? 0);
  const p = state.players[pi];
  if (has(state, pi, f, 'wyatt-08') && bloodlineComplete(state, pi)) n += 1;                           // Roman Reigns : 2 attaques
  if (has(state, pi, f, 'catcheur-06') && state.usedAttackers.some(id => id !== f.instanceId && factionOf(findFighter(p, id)?.cardId) === 'The Shield')) n += 1;
  return n;
}

export function attacksUsed(state, f) { return state.usedAttackers.filter(id => id === f.instanceId).length; }

export function canAttack(state, pi, f) {
  if (f.position !== 'active') return { ok: false, reason: 'Seuls les catcheurs actifs peuvent attaquer.' };
  if ((f.noAttackUntil ?? 0) >= state.turnNumber) return { ok: false, reason: `${label(f.cardId)} ne peut pas attaquer ce tour.` };
  if (attacksUsed(state, f) >= attacksAllowed(state, pi, f)) return { ok: false, reason: 'Ce catcheur a déjà attaqué ce tour.' };
  return { ok: true };
}
