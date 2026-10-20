export const DECK_MIN=40, DECK_MAX=50, COPIES_MAX=2;
export function validateDeck(deck){
  const errors=[]; const n=deck?.cards?.length ?? 0;
  if(n<DECK_MIN) errors.push(`Le deck doit contenir au moins ${DECK_MIN} cartes.`);
  if(n>DECK_MAX) errors.push(`Le deck ne peut pas dépasser ${DECK_MAX} cartes.`);
  const counts=new Map(); for(const id of deck?.cards||[]) counts.set(id,(counts.get(id)||0)+1);
  for(const [id,count] of counts) if(count>COPIES_MAX) errors.push(`${id}: ${count} exemplaires (maximum ${COPIES_MAX}).`);
  return {valid:errors.length===0, errors};
}
export function normalSummonRequirement(card){
  if(card?.category!=='Catcheur') return {allowed:false, sacrifices:null, reason:'Seuls les catcheurs peuvent être invoqués.'};
  if(card.rarity==='SSR') return {allowed:true, sacrifices:'1 SR ou 2 R'};
  if(card.rarity==='R'||card.rarity==='SR') return {allowed:true, sacrifices:'0'};
  return {allowed:false, sacrifices:null, reason:'Rareté inconnue : vérifier la carte.'};
}
export function validateNormalSummon(card,sacrifices=[]){
  const requirement=normalSummonRequirement(card);
  if(!requirement.allowed)return {valid:false,reason:requirement.reason};
  if(card.rarity==='R'||card.rarity==='SR')return sacrifices.length===0?{valid:true}:{valid:false,reason:'R et SR ne demandent aucun sacrifice pour une invocation normale.'};
  if(card.rarity==='SSR'){
    if(sacrifices.length===1&&sacrifices[0]?.rarity==='SR'&&sacrifices[0]?.category==='Catcheur')return {valid:true};
    if(sacrifices.length===2&&sacrifices.every(x=>x?.rarity==='R'&&x?.category==='Catcheur'))return {valid:true};
    return {valid:false,reason:'Un SSR demande un SR ou deux R.'};
  }
  return {valid:false,reason:'Rareté inconnue : vérifier la carte.'};
}
export function canDirectAttack(attackerActiveCount, defenderActiveCount){
  return attackerActiveCount>defenderActiveCount;
}
export function resolveDamage(endurance, damage){
  const remaining=endurance-damage;
  return {remaining, knockedOut:remaining<=0, overflow:Math.max(0,damage-endurance)};
}
export function startMatch(deck1,deck2,{shuffle=Math.random}={}){
  const make=(cards,name)=>{const deck=[...cards];for(let i=deck.length-1;i>0;i--){const j=Math.floor(shuffle()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}return {name,hp:500,deck,hand:[],active:[],passive:[],manager:null,objects:[],grave:[]}};
  const state={players:[make(deck1,'Joueur 1'),make(deck2,'Joueur 2')],turn:0,phase:'Action',winner:null,log:[]};
  for(const p of state.players)for(let i=0;i<5;i++)p.hand.push(p.deck.pop());
  state.log.push('Chaque joueur pioche 5 cartes.');return state;
}
export function drawAtTurnStart(state,playerIndex){
  const player=state.players[playerIndex];if(state.winner)return {state,drawn:false};
  if(player.deck.length===0){state.winner=1-playerIndex;state.log.push(`${player.name} perd : son deck est vide.`);return {state,drawn:false,loss:true}}
  player.hand.push(player.deck.pop());state.log.push(`${player.name} pioche une carte.`);return {state,drawn:true};
}
export function damagePlayer(state,playerIndex,amount){
  const player=state.players[playerIndex];player.hp-=amount;
  if(player.hp<=0)state.winner=1-playerIndex;
  return {hp:player.hp,winner:state.winner};
}
export function activateEffect(state,{kind,used=false,active=true,phase='Action'}){
  if(used)return {status:'already-used',used:true};
  if(!active)return {status:'inactive',used:false};
  if(phase==='Attack')return {status:'wrong-phase',used:false};
  return {status:'activated',used:true};
}
export function cancelEffect(effectState){
  return effectState.status==='activated'?{status:'cancelled',used:true}:effectState;
}
export function canMovePosition({from,to,activeCount,passiveCount,movedThisTurn}){
  if(movedThisTurn) return false;
  if(from==='active'&&to==='passive') return activeCount>1&&passiveCount<2;
  if(from==='passive'&&to==='active') return activeCount<3&&passiveCount>0;
  return false;
}
