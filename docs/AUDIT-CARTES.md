# Audit des cartes — mis à jour le 21 octobre 2026

Les 96 images de `public/cards/` ont été relues une par une. Le texte imprimé de chaque carte est
dans `data/catalog.json` (champ `effects`), avec sa faction (`faction`) et son surnom (`nickname`).
Les règles d'application et les réponses du propriétaire sont dans `docs/DECISIONS-REGLES.md`.

## Vérifications

- **Stats, raretés, catégories, symbole ⚡ rapide** : identiques aux images pour les 96 cartes.
- **Exclues** : The Undertaker (×2), Rayback, Main de l'Ombre et le dos de carte (utilisé comme image de pioche).
- **Corrigé** : `wyatt-09` (texte du passif) et le nom de `momentum-24` (TRIPLE POWER BOMBE).
  Les fautes imprimées « ROMAN REINGS » et « SHAWN MICHAEL » sont gardées ; le moteur les reconnaît quand même.

## Où vit chaque effet dans le code

| Fichier | Contenu |
| --- | --- |
| `src/engine/combat.js` | Bonus continus, calcul des dégâts, attaques spéciales, déclencheurs (attaque, K.-O., début de tour). |
| `src/engine/activations.js` | Effets à activer (catcheurs, cimetière), Momenta qui visent une carte ou invoquent, choix au cimetière. |
| `src/engine/card-effects.js` | Recherches dans le deck, pioches, conditions des Momenta, managers à activer. |
| `src/engine/game-engine.js` | Invocations directes par Momentum, Contre, réponses (Sami, Drew, Randy, Big Gold, Strowman). |

## Catcheurs

« À activer » : chaque effet passif a un bouton ; il s'applique une fois activé et jusqu'au début du tour suivant (voir `docs/DECISIONS-REGLES.md`).

| Carte | Effet passif | Effet spécial |
| --- | --- | --- |
| `catcheur-01` Roman Reigns | ✅ à activer : Bloodline +5 ATT | ✅ à activer : cible ne peut pas attaquer au prochain tour |
| `catcheur-02` The Rock | ✅ à activer : pioche quand il attaque | ✅ attaque spéciale +10 (< 70 END) |
| `catcheur-03` Brock Lesnar | ✅ à activer : ignore les réductions de dégâts | ✅ attaque spéciale +20 s'il a déjà été attaqué |
| `catcheur-04` Seth Rollins | ✅ à activer : +5 dégâts et +5 END après un Momentum | ✅ à activer : passifs adverses annulés 1 tour |
| `catcheur-05` Dean Ambrose | ✅ à activer : +15 s'il a subi des dégâts | ✅ attaque spéciale +15 (2 autres Shield actifs), pas de Momentum adverse en réponse |
| `catcheur-06` Seth Rollins | ✅ à activer : +5 et 2e attaque si un autre Shield a attaqué | ✅ attaque spéciale sur tous les catcheurs adverses (+10) |
| `catcheur-07` Dean Ambrose | ✅ à activer : +10 END après une attaque subie | ✅ à activer : END adverse (> 60) divisée par 2 |
| `catcheur-08` Roman Reigns | ✅ à activer : +5 s'il attaque le premier | ✅ attaque spéciale +25 + END d'un autre actif divisée par 2 |
| `catcheur-09` Kevin Owens | ✅ à activer : +10 END quand il attaque | ✅ attaque spéciale +20 s'il est le seul actif |
| `catcheur-10` Drew McIntyre | ✅ à activer : +5 si END > 30 | ✅ réponse : annule l'attaque, 5 dégâts à l'attaquant |
| `catcheur-11` Bobby Lashley | ✅ à activer : +5 contre < 75 END | — |
| `catcheur-12` Gunther | ✅ à activer : -10 dégâts reçus | ✅ attaque spéciale +15 s'il a déjà été attaqué |
| `catcheur-13` Randy Orton | ✅ à activer : effets adverses annulés ce tour | ✅ réponse : annule l'attaque, 10 dégâts à l'attaquant |
| `catcheur-14` AJ Styles | ✅ à activer : +5 contre < 80 END | ✅ attaque spéciale +15 après un Momentum |
| `catcheur-15` Finn Balor | ✅ à activer : +10 contre > 85 END | ✅ attaque spéciale : dégâts doublés (< 80 END) |
| `catcheur-16` Damien Priest | ✅ à activer : +5 END après une attaque réussie | ✅ à activer : dégâts d'un actif adverse /2 au prochain tour |
| `catcheur-17` Shinsuke Nakamura | — | ✅ attaque spéciale +15, ignore les défenses |
| `catcheur-18` Sheamus | ✅ à activer : +5 END quand il est attaqué | — |
| `catcheur-19` Braun Strowman | ✅ à activer : -5 dégâts reçus | ✅ attaque spéciale +20 (> 80 END) |
| `catcheur-20` Jey Uso | ✅ à activer : seul actif → +10 ATT, -5 dégâts reçus | ✅ attaque spéciale +20 (et -10 END de plus si > 80) |
| `catcheur-21` Jey Uso | ✅ à activer : +5 ATT si Jimmy actif | ✅ attaque spéciale +15 s'il a subi des dégâts |
| `catcheur-22` Jimmy Uso | ✅ à activer : +5 END si Jey actif | ✅ attaque spéciale sur deux actifs (+10 chacun) |
| `catcheur-23` Solo Sikoa | — | ✅ attaque spéciale +20 (< 75 END) |
| `catcheur-24` Edge | ✅ à activer : +5 après un Momentum | ✅ attaque spéciale +15 (> 80 END) |
| `catcheur-25` Rey Mysterio | ✅ à activer : +10 ATT | ✅ attaque spéciale +20 (< 80 END) |
| `catcheur-26` Big E | ✅ à activer : +5 END aux actifs à chaque début de tour | ✅ attaque spéciale +25 |
| `catcheur-27` Kofi Kingston | — | ✅ attaque spéciale +15 après un Momentum |
| `catcheur-28` Xavier Woods | ✅ à activer : pioche 1 carte de plus par tour s'il est actif | — |
| `catcheur-31` Triple H | ✅ à activer : invoque un membre DX du deck | ✅ à activer : +5 ATT s'il porte un objet |
| `catcheur-32` Shawn Michaels | ✅ à activer : endort un adversaire | ✅ à activer : quand il est K.O., 25 dégâts à celui qui l'a mis K.O. |
| `catcheur-33` Hornswoggle | — | ✅ à activer : invoque un Hornswoggle du deck (1 fois par partie) |
| `catcheur-34` Cody Rhodes | ✅ à activer : alliés +5/+5, pioche par Momentum joué | ✅ attaque spéciale +25 et effets indiqués |
| `catcheur-35` John Cena | ✅ à activer : alliés +10 END quand attaqués, pioche si allié K.O. | ✅ attaque spéciale +15, adversaire privé de Momentum |
| `catcheur-36` CM Punk | ✅ à activer : actifs +5 END au début du tour | ✅ attaque spéciale +25 (sacrifie un Momentum) et effets indiqués |
| `catcheur-38` Bronson Reed | ✅ à activer : endort un adversaire (1 fois, s'il a subi des dégâts) | — |
| `catcheur-39` Bray Wyatt | ✅ à activer : adversaires -10 dégâts | ✅ attaque spéciale +25, cible privée d'attaque |
| `wyatt-01` Braun Strowman | ✅ à activer : au cimetière → envoyer une carte Wyatt Family du deck au cimetière (au choix) | ✅ réponse depuis le cimetière : bannir pour annuler une attaque sur Bray Wyatt |
| `wyatt-02` Erick Rowan | ✅ à activer : au cimetière → carte Wyatt Family R/SR du deck en main (au choix) | ✅ depuis le cimetière : bannir, Bray Wyatt +20 ATT ce tour |
| `wyatt-03` Luke Harper | ✅ depuis le cimetière : endort un adversaire si Bray Wyatt est actif (1 fois par tour) | ✅ à activer : se sacrifie et invoque Bray Wyatt de la main |
| `wyatt-04` Bray Wyatt | ✅ à activer : invoque un Wyatt Family du cimetière | ✅ attaque spéciale : prend le contrôle du catcheur mis K.O. (END /2) |
| `wyatt-08` Roman Reigns | ✅ à activer : 2 attaques si Roman, Jey, Jimmy et Sami sont sur le ring | ✅ attaque spéciale sur tous les actifs si END ≤ 55 |
| `wyatt-09` Jey Uso | ✅ à activer : mis K.O. à la place de Roman Reigns | ✅ à activer : invoque Jimmy Uso du deck, Jey n'attaque pas ce tour |
| `wyatt-10` Jimmy Uso | ✅ à activer : 10 dégâts à un actif adverse | ✅ cherche Paul Heyman dans le deck |
| `wyatt-11` Sami Zayn | ✅ cherche un Momentum Bloodline dans le deck | ✅ réponse : protège Roman Reigns |

## Managers

| Carte | Effet |
| --- | --- |
| `managers-01` Paul Heyman | ✅ à activer : Roman Reigns / Brock Lesnar actifs +10 ATT +10 END |
| `managers-02` Mr. McMahon | ✅ à activer : une SSR sans sacrifice (1 fois par partie) |
| `managers-03` Triple H | ✅ à activer : +10 ATT à tous tes catcheurs si un membre de faction est actif |
| `managers-04` Teddy Long | ✅ à activer : deux catcheurs d'une même faction depuis la main |
| `managers-05` Stephanie McMahon | ✅ à activer : +1 Momentum (1 fois par partie) |

## Objets

| Carte | Effet |
| --- | --- |
| `objets-01` Échelle | ✅ attaque à l'Échelle : 10 dégâts à chaque actif adverse, puis -10 END |
| `objets-02` Bâton de Kendo | ✅ +10 dégâts par attaque, adversaire privé de Momentum au prochain tour |
| `objets-03` Chaise en acier | ✅ +15 contre un catcheur, puis -5 END pour le porteur |
| `objets-04` Table | ✅ +20 si le porteur a au moins 50 ATT, puis détruite |
| `objets-05` Ceinture Universelle | ✅ +10 ATT ; sur Roman Reigns, +5 END cumulés à chaque tour |
| `objets-06` Big Gold | ✅ une invocation de plus ce tour ; Edge / Triple H / Randy Orton peuvent éviter une attaque (1 fois par partie) |
| `objets-07` Ceinture poids lourd | ✅ deux Momenta par tour ; Roman (Shield) / Seth (Shield) / Brock : +5 ATT cumulés à chaque tour |
| `objets-08` Ceinture « The Champ » | ✅ +10 END ; John Cena ou CM Punk attaquent deux fois le tour où elle est équipée |
| `wyatt-07` Lanterne de l'obscurité | ✅ sur Bray Wyatt : +10 ATT / -10 END ; au cimetière → reprendre un Momentum du cimetière |

## Momenta

Tous automatisés (✅) :
`momentum-01` à `24`, `26` à `30`, `wyatt-05`, `wyatt-06`, `wyatt-12`, `wyatt-13`.

- `momentum-07` Défense inébranlable : -40 dégâts jusqu'à la fin du prochain tour adverse.
- `wyatt-13` The Bloodline Rassemblement : Roman Reigns depuis le deck (1 fois), Bloodline +10 ATT et attaque des passifs, tant que Roman, Jey, Jimmy et Sami sont sur le ring.

**Plus aucun effet n'est en attente d'une réponse.** Toutes les cartes jouables sont automatisées.

## Interprétations prises (à confirmer si besoin)

- Les objets sans mention « détruite » restent équipés et s'appliquent à chaque attaque (Kendo, Chaise, Échelle).
- **Boy Toy** (Shawn Michaels) : les 25 dégâts vont au catcheur qui l'a mis K.O.
- **You Can't See Me** (Cena) : comme tout effet spécial, une seule fois tant qu'il reste sur le ring.
- **Hot Tag Moment** : le catcheur visé passe en passif ; l'attaque annoncée contre lui est alors perdue.
- « Membre de la Wyatt Family » : faction Wyatt Family, cartes qui citent la Wyatt Family, et Bray Wyatt.
