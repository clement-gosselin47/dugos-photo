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
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

const revealEls = document.querySelectorAll('.block__label, .block__title, .block__body, .block__list, .block__values, .block__steps, .block__cta-sub, .block__cta-title, .block__cta-btn');
revealEls.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 80}ms`;
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// Filet de sécurité : révèle tout de suite ce qui est déjà dans le viewport
// (l'IntersectionObserver peut manquer les éléments présents au chargement),
// et révèle tout au bout de 2 s si le JS d'observation n'a rien fait.
function revealVisible() {
  revealEls.forEach(el => {
    if (el.classList.contains('revealed')) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('revealed');
      revealObserver.unobserve(el);
    }
  });
}
requestAnimationFrame(revealVisible);
window.addEventListener('load', revealVisible);
setTimeout(() => revealEls.forEach(el => el.classList.add('revealed')), 2000);

// ---- Parallax images (throttlé en rAF : pas de layout-thrash pendant le scroll) ----
// Desktop : la photo avant du collage et la photo seule se décalent (±100px).
// Mobile : les photos de chapitre sont bord à bord, donc c'est l'image qui
// glisse À L'INTÉRIEUR de son cadre fixe (image haute de 120 %, voir style.css) ;
// seule la petite photo du collage d'en-tête bouge, avec une amplitude réduite.
(function () {
  const mqMobile = window.matchMedia('(max-width: 768px)');
  const byBlock = el => ({ el, section: el.closest('.block') });
  const desktopTargets = ['.block__img--front', '.block__img-single']
    .map(s => document.querySelector(s))
    .filter(Boolean)
    .map(byBlock)
    .filter(t => t.section);
  const front = document.querySelector('.block__img--front');
  const frames = [...document.querySelectorAll('.block__video, .block__img-single')]
    .map(frame => ({ frame, img: frame.querySelector('img') }))
    .filter(f => f.img);
  if (!desktopTargets.length && !frames.length) return;

  let ticking = false;
  let wasMobile = null;
  function apply() {
    ticking = false;
    const vh = window.innerHeight;
    const mobile = mqMobile.matches;
    if (mobile !== wasMobile) {   // changement de format : on repart de zéro
      desktopTargets.forEach(({ el }) => { el.style.transform = ''; });
      frames.forEach(({ img }) => { img.style.transform = ''; });
      wasMobile = mobile;
    }

    if (!mobile) {
      desktopTargets.forEach(({ el, section }) => {
        const rect = section.getBoundingClientRect();
        const progress = (vh - rect.top) / (vh + rect.height);
        el.style.transform = `translateY(${(progress - 0.5) * -200}px)`;
      });
      return;
    }

    frames.forEach(({ frame, img }) => {
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      // 0 → l'image est calée en haut ; 1 → décalée de toute sa marge (20 % du cadre)
      img.style.transform = `translate3d(0, ${-progress * 0.2 * rect.height}px, 0)`;
    });
    if (front) {
      const rect = front.closest('.block').getBoundingClientRect();
      const progress = (vh - rect.top) / (vh + rect.height);
      front.style.transform = `translateY(${(progress - 0.5) * -70}px)`;
    }
  }
  window.addEventListener('resize', () => { if (!ticking) { ticking = true; requestAnimationFrame(apply); } });
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
  // Le header se masque seulement en descendant ; en remontant il reste visible
  let lastY = window.scrollY;
  const onMove = () => {
    const y = window.scrollY, dy = y - lastY;
    lastY = y;
    // Tout en haut de page, le header reste toujours visible
    if (y < 20 && !document.body.classList.contains("flow-mode")) {
      nav.classList.remove("nav--hidden");
      return;
    }
    if (dy > 0) {
      nav.classList.add("nav--hidden");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => nav.classList.remove("nav--hidden"), 450);
    } else if (dy < 0) {
      clearTimeout(idleTimer);
      nav.classList.remove("nav--hidden");
    }
  };
  // capture:true attrape aussi le scroll horizontal de la galerie en mode Flow
  document.addEventListener("scroll", onMove, { capture: true, passive: true });
  window.addEventListener("wheel", onMove, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: true });
})();
