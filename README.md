# WWE TCG — Ring Control

Application web locale pour construire manuellement des decks WWE TCG et jouer contre une IA locale.

## Lancer

1. Ouvrir PowerShell dans `JEU-CATCH`.
2. Lancer `node server.mjs`.
3. Ouvrir `http://localhost:4173`.

Node.js récent est nécessaire. Les decks et la partie sont conservés dans le stockage local du navigateur. La version actuelle ne requiert ni service payant ni clé API.

## Cartes

Les 96 pages fournies ont chacune un rendu PNG dans `public/cards/`. Ces images proviennent des cartes originales et ne sont pas retouchées. Le catalogue contient 91 cartes jouables :

| Type | Quantité |
| --- | ---: |
| Catcheurs | 44 jouables sur 47 |
| Managers | 5 |
| Objets | 9 |
| Momentum | 33 jouables sur 34 |
| Dos de carte / référence | 1 |

Les cartes Undertaker, Rayback et « Main de l’Ombre » sont exclues de la partie. Les cartes Wyatt restent dans leur type imprimé, y compris les Momentum et l’objet.

## Ce qui est jouable

- Mode solo contre une IA locale. L’IA construit son deck de démonstration côté jeu; le deck du joueur est toujours composé carte par carte.
- Éditeur de decks : 40 à 50 cartes, au plus 2 exemplaires de chaque carte.
- Départ à 500 PV, 5 cartes en main puis pioche au début du premier tour.
- Terrain avec 3 emplacements actifs, 2 passifs, un manager, objets équipés, Momentum en cours ou actifs, cimetière et main.
- Invocation normale R/SR sans sacrifice; SSR avec un SR ou deux R. Choix actif/passif guidé, déplacement limité, actions proposées au clic.
- Attaque une fois par catcheur actif; ciblage sans répétition dans le même tour; attaques directes selon la différence de catcheurs actifs; dégâts, K.-O., cimetière et objets du catcheur appliqués par le moteur.
- Les Momenta rapides marqués du symbole éclair se jouent après l’annonce de l’attaque adverse. « Contre » annule l’attaque annoncée et bloque les attaques restantes de cet attaquant pour le tour.
- « Retour Inattendu » permet de choisir un catcheur au cimetière et sa position; il revient avec son END imprimée complète. « Botte Celte » ajoute Sheamus à la main depuis le deck et lui donne +15 ATT s’il attaque durant ce tour.
- Les textes d’effets peuvent être activés et consignés. Des corrections manuelles d’ATT, END et PV sont proposées pour appliquer un effet sans en changer le texte.
- Sauvegarde de decks et de parties en local, historique du match, collection avec recherche et filtres.

## Limites connues

Le catalogue conserve les textes OCR à vérifier; l’image imprimée reste la référence. Les autres effets de cartes ne sont pas tous résolus automatiquement : le joueur doit suivre leur visuel, activer l’effet depuis l’interface et utiliser les corrections guidées quand nécessaire. Les exceptions complexes ou l’absence de données restent donc en mode manuel afin de ne pas inventer de règles. Le mode en ligne n’est pas implémenté; le produit actuel fonctionne hors ligne sur un seul appareil après lancement du serveur local.

Exécuter `node --test` pour valider le catalogue et les règles couvertes par les tests.
