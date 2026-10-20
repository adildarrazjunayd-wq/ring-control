import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as game from '../src/engine/game-engine.js';

const cards=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const byId=id=>cards.find(c=>c.id===id);
game.configureCardLookup(byId);
const deck=Array.from({length:40},(_,i)=>cards.filter(c=>c.playable)[i%cards.filter(c=>c.playable).length].id);
const fresh=()=>game.createMatch(deck,deck,{random:()=>0});

test('initialise une partie avec 5 cartes, puis pioche pour le premier tour',()=>{
  const s=fresh();assert.equal(s.players[0].hand.length,6);assert.equal(s.players[1].hand.length,5);assert.equal(s.players[0].hp,500);assert.equal(s.players[1].hp,500);
});

test('invocation SSR exige un sacrifice SR ou exactement deux R',()=>{
  const s=fresh(),p=s.players[0],ssr=byId('catcheur-01'),sr=byId('catcheur-05');
  p.hand.push(ssr.id);p.active.push({instanceId:'sr',cardId:sr.id,attack:sr.attack,endurance:sr.endurance,position:'active'});
  assert.equal(game.normalSummon(s,0,ssr,[],'active').ok,false);
  assert.equal(game.normalSummon(s,0,ssr,['sr'],'active').ok,true);
  assert.equal(p.grave[0],sr.id);assert.equal(p.active.length,1);
});

test('les passifs ont une limite de deux et requièrent un actif',()=>{
  const s=fresh(),p=s.players[0],c=byId('catcheur-08');p.hand.push(c.id);
  assert.equal(game.normalSummon(s,0,c,[],'passive').ok,false);
  assert.equal(game.normalSummon(s,0,c,[],'active').ok,true);
  const second=byId('catcheur-05');p.hand.push(second.id);
  assert.equal(game.normalSummon(s,0,second,[],'passive').ok,false); // invocation normale déjà utilisée
});

test('Retour Inattendu rend le catcheur avec son END imprimée complète et la position choisie',()=>{
  const s=fresh(),c=byId('catcheur-01');s.players[0].grave.push(c.id);
  const result=game.reviveFromGrave(s,0,c,'active');assert.equal(result.ok,true);assert.equal(result.fighter.endurance,c.endurance);assert.equal(result.fighter.position,'active');
});

test('un Momentum rapide ne se joue qu’après l’annonce d’une attaque adverse',()=>{
  const s=fresh(),rapid=byId('momentum-20');s.players[0].hand.push(rapid.id);
  assert.equal(game.playMomentum(s,0,rapid).ok,false);
  const ai=byId('catcheur-05');s.players[1].active.push({instanceId:'ai-a',cardId:ai.id,attack:ai.attack,endurance:ai.endurance,position:'active'});
  s.turn=1;s.phase='attacks';assert.equal(game.declareAttack(s,1,'ai-a','direct').ok,true);
  assert.equal(game.playMomentum(s,0,rapid).ok,true);assert.equal(s.pendingAttack,null);assert.equal(s.players[1].status.noAttackThroughTurn,s.turnNumber);
});

test('les dégâts de KO envoient aussi l’objet équipé au cimetière',()=>{
  const s=fresh(),victim=byId('catcheur-05'),object=byId('objets-03'),attacker=byId('catcheur-01');
  s.players[1].active.push({instanceId:'victim',cardId:victim.id,attack:victim.attack,endurance:10,position:'active'});
  s.players[1].objects.push({instanceId:'equipment',cardId:object.id,fighterId:'victim'});
  s.players[0].active.push({instanceId:'attacker',cardId:attacker.id,attack:attacker.attack,endurance:attacker.endurance,position:'active'});
  s.phase='attacks';game.declareAttack(s,0,'attacker','victim');game.resolveAttack(s);
  assert.deepEqual(s.players[1].grave,[victim.id,object.id]);assert.equal(s.players[1].objects.length,0);
});

test('un même adversaire ne peut être ciblé qu’une fois par tour',()=>{
  const s=fresh(),a=byId('catcheur-05'),d=byId('catcheur-08');
  s.players[0].active.push({instanceId:'a1',cardId:a.id,attack:a.attack,endurance:a.endurance,position:'active'},{instanceId:'a2',cardId:a.id,attack:a.attack,endurance:a.endurance,position:'active'});
  s.players[1].active.push({instanceId:'d1',cardId:d.id,attack:d.attack,endurance:d.endurance,position:'active'});s.phase='attacks';
  game.declareAttack(s,0,'a1','d1');game.resolveAttack(s);assert.equal(game.declareAttack(s,0,'a2','d1').ok,false);
});

test('Botte Celte donne +15 ATT à Sheamus pendant le tour où elle est activée',()=>{
  const s=fresh(),sheamus=byId('catcheur-18'),enemy=byId('catcheur-05');
  s.players[0].active.push({instanceId:'sheamus',cardId:sheamus.id,attack:sheamus.attack,endurance:sheamus.endurance,position:'active'});
  s.players[1].active.push({instanceId:'enemy',cardId:enemy.id,attack:enemy.attack,endurance:enemy.endurance,position:'active'});
  s.botteCeltesBoostPlayer=0;s.botteCeltesBoostTurn=s.turnNumber;s.phase='attacks';
  const result=game.declareAttack(s,0,'sheamus','enemy');assert.equal(result.pendingAttack.attack,sheamus.attack+15);
});

test('les corrections manuelles sont consignées et les PV à zéro terminent le match',()=>{
  const s=fresh(),c=byId('catcheur-08');s.players[0].active.push({instanceId:'manual',cardId:c.id,attack:c.attack,endurance:c.endurance,position:'active'});
  game.adjustFighter(s,0,'manual','attack',5,'effet imprimé');assert.equal(s.players[0].active[0].attack,c.attack+5);assert.match(s.history[0],/effet imprimé/);
  game.adjustPlayerHP(s,1,-500,'effet imprimé');assert.equal(s.winner,0);
});
