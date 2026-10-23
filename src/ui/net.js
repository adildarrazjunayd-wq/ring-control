// Mode en ligne : salle privée entre deux navigateurs (connexion directe WebRTC via PeerJS).
// Le joueur qui crée la salle (« hôte ») fait tourner la partie ; l'invité envoie ses actions
// et reçoit la partie vue de son côté (main et deck adverses cachés).
// Toutes les actions de jeu de l'interface passent par exec() : en solo ou pour l'hôte,
// elles s'appliquent directement ; pour l'invité, elles partent chez l'hôte.
import * as effects from '../engine/card-effects.js';
import * as activ from '../engine/activations.js';
import { S, game, hooks, toast, persist } from './core.js';
import { canReact } from './ai.js';
import { animateAttack } from './fx.js';
import { sfx } from './sound.js';
import { showVersus } from './versus.js';

const PEERJS = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'ringcontrol-v1-';
const SESSION_KEY = 'ring-control-online';
const card = id => game.lookupCard(id);

// ---------- Commandes de jeu ----------
// Chaque commande reçoit (état, joueur qui agit, ...arguments). Les numéros de joueur passés en
// argument sont « relatifs » : 0 = celui qui agit, 1 = son adversaire.
const rel = (actor, pi) => (actor === 0 ? Number(pi) : 1 - Number(pi));
const relTargets = (actor, list = []) => list.map(t => ({ ...t, pi: rel(actor, t.pi) }));
const myTurn = (s, a) => s.turn === a && s.winner === null;

export const COMMANDS = {
  normalSummon: (s, a, id, sacs, pos) => game.normalSummon(s, a, card(id), sacs, pos),
  playManager: (s, a, id) => game.playManager(s, a, card(id)),
  equip: (s, a, id, iid) => game.equipObject(s, a, card(id), iid),
  playMomentum: (s, a, id) => game.playMomentum(s, a, card(id)),
  simpleMomentum: (s, a, id) => effects.resolveSimpleMomentum(s, a, card(id)) ?? { ok: false, reason: 'Effet non automatique.' },
  directSummon: (s, a, mid, id, pos) => game.resolveDirectSummon(s, a, card(mid), id, pos),
  resolveMomentum: (s, a, opts) => game.resolveMomentum(s, a, opts),
  resolveSearch: (s, a, rule, id, source) => effects.resolveSearch(s, a, rule, id, source),
  shieldSummon: (s, a, placements) => effects.resolveShieldSummon(s, a, placements),
  revive: (s, a, id, pos) => { const r = game.reviveFromGrave(s, a, card(id), pos); if (r.ok) game.resolveMomentum(s, a); return r; },
  move: (s, a, iid, dest) => game.moveFighter(s, a, iid, dest),
  swap: (s, a, x, y) => game.swapFighters(s, a, x, y),
  wrestlerEffect: (s, a, iid, kind) => game.activateWrestlerEffect(s, a, iid, kind),
  cashIn: (s, a, iid) => game.cashInBriefcase(s, a, iid),
  managerEffect: (s, a, opts) => effects.managerEffect(s, a, opts),
  activate: (s, a, key, iid, opts = {}) => activ.activate(s, a, key, iid, { ...opts, targets: relTargets(a, opts.targets) }),
  targetMomentum: (s, a, key, targets) => activ.resolveTargetMomentum(s, a, key, relTargets(a, targets)),
  summonMomentum: (s, a, mid, opts) => activ.resolveSummonMomentum(s, a, mid, opts),
  rassemblement: (s, a, opts) => activ.resolveRassemblement(s, a, opts),
  resolveChoice: (s, a, choiceId, id) => (s.pendingChoices?.find(c => c.id === choiceId)?.pi === a ? activ.resolveChoice(s, choiceId, id) : { ok: false, reason: 'Ce choix ne te concerne pas.' }),
  useReaction: (s, a, key, iid) => game.useReaction(s, a, key, iid),
  adjust: (s, a, pi, iid, stat, delta) => game.adjustFighter(s, rel(a, pi), iid, stat, delta, 'correction manuelle'),
  hpAdjust: (s, a, pi, delta) => game.adjustPlayerHP(s, rel(a, pi), delta, 'correction manuelle'),
  toAttacks: (s, a) => { if (!myTurn(s, a) || s.phase !== 'actions') return { ok: false, reason: 'Pas maintenant.' }; s.phase = 'attacks'; return { ok: true }; },
  declareAttack: (s, a, iid, target, opts) => { if (myTurn(s, a) && s.phase === 'actions') s.phase = 'attacks'; return game.declareAttack(s, a, iid, target, opts); },
  // On ne résout soi-même que l'attaque de l'adversaire (« laisser passer »).
  resolveAttack: (s, a) => (s.pendingAttack && s.pendingAttack.playerIndex !== a ? game.resolveAttack(s) : { ok: false, reason: 'Attaque en attente de la réponse adverse.' }),
  endTurn: (s, a) => (myTurn(s, a) ? game.endTurn(s) : { ok: false, reason: 'Ce n’est pas ton tour.' }),
};

export const isGuest = () => S.online?.role === 'guest';
export const isHost = () => S.online?.role === 'host';

// Applique une commande de l'interface (joueur de l'écran = 0).
export async function exec(fn, ...args) {
  if (isGuest()) return send({ t: 'cmd', fn, args });
  const result = COMMANDS[fn](S.match, 0, ...args);
  if (isHost() && fn === 'declareAttack' && result?.ok) autoResolve();
  return result;
}

// ---------- Vue de l'invité ----------
// L'invité se voit en joueur 0 : on échange les deux joueurs et on cache la main et le deck de l'hôte.
const swapPair = v => (Array.isArray(v) ? [v[1], v[0]] : v);
const flip = pi => (pi === 0 ? 1 : pi === 1 ? 0 : pi);
export function guestView(state) {
  const v = structuredClone(state);
  v.players = [v.players[1], v.players[0]];
  v.players[1].hand = v.players[1].hand.map(() => 'hidden');
  v.players[1].deck = v.players[1].deck.map(() => 'hidden');
  v.turn = flip(v.turn);
  v.winner = flip(v.winner);
  v.firstPlayer = flip(v.firstPlayer);
  if (v.pendingAttack) v.pendingAttack.playerIndex = flip(v.pendingAttack.playerIndex);
  for (const k of ['outOfTurnMomentumUsed', 'momentumsThisTurn', 'koThisTurn']) v[k] = swapPair(v[k]);
  if (v.botteCeltesBoostPlayer != null) v.botteCeltesBoostPlayer = flip(v.botteCeltesBoostPlayer);
  for (const c of v.pendingChoices ?? []) c.pi = flip(c.pi);
  for (const e of v.fxQueue ?? []) e.pi = flip(e.pi);
  for (const p of v.players) {
    if (p.resolvingMomentum) p.resolvingMomentum.controller = flip(p.resolvingMomentum.controller);
    for (const o of p.ongoingMomentum) o.controller = flip(o.controller);
  }
  return v;
}

// ---------- Connexion ----------
let peer = null, conn = null, pending = new Map(), seq = 0;

function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PEERJS;
    s.onload = () => resolve(window.Peer);
    s.onerror = () => reject(new Error('Impossible de charger le module de connexion (vérifie Internet).'));
    document.head.append(s);
  });
}

const randomCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const saveSession = data => { try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* ignore */ } };
export const savedSession = () => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };
export function forgetSession() { try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } }

function send(message) {
  if (!conn?.open) { toast('Pas de connexion avec ton adversaire.'); return Promise.resolve({ ok: false, reason: 'Déconnecté.' }); }
  if (message.t !== 'cmd') { conn.send(message); return Promise.resolve(); }
  const id = ++seq;
  conn.send({ ...message, id });
  S.waiting = true;
  return new Promise(resolve => {
    pending.set(id, resolve);
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); S.waiting = false; resolve({ ok: false, reason: 'Pas de réponse de l’hôte.' }); } }, 12000);
  });
}

// Hôte : envoie la partie à jour à l'invité (appelé à chaque sauvegarde).
export function broadcast() {
  if (isHost() && conn?.open && S.match) conn.send({ t: 'state', view: guestView(S.match) });
  if (isHost() && S.match) saveSession({ ...savedSession(), role: 'host', code: S.online.code, match: S.match, name: S.online.name });
}

function status(text, connected) {
  if (S.online) { S.online.status = text; S.online.connected = connected; }
  hooks.render();
}

// ---------- Hôte ----------
// deckName / star : nom du deck et carte maîtresse, montrés sur l'écran VERSUS des deux joueurs.
export async function host({ code = randomCode(), deck, name, resume = null, deckName = '', star = null }) {
  const Peer = await loadPeer();
  closeAll();
  S.online = { role: 'host', code, name, deck, deckName, star, connected: false, status: 'En attente de ton adversaire…' };
  if (resume) { S.soloMatch ??= S.match; S.match = resume; }
  peer = new Peer(PREFIX + code);
  peer.on('error', err => status(err.type === 'unavailable-id' ? 'Ce code est déjà utilisé : réessaie dans quelques secondes.' : `Erreur de connexion : ${err.type}`, false));
  peer.on('open', () => status('En attente de ton adversaire…', false));
  peer.on('connection', c => {
    if (conn?.open) { c.on('open', () => { c.send({ t: 'error', msg: 'Cette salle est déjà complète.' }); setTimeout(() => c.close(), 300); }); return; }
    conn = c;
    c.on('data', msg => onHostMessage(msg));
    c.on('close', () => { conn = null; status('Ton adversaire s’est déconnecté. Il peut revenir avec le même code.', false); toast('Adversaire déconnecté'); });
  });
  saveSession({ role: 'host', code, name, match: resume ?? null });
  return code;
}

function onHostMessage(msg) {
  if (msg.t === 'hello') {
    const session = savedSession();
    if (S.match && S.online.started && session?.guestToken && session.guestToken !== msg.token) { conn.send({ t: 'error', msg: 'Une autre personne joue déjà dans cette salle.' }); return; }
    S.online.guestName = msg.name || 'Adversaire';
    if (!S.online.started) startMatch(msg);
    saveSession({ ...savedSession(), guestToken: msg.token });
    conn.send({ t: 'welcome', hostName: S.online.name, deckName: S.online.deckName, star: S.online.star });
    status('Connecté', true);
    broadcast();
    return;
  }
  if (msg.t === 'cmd') {
    const fn = COMMANDS[msg.fn];
    let result;
    try { result = fn ? fn(S.match, 1, ...(msg.args ?? [])) : { ok: false, reason: 'Commande inconnue.' }; } catch (e) { console.error(e); result = { ok: false, reason: 'Erreur sur la partie.' }; }
    const clean = result && typeof result === 'object' ? { ok: result.ok, reason: result.reason, response: result.response } : result;
    persist();
    hooks.render();
    conn?.send({ t: 'result', id: msg.id, result: clean });
    if (msg.fn === 'declareAttack' && result?.ok) autoResolve();
  }
}

function startMatch(hello) {
  const first = Math.random() < 0.5 ? 0 : 1;
  S.soloMatch ??= S.match;
  S.match = game.createMatch(S.online.deck.slice(), hello.deck.slice(), { first });
  S.match.players[0].name = S.online.name || 'Hôte';
  S.match.players[1].name = S.online.guestName;
  S.match.players[1].role = 'human';
  S.match.online = true;
  S.online.started = true;
  S.hideResult = false;
  persist();
  hooks.go('duel');
  const who = `${first === 0 ? 'Tu commences' : `${S.online.guestName} commence`} (tirage au sort).`;
  if (S.online.star && hello.star) showVersus({ cardId: S.online.star, player: S.online.name || 'TOI', deck: S.online.deckName }, { cardId: hello.star, player: S.online.guestName, deck: hello.deckName }).then(() => toast(who));
  else { sfx('bell'); toast(who); }
}

// Après une attaque : si le défenseur ne peut pas répondre, l'hôte la résout tout de suite.
async function autoResolve() {
  const m = S.match, a = m?.pendingAttack;
  if (!a) return;
  const defender = 1 - a.playerIndex;
  if (canReact(m, defender)) { persist(); hooks.render(); return; } // on attend sa réponse
  if (conn?.open) conn.send({ t: 'attack', attack: { ...a, playerIndex: flip(a.playerIndex) } });
  await animateAttack(a);
  if (S.match?.pendingAttack?.id === a.id) game.resolveAttack(S.match);
  persist();
  hooks.render();
  if (S.match.winner !== null) sfx(S.match.winner === 0 ? 'win' : 'lose');
}
export { autoResolve };

// ---------- Invité ----------
export async function join({ code, deck, name, deckName = '', star = null }) {
  const Peer = await loadPeer();
  closeAll();
  code = code.trim().toUpperCase();
  const session = savedSession();
  const token = session?.role === 'guest' && session.code === code ? session.token : crypto.randomUUID();
  S.online = { role: 'guest', code, name, deckName, star, connected: false, status: 'Connexion à la salle…' };
  saveSession({ role: 'guest', code, token, name, deck, deckName, star });
  hooks.render();
  peer = new Peer();
  peer.on('error', err => status(err.type === 'peer-unavailable' ? 'Salle introuvable : vérifie le code (l’hôte doit avoir créé la partie).' : `Erreur de connexion : ${err.type}`, false));
  peer.on('open', () => {
    conn = peer.connect(PREFIX + code, { reliable: true });
    conn.on('open', () => { conn.send({ t: 'hello', name, deck, token, deckName, star }); status('Connecté, en attente de la partie…', true); });
    conn.on('data', onGuestMessage);
    conn.on('close', () => { conn = null; status('Connexion perdue avec l’hôte.', false); toast('Connexion perdue : clique sur « Se reconnecter ».'); });
  });
}

function onGuestMessage(msg) {
  if (msg.t === 'state') {
    const first = !S.match || S.match.matchId !== msg.view.matchId;
    if (!S.online.inMatch) { S.soloMatch ??= S.match; S.online.inMatch = true; }
    S.match = msg.view;
    S.online.connected = true;
    if (first) {
      S.hideResult = false;
      hooks.go('duel');
      // Nouvelle partie (pas une reconnexion en cours de match) : écran VERSUS.
      // La partie peut arriver avant le message « welcome » de l'hôte (sa carte maîtresse) : on attend alors celui-ci.
      const fresh = S.match.turnNumber === 1 && S.match.players.every(p => !p.active.length);
      if (fresh) { S.online.versusPending = true; guestVersus(); }
    } else hooks.render();
  } else if (msg.t === 'result') {
    const resolve = pending.get(msg.id);
    pending.delete(msg.id);
    S.waiting = false;
    resolve?.(msg.result);
  } else if (msg.t === 'attack') {
    animateAttack(msg.attack);
  } else if (msg.t === 'welcome') {
    S.online.hostName = msg.hostName;
    S.online.hostDeckName = msg.deckName;
    S.online.hostStar = msg.star;
    guestVersus();
    hooks.render();
  } else if (msg.t === 'error') {
    toast(msg.msg);
    status(msg.msg, false);
  }
}

// Invité : écran VERSUS dès que la nouvelle partie et la carte maîtresse de l'hôte sont arrivées.
function guestVersus() {
  const o = S.online;
  if (!o?.versusPending || !o.star || !o.hostStar) return;
  o.versusPending = false;
  showVersus({ cardId: o.star, player: o.name || 'TOI', deck: o.deckName }, { cardId: o.hostStar, player: o.hostName ?? 'Adversaire', deck: o.hostDeckName });
}

// ---------- Quitter ----------
function closeAll() {
  try { conn?.close(); } catch { /* ignore */ }
  try { peer?.destroy(); } catch { /* ignore */ }
  conn = null;
  peer = null;
  pending = new Map();
}

export function leave({ forget = false } = {}) {
  closeAll();
  if (S.online && S.soloMatch !== undefined) S.match = S.soloMatch;
  S.soloMatch = undefined;
  S.online = null;
  if (forget) forgetSession();
  persist();
}
