# Ring Control — WWE TCG

Jeu de cartes de catch dans le navigateur, 1 joueur contre une IA locale. Le propriétaire ne code pas :
lui répondre en français simple, par étapes courtes, et dire clairement ce qui a été vérifié (tests,
navigateur) et ce qui ne l'a pas été.

## Règles de travail impératives

- Ne pas modifier les règles, textes, stats, noms, raretés ou l'équilibrage des cartes sans demande explicite.
- Ne jamais retoucher, recadrer ou remplacer les images de `public/cards/`.
- Ne jamais effacer le `localStorage` (clé `ring-control-v2` : `{ decks, match }`). Garder ce format, ou migrer avec sauvegarde.
- Deck du joueur : 40 à 50 cartes, 2 exemplaires maximum. Le deck de l'IA est généré par le jeu.
- Ne pas inventer la résolution d'un effet ambigu : le laisser manuel et le signaler dans `docs/AUDIT-CARTES.md`.
- Pas de service payant, de clé API ni de mode en ligne obligatoire.
- Décisions de règles déjà prises : `docs/DECISIONS-REGLES.md` et `docs/CAHIER-DES-CHARGES.md` (ne pas les redemander).
- Un Momentum qui invoque est une invocation spéciale : sans sacrifice, carte prise en main sinon dans le deck.

## Structure

- `src/engine/` : règles pures, sans DOM (pour pouvoir tourner côté serveur plus tard).
  `card-effects.js` regroupe les effets automatisés ; ajouter un test dans `tests/` pour chaque effet.
- `src/ui/` : interface en modules ES. Les boutons portent `data-act="nom"` ; les gestionnaires sont dans `actions.js`.
- `data/catalog.json` : cartes avec `effects` retranscrits depuis les images, `faction`, `nickname`.
- Direction artistique validée : « Arcade Titantron » (`maquettes/5-arcade-titantron.html`).
  ATT/END discrètes sur le terrain (petite pastille sous la carte).

## Commandes

- Lancer : `node server.mjs` (ou `LANCER-LE-JEU.bat`), puis `http://localhost:4173`.
- Tests : `node --test`. Vérifier aussi dans le navigateur après un changement d'interface.
- Git : `C:\Program Files\Git\cmd\git.exe` (pas dans le PATH de cette machine).
