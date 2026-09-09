# Avis Google sur le site

Les avis affichés dans la section « Avis clients » de la page d'accueil viennent
du fichier **`Homepage/reviews.json`**. Ce fichier est régénéré par le script
**`fetch-reviews.js`** à partir de l'API Google Places.

```
Google  ──►  fetch-reviews.js  ──►  Homepage/reviews.json  ──►  la page l'affiche
```

Tant que le script n'a jamais tourné, la page montre 3 avis d'exemple + la note
5,0 / 23 avis (valeurs figées dans `reviews.json`).

---

## 1. Configuration (une seule fois)

### a. Clé API Google

1. Console Google Cloud → un projet → **APIs & Services** → activer **« Places API (New) »**.
2. **Credentials** → créer une **clé API**.
3. Restreindre la clé : **API restrictions → Places API (New)** uniquement.
   (Pas besoin de restriction « referrer HTTP » : le script tourne côté serveur.)
4. Activer la **facturation** sur le projet (Google offre ~200 $/mois de crédit,
   très largement suffisant pour 1 appel par jour).

### b. Fichier `.env` à la racine

```
GOOGLE_PLACES_API_KEY=la_vraie_cle
GOOGLE_PLACE_QUERY=Dugos Photographe Marmande
GOOGLE_PLACE_ID=
```

Lancer une première fois :

```bash
npm run fetch-reviews
```

Le script affiche le **Place ID** à la fin. Copier cette valeur dans
`GOOGLE_PLACE_ID=` du `.env` : les appels suivants seront plus fiables et le lien
« Laisser un avis » sera exact.

> `.env` ne doit **jamais** être publié (déjà dans `.gitignore`).

---

## 2. Ce que fait le script

- Récupère la note globale, le nombre total d'avis, et les ~5 avis que l'API
  Google veut bien donner (limite de Google, pas contournable simplement).
- **Fusionne** avec les avis déjà dans `reviews.json` : au fil des jours, le
  fichier accumule bien plus que 5 avis (max 40, réglable : `KEEP_MAX`).
- Ne garde que les avis ≥ 4 étoiles et assez longs (`MIN_RATING`, `MIN_LENGTH`).
- Produit le lien direct « laisser un avis » :
  `https://search.google.com/local/writereview?placeid=<PLACE_ID>`

---

## 3. Rendre la mise à jour automatique

Il faut que `fetch-reviews.js` tourne tout seul (1×/jour suffit) **et** que le
site soit republié avec le nouveau `reviews.json`. Choisir **une** des méthodes
selon l'hébergeur du nouveau site.

### Option A — GitHub Actions (le site est/passe sur un dépôt Git)

Créer `.github/workflows/avis.yml` :

```yaml
name: Rafraîchir les avis Google
on:
  schedule:
    - cron: "17 6 * * *"   # tous les jours ~6h17 UTC
  workflow_dispatch:         # + bouton "lancer" manuel
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: |
          printf 'GOOGLE_PLACES_API_KEY=%s\nGOOGLE_PLACE_QUERY=%s\nGOOGLE_PLACE_ID=%s\n' \
            "${{ secrets.GOOGLE_PLACES_API_KEY }}" \
            "Dugos Photographe Marmande" \
            "${{ secrets.GOOGLE_PLACE_ID }}" > .env
          node fetch-reviews.js
      - run: |
          git config user.name "avis-bot"
          git config user.email "bot@dugos"
          git add Homepage/reviews.json
          git commit -m "MAJ avis Google" || echo "rien à committer"
          git push
```

Mettre la clé et le Place ID dans **Settings → Secrets and variables → Actions**.
Si l'hébergeur (Netlify, Vercel, Cloudflare Pages, GitHub Pages…) est branché sur
le dépôt, le `push` déclenche automatiquement une nouvelle mise en ligne.

### Option B — Netlify (déploiement Netlify, avec ou sans Git)

1. `npm i -D @netlify/functions` puis créer `netlify/functions/avis.mts` qui
   exécute la même logique que `fetch-reviews.js` et écrit le JSON, **ou** plus
   simple : garder `fetch-reviews.js` et utiliser un **Build Hook**.
2. Build Hook : Site settings → Build & deploy → **Build hooks** → créer une URL.
3. Planifier un appel quotidien de cette URL (Netlify Scheduled Functions, ou un
   cron gratuit type cron-job.org) — le build relance `npm run fetch-reviews`
   via la commande de build : `node fetch-reviews.js && <copie des fichiers>`.
4. Variables d'environnement (clé, Place ID) dans Site settings → Environment.

### Option C — Vercel

`vercel.json` :

```json
{ "crons": [{ "path": "/api/avis", "schedule": "17 6 * * *" }] }
```

Créer `api/avis.js` (fonction serverless) reprenant la logique de
`fetch-reviews.js`, qui écrit le résultat dans un **KV / Blob** Vercel, et faire
lire ce store par la page (petit `fetch` vers `/api/avis`). Clé dans les
Environment Variables du projet.

### Option D — Hébergement classique (OVH, o2switch, Hostinger… avec cron)

Si le nouveau site reste sur un hébergement mutualisé qui propose des **tâches
cron** et Node :

```
17 6 * * *  cd /home/xxx/www && /usr/bin/node fetch-reviews.js >> /home/xxx/avis.log 2>&1
```

Le `reviews.json` est réécrit sur place, rien d'autre à faire (site statique).
C'est l'équivalent le plus direct du comportement WordPress actuel.

---

## 4. Bouton « Laisser un avis »

Déjà en place dans la page (`.testimonial__cta`). Son lien devient le lien direct
Google (`writeReview?placeid=…`) dès que `reviews.json` contient un `writeUrl`
(donc après la 1re exécution du script avec le Place ID renseigné). En attendant,
il pointe vers la fiche Google de l'établissement.
