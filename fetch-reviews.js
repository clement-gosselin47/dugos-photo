#!/usr/bin/env node
/**
 * Met à jour reviews.json avec les vrais avis Google (Places API v1).
 *
 *   node fetch-reviews.js
 *
 * Prérequis : fichier .env à la racine avec au minimum GOOGLE_PLACES_API_KEY
 * (clé restreinte à « Places API (New) » dans Google Cloud Console).
 *
 * L'API Google ne renvoie qu'environ 5 avis par appel. Ce script FUSIONNE les
 * nouveaux avis avec ceux déjà enregistrés dans reviews.json : au fil des
 * exécutions (idéalement une fois par jour via l'hébergeur — voir AVIS-GOOGLE.md)
 * le fichier accumule bien plus que 5 avis.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ---- Réglages ----
const KEEP_MAX   = 40;  // nombre d'avis conservés au total dans reviews.json
const MIN_RATING = 4;   // on n'affiche pas les avis en dessous de 4 étoiles
const MIN_LENGTH = 20;  // ni les avis trop courts / vides

// ---- Chargement du .env (sans dépendance externe) ----
// En local : lire .env s'il existe. En CI (GitHub Actions) : les variables
// arrivent déjà via l'environnement, .env est absent — ce n'est pas une erreur.
// Les variables déjà définies dans l'environnement ne sont PAS écrasées.
try {
  const env = readFileSync(resolve(__dir, '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key]) continue; // l'environnement a la priorité
    process.env[key] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
} catch {
  /* pas de .env : on compte sur les variables d'environnement */
}

const API_KEY  = process.env.GOOGLE_PLACES_API_KEY;
const QUERY    = process.env.GOOGLE_PLACE_QUERY || 'Dugos Photographe Marmande';
const PLACE_ID = process.env.GOOGLE_PLACE_ID || ''; // optionnel : évite la recherche texte
const OUT      = resolve(__dir, 'reviews.json');

if (!API_KEY || API_KEY === 'your_google_api_key_here') {
  console.error('Erreur : GOOGLE_PLACES_API_KEY absent (ni dans .env, ni dans l\'environnement).');
  process.exit(1);
}

const FIELDS = 'id,rating,userRatingCount,googleMapsUri,reviews';

async function getPlace() {
  // Si on connaît déjà le Place ID → appel direct (plus fiable, moins cher)
  if (PLACE_ID) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=fr`, {
      headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': FIELDS },
    });
    const data = await res.json();
    if (!res.ok) { console.error('Erreur API Google :', JSON.stringify(data, null, 2)); process.exit(1); }
    return data;
  }
  // Sinon : recherche texte
  // includePureServiceAreaBusinesses : indispensable ici, Dugos - Photographe
  // est un établissement sans adresse physique (photographe qui se déplace),
  // exclu par défaut des résultats de l'API.
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELDS.split(',').map(f => `places.${f}`).join(','),
    },
    body: JSON.stringify({
      textQuery: QUERY,
      maxResultCount: 1,
      languageCode: 'fr',
      includePureServiceAreaBusinesses: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) { console.error('Erreur API Google :', JSON.stringify(data, null, 2)); process.exit(1); }
  const place = data.places?.[0];
  if (!place) { console.error('Lieu introuvable pour la requête :', QUERY); process.exit(1); }
  return place;
}

// Clé de dédoublonnage d'un avis
const keyOf = r => `${(r.author || '').toLowerCase()}::${(r.text || '').slice(0, 80).toLowerCase()}`;

function loadExistingItems() {
  try {
    const cur = JSON.parse(readFileSync(OUT, 'utf8'));
    if (Array.isArray(cur)) {
      // Ancien format : simple tableau {name,text}
      return cur.map(r => ({
        author: r.name || r.author || 'Client',
        text: String(r.text || '').replace(/^["“« ]+|["”» ]+$/g, '').trim(),
        rating: 5,
        when: '',
        publishTime: '',
        photo: '',
      }));
    }
    return Array.isArray(cur.items) ? cur.items : [];
  } catch {
    return [];
  }
}

(async function main() {
  const place = await getPlace();
  const placeId = place.id || PLACE_ID;

  const fresh = (place.reviews || [])
    .map(r => ({
      // "Prénom Nom (pseudo123)" → "Prénom Nom"
      author: (r.authorAttribution?.displayName || 'Client').replace(/\s*\([^)]*\)\s*$/, '').trim(),
      photo: r.authorAttribution?.photoUri || '',
      rating: r.rating || 5,
      text: (r.originalText?.text || r.text?.text || '').replace(/\s+/g, ' ').trim(),
      when: r.relativePublishTimeDescription || '',
      publishTime: r.publishTime || '',
    }))
    .filter(r => r.text.length >= MIN_LENGTH && r.rating >= MIN_RATING);

  const existing = loadExistingItems();
  const seen = new Set(existing.map(keyOf));
  const merged = [...fresh.filter(r => !seen.has(keyOf(r))), ...existing]
    .filter(r => (r.rating ?? 5) >= MIN_RATING && (r.text || '').length >= MIN_LENGTH)
    .sort((a, b) => new Date(b.publishTime || 0) - new Date(a.publishTime || 0))
    .slice(0, KEEP_MAX);

  if (!merged.length) {
    console.warn('Aucun avis exploitable, le fichier existant est conservé.');
    process.exit(0);
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    rating: place.rating ?? null,
    count: place.userRatingCount ?? null,
    placeId: placeId || null,
    url: place.googleMapsUri || (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null),
    writeUrl: placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : null,
    items: merged,
  };

  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`✓ ${merged.length} avis dans reviews.json  (note ${payload.rating} · ${payload.count} avis Google)`);
  if (placeId) console.log(`  Place ID : ${placeId}`);
  console.log(`  Lien « laisser un avis » : ${payload.writeUrl || '(placeId manquant)'}`);
})().catch(err => {
  console.error('Erreur réseau :', err.message);
  process.exit(1);
});
