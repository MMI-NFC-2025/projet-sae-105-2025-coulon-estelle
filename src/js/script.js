// Toggle navigation menu open/close on all pages
document.addEventListener('DOMContentLoaded', function () {
	const toggles = document.querySelectorAll('.header__menu-toggle');

	toggles.forEach((menuToggle) => {
		const targetId = menuToggle.getAttribute('aria-controls') || 'main-nav';
		const nav = document.getElementById(targetId);

		if (!nav) {
			return;
		}

		menuToggle.addEventListener('click', function () {
			const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
			const nextState = !isOpen;

			menuToggle.setAttribute('aria-expanded', String(nextState));
			nav.classList.toggle('is-open', nextState);
		});

		nav.addEventListener('click', function (event) {
			if (event.target.closest('a')) {
				menuToggle.setAttribute('aria-expanded', 'false');
				nav.classList.remove('is-open');
			}
		});
	});
});


/* =========================
   CAROUSEL "drag-to-slide" (aucun mouvement si on ne glisse pas)
   - Transforme .cards__films en carousel horizontal
   - Drag souris (click + glisser) + touch
   - Pas d'autoplay, pas de déplacement automatique
   ========================= */

(() => {
  function setupCardsCarousel(section) {
    if (!section) return;

    // Récupère les cards (articles)
    const cards = Array.from(section.querySelectorAll(".cards__films__item"));
    if (!cards.length) return;

    // Empêche double init
    if (section.dataset.carouselInit === "1") return;
    section.dataset.carouselInit = "1";

    // Garde le titre (H2) en place
    const title = section.querySelector(".cards__films__title");

    // Crée un viewport + track
    const viewport = document.createElement("div");
    viewport.className = "cards-carousel__viewport";

    const track = document.createElement("div");
    track.className = "cards-carousel__track";

    // Injecte structure dans le DOM
    // (on déplace les articles dans le track)
    cards.forEach(card => track.appendChild(card));
    viewport.appendChild(track);

    // Nettoie le section et reconstruit : titre + viewport
    // (on conserve le titre s'il existe)
    section.innerHTML = "";
    if (title) section.appendChild(title);
    section.appendChild(viewport);

    /* ---------- Styles inline (pour que ça marche sans rajouter de CSS) ---------- */
    // Le container ne doit plus être en grid (sinon ça casse l'horizontal)
    section.style.display = "block";
    section.style.gap = "0";

    viewport.style.overflow = "hidden";
    viewport.style.position = "relative";
    viewport.style.touchAction = "pan-y"; // autorise scroll vertical page, drag horizontal géré par JS
    viewport.style.userSelect = "none";

    track.style.display = "flex";
    track.style.gap = "18px";
    track.style.willChange = "transform";
    track.style.padding = "0";
    track.style.margin = "0";
    track.style.scrollBehavior = "auto";

    // Largeur des cartes (responsive)
    const applyCardWidths = () => {
      const w = viewport.clientWidth;

      // 1 carte visible sur mobile, 2 sur desktop (approx comme un carousel)
      const isDesktop = window.matchMedia("(min-width: 900px)").matches;
      const cardWidth = isDesktop ? Math.floor((w - 18) / 2) : Math.floor(w * 0.86);

      cards.forEach(c => {
        c.style.flex = `0 0 ${cardWidth}px`;
      });

      // Alignement agréable (un peu de "marge" à gauche/droite)
      const sidePadding = isDesktop ? 0 : Math.max(0, Math.floor((w - cardWidth) / 2));
      track.style.paddingLeft = `${sidePadding}px`;
      track.style.paddingRight = `${sidePadding}px`;
    };

    applyCardWidths();
    window.addEventListener("resize", applyCardWidths, { passive: true });

    /* ---------- Drag (souris + touch via Pointer Events) ---------- */
    let isDown = false;
    let startX = 0;
    let startTranslate = 0;
    let currentTranslate = 0;

    const getTranslateX = () => {
      const m = track.style.transform.match(/translate3d\(([-\d.]+)px/);
      return m ? parseFloat(m[1]) : 0;
    };

    const setTranslateX = (x) => {
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

    const bounds = () => {
      const viewportW = viewport.clientWidth;
      const trackW = track.scrollWidth; // total contenu
      // TranslateX est négatif quand on va vers la droite
      const minX = Math.min(0, viewportW - trackW); // limite à gauche (négatif)
      const maxX = 0; // limite à droite (début)
      return { minX, maxX };
    };

    const snapToNearest = () => {
      // Snap sur la carte la plus proche (sans bouger si on a à peine glissé)
      const { minX, maxX } = bounds();
      const x = clamp(getTranslateX(), minX, maxX);

      // Trouve la carte la plus proche du centre
      const viewportCenter = viewport.clientWidth / 2;
      let bestX = x;
      let bestDist = Infinity;

      const padLeft = parseFloat(track.style.paddingLeft || "0");

      cards.forEach((card) => {
        const cardLeft = card.offsetLeft + x + padLeft; // position visuelle
        const cardCenter = cardLeft + card.offsetWidth / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          // translate nécessaire pour centrer cette carte
          bestX = x + (viewportCenter - cardCenter);
        }
      });

      const snapped = clamp(bestX, minX, maxX);
      track.style.transition = "transform 220ms ease";
      setTranslateX(snapped);
      requestAnimationFrame(() => {
        // retire transition après animation
        setTimeout(() => (track.style.transition = "none"), 230);
      });
    };

    const onPointerDown = (e) => {
      // seulement click principal souris, sinon ignore
      if (e.pointerType === "mouse" && e.button !== 0) return;

      isDown = true;
      viewport.setPointerCapture?.(e.pointerId);

      track.style.transition = "none";
      startX = e.clientX;
      startTranslate = getTranslateX();
      currentTranslate = startTranslate;

      // pour éviter le drag d'images/texte
      viewport.classList.add("is-dragging");
    };

    const onPointerMove = (e) => {
      if (!isDown) return;

      const dx = e.clientX - startX;

      // On ne bouge pas si micro mouvement (évite jitter au click)
      const deadZone = 4;
      if (Math.abs(dx) < deadZone) return;

      const { minX, maxX } = bounds();

      // Sens naturel : glisser vers la gauche => on avance dans les cartes (translate négatif)
      currentTranslate = clamp(startTranslate + dx, minX, maxX);
      setTranslateX(currentTranslate);

      // Empêche sélection / scroll horizontal natif
      e.preventDefault?.();
    };

    const onPointerUp = () => {
      if (!isDown) return;
      isDown = false;
      viewport.classList.remove("is-dragging");
      snapToNearest();
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Empêche le drag natif des images (sinon ça “attrape” l’image)
    cards.forEach(card => {
      card.querySelectorAll("img").forEach(img => {
        img.setAttribute("draggable", "false");
      });
    });

    // Position initiale
    setTranslateX(0);
    track.style.transition = "none";
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupCardsCarousel(document.querySelector(".cards__films"));
  });
})();


document.addEventListener("DOMContentLoaded", () => {
  const video = document.querySelector(".media__video");
  if (!video) return;

  // Boucle
  video.loop = true;

  // Pour maximiser les chances d’autoplay sur mobile/desktop
  video.muted = true;            // souvent obligatoire pour autoplay
  video.playsInline = true;      // iOS
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");

  // Essaie de lancer automatiquement (si bloqué, pas grave)
  const tryPlay = () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  // Lance dès que possible
  if (video.readyState >= 2) tryPlay();
  else video.addEventListener("canplay", tryPlay, { once: true });

  // Si certains navigateurs stoppent à la fin malgré loop (rare), on force
  video.addEventListener("ended", () => {
    video.currentTime = 0;
    tryPlay();
  });
});