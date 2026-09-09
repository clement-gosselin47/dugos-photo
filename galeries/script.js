// ---- Masque les images cassées (le placeholder gris reste visible) ----
(function () {
  document.querySelectorAll('img').forEach(img => {
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
    const trackH    = track.offsetHeight;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) { track.style.opacity = '0'; return; }
    track.style.opacity = '';
    const ratio    = window.innerHeight / document.body.scrollHeight;
    const thumbH   = Math.max(ratio * trackH, 32);
    const thumbTop = (window.scrollY / maxScroll) * (trackH - thumbH);
    thumb.style.height = thumbH + 'px';
    thumb.style.top    = thumbTop + 'px';
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  let dragStartY = 0, dragStartScroll = 0, dragging = false;
  thumb.addEventListener('mousedown', e => {
    e.preventDefault();
    dragging = true; dragStartY = e.clientY; dragStartScroll = window.scrollY;
    thumb.classList.add('dragging');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const delta = e.clientY - dragStartY;
    const to = dragStartScroll + (delta / (track.offsetHeight - thumb.offsetHeight)) * maxScroll;
    if (window.smoothScroll) window.smoothScroll.setImmediate(to);
    else window.scrollTo(0, to);
  });
  document.addEventListener('mouseup', () => { dragging = false; thumb.classList.remove('dragging'); });
  track.addEventListener('click', e => {
    if (e.target === thumb) return;
    const rect = track.getBoundingClientRect();
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    const to = ((e.clientY - rect.top) / track.offsetHeight) * maxScroll;
    if (window.smoothScroll) window.smoothScroll.to(to);
    else window.scrollTo({ top: to, behavior: 'smooth' });
  });
})();

// ---- Défilement doux : géré globalement par assets/smooth-scroll.js ----
// (l'ancien snap plein écran haut/bas est supprimé : le footer se dévoile
//  progressivement, comme sur toutes les autres pages)

// ---- Header : se masque pendant le scroll, réapparaît à l'arrêt ----
(function () {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  let idleTimer = null;
  const onMove = () => {
    // Tout en haut de page, le header reste toujours visible
    if (window.scrollY < 20 && !document.body.classList.contains("flow-mode")) {
      nav.classList.remove("nav--hidden");
      return;
    }
    nav.classList.add("nav--hidden");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => nav.classList.remove("nav--hidden"), 450);
  };
  // capture:true attrape aussi le scroll horizontal de la galerie en mode Flow
  document.addEventListener("scroll", onMove, { capture: true, passive: true });
  window.addEventListener("wheel", onMove, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
})();
