# Politique de Sécurité — Dugos Photographie

## Signalement d'une vulnérabilité

Si vous découvrez une faille de sécurité sur ce site, merci de la signaler
directement par email à **laurent@dugos.fr** plutôt que de la divulguer publiquement.

Nous nous engageons à traiter tout signalement sous **72 heures**.

## Gestion des secrets

- Aucune clé API, mot de passe ou token ne doit apparaître dans le code source
- Les clés sont stockées dans `.env` (jamais commité, voir `.gitignore`)
- Les avis Google sont pré-chargés via `fetch-reviews.js` (script local) → `reviews.json`

## Mise à jour des dépendances

Les dépendances CDN (GSAP, Google Fonts) doivent être vérifiées lors de chaque
mise à jour majeure du site.

## Accès aux services tiers

| Service | Usage | Accès |
|---|---|---|
| Google Cloud Console | Places API | Compte Google propriétaire — MFA obligatoire |
| Formspree | Formulaire de contact | Compte Formspree — MFA obligatoire |
| Hébergeur | Déploiement | Accès restreint au propriétaire |
