DOSSIER DES PHOTOS DU SITE
==========================

WORKFLOW : déposez vos photos originales dans le dossier « Img » de chaque
galerie (ex. Categories/Mariages/Img), puis demandez à Claude de les importer.
Il les optimise pour le web (1600 px, JPEG 80 %) vers ce dossier assets/
et met à jour la galerie automatiquement. Les originaux ne sont pas modifiés.

Le site compte 2 catégories : Mariages et Portraits.

État actuel :
  [FAIT]    mariages/   96 photos importées depuis Categories/Mariages/Img
  [FAIT]    portraits/  49 photos importées depuis Categories/Portraits/Img
  [FAIT]    cat-mariages.jpg et cat-portraits.jpg (couvertures Catégories)
  [FAIT]    gallery-1..9.jpg (vitrine accueil — mix aléatoire mariages/portraits)


VIGNETTES DE GALERIE + srcset (perf — 2026-09-08, ajusté suite au flou)
---------------------------------------------------------------------
Les grilles Mariages / Portraits utilisent un srcset à 2 tailles : le
navigateur choisit selon la taille d'affichage réelle × densité d'écran.
  - petit  : assets/<cat>/thumb/<préfixe>-N.jpg  (largeur 800 px, JPEG 78)
             -> écrans 1x et mobile. ~150 Ko/img.
  - grand  : le fichier original assets/<cat>/<préfixe>-N.jpg (1600 px, JPEG 80)
             -> écrans Retina / larges. ~380 Ko/img.
Balise :  <img src=".../thumb/m-1.jpg"
               srcset=".../thumb/m-1.jpg 800w, .../mariages/m-1.jpg 1600w"
               sizes="(max-width: 768px) 50vw, 33vw"
               width="1000" height="1500" decoding="async"
               [fetchpriority="high" pour les 6 premières | loading="lazy" ensuite]>
La visionneuse (lightbox) recharge toujours l'original (chemin sans « /thumb/ »).

Régénérer les petites vignettes après un ajout/retrait de photos :
  for f in assets/mariages/*.jpg; do \
    sips --resampleWidth 800 -s format jpeg -s formatOptions 78 "$f" \
      --out "assets/mariages/thumb/$(basename "$f")"; done
(idem pour portraits/). Puis régénérer le bloc <div class="gallery__grid">
avec le srcset ci-dessus (script Python d'exemple : voir l'historique de session).

Poids : petites vignettes mariages 14,7 Mo / portraits 6,5 Mo (les originaux
1600 px restent tels quels et servent la haute densité + la lightbox).
Chargement initial d'une galerie : ~0,9 Mo (écran 1x) / ~2,2 Mo (Retina),
6 images, le reste en lazy pendant le scroll. Fini les images pleine taille
chargées en masse au démarrage.

Autres optimisations 2026-09-08 :
  - LOGO/LOGO.png réduit 1248 px -> 400 px (181 Ko -> 37 Ko). Source d'origine
    conservée : assets/_originals-bak/LOGO@1248.png
  - assets/preloader-1..4.jpg réduits -> 600 px (1,27 Mo -> 0,21 Mo au total ;
    ils s'affichent dans une vignette de ~108 px). Originaux : assets/_originals-bak/ (dossier non déployé)
  - Preloader Homepage masqué avant le rendu si déjà vu dans la session
    (plus aucun téléchargement des images de fond en navigation interne).
