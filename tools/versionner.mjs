// Avant chaque publication : `node tools/versionner.mjs`.
// GitHub Pages laisse les navigateurs garder les fichiers 10 minutes : sans ça, un joueur peut voir
// l'ancienne version, voire un mélange d'anciens et de nouveaux fichiers. On ajoute à chaque fichier
// une empreinte de son contenu (?v=…) dans index.html, via une « import map » pour les modules.
// `--verifier` : ne change rien, échoue si index.html n'est pas à jour (utilisé par les tests).
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const hash = file => createHash('sha1').update(readFileSync(join(root, file))).digest('hex').slice(0, 10);
const walk = dir => readdirSync(join(root, dir)).flatMap(name => {
  const path = join(dir, name);
  return statSync(join(root, path)).isDirectory() ? walk(path) : [path.split(sep).join('/')];
});

export function versionBlock() {
  const modules = [...walk('src'), ...walk('data')].filter(f => f.endsWith('.js')).sort();
  const imports = Object.fromEntries(modules.map(f => [`./${f}`, `./${f}?v=${hash(f)}`]));
  const all = createHash('sha1').update(modules.map(f => imports[`./${f}`]).join() + hash('data/catalog.json') + hash('src/ui/styles.css')).digest('hex').slice(0, 6);
  return [
    '<!-- version:debut (fichier généré par tools/versionner.mjs, ne pas modifier à la main) -->',
    `  <meta name="rc-version" content="${all}">`,
    `  <meta name="rc-catalogue" content="${hash('data/catalog.json')}">`,
    `  <link rel="stylesheet" href="src/ui/styles.css?v=${hash('src/ui/styles.css')}">`,
    `  <script type="importmap">${JSON.stringify({ imports })}</script>`,
    `  <script type="module" src="src/ui/main.js?v=${hash('src/ui/main.js')}"></script>`,
    '  <!-- version:fin -->',
  ].join('\n');
}

const START = '<!-- version:debut', END = '<!-- version:fin -->';
export function indexWithVersion(html) {
  const a = html.indexOf(START), b = html.indexOf(END);
  if (a < 0 || b < 0) throw new Error('Repères « version:debut » / « version:fin » absents de index.html.');
  return html.slice(0, a) + versionBlock() + html.slice(b + END.length);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const file = join(root, 'index.html'), html = readFileSync(file, 'utf8'), next = indexWithVersion(html);
  if (process.argv.includes('--verifier')) {
    if (next !== html) { console.error('index.html n’est pas à jour : lance « node tools/versionner.mjs ».'); process.exit(1); }
    console.log('index.html est à jour.');
  } else {
    writeFileSync(file, next, 'utf8');
    console.log(`Version ${/rc-version" content="(\w+)/.exec(next)[1]} écrite dans index.html (${relative(root, file)}).`);
  }
}
