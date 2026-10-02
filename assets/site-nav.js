/* ============================================================================
   Dugos — Menu mobile partagé
   ----------------------------------------------------------------------------
   Injecte le bouton ☰ dans .nav et gère l'ouverture / fermeture du panneau
   de liens (.nav__links) sous 768 px. Aucun effet visible sur desktop.

   Menu plein écran « chambre noire » : fond noir, photo N&B qui se révèle
   avec un lent zoom arrière à chaque ouverture, liens qui montent de derrière
   un masque, page courante agrandie.
   ========================================================================== */
(function () {
  'use strict';

  // Dossier assets/ déduit de l'URL de ce script (valable à toutes les profondeurs)
  var script = document.currentScript;
  var assetsBase = script ? new URL('.', script.src).href : 'assets/';
  var MENU_PHOTO = 'menu-1.jpg';

  var nav = document.querySelector('.nav');
  if (!nav) return;
  var links = nav.querySelector('.nav__links');
  if (!links) return;

  if (!links.id) links.id = 'navLinks';

  // --- Liens : libellé masqué (révélé par le bas), page courante ---
  var normPath = function (path) { return path.replace(/index\.html$/, '').replace(/\/+$/, '/'); };
  var here = normPath(location.pathname);
  var logo = nav.querySelector('.nav__logo');
  var home = logo ? normPath(logo.pathname) : null;
  Array.prototype.forEach.call(links.querySelectorAll('.nav__link'), function (a) {
    var label = a.textContent.trim();
    a.innerHTML = '<span class="nav__label"><span class="nav__label-inner">' + label + '</span></span>';
    // Page courante : correspondance exacte, ou rubrique parente (ex. Galeries
    // sur /galeries/mariages/) — sauf l'accueil, qui préfixerait tout le site
    var target = normPath(a.pathname);
    if (target === here || (target !== home && here.indexOf(target) === 0)) {
      a.setAttribute('aria-current', 'page');
    }
  });

  // --- Fond photo (N&B), injecté dans l'en-tête ---
  var bg = document.createElement('div');
  bg.className = 'nav__menu-bg';
  bg.setAttribute('aria-hidden', 'true');
  var photo = document.createElement('div');
  photo.className = 'nav__menu-photo';
  bg.appendChild(photo);
  nav.insertBefore(bg, links);

  // Photo chargée à la 1re ouverture seulement ; le zoom arrière est rejoué
  // à chaque ouverture (retrait de la classe + reflow + remise). À la
  // fermeture on la laisse en place : elle disparaît avec le fondu du fond.
  var loaded = false;
  function showPhoto(open) {
    if (!open) return;
    if (!loaded) {
      photo.style.backgroundImage = 'url("' + assetsBase + MENU_PHOTO + '")';
      loaded = true;
    }
    photo.classList.remove('is-active');
    void photo.offsetWidth;
    photo.classList.add('is-active');
  }

  var btn = document.createElement('button');
  btn.className = 'nav__toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Ouvrir le menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', links.id);
  btn.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(btn);

  function setOpen(open) {
    // Déjà dans cet état : ne pas toucher à overflow (Échap pendant le
    // preloader ou la lightbox débloquerait sinon le défilement de la page)
    if (open === nav.classList.contains('nav--open')) return;
    nav.classList.toggle('nav--open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    // Bloque le défilement de la page pendant que le menu plein écran est ouvert
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
    showPhoto(open);
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains('nav--open'));
  });

  // Clic sur un lien → on referme
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Clic en dehors de l'en-tête → on referme
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('nav--open') && !nav.contains(e.target)) setOpen(false);
  });

  // Échap → on referme
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') setOpen(false);
  });

  // Retour en desktop → on referme (état propre)
  var mq = window.matchMedia('(min-width: 769px)');
  var onMq = function (e) { if (e.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);
})();
