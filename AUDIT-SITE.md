# Audit complet — site Dugos Photographie

État analysé : dépôt `clement-gosselin47/dugos-photo`, déployé sur
`https://clement-gosselin47.github.io/dugos-photo/` (branche `main`).
Date de l'audit : 2026-09-09.

Trois volets : **parcours utilisateur (UX)**, **technique (dév / perf / accessibilité)**,
**SEO**. Chaque point est noté `P0` (bloquant / à faire avant mise en ligne) →
`P3` (confort). Un plan d'action priorisé est en fin de document.

---

## ✅ Corrections déjà appliquées (2026-09-09, commits a1afa46 → 42d213f)

- **Arborescence aplatie** : accueil servi à la racine `/` ; `Homepage/` → racine,
  `Categories/` → `galeries/` (+ `galeries/mariages/`, `galeries/portraits/`) ;
  libellé menu « Catégories » → « Galeries » ; tous les chemins réécrits.
- **SEO technique** : `robots.txt` + `sitemap.xml` + `404.html` ; `<link canonical>`
  auto-référent + `theme-color` sur les 8 pages ; `<title>` réécrits (intention
  locale) ; `apple-touch-icon`.
- **Open Graph + Twitter Card** complets sur chaque page + `assets/og-cover.jpg`
  (1200×630).
- **JSON-LD** : `ProfessionalService` + adresse + geo + `areaServed` + `sameAs`
  + `AggregateRating` 5/24 + 2 avis sur l'accueil ; `BreadcrumbList` sur les
  galeries. (JSON validé ; `aggregateRating` **à valider** dans le Rich Results
  Test — Google peut être strict sur l'agrégation d'avis.)
- **Structure** : `<main>` ajouté partout ; footer « DUGOS » `<h2>` → `<p>` ;
  hiérarchie de titres h1 > h2 > h3 propre (h2 sur intro, « Bonjour… », galerie
  sr-only, « Avis clients »).
- **Contenu accueil** étoffé (services, villes couvertes, approche, liens
  galeries + devis) ; « 23 avis » → « 24 » ; faux témoignage remplacé par un vrai.
- **`alt`** contextuels sur ~150 photos de portfolio + homepage + vignettes catégorie.
- **GSAP auto-hébergé** (`assets/vendor/`) : plus aucune ressource tierce ;
  politique de confidentialité mise à jour.
- **Page À propos mobile réparée** (photos empilées, titre visible, filet de
  révélation JS).
- **Vignettes galerie allégées** (21 Mo → 10,6 Mo, 700 px / q72).
- **Contrastes** de texte remontés ; workflow avis bumpé (actions v5, Node 22).
- `serve.json` retiré ; `.claude/launch.json` → `npx serve -C`.

**⚠️ Reste à faire** — voir §4. En priorité : **partie légale à remplir + test
d'envoi du formulaire** ; **remplacer l'URL de base** `clement-gosselin47.github.io/dugos-photo`
partout (canonical, OG, sitemap, robots, JSON-LD, 404) quand `dugos.fr` sera
branché + ajouter un fichier `CNAME` ; **Google Search Console** + soumission du
sitemap ; **revendiquer la fiche Google Business**.

---

## 0. Synthèse

Le site est **propre, rapide à charger, cohérent visuellement** et l'essentiel
fonctionne (navigation, formulaire, avis Google automatisés, responsive globalement
bon). Il reste toutefois plusieurs points importants avant une mise en ligne
« sérieuse », surtout côté **SEO** (le site est aujourd'hui quasi invisible pour
Google) et sur **deux pages mobiles** (À propos, galeries lourdes).

Top priorités :

| # | Sujet | Volet | Prio |
|---|---|---|---|
| 1 | Homepage réellement servie à la racine `/` (aujourd'hui redirection vers `/Homepage/`) | SEO | **P0** |
| 2 | `sitemap.xml` + `robots.txt` absents | SEO | **P0** |
| 3 | Données structurées JSON-LD (LocalBusiness / Photographe) absentes | SEO | **P0** |
| 4 | Open Graph / Twitter Card absents (aucun aperçu au partage) | SEO | **P0** |
| 5 | Page **À propos** cassée sur mobile (photos qui débordent, titre coupé, grands vides) | UX | **P1** |
| 6 | Galeries : 96 vignettes ~157 Ko chargées d'un coup (~15 Mo) | Perf | **P1** |
| 7 | Contenu texte de la homepage très maigre (~60 mots indexables) | SEO | **P1** |
| 8 | `alt` vides sur ~200 photos de portfolio | SEO image + a11y | **P1** |
| 9 | Balise `<main>` absente sur 4 pages, hiérarchie de titres incohérente | a11y / SEO | **P2** |
| 10 | Pas de page 404 personnalisée | UX | **P2** |

---

## 1. Audit UX — parcours utilisateur

### 1.1 Page d'accueil
- **`P2` — « 23 avis Google » en dur dans le HTML** (`Homepage/index.html` ~ligne 112)
  alors que le vrai nombre est 24. Le JS corrige au chargement, mais l'état initial
  (et le rendu sans JS) affiche 23. → mettre `24` en dur, ou un texte neutre
  « Avis Google ».
- **`P2` — Témoignage d'exemple « Marie & Thomas » dans le HTML.** Remplacé par un
  vrai avis au chargement JS, mais le HTML source contient encore le faux. → semer
  le HTML avec un vrai avis (ex. Maurine Bardou) pour un rendu correct avant JS.
- **`P3` — Carrousel d'avis** : pas d'auto-défilement ni d'indicateur de position
  (« 1 / 5 »). Les flèches ‹ › sont peu visibles. Acceptable mais perfectible.
- **`P3` — Section « intro » / « featured »** sans titre visible : l'utilisateur
  n'a pas de repère de section (« Qui suis-je », « Le studio »…).

### 1.2 Page **À propos** — mobile cassé `P1`
Constaté sur iPhone (390 px) :
- Le titre **« À PROPOS » est à moitié coupé** en haut (animation d'apparition au
  scroll qui ne se déclenche pas au chargement → le titre reste à `opacity` faible).
- **Grand vide blanc** entre le titre et les photos.
- Les **deux portraits superposés débordent** : la photo de droite sort de l'écran
  (rognée par `overflow-x:hidden`, donc pas de scroll horizontal, mais visuellement
  tronquée), la petite photo chevauche par-dessus.
- La composition « photos décalées » est pensée pour le desktop et ne se réagence
  pas en mobile.
- **Cause du titre pâle** : `a-propos/script.js` met la classe `.reveal`
  (`opacity: 0`) sur les blocs puis les révèle via `IntersectionObserver`. Le
  titre en haut n'est pas « révélé » au chargement, et si l'observer/JS échoue,
  **tout le contenu `.reveal` reste invisible** (pas de progressive enhancement).
→ **Réécrire le bloc `@media (max-width:768px)` de `a-propos/style.css`** :
empiler les 2 photos verticalement (largeur 100 %, ratio conservé), enlever les
positionnements absolus/négatifs, `padding-top` suffisant sous la nav. **Et**
rendre `.reveal` visible par défaut (n'appliquer `opacity:0` que si une classe
`js` est posée sur `<html>` en tête de script).

### 1.3 Galeries Mariages / Portraits
- **`P1` — Poids** : 96 vignettes (`assets/mariages/thumb/`) à ~157 Ko de moyenne =
  **~15 Mo** rien qu'en vignettes sur la page Mariages (~6,5 Mo sur Portraits).
  Même en `loading="lazy"`, tout se charge en descendant. Sur 4G c'est très lourd.
  → vignettes cible ~40–60 Ko (redimension + qualité), idéalement en **WebP**.
  Optionnel : pagination / bouton « voir plus » au-delà de 24–30 photos.
- **`P2` — Mode « Flow »** (scroll horizontal) peu naturel au doigt sur mobile ;
  « Grid » par défaut est le bon choix, mais le bouton de bascule flotte au-dessus
  du contenu.
- **`P3`** — Lightbox : vérifier la fermeture au swipe / au tap hors image sur
  mobile, et le piège de focus (accessibilité clavier).

### 1.4 Page Contact
- **`P2` — Aucun repère « champ obligatoire »** (pas d'astérisque). Les 3 champs
  requis ne se signalent qu'au moment de l'erreur navigateur.
- **`P2` — Test réel à faire** : `contact/script.js` gère **bien** le succès
  (masque le formulaire, affiche `.form__success`, remonte en haut) **et** l'échec
  (bouton « Erreur — réessayer », réactivé). Reste à **envoyer un vrai message** et
  vérifier la réception de l'e-mail (+ accepter le DPA Formspree).
- **`P3` — Formspree** : pas de champ `_replyto` (répondre directement depuis
  l'e-mail reçu) ni `_subject` (sujet lisible de l'e-mail). À ajouter. Si le JS
  échoue, le POST natif renvoie sur la page Formspree générique (pas de page de
  remerciement hébergée) — acceptable.
- **`P3`** — En-tête transparent sur la photo : après scroll, le logo foncé peut
  chevaucher le label « MESSAGE ». Léger, l'en-tête s'escamote au scroll.

> Le `<select>` « Sujet » a bien une 1ʳᵉ option vide « Choisir une prestation »
> (`value=""`) — **OK**, rien à corriger de ce côté.

### 1.5 Navigation générale
- **`P2` — Pas de page 404 personnalisée** (`404.html`). GitHub Pages sert sa page
  générique. → créer `404.html` à la racine avec logo + lien accueil.
- **`P3` — En-tête « escamotable »** (se cache au scroll, revient à l'arrêt) : c'est
  un parti pris ; certains utilisateurs le trouvent déroutant. À garder mais en
  avoir conscience.
- **`P3`** — Le lien logo de la homepage pointe vers `index.html` (la homepage
  elle-même) : OK, mais pense à le faire pointer vers `/` une fois la racine réglée.

### 1.6 Cohérence
- **`P3`** — Sur la homepage la nav est un bandeau blanc dépoli ; sur Contact elle
  est transparente (choix volontaire, photo sombre). Cohérent une fois compris,
  mais c'est la seule page « à part ».

---

## 2. Audit technique (développeur)

### 2.1 Structure du projet
- **`P1` — Duplication massive de CSS/JS.** Le pied de page, la nav, la scrollbar
  custom, la lightbox, le view-toggle sont **recopiés dans chaque dossier**
  (`Homepage/`, `Categories/`, `Categories/Mariages/`, …). ~20 blocs `.footer`
  quasi identiques. Toute correction doit être répétée 6 fois (déjà vécu pendant
  la refonte mobile).
  → Factoriser : un `assets/base.css` (reset, nav, footer, scrollbar, variables)
  + un `assets/gallery.js` partagé. `assets/site-nav.css/js` a déjà commencé ce
  travail — l'étendre.
- **`P2` — CSS/JS non minifiés** (`Homepage/style.css` 18 Ko, `script.js` 16 Ko).
  GitHub Pages compresse en gzip/brotli donc l'impact réseau est limité, mais une
  passe de minification + regroupement réduirait le nombre de requêtes.
- **`P3` — `serve.json` (`cleanUrls:false`)** n'a d'effet qu'en local (`npx serve`) ;
  GitHub Pages l'ignore. À documenter ou retirer.
- **`P3` — `LOGO/Logo DUGOS.png` (1 Mo)** est déployé mais n'est référencé par
  aucune page (c'est la source du logo). → le sortir du dépôt (comme
  `_unused-source/`) ou au moins le compresser.
- **`P3` — `LOGO/.DS_Store` (6 Ko)** traîne dans le dossier ; `.gitignore` le couvre
  (`**/.DS_Store`) donc pas suivi, mais à supprimer du disque.

### 2.2 Performance / chargement
- **`P1` — Vignettes de galerie trop lourdes** (voir §1.3).
- **`P2` — GSAP chargé depuis `cdnjs.cloudflare.com`** (`Homepage/index.html`
  lignes 161–162). C'est un **tiers** (IP du visiteur transmise à Cloudflare,
  déjà disclosé dans la politique de confidentialité §10) + 2 requêtes + un point
  de défaillance externe. → **auto-héberger GSAP** dans `assets/` (fichiers
  `gsap.min.js` + `ScrollTrigger.min.js`, ~70 Ko) : zéro tiers, une seule origine.
- **`P2` — Multiples écouteurs `scroll` non coordonnés** par page (scrollbar custom,
  toggle `.scrolled`, header escamotable, smooth-scroll). 3 à 5 handlers qui
  tournent à chaque frame de scroll. Sur mobile la scrollbar custom est masquée
  mais son listener tourne quand même. → un seul handler `scroll` throttlé par
  `requestAnimationFrame`, ou retirer la scrollbar custom sur mobile côté JS
  (pas seulement en CSS).
- **`P2` — Polices** : `assets/fonts/fonts.css` charge 4 `.woff2` (DM Serif Display
  + IBM Plex Sans 300/400/500). Vérifier `font-display: swap` (évite le texte
  invisible au chargement) et ajouter `<link rel="preload" as="font" crossorigin>`
  pour la police du `<h1>`.
- **`P3` — Pas de `<link rel="preconnect">`** vers cdnjs (tant que GSAP est
  externe) ni de `preload` de l'image hero.
- **`P3` — `content-visibility:auto`** est bien utilisé sur les vignettes de galerie
  (bon point). L'`aspect-ratio` produit des tailles fractionnaires (165,5 px) qui
  laissaient une couture 1 px — corrigée en passant le fond des vignettes en
  `#f4f4f4`, mais la vraie correction serait des dimensions entières.
- **`P3` — Favicon `LOGO/favicon.png` = 52 Ko** (énorme pour un favicon). → générer
  un jeu propre : `favicon.ico` 32×32 (~2 Ko), `favicon-32.png`, `apple-touch-icon`
  180×180, `icon-192.png`, `icon-512.png`.

### 2.3 Accessibilité (a11y)
- **`P2` — Balise `<main>` absente** sur `Homepage`, `Categories/Mariages`,
  `Categories/Portraits`, `a-propos`. → envelopper le contenu principal dans
  `<main>` (repère pour lecteurs d'écran et pour Google).
- **`P2` — Hiérarchie de titres cassée sur la homepage** :
  `h1` (hero) → `h3` (nom de l'avis) → `h2` (« DUGOS » du footer). Il manque des
  `h2` pour les sections (À propos, Portfolio, Avis clients). Et « DUGOS » en `h2`
  dans le footer est un choix discutable (c'est un logotype, pas un titre de
  section).
  → « Avis clients » en `<h2>`, un `<h2>` sur la galerie (« Portfolio » / « Aperçu »),
  un `<h2>` sur la section « Bonjour, moi c'est Laurent », et `<p>`/`<div>` pour le
  « DUGOS » du footer.
- **`P2` — ~200 images de portfolio en `alt=""`** (Mariages 97/98, Portraits 50/51,
  Homepage 8/11). Pour un site de photographe c'est du contenu, pas de la
  décoration. → `alt` descriptif court : type de séance + lieu + ce qu'on voit
  (« Mariage à [lieu], sortie d'église », « Portrait studio, lumière rembrandt »…).
  Utile pour Google Images (vraie source de trafic pour un photographe) et pour
  l'accessibilité.
- **`P3` — Pas de lien d'évitement** (« Aller au contenu ») avant la nav.
- **`P3` — Focus clavier** : vérifier que tous les éléments interactifs (flèches
  du carrousel, toggle Flow/Grid, vignettes, lightbox) ont un `:focus-visible`
  bien contrasté et sont atteignables au `Tab`.
- **`P3` — Contraste** : le gris `#888` / `#999` utilisé pour `.testimonial__all`,
  `.footer__social-link`, les placeholders de formulaire est sous le ratio AA
  (4.5:1) sur fond blanc/clair. À vérifier et remonter à `#767676` minimum.
- **`P3` — `h1` visuellement caché** (`sr-only`) sur Catégories, galeries, Contact.
  Acceptable pour le SEO (le `h1` existe) mais un `h1` visible serait mieux.

### 2.4 Robustesse / JS
- **`P2` — Dépendance forte à GSAP** : si le CDN tombe, `Homepage/script.js`
  bascule sur un mode dégradé (bien vu, `hasGsap`) — mais l'animation d'apparition
  au scroll de **À propos** ne semble pas avoir de fallback (éléments qui restent
  à `opacity:0`, cf. §1.2). → garantir que **tout contenu est visible sans JS**
  (progressive enhancement) : les animations ne doivent que « révéler » un contenu
  déjà affiché par défaut.
- **`P3` — `console` propre** en production (aucun log parasite constaté — bon point).
- **`P3` — `fetch-reviews.js`** : robuste (gère 403, réseau, format ancien/nouveau).
  RAS. Warning CI « Node 20 déprécié » → bump `actions/checkout@v4` +
  `actions/setup-node` vers les versions récentes dans `.github/workflows/avis-google.yml`.
- **`P3` — Honeypot anti-spam** (`_gotcha`) présent sur le formulaire : bon point.

### 2.5 En-têtes HTTP (GitHub Pages)
- **`P3` — `cache-control: max-age=600`** sur tout (HTML, CSS, JS, images). Non
  configurable sur Pages. Conséquence : après un déploiement, il faut jusqu'à
  10 min (ou un vidage de cache) pour voir les changements. À connaître, et à
  garder en tête si on passe sur un vrai hébergeur (mettre un cache long +
  hash dans les noms de fichiers).
- **`P0/P1` (selon domaine)** — HSTS et HTTPS OK côté Pages. Quand `dugos.fr`
  sera branché : garder les enregistrements **MX** de la boîte mail intacts.

---

## 3. Audit SEO

> État actuel : le site est **techniquement présent** (HTTPS, `lang=fr`, titres et
> meta-descriptions corrects sur chaque page) mais **quasi inexploitable par
> Google** : pas de sitemap, pas de robots.txt, homepage non servie à la racine,
> aucune donnée structurée, contenu texte minimal, `alt` vides. Pour une activité
> **locale** (photographe à Marmande / Lot-et-Garonne), l'enjeu #1 est le
> **SEO local** (Google Business + NAP cohérent + LocalBusiness schema).

### 3.1 SEO technique — `P0`
- **Homepage à la racine.** Aujourd'hui `/` = page vide avec
  `<meta http-equiv="refresh"> → /Homepage/index.html`. Google indexe
  `/Homepage/index.html` comme URL réelle et voit `/` comme une redirection molle.
  → **Mettre le vrai contenu de la homepage dans `/index.html`** (racine), et
  supprimer le dossier `Homepage/` (ou le laisser en redirection 301 le temps de
  la transition). Idéalement, aplatir toute l'arborescence :
  `/`, `/mariages/`, `/portraits/`, `/a-propos/`, `/contact/`,
  `/mentions-legales/`, `/confidentialite/`.
- **`sitemap.xml`** absent (404 en ligne). → en créer un listant les 7 URLs
  publiques avec `<lastmod>`. Le régénérer si l'arborescence change.
- **`robots.txt`** absent (404). → minimal :
  ```
  User-agent: *
  Allow: /
  Sitemap: https://dugos.fr/sitemap.xml
  ```
  (remplacer par l'URL github.io tant que le domaine n'est pas branché).
- **`rel="canonical"`** absent sur toutes les pages. → ajouter une balise
  canonique auto-référente sur chaque page (évite le contenu dupliqué
  `/Homepage/` vs `/`, avec/sans `index.html`, avec/sans `/`).
- **Balise `<meta name="robots">`** uniquement sur les 2 pages légales
  (`index, follow` — c'est le défaut, donc redondant mais inoffensif). Cohérent
  de la retirer, ou de l'ajouter partout.

### 3.2 Données structurées (JSON-LD) — `P0`
Aucune. C'est le plus gros levier « rich results » + SEO local.
- **`LocalBusiness` / `Photographer`** sur la homepage (et idéalement sur toutes les
  pages via le footer) : nom, `image` (logo), `url`, `telephone`
  (`+33 6 40 38 85 31`), `address` (`PostalAddress` : 150 impasse du Plateau,
  47430 Caumont-sur-Garonne, FR), `geo`, `areaServed` (Marmande, Lot-et-Garonne,
  Sud-Ouest), `priceRange`, `sameAs` (Instagram ×2, Facebook, fiche Google Maps),
  `openingHours` si pertinent.
- **`AggregateRating`** : note 5,0 / 24 avis (les valeurs sont déjà dans
  `Homepage/reviews.json` — les injecter aussi en JSON-LD, en cohérence avec
  l'affichage, sinon Google peut sanctionner).
- **`Review`** : 2–3 avis réels en JSON-LD sur la homepage.
- **`BreadcrumbStructuredData`** sur les pages de galerie (Accueil › Catégories › Mariages).
- **`ImageObject`** / `contentUrl` sur les photos phares si on veut pousser Google Images.
- Valider ensuite avec `search.google.com/test/rich-results`.

### 3.3 Open Graph / réseaux sociaux — `P0`
Aucune balise `og:` ni `twitter:`. Quand quelqu'un partage un lien du site sur
Facebook, Instagram, WhatsApp, iMessage… **aucun aperçu** (pas d'image, titre brut).
→ Sur chaque page :
```html
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Dugos Photographie" />
<meta property="og:title" content="…" />
<meta property="og:description" content="…" />
<meta property="og:url" content="https://dugos.fr/…" />
<meta property="og:image" content="https://dugos.fr/assets/og-cover.jpg" /> (1200×630)
<meta property="og:locale" content="fr_FR" />
<meta name="twitter:card" content="summary_large_image" />
```
Prévoir 1 image de partage 1200×630 (une belle photo + le logo).

### 3.4 Contenu — `P1`
- **Homepage trop pauvre en texte indexable** (~60 mots utiles). Google a besoin de
  matière : ajouter (sans casser le design) 2–3 paragraphes réels autour de
  « photographe de **mariage** à **Marmande** et dans le **Lot-et-Garonne** »,
  « **séances portrait** (couple, famille, grossesse, EVJF…) », « **concerts** /
  photo de scène », zones couvertes (Marmande, Tonneins, Agen, Bordeaux, Sud-Ouest),
  déroulé d'une prestation, et un vrai **appel à l'action** (« Demander un devis »).
- **Titres `<title>`** : corrects mais optimisables pour l'intention de recherche —
  ex. homepage : `Photographe mariage & portrait à Marmande (47) — Dugos Photographie`.
  Mariages : `Photographe de mariage à Marmande et en Lot-et-Garonne — Dugos`.
- **`<h1>`** de la homepage : « Photographe Marmande à votre service » → bon mot-clé
  local, garder. Ajouter un `<h2>` par section.
- **Maillage interne** : la homepage ne lie pas explicitement vers *Mariages* et
  *Portraits* en tant que pages (seulement via « Catégories »). Ajouter des liens
  contextuels « Voir mes mariages » / « Voir mes portraits » dans le texte.
- **`alt` des images** (cf. §2.3) : levier direct pour Google Images.
- **Blog / actualités** (`P3`) : à terme, quelques articles (« Où se marier autour
  de Marmande », « Préparer sa séance portrait ») captent une longue traîne
  locale. Pas urgent.
- **Nom / cohérence NAP** : le site utilise « Dugos Photographie », la fiche Google
  « Dugos - Photographe », l'e-mail `laurent@dugos.fr`. Harmoniser **nom + adresse
  + téléphone** à l'identique partout (site, Google, réseaux, annuaires) — critère
  fort du SEO local.

### 3.5 SEO local — `P1`
- **Revendiquer la fiche Google Business** « Dugos - Photographe » (déjà 24 avis,
  5,0). Aujourd'hui non revendiquée (« Les avis ne sont pas vérifiés »). La
  revendiquer permet : d'y mettre l'URL du site, de répondre aux avis, d'ajouter
  photos/horaires/zone d'intervention, et **améliore le classement local**.
- **Page de contact** : afficher l'adresse (ou au moins la commune) + le téléphone
  en texte (pas seulement dans un formulaire) + une carte Google intégrée →
  signaux locaux.
- **Cohérence** avec les annuaires (Pages Jaunes, Mariages.net / Zankyou pour le
  mariage, etc.) : même NAP.

### 3.6 Indexation / suivi — `P2`
- Créer une propriété **Google Search Console** (et **Bing Webmaster**), y soumettre
  le sitemap, surveiller la couverture et les requêtes.
- Ajouter un outil de mesure d'audience **respectueux RGPD sans bandeau**
  (Plausible, Matomo sans cookies, ou Cloudflare Web Analytics) pour piloter — la
  politique de confidentialité actuelle affirme « aucune mesure d'audience », à
  mettre à jour si on en ajoute une.
- Générer et **passer un Lighthouse** (Performance / SEO / Accessibilité / Best
  Practices) sur chaque page une fois les correctifs faits ; viser 90+ partout.

### 3.7 Récapitulatif SEO — ce qui est déjà bon
- HTTPS + HSTS, `lang="fr"`, viewport mobile OK.
- `<title>` et `<meta name="description">` présents et pertinents sur les 7 pages.
- Un seul `<h1>` par page.
- URLs lisibles (même si en sous-dossiers).
- Polices auto-hébergées (pas de fuite Google Fonts).
- Pas de contenu dupliqué entre pages (chaque page a son sujet).
- Avis Google réels et à jour (automatisation en place).

---

## 4. Plan d'action priorisé

### P0 — avant la mise en ligne publique / le référencement
1. **Servir la homepage à la racine `/`** (déplacer `Homepage/*` → racine, ou
   aplatir toute l'arborescence en `/mariages/`, `/portraits/`, …). Adapter tous
   les chemins relatifs + `.github/workflows` (chemin de `reviews.json`).
2. **`robots.txt`** + **`sitemap.xml`** à la racine.
3. **`rel="canonical"`** auto-référent sur chaque page.
4. **JSON-LD `LocalBusiness`/`Photographer` + `AggregateRating` + `Review`** sur la
   homepage (repris du contenu de `reviews.json`).
5. **Open Graph + Twitter Card** sur chaque page + 1 image `og-cover` 1200×630.
6. **Partie légale** : remplir les `[À COMPLÉTER]` (SIREN/SIRET, immatriculation,
   TVA, assurance), dater les 2 pages, accepter le DPA Formspree (cf.
   `LEGAL-A-COMPLETER.md`). Tester un envoi réel du formulaire → réception mail.

### P1 — qualité / visibilité, juste après
7. **Réparer la page À propos sur mobile** (empilement des photos, titre, vides,
   fallback d'animation).
8. **Alléger les vignettes de galerie** (~40–60 Ko, WebP) ; envisager une
   pagination au-delà de ~30 photos.
9. **Étoffer le contenu texte de la homepage** (services, zones, CTA) + optimiser
   les `<title>`.
10. **`alt` descriptifs** sur les photos de portfolio (au moins Mariages / Portraits
    / homepage).
11. **Auto-héberger GSAP** (retirer le CDN cdnjs).
12. **Revendiquer la fiche Google Business** + y mettre l'URL du site.

### P2 — structure & accessibilité
13. **Factoriser** nav / footer / scrollbar / lightbox dans `assets/` (arrêter la
    duplication par dossier).
14. Ajouter **`<main>`** sur les 4 pages qui n'en ont pas ; corriger la **hiérarchie
    de titres** (h2 de sections, footer « DUGOS » en non-titre).
15. **Page `404.html`** personnalisée.
16. **Favicons propres** (`.ico`, `apple-touch-icon`, icônes 192/512) +
    `site.webmanifest` + `theme-color`.
17. **Google Search Console** + Bing + sitemap soumis + analytics RGPD.
18. Consolider les **écouteurs `scroll`** (un seul, rAF).
19. Corriger les **contrastes** de gris sous AA.

### P3 — confort / long terme
20. Minifier + regrouper CSS/JS ; hash de cache si passage sur vrai hébergeur.
21. Sortir `LOGO/Logo DUGOS.png` (1 Mo) du déploiement ; nettoyer `.DS_Store`.
22. Auto-défilement + indicateur sur le carrousel d'avis.
23. Lien d'évitement clavier ; audit focus complet.
24. Bump des actions GitHub (Node 20 → 24) dans le workflow avis.
25. Blog / longue traîne locale.
26. Ne committer `reviews.json` que si le contenu change (éviter le micro-commit
    quotidien d'horodatage).

---

## 5. Notes pour l'exécution

- Beaucoup de P0/P1 se font **en une passe** si on aplatit d'abord l'arborescence
  (point 1) : on en profite pour ajouter canonical + OG + JSON-LD + `<main>` dans
  chaque `<head>`/`<body>` au même moment.
- Prévoir un **`<head>` partagé** (via un petit include au build, ou au minimum un
  bloc copié-collé identique) pour ne pas re-diverger.
- Tester après chaque lot : `rich-results` (Google), `Lighthouse`, partage d'un
  lien sur WhatsApp (aperçu OG), et un `curl` du `sitemap.xml` / `robots.txt`.
