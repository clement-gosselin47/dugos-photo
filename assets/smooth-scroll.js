/* ============================================================================
   Dugos — Smooth scroll unifié (partagé par toutes les pages)
   ----------------------------------------------------------------------------
   Un seul modèle de défilement sur tout le site : la molette et le clavier
   nourrissent une cible (targetY), une boucle rAF interpole la position
   courante vers cette cible (lerp). Résultat : un scroll doux qui glisse et
   se pose tout seul, sans à-coups, à la même vitesse partout.

   Ne touche pas au tactile (le défilement natif mobile est déjà fluide) ni
   au zoom (ctrl/pinch). Respecte prefers-reduced-motion.

   API publique : window.smoothScroll
     .to(y[, {immediate}])  → vise une position (défilement doux)
     .setImmediate(y)       → cale la position sans animation (drag scrollbar)
     .pause() / .resume()   → gèle/réactive (lightbox, galerie horizontale…)
     .refresh()             → reclampe après changement de hauteur de page
     .paused                → booléen
   ========================================================================== */
(function () {
  'use strict';

  var docEl = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarsePointer = window.matchMedia('(pointer: coarse)').matches;

  // Restaure toujours en haut de page au chargement (cohérent sur tout le site)
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // ---- Réglages du "feeling" ------------------------------------------------
  var EASE          = 0.085;  // 0 = figé, 1 = instantané. Plus bas = plus doux.
  var WHEEL_MULT    = 0.8;    // < 1 : un peu plus posé que le natif, sans être mou
  var MAX_EVENT     = 1.4;    // clamp d'un seul cran de molette (× hauteur écran)
  var MAX_LEAD      = 2.5;    // la cible ne peut pas fuir à plus de N écrans devant
  var SETTLE_PX     = 0.4;    // distance sous laquelle on considère l'arrivée
  var WATCHDOG_MS   = 200;    // si rAF ne tourne pas (onglet gelé) → saut direct

  // Sur tactile ou reduced-motion : on ne détourne rien, scroll natif.
  var NATIVE_ONLY = reduceMotion || coarsePointer;

  var targetY  = window.scrollY || 0;
  var currentY = targetY;
  var running  = false;
  var paused   = false;
  var lastFrameAt = 0;
  var watchdog = null;

  function maxScroll() {
    var se = document.scrollingElement || document.body;
    return Math.max(0, se.scrollHeight - window.innerHeight);
  }
  function clamp(v) {
    var m = maxScroll();
    return v < 0 ? 0 : (v > m ? m : v);
  }

  function frame(now) {
    lastFrameAt = now || performance.now();
    var diff = targetY - currentY;

    if (Math.abs(diff) <= SETTLE_PX) {
      currentY = targetY;
      window.scrollTo(0, currentY);
      running = false;
      clearTimeout(watchdog);
      return;
    }
    currentY += diff * EASE;
    window.scrollTo(0, Math.round(currentY * 100) / 100);
    requestAnimationFrame(frame);
  }

  function ensureRunning() {
    if (!running) {
      running = true;
      lastFrameAt = performance.now();
      requestAnimationFrame(frame);
    }
    // Filet de sécurité : environnements où rAF ne tourne pas (onglet en
    // arrière-plan, previews). Si aucune frame n'a tourné → on finit sec.
    clearTimeout(watchdog);
    watchdog = setTimeout(function () {
      if (running && performance.now() - lastFrameAt > WATCHDOG_MS - 20) {
        currentY = targetY;
        window.scrollTo(0, currentY);
        running = false;
      }
    }, WATCHDOG_MS);
  }

  // Le scroll a bougé sans nous (ancre, focus clavier, scrollbar custom,
  // librairie tierce…) → on se resynchronise pour ne pas "ramener" la page.
  function syncFromNative() {
    if (running || paused) return;
    currentY = targetY = window.scrollY;
  }

  // ---- Détourne la molette -----------------------------------------------
  function onWheel(e) {
    if (paused || e.ctrlKey || e.defaultPrevented) return;
    if (scrollableAncestor(e.target, e.deltaY)) return; // conteneur interne scrollable

    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 33;                    // lignes → px (Firefox)
    else if (e.deltaMode === 2) d *= window.innerHeight; // pages → px

    var cap = window.innerHeight * MAX_EVENT;
    if (d > cap) d = cap; else if (d < -cap) d = -cap;

    e.preventDefault();

    var lead = window.innerHeight * MAX_LEAD;
    targetY = clamp(Math.max(currentY - lead, Math.min(currentY + lead, targetY + d * WHEEL_MULT)));
    ensureRunning();
  }

  // ---- Clavier (même cible → même douceur) -------------------------------
  function onKey(e) {
    if (paused || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, tag = (t && t.tagName || '').toLowerCase();
    if (t && (t.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select')) return;

    var page = window.innerHeight * 0.82;
    var step = 90;
    var handled = true;

    switch (e.key) {
      case 'ArrowDown':  targetY = clamp(targetY + step); break;
      case 'ArrowUp':    targetY = clamp(targetY - step); break;
      case 'PageDown':   targetY = clamp(targetY + page); break;
      case 'PageUp':     targetY = clamp(targetY - page); break;
      case 'Home':       targetY = 0; break;
      case 'End':        targetY = maxScroll(); break;
      case ' ':          // barre espace (Shift = vers le haut)
        if (tag === 'button' || tag === 'a') { handled = false; break; }
        targetY = clamp(targetY + (e.shiftKey ? -page : page));
        break;
      default: handled = false;
    }
    if (handled) { e.preventDefault(); ensureRunning(); }
  }

  // Un ancêtre marqué [data-native-scroll] peut-il encore défiler dans ce sens ?
  function scrollableAncestor(node, dy) {
    for (var el = node; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
      if (el.nodeType === 1 && el.hasAttribute('data-native-scroll')) {
        var canDown = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
        var canUp   = el.scrollTop > 1;
        if ((dy > 0 && canDown) || (dy < 0 && canUp)) return true;
      }
    }
    return false;
  }

  // ---- API publique -----------------------------------------------------
  window.smoothScroll = {
    to: function (y, opts) {
      opts = opts || {};
      if (NATIVE_ONLY) {
        window.scrollTo({ top: clamp(y), behavior: opts.immediate ? 'auto' : 'smooth' });
        return;
      }
      targetY = clamp(y);
      if (opts.immediate) {
        currentY = targetY;
        window.scrollTo(0, currentY);
      } else {
        ensureRunning();
      }
    },
    setImmediate: function (y) {
      targetY = currentY = clamp(y);
      window.scrollTo(0, currentY);
    },
    pause: function () { paused = true; },
    resume: function () {
      paused = false;
      currentY = targetY = window.scrollY;
    },
    refresh: function () { targetY = clamp(targetY); },
    get paused() { return paused; }
  };

  // ---- Branchement -----------------------------------------------------
  window.addEventListener('scroll', syncFromNative, { passive: true });
  window.addEventListener('resize', function () { targetY = clamp(targetY); }, { passive: true });
  window.addEventListener('load', function () { targetY = currentY = window.scrollY; });

  if (!NATIVE_ONLY) {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    docEl.classList.add('has-smooth-scroll');
  } else {
    docEl.classList.add('has-native-scroll');
  }
})();
