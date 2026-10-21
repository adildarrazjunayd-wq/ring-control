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
- **Premier tour** : le joueur qui commence ne peut pas attaquer pendant le tout premier tour de la partie.
- **Pile ou face** : avant chaque duel, le joueur choisit pile ou face ; le gagnant commence (et pioche sa carte de début de tour).
- **Decks de l'IA** : l'IA joue un deck de faction tiré au hasard (decks signature, The Shield, D-Generation X) — `data/ai-decks.js`.

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
