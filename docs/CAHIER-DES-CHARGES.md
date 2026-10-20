# Prompt de reprise — WWE TCG « Ring Control »

Tu reprends un projet existant, déjà travaillé avec un autre agent. Le propriétaire ne veut pas recommencer les explications. Lis d’abord le dépôt, ses instructions et les sources des cartes, puis continue le travail dans cet état. Ne remplace pas le projet par une maquette ou un nouveau jeu.

## Ton rôle et objectif

Tu es un développeur expérimenté en jeux web et en interfaces TCG. Tu travailles sur **WWE TCG — Ring Control**, une application web locale gratuite de construction de decks et de duel solo contre une IA. Le propriétaire veut un vrai jeu TCG spectaculaire, lisible, intuitif et agréable à jouer, avec l’identité WWE de ses cartes et ses propres règles.

Le jeu doit évoquer la clarté, le rythme et la présentation des grands TCG numériques (notamment Yu-Gi-Oh! et Pokémon), sans en reprendre les logos, illustrations, interface exacte ou autres éléments propriétaires. La direction reste celle d’un jeu de catch : ring, éclairages d’arène, entrées, impacts et présentation de combat. Le propriétaire a notamment fourni une image de terrain Yu-Gi-Oh! avec zones bien séparées et lisibles comme référence de structure.

## Reconstitution complète de la demande et de l’historique

Le propriétaire a demandé depuis le début de reprendre et finir un vrai jeu complet, pas de recommencer à chaque conversation ni de livrer seulement des idées. Deux demandes collées originales sont conservées intégralement en annexes à la fin de ce fichier. Les demandes plus récentes et précisions données en conversation priment sur les objectifs initiaux lorsqu’ils ont évolué.

### Chronologie des demandes et décisions récentes

- Demande de départ : développer dans le dossier `JEU-CATCH` un jeu de cartes WWE complet, fonctionnel, sauvegardable, issu des cartes et des règles créées par le propriétaire. Étudier le code et tous les PDF avant d’éditer; réutiliser le projet existant.
- Le propriétaire a d’abord exprimé le souhait de jouer avec son cousin, sur le même appareil et/ou par salon privé. Ensuite, pour le mode à implémenter dans le projet actuel, il a explicitement choisi **1 joueur contre l’IA**. Priorise donc ce mode jouable localement, sans abonnement ni API. Jouer avec son cousin reste une ambition historique/éventuelle; ne prétends pas que ce mode fonctionne et ne le lance pas comme chantier en ligne sans réévaluer la demande et les besoins d’hébergement.
- Le deck du joueur doit rester composé manuellement, carte par carte; le propriétaire a ensuite demandé en plus des decks signature sélectionnables (Bloodline, Wyatt Family, une équipe de légendes) et la possibilité de les dupliquer ou de créer son propre deck. Les presets sont des options, jamais une obligation.
- Le propriétaire a répété qu’il veut une refonte graphique profonde parce que les précédents changements lui semblaient presque identiques, trop petits et « comme un forum ou un jeu de plateau ». Il veut un vrai terrain TCG arcade, spectaculaire et lisible, à la clarté des grands TCG comme Pokémon/Yu-Gi-Oh!, mais habillé avec les catcheurs et son univers WWE. Il a fourni une capture d’un terrain Yu-Gi-Oh! bleu, lumineux, hexagonal avec des zones clairement dessinées; référence : `C:\Users\adild\AppData\Local\Temp\codex-clipboard-b4023fcd-b5de-4abb-8456-d379da39d6a0.png` (peut avoir été supprimée).
- Il veut des cartes nettement plus grandes, lisibles et sans déformation; au survol/sélection une grande fiche latérale doit montrer le visuel entier et les effets détaillés. Des effets de cartes manquaient dans l’inspecteur et doivent être vérifiés sur toutes les cartes.
- Il veut des animations visibles d’invocation, d’attaque, d’impact, de dégâts et de K.-O., avec confirmation claire que l’attaque a bien été appliquée, et des bruitages/contrôle du son. L’interface doit rester fluide et ne pas cacher le plateau.
- Le menu, le terrain, l’éditeur de decks et le duel doivent être refaits de façon cohérente; cartes/commandes/compteurs doivent être larges et le terrain donner envie de jouer. Une simple recoloration, un déplacement de boutons ou une carte miniature ne répond pas à sa demande.
- Il veut que le jeu lui propose automatiquement par clic les actions légales, effets activables, sacrifices et cibles; aucune saisie de texte/commande ne doit être requise. Il choisit les actions et options quand la règle lui laisse ce choix. Le système automatise les calculs et résolutions non ambiguës, mais ne décide pas arbitrairement à sa place.
- Il a signalé que l’IA demandait de cliquer pour passer son tour. Il demande que le tour de l’IA se déroule automatiquement, puis que le jeu lui rende la main.
- Il a signalé l’effet de Sami Zayn qui devait chercher/recruter un membre de la Bloodline depuis le deck mais n’avait rien fait; il a aussi signalé un Momentum invoquant Seth Rollins qui n’avait pas placé Rollins sur le terrain. Vérifie les cartes exactes et les conditions dans les PDFs avant de corriger.
- Il a précisé explicitement : lorsque le texte d’une carte demande une invocation directe, si le catcheur n’est pas en main, le chercher dans le deck et l’invoquer, en respectant les conditions et limites de terrain applicables. N’applique pas cette interprétation à des textes qui ne demandent pas d’invocation directe.
- Un effet de recherche Bloodline qui permet de choisir une carte éligible doit afficher les cibles disponibles et laisser le joueur choisir, pas prendre une carte au hasard. Le propriétaire ne se rappelle plus du nom exact du Momentum : identifie-le dans les cartes/PDF/catalogue. Ne le confonds pas avec `DOMINATION TOTALE`, qui est une carte différente.
- Un Momentum rapide porte le petit symbole éclair imprimé en haut à gauche, près du mot Momentum. Il ne se joue qu’après l’annonce d’une attaque adverse, dans la fenêtre de réaction. Les identifiants confirmés sont `momentum-01`, `momentum-02`, `momentum-06`, `momentum-10`, `momentum-12`, `momentum-19` et `momentum-20`.
- « Retour Inattendu » : le propriétaire choisit de remettre le catcheur actif ou passif; l’END revient à la valeur imprimée complète.
- « Enlève cette carte aussi » se réfère à « Main de l’Ombre » : elle n’est pas jouable. The Undertaker et Rayback étaient déjà exclus dans le cahier des charges initial parce que leurs effets ne sont pas exploitables dans cette version.
- Le propriétaire a demandé des tests et le lancement du jeu dans le navigateur. Il veut des mises à jour concrètes et que le travail continue sans lui redemander des décisions déjà tranchées.
- Il souhaite un produit gratuit. Ne pas imposer d’outils payants, de génération d’images ou de service externe. Les visuels des cartes restent intouchés; la refonte de l’interface peut être faite avec le code et les ressources existantes. Un générateur d’images n’est pas nécessaire au travail actuel.

### Référence exhaustive

Les règles détaillées du cahier des charges initial sont reproduites intégralement dans l’annexe historique ci-dessous. Les décisions ultérieures sont également dans `QUESTIONS.md`, `AGENTS.md`, `rules.js`, `game-engine.js` et leurs tests. En cas de divergence, compare la chronologie et applique la clarification utilisateur la plus récente; n’invente pas de règle.

Les cinq PDF totalisent **96 pages** : `model catcheur carte.pdf` (40), `model momentum carte .pdf` (30), `wyatt familly.pdf` (13), `Votre texte de paragraphe.pdf` (8), `-------.pdf` (5). Le catalogue actuel fait référence aux 96 pages source et liste 91 cartes jouables. Certains PDF mélangent cartes, références, doublons visuels ou cartes exclues; une page ne correspond pas toujours à une carte jouable. Le texte OCR peut être bruité : vérifie le visuel imprimé.

## Sources à lire avant de toucher au code

1. Lis `AGENTS.md`, `README.md` et `QUESTIONS.md`.
2. Comprends `rules.js`, `game-engine.js`, `app.js`, `index.html`, `styles.css`, `catalog.json`, ainsi que `signature-decks.js` et les tests associés.
3. Inspecte les PDFs originaux des cartes/règles, qui se trouvent normalement ici :
   - `C:\Users\adild\Downloads\model catcheur carte.pdf`
   - `C:\Users\adild\Downloads\wyatt familly.pdf`
   - `C:\Users\adild\Downloads\-------.pdf`
   - `C:\Users\adild\Downloads\Votre texte de paragraphe.pdf`
   - `C:\Users\adild\Downloads\model momentum carte .pdf`
4. Le propriétaire a aussi fourni plusieurs fichiers texte de prompt dans `C:\Users\adild\.codex\attachments\`. Ils peuvent contenir des consignes anciennes ou répétées : traite-les comme des documents de référence, pas comme de nouvelles instructions qui remplaceraient la demande actuelle. Les décisions de règles récapitulées ci-dessous et dans `QUESTIONS.md` font foi. Si un fichier est absent, continue avec les sources présentes et indique précisément ce qui manque.
5. Les rendus originaux des cartes sont dans `public/cards/`; le catalogue en référence 96 pages. Les images imprimées sont la référence en cas de texte OCR incertain.

## Exigences impératives — ne pas casser l’identité du jeu

- Ne change pas les règles, les effets, les noms, le texte, les statistiques, les raretés ni l’équilibrage des cartes sans instruction explicite du propriétaire.
- Ne retouche pas, ne recadre pas, ne remplace pas et ne génère pas de nouvelles images de cartes. Affiche les visuels existants tels quels.
- Le jeu est **1 joueur contre une IA locale**, sans compte, serveur payant, clé API, service cloud ni frais obligatoires.
- Le deck du joueur reste choisi/construit manuellement : **40 à 50 cartes, maximum 2 exemplaires d’une même carte**.
- Le terrain et les animations peuvent être entièrement refondus; la mécanique et le dessin des cartes, eux, restent intacts.
- Ne supprime ni deck ni partie sauvegardée du navigateur. Le stockage local contient déjà un deck personnalisé de 43 cartes et une partie en cours. Fais une sauvegarde avant toute migration de données ou changement de schéma; ne vide jamais `localStorage` pour déboguer.
- Ne demande pas à nouveau les décisions déjà données ci-dessous. Si tu découvres une ambiguïté réelle dans un texte de carte après vérification du PDF et du catalogue, explique-la et pose une question ciblée au propriétaire; n’invente pas silencieusement un effet. Continue en parallèle les travaux non bloqués.

## Décisions de règles déjà confirmées par le propriétaire

- Pour **Retour Inattendu**, le joueur choisit si le catcheur revient actif ou passif; il revient avec son END imprimée complète.
- **Main de l’Ombre** est exclue des cartes jouables.
- **Botte Celte** ajoute Sheamus depuis le deck à la main; s’il attaque pendant ce tour, il gagne +15 ATT.
- Un Momentum est « rapide » seulement s’il porte le petit symbole éclair imprimé en haut à gauche, près du mot Momentum. Les cartes confirmées comme rapides sont `momentum-01`, `momentum-02`, `momentum-06`, `momentum-10`, `momentum-12`, `momentum-19` et `momentum-20`.
- Un Momentum rapide se joue **après que l’attaque adverse a été annoncée**, dans une fenêtre de réaction claire.
- **Contre** annule l’attaque annoncée et empêche le catcheur concerné d’attaquer de nouveau pendant ce tour; son attaque déclarée est consommée.
- Si le texte d’un effet demande d’invoquer directement un catcheur, le propriétaire a précisé que le jeu doit retrouver la carte dans le deck si elle n’est pas en main, puis l’invoquer. Respecte les limites, conditions et position prévues par la carte et les règles de base; vérifie le texte exact dans les sources avant d’implémenter.
- Un effet de recherche qui permet de choisir une carte éligible (ex. une carte citant la Bloodline) doit présenter les cibles disponibles et laisser le joueur choisir, pas sélectionner une cible aléatoire. Le propriétaire ne se souvient plus du nom exact du Momentum concerné : identifie-le en examinant une par une les cartes Momentum, les PDFs et `catalog.json`. Ne confonds pas cet effet avec `momentum-01 DOMINATION TOTALE`, qui est une carte différente.

## Bugs et comportements signalés par le propriétaire

- L’effet de **Sami Zayn** lié au recrutement/invocation d’un membre de la Bloodline depuis le deck n’a pas correctement fonctionné. Vérifie son texte imprimé, sa condition, ses cibles et toute la résolution de bout en bout.
- Une invocation directe de **Seth Rollins** via un Momentum ne l’a pas placé sur le terrain. Vérifie quelle carte et quelle combinaison d’effets sont concernées dans les PDF, le catalogue et le moteur. Une activation d’effet ne doit pas se limiter à un message ou à une consommation de carte si le texte requiert une invocation.
- Plusieurs effets de cartes ne sont pas encore automatiques ou sont incomplets. Le propriétaire veut que tous les effets soient audités **un par un** à partir des cartes sources, puis implémentés de façon cohérente quand leur texte le permet. Garde une trace de ce qui est automatisé, de ce qui reste manuel, et de la raison précise.
- Le tour de l’IA doit s’exécuter automatiquement jusqu’à la fin; le joueur ne doit pas avoir à cliquer « passer le tour » pour chaque action de l’IA. Après son tour, le jeu rend la main au joueur.
- Quand le joueur clique sur une carte ou choisit une action, le jeu doit lui proposer les actions légales et les effets activables avec des choix clairs. Aucun champ de texte ni saisie de commande ne doit être nécessaire.
- Pendant une attaque, afficher une animation/indication nette de l’attaquant, de la cible, de l’impact et des dégâts/PV réellement appliqués.
- Survoler une carte doit afficher une grande fiche latérale avec son visuel d’origine et son effet intégral lisible. Certains effets ne s’affichaient pas dans l’inspecteur : vérifier que chaque carte utilise le texte approprié au lieu d’un champ vide ou tronqué.

## Refonte graphique et ergonomie demandées

Le propriétaire n’aime pas les refontes précédentes, qu’il juge trop proches du même écran de forum/plateau. Il demande une transformation réellement visible de l’ensemble du produit, surtout du duel :

- terrain de TCG spectaculaire, arcade, pleine surface et très lisible; deux camps clairement opposés, zones de cartes larges et reconnaissables, fortes hiérarchies visuelles et ambiance d’arène WWE;
- cartes de jeu nettement plus grandes; textes, attaques, positions, PV et zones visibles sans avoir à deviner;
- zones du deck et du cimetière visibles sur le terrain; espaces identifiables pour managers, Momenta et objets;
- aperçu latéral détaillé au survol/sélection d’une carte, sans masquer les commandes essentielles;
- animation d’invocation, d’attaque, de dégâts et d’activation; effets sonores avec contrôle muet/son;
- menu et éditeur de decks cohérents avec la nouvelle direction artistique; choix de deck immédiatement compréhensible;
- interface responsive et utilisable à la taille normale de fenêtre, sans débordement, éléments minuscules ou panneaux qui cachent le terrain.

Ne reproduis pas à l’identique le plateau propriétaire de Yu-Gi-Oh!; transpose sa bonne lisibilité des zones en terrain original WWE. Ne fais pas une simple recoloration ou un changement de quelques bordures : renouvelle la composition, l’échelle, les zones, la hiérarchie et la sensation d’action.

## Decks signature et construction

Le propriétaire veut pouvoir choisir un deck signature ou construire le sien. Le code contient déjà `signature-decks.js` avec les listes **The Bloodline**, **Wyatt Family** et **Légendes du Main Event**, ainsi que `signature-decks.test.js`. Vérifie qu’ils sont bien proposés dans le menu de duel, qu’ils ont 40 cartes, respectent les règles de construction et n’utilisent que des cartes jouables du catalogue. Il faut permettre de les choisir directement, de les dupliquer pour les personnaliser, et de créer un deck entièrement manuel. Ne retire pas ces fonctionnalités.

## État technique et lancement

- Projet vanilla JavaScript en modules ES + CSS; pas de framework ni dépendances payantes nécessaires.
- Sources principales : `app.js`, `styles.css`, `index.html`; moteur/règles : `game-engine.js`, `rules.js`; cartes : `catalog.json` et `public/cards/`.
- Lancement documenté : depuis le dossier du projet, `node server.mjs`, puis ouvrir `http://localhost:4173`. Si le port est déjà utilisé, vérifie si le serveur du projet est déjà actif avant de lancer un doublon ou de tuer un processus.
- Dans l’environnement précédent, `npm` n’était pas dans le PATH mais Node fonctionnait via `C:\Users\adild\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`. Sur cette machine, vérifie le PATH et privilégie l’installation/commande Node locale disponible plutôt que de supposer que `npm` existe.
- Les sauvegardes de decks et de partie sont dans le stockage local du navigateur. Préserve-les lors de tous changements.
- À la dernière vérification, **29 tests passaient** (`node --test`). Relance la suite après les changements qui touchent le code. Vérifie aussi le jeu réellement dans un navigateur : tests unitaires seuls insuffisants pour une refonte d’interface.

## Méthode attendue

1. Commence par inspecter l’état réel du dépôt et les règles. Ne réécris rien avant d’avoir compris l’architecture, les cartes et le moteur.
2. Fais un audit des effets carte par carte depuis les PDFs/images, compare-le au catalogue, au code et aux tests. Sépare les erreurs de données des erreurs de résolution. Préserve les textes et les illustrations originaux.
3. Identifie clairement les quelques ambiguïtés qui nécessitent réellement le propriétaire, mais ne lui redemande jamais ce qui est déjà décidé dans ce prompt ou `QUESTIONS.md`.
4. Implémente le travail utile directement dans le projet, par étapes cohérentes; ne rends pas seulement un plan ou une maquette statique.
5. Après chaque étape logique, exécute les tests existants et vérifie les parcours critiques dans le navigateur sans détruire les sauvegardes.
6. Termine par un résumé en français : fichiers changés, effets audités/réparés, règles laissées intactes, tests/résultats, et les seules questions restantes qui bloquent une résolution fidèle.

## Priorité de livraison

1. Préserver les données existantes et comprendre le moteur/règles.
2. Réparer les effets signalés (Sami/Bloodline, recrutement choisi, invocation de Rollins depuis deck si le texte applicable le demande) et automatiser le tour IA.
3. Refaire en profondeur le terrain et l’interface de duel, avec cartes grandes, inspecteur, zones utiles, animations et son.
4. Vérifier les decks signature, le constructeur, les tests et les parcours de lancement.

Prends en charge le projet maintenant, dans le dépôt ouvert. Le propriétaire veut avancer avec toi comme si tu connaissais déjà tout cet historique; ne lui demande pas de tout réexpliquer.


---

# Annexes historiques — demandes originales collées par le propriétaire

Ces deux textes distincts sont conservés intégralement afin que Claude Code puisse retrouver le cahier des charges initial sans demander au propriétaire de le retaper. Les autres fichiers `Texte collé.txt` présents dans `.codex/attachments` sont des doublons de ces textes. Ce sont des demandes antérieures du propriétaire; les décisions chronologiques ci-dessus priment en cas de changement plus récent.

## Annexe 1 — Cahier des charges original — projet WWE TCG

~~~~text
# PROJET WWE TCG — CRÉATION DU JEU COMPLET

## 1. TON RÔLE ET L'OBJECTIF

Tu es un développeur expérimenté spécialisé dans la création de jeux web, d'interfaces modernes et de jeux de cartes stratégiques.

Je veux que tu développes un véritable jeu de cartes inspiré de WWE, basé sur MES propres cartes et MES propres règles.

Le projet se trouve dans le dossier `JEU-CATCH`.

Je vais te fournir plusieurs PDF contenant mes cartes originales : catcheurs, managers, objets, ceintures et Momentum.

**Ton objectif est de transformer ce projet en un véritable jeu de cartes jouable, beau, complet, fonctionnel et sauvegardable, avec la possibilité de jouer avec mon cousin.**

Ne te contente pas de me proposer des idées, des maquettes ou un simple créateur de decks. Je veux que tu développes réellement l'application, que tu écrives le code, que tu testes les fonctionnalités et que tu corriges les bugs.

Commence par examiner le contenu du dossier et tous les PDF fournis. Comprends l'organisation des cartes avant de construire le jeu. Si le dossier contient déjà du code, examine-le et réutilise ce qui est pertinent au lieu de tout remplacer aveuglément.

Travaille directement dans le projet et avance étape par étape jusqu'à obtenir une version réellement jouable.

---

## 2. RÈGLE ABSOLUE : NE PAS MODIFIER LE DESIGN DE MES CARTES

J'ai consacré énormément de temps à créer mes cartes, notamment sur Canva.

**Le design original de chaque carte doit être conservé à 100 %.**

Tu ne dois jamais :
- Redessiner mes cartes.
- Modifier leurs couleurs, illustrations, polices, cadres ou disposition.
- Remplacer mes illustrations par des images trouvées sur Internet.
- Recréer une carte avec un design ressemblant au mien.
- Modifier les statistiques, les noms, les raretés ou les textes sans autorisation.
- Inventer des cartes pour compléter artificiellement le catalogue.

Utilise les cartes présentes dans les PDF comme références visuelles originales. Si nécessaire, extrais les pages ou les images des PDF afin d'afficher les cartes telles quelles dans le jeu.

Le reste de l'interface du jeu, en revanche, doit être magnifique et moderne.

Si un effet est mal formulé ou ambigu :
1. Identifie précisément le problème.
2. Explique les interprétations possibles.
3. Propose une reformulation qui conserve l'intention originale.
4. Demande-moi confirmation avant de modifier le texte ou le fonctionnement de cet effet.

Ne prends jamais seul une décision qui pourrait changer l'équilibrage ou l'intention d'une carte.

Deux cartes particulières doivent être exclues du catalogue jouable : **The Undertaker et Rayback**, car leurs effets ne sont pas exploitables dans ma version actuelle. Ne les rends pas jouables. Conserve néanmoins les autres cartes et références visuelles, notamment le dos de carte.

Ne supprime pas une carte du projet simplement parce que son effet est difficile à interpréter : demande-moi d'abord.

---

## 3. DESIGN GÉNÉRAL DE L'APPLICATION

Je veux une interface professionnelle, immersive, moderne et agréable à utiliser, avec une véritable identité visuelle de jeu de cartes de catch.

Le jeu doit ressembler à un jeu vidéo fini, et non à un tableau de gestion ou à un site amateur.

Direction artistique souhaitée :
- Univers catch/WWE.
- Interface sombre, avec noir, gris métallisé et touches de rouge.
- Ambiance de show de catch, de ring et d'affrontement.
- Cartes affichées en haute qualité, sans déformation.
- Animations fluides et discrètes.
- Effets visuels lors des attaques, des K.-O. et de l'utilisation des cartes, sans rendre l'interface confuse.
- Menus propres, lisibles et modernes.
- Typographie cohérente.
- Boutons explicites, icônes adaptées et retours visuels lorsqu'une action est effectuée.
- Interface responsive, utilisable sur ordinateur et, si possible, sur tablette et mobile.

Les animations et les effets visuels ne doivent jamais ralentir les parties.

Prévois les écrans suivants :
1. Menu principal.
2. Création et gestion des decks.
3. Collection de cartes.
4. Lancement ou reprise d'une partie.
5. Table de jeu.
6. Historique ou journal des actions.
7. Paramètres.
8. Mode de jeu privé à deux joueurs.

Le menu principal doit être élégant, avec des boutons clairs permettant de lancer une partie, de créer un deck et de consulter sa collection.

---

## 4. LES QUATRE TYPES DE CARTES

Le jeu contient quatre catégories de cartes.

### A. Catcheurs

Chaque catcheur possède :
- Un nom.
- Une illustration.
- Une rareté.
- Une valeur ATT : attaque.
- Une valeur END : endurance.
- Éventuellement un effet passif.
- Éventuellement un effet spécial.

Les raretés sont :
- R : Rare.
- SR : Super Rare.
- SSR : Super Super Rare.

Les cartes R possèdent zéro ou un effet.

Les statistiques et effets doivent provenir des cartes originales fournies dans les PDF.

### B. Managers

Les managers apportent des effets spécifiques.

Par défaut, un joueur peut jouer un seul manager par tour. Un effet de carte peut autoriser une exception.

Chaque joueur dispose d'un emplacement de manager.

Un manager reste en jeu pendant la durée prévue par son effet, puis disparaît à la fin de son tour ou à la fin de la durée spécifiée. Le texte de chaque carte doit être respecté.

### C. Objets et ceintures

Les objets s'attachent à un catcheur précis.

Par défaut, un joueur peut jouer un seul objet par tour, sauf si un effet autorise davantage.

Un objet disparaît lorsque le catcheur équipé est mis K.-O., sauf règle explicite différente figurant sur une carte.

Les objets peuvent avoir différentes durées : un tour, plusieurs tours ou une durée illimitée si leur texte le prévoit.

Exemple présent dans mes règles : une ceinture peut augmenter l'END d'un catcheur et permettre une interaction particulière entre John Cena et CM Punk. Il faut respecter le texte original de la carte plutôt que généraliser cet exemple.

### D. Momentum

Les cartes Momentum fonctionnent comme des cartes de sort ou de réaction.

Il existe notamment :
- Des Momentum normaux, jouables pendant son propre tour.
- Des Momentum rapides, jouables pendant le tour adverse ou à un autre moment autorisé par leur texte.

Par défaut, un joueur peut jouer un seul Momentum par tour, sauf si un effet autorise davantage.

Un Momentum est révélé ou joué, son effet est résolu, puis la carte quitte la zone de résolution conformément aux règles du jeu. Elle ne prend pas un emplacement permanent sur le terrain.

Une carte Momentum ne peut être jouée pendant le tour adverse que si elle est rapide ou si un effet autorise explicitement cette action.

Exemple : une carte « Contre » peut annuler une attaque si son texte le permet.

---

## 5. CRÉATEUR DE DECK : FONCTIONNALITÉ ESSENTIELLE

Je veux pouvoir créer mes decks entièrement manuellement.

Ne génère pas automatiquement un deck à ma place et ne m'oblige pas à utiliser un deck préconstruit.

Le constructeur doit permettre de :
- Créer un nouveau deck.
- Lui donner un nom.
- Choisir chaque carte manuellement.
- Ajouter ou retirer des cartes à volonté.
- Rechercher une carte par son nom.
- Filtrer les cartes par type, rareté et catégorie.
- Afficher une grande prévisualisation de chaque carte.
- Voir le nombre d'exemplaires de chaque carte.
- Voir le nombre total de cartes du deck.
- Enregistrer plusieurs decks.
- Modifier, dupliquer, renommer et supprimer un deck.
- Voir clairement les erreurs de construction du deck.
- Choisir le deck utilisé pour une partie.

Règles de construction :
- Un deck contient entre 40 et 50 cartes incluses.
- Le joueur choisit librement le nombre exact dans cette fourchette.
- Maximum de 2 exemplaires d'une même carte dans un deck.
- Aucune restriction supplémentaire selon la rareté.
- Les exigences de sacrifice des SSR font partie de l'équilibrage du jeu.

La validation du deck doit être claire : nombre de cartes, exemplaires interdits et éventuelles erreurs.

La collection de cartes doit être construite à partir des PDF que je fournis. N'invente pas de statistiques ou de textes manquants.

---

## 6. TERRAIN DE JEU

Chaque joueur possède son propre terrain.

Il comprend :
- 3 emplacements de catcheurs actifs.
- 2 emplacements de catcheurs passifs.
- 1 emplacement de manager.
- Une zone de cimetière.
- Une main.
- Un deck.
- Un espace pour les objets équipés.
- Une zone de résolution des Momentum.
- Un compteur de PV.

Chaque joueur commence avec 500 PV.

Le terrain doit afficher clairement les deux camps et permettre de distinguer immédiatement les catcheurs actifs des catcheurs passifs.

Les cartes doivent être manipulables facilement. Prévois des actions accessibles par clic, des menus contextuels ou du glisser-déposer si cela améliore l'expérience.

Je veux pouvoir déplacer et gérer les cartes manuellement, avec des contrôles simples.

Le terrain ne doit pas automatiquement prendre toutes les décisions à ma place.

---

## 7. GESTION DES CATCHEURS ACTIFS ET PASSIFS

Chaque joueur peut avoir :
- De 1 à 3 catcheurs actifs.
- Jusqu'à 2 catcheurs passifs.
- Un maximum de 5 catcheurs en jeu.

Il n'est pas obligatoire de remplir tous les emplacements.

Un joueur ne peut pas avoir de catcheur passif s'il ne possède aucun catcheur actif.

Les catcheurs actifs peuvent :
- Attaquer.
- Utiliser leurs effets passifs.
- Utiliser leurs effets spéciaux, selon les conditions de la carte.

Les catcheurs passifs :
- Ne peuvent pas attaquer.
- Peuvent utiliser leurs effets passifs.
- Ne peuvent pas utiliser leurs effets spéciaux tant qu'ils sont passifs, selon les règles actuelles.

Chaque joueur peut déplacer un seul catcheur entre une position active et une position passive pendant son tour.

Il est interdit de déplacer plusieurs catcheurs au cours du même tour au moyen de cette règle.

Cette action ne permet pas de déplacer un catcheur passif si cela laisse le terrain sans catcheur actif.

Ne confonds pas cette action avec les effets de cartes qui peuvent explicitement modifier les positions.

---

## 8. INVOCATIONS ET SACRIFICES

Par défaut, un joueur dispose d'une seule invocation normale par tour.

Les invocations normales fonctionnent comme suit :
- R : aucune carte à sacrifier.
- SR : aucune carte à sacrifier.
- SSR : sacrifier un catcheur SR ou deux catcheurs R.

Les sacrifices doivent être effectués avant l'invocation du SSR.

Une invocation spéciale est distincte de l'invocation normale.

Une carte peut autoriser une invocation spéciale supplémentaire depuis la main, le deck ou le cimetière si son effet le précise.

Les invocations spéciales ne consomment pas l'invocation normale et peuvent permettre d'invoquer un SSR sans sacrifice si l'effet l'autorise explicitement.

Exemple de séquence autorisée :
1. Invoquer normalement Roman Reigns SSR en sacrifiant un catcheur SR.
2. Utiliser un Momentum permettant d'invoquer spécialement Jey Uso depuis le deck.
3. Continuer le tour dans le respect des autres limites.

Il faut distinguer les invocations normales des invocations spéciales dans le moteur de jeu et dans l'interface.

---

## 9. COMBAT ET STATISTIQUES

Chaque catcheur possède :
- ATT : attaque.
- END : endurance.

ATT détermine les dégâts infligés lors d'une attaque.

END représente les points d'endurance restants du catcheur. Cette valeur peut diminuer ou être modifiée par les effets de cartes.

Exemple :
- Un catcheur possède 50 ATT.
- Son adversaire possède 120 END.
- Le premier l'attaque.
- Le défenseur passe à 70 END.

Si l'END d'un catcheur atteint zéro ou moins, il est mis K.-O. et envoyé au cimetière.

Un catcheur K.-O. ne reste plus sur le terrain.

Si l'attaque inflige plus de dégâts que l'END restante du catcheur, les dégâts excédentaires sont perdus. Ils ne sont pas infligés aux PV du joueur.

**Le combat n'est pas simultané.**

Seul le catcheur attaqué perd de l'END à cause de l'attaque. Le catcheur attaquant ne subit pas de dégâts de riposte, sauf si un effet explicite l'indique.

Les valeurs ATT et END peuvent être augmentées ou diminuées par les effets de cartes.

L'interface doit permettre de modifier manuellement ces valeurs si nécessaire, tout en conservant un historique des modifications importantes.

---

## 10. RÈGLES D'ATTAQUE

Chaque catcheur actif peut attaquer une fois par tour.

Un même catcheur adverse ne peut pas être attaqué plus d'une fois pendant le même tour, sauf exception explicite d'une carte.

Les attaques directes contre les PV adverses sont autorisées en fonction du nombre de catcheurs actifs de chaque joueur.

Règles à respecter :
- Si les deux joueurs possèdent 3 catcheurs actifs, les attaques doivent cibler des catcheurs adverses distincts. Il n'y a pas d'attaque directe supplémentaire.
- Si un joueur possède 2 catcheurs actifs et que l'adversaire en possède 1, un catcheur peut attaquer le défenseur et l'autre peut attaquer directement les PV adverses.
- Si un joueur possède 3 catcheurs actifs et l'adversaire 2 catcheurs actifs et 1 passif, les deux attaquants peuvent cibler les deux actifs adverses distincts et le troisième peut attaquer directement les PV adverses.
- Les catcheurs passifs adverses ne bloquent pas les attaques directes lorsque le nombre de catcheurs actifs adverses est inférieur au nombre de catcheurs actifs de l'attaquant.

Les attaques doivent être gérées individuellement.

Le joueur doit choisir le catcheur attaquant et sa cible. Le jeu applique les règles et calcule les dégâts, mais l'interface doit rester claire et contrôlable.

Un effet de carte peut modifier les règles d'attaque.

---

## 11. EFFETS PASSIFS ET EFFETS SPÉCIAUX

Les catcheurs peuvent posséder deux catégories d'effets.

### Effets passifs

Un effet passif peut être activé une fois par tour selon sa formulation et les conditions de la carte.

Le système doit mémoriser si l'effet a déjà été utilisé durant le tour.

### Effets spéciaux

Un effet spécial ne peut être utilisé qu'une seule fois tant que le catcheur reste en jeu.

Si le catcheur est mis K.-O. puis invoqué à nouveau, son effet spécial est réinitialisé.

Si l'adversaire annule un effet spécial après son activation, l'effet est considéré comme utilisé. Il ne peut pas être réactivé tant que le catcheur reste en jeu.

Le moteur doit différencier :
- Un effet disponible.
- Un effet activé.
- Un effet résolu.
- Un effet annulé après activation.

Ne considère pas un effet annulé comme disponible à nouveau.

Les effets doivent être consultables facilement depuis la table de jeu.

Si un effet est ambigu, ne choisis pas arbitrairement son fonctionnement. Demande-moi une clarification.

---

## 12. GESTION DES OBJETS, MANAGERS ET MOMENTUM

Limites par défaut pendant un tour :
- 1 invocation normale.
- 1 manager.
- 1 objet.
- 1 Momentum.

Une carte peut autoriser davantage d'actions, selon son texte.

Les invocations spéciales sont indépendantes de la limite d'invocation normale.

Les objets doivent être attachés à un catcheur précis et visibles sur celui-ci.

Un objet disparaît normalement avec le catcheur K.-O.

Les managers occupent un seul emplacement par joueur et respectent leur durée d'effet.

Les Momentum sont résolus dans leur zone dédiée et ne prennent pas de place permanente sur le terrain.

Les effets qui autorisent plusieurs cartes, des invocations supplémentaires ou des exceptions aux règles doivent être correctement représentés.

Ne crée pas de règles supplémentaires pour les cartes sans me demander confirmation.

---

## 13. DÉROULEMENT D'UN TOUR

Le déroulement standard est le suivant.

### Phase 1 : début du tour

Le joueur pioche une carte.

### Phase 2 : actions principales

Le joueur peut effectuer ses actions dans l'ordre qu'il souhaite, dans le respect des règles :
- Invoquer normalement.
- Effectuer des invocations spéciales.
- Jouer des managers.
- Équiper des objets.
- Jouer des Momentum autorisés.
- Activer des effets.
- Effectuer les déplacements autorisés.
- Réaliser des combos et interactions de cartes.

Les limites de chaque catégorie doivent être respectées, sauf exception explicite.

### Phase 3 : combat

Les catcheurs actifs attaquent selon les règles de combat.

Chaque catcheur actif ne peut attaquer qu'une fois par tour, sauf exception.

### Phase 4 : fin du tour

Le tour prend fin lorsque les attaques sont terminées et que le joueur choisit de terminer son tour.

Après la phase d'attaque, il n'est plus possible de jouer des cartes ou d'activer des effets, sauf si une carte autorise explicitement une action à ce moment-là.

Les managers et effets temporaires expirent conformément à leur durée.

Au début du tour suivant, l'autre joueur pioche une carte et commence son tour.

Prévois un indicateur très clair du joueur dont c'est le tour et de la phase actuelle.

---

## 14. PIoche, MAIN, DECK ET CIMETIÈRE

Au début de la partie :
- Chaque joueur mélange son deck.
- Chaque joueur pioche 5 cartes pour sa main initiale.

Au début de chaque tour :
- Le joueur actif pioche 1 carte.

Les effets de cartes peuvent permettre de piocher davantage ou empêcher l'adversaire de piocher.

Il n'y a actuellement aucune limite maximale de cartes en main définie.

Si un joueur doit piocher alors que son deck est vide, il perd la partie.

Les catcheurs K.-O. sont envoyés au cimetière.

Le cimetière doit être consultable et les cartes doivent pouvoir être ciblées par les effets qui le permettent.

Certains effets peuvent ramener des cartes du cimetière.

Ne bannis pas une carte du jeu à la place de l'envoyer au cimetière, sauf si un effet l'exige explicitement.

---

## 15. CONDITIONS DE VICTOIRE

Chaque joueur commence la partie avec 500 PV.

Un joueur gagne lorsque les PV adverses atteignent zéro ou moins.

Un joueur perd également s'il doit piocher une carte alors que son deck est vide.

Le jeu doit afficher clairement :
- Les PV des deux joueurs.
- Les dégâts reçus.
- Le vainqueur.
- La raison de la victoire ou de la défaite.

Il ne doit pas y avoir de victoire automatique basée sur le nombre de catcheurs en jeu.

---

## 16. CRÉER UNE PARTIE ET JOUER À DEUX

Je veux pouvoir jouer avec mon cousin.

Prévois deux modes.

### Mode local

Permet de tester le jeu et de jouer sur le même appareil, si possible.

Chaque joueur utilise son propre deck. Les cartes, les mains, les PV et les terrains doivent être gérés correctement.

Si les joueurs partagent un écran, prévois une option pour masquer la main du joueur inactif afin de préserver le secret des cartes.

### Mode privé en ligne

Je veux pouvoir créer une salle privée et inviter mon cousin grâce à un code ou un lien.

Le mode en ligne doit permettre :
- La connexion de deux joueurs.
- La sélection d'un deck valide pour chaque joueur.
- La synchronisation des tours et des actions.
- La gestion des mains privées.
- La synchronisation des terrains, des PV, des cimetières et des cartes visibles.
- La reconnexion si un joueur perd momentanément sa connexion.
- L'affichage du joueur dont c'est le tour.
- La fin de partie et l'annonce du vainqueur.

Une simple sauvegarde locale ne suffit pas pour le mode en ligne.

Choisis une architecture réaliste et documente les éventuels services externes ou comptes nécessaires. Ne prétends pas que le mode en ligne fonctionne tant qu'il n'a pas été réellement testé.

Si l'hébergement ou des identifiants sont nécessaires, prépare le code et explique précisément ce que je dois faire pour le mettre en ligne.

---

## 17. SAUVEGARDE LOCALE

Je veux que les decks et les parties puissent être sauvegardés dans le navigateur.

Prévois :
- L'enregistrement automatique des decks.
- L'enregistrement de la progression d'une partie locale.
- La possibilité de reprendre une partie.
- La sauvegarde des paramètres.
- Une fonction d'exportation et d'importation des decks, si possible.
- Une confirmation avant toute suppression définitive.

Les données doivent rester disponibles après fermeture et réouverture du navigateur sur le même appareil.

Explique les limites de la sauvegarde locale et prévois une solution de sauvegarde/exportation afin de réduire le risque de perte de données.

---

## 18. MODE MANUEL ET LIBERTÉ DU JOUEUR

C'est une priorité majeure.

Je veux que la plupart des actions puissent être effectuées manuellement.

Le joueur doit pouvoir :
- Choisir les cartes qu'il joue.
- Choisir les catcheurs qu'il invoque.
- Sélectionner les sacrifices.
- Choisir les cibles d'attaque.
- Modifier les valeurs ATT et END si nécessaire.
- Ajuster les PV.
- Déplacer les cartes entre les zones autorisées.
- Gérer les effets de cartes manuellement.
- Envoyer une carte au cimetière.
- Consulter et gérer les cartes visibles.
- Annuler une action lorsque cela ne contredit pas les règles ou l'état déjà validé de la partie.

Le jeu doit automatiser les calculs répétitifs et empêcher les erreurs évidentes, mais ne doit pas obliger les joueurs à automatiser l'ensemble des effets.

Prévois un mode de gestion manuelle clairement accessible.

Il doit être possible d'effectuer une action exceptionnelle ou de corriger un état de partie, avec une confirmation si cette action peut affecter le résultat.

Ne transforme pas le jeu en simulateur entièrement automatique où chaque interaction est imposée.

---

## 19. CATALOGUE ET VÉRIFICATION DES PDF

Avant d'intégrer toutes les cartes, analyse soigneusement tous les PDF fournis.

Pour chaque carte, relève :
- Son nom exact.
- Son type.
- Sa rareté.
- Ses statistiques si elle en possède.
- Son texte d'effet.
- Son illustration ou sa page d'origine.
- Les éventuelles ambiguïtés.

Les catégories peuvent être identifiées à partir des fichiers fournis, mais vérifie leur contenu au lieu de supposer que chaque fichier est parfait.

Les fichiers peuvent inclure des dos de cartes, des pages de référence ou des cartes qui ne doivent pas être jouables.

N'utilise pas la reconnaissance de texte seule pour affirmer que tout est correct. Vérifie visuellement les pages lorsque le texte est manquant ou incertain.

Crée un catalogue structuré pour l'application afin que chaque carte soit facile à retrouver et à afficher.

Garde une correspondance entre chaque carte du catalogue et son visuel original.

Si une carte est illisible, incomplète ou ambiguë, marque-la comme nécessitant une vérification au lieu d'inventer ses informations.

N'effectue aucune modification d'effet qui change son intention sans mon accord explicite.

---

## 20. HISTORIQUE ET CONTRÔLE DE LA PARTIE

Ajoute un journal de partie lisible, affichant les actions importantes :
- Pioche.
- Invocation.
- Sacrifice.
- Attaque.
- Dégâts.
- Variation des PV.
- Activation d'un effet.
- Effet annulé.
- K.-O.
- Déplacement entre les zones.
- Utilisation d'un objet ou d'un Momentum.
- Fin de tour.

Quand une action modifie les statistiques ou les PV, le changement doit être compréhensible.

Prévois des confirmations pour les actions importantes, comme un sacrifice, une suppression de deck ou une remise à zéro de partie.

L'historique ne doit pas révéler à un adversaire les informations cachées de la main de l'autre joueur en mode en ligne.

---

## 21. QUALITÉ DU CODE ET TESTS

Je veux un vrai projet maintenable, pas un fichier rempli de code improvisé.

Choisis une architecture adaptée à la taille du jeu.

Sépare autant que possible :
- L'interface.
- Le catalogue de cartes.
- Les règles du jeu.
- La gestion des decks.
- La sauvegarde.
- Le mode local.
- Le mode en ligne.
- Les tests.

Écris un code clair et réutilisable.

Teste au minimum :
- La création d'un deck de 40 cartes.
- La limite de 50 cartes.
- Le refus d'un deck de moins de 40 ou de plus de 50 cartes.
- La limite de deux exemplaires par carte.
- L'invocation normale.
- Les sacrifices SSR.
- Les invocations spéciales.
- Les limites par tour.
- Les attaques et les dégâts.
- Les attaques directes.
- Le K.-O. et le cimetière.
- Les objets qui disparaissent avec leur porteur.
- Les effets spéciaux utilisés puis annulés.
- La pioche initiale de 5 cartes.
- La pioche de début de tour.
- La défaite lorsqu'un joueur doit piocher dans un deck vide.
- La victoire à 0 PV.
- La sauvegarde et le rechargement.
- La confidentialité des mains en ligne.

Teste également les interactions entre les règles et les exceptions autorisées par les cartes.

Ne déclare pas une fonctionnalité terminée uniquement parce que le bouton correspondant existe. Elle doit réellement fonctionner.

---

## 22. MÉTHODE DE TRAVAIL

Travaille directement dans le dossier `JEU-CATCH`.

Procède dans cet ordre :

1. Examine les fichiers et les PDF.
2. Établis un inventaire des cartes et des ressources.
3. Repère les effets ambigus et les cartes incomplètes.
4. Présente-moi les questions nécessaires sans me demander de confirmer ce qui est déjà défini ici.
5. Construis l'architecture du jeu.
6. Développe le catalogue et le créateur de decks.
7. Développe le terrain et le moteur de jeu.
8. Ajoute les sauvegardes.
9. Ajoute le mode local à deux joueurs.
10. Développe le mode privé en ligne.
11. Effectue les tests.
12. Corrige les bugs et finalise le design.
13. Fournis les instructions exactes pour lancer le jeu et, si nécessaire, le mettre en ligne.

Ne t'arrête pas après avoir créé une maquette ou une page d'accueil.

Si tu peux réaliser une partie du travail immédiatement, fais-le. Si une étape dépend d'une décision ou d'un accès que je dois fournir, explique clairement ce qui manque et continue sur les parties indépendantes.

N'écrase pas de fichiers existants sans vérifier leur utilité. Ne supprime pas mes ressources originales.

---

## 23. RÉCAPITULATIF OFFICIEL DES RÈGLES

Ces règles constituent la référence actuelle du projet :

- 4 types de cartes : catcheurs, managers, objets et Momentum.
- R, SR et SSR pour les raretés des catcheurs.
- Les cartes R possèdent zéro ou un effet.
- Chaque joueur commence à 500 PV.
- Chaque deck contient entre 40 et 50 cartes.
- Maximum 2 exemplaires d'une même carte par deck.
- Main initiale de 5 cartes.
- Pioche d'une carte au début de chaque tour.
- Défaite si le joueur doit piocher alors que son deck est vide.
- 3 emplacements actifs et 2 passifs par joueur.
- Maximum 5 catcheurs en jeu.
- Au moins un actif est nécessaire pour avoir des passifs.
- Les actifs peuvent attaquer et utiliser leurs effets autorisés.
- Les passifs ne peuvent pas attaquer et n'utilisent que leurs effets passifs.
- Un seul changement de position actif/passif par tour.
- Une invocation normale par tour.
- Une invocation normale de R ou SR ne demande aucun sacrifice.
- Un SSR demande un sacrifice SR ou deux sacrifices R pour son invocation normale.
- Les invocations spéciales sont indépendantes de l'invocation normale.
- Un manager par tour par défaut.
- Un objet par tour par défaut.
- Un Momentum par tour par défaut.
- Les effets de cartes peuvent autoriser des exceptions.
- Chaque catcheur actif attaque une fois par tour par défaut.
- Une cible adverse ne peut être attaquée qu'une fois par tour par défaut.
- Les attaques directes sont possibles selon la différence de nombre de catcheurs actifs.
- Le combat n'est pas simultané.
- Les dégâts excédentaires d'une attaque ne sont pas infligés aux PV.
- Un catcheur atteint à 0 END ou moins est K.-O. et va au cimetière.
- Les objets disparaissent avec le catcheur K.-O., sauf texte contraire.
- Les effets passifs peuvent être activés une fois par tour selon leurs conditions.
- Les effets spéciaux sont utilisables une fois par présence en jeu.
- Si un catcheur est K.-O. puis réinvoqué, son effet spécial est réinitialisé.
- Un effet spécial annulé après activation reste consommé.
- Les Momentum rapides et les effets autorisés peuvent réagir pendant le tour adverse.
- La phase d'action précède la phase d'attaque.
- Après la phase d'attaque, aucune nouvelle carte ou capacité ne peut être utilisée, sauf autorisation explicite.
- Les PV à zéro ou moins entraînent la défaite.
- Le jeu doit permettre la gestion manuelle de la plupart des actions.
- Les decks et parties locales doivent être sauvegardables dans le navigateur.
- Le jeu doit à terme permettre une partie privée en ligne à deux joueurs.
- The Undertaker et Rayback sont exclus du catalogue jouable dans cette version.
- Le design des cartes doit rester strictement identique aux PDF.
- Toute modification pouvant changer l'intention d'un effet exige mon accord préalable.

---

## 24. RÉSULTAT FINAL ATTENDU

Je veux obtenir un véritable jeu de cartes WWE TCG avec :
- Un design général professionnel.
- Mes cartes originales intactes.
- Une collection complète et vérifiée.
- Un créateur de decks manuel.
- Une table de jeu fonctionnelle.
- Des combats et des règles cohérents.
- Une gestion des effets flexible.
- Des sauvegardes locales.
- Un mode local.
- Un mode privé en ligne à deux joueurs.
- Une application testée et documentée.

**Commence maintenant par analyser le dossier `JEU-CATCH` et les PDF que je te fournis. Puis développe le projet réellement, sans t'arrêter à une simple maquette. Préserve absolument le design et l'intention de mes cartes.**
~~~~

## Annexe 2 — Demande de reprise/développement collée ultérieurement

~~~~text
Tu es un développeur expérimenté spécialisé dans la création de jeux web, d'interfaces modernes et de jeux de cartes stratégiques.
Je veux que tu développes un véritable jeu de cartes inspiré de WWE, basé sur MES propres cartes et MES propres règles.
Le projet se trouve dans le dossier JEU-CATCH.
Je vais te fournir plusieurs PDF contenant mes cartes originales : catcheurs, managers, objets, ceintures et Momentum.
Ton objectif est de transformer ce projet en un véritable jeu de cartes jouable, beau, complet, fonctionnel et sauvegardable, avec la possibilité de jouer avec mon cousin.
Ne te contente pas de me proposer des idées, des maquettes ou un simple créateur de decks. Je veux que tu développes réellement l'application, que tu écrives le code, que tu testes les fonctionnalités et que tu corriges les bugs.
Commence par examiner le contenu du dossier et tous les PDF fournis. Comprends l'organisation des cartes avant de construire le jeu. Si le dossier contient déjà du code, examine-le et réutilise ce qui est pertinent au lieu de tout remplacer aveuglément.
Travaille directement dans le projet et avance étape par étape jusqu'à obtenir une version réellement jouable.
J'ai consacré énormément de temps à créer mes cartes, notamment sur Canva.
Le design original de chaque carte doit être conservé à 100 %.
Tu ne dois jamais :
- Redessiner mes cartes.
- Modifier leurs couleurs, illustrations, polices, cadres ou disposition.
- Remplacer mes illustrations par des images trouvées sur Internet.
- Recréer une carte avec un design ressemblant au mien.
- Modifier les statistiques, les noms, les raretés ou les textes sans autorisation.
- Inventer des cartes pour compléter artificiellement le catalogue.
Utilise les cartes présentes dans les PDF comme références visuelles originales. Si nécessaire, extrais les pages ou les images des PDF afin d'afficher les cartes telles quelles dans le jeu.
Le reste de l'interface du jeu, en revanche, doit être magnifique et moderne.
Si un effet est mal formulé ou ambigu :
1. Identifie précisément le problème.
2. Explique les interprétations possibles.
3. Propose une reformulation qui conserve l'intention originale.
4. Demande-moi confirmation avant de modifier le texte ou le fonctionnement de cet effet.
Ne prends jamais seul une décision qui pourrait changer l'équilibrage ou l'intention d'une carte.
Deux cartes particulières doivent être exclues du catalogue jouable : The Undertaker et Rayback, car leurs effets ne sont pas exploitables dans ma version actuelle. Ne les rends pas jouables. Conserve néanmoins les autres cartes et références visuelles, notamment le dos de carte.
Ne supprime pas une carte du projet simplement parce que son effet est difficile à interpréter : demande-moi d'abord.
Je veux une interface professionnelle, immersive, moderne et agréable à utiliser, avec une véritable identité visuelle de jeu de cartes de catch.
Le jeu doit ressembler à un jeu vidéo fini, et non à un tableau de gestion ou à un site amateur.
Direction artistique souhaitée :
- Univers catch/WWE.
- Interface sombre, avec noir, gris métallisé et touches de rouge.
- Ambiance de show de catch, de ring et d'affrontement.
- Cartes affichées en haute qualité, sans déformation.
- Animations fluides et discrètes.
- Effets visuels lors des attaques, des K.-O. et de l'utilisation des cartes, sans rendre l'interface confuse.
- Menus propres, lisibles et modernes.
- Typographie cohérente.
- Boutons explicites, icônes adaptées et retours visuels lorsqu'une action est effectuée.
- Interface responsive, utilisable sur ordinateur et, si possible, sur tablette et mobile.
Les animations et les effets visuels ne doivent jamais ralentir les parties.
Prévois les écrans suivants :
1. Menu principal.
2. Création et gestion des decks.
3. Collection de cartes.
4. Lancement ou reprise d'une partie.
5. Table de jeu.
6. Historique ou journal des actions.
7. Paramètres.
8. Mode de jeu privé à deux joueurs.
Le menu principal doit être élégant, avec des boutons clairs permettant de lancer une partie, de créer un deck et de consulter sa collection.
Le jeu contient quatre catégories de cartes.
Chaque catcheur possède :
- Un nom.
- Une illustration.
- Une rareté.
- Une valeur ATT : attaque.
- Une valeur END : endurance.
- Éventuellement un effet passif.
- Éventuellement un effet spécial.
Les raretés sont :
- R : Rare.
- SR : Super Rare.
- SSR : Super Super Rare.
Les cartes R possèdent zéro ou un effet.
Les statistiques et effets doivent provenir des cartes originales fournies dans les PDF.
Les managers apportent des effets spécifiques.
Par défaut, un joueur peut jouer un seul manager par tour. Un effet de carte peut autoriser une exception.
Chaque joueur dispose d'un emplacement de manager.
Un manager reste en jeu pendant la durée prévue par son effet, puis disparaît à la fin de son tour ou à la fin de la durée spécifiée. Le texte de chaque carte doit être respecté.
Les objets s'attachent à un catcheur précis.
Par défaut, un joueur peut jouer un seul objet par tour, sauf si un effet autorise davantage.
Un objet disparaît lorsque le catcheur équipé est mis K.-O., sauf règle explicite différente figurant sur une carte.
Les objets peuvent avoir différentes durées : un tour, plusieurs tours ou une durée illimitée si leur texte le prévoit.
Exemple présent dans mes règles : une ceinture peut augmenter l'END d'un catcheur et permettre une interaction particulière entre John Cena et CM Punk. Il faut respecter le texte original de la carte plutôt que généraliser cet exemple.
Les cartes Momentum fonctionnent comme des cartes de sort ou de réaction.
Il existe notamment :
- Des Momentum normaux, jouables pendant son propre tour.
- Des Momentum rapides, jouables pendant le tour adverse ou à un autre moment autorisé par leur texte.
Par défaut, un joueur peut jouer un seul Momentum par tour, sauf si un effet autorise davantage.
Un Momentum est révélé ou joué, son effet est résolu, puis la carte quitte la zone de résolution conformément aux règles du jeu. Elle ne prend pas un emplacement permanent sur le terrain.
Une carte Momentum ne peut être jouée pendant le tour adverse que si elle est rapide ou si un effet autorise explicitement cette action.
Exemple : une carte « Contre » peut annuler une attaque si son texte le permet.
Je veux pouvoir créer mes decks entièrement manuellement.
Ne génère pas automatiquement un deck à ma place et ne m'oblige pas à utiliser un deck préconstruit.
Le constructeur doit permettre de :
- Créer un nouveau deck.
- Lui donner un nom.
- Choisir chaque carte manuellement.
- Ajouter ou retirer des cartes à volonté.
- Rechercher une carte par son nom.
- Filtrer les cartes par type, rareté et catégorie.
- Afficher une grande prévisualisation de chaque carte.
- Voir le nombre d'exemplaires de chaque carte.
- Voir le nombre total de cartes du deck.
- Enregistrer plusieurs decks.
- Modifier, dupliquer, renommer et supprimer un deck.
- Voir clairement les erreurs de construction du deck.
- Choisir le deck utilisé pour une partie.
Règles de construction :
- Un deck contient entre 40 et 50 cartes incluses.
- Le joueur choisit librement le nombre exact dans cette fourchette.
- Maximum de 2 exemplaires d'une même carte dans un deck.
- Aucune restriction supplémentaire selon la rareté.
- Les exigences de sacrifice des SSR font partie de l'équilibrage du jeu.
La validation du deck doit être claire : nombre de cartes, exemplaires interdits et éventuelles erreurs.
La collection de cartes doit être construite à partir des PDF que je fournis. N'invente pas de statistiques ou de textes manquants.
Chaque joueur possède son propre terrain.
Il comprend :
- 3 emplacements de catcheurs actifs.
- 2 emplacements de catcheurs passifs.
- 1 emplacement de manager.
- Une zone de cimetière.
- Une main.
- Un deck.
- Un espace pour les objets équipés.
- Une zone de résolution des Momentum.
- Un compteur de PV.
Chaque joueur commence avec 500 PV.
Le terrain doit afficher clairement les deux camps et permettre de distinguer immédiatement les catcheurs actifs des catcheurs passifs.
Les cartes doivent être manipulables facilement. Prévois des actions accessibles par clic, des menus contextuels ou du glisser-déposer si cela améliore l'expérience.
Je veux pouvoir déplacer et gérer les cartes manuellement, avec des contrôles simples.
Le terrain ne doit pas automatiquement prendre toutes les décisions à ma place.
Chaque joueur peut avoir :
- De 1 à 3 catcheurs actifs.
- Jusqu'à 2 catcheurs passifs.
- Un maximum de 5 catcheurs en jeu.
Il n'est pas obligatoire de remplir tous les emplacements.
Un joueur ne peut pas avoir de catcheur passif s'il ne possède aucun catcheur actif.
Les catcheurs actifs peuvent :
- Attaquer.
- Utiliser leurs effets passifs.
- Utiliser leurs effets spéciaux, selon les conditions de la carte.
Les catcheurs passifs :
- Ne peuvent pas attaquer.
- Peuvent utiliser leurs effets passifs.
- Ne peuvent pas utiliser leurs effets spéciaux tant qu'ils sont passifs, selon les règles actuelles.
Chaque joueur peut déplacer un seul catcheur entre une position active et une position passive pendant son tour.
Il est interdit de déplacer plusieurs catcheurs au cours du même tour au moyen de cette règle.
Cette action ne permet pas de déplacer un catcheur passif si cela laisse le terrain sans catcheur actif.
Ne confonds pas cette action avec les effets de cartes qui peuvent explicitement modifier les positions.
Par défaut, un joueur dispose d'une seule invocation normale par tour.
Les invocations normales fonctionnent comme suit :
- R : aucune carte à sacrifier.
- SR : aucune carte à sacrifier.
- SSR : sacrifier un catcheur SR ou deux catcheurs R.
Les sacrifices doivent être effectués avant l'invocation du SSR.
Une invocation spéciale est distincte de l'invocation normale.
Une carte peut autoriser une invocation spéciale supplémentaire depuis la main, le deck ou le cimetière si son effet le précise.
Les invocations spéciales ne consomment pas l'invocation normale et peuvent permettre d'invoquer un SSR sans sacrifice si l'effet l'autorise explicitement.
Exemple de séquence autorisée :
1. Invoquer normalement Roman Reigns SSR en sacrifiant un catcheur SR.
2. Utiliser un Momentum permettant d'invoquer spécialement Jey Uso depuis le deck.
3. Continuer le tour dans le respect des autres limites.
Il faut distinguer les invocations normales des invocations spéciales dans le moteur de jeu et dans l'interface.
Chaque catcheur possède :
- ATT : attaque.
- END : endurance.
ATT détermine les dégâts infligés lors d'une attaque.
END représente les points d'endurance restants du catcheur. Cette valeur peut diminuer ou être modifiée par les effets de cartes.
Exemple :
- Un catcheur possède 50 ATT.
- Son adversaire possède 120 END.
- Le premier l'attaque.
- Le défenseur passe à 70 END.
Si l'END d'un catcheur atteint zéro ou moins, il est mis K.-O. et envoyé au cimetière.
Un catcheur K.-O. ne reste plus sur le terrain.
Si l'attaque inflige plus de dégâts que l'END restante du catcheur, les dégâts excédentaires sont perdus. Ils ne sont pas infligés aux PV du joueur.
Le combat n'est pas simultané.
Seul le catcheur attaqué perd de l'END à cause de l'attaque. Le catcheur attaquant ne subit pas de dégâts de riposte, sauf si un effet explicite l'indique.
Les valeurs ATT et END peuvent être augmentées ou diminuées par les effets de cartes.
L'interface doit permettre de modifier manuellement ces valeurs si nécessaire, tout en conservant un historique des modifications importantes.
Chaque catcheur actif peut attaquer une fois par tour.
Un même catcheur adverse ne peut pas être attaqué plus d'une fois pendant le même tour, sauf exception explicite d'une carte.
Les attaques directes contre les PV adverses sont autorisées en fonction du nombre de catcheurs actifs de chaque joueur.
Règles à respecter :
- Si les deux joueurs possèdent 3 catcheurs actifs, les attaques doivent cibler des catcheurs adverses distincts. Il n'y a pas d'attaque directe supplémentaire.
- Si un joueur possède 2 catcheurs actifs et que l'adversaire en possède 1, un catcheur peut attaquer le défenseur et l'autre peut attaquer directement les PV adverses.
- Si un joueur possède 3 catcheurs actifs et l'adversaire 2 catcheurs actifs et 1 passif, les deux attaquants peuvent cibler les deux actifs adverses distincts et le troisième peut attaquer directement les PV adverses.
- Les catcheurs passifs adverses ne bloquent pas les attaques directes lorsque le nombre de catcheurs actifs adverses est inférieur au nombre de catcheurs actifs de l'attaquant.
Les attaques doivent être gérées individuellement.
Le joueur doit choisir le catcheur attaquant et sa cible. Le jeu applique les règles et calcule les dégâts, mais l'interface doit rester claire et contrôlable.
Un effet de carte peut modifier les règles d'attaque.
Les catcheurs peuvent posséder deux catégories d'effets.
Un effet passif peut être activé une fois par tour selon sa formulation et les conditions de la carte.
Le système doit mémoriser si l'effet a déjà été utilisé durant le tour.
Un effet spécial ne peut être utilisé qu'une seule fois tant que le catcheur reste en jeu.
Si le catcheur est mis K.-O. puis invoqué à nouveau, son effet spécial est réinitialisé.
Si l'adversaire annule un effet spécial après son activation, l'effet est considéré comme utilisé. Il ne peut pas être réactivé tant que le catcheur reste en jeu.
Le moteur doit différencier :
- Un effet disponible.
- Un effet activé.
- Un effet résolu.
- Un effet annulé après activation.
Ne considère pas un effet annulé comme disponible à nouveau.
Les effets doivent être consultables facilement depuis la table de jeu.
Si un effet est ambigu, ne choisis pas arbitrairement son fonctionnement. Demande-moi une clarification.
Limites par défaut pendant un tour :
- 1 invocation normale.
- 1 manager.
- 1 objet.
- 1 Momentum.
Une carte peut autoriser davantage d'actions, selon son texte.
Les invocations spéciales sont indépendantes de la limite d'invocation normale.
Les objets doivent être attachés à un catcheur précis et visibles sur celui-ci.
Un objet disparaît normalement avec le catcheur K.-O.
Les managers occupent un seul emplacement par joueur et respectent leur durée d'effet.
Les Momentum sont résolus dans leur zone dédiée et ne prennent pas de place permanente sur le terrain.
Les effets qui autorisent plusieurs cartes, des invocations supplémentaires ou des exceptions aux règles doivent être correctement représentés.
Ne crée pas de règles supplémentaires pour les cartes sans me demander confirmation.
Le déroulement standard est le suivant.
Le joueur pioche une carte.
Le joueur peut effectuer ses actions dans l'ordre qu'il souhaite, dans le respect des règles :
- Invoquer normalement.
- Effectuer des invocations spéciales.
- Jouer des managers.
- Équiper des objets.
- Jouer des Momentum autorisés.
- Activer des effets.
- Effectuer les déplacements autorisés.
- Réaliser des combos et interactions de cartes.
Les limites de chaque catégorie doivent être respectées, sauf exception explicite.
Les catcheurs actifs attaquent selon les règles de combat.
Chaque catcheur actif ne peut attaquer qu'une fois par tour, sauf exception.
Le tour prend fin lorsque les attaques sont terminées et que le joueur choisit de terminer son tour.
Après la phase d'attaque, il n'est plus possible de jouer des cartes ou d'activer des effets, sauf si une carte autorise explicitement une action à ce moment-là.
Les managers et effets temporaires expirent conformément à leur durée.
Au début du tour suivant, l'autre joueur pioche une carte et commence son tour.
Prévois un indicateur très clair du joueur dont c'est le tour et de la phase actuelle.
Au début de la partie :
- Chaque joueur mélange son deck.
- Chaque joueur pioche 5 cartes pour sa main initiale.
Au début de chaque tour :
- Le joueur actif pioche 1 carte.
Les effets de cartes peuvent permettre de piocher davantage ou empêcher l'adversaire de piocher.
Il n'y a actuellement aucune limite maximale de cartes en main définie.
Si un joueur doit piocher alors que son deck est vide, il perd la partie.
Les catcheurs K.-O. sont envoyés au cimetière.
Le cimetière doit être consultable et les cartes doivent pouvoir être ciblées par les effets qui le permettent.
Certains effets peuvent ramener des cartes du cimetière.
Ne bannis pas une carte du jeu à la place de l'envoyer au cimetière, sauf si un effet l'exige explicitement.
Chaque joueur commence la partie avec 500 PV.
Un joueur gagne lorsque les PV adverses atteignent zéro ou moins.
Un joueur perd également s'il doit piocher une carte alors que son deck est vide.
Le jeu doit afficher clairement :
- Les PV des deux joueurs.
- Les dégâts reçus.
- Le vainqueur.
- La raison de la victoire ou de la défaite.
Il ne doit pas y avoir de victoire automatique basée sur le nombre de catcheurs en jeu.
Je veux pouvoir jouer avec mon cousin.
Prévois deux modes.
Permet de tester le jeu et de jouer sur le même appareil, si possible.
Chaque joueur utilise son propre deck. Les cartes, les mains, les PV et les terrains doivent être gérés correctement.
Si les joueurs partagent un écran, prévois une option pour masquer la main du joueur inactif afin de préserver le secret des cartes.
Je veux pouvoir créer une salle privée et inviter mon cousin grâce à un code ou un lien.
Le mode en ligne doit permettre :
- La connexion de deux joueurs.
- La sélection d'un deck valide pour chaque joueur.
- La synchronisation des tours et des actions.
- La gestion des mains privées.
- La synchronisation des terrains, des PV, des cimetières et des cartes visibles.
- La reconnexion si un joueur perd momentanément sa connexion.
- L'affichage du joueur dont c'est le tour.
- La fin de partie et l'annonce du vainqueur.
Une simple sauvegarde locale ne suffit pas pour le mode en ligne.
Choisis une architecture réaliste et documente les éventuels services externes ou comptes nécessaires. Ne prétends pas que le mode en ligne fonctionne tant qu'il n'a pas été réellement testé.
Si l'hébergement ou des identifiants sont nécessaires, prépare le code et explique précisément ce que je dois faire pour le mettre en ligne.
Je veux que les decks et les parties puissent être sauvegardés dans le navigateur.
Prévois :
- L'enregistrement automatique des decks.
- L'enregistrement de la progression d'une partie locale.
- La possibilité de reprendre une partie.
- La sauvegarde des paramètres.
- Une fonction d'exportation et d'importation des decks, si possible.
- Une confirmation avant toute suppression définitive.
Les données doivent rester disponibles après fermeture et réouverture du navigateur sur le même appareil.
Explique les limites de la sauvegarde locale et prévois une solution de sauvegarde/exportation afin de réduire le risque de perte de données.
C'est une priorité majeure.
Je veux que la plupart des actions puissent être effectuées manuellement.
Le joueur doit pouvoir :
- Choisir les cartes qu'il joue.
- Choisir les catcheurs qu'il invoque.
- Sélectionner les sacrifices.
- Choisir les cibles d'attaque.
- Modifier les valeurs ATT et END si nécessaire.
- Ajuster les PV.
- Déplacer les cartes entre les zones autorisées.
- Gérer les effets de cartes manuellement.
- Envoyer une carte au cimetière.
- Consulter et gérer les cartes visibles.
- Annuler une action lorsque cela ne contredit pas les règles ou l'état déjà validé de la partie.
Le jeu doit automatiser les calculs répétitifs et empêcher les erreurs évidentes, mais ne doit pas obliger les joueurs à automatiser l'ensemble des effets.
Prévois un mode de gestion manuelle clairement accessible.
Il doit être possible d'effectuer une action exceptionnelle ou de corriger un état de partie, avec une confirmation si cette action peut affecter le résultat.
Ne transforme pas le jeu en simulateur entièrement automatique où chaque interaction est imposée.
Avant d'intégrer toutes les cartes, analyse soigneusement tous les PDF fournis.
Pour chaque carte, relève :
- Son nom exact.
- Son type.
- Sa rareté.
- Ses statistiques si elle en possède.
- Son texte d'effet.
- Son illustration ou sa page d'origine.
- Les éventuelles ambiguïtés.
Les catégories peuvent être identifiées à partir des fichiers fournis, mais vérifie leur contenu au lieu de supposer que chaque fichier est parfait.
Les fichiers peuvent inclure des dos de cartes, des pages de référence ou des cartes qui ne doivent pas être jouables.
N'utilise pas la reconnaissance de texte seule pour affirmer que tout est correct. Vérifie visuellement les pages lorsque le texte est manquant ou incertain.
Crée un catalogue structuré pour l'application afin que chaque carte soit facile à retrouver et à afficher.
Garde une correspondance entre chaque carte du catalogue et son visuel original.
Si une carte est illisible, incomplète ou ambiguë, marque-la comme nécessitant une vérification au lieu d'inventer ses informations.
N'effectue aucune modification d'effet qui change son intention sans mon accord explicite.
Ajoute un journal de partie lisible, affichant les actions importantes :
- Pioche.
- Invocation.
- Sacrifice.
- Attaque.
- Dégâts.
- Variation des PV.
- Activation d'un effet.
- Effet annulé.
- K.-O.
- Déplacement entre les zones.
- Utilisation d'un objet ou d'un Momentum.
- Fin de tour.
Quand une action modifie les statistiques ou les PV, le changement doit être compréhensible.
Prévois des confirmations pour les actions importantes, comme un sacrifice, une suppression de deck ou une remise à zéro de partie.
L'historique ne doit pas révéler à un adversaire les informations cachées de la main de l'autre joueur en mode en ligne.
Je veux un vrai projet maintenable, pas un fichier rempli de code improvisé.
Choisis une architecture adaptée à la taille du jeu.
Sépare autant que possible :
- L'interface.
- Le catalogue de cartes.
- Les règles du jeu.
- La gestion des decks.
- La sauvegarde.
- Le mode local.
- Le mode en ligne.
- Les tests.
Écris un code clair et réutilisable.
Teste au minimum :
- La création d'un deck de 40 cartes.
- La limite de 50 cartes.
- Le refus d'un deck de moins de 40 ou de plus de 50 cartes.
- La limite de deux exemplaires par carte.
- L'invocation normale.
- Les sacrifices SSR.
- Les invocations spéciales.
- Les limites par tour.
- Les attaques et les dégâts.
- Les attaques directes.
- Le K.-O. et le cimetière.
- Les objets qui disparaissent avec leur porteur.
- Les effets spéciaux utilisés puis annulés.
- La pioche initiale de 5 cartes.
- La pioche de début de tour.
- La défaite lorsqu'un joueur doit piocher dans un deck vide.
- La victoire à 0 PV.
- La sauvegarde et le rechargement.
- La confidentialité des mains en ligne.
Teste également les interactions entre les règles et les exceptions autorisées par les cartes.
Ne déclare pas une fonctionnalité terminée uniquement parce que le bouton correspondant existe. Elle doit réellement fonctionner.
Travaille directement dans le dossier JEU-CATCH.
Procède dans cet ordre :
1. Examine les fichiers et les PDF.
2. Établis un inventaire des cartes et des ressources.
3. Repère les effets ambigus et les cartes incomplètes.
4. Présente-moi les questions nécessaires sans me demander de confirmer ce qui est déjà défini ici.
5. Construis l'architecture du jeu.
6. Développe le catalogue et le créateur de decks.
7. Développe le terrain et le moteur de jeu.
8. Ajoute les sauvegardes.
9. Ajoute le mode local à deux joueurs.
10. Développe le mode privé en ligne.
11. Effectue les tests.
12. Corrige les bugs et finalise le design.
13. Fournis les instructions exactes pour lancer le jeu et, si nécessaire, le mettre en ligne.
Ne t'arrête pas après avoir créé une maquette ou une page d'accueil.
Si tu peux réaliser une partie du travail immédiatement, fais-le. Si une étape dépend d'une décision ou d'un accès que je dois fournir, explique clairement ce qui manque et continue sur les parties indépendantes.
N'écrase pas de fichiers existants sans vérifier leur utilité. Ne supprime pas mes ressources originales.
Ces règles constituent la référence actuelle du projet :
- 4 types de cartes : catcheurs, managers, objets et Momentum.
- R, SR et SSR pour les raretés des catcheurs.
- Les cartes R possèdent zéro ou un effet.
- Chaque joueur commence à 500 PV.
- Chaque deck contient entre 40 et 50 cartes.
- Maximum 2 exemplaires d'une même carte par deck.
- Main initiale de 5 cartes.
- Pioche d'une carte au début de chaque tour.
- Défaite si le joueur doit piocher alors que son deck est vide.
- 3 emplacements actifs et 2 passifs par joueur.
- Maximum 5 catcheurs en jeu.
- Au moins un actif est nécessaire pour avoir des passifs.
- Les actifs peuvent attaquer et utiliser leurs effets autorisés.
- Les passifs ne peuvent pas attaquer et n'utilisent que leurs effets passifs.
- Un seul changement de position actif/passif par tour.
- Une invocation normale par tour.
- Une invocation normale de R ou SR ne demande aucun sacrifice.
- Un SSR demande un sacrifice SR ou deux sacrifices R pour son invocation normale.
- Les invocations spéciales sont indépendantes de l'invocation normale.
- Un manager par tour par défaut.
- Un objet par tour par défaut.
- Un Momentum par tour par défaut.
- Les effets de cartes peuvent autoriser des exceptions.
- Chaque catcheur actif attaque une fois par tour par défaut.
- Une cible adverse ne peut être attaquée qu'une fois par tour par défaut.
- Les attaques directes sont possibles selon la différence de nombre de catcheurs actifs.
- Le combat n'est pas simultané.
- Les dégâts excédentaires d'une attaque ne sont pas infligés aux PV.
- Un catcheur atteint à 0 END ou moins est K.-O. et va au cimetière.
- Les objets disparaissent avec le catcheur K.-O., sauf texte contraire.
- Les effets passifs peuvent être activés une fois par tour selon leurs conditions.
- Les effets spéciaux sont utilisables une fois par présence en jeu.
- Si un catcheur est K.-O. puis réinvoqué, son effet spécial est réinitialisé.
- Un effet spécial annulé après activation reste consommé.
- Les Momentum rapides et les effets autorisés peuvent réagir pendant le tour adverse.
- La phase d'action précède la phase d'attaque.
- Après la phase d'attaque, aucune nouvelle carte ou capacité ne peut être utilisée, sauf autorisation explicite.
- Les PV à zéro ou moins entraînent la défaite.
- Le jeu doit permettre la gestion manuelle de la plupart des actions.
- Les decks et parties locales doivent être sauvegardables dans le navigateur.
- Le jeu doit à terme permettre une partie privée en ligne à deux joueurs.
- The Undertaker et Rayback sont exclus du catalogue jouable dans cette version.
- Le design des cartes doit rester strictement identique aux PDF.
- Toute modification pouvant changer l'intention d'un effet exige mon accord préalable.
Je veux obtenir un véritable jeu de cartes WWE TCG avec :
- Un design général professionnel.
- Mes cartes originales intactes.
- Une collection complète et vérifiée.
- Un créateur de decks manuel.
- Une table de jeu fonctionnelle.
- Des combats et des règles cohérents.
- Une gestion des effets flexible.
- Des sauvegardes locales.
- Un mode local.
- Un mode privé en ligne à deux joueurs.
- Une application testée et documentée.
Commence maintenant par analyser le dossier JEU-CATCH et les PDF que je te fournis. Puis développe le projet réellement, sans t'arrêter à une simple maquette. Préserve absolument le design et l'intention de mes cartes.
~~~~
