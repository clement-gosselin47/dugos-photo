// ---- Désactive la restauration de scroll du navigateur ----
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

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

// ---- Scroll reveal (une fois apparu, reste visible) ----
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.block__label, .block__title, .block__body, .block__list, .block__values, .block__steps, .block__cta-sub, .block__cta-title, .block__cta-btn').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// ---- Parallax images (throttlé en rAF : pas de layout-thrash pendant le scroll) ----
(function () {
  const targets = ['.block__img--front', '.block__img-single']
    .map(s => document.querySelector(s))
    .filter(Boolean)
    .map(el => ({ el, section: el.closest('.block') }))
    .filter(t => t.section);
  if (!targets.length) return;

  let ticking = false;
  function apply() {
    ticking = false;
    const vh = window.innerHeight;
    targets.forEach(({ el, section }) => {
      const rect = section.getBoundingClientRect();
      const progress = (vh - rect.top) / (vh + rect.height);
      el.style.transform = `translateY(${(progress - 0.5) * -200}px)`;
    });
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(apply); }
  }, { passive: true });
  apply();
})();

// ---- Nav shadow on scroll ----
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ---- Défilement doux : géré globalement par assets/smooth-scroll.js ----
// Le footer se dévoile progressivement en fin de page, sans résistance
// ni snap — même rythme que le reste du site.

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
