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

// ---- Formspree submission ----
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');

form?.addEventListener('submit', async e => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');
  submitBtn.querySelector('.btn__label').textContent = 'Envoi…';

  const fail = () => {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
    submitBtn.querySelector('.btn__label').textContent = 'Erreur — réessayer';
  };

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      form.style.display = 'none';
      formSuccess.classList.add('visible');
      window.scrollTo(0, 0);
    } else {
      fail();
    }
  } catch {
    fail();
  }
});

// ---- Nav shadow on scroll ----
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ---- Défilement doux : géré globalement par assets/smooth-scroll.js ----
// (plus de hijack molette / snap footer : dévoilement progressif du footer)

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
