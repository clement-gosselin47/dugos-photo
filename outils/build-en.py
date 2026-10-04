#!/usr/bin/env python3
"""
Génère la version anglaise du site (dossier en/) à partir des pages françaises.

    python3 outils/build-en.py

Ce que fait le script :
  1. PATCH FR   : ajoute aux pages françaises les balises hreflang et le
                  sélecteur de langue FR / EN dans le header (idempotent).
  2. GÉNÉRATION : pour chaque page, copie la version française, applique les
                  traductions ci-dessous, réécrit les liens (pages -> pages
                  anglaises, ressources -> mêmes fichiers partagés) et écrit
                  en/<page>/index.html.
  3. SITEMAP    : régénère sitemap.xml avec les alternates hreflang.

Si un texte français change, mettre à jour le dictionnaire correspondant puis
relancer : le script s'arrête avec une erreur si une phrase à traduire n'est
plus trouvée dans la page (aucune traduction oubliée en silence).
Le CSS et les scripts sont partagés entre FR et EN (la langue est lue dans
<html lang="…">).
"""
import os
import posixpath
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://clement-gosselin47.github.io/dugos-photo/'

# page française -> page anglaise (chemins relatifs à la racine du site)
PAGES = {
    'index.html': 'en/index.html',
    'a-propos/index.html': 'en/about/index.html',
    'contact/index.html': 'en/contact/index.html',
    'galeries/index.html': 'en/galleries/index.html',
    'galeries/mariages/index.html': 'en/galleries/weddings/index.html',
    'galeries/portraits/index.html': 'en/galleries/portraits/index.html',
    'mentions-legales/index.html': 'en/legal-notice/index.html',
    'confidentialite/index.html': 'en/privacy/index.html',
}


def page_url(path):
    """URL absolue d'une page (sans index.html)."""
    return BASE + path[:-len('index.html')]


def rel(from_file, to_file):
    """Chemin relatif de from_file (fichier) vers to_file."""
    return posixpath.relpath(to_file, posixpath.dirname(from_file) or '.')


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    full = os.path.join(ROOT, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(s)


# --------------------------------------------------------------------------
# 1. PATCH FR : hreflang + sélecteur de langue
# --------------------------------------------------------------------------
HREFLANG_RE = re.compile(r'[ \t]*<!--hreflang-->.*?<!--/hreflang-->\n', re.S)
LANG_RE = re.compile(r'[ \t]*<!--lang-->.*?<!--/lang-->\n', re.S)


def hreflang_block(fr, en):
    return (
        '  <!--hreflang-->\n'
        f'  <link rel="alternate" hreflang="fr" href="{page_url(fr)}" />\n'
        f'  <link rel="alternate" hreflang="en" href="{page_url(en)}" />\n'
        f'  <link rel="alternate" hreflang="x-default" href="{page_url(fr)}" />\n'
        '  <!--/hreflang-->\n'
    )


def lang_switcher(current, here, fr, en):
    """<li> du sélecteur ; `here` = fichier qui le contient."""
    def item(code, label, aria, target):
        if code == current:
            return (f'<span class="nav__lang-link" lang="{code}" aria-current="true" '
                    f'aria-label="{aria}">{label}</span>')
        return (f'<a class="nav__lang-link" href="{rel(here, target)}" lang="{code}" '
                f'hreflang="{code}" aria-label="{aria}">{label}</a>')
    return (
        '      <!--lang-->\n'
        '      <li class="nav__lang">'
        + item('fr', 'FR', 'Français', fr)
        + '<span class="nav__lang-sep" aria-hidden="true">/</span>'
        + item('en', 'EN', 'English', en)
        + '</li>\n'
        '      <!--/lang-->\n'
    )


def patch_fr(fr, en):
    s = read(fr)
    s = HREFLANG_RE.sub('', s)
    s = re.sub(r'(<link rel="canonical"[^>]*/>\n)', lambda m: m.group(1) + hreflang_block(fr, en), s, count=1)
    s = LANG_RE.sub('', s)
    i = s.index('class="nav__links"')
    j = s.index('</ul>', i)
    line_start = s.rindex('\n', 0, j) + 1
    s = s[:line_start] + lang_switcher('fr', fr, fr, en) + s[line_start:]
    write(fr, s)


# --------------------------------------------------------------------------
# 2. TRADUCTIONS
#    (français, anglais) ; les espaces/retours à la ligne du français sont
#    comparés de façon souple. required=False -> peut être absent d'une page.
# --------------------------------------------------------------------------
COMMON = [
    ('>Accueil<', '>Home<'),
    ('>Galeries<', '>Galleries<'),
    ('>À propos<', '>About<'),
    ('>Mentions légales<', '>Legal notice<'),
    ('>Confidentialité<', '>Privacy<'),
    ('>Instagram Mariages<', '>Instagram Weddings<'),
    ('>Facebook Mariages<', '>Facebook Weddings<'),
    ('Design &amp; développement &mdash; Clément Gosselin',
     'Design &amp; development &mdash; Clément Gosselin'),
]

INDEX = [
    ('Photographe mariage &amp; portrait à Marmande (47) – Dugos Photographie',
     'Wedding &amp; Portrait Photographer in Marmande (47) – Dugos Photographie'),
    ('Dugos Photographie – Laurent, photographe professionnel à Marmande (47, Lot-et-Garonne). Mariages et portraits dans tout le Sud-Ouest.',
     'Dugos Photographie – Laurent, professional photographer in Marmande (47, Lot-et-Garonne). Weddings and portraits across south-west France.'),
    ('"alternateName": "Dugos - Photographe"', '"alternateName": "Dugos - Photographer"'),
    ('Laurent Gosselin, photographe professionnel à Marmande (Lot-et-Garonne). Mariages, portraits et concerts dans tout le Sud-Ouest.',
     'Laurent Gosselin, professional photographer in Marmande (Lot-et-Garonne). Weddings, portraits and concerts across south-west France.'),
    ('"knowsAbout": ["Photographie de mariage", "Séance portrait", "Photographie de concert"]',
     '"knowsAbout": ["Wedding photography", "Portrait sessions", "Concert photography"]'),
    ('Photographe Marmande<br/>à votre service.', 'Marmande photographer,<br/>at your service.'),
    ('alt="Portrait noir et blanc, Dugos Photographie"', 'alt="Black-and-white portrait, Dugos Photographie"'),
    ('alt="Laurent Gosselin, autoportrait, Dugos Photographie"', 'alt="Laurent Gosselin, self-portrait, Dugos Photographie"'),
    ('<h2 class="intro__title">Photographe à Marmande</h2>', '<h2 class="intro__title">Photographer in Marmande</h2>'),
    ("""Photographe professionnel installé à
      Caumont-sur-Garonne, aux portes de Marmande (Lot-et-Garonne). J'accompagne les couples
      le jour de leur <strong>mariage</strong>, je réalise vos <strong>séances portrait</strong>
      et je shoote aussi les <strong>concerts</strong>.
      J'interviens sur le département du Lot-et-Garonne et dans le Sud Gironde.""",
     """Professional photographer based in
      Caumont-sur-Garonne, on the doorstep of Marmande (Lot-et-Garonne). I photograph couples
      on their <strong>wedding</strong> day, run <strong>portrait sessions</strong>
      and also shoot <strong>concerts</strong>.
      I work throughout the Lot-et-Garonne département and in the southern Gironde."""),
    ("Bonjour, moi c'est Laurent</h2>", "Hello, I'm Laurent</h2>"),
    ("Professionnel passionné par l'art de capturer les moments les plus précieux de votre vie.",
     "A passionate professional dedicated to capturing the most precious moments of your life."),
    ('Capter l\'instant présent, naturellement,<br />dans votre environnement.',
     'Capturing the present moment, naturally,<br />in your own surroundings.'),
    ('Aperçu du portfolio — mariages et portraits', 'Portfolio preview — weddings and portraits'),
    ('Voir toutes les galeries<span', 'View all galleries<span'),
    ('>Avis clients<', '>Client reviews<'),
    ('aria-label="Avis précédent"', 'aria-label="Previous review"'),
    ('aria-label="Avis suivant"', 'aria-label="Next review"'),
    ('<span class="testimonial__score">5,0</span>', '<span class="testimonial__score">5.0</span>'),
    ('25 avis&nbsp;Google</a>', '25 Google reviews</a>'),
    ('<p class="testimonial__text">', '<p class="testimonial__text" lang="fr">'),
    ('<p class="testimonial__when" hidden></p>',
     '<p class="testimonial__when" hidden></p>\n      <p class="testimonial__note">Reviews are shown in their original language (French).</p>'),
    ('Laisser un avis sur Google', 'Leave a review on Google'),
]
INDEX_RE = [
    (r'alt="Photographie Dugos — mariage et portrait dans le Sud-Ouest \((\d+)\)"',
     r'alt="Dugos Photographie — wedding and portrait photography in Lot-et-Garonne (\1)"'),
    (r'alt="Photographie Dugos — mariage dans le Sud-Ouest"',
     r'alt="Dugos Photographie — wedding photography in Lot-et-Garonne"'),
]

ABOUT = [
    ('Laurent Gosselin, photographe en Lot-et-Garonne – Dugos Photographie',
     'Laurent Gosselin, photographer in Lot-et-Garonne – Dugos Photographie'),
    ('Laurent Gosselin, photographe professionnel en Lot-et-Garonne. Mariages, portraits et concerts : parcours, approche et façon de travailler.',
     'Laurent Gosselin, professional photographer in Lot-et-Garonne. Weddings, portraits and concerts: his background, his approach and how he works.'),
    ("« L'expression<br />d'un visage, l'émotion<br />d'un instant. »",
     "“The expression<br />of a face,<br />the emotion<br />of a moment.”"),
    ('alt="Mariée, Dugos Photographie"', 'alt="Bride, Dugos Photographie"'),
    ('alt="Portrait, Dugos Photographie"', 'alt="Portrait, Dugos Photographie"'),
    ('alt="Laurent Gosselin, photographe Dugos Photographie"', 'alt="Laurent Gosselin, photographer at Dugos Photographie"'),
    ("Bonjour, moi c'est Laurent.", "Hello, I'm Laurent."),
    ("Tout a commencé avec un reflex numérique et la découverte du mode manuel : la possibilité de maîtriser entièrement l'image. Autodidacte, je pratique la photographie professionnellement depuis 2021, principalement autour des mariages, des portraits et des concerts.",
     "It all began with a digital SLR and the discovery of manual mode: the chance to take complete control of the image. Self-taught, I have been working as a professional photographer since 2021, mainly in weddings, portraits and concerts."),
    ("Basé à Caumont-sur-Garonne, au cœur du Lot-et-Garonne, j'interviens dans tout le département et le Sud-Gironde.",
     "Based in Caumont-sur-Garonne, in the heart of Lot-et-Garonne, I work throughout the département and in the southern Gironde."),
    ("«&nbsp;Osez franchir le cap d'un passage devant mon objectif. Mais attention, vous pourriez y prendre goût&nbsp;!&nbsp;»",
     "“Dare to step in front of my lens. But be warned: you might get a taste for it!”"),
    ("En dehors de l'objectif.", "Beyond the lens."),
    ("La musique, d'abord : guitariste et chanteur pendant vingt ans dans différents groupes rock.",
     "Music first: I was a guitarist and singer in various rock bands for twenty years."),
    ("Aujourd'hui de l'autre côté de la scène, appareil photo en main.",
     "Today I'm on the other side of the stage, camera in hand."),
    ("Accrédité photo au festival Garorock, où je vis les concerts au plus près des artistes.",
     "Accredited photographer at the Garorock festival, where I experience concerts right alongside the artists."),
    ("Un style en trois mots : spontané, naturel, créatif.",
     "A style in three words: spontaneous, natural, creative."),
    ("Une conviction : plus l'atmosphère est détendue, meilleures sont les photos.",
     "One conviction: the more relaxed the atmosphere, the better the photos."),
    ('alt="Concert, Laurent Gosselin photographe"', 'alt="Concert, photographed by Laurent Gosselin"'),
    ('alt="Mariage pris sur le vif, Dugos Photographie"', 'alt="Candid wedding moment, Dugos Photographie"'),
    ('Ce en quoi je crois.', 'What I believe in.'),
    ('>Authenticité<', '>Authenticity<'),
    ("Pas de mise en scène forcée : c'est l'expression du sujet et l'émotion qui s'en dégage qui guident mon regard.",
     "No forced staging: it is the subject's expression and the emotion that comes through that guide my eye."),
    ('>Empathie<', '>Empathy<'),
    ("Au-delà de la technique, l'écoute et la relation. Se sentir à l'aise devant l'objectif, ça change tout.",
     "Beyond technique, listening and connection. Feeling at ease in front of the lens changes everything."),
    ('>Fierté<', '>Pride<'),
    ("Mon objectif : que chacun soit fier de l'image qu'il renvoie.",
     "My goal: for everyone to be proud of the image they project."),
    ('Comment ça se passe&nbsp;?', 'How does it work?'),
    ('>On échange.<', '>We talk.<'),
    ("Avant toute séance, on prend le temps de discuter des attentes de chacun et de faire connaissance.",
     "Before any session, we take the time to discuss everyone's expectations and get to know each other."),
    ("On se met à l'aise.", "We get comfortable."),
    ("Pas de poses rigides : on crée une ambiance, une relation. Plus l'atmosphère est détendue, meilleures sont les photos.",
     "No stiff poses: we create an atmosphere, a rapport. The more relaxed the mood, the better the photos."),
    ('>On immortalise.<', '>We capture it.<'),
    ("Des images spontanées, naturelles et créatives. Des photos dont vous serez fiers.",
     "Spontaneous, natural, creative images. Photos you will be proud of."),
    ('Vous avez un projet&nbsp;?', 'Have a project in mind?'),
    ('Parlons-en.', "Let's talk."),
    ('<span>Prendre contact</span>', '<span>Get in touch</span>'),
]

CONTACT = [
    ('Contact – Dugos Photographie, photographe à Marmande', 'Contact – Dugos Photographie, photographer in Marmande'),
    ('Contactez Dugos Photographie à Marmande pour votre mariage, séance portrait ou tout autre projet photo.',
     'Get in touch with Dugos Photographie in Marmande about your wedding, portrait session or any other photography project.'),
    ('Contacter Dugos Photographie, photographe à Marmande', 'Contact Dugos Photographie, photographer in Marmande'),
    ('alt="Mariée et demoiselles d\'honneur, Dugos Photographie"', 'alt="Bride and bridesmaids, Dugos Photographie"'),
    ('for="name">Nom</label>', 'for="name">Name</label>'),
    ('placeholder="Votre nom"', 'placeholder="Your name"'),
    ('placeholder="votre@email.fr"', 'placeholder="you@email.com"'),
    ('for="subject">Sujet</label>', 'for="subject">Subject</label>'),
    ('<option value="">Choisir une prestation</option>', '<option value="">Choose a service</option>'),
    ('<option value="Mariage">Mariage</option>', '<option value="Mariage">Wedding</option>'),
    ('<option value="Autre">Autre</option>', '<option value="Autre">Other</option>'),
    ('placeholder="Parlez-moi de votre projet…"', 'placeholder="Tell me about your project…"'),
    ('<input type="text" name="_gotcha" style="display:none" />',
     '<input type="text" name="_gotcha" style="display:none" />\n        <input type="hidden" name="Langue" value="English" />'),
    ("""Les champs obligatoires (nom, e-mail, message) servent uniquement à traiter votre demande —
          base légale : intérêt légitime de Dugos Photographie. Vos données sont adressées à Laurent
          Gosselin, conservées 12&nbsp;mois après le dernier échange, et ne sont ni cédées ni utilisées
          à des fins commerciales. Vous disposez d'un droit d'accès, de rectification, d'effacement et
          d'opposition en écrivant à <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a>. En savoir plus :
          <a href="../confidentialite/index.html">politique de confidentialité</a>.""",
     """The required fields (name, email, message) are used solely to handle your enquiry —
          legal basis: the legitimate interest of Dugos Photographie. Your data is sent to Laurent
          Gosselin, kept for 12&nbsp;months after the last exchange, and is neither passed on nor used
          for commercial purposes. You have the right to access, rectify, erase and object to the
          processing of your data by writing to <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a>. Learn more:
          <a href="../confidentialite/index.html">privacy policy</a>."""),
    ('<span class="btn__label">Envoyer</span>', '<span class="btn__label">Send</span>'),
    ('Message envoyé.', 'Message sent.'),
    ('Laurent vous répondra dans les plus brefs délais.', 'Laurent will get back to you as soon as possible.'),
    ("<span>Retour à l'accueil</span>", '<span>Back to home</span>'),
]
# Les libellés « Nom » / « Email » du formulaire gardent leurs valeurs `name=`
# françaises : c'est ainsi que Laurent les reçoit dans sa boîte mail.

GALLERIES = [
    ('Galeries – mariages &amp; portraits – Dugos Photographie', 'Galleries – Weddings &amp; Portraits – Dugos Photographie'),
    ('Découvrez les galeries de Dugos Photographie à Marmande : mariages et portraits.',
     'Browse the Dugos Photographie galleries in Marmande: weddings and portraits.'),
    ('Galeries – mariages et portraits par Dugos Photographie', 'Galleries – weddings and portraits by Dugos Photographie'),
    ('alt="Galerie mariages — Dugos Photographie"', 'alt="Weddings gallery — Dugos Photographie"'),
    ('alt="Galerie portraits — Dugos Photographie"', 'alt="Portraits gallery — Dugos Photographie"'),
    ('<span class="cat__name">Mariages</span>', '<span class="cat__name">Weddings</span>'),
    ('<span class="cat__name">Portraits</span>', '<span class="cat__name">Portraits</span>'),
    ('Voir la galerie<span', 'View gallery<span'),
]

GALLERY_COMMON = [
    ('aria-label="Retour aux galeries"', 'aria-label="Back to galleries"'),
    ('Me contacter <span', 'Contact me <span'),
    ('aria-label="Remonter en haut de la page"', 'aria-label="Back to top"'),
    ('aria-label="Fermer"', 'aria-label="Close"'),
    ('aria-label="Précédent"', 'aria-label="Previous"'),
    ('aria-label="Suivant"', 'aria-label="Next"'),
]

WEDDINGS = [
    ('Photographe de mariage à Marmande et en Lot-et-Garonne – Dugos',
     'Wedding Photographer in Marmande and Lot-et-Garonne – Dugos'),
    ('Galerie mariages – Dugos Photographie, photographe de mariage à Marmande et dans tout le Sud-Ouest.',
     'Weddings gallery – Dugos Photographie, wedding photographer in Marmande and across south-west France.'),
    ('Photographe de mariage à Marmande et en Lot-et-Garonne</h1>',
     'Wedding photographer in Marmande and Lot-et-Garonne</h1>'),
    ('"name":"Accueil"', '"name":"Home"'),
    ('"name":"Galeries"', '"name":"Galleries"'),
    ('"name":"Mariages"', '"name":"Weddings"'),
]
WEDDINGS_RE = [
    (r'alt="Photographie de mariage à Marmande et en Lot-et-Garonne — Dugos Photographie \((\d+)\)"',
     r'alt="Wedding photography in Marmande and Lot-et-Garonne — Dugos Photographie (\1)"'),
]

PORTRAITS = [
    ('Photographe portrait &amp; séance photo à Marmande (47) – Dugos',
     'Portrait Photographer &amp; Photo Sessions in Marmande (47) – Dugos'),
    ('Galerie portraits – Dugos Photographie, séances portrait naturelles à Marmande (Lot-et-Garonne).',
     'Portraits gallery – Dugos Photographie, natural portrait sessions in Marmande (Lot-et-Garonne).'),
    ('Photographe portrait et séance photo à Marmande (Lot-et-Garonne)</h1>',
     'Portrait photographer and photo sessions in Marmande (Lot-et-Garonne)</h1>'),
    ('"name":"Accueil"', '"name":"Home"'),
    ('"name":"Galeries"', '"name":"Galleries"'),
]
PORTRAITS_RE = [
    (r'alt="Séance portrait à Marmande \(Lot-et-Garonne\) — Dugos Photographie \((\d+)\)"',
     r'alt="Portrait session in Marmande (Lot-et-Garonne) — Dugos Photographie (\1)"'),
]

# ---- Pages légales : le <main class="legal"> est remplacé en bloc ----------
LEGAL_NOTICE_META = [
    ('Mentions légales – Dugos Photographie', 'Legal Notice – Dugos Photographie'),
    ('Mentions légales du site Dugos Photographie – éditeur, hébergeur, propriété intellectuelle.',
     'Legal notice for the Dugos Photographie website – publisher, hosting provider, intellectual property.'),
]
PRIVACY_META = [
    ('Politique de confidentialité – Dugos Photographie', 'Privacy Policy – Dugos Photographie'),
    ('Comment Dugos Photographie collecte et protège vos données personnelles (formulaire de contact, RGPD).',
     'How Dugos Photographie collects and protects your personal data (contact form, GDPR).'),
]

LEGAL_NOTICE_MAIN = """<main class="legal">
      <h1 class="legal__title">Legal notice</h1>
      <p class="legal__updated">Last updated: 9 September 2026</p>

      <nav class="legal__toc" aria-label="Contents">
        <ol>
          <li><a href="#editeur">Site publisher</a></li>
          <li><a href="#directeur">Publication director</a></li>
          <li><a href="#hebergeur">Hosting provider</a></li>
          <li><a href="#pi">Intellectual property</a></li>
          <li><a href="#image">Image rights</a></li>
          <li><a href="#donnees">Personal data and cookies</a></li>
          <li><a href="#responsabilite">Liability and links</a></li>
          <li><a href="#droit">Governing law</a></li>
        </ol>
      </nav>

      <h2 id="editeur">1. Site publisher</h2>
      <p>The website <strong>dugos.fr</strong> is published by:</p>
      <p>
        <strong>Laurent Gosselin</strong>, sole trader (“EI”), trading as
        <strong>Dugos Photographie</strong> — photography business (weddings, portraits, concerts).<br />
        Address: 150 impasse du Plateau, 47430 Caumont-sur-Garonne, France<br />
        Email: <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a><br />
        Telephone: +33&nbsp;6&nbsp;40&nbsp;38&nbsp;85&nbsp;31<br />
        SIREN no.: 910&nbsp;065&nbsp;374 —
        SIRET no.: 910&nbsp;065&nbsp;374&nbsp;00019<br />
        Registered with the Trades and Crafts Register (Répertoire des Métiers et de l'Artisanat) of Lot-et-Garonne (RM&nbsp;47) under number 910&nbsp;065&nbsp;374<br />
        VAT not applicable, article 293&nbsp;B of the French General Tax Code (CGI) (small-business VAT exemption)
      </p>

      <h2 id="directeur">2. Publication director</h2>
      <p>Mr Laurent Gosselin, as publisher of the website.</p>

      <h2 id="hebergeur">3. Hosting provider</h2>
      <p>The website is hosted by <strong>GitHub Pages</strong>, a service provided by:</p>
      <p>
        <strong>GitHub, Inc.</strong><br />
        88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States<br />
        Website: <a href="https://github.com" target="_blank" rel="noopener">github.com</a> —
        Support: <a href="https://support.github.com" target="_blank" rel="noopener">support.github.com</a>
      </p>

      <h2 id="pi">4. Intellectual property</h2>
      <p>
        The entire website (structure, text, layout, graphic elements) and, above all,
        <strong>all of the photographs</strong> shown on it are the exclusive property of
        Laurent Gosselin and are protected by the French Intellectual Property Code
        (articles L.111-1 et seq.).
      </p>
      <p>
        Any reproduction, representation, download, distribution, modification or
        use, in whole or in part, of this content — in particular the photographs —
        in any medium and by any means, without the author's prior written
        permission, is prohibited and constitutes infringement, punishable under
        articles L.335-2 et seq. of the Intellectual Property Code.
      </p>

      <h2 id="image">5. Image rights</h2>
      <p>
        The people appearing in the photographs published on this website have given
        their permission for them to be shown. Anyone who can be identified and
        would like a photograph of them removed may request this by email at
        <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a>;
        the request will be dealt with as quickly as possible.
      </p>

      <h2 id="donnees">6. Personal data and cookies</h2>
      <p>
        The website collects personal data through its contact form
        (name, email address, message). How this data is processed, how long it is
        kept, who receives it and how to exercise your rights are set out in the
        <a href="../confidentialite/index.html">Privacy policy</a>.
      </p>
      <p>
        The website uses <strong>no analytics or advertising cookies</strong>.
        See the <a href="../confidentialite/index.html#cookies">cookies section</a> of
        the privacy policy.
      </p>

      <h2 id="responsabilite">7. Liability and links</h2>
      <p>
        The information on this website is provided for guidance only and may be
        changed at any time. The publisher endeavours to keep it accurate but
        cannot be held liable for errors, for any unavailability of the
        information, or for the presence of viruses on the website.
      </p>
      <p>
        The website may contain links to third-party sites (social networks, Google).
        The publisher has no control over those sites and accepts no responsibility
        for their content or for any use made of them.
      </p>

      <h2 id="droit">8. Governing law</h2>
      <p>
        This legal notice is governed by French law. In the event of a dispute, and
        failing an amicable settlement, the French courts shall have sole
        jurisdiction.
      </p>
"""

PRIVACY_MAIN = """<main class="legal">
      <h1 class="legal__title">Privacy policy</h1>
      <p class="legal__updated">Last updated: 9 September 2026</p>

      <p>
        This policy explains what personal data is collected on the website
        <strong>dugos.fr</strong>, why, for how long, who has access to it, and what
        your rights are. It is drawn up in accordance with the General Data
        Protection Regulation (GDPR) and the French Data Protection Act
        (“Informatique et Libertés”).
      </p>

      <nav class="legal__toc" aria-label="Contents">
        <ol>
          <li><a href="#responsable">Data controller</a></li>
          <li><a href="#donnees">Data collected</a></li>
          <li><a href="#finalites">Purposes and legal bases</a></li>
          <li><a href="#destinataires">Recipients and processors</a></li>
          <li><a href="#transferts">Transfers outside the European Union</a></li>
          <li><a href="#duree">Retention periods</a></li>
          <li><a href="#securite">Security</a></li>
          <li><a href="#droits">Your rights</a></li>
          <li><a href="#reclamation">Complaints to the CNIL</a></li>
          <li><a href="#cookies">Cookies and trackers</a></li>
          <li><a href="#modifs">Changes</a></li>
        </ol>
      </nav>

      <h2 id="responsable">1. Data controller</h2>
      <p>
        The data controller is <strong>Laurent Gosselin</strong>
        (Dugos Photographie), 150 impasse du Plateau,
        47430 Caumont-sur-Garonne, France.<br />
        For any question about your data, contact:
        <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a>.
      </p>
      <p>Full details of the publisher: see the
        <a href="../mentions-legales/index.html">legal notice</a>.</p>

      <h2 id="donnees">2. Data collected</h2>
      <h3>Contact form</h3>
      <p>When you use the form on the Contact page, the following is collected:</p>
      <ul>
        <li>your <strong>name</strong> (required);</li>
        <li>your <strong>email address</strong> (required);</li>
        <li>the <strong>subject</strong> of your enquiry (optional);</li>
        <li>the content of your <strong>message</strong> (required);</li>
        <li>the date and time of sending, together with the IP address and browser
          type, recorded by the form's technical provider for security and
          anti-spam purposes.</li>
      </ul>
      <p>No sensitive data is requested. Please do not include any in your
        message.</p>
      <h3>Connection logs</h3>
      <p>
        The website's host (GitHub, Inc.) keeps technical logs containing, among
        other things, visitors' IP addresses, in order to run the service and keep
        it secure.
      </p>

      <h2 id="finalites">3. Purposes and legal bases</h2>
      <ol class="legal__list">
        <li>
          <strong>Replying to your enquiry</strong> and discussing a possible
          photography project with you.<br />
          Legal basis: the controller's <strong>legitimate interest</strong> in handling
          the requests sent to them (article 6.1.f GDPR); and, where the enquiry
          concerns a service, <strong>pre-contractual measures</strong> taken at your
          request (article 6.1.b).
        </li>
        <li>
          <strong>Keeping the website secure</strong> and preventing abusive
          submissions (spam).<br />
          Legal basis: legitimate interest (article 6.1.f).
        </li>
      </ol>
      <p>Your data is not used for any other purpose. It is not subject to any
        automated marketing and is never resold.</p>

      <h2 id="destinataires">4. Recipients and processors</h2>
      <p>The form data is intended for <strong>Laurent Gosselin
        only</strong>. The following act as technical service providers:</p>
      <ul>
        <li>
          <strong>Formspree, Inc.</strong> (United States) — receiving the form
          messages and forwarding them to the publisher's mailbox. Formspree acts
          as a processor, under its
          <a href="https://formspree.io/legal/terms-of-service" target="_blank" rel="noopener">terms of service</a>
          and its
          <a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noopener">privacy policy</a>,
          which include its GDPR-compliant data processing commitments.
        </li>
        <li>
          <strong>GitHub, Inc.</strong> (United States) — website hosting.
        </li>
      </ul>
      <p>Data may also be disclosed where required by law (a request from an
        authorised judicial or administrative authority).</p>

      <h2 id="transferts">5. Transfers outside the European Union</h2>
      <p>
        As Formspree, Inc. and GitHub, Inc. are based in the United States, sending a
        message through the form and simply visiting the website involve a transfer
        of data to that country. These transfers are governed by the European
        Commission's <strong>standard contractual clauses</strong>
        and/or by these companies' participation in the EU–US
        <strong>Data Privacy Framework</strong>.
      </p>

      <h2 id="duree">6. Retention periods</h2>
      <ul>
        <li><strong>Form messages:</strong> kept for
          <strong>12 months</strong> from the last exchange, then deleted,
          if the enquiry does not lead to a service.</li>
        <li><strong>If a service is provided:</strong> the relevant data is
          kept for the duration of the relationship, then archived for the length of
          the legal obligations (in particular accounting: up to 10 years).</li>
        <li><strong>Technical logs:</strong> in line with the providers' retention
          policies (generally from a few days to 12 months).</li>
      </ul>

      <h2 id="securite">7. Security</h2>
      <p>
        The website is served exclusively over <strong>HTTPS</strong> (encrypted
        connection). Access to the messages received is restricted to the publisher.
        The providers mentioned above apply their own technical and organisational
        security measures.
      </p>

      <h2 id="droits">8. Your rights</h2>
      <p>Under the GDPR, you have the following rights over your data:</p>
      <ul>
        <li>the right of <strong>access</strong> and to obtain a copy;</li>
        <li>the right to <strong>rectification</strong>;</li>
        <li>the right to <strong>erasure</strong>;</li>
        <li>the right to <strong>restriction</strong> of processing;</li>
        <li>the right to <strong>object</strong> to processing based on legitimate interest;</li>
        <li>the right to <strong>data portability</strong> for the data you have provided;</li>
        <li>the right to set <strong>directives</strong> on what happens to your
          data after your death.</li>
      </ul>
      <p>
        To exercise these rights, write to
        <a href="mailto:laurent@dugos.fr">laurent@dugos.fr</a>. Proof of identity
        may be requested if there is reasonable doubt. You will receive a reply
        within one month.
      </p>

      <h2 id="reclamation">9. Complaints to the CNIL</h2>
      <p>
        If, after contacting us, you believe your rights are not being respected,
        you may lodge a complaint with the CNIL, the French data protection authority:<br />
        Commission Nationale de l'Informatique et des Libertés — 3 place de Fontenoy,
        TSA 80715, 75334 Paris Cedex 07, France —
        <a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>.
      </p>

      <h2 id="cookies">10. Cookies and trackers</h2>
      <p>
        The website <strong>uses no analytics, advertising or social-media
        cookies</strong>. No consent banner is therefore required.
      </p>
      <h3>Strictly necessary storage</h3>
      <p>
        A single item is stored in your browser (<code>sessionStorage</code>,
        key “preloaderShown”): it is used only to avoid replaying the intro
        animation when you move between pages. It is erased when you close the tab,
        contains no personal data and allows no tracking. As such it is exempt
        from consent.
      </p>
      <h3>Fonts</h3>
      <p>
        The website's fonts are hosted directly on
        <strong>dugos.fr</strong>: displaying them involves no request or
        transfer of data to a third-party service (Google Fonts or otherwise).
      </p>
      <h3>No third-party resources</h3>
      <p>
        All of the website's files (styles, scripts, animation library,
        fonts, images) are hosted on the site's own domain: browsing
        involves <strong>no request or transfer of data to a third-party
        service</strong> (Google Fonts, CDNs, etc.). The only possible external
        connections result from your deliberately clicking an outgoing link
        (Instagram, Facebook, Google Maps).
      </p>

      <h2 id="modifs">11. Changes</h2>
      <p>
        This policy may be updated at any time. The date of the last update is shown
        at the top of the page. We encourage you to check it regularly.
      </p>
"""

# --------------------------------------------------------------------------
# 3. Moteur
# --------------------------------------------------------------------------

def flex_pattern(fr):
    parts = re.split(r'\s+', fr.strip())
    return r'\s+'.join(re.escape(p) for p in parts)


def apply_pairs(html, pairs, page, required=True):
    for fr, en in pairs:
        pat = re.compile(flex_pattern(fr))
        html, n = pat.subn(lambda m, en=en: en, html)
        if n == 0 and required:
            sys.exit(f'[{page}] texte français introuvable : {fr[:80]!r}')
    return html


def apply_regex(html, pairs, page):
    for pat, rep in pairs:
        html, n = re.subn(pat, rep, html)
        if n == 0:
            sys.exit(f'[{page}] motif introuvable : {pat[:80]!r}')
    return html


ATTR_RE = re.compile(r'(\b(?:href|src))="([^"]*)"')


def rewrite_urls(html, fr, en):
    fr_dir = posixpath.dirname(fr)
    page_set = {v: k for k, v in PAGES.items()}

    def fix(m):
        attr, url = m.group(1), m.group(2)
        if re.match(r'^(?:[a-z][a-z0-9+.-]*:|//|#)', url, re.I) or not url:
            return m.group(0)
        path, sep, frag = url.partition('#')
        path, qsep, query = path.partition('?')
        if not path:
            return m.group(0)
        target = posixpath.normpath(posixpath.join(fr_dir, path))
        if target in PAGES:
            target = PAGES[target]
        elif target == '.':
            target = PAGES['index.html']
        out = rel(en, target)
        return f'{attr}="{out}{qsep + query if qsep else ""}{sep + frag if sep else ""}"'
    return ATTR_RE.sub(fix, html)


def main():
    # 1. patch des pages françaises
    for fr, en in PAGES.items():
        patch_fr(fr, en)

    # 2. génération des pages anglaises
    for fr, en in PAGES.items():
        s = read(fr)
        # on met à l'abri hreflang + sélecteur FR (recréés pour l'EN)
        s = HREFLANG_RE.sub('', s)
        s = LANG_RE.sub('', s)

        if fr == 'index.html':
            s = apply_pairs(s, INDEX, fr)
            s = apply_regex(s, INDEX_RE, fr)
        elif fr == 'a-propos/index.html':
            s = apply_pairs(s, ABOUT, fr)
        elif fr == 'contact/index.html':
            s = apply_pairs(s, CONTACT, fr)
        elif fr == 'galeries/index.html':
            s = apply_pairs(s, GALLERIES, fr)
        elif fr == 'galeries/mariages/index.html':
            s = apply_pairs(s, GALLERY_COMMON + WEDDINGS, fr)
            s = apply_regex(s, WEDDINGS_RE, fr)
        elif fr == 'galeries/portraits/index.html':
            s = apply_pairs(s, GALLERY_COMMON + PORTRAITS, fr)
            s = apply_regex(s, PORTRAITS_RE, fr)
        elif fr in ('mentions-legales/index.html', 'confidentialite/index.html'):
            meta, main_html = ((LEGAL_NOTICE_META, LEGAL_NOTICE_MAIN) if fr.startswith('mentions')
                               else (PRIVACY_META, PRIVACY_MAIN))
            s = apply_pairs(s, meta, fr)
            a = s.index('<main class="legal">')
            b = s.index('</main>', a)
            s = s[:a] + main_html + '    ' + s[b:]
        s = apply_pairs(s, COMMON, fr, required=False)

        # <html lang>, og:locale
        s = s.replace('<html lang="fr">', '<html lang="en">', 1)
        s = s.replace('content="fr_FR"', 'content="en_GB"')

        # URL absolues des pages (canonical, og:url, fil d'Ariane JSON-LD)
        for k in sorted(PAGES, key=len, reverse=True):
            s = s.replace(f'"{page_url(k)}"', f'"{page_url(PAGES[k])}"')

        # liens relatifs (pages -> pages anglaises, ressources partagées)
        s = rewrite_urls(s, fr, en)

        # hreflang + sélecteur de langue, une fois les liens réécrits
        s = re.sub(r'(<link rel="canonical"[^>]*/>\n)', lambda m: m.group(1) + hreflang_block(fr, en), s, count=1)
        i = s.index('class="nav__links"')
        j = s.index('</ul>', i)
        line_start = s.rindex('\n', 0, j) + 1
        s = s[:line_start] + lang_switcher('en', en, fr, en) + s[line_start:]

        write(en, s)
        print('✓', en)

    # 3. sitemap
    urls = []
    prio = {'index.html': '1.0', 'galeries/index.html': '0.8', 'galeries/mariages/index.html': '0.9',
            'galeries/portraits/index.html': '0.9', 'a-propos/index.html': '0.7', 'contact/index.html': '0.8',
            'mentions-legales/index.html': '0.2', 'confidentialite/index.html': '0.2'}
    for fr, en in PAGES.items():
        for loc in (fr, en):
            urls.append(
                f'  <url><loc>{page_url(loc)}</loc><lastmod>2026-10-04</lastmod><priority>{prio[fr]}</priority>\n'
                f'    <xhtml:link rel="alternate" hreflang="fr" href="{page_url(fr)}"/>\n'
                f'    <xhtml:link rel="alternate" hreflang="en" href="{page_url(en)}"/>\n'
                f'  </url>')
    write('sitemap.xml',
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
          + '\n'.join(urls) + '\n</urlset>\n')
    print('✓ sitemap.xml')


if __name__ == '__main__':
    main()
