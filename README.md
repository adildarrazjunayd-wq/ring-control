# Ring Control — WWE TCG

Jeu de cartes de catch dans le navigateur : construis ton deck et affronte une IA locale.
Gratuit, sans compte, sans clé API.

## Lancer le jeu

Double-clique sur **`LANCER-LE-JEU.bat`** : le jeu s'ouvre sur `http://localhost:4173`.
(Autre méthode : `node server.mjs` dans ce dossier.) Il faut Node.js.

Les decks et la partie en cours sont gardés dans le navigateur (stockage local).

## Jouer en ligne avec un ami

Dans **Jouer** : « Créer une partie privée » donne un code à envoyer, l'ami le tape dans « Rejoindre ».
Mise en ligne gratuite et détails : [`docs/MODE-EN-LIGNE.md`](docs/MODE-EN-LIGNE.md).

## Organisation du dossier

| Dossier / fichier | Contenu |
| --- | --- |
| `index.html` | La page du jeu. |
| `src/engine/` | **Les règles** : `rules.js` (decks, invocations), `game-engine.js` (déroulé d'une partie), `combat.js` (bonus, dégâts, déclencheurs), `activations.js` et `card-effects.js` (effets de cartes), `ai-brain.js` (stratégie de l'IA). Aucun affichage ici : ce code pourra tourner sur un serveur pour le mode en ligne. |
| `src/ui/` | **L'affichage** : `main.js` (démarrage), `core.js` (données partagées), `screens.js` (accueil, decks, collection), `duel.js` (écran de duel), `actions.js` (clics), `ai.js` (l'IA), `fx.js` (animations), `sound.js` (bruitages), `styles.css` (style « Arcade Titantron »). |
| `data/catalog.json` | Les 96 cartes : stats, rareté, faction, texte imprimé. |
| `data/signature-decks.js` | Les 3 decks signature. |
| `public/cards/` | Les images originales des cartes (jamais modifiées). |
| `tests/` | Tests automatiques : `node --test`. |
| `docs/` | Cahier des charges, décisions de règles, audit des cartes. |
| `maquettes/` | Les maquettes de direction artistique (la n° 5 a été choisie). |
| `tools/ancien-ocr/` | Anciens scripts d'extraction des PDF (archive). |

## Vérifier

```
node --test
```

## Ce qui est automatisé

Toutes les règles de base, plus les effets listés dans [`docs/AUDIT-CARTES.md`](docs/AUDIT-CARTES.md).
Les autres effets s'appliquent à la main : le texte complet s'affiche sur l'écran géant (Titantron)
et des corrections ATT / END / PV sont disponibles.
