# Repères pour Codex — WWE TCG

## Objectif du projet

Application web locale gratuite pour construire manuellement un deck et jouer en solo contre une IA locale. Le jeu doit rester fidèle aux cartes et aux règles données par le propriétaire du projet.

## Règles de travail impératives

- Ne pas modifier le fonctionnement du jeu, les règles, le texte, les statistiques, les noms, les raretés ou l’équilibrage des cartes sans demande explicite.
- Ne pas retoucher, recadrer, remplacer ou générer de nouveaux visuels de cartes. Utiliser les images source déjà dans `public/cards/` telles quelles.
- Garder la construction du deck du joueur manuelle : 40 à 50 cartes, maximum 2 exemplaires par carte. Le deck de démonstration de l’IA peut rester généré par le jeu.
- Le mode demandé est 1 joueur contre IA locale. Ne pas ajouter de service payant, de clé API ou de mode en ligne comme prérequis.
- Les Momentum rapides ne peuvent être joués qu’après l’annonce d’une attaque adverse. « Contre » annule cette attaque et empêche le catcheur concerné d’attaquer à nouveau ce tour.
- « Retour Inattendu » laisse le joueur choisir actif/passif et rend le catcheur avec son END imprimée complète. « Botte Celte » ajoute Sheamus à la main et lui donne +15 ATT s’il attaque ce tour. « Main de l’Ombre » reste exclue du jeu.
- Ne pas inventer la résolution d’un effet dont le texte est incertain : conserver une résolution manuelle et signaler l’incertitude.
- Une refonte visuelle peut changer la présentation, les animations, la navigation et l’ergonomie, mais doit laisser les règles et le dessin des cartes intacts.

## Projet et commandes

- Application native navigateur, JavaScript ES modules et CSS, sans dépendance npm nécessaire.
- Lancement local : `node server.mjs`, puis ouvrir `http://localhost:4173`.
- Vérifier la logique existante avec `node --test` après une modification qui touche au code ou aux règles.
- `rules.js` et `game-engine.js` portent les règles; `catalog.json` décrit les cartes; `app.js`, `index.html` et `styles.css` portent l’interface.
- Les sauvegardes de decks et de parties restent dans le stockage local du navigateur.
