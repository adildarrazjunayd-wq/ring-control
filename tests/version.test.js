import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indexWithVersion } from '../tools/versionner.mjs';

// Sans empreintes à jour, les joueurs en ligne peuvent garder l'ancienne version du jeu pendant 10 minutes
// (ou un mélange d'anciens et de nouveaux fichiers). Correction : `node tools/versionner.mjs`.
test('index.html porte les empreintes à jour de tous les fichiers du jeu', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(html, indexWithVersion(html), 'Lance « node tools/versionner.mjs » avant de publier.');
  assert.match(html, /<script type="importmap">/);
});
