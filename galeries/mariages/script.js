// ---- Masque les images cassées (le fond gris du placeholder reste visible) ----
(function () {
  document.querySelectorAll('img:not(.lightbox__img)').forEach(img => {
    if (!img.getAttribute('src')) return;
    const hide = () => { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0) hide();
    else img.addEventListener('error', hide);
  });
})();

// ---- Scrollbar custom ----
(function () {
  const track = document.createElement('div');
  track.className = 'c-scrollbar';
  const thumb = document.createElement('div');
  thumb.className = 'c-scrollbar__thumb';
  track.appendChild(thumb);
  document.body.appendChild(track);

  function update() {
    const trackH   = track.offsetHeight;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) { track.style.opacity = '0'; return; }
    track.style.opacity = '';
    const ratio     = window.innerHeight / document.body.scrollHeight;
    const thumbH    = Math.max(ratio * trackH, 32);
    const thumbTop  = (window.scrollY / maxScroll) * (trackH - thumbH);
    thumb.style.height = thumbH + 'px';
    thumb.style.top    = thumbTop + 'px';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // Drag
  let dragStartY = 0, dragStartScroll = 0, dragging = false;

  thumb.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging    = true;
    dragStartY  = e.clientY;
    dragStartScroll = window.scrollY;
    thumb.classList.add('dragging');
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const trackH    = track.offsetHeight;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const thumbH    = thumb.offsetHeight;
    const delta     = e.clientY - dragStartY;
    const scrollDelta = (delta / (trackH - thumbH)) * maxScroll;
    const to = dragStartScroll + scrollDelta;
    if (window.smoothScroll) window.smoothScroll.setImmediate(to);
    else window.scrollTo(0, to);
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
    thumb.classList.remove('dragging');
  });

  // Clic sur le track
  track.addEventListener('click', e => {
    if (e.target === thumb) return;
    const rect      = track.getBoundingClientRect();
    const clickY    = e.clientY - rect.top;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const to = (clickY / track.offsetHeight) * maxScroll;
    if (window.smoothScroll) window.smoothScroll.to(to);
    else window.scrollTo({ top: to, behavior: 'smooth' });
  });
})();

// ---- Lightbox ----
const lightbox   = document.getElementById('lightbox');
const lbImg      = document.getElementById('lbImg');
const lbCounter  = document.getElementById('lbCounter');
const lbClose    = document.getElementById('lbClose');
const lbPrev     = document.getElementById('lbPrev');
const lbNext     = document.getElementById('lbNext');

// Source de vérité : les items ORIGINAUX uniquement
function getOriginals() {
  return Array.from(document.querySelectorAll('.gallery__item:not([data-clone])'));
}

let lbIndex = 0;

// Chemin pleine résolution à partir d'une vignette (retire le segment /thumb/)
const fullRes = src => src.replace(/\/thumb\//, '/');

function openLightbox(index) {
  const originals = getOriginals();
  lbIndex = ((index % originals.length) + originals.length) % originals.length;
  const img = originals[lbIndex].querySelector('img');
  const full = fullRes(img.src);

  // Aperçu instantané avec la vignette déjà chargée, puis swap vers la pleine
  // résolution quand elle est prête (garde-fou dataset.target : une navigation
  // plus récente ne se fait pas écraser par une image lente à charger).
  lbImg.src = img.src;
  lbImg.alt = img.alt;
  lbImg.dataset.target = full;
  const hi = new Image();
  hi.decoding = 'async';
  hi.onload = () => { if (lbImg.dataset.target === full) lbImg.src = full; };
  hi.src = full;

  // Précharge les voisines en pleine résolution (navigation ← → fluide)
  [-1, 1].forEach(d => {
    const n = originals[((lbIndex + d) % originals.length + originals.length) % originals.length];
    const s = n && n.querySelector('img') && fullRes(n.querySelector('img').src);
    if (s) { const p = new Image(); p.src = s; }
  });

  lbCounter.textContent = `${lbIndex + 1} / ${originals.length}`;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  window.smoothScroll?.pause();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lbImg.src = '';
  document.body.style.overflow = '';
  if (!isFlow) window.smoothScroll?.resume();
}

function lbGo(dir) {
  openLightbox(lbIndex + dir);
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => lbGo(-1));
lbNext.addEventListener('click', () => lbGo(1));

// Clic sur le fond → ferme
lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox();
});

// Clavier
document.addEventListener('keydown', e => {
  if (!lightbox.classList.contains('open')) return;
  if (e.key === 'Escape' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.preventDefault();
  if (e.key === 'Escape')      closeLightbox();
  if (e.key === 'ArrowRight')  lbGo(1);
  if (e.key === 'ArrowLeft')   lbGo(-1);
});

// Délégation sur la galerie (fonctionne pour originaux ET clones)
document.querySelector('.gallery__grid').addEventListener('click', e => {
  const item = e.target.closest('.gallery__item');
  if (!item) return;

  // Trouve l'index dans les originaux
  const originals = getOriginals();
  const src = item.querySelector('img')?.src;
  const idx = originals.findIndex(o => o.querySelector('img')?.src === src);
  if (idx !== -1) openLightbox(idx);
});

// ---- View toggle Flow / Grid ----
const btnFlow = document.getElementById('btnFlow');
const btnGrid = document.getElementById('btnGrid');
const grid    = document.querySelector('.gallery__grid');
let isFlow    = false;

let originalScrollWidth = 0;
let infiniteReady       = false;
let flowItems           = [];   // cache des items pour la proximité
let jumping             = false;
let rafPending          = false;

function setupInfiniteFlow() {
  if (infiniteReady) return;

  const originals = Array.from(grid.querySelectorAll('.gallery__item:not([data-clone])'));

  // Mesure APRÈS layout flow (class déjà appliquée)
  originalScrollWidth = grid.scrollWidth;

  // Clones avant
  const before = document.createDocumentFragment();
  originals.forEach(item => {
    const c = item.cloneNode(true);
    c.dataset.clone = 'true';
    c.setAttribute('aria-hidden', 'true');
    before.appendChild(c);
  });
  grid.insertBefore(before, grid.firstChild);

  // Clones après
  originals.forEach(item => {
    const c = item.cloneNode(true);
    c.dataset.clone = 'true';
    c.setAttribute('aria-hidden', 'true');
    grid.appendChild(c);
  });

  infiniteReady = true;

  // Positionne au milieu (section originaux)
  grid.scrollLeft = originalScrollWidth;

  // Cache tous les items (originaux + clones) pour la proximité
  flowItems = Array.from(grid.querySelectorAll('.gallery__item'));
}

function teardownInfiniteFlow() {
  grid.querySelectorAll('[data-clone]').forEach(el => el.remove());
  flowItems.forEach(el => { el.style.transform = ''; });
  flowItems           = [];
  infiniteReady       = false;
  originalScrollWidth = 0;
  grid.scrollLeft     = 0;
}

btnFlow?.addEventListener('click', () => {
  // On fige le défilement doux global et on remet la page en haut :
  // en mode Flow la molette pilote le défilement horizontal de la galerie.
  window.smoothScroll?.setImmediate(0);
  window.smoothScroll?.pause();

  btnFlow.classList.add('active');
  btnGrid.classList.remove('active');
  grid.classList.add('flow');
  document.documentElement.classList.add('flow-mode');
  document.body.classList.add('flow-mode');
  isFlow = true;

  requestAnimationFrame(() => {
    setupInfiniteFlow();
    updateProximity();
  });
});

btnGrid?.addEventListener('click', () => {
  btnGrid.classList.add('active');
  btnFlow.classList.remove('active');
  grid.classList.remove('flow');
  document.documentElement.classList.remove('flow-mode');
  document.body.classList.remove('flow-mode');
  isFlow = false;
  teardownInfiniteFlow();
  if (!lightbox.classList.contains('open')) window.smoothScroll?.resume();
});

// ---- Effet de proximité ----
function updateProximity() {
  if (!isFlow || flowItems.length === 0) return;
  const gridCenter = grid.scrollLeft + grid.offsetWidth / 2;
  flowItems.forEach(item => {
    const itemCenter = item.offsetLeft + item.offsetWidth / 2;
    const dist  = Math.abs(itemCenter - gridCenter);
    const norm  = Math.min(dist / (grid.offsetWidth * 0.45), 1);
    const scale = 1 - norm * 0.28;
    item.style.transform = `scale(${scale})`;
  });
}

// ---- Boucle infinie ----
grid.addEventListener('scroll', () => {
  if (!isFlow || !infiniteReady || originalScrollWidth === 0) return;

  // Fix race condition : on remet jumping à false via microtask
  // pour que le scroll event synchrone déclenché par scrollLeft= soit bien bloqué
  if (!jumping) {
    if (grid.scrollLeft < originalScrollWidth * 0.25) {
      jumping = true;
      grid.scrollLeft += originalScrollWidth;
      Promise.resolve().then(() => { jumping = false; });
    } else if (grid.scrollLeft > originalScrollWidth * 1.75) {
      jumping = true;
      grid.scrollLeft -= originalScrollWidth;
      Promise.resolve().then(() => { jumping = false; });
    }
  }

  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      updateProximity();
      rafPending = false;
    });
  }
});

// ---- Molette ----
// Hors mode Flow : le défilement vertical doux est géré globalement
// (assets/smooth-scroll.js) — on ne touche à rien, le footer se dévoile
// progressivement comme sur le reste du site.
// En mode Flow : la molette verticale pilote le défilement horizontal.
const normalizeDelta = e =>
  e.deltaMode === 1 ? e.deltaY * 33 :
  e.deltaMode === 2 ? e.deltaY * window.innerHeight :
  e.deltaY;

document.addEventListener('wheel', e => {
  if (e.ctrlKey) return; // laisse le zoom (pinch/ctrl+molette) fonctionner

  // Lightbox ouverte → bloque le défilement d'arrière-plan
  if (lightbox.classList.contains('open')) { e.preventDefault(); return; }

  if (!isFlow) return; // défilement vertical : géré par smooth-scroll.js

  e.preventDefault();
  grid.scrollLeft += normalizeDelta(e);
}, { passive: false, capture: true });

// ---- Resize en flow mode : les mesures des clones deviennent fausses → on reconstruit ----
let resizeTimer = null;
window.addEventListener('resize', () => {
  if (!isFlow) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    teardownInfiniteFlow();
    setupInfiniteFlow();
    updateProximity();
  }, 150);
});

// ---- Header + bouton Flow/Grid : masqués pendant le scroll, reviennent à l'arrêt ----
(function () {
  const els = [document.querySelector(".nav"), document.querySelector(".view-toggle")].filter(Boolean);
  if (!els.length) return;
  let idleTimer = null;
  const show = () => els.forEach(el => el.classList.remove("nav--hidden"));
  const hide = () => els.forEach(el => el.classList.add("nav--hidden"));
  const onMove = () => {
    // En mode Flow, header et bouton restent toujours visibles ;
    // idem tout en haut de page en mode Grid
    if (document.body.classList.contains("flow-mode") || window.scrollY < 20) {
      show();
      return;
    }
    hide();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(show, 450);
  };
  // capture:true attrape aussi le scroll horizontal de la galerie en mode Flow
  document.addEventListener("scroll", onMove, { capture: true, passive: true });
  window.addEventListener("wheel", onMove, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
})();
