# À compléter avant la mise en ligne — partie légale

Deux pages ont été créées : **`/mentions-legales/`** et **`/confidentialite/`**, liées
dans le pied de page de toutes les pages. Un bloc d'information RGPD a été ajouté
sous le formulaire de contact.

Il reste à **remplir les informations manquantes** (surlignées en jaune sur les
pages, texte `[À COMPLÉTER : …]`) puis à retirer ces surlignages.

---

## 1. Informations à renseigner (mentions légales + confidentialité)

Cherche chaque `[À COMPLÉTER]` dans `mentions-legales/index.html` et
`confidentialite/index.html` et remplace-le par la vraie valeur.

| Info | Où la trouver |
|---|---|
| **Adresse** : « 150 impasse du Plateau, 47430 Caumont-sur-Garonne » a été mise. ⚠️ Tu m'as donné le code postal 47430 sans la commune — **confirme que c'est bien Caumont-sur-Garonne** (le 47430 couvre aussi Le Mas-d'Agenais, Sénestis…), puis retire le surlignage. | avis de situation INSEE |
| **N° SIREN** (9 chiffres) et **SIRET** (14 chiffres) | avis de situation INSEE (sirene.fr) ou espace auto-entrepreneur |
| **Immatriculation** : « RCS Agen », « RM 47 » ou « Dispensé d'immatriculation » | selon ton statut — un photographe de mariage/portrait est en général au **RCS** (activité commerciale). En cas de doute : ton comptable ou l'URSSAF. |
| **TVA** : soit ton n° de TVA intracommunautaire, soit garder la phrase **« TVA non applicable, article 293 B du CGI »** si tu es en franchise en base | déclaration d'activité / comptable |
| **Assurance RC Pro** : assureur + n° de contrat | ton contrat d'assurance pro |
| **Téléphone** : vérifier que `06 40 38 85 31` est correct (repris de ta fiche Google) | — |
| **Date de « dernière mise à jour »** (les 2 pages) | la date du jour de mise en ligne |

> Si tu n'as pas d'assurance RC Pro : ce n'est pas obligatoire pour publier le
> site, mais **fortement recommandé** pour l'activité. Tu peux supprimer le bloc
> assurance en attendant.

## 2. Formspree (formulaire de contact) — sous-traitance → FAIT ✅

Le formulaire passe par **Formspree** (société américaine). Vérifié le 2026-09-09 :
sur l'**offre gratuite**, il n'existe **aucune page « GDPR » ni bouton pour signer
un DPA** (menu *Account* = Account / Team / Billing / Domains uniquement). Les
engagements de traitement des données de Formspree sont **inclus dans ses
conditions d'utilisation** (acceptées à l'inscription) et sa politique de
confidentialité.

`confidentialite/index.html` §4 a été mis à jour en conséquence : mention de
Formspree comme sous-traitant + liens vers ses conditions et sa politique de
confidentialité. Le transfert UE→USA est déjà encadré au §5 (clauses
contractuelles types / Data Privacy Framework). **Rien de plus à faire.**

> Alternative si tu veux un jour zéro transfert hors UE : passer à un service de
> formulaire européen (ex. **Formspark**, **Basin**, ou un envoi via une petite
> fonction serverless chez un hébergeur EU). Pas indispensable.

## 3. Polices d'écriture → FAIT ✅

Les polices (DM Serif Display + IBM Plex Sans) sont désormais **hébergées sur le
site** dans `assets/fonts/` (4 fichiers `.woff2` + `fonts.css`). Les 8 pages
chargent `assets/fonts/fonts.css` — **plus aucune requête vers Google**. La
politique de confidentialité (§10) a été mise à jour en conséquence.

Pour régénérer les polices un jour (nouvelle graisse, etc.) :
`node outils/telecharger-polices.mjs`.

> Reste, plus tard si tu veux le zéro-tiers absolu : GSAP est encore chargé depuis
> cdnjs sur la page d'accueil (risque très faible, c'est disclosé dans la politique).

## 4. Vérifications finales avant publication

- [ ] Plus aucun `[À COMPLÉTER]` ni surlignage jaune sur les mentions légales (le `[À FAIRE]` Formspree du §4 confidentialité est levé — cf. point 2).
- [ ] Les liens « Mentions légales » et « Confidentialité » du pied de page fonctionnent depuis chaque page.
- [ ] Le formulaire de contact affiche bien le bloc d'information RGPD au-dessus du bouton.
- [ ] Test d'envoi du formulaire → l'e-mail arrive bien.
- [x] Polices hébergées localement (point 3) — fait.
- [ ] Faire relire les 2 textes par un professionnel (comptable / juriste) si possible — ils sont conçus pour être conformes mais ta situation exacte (statut, TVA, RCS) prime.

## Ce qui n'est PAS nécessaire pour ce site

- **Pas de bannière cookies** : le site n'utilise aucun traceur de mesure d'audience ni publicitaire.
- **Pas de CGV** : il n'y a pas de vente ni de paiement en ligne (uniquement un formulaire de contact). À ajouter le jour où tu vendrais des prestations/produits directement sur le site.
- **Pas d'obligation RGAA** (accessibilité) : elle vise le secteur public et les grandes entreprises.
