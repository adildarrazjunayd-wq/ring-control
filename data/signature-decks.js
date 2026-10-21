const recipes = [
  {
    id: 'bloodline',
    name: 'The Bloodline',
    theme: 'Faction · Contrôle et pression',
    description: 'Roman, les Usos, Solo et Sami soutenus par les cartes de la Bloodline.',
    cardIds: [
      'catcheur-01', 'catcheur-20', 'catcheur-21', 'catcheur-22', 'catcheur-23', 'catcheur-02',
      'wyatt-08', 'wyatt-09', 'wyatt-10', 'wyatt-11',
      'managers-01', 'wyatt-12', 'wyatt-13', 'momentum-01', 'momentum-13',
      'momentum-05', 'momentum-15', 'momentum-20', 'objets-05', 'objets-08',
    ],
  },
  {
    id: 'wyatt-family',
    name: 'Wyatt Family',
    theme: 'Faction · Résilience et retour',
    description: 'Bray Wyatt, Strowman, Rowan et Harper avec leurs Momenta et objets de soutien.',
    cardIds: [
      'wyatt-01', 'wyatt-02', 'wyatt-03', 'wyatt-04', 'catcheur-39', 'catcheur-19',
      'catcheur-38', 'catcheur-03', 'catcheur-01', 'catcheur-24', 'catcheur-18',
      'wyatt-05', 'wyatt-06', 'wyatt-07', 'momentum-16', 'momentum-20', 'momentum-15',
      'momentum-18', 'objets-02', 'objets-03',
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
];

export const SIGNATURE_DECKS = Object.freeze(recipes.map(recipe => Object.freeze({
  ...recipe,
  cards: Object.freeze(recipe.cardIds.flatMap(id => [id, id])),
})));
