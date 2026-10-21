import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from '../src/engine/game-engine.js';
import * as combat from '../src/engine/combat.js';
import * as act from '../src/engine/activations.js';
import * as fx from '../src/engine/card-effects.js';

const cards = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));
const byId = id => cards.find(c => c.id === id);
game.configureCardLookup(byId);
const playable = cards.filter(c => c.playable);
const deck = Array.from({ length: 40 }, (_, i) => playable[i % playable.length].id);
let n = 0;
const slot = (id, pos = 'active') => ({ instanceId: `${id}#${n++}`, cardId: id, attack: byId(id).attack, endurance: byId(id).endurance, baseEndurance: byId(id).endurance, position: pos, specialUsed: false, passiveUsedTurn: 0, modifiers: [], passiveActiveUntil: 999 });
// Partie vide : joueur 0 en phase d'attaque, terrains fournis.
function duel(me = [], ai = [], phase = 'attacks') {
  const s = game.createMatch(deck, deck, { random: () => 0 });
  for (const p of s.players) { p.hand = []; p.deck = []; }
  s.players[0].active = me.map(id => slot(id));
  s.players[1].active = ai.map(id => slot(id));
  s.phase = phase;
  return s;
}
const hit = (s, a, t, opts) => { const r = game.declareAttack(s, 0, a.instanceId, t === 'direct' ? 'direct' : t.instanceId, opts); assert.equal(r.ok, true, r.reason); game.resolveAttack(s); };
const eff = (s, pi, f) => combat.effective(s, pi, f);

test('Roman Reigns donne +5 ATT à toute la Bloodline', () => {
  const s = duel(['catcheur-01', 'catcheur-21']);
  const [roman, jey] = s.players[0].active;
  assert.equal(eff(s, 0, jey).attack, 55);
  assert.equal(eff(s, 0, roman).attack, 75);
});

test('Paul Heyman : +10 ATT et +10 END à Roman Reigns actif', () => {
  const s = duel(['catcheur-01']);
  s.players[0].manager = { cardId: 'managers-01', used: false };
  const roman = s.players[0].active[0];
  assert.deepEqual([eff(s, 0, roman).attack, eff(s, 0, roman).endurance], [85, 115]);
});

test('Gunther réduit de 10 les dégâts reçus, Brock Lesnar ignore cette réduction', () => {
  const s = duel(['catcheur-11', 'catcheur-03'], ['catcheur-12', 'catcheur-19']);
  const [lashley, brock] = s.players[0].active, [gunther] = s.players[1].active;
  hit(s, lashley, gunther);
  assert.equal(gunther.endurance, 85 - 35);
  s.usedTargets = [];
  hit(s, brock, gunther);
  assert.equal(gunther.endurance, 50 - 65);
  assert.equal(s.players[1].active.includes(gunther), false);
});

test('Bobby Lashley inflige +5 à une cible de moins de 75 END', () => {
  const s = duel(['catcheur-11'], ['catcheur-33']);
  hit(s, s.players[0].active[0], s.players[1].active[0]);
  assert.equal(s.players[1].active.length, 0); // 50 + 5 dégâts contre 50 END
});

test('Kevin Owens regagne 10 END à chaque attaque, Sheamus 5 END quand il est attaqué', () => {
  const s = duel(['catcheur-09'], ['catcheur-18']);
  const [ko] = s.players[0].active, [sheamus] = s.players[1].active;
  hit(s, ko, sheamus);
  assert.equal(ko.endurance, 80);
  assert.equal(sheamus.endurance, 70 - 55 + 5);
});

test('The Rock pioche une carte quand il attaque', () => {
  const s = duel(['catcheur-02']);
  s.players[0].deck = ['objets-01'];
  hit(s, s.players[0].active[0], 'direct');
  assert.deepEqual(s.players[0].hand, ['objets-01']);
  assert.equal(s.players[1].hp, 440);
});

test('Attaque spéciale Rock Bottom : +10 seulement contre moins de 70 END, consommée', () => {
  const s = duel(['catcheur-02'], ['catcheur-01', 'catcheur-33']);
  const [rock] = s.players[0].active, [roman, horn] = s.players[1].active;
  assert.equal(game.declareAttack(s, 0, rock.instanceId, roman.instanceId, { special: 'catcheur-02' }).ok, false);
  hit(s, rock, horn, { special: 'catcheur-02' });
  assert.equal(rock.specialUsed, true);
  assert.equal(s.players[1].active.includes(horn), false);
});

test('Leap of Faith frappe tous les catcheurs adverses avec +10', () => {
  const s = duel(['catcheur-06'], ['catcheur-19', 'catcheur-26']);
  s.players[1].passive = [slot('catcheur-28', 'passive')];
  hit(s, s.players[0].active[0], 'multi', { special: 'catcheur-06' });
  assert.deepEqual(s.players[1].active.map(f => f.endurance), [80 - 55, 75 - 60]);
  assert.equal(s.players[1].passive[0].endurance, 65 - 60); // Xavier Woods, zone passive comprise
});

test('Bray Wyatt actif : les adversaires infligent 10 dégâts de moins, même en direct', () => {
  const s = duel(['catcheur-19', 'catcheur-26'], ['catcheur-39']);
  hit(s, s.players[0].active[1], 'direct');
  assert.equal(s.players[1].hp, 500 - 45);
});

test('John Cena : un allié attaqué regagne 10 END, et un allié K.O. fait piocher', () => {
  const s = duel(['catcheur-11'], ['catcheur-35', 'catcheur-33']);
  s.players[1].deck = ['objets-02'];
  const [cena, horn] = s.players[1].active;
  hit(s, s.players[0].active[0], horn);
  assert.deepEqual(s.players[1].hand, ['objets-02']);
  assert.equal(cena.endurance, 95);
});

test('Cody Rhodes actif : alliés +5 ATT / +5 END ; perdre le bonus peut mettre K.O.', () => {
  const s = duel([], ['catcheur-34', 'catcheur-33']);
  const [cody, horn] = s.players[1].active;
  assert.equal(eff(s, 1, horn).endurance, 55);
  horn.endurance = -3; // 2 END effectives grâce au bonus de Cody
  game.sendFighterToGrave(s, 1, cody, 'K.-O.');
  combat.checkKOs(s);
  assert.equal(s.players[1].active.length, 0);
});

test('Ceinture Universelle : +10 ATT, et Roman Reigns gagne +5 END cumulés à chaque tour', () => {
  const s = duel(['catcheur-01'], [], 'actions');
  const roman = s.players[0].active[0];
  s.players[0].hand = ['objets-05'];
  game.equipObject(s, 0, byId('objets-05'), roman.instanceId);
  assert.equal(eff(s, 0, roman).attack, 85);
  s.players[0].deck = ['objets-01', 'objets-02'];
  s.players[1].deck = ['objets-01', 'objets-02'];
  game.endTurn(s); game.endTurn(s);
  game.endTurn(s); game.endTurn(s);
  assert.equal(roman.endurance, 115);
});

test('Big Gold : une invocation normale supplémentaire ce tour-ci', () => {
  const s = duel(['catcheur-24'], [], 'actions');
  s.players[0].hand = ['objets-06', 'catcheur-33', 'catcheur-28'];
  game.normalSummon(s, 0, byId('catcheur-33'), [], 'active');
  game.equipObject(s, 0, byId('objets-06'), s.players[0].active[0].instanceId);
  assert.equal(game.normalSummon(s, 0, byId('catcheur-28'), [], 'active').ok, true);
});

test('Ceinture The Champ sur John Cena : il attaque deux fois ce tour', () => {
  const s = duel(['catcheur-35'], ['catcheur-33', 'catcheur-28'], 'actions');
  const cena = s.players[0].active[0];
  s.players[0].hand = ['objets-08'];
  game.equipObject(s, 0, byId('objets-08'), cena.instanceId);
  s.phase = 'attacks';
  hit(s, cena, s.players[1].active[0]);
  hit(s, cena, s.players[1].active[0]);
  assert.equal(s.players[1].active.length, 0);
});

test('Table : +20 dégâts puis détruite', () => {
  const s = duel(['catcheur-19'], ['catcheur-01']);
  const braun = s.players[0].active[0];
  s.players[0].objects = [{ instanceId: 'o1', cardId: 'objets-04', fighterId: braun.instanceId }];
  hit(s, braun, s.players[1].active[0]);
  assert.equal(s.players[1].active[0].endurance, 105 - 70);
  assert.equal(s.players[0].objects.length, 0);
  assert.ok(s.players[0].grave.includes('objets-04'));
});

test('Endormi (Shawn Michaels) : la cible ne peut pas attaquer à son prochain tour', () => {
  const s = duel(['catcheur-32'], ['catcheur-01'], 'actions');
  const [shawn] = s.players[0].active, [roman] = s.players[1].active;
  const r = act.activate(s, 0, 'catcheur-32:passive', shawn.instanceId, { targets: [{ pi: 1, instanceId: roman.instanceId }] });
  assert.equal(r.ok, true, r.reason);
  s.players[0].deck = ['objets-01']; s.players[1].deck = ['objets-01'];
  game.endTurn(s);
  s.phase = 'attacks';
  assert.equal(game.declareAttack(s, 1, roman.instanceId, 'direct').ok, false);
});

test('Randy Orton : l’effet passif annule tous les bonus adverses ce tour-ci', () => {
  const s = duel(['catcheur-13'], ['catcheur-01', 'catcheur-21'], 'actions');
  const jey = s.players[1].active[1];
  assert.equal(eff(s, 1, jey).attack, 55);
  act.activate(s, 0, 'catcheur-13:passive', s.players[0].active[0].instanceId);
  assert.equal(eff(s, 1, jey).attack, 50);
});

test('Claymore Kick : Drew McIntyre annule l’attaque et inflige 5 dégâts', () => {
  const s = duel(['catcheur-01'], ['catcheur-10']);
  const roman = s.players[0].active[0];
  game.declareAttack(s, 0, roman.instanceId, s.players[1].active[0].instanceId);
  const options = game.reactionOptions(s, 1);
  assert.ok(options.some(o => o.key === 'catcheur-10'));
  assert.equal(game.useReaction(s, 1, 'catcheur-10').ok, true);
  assert.equal(s.pendingAttack, null);
  assert.equal(roman.endurance, 100);
});

test('Triple H (DX) invoque un membre de la DX depuis le deck', () => {
  const s = duel(['catcheur-31'], [], 'actions');
  s.players[0].deck = ['catcheur-32', 'catcheur-01'];
  const r = act.activate(s, 0, 'catcheur-31:passive', s.players[0].active[0].instanceId, { cardId: 'catcheur-32', position: 'active' });
  assert.equal(r.ok, true, r.reason);
  assert.equal(s.players[0].active[1].cardId, 'catcheur-32');
});

test('Luke Harper se sacrifie pour invoquer Bray Wyatt depuis la main', () => {
  const s = duel(['wyatt-03'], [], 'actions');
  s.players[0].hand = ['wyatt-04'];
  const r = act.activate(s, 0, 'wyatt-03:special', s.players[0].active[0].instanceId, { cardId: 'wyatt-04', position: 'active' });
  assert.equal(r.ok, true, r.reason);
  assert.deepEqual(s.players[0].active.map(f => f.cardId), ['wyatt-04']);
  assert.ok(s.players[0].grave.includes('wyatt-03'));
});

test('Erick Rowan au cimetière : choix d’une carte Wyatt Family R/SR à ajouter en main', () => {
  const s = duel([], ['catcheur-01']);
  s.players[0].active = [slot('wyatt-02')];
  s.players[0].deck = ['wyatt-03', 'wyatt-04', 'catcheur-01'];
  s.turn = 1;
  s.players[1].active[0].attack = 200;
  s.phase = 'attacks';
  game.declareAttack(s, 1, s.players[1].active[0].instanceId, s.players[0].active[0].instanceId);
  game.resolveAttack(s);
  const [choice] = s.pendingChoices;
  assert.deepEqual(act.choiceOptions(s, choice), ['wyatt-03']);
  act.resolveChoice(s, choice.id, 'wyatt-03');
  assert.deepEqual(s.players[0].hand, ['wyatt-03']);
});

test('Saut de l’ange : +15 ATT ce tour puis -5 END après l’attaque', () => {
  const s = duel(['catcheur-19'], [], 'actions');
  const braun = s.players[0].active[0];
  s.players[0].hand = ['momentum-03'];
  game.playMomentum(s, 0, byId('momentum-03'));
  fx.resolveSimpleMomentum(s, 0, byId('momentum-03'));
  assert.equal(act.resolveTargetMomentum(s, 0, 'momentum-03', [{ pi: 0, instanceId: braun.instanceId }]).ok, true);
  s.phase = 'attacks';
  hit(s, braun, 'direct');
  assert.equal(s.players[1].hp, 435);
  assert.equal(braun.endurance, 75);
});

test('L’Ultime Opportunité pioche une carte par catcheur K.O. ce tour-ci', () => {
  const s = duel(['catcheur-01'], ['catcheur-33']);
  s.players[1].deck = ['objets-01', 'objets-02'];
  hit(s, s.players[0].active[0], s.players[1].active[0]);
  assert.equal(s.koThisTurn[1], 1);
  assert.equal(fx.momentumRequirement(s, 1, byId('momentum-10')).ok, true);
  fx.resolveSimpleMomentum(s, 1, byId('momentum-10'));
  assert.deepEqual(s.players[1].hand, ['objets-01']);
});

test('Teddy Long invoque deux catcheurs de la même faction depuis la main', () => {
  const s = duel([], [], 'actions');
  const p = s.players[0];
  p.manager = { cardId: 'managers-04', used: false };
  p.hand = ['catcheur-26', 'catcheur-27'];
  assert.deepEqual(fx.teddyLongOptions(s, 0).map(o => o.faction), ['The New Day']);
  const r = fx.managerEffect(s, 0, { cardIds: ['catcheur-26', 'catcheur-27'], positions: ['active', 'active'] });
  assert.equal(r.ok, true, r.reason);
  assert.equal(p.active.length, 2);
});

test('Jey Uso (wyatt-09) est mis K.O. à la place de Roman Reigns, qui garde son END', () => {
  const s = duel(['catcheur-35'], ['catcheur-01', 'wyatt-09']);
  const [roman, jey] = s.players[1].active;
  s.players[0].active[0].attack = 200;
  hit(s, s.players[0].active[0], roman);
  assert.equal(s.players[1].active.includes(roman), true);
  assert.equal(roman.endurance, 105);
  assert.equal(s.players[1].active.includes(jey), false);
  assert.ok(s.players[1].grave.includes('wyatt-09'));
});

test('Défense inébranlable : -40 dégâts jusqu’à la fin du prochain tour adverse', () => {
  const s = duel(['catcheur-09'], ['catcheur-35'], 'actions');
  s.players[0].hand = ['momentum-07'];
  game.playMomentum(s, 0, byId('momentum-07'));
  fx.resolveSimpleMomentum(s, 0, byId('momentum-07'));
  s.players[0].deck = ['objets-01']; s.players[1].deck = ['objets-01'];
  game.endTurn(s);
  s.phase = 'attacks';
  game.declareAttack(s, 1, s.players[1].active[0].instanceId, s.players[0].active[0].instanceId);
  game.resolveAttack(s);
  assert.equal(s.players[0].active[0].endurance, 70 - 35);
});

test('The Bloodline Rassemblement : Roman depuis le deck, +10 ATT, attaque des passifs, quitte le jeu si incomplet', () => {
  const s = duel(['catcheur-21', 'catcheur-22', 'wyatt-11'], ['catcheur-19'], 'actions');
  s.players[1].passive = [slot('catcheur-28', 'passive')];
  const p = s.players[0];
  p.deck = ['catcheur-01'];
  p.hand = ['wyatt-13'];
  assert.equal(fx.momentumRequirement(s, 0, byId('wyatt-13')).ok, true);
  game.playMomentum(s, 0, byId('wyatt-13'));
  assert.equal(act.resolveRassemblement(s, 0, { cardId: 'catcheur-01', position: 'passive' }).ok, true);
  assert.equal(p.ongoingMomentum[0].cardId, 'wyatt-13');
  p.passive[0].passiveActiveUntil = 999; // Roman vient d'arriver : on active son passif
  const jey = p.active[0];
  assert.equal(eff(s, 0, jey).attack, 50 + 5 + 5 + 10); // Jimmy actif, Roman, Rassemblement
  s.phase = 'attacks';
  hit(s, jey, s.players[1].passive[0]);
  assert.equal(s.players[1].passive.length, 0);
  game.sendFighterToGrave(s, 0, p.active.find(f => f.cardId === 'wyatt-11'), 'K.-O.');
  combat.checkKOs(s);
  assert.equal(p.ongoingMomentum.length, 0);
  assert.ok(p.grave.includes('wyatt-13'));
});

test('Roman Reigns (wyatt-08) attaque deux fois quand la Bloodline est au complet', () => {
  const s = duel(['wyatt-08', 'catcheur-21', 'catcheur-22'], ['catcheur-33', 'catcheur-28']);
  s.players[0].passive = [slot('wyatt-11', 'passive')];
  const roman = s.players[0].active[0];
  assert.equal(combat.attacksAllowed(s, 0, roman), 2);
});

test('Un effet passif ne marche qu’une fois activé, et dure jusqu’au prochain tour de son propriétaire', () => {
  const s = duel(['catcheur-11'], ['catcheur-12'], 'actions');
  const gunther = s.players[1].active[0];
  gunther.passiveActiveUntil = 0;
  const lashley = s.players[0].active[0];
  lashley.passiveActiveUntil = 0;
  s.phase = 'attacks';
  hit(s, lashley, gunther);
  assert.equal(gunther.endurance, 85 - 45); // ni +5 de Lashley, ni -10 de Gunther
  // L'IA active Gunther pendant son tour : il reste protégé pendant le tour suivant du joueur.
  s.players[0].deck = ['objets-01', 'objets-02']; s.players[1].deck = ['objets-01'];
  game.endTurn(s);
  assert.equal(game.activateWrestlerEffect(s, 1, gunther.instanceId, 'passive').ok, true);
  game.endTurn(s);
  s.phase = 'attacks';
  s.players[0].active[0] = lashley;
  hit(s, lashley, gunther);
  assert.equal(gunther.endurance, 40 - 35);
});
