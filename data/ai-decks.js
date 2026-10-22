// Decks joués par l'IA : les decks signature, plus deux decks de faction pour varier les combos.
import { SIGNATURE_DECKS } from './signature-decks.js';

const extra = [
  {
    id: 'ai-shield',
    name: 'The Shield',
    cardIds: [
      'catcheur-05', 'catcheur-06', 'catcheur-08', 'catcheur-04', 'catcheur-03', 'catcheur-07', 'catcheur-09', 'catcheur-12',
      'momentum-24', 'momentum-22', 'momentum-21', 'momentum-23', 'momentum-15', 'momentum-08', 'momentum-20', 'momentum-09', 'momentum-07',
      'objets-07', 'managers-01', 'managers-02',
    ],
  },
  {
    id: 'ai-dx',
    name: 'D-Generation X',
    // Renforcé le 22/10/2026 (34 % → 53 % de victoires, simulations de 2 100 parties) : John Cena et The Champ
    // remplacent Braun Strowman et Saut de l'ange.
    cardIds: [
      'catcheur-31', 'catcheur-32', 'catcheur-33', 'catcheur-24', 'catcheur-13', 'catcheur-11', 'catcheur-17', 'catcheur-35',
      'managers-03', 'managers-04', 'momentum-30', 'momentum-15', 'momentum-05', 'momentum-20', 'momentum-16', 'momentum-11', 'momentum-29',
      'objets-06', 'objets-03', 'objets-04',
    ],
  },
];

export const AI_DECKS = Object.freeze([
  ...SIGNATURE_DECKS.map(d => ({ id: d.id, name: d.name, cards: d.cards })),
  ...extra.map(d => ({ id: d.id, name: d.name, cards: d.cardIds.flatMap(id => [id, id]) })),
]);
