const recipes = [
  {
    id: 'bloodline',
    name: 'The Bloodline',
    theme: 'Faction · Contrôle et pression',
    description: 'Roman, les Usos, Solo et Sami soutenus par les cartes de la Bloodline. Beaucoup de Momenta pour piocher et réunir la famille.',
    // Renforcé le 21/10/2026 (31 % → 49 % de victoires en simulation) : L'appel du Main Event,
    // Rappel stratégique et Retour inattendu remplacent Domination totale, Acknowledge me et
    // Pioche tactique ; la Ceinture poids lourd (2 Momenta par tour) remplace « The Champ ».
    cardIds: [
      'catcheur-01', 'catcheur-20', 'catcheur-21', 'catcheur-22', 'catcheur-23', 'catcheur-02',
      'wyatt-08', 'wyatt-09', 'wyatt-10', 'wyatt-11',
      'managers-01', 'wyatt-12', 'wyatt-13', 'momentum-17', 'momentum-08',
      'momentum-05', 'momentum-16', 'momentum-20', 'objets-05', 'objets-07',
    ],
  },
  {
    id: 'wyatt-family',
    name: 'Wyatt Family',
    theme: 'Faction · Résilience et retour',
    description: 'Bray Wyatt, Strowman, Rowan et Harper avec leurs Momenta et objets de soutien.',
    // Rééquilibré le 23/10/2026 (44 % → 49 % après le renforcement de DX, simulations de 2 800 parties) :
    // Rappel stratégique remplace Atemi stratégique.
    cardIds: [
      'wyatt-01', 'wyatt-02', 'wyatt-03', 'wyatt-04', 'catcheur-39', 'catcheur-19',
      'catcheur-38', 'catcheur-03', 'catcheur-01', 'catcheur-24', 'catcheur-18',
      'wyatt-05', 'wyatt-06', 'wyatt-07', 'momentum-16', 'momentum-20', 'momentum-15',
      'momentum-08', 'objets-02', 'objets-03',
    ],
  },
  {
    id: 'main-event-legends',
    name: 'Légendes du Main Event',
    theme: 'All-Stars · Puissance et polyvalence',
    description: 'The Rock, Cody Rhodes et John Cena, soutenus par Triple H, Shawn Michaels, Rey Mysterio, AJ Styles, Finn Balor et des R solides.',
    // Rééquilibré le 21/10/2026 : 3 SSR au lieu de 7, plus de SR/R pour les sacrifices.
    cardIds: [
      'catcheur-02', 'catcheur-15', 'catcheur-34', 'catcheur-35',
      'catcheur-25', 'catcheur-31', 'catcheur-32', 'catcheur-14',
      'catcheur-11', 'catcheur-18', 'catcheur-27',
      'managers-03', 'managers-04', 'objets-05', 'objets-08',
      'momentum-29', 'momentum-03', 'momentum-08', 'momentum-05', 'momentum-20',
    ],
  },
  {
    id: 'nwo',
    name: 'New World Order',
    theme: 'Faction · Marque nWo et invocations en chaîne',
    description: 'Hall fait venir Nash, puis Hogan arrive gratuitement. Marquez les adversaires (Bischoff, Spray, Too Sweet) et faites-les payer.',
    cardIds: [
      'nwo-01', 'nwo-02', 'nwo-03', 'nwo-04', 'nwo-05', 'nwo-06', 'nwo-07', 'nwo-08', 'nwo-09',
      'catcheur-03', 'catcheur-13', 'catcheur-19', 'catcheur-38', 'catcheur-35',
      'momentum-05', 'momentum-08', 'momentum-15', 'momentum-20', 'momentum-29', 'objets-05',
    ],
  },
  {
    id: 'authority',
    name: 'The Authority',
    theme: 'Faction · Décrets et contrôle',
    description: 'Envoie les adversaires en zone passive, frappe-les là-bas avec Orton, et fais entrer Rollins grâce à J&J Security.',
    cardIds: [
      'auth-01', 'auth-02', 'auth-03', 'auth-04', 'auth-05', 'auth-06', 'auth-07', 'auth-08', 'auth-09',
      // Équilibré le 22/10/2026 (simulations de 1 500 parties) : John Cena remplace Bobby Lashley → 51 % de victoires.
      'catcheur-04', 'catcheur-19', 'catcheur-38', 'catcheur-35', 'catcheur-03',
      'momentum-05', 'momentum-08', 'momentum-15', 'momentum-20', 'objets-05', 'managers-03',
    ],
  },
  {
    id: 'evolution',
    name: 'Evolution',
    theme: 'Faction · Attaque en meute',
    description: 'Triple H mène la meute : deux membres frappent ensemble le même catcheur. Flair cherche la famille et fait entrer Triple H.',
    cardIds: [
      'evo-01', 'evo-02', 'evo-03', 'evo-04', 'evo-05', 'evo-06', 'evo-07', 'evo-08', 'evo-09',
      // Équilibré le 22/10/2026 (simulations de 1 400 parties, réponses comprises) : 50 à 54 % de victoires.
      // Pas de 2e manager (une seule place) ; The Champ et Retour inattendu remplacent Triple H (manager) et le Contre.
      'catcheur-04', 'catcheur-19', 'catcheur-38', 'catcheur-35', 'catcheur-03',
      'momentum-05', 'momentum-08', 'momentum-15', 'momentum-16', 'objets-05', 'momentum-29',
    ],
  },
];

export const SIGNATURE_DECKS = Object.freeze(recipes.map(recipe => Object.freeze({
  ...recipe,
  cards: Object.freeze(recipe.cardIds.flatMap(id => [id, id])),
})));
