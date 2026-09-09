// ---- Masque les images cassées (les placeholders restent visibles) ----
(function () {
  document.querySelectorAll('img').forEach(img => {
    if (!img.getAttribute('src')) return;
    const hide = () => { img.style.display = 'none'; };
    if (img.complete && img.naturalWidth === 0) hide();
    else img.addEventListener('error', hide);
  });
})();

// ---- GSAP disponible ? (si le CDN échoue, le site reste utilisable) ----
const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

// ---- Preloader ----
// Le pin/flip du hero (plus bas) ne doit s'initialiser qu'une fois le preloader
// entièrement terminé : sinon ScrollTrigger peut réagencer .hero__img-card
// PENDANT que le morph du preloader mesure sa position, ce qui cassait
// l'animation (image qui finit désynchronisée / pas au bon endroit).
function signalPreloaderDone() {
  window.__preloaderDone = true;
  window.dispatchEvent(new Event('preloaderDone'));
}

(function () {
  const preloader = document.getElementById('preloader');
  if (!preloader) { signalPreloaderDone(); return; }

  // GSAP absent → aucune animation possible, on retire le preloader immédiatement
  if (!hasGsap) {
    preloader.remove();
    document.body.style.overflow = '';
    signalPreloaderDone();
    return;
  }

  // Déjà vu cette session → skip preloader
  if (sessionStorage.getItem('preloaderShown')) {
    preloader.remove();
    document.body.style.overflow = '';
    gsap.set('.hero__img-card', { opacity: 1 });
    signalPreloaderDone();
    return;
  }
  sessionStorage.setItem('preloaderShown', '1');

  const wordL  = preloader.querySelector('.pl__word--left');
  const wordR  = preloader.querySelector('.pl__word--right');
  const imgBox = preloader.querySelector('.pl__images');
  const imgs   = preloader.querySelectorAll('.pl__img');

  document.body.style.overflow = 'hidden';
  gsap.set([wordL, wordR, imgs], { opacity: 0 });
  gsap.set('.hero__img-card', { opacity: 0 });

  const D  = 0.28;   // durée fondu image
  const H  = 0.22;   // temps affiché

  const tl = gsap.timeline();

  // Mots entrent
  tl.to([wordL, wordR], { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.15);

  // Images cycliques
  imgs.forEach((img, i) => {
    const t = 0.5 + i * (D + H);
    tl.to(img, { opacity: 1, duration: D }, t);
    if (i < imgs.length - 1) {
      tl.to(img, { opacity: 0, duration: D }, t + D + H);
    }
    // la dernière reste visible
  });

  const afterImgs = 0.5 + imgs.length * (D + H) + 0.15;

  // Mots sortent en s'écartant
  tl.to(wordL, { x: '-6vw', opacity: 0, duration: 0.5, ease: 'power2.in' }, afterImgs);
  tl.to(wordR, { x:  '6vw', opacity: 0, duration: 0.5, ease: 'power2.in' }, afterImgs);

  // Morph : petit carré → hero image
  tl.add(() => {
    const hero = document.querySelector('.hero__img-card');
    if (!hero) {
      gsap.to(preloader, { opacity: 0, duration: 0.4,
        onComplete: () => {
          preloader.remove();
          document.body.style.overflow = '';
          gsap.to('.hero__img-card', { opacity: 1, duration: 0.3 });
          signalPreloaderDone();
        }
      });
      return;
    }

    const morphTl = gsap.timeline();

    // Étape 1 : le carré grandit un peu sur place (respiration)
    morphTl.to(imgBox, {
      scale: 1.35,
      duration: 0.45,
      ease: 'power2.out'
    });

    // Étape 2 : morph vers le hero (mesure APRÈS le scale intermédiaire)
    morphTl.add(() => {
      const from = imgBox.getBoundingClientRect();
      const to   = hero.getBoundingClientRect();

      // Scale unique (pas de scaleX/scaleY séparés) : avec deux valeurs
      // différentes, le transform CSS étire la photo déjà rendue et déforme
      // ses proportions pendant l'agrandissement. .pl__images et
      // .hero__img-wrap partagent le même ratio (7/13), donc un seul facteur
      // suffit et l'agrandissement reste bien proportionnel.
      // GSAP replace le scale (ne multiplie pas) — compenser le 1.35 intermédiaire
      const scale = (to.width / from.width) * 1.35;
      const dx = (to.left + to.width  / 2) - (from.left + from.width  / 2);
      const dy = (to.top  + to.height / 2) - (from.top  + from.height / 2);

      gsap.to(imgBox, {
        x: dx, y: dy, scale,
        duration: 0.7, ease: 'power2.inOut'
      });

      // Fond blanc disparaît seulement à 70% du morph
      gsap.to(preloader, {
        backgroundColor: 'rgba(255,255,255,0)',
        duration: 0.35, delay: 0.45, ease: 'power1.in',
        onComplete: () => {
          // Swap instantané : les deux carrés se superposent parfaitement ici
          gsap.set('.hero__img-card', { opacity: 1 });
          gsap.set(preloader, { opacity: 0 });
          preloader.remove();
          document.body.style.overflow = '';
          signalPreloaderDone();
        }
      });
    });
  }, afterImgs + 0.45);
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

if (hasGsap) gsap.registerPlugin(ScrollTrigger);

// ---- Défilement doux : géré globalement par assets/smooth-scroll.js ----
// (plus de hijack molette / snap footer ici : le footer se dévoile
//  progressivement en fin de page, au même rythme que le reste du site)

// ---- Logo → retour en haut fluide ----
document.querySelector('.nav__logo')?.addEventListener('click', e => {
  e.preventDefault();
  if (window.smoothScroll) window.smoothScroll.to(0);
  else window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ---- Nav shadow on scroll ----
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ---- Pin + flip 3D de l'image ----
// N'initialise le pin qu'une fois le preloader entièrement terminé (voir
// signalPreloaderDone) : si ScrollTrigger pince/réagence .hero__img-card
// PENDANT que le morph du preloader mesure encore sa position finale, la
// carte finit mal positionnée et la transition saccade. En attendant que le
// preloader ait fini, on garantit que le hero est déjà dans sa position
// naturelle et définitive quand on mesure/active le pin.
function initHeroPin() {
  if (!hasGsap) return;
  // Sur mobile, pas de pin : l'image épinglée chevaucherait les textes
  if (window.matchMedia('(max-width: 768px)').matches) return;
  const pin = document.getElementById('heroImgPin');
  if (!pin) return;

  // Pin le conteneur pendant le scroll
  ScrollTrigger.create({
    trigger: pin,
    start: 'top 180px',
    endTrigger: '.featured',
    end: 'bottom bottom',
    pin: true,
    pinSpacing: false,
    invalidateOnRefresh: true,
  });

  // Flip 3D synchronisé avec le scroll (même plage)
  gsap.to('.hero__img-card', {
    rotateY: -180,
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top 180px',
      endTrigger: '.featured',
      end: 'bottom bottom',
      scrub: 1.5,
    }
  });

  // Fondu de l'image pendant qu'elle chevauche le texte de la section « intro » :
  // visible sur le hero → quasi invisible sur l'intro (texte lisible) → revient
  // sur « featured » (où une colonne centrale lui est réservée). Réversible (scrub).
  gsap.timeline({
    scrollTrigger: {
      trigger: pin,
      start: 'top 180px',
      endTrigger: '.featured',
      end: 'bottom bottom',
      scrub: 1.2,
    }
  })
    .to('.hero__img-card', { autoAlpha: 1,    ease: 'none', duration: 0.14 })
    .to('.hero__img-card', { autoAlpha: 0.04, ease: 'power1.out', duration: 0.13 })
    .to('.hero__img-card', { autoAlpha: 0.04, ease: 'none', duration: 0.40 })
    .to('.hero__img-card', { autoAlpha: 1,    ease: 'power1.in', duration: 0.13 })
    .to('.hero__img-card', { autoAlpha: 1,    ease: 'none', duration: 0.20 });

  // Bug 1er chargement : tant que les polices ne sont pas encore appliquées,
  // le titre et les textes s'affichent avec une police de secours (taille/hauteur
  // différentes), donc la position de .featured mesurée ici est fausse. Les polices
  // swap ensuite sans redéclencher de recalcul, d'où un pin/flip désynchronisé
  // jusqu'au rafraîchissement (où tout est déjà en cache). On recalcule une fois
  // les polices réellement prêtes.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (window.__preloaderDone) {
  initHeroPin();
} else {
  window.addEventListener('preloaderDone', initHeroPin, { once: true });
}

// ---- Fade-in au scroll ----
if (hasGsap) gsap.utils.toArray('.intro__text').forEach(el => {
  gsap.from(el, {
    opacity: 0,
    y: 24,
    duration: 1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 88%',
      toggleActions: 'play none none reverse',
    }
  });
});

// ---- Slide-in textes featured (scrub) ----
if (hasGsap) gsap.from('.featured__left .featured__caption', {
  x: -120,
  ease: 'none',
  scrollTrigger: {
    trigger: '.featured',
    start: 'top 80%',
    end: 'center center',
    scrub: 1.2,
  }
});

if (hasGsap) gsap.from('.featured__right .featured__caption', {
  x: 120,
  ease: 'none',
  scrollTrigger: {
    trigger: '.featured',
    start: 'top 80%',
    end: 'center center',
    scrub: 1.2,
  }
});

// ---- Avis Google (carrousel) ----
// Les données viennent de reviews.json, régénéré par fetch-reviews.js
// (voir AVIS-GOOGLE.md). Repli sur ces vrais avis si le fichier est absent.
let reviews = [
  { author: 'Maurine Bardou', rating: 5, when: 'il y a un mois', text: 'Un immense merci à Laurent Dugos pour avoir immortalisé notre mariage d\'une manière aussi exceptionnelle ! Professionnalisme irréprochable, sympathique et à l\'écoute. Le résultat est tout simplement magnifique.' },
  { author: 'Manon Vaninetti', rating: 5, when: 'il y a un mois', text: 'Un immense merci à Laurent qui a été le super photographe pour notre mariage du 11 juillet 2026. Dès notre rencontre, nous avons apprécié sa gentillesse, sa réactivité et son professionnalisme.' },
  { author: 'Stephanie Barbe', rating: 5, when: 'il y a un mois', text: 'J\'ai fait appel à Laurent pour mon mariage. Très professionnel, à l\'écoute de son client, il prend des photos sur l\'instant sans qu\'on s\'en aperçoive et cela donne un super rendu. Je le recommande.' }
];

let currentIndex = 0;
const nameEl   = document.querySelector('.testimonial__name');
const textEl   = document.querySelector('.testimonial__text');
const starsEl  = document.querySelector('.testimonial__review-stars');
const whenEl   = document.querySelector('.testimonial__when');

const stripQuotes = s => String(s || '').replace(/^["“«\s]+|["”»\s]+$/g, '').trim();
const starString = n => '★'.repeat(Math.max(0, Math.min(5, Math.round(n || 0)))).padEnd(5, '☆');

// ---- Repli des avis longs : tous affichés à la même longueur, « … plus » pour dérouler
const REVIEW_MAX = 280;           // caractères affichés quand l'avis est replié
let reviewExpanded = false;

// Bouton « plus / moins » créé une fois, juste après le texte de l'avis
const moreBtn = document.createElement('button');
moreBtn.type = 'button';
moreBtn.className = 'testimonial__more';
moreBtn.hidden = true;
textEl?.insertAdjacentElement('afterend', moreBtn);
moreBtn.addEventListener('click', () => {
  reviewExpanded = !reviewExpanded;
  renderReviewText(reviews[currentIndex]);
});

function truncateAtWord(str, max) {
  if (str.length <= max) return str;
  let cut = str.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  if (sp > max * 0.6) cut = cut.slice(0, sp);
  return cut.replace(/[\s.,;:!?«»"'-]+$/, '') + '…';
}

function renderReviewText(r) {
  if (!textEl || !r) return;
  const full = stripQuotes(r.text);
  const isLong = full.length > REVIEW_MAX;
  textEl.textContent = (!isLong || reviewExpanded) ? full : truncateAtWord(full, REVIEW_MAX);
  moreBtn.hidden = !isLong;
  moreBtn.textContent = reviewExpanded ? 'voir moins' : 'voir plus';
}

function applyReview(index) {
  const r = reviews[index];
  if (!nameEl || !textEl || !r) return;
  nameEl.textContent = r.author;
  reviewExpanded = false;            // on repart toujours replié en changeant d'avis
  renderReviewText(r);
  if (starsEl) {
    if (r.rating) { starsEl.textContent = starString(r.rating); starsEl.hidden = false; }
    else starsEl.hidden = true;
  }
  if (whenEl) {
    if (r.when) { whenEl.textContent = r.when; whenEl.hidden = false; }
    else whenEl.hidden = true;
  }
}

function updateTestimonial(index) {
  if (!nameEl || !textEl) return;
  if (!hasGsap) { applyReview(index); return; }
  const anim = [nameEl, textEl, moreBtn, starsEl, whenEl].filter(Boolean);
  gsap.to(anim, {
    opacity: 0, y: 10, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      applyReview(index);
      gsap.to(anim, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    }
  });
}

document.querySelector('.testimonial__arrow--prev')?.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + reviews.length) % reviews.length;
  updateTestimonial(currentIndex);
});
document.querySelector('.testimonial__arrow--next')?.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % reviews.length;
  updateTestimonial(currentIndex);
});

// ---- Chargement des vrais avis + résumé (note, nombre, lien "laisser un avis") ----
(async function () {
  try {
    const res = await fetch('reviews.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();

    // Accepte l'ancien format (tableau simple) et le nouveau ({rating,count,url,writeUrl,items})
    const isLegacy = Array.isArray(data);
    const items = (isLegacy ? data : data.items) || [];
    const norm = items
      .map(r => ({
        author: r.author || r.name || 'Client',
        rating: r.rating || null,
        when: r.when || '',
        text: stripQuotes(r.text)
      }))
      .filter(r => r.text.length > 10);

    if (norm.length) { reviews = norm; currentIndex = 0; }

    if (!isLegacy) {
      const summary = document.querySelector('.testimonial__summary');
      const scoreEl = document.querySelector('.testimonial__score');
      const allEl   = document.querySelector('.testimonial__all');
      const bigStar = document.querySelector('.testimonial__stars--lg');
      const ctaEl   = document.querySelector('.testimonial__cta');

      if (data.rating && scoreEl) scoreEl.textContent = Number(data.rating).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      if (data.rating && bigStar) bigStar.textContent = starString(data.rating);
      if (data.count && allEl) {
        allEl.textContent = `${data.count} avis Google`;
        if (data.url) allEl.href = data.url;
      } else if (allEl && data.url) {
        allEl.href = data.url;
      }
      if (ctaEl && (data.writeUrl || data.url)) ctaEl.href = data.writeUrl || data.url;
      if (summary && !data.rating && !data.count) summary.hidden = true;
    }

    applyReview(currentIndex);
  } catch (e) {
    /* garde les exemples si reviews.json est absent ou invalide */
  }
}());

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
