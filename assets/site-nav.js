/* ============================================================================
   Dugos — Menu mobile partagé
   ----------------------------------------------------------------------------
   Injecte le bouton ☰ dans .nav et gère l'ouverture / fermeture du panneau
   de liens (.nav__links) sous 768 px. Aucun effet visible sur desktop.
   ========================================================================== */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  if (!nav) return;
  var links = nav.querySelector('.nav__links');
  if (!links) return;

  if (!links.id) links.id = 'navLinks';

  var btn = document.createElement('button');
  btn.className = 'nav__toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Ouvrir le menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', links.id);
  btn.innerHTML = '<span></span><span></span><span></span>';
  nav.appendChild(btn);

  function setOpen(open) {
    nav.classList.toggle('nav--open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
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
