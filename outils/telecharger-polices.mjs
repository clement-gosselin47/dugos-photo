#!/usr/bin/env node
/**
 * Télécharge les polices du site (DM Serif Display + IBM Plex Sans) depuis
 * Google Fonts et les enregistre EN LOCAL dans assets/fonts/, avec un
 * assets/fonts/fonts.css prêt à l'emploi.
 *
 * Pourquoi : charger les polices depuis fonts.googleapis.com transmet l'adresse
 * IP de chaque visiteur à Google sans consentement — non conforme au RGPD
 * (mises en demeure CNIL). En hébergeant les polices sur le site, plus aucune
 * requête vers Google.
 *
 * Usage :
 *   node outils/telecharger-polices.mjs
 *
 * Ensuite, dans les 6 pages + les 2 pages légales, remplacer les 3 lignes
 *   <link rel="preconnect" href="https://fonts.googleapis.com" />
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 *   <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" />
 * par une seule (adapter ../ selon la profondeur de la page) :
 *   <link rel="stylesheet" href="../assets/fonts/fonts.css" />
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'assets', 'fonts');
mkdirSync(outDir, { recursive: true });

// Un navigateur récent => Google renvoie du woff2
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=IBM+Plex+Sans:wght@300;400;500&display=swap';

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const css = await (await fetch(CSS_URL, { headers: { 'User-Agent': UA } })).text();

// Découpe en blocs @font-face
const blocks = css.match(/@font-face\s*{[^}]*}/g) || [];
if (!blocks.length) {
  console.error('Aucune @font-face reçue — Google a peut-être changé de format. CSS reçu :\n', css.slice(0, 400));
  process.exit(1);
}

let localCss = `/* Polices hébergées localement — généré par outils/telecharger-polices.mjs\n   Ne pas charger fonts.googleapis.com (RGPD). */\n\n`;
let n = 0;

for (const block of blocks) {
  const family = (block.match(/font-family:\s*['"]([^'"]+)['"]/) || [])[1];
  const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
  const style  = (block.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
  const unicode = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
  const url = (block.match(/url\((https:\/\/[^)]+\.woff2)\)/) || [])[1];
  if (!family || !url) continue;

  // On ne garde que le sous-ensemble latin (le 1er bloc de chaque famille/graisse
  // chez Google est "latin" ; on prend tout ce qui contient U+0000-00FF).
  const isLatin = !unicode || /U\+0000-00FF|U\+0-FF/i.test(unicode);
  if (!isLatin) continue;

  const fname = `${slug(family)}-${weight}${style === 'italic' ? '-italic' : ''}.woff2`;
  const buf = Buffer.from(await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer());
  writeFileSync(resolve(outDir, fname), buf);
  n++;

  localCss +=
`@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url('./${fname}') format('woff2');${unicode ? `\n  unicode-range: ${unicode.trim()};` : ''}
}

`;
  console.log(`✓ ${fname}  (${(buf.length / 1024).toFixed(0)} Ko)`);
}

writeFileSync(resolve(outDir, 'fonts.css'), localCss, 'utf8');
console.log(`\n${n} fichier(s) woff2 + assets/fonts/fonts.css écrits.`);
console.log('Étape suivante : remplacer les <link> Google Fonts par <link rel="stylesheet" href=".../assets/fonts/fonts.css"> dans les 8 pages.');
