# Décisions de règles fournies par le joueur

- **Retour Inattendu** : le joueur choisit actif ou passif. Le catcheur revient à son END imprimée complète.
- **Main de l’Ombre** : exclue des cartes jouables; son visuel source reste conservé.
- **Botte Celte** : ajoute la carte Sheamus à la main. Si Sheamus attaque pendant ce tour, il gagne +15 ATT.
- **Momentum rapide** : symbole éclair imprimé en haut à gauche près du mot Momentum. Les cartes confirmées comme rapides sont `momentum-01`, `momentum-02`, `momentum-06`, `momentum-10`, `momentum-12`, `momentum-19` et `momentum-20`.
- **Fenêtre de réaction** : un Momentum rapide est joué après l’annonce de l’attaque adverse.
- **Contre** : annule l’attaque annoncée et empêche le catcheur qui l’a annoncée d’attaquer à nouveau ce tour. Son attaque déclarée est consommée.

## Décisions du 21 octobre 2026

- **Soins** (« Regagne +X END », « Soigne +X END ») : pas de plafond, l'END peut dépasser la valeur imprimée.
- **Endormir** un catcheur : il ne peut pas attaquer pendant son prochain tour ; ses effets continuent de fonctionner.
- **L'Ultime Opportunité** : on compte les catcheurs du joueur mis K.O. pendant le tour en cours.
- **« +5 ATT / +5 END chaque tour »** (Ceinture poids lourd, Ceinture Universelle sur Roman Reigns) : le bonus s'accumule à chaque tour du joueur tant que l'objet est équipé.

- **« Tous les membres de la Bloodline sont sur le ring »** (Roman Reigns `wyatt-08`, The Bloodline Rassemblement) : Roman Reigns, Jey Uso, Jimmy Uso et Sami Zayn (n'importe quelle version de chaque carte, zone active ou passive).
- **Jey Uso (`wyatt-09`)** : si Roman Reigns doit être mis K.O., c'est Jey Uso qui est mis K.O. à sa place ; Roman reste sur le ring sans subir le coup.
- **Défense inébranlable** : la réduction de -40 dure jusqu'à la fin du prochain tour adverse.

## Règles ajoutées à la demande du propriétaire (21 octobre 2026)

- **Invocation SSR** : sacrifice de **1 SR, 1 SSR ou 2 R** (une SSR peut désormais être sacrifiée pour en invoquer une autre).
- **Changement de position** : une fois par tour, en phase d'action : passer un catcheur d'actif à passif (en gardant au moins un actif), de passif à actif, ou **échanger** un actif et un passif (utile quand les deux zones sont pleines).
- **Attaque directe** : en plus de la règle de base (plus d'actifs que l'adversaire), dès que **tous les actifs adverses ont déjà été attaqués ce tour** (par exemple après Leap of Faith), les catcheurs qui n'ont pas encore attaqué peuvent frapper directement les PV.
- **Premier tour** : le joueur qui commence ne peut pas attaquer pendant le tout premier tour de la partie.
- **Pile ou face** : avant chaque duel, le joueur choisit pile ou face ; le gagnant commence (et pioche sa carte de début de tour).
- **Decks de l'IA** : l'IA joue un deck de faction tiré au hasard (decks signature, The Shield, D-Generation X) — `data/ai-decks.js`.

## Archétype nWo (validé par le propriétaire le 22 octobre 2026)

- 9 cartes créées dans son Canva (dossier « ARCHETYPE nWo ») : `nwo-01` à `nwo-09`, deck signature « New World Order ».
- **Marque nWo** : un catcheur marqué le reste tant qu'il ne quitte pas le ring (K.O., sacrifice, ou pris par Hogan : la marque disparaît).
- Quand une carte marque « un adversaire actif » (X-Pac à son arrivée, Spray à l'équipement, nWo 4 Life,
  2e cible de Nash), **le joueur choisit toujours la cible** (demande du propriétaire, 22/10/2026) parmi les actifs
  adverses non marqués (pour Nash : pas la cible déjà touchée). La marque est obligatoire ; s'il ne reste personne
  à marquer, rien ne se passe. L'IA, elle, choisit l'actif adverse non marqué qui a le plus d'ATT.
- Hogan et X-Pac : leur effet « à son arrivée » est automatique (pas de bouton) ; Hall, Nash, Steiner : passifs à activer.
- Eric Bischoff : une fois par tour, au choix, marquer (on vise) ou chercher une carte nWo ; -5 ATT aux marqués en permanence.
- Spray : uniquement sur un catcheur de la nWo.

## Archétype The Authority (validé par le propriétaire le 22 octobre 2026)

- 9 cartes créées dans son Canva (dossier « ARCHETYPE THE AUTHORITY ») : `auth-01` à `auth-09`, deck signature « The Authority ».
- **Envoyer en zone passive** (Décret du manager, Chokeslam de Kane, Best for Business) : seulement si l'adversaire garde au
  moins un actif et a une place passive libre. Best for Business bloque en plus le catcheur en passif pendant son prochain tour
  (ni déplacement ni échange vers l'actif).
- **« Déjà touché ce tour-ci »** (Cash-in de Rollins) = a perdu de l'END ce tour-ci (attaque ou effet).
- **Match Handicap** : ce tour-ci, les catcheurs de l'Authority peuvent viser un adversaire déjà attaqué (exception à la règle
  « une cible une seule fois par tour »).
- **Big Show (Garde du corps, passif activé)** : tant qu'il est actif et pas encore attaqué ce tour-ci, les attaques à une seule
  cible (et l'attaque directe) doivent le viser ; les attaques sur plusieurs cibles restent libres.
- **J&J Security** : la protection de Rollins est une réponse (comme Strowman) disponible tant que J&J est sur le ring.
- **Kane** : à son arrivée sur le ring, le joueur choisit une carte Authority du deck (il peut renoncer) ; l'IA prend Rollins en priorité.
- **MITB** : encaissée (défaussée) pendant ton tour, son porteur actif gagne une attaque de plus et +20 ATT jusqu'à la fin du tour.
- **Décret « pas de SSR »** : bloque toute invocation de SSR adverse (normale ou spéciale) jusqu'à la fin de son prochain tour.

## Archétype Evolution (validé par le propriétaire le 22 octobre 2026)

- 9 cartes créées dans son Canva (dossier « ARCHETYPE EVOLUTION ») : `evo-01` à `evo-09`, deck signature « Evolution ».
- **Attaque en meute** (règle imprimée sur les 4 catcheurs) : une fois par tour, un membre d'Evolution actif attaque un
  catcheur adverse actif avec un autre membre d'Evolution actif qui peut encore attaquer. Un seul coup : les ATT et bonus de
  chacun s'additionnent (l'attaque spéciale du meneur peut s'y ajouter). Jamais sur les PV. Les règles de ciblage restent
  (Big Show d'abord, une cible une seule fois par tour). Les réductions du défenseur s'appliquent une fois au coup commun.
- **Repos** (choix du propriétaire : « les deux catcheurs ne peuvent pas attaquer au prochain tour ») : tous les participants
  utilisent leur attaque et ne peuvent pas attaquer à leur prochain tour, **même si l'attaque est annulée** (Contre, RKO…).
- Le Leader (+15), Le Muscle (+10) et Legend Killer (+15 contre une SSR) sont des passifs à activer, comme les autres.
- **Masse** : +10 ATT en permanence, et +10 dégâts de plus quand le porteur participe à une meute.
- **Assaut Total** : ce tour-ci, la meute peut réunir 3 membres (2 partenaires) ; elle reste limitée à une par tour.
- **Tous pour un** (Momentum rapide) : annule seulement l'attaque annoncée ; l'adversaire peut encore attaquer ensuite.
- **Ric Flair** : Mentor se déclenche à son arrivée (le joueur choisit le membre, il peut renoncer ; l'IA prend Triple H).
  « Woooo ! » invoque n'importe quelle carte Triple H (comme J&J avec Seth Rollins). Refusé si le Décret interdit les SSR.

## Façon d'appliquer les effets (cahier des charges §11 : « selon sa formulation »)

Mise à jour du 21 octobre 2026, à la demande du propriétaire (« je veux choisir d'activer ») :

- **Tout effet passif a un bouton « Activer »** (une fois par tour). Il ne s'applique que s'il a été activé, puis
  reste actif jusqu'au début du tour suivant de son propriétaire (il protège donc aussi pendant le tour adverse).
  Bonus (« gagne +X », « réduit les dégâts reçus ») et déclencheurs (« chaque fois qu'il attaque », « après avoir subi une attaque ») ne marchent que pendant cette période.
- Passifs « à action » (« peut invoquer », « endors », « soigne », « piochez ») : l'effet se produit au moment du clic.
- Seuls les effets qui se déclenchent quand la carte arrive au cimetière (Strowman, Rowan) restent proposés automatiquement.
- Effet spécial **d'attaque** (« inflige +X dégâts ») : bouton « Attaque spéciale » disponible dès la phase Actions ;
  au lancement de l'attaque, le jeu passe en phase Combat. Il est consommé (une fois tant que le catcheur reste en jeu).
- L'IA active elle aussi ses effets passifs pendant son tour.

Ces choix sont consignés pour éviter de redemander les mêmes précisions. Les autres effets restent fidèles aux visuels; lorsqu’une résolution n’est pas explicitement transcrite, le mode manuel évite d’inventer son résultat.
