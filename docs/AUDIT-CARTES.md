# Audit des cartes — 21 octobre 2026

Les 96 images de `public/cards/` ont été relues une par une. Le texte imprimé de chaque carte est
désormais dans `data/catalog.json` (champ `effects`), avec sa faction (`faction`) et son surnom
(`nickname`). L'ancien texte OCR illisible (`textSnippet`) a été supprimé.

## Ce qui a été vérifié

- **Stats, raretés, catégories, symbole ⚡ rapide** : identiques aux images pour les 96 cartes.
- **Cartes exclues** : The Undertaker (×2), Rayback, Main de l'Ombre et le dos de carte restent non jouables.
- **Le dos de carte** (`catcheur-40`) sert maintenant d'image pour les pioches.

## Écarts corrigés dans le catalogue

| Carte | Avant | Texte imprimé |
| --- | --- | --- |
| `wyatt-09` Jey Uso (effet passif) | « mettre cette carte à la place » | « vous pouvez mettre K.O. cette carte à la place » |
| `momentum-24` | nom illisible (« TTTRRRIII… ») | TRIPLE POWER BOMBE |

Les noms imprimés avec une faute (`catcheur-08` « ROMAN REINGS », `catcheur-32` « SHAWN MICHAEL ») sont laissés tels quels.

## Effets résolus automatiquement par le jeu

Code : `src/engine/game-engine.js` et `src/engine/card-effects.js`. Tests : `tests/`.

| Effet | Cartes |
| --- | --- |
| Invocation directe (main, sinon deck, sans sacrifice) | `momentum-19` à `23`, `27` à `30` |
| Chercher une carte dans le deck → main | `momentum-05`, `momentum-26` (+15 ATT Sheamus), `wyatt-05`, `wyatt-10` (spécial), `wyatt-11` (passif) |
| Piocher 2 cartes sous condition | `momentum-08`, `momentum-15`, `momentum-17` |
| Triple Power Bombe (2 membres du Shield depuis le deck) | `momentum-24` |
| Retour Inattendu (catcheur du cimetière, END complète) | `momentum-16` |
| Contre (annule l'attaque, plus d'attaque ce tour) | `momentum-20` |
| Sami Zayn protège Roman Reigns | `wyatt-11` (spécial) |
| Stop Momentum (adversaire bloqué ce tour) | `momentum-12` |
| Domination Totale (pas de sacrifice pour une SSR adverse ce tour) | `momentum-01` |
| Mr. McMahon (une SSR sans sacrifice, une fois par partie) | `managers-02` |
| Stephanie McMahon (+1 Momentum, une fois par partie) | `managers-05` |

**Conditions vérifiées avant de jouer** (la carte ne peut pas être gâchée) : `momentum-04`, `06`, `07`,
`09`, `11`, `13`, plus toutes les cartes ci-dessus.

## Effets encore à appliquer à la main

Le joueur active l'effet, lit le texte sur l'écran géant et utilise les corrections ATT / END / PV.

| Groupe | Cartes | Pourquoi |
| --- | --- | --- |
| Bonus continus (« tant que… », « chaque tour ») | objets `01`–`08`, `wyatt-07`, `managers-01`, `managers-03`, passifs de catcheurs | Il faut d'abord un système de modificateurs temporaires/permanents dans le moteur. |
| Déclencheurs (« après avoir subi une attaque », « quand il est mis K.O. ») | la plupart des effets passifs et spéciaux de catcheurs | Demande un système d'événements (attaque reçue, K.O., Momentum joué…). |
| Momenta à bonus de tour | `momentum-02`, `03`, `04`, `06`, `07`, `09`, `11`, `13`, `14`, `18` | Même système de modificateurs. |
| Effets multi-étapes | `wyatt-06` (défausse + invocation), `wyatt-12` (Jey Uso + 2 Momenta au tour suivant), `wyatt-13`, `managers-04` (Teddy Long) | À faire après les modificateurs. |
| Texte ambigu | `momentum-10` (« chaque catcheur mis K.O. » : dans le match ou ce tour ?) ; soins « +10 END » (peut-on dépasser l'END imprimée ?) | Question à poser au propriétaire avant d'automatiser. |

## Prochaine étape conseillée

Ajouter au moteur un **système de modificateurs** (bonus ATT/END avec durée : ce tour, tant qu'équipé,
tant qu'actif) et un **système d'événements**. À eux deux, ils permettraient d'automatiser
la grande majorité des effets restants.
