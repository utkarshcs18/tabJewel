(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealPage() {
    document.body.classList.add("page-enter--ready");
  }

  if (prefersReducedMotion) {
    revealPage();
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(revealPage);
    });
  }

  const SPLASH_DURATION_MS = 2000;
  const SPLASH_FADE_MS = 550;
  const BRAND_FLY_MS = 1200;
  const splash = document.getElementById("splash");
  let lenis = null;
  let scrollLoopId = null;
  let onCollectionsScroll = () => {};
  let hashLinksBound = false;

  const siteHeader = document.querySelector(".site-header");
  const NAV_SECTION_IDS = ["hero", "collections", "about", "visit", "contact"];
  let currentNavSection = "";

  const scrollEaseOut = (t) => 1 - Math.pow(1 - t, 5);
  const ANCHOR_SCROLL_DURATION = 1.55;
  const NAV_PROBE_OFFSET = 72;

  function debounce(fn, wait) {
    let timer;
    return (...args) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function getHeaderOffset() {
    return (
      parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h"), 10) || 72
    );
  }

  function getScrollY() {
    return lenis ? lenis.scroll : window.scrollY;
  }

  function unlockBodyScroll() {
    const scrollY = window.scrollY;
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("width");
    document.body.style.removeProperty("left");
    document.body.style.removeProperty("right");
    document.body.style.removeProperty("top");
    if (scrollY) window.scrollTo(0, scrollY);
  }

  let splashFinished = false;
  let splashSafetyId = null;

  function clearTitleFlight() {
    document.querySelector(".brand-fly")?.remove();
    document.querySelector(".logo-slot")?.remove();
    const splashTitle = document.getElementById("splashTitle");
    if (!splashTitle) return;
    splashTitle.style.visibility = "";
    splashTitle.style.cssText = "";
  }

  function finishSplash() {
    if (splashFinished) return;
    splashFinished = true;
    if (splashSafetyId) window.clearTimeout(splashSafetyId);

    clearTitleFlight();
    splash?.setAttribute("aria-hidden", "true");
    splash?.remove();

    document.body.classList.remove("splash-active", "splash-brand-flying");
    document.body.classList.add("splash-done");

    requestAnimationFrame(() => {
      unlockBodyScroll();
      enableSmoothScroll();
      updateNavSection();
      refreshRevealsInView();
    });
  }

  function scrollToSection(selector) {
    const target = document.querySelector(selector);
    if (!target) return;

    const offset = -getHeaderOffset() - 16;

    if (lenis) {
      lenis.start();
      lenis.scrollTo(target, {
        offset,
        duration: ANCHOR_SCROLL_DURATION,
        easing: scrollEaseOut,
      });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion ? "auto" : "smooth" });
    }

    document.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
    document.querySelector(".nav-links")?.classList.remove("is-open");
  }

  function bindHashLinks() {
    if (hashLinksBound || !lenis) return;
    hashLinksBound = true;

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      if (link.hasAttribute("data-go-enquiry")) return;

      link.addEventListener("click", (e) => {
        const hash = link.getAttribute("href");
        if (!hash || hash === "#") return;
        if (!document.querySelector(hash)) return;
        e.preventDefault();
        scrollToSection(hash);
      });
    });
  }

  let lastCollectionsProgress = -1;

  function startScrollLoop() {
    if (scrollLoopId) return;

    const loop = (time) => {
      lenis?.raf(time);
      onCollectionsScroll();
      updateNavSection();
      scrollLoopId = requestAnimationFrame(loop);
    };

    scrollLoopId = requestAnimationFrame(loop);
  }

  function initLenis() {
    if (lenis || prefersReducedMotion || typeof Lenis === "undefined") return;

    lenis = new Lenis({
      lerp: 0.12,
      duration: 1.2,
      easing: scrollEaseOut,
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      infinite: false,
      autoRaf: false,
    });

    lenis.stop();
    startScrollLoop();
    bindHashLinks();
  }

  function initScrollReveals() {
    const revealEls = document.querySelectorAll(".reveal, .reveal-group");

    if (prefersReducedMotion) {
      revealEls.forEach((el) => el.classList.add("is-inview"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-inview");
          entry.target.style.willChange = "auto";
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    revealEls.forEach((el) => observer.observe(el));
    requestAnimationFrame(() => requestAnimationFrame(refreshRevealsInView));
  }

  function refreshRevealsInView() {
    const vh = window.innerHeight;
    document.querySelectorAll(".reveal, .reveal-group").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.94 && rect.bottom > vh * 0.06) {
        el.classList.add("is-inview");
      }
    });
  }

  function enableSmoothScroll() {
    initLenis();
    if (lenis) {
      lenis.start();
      lenis.scrollTo(0, { immediate: true });
    }
    onCollectionsScroll();
    updateNavSection();
  }

  initLenis();

  function pauseSmoothScroll() {
    lenis?.stop();
  }

  function resumeSmoothScroll() {
    if (!document.body.classList.contains("splash-active")) {
      lenis?.start();
    }
  }

  function scheduleSplashSafety() {
    if (splashSafetyId) window.clearTimeout(splashSafetyId);
    splashSafetyId = window.setTimeout(finishSplash, BRAND_FLY_MS + 900);
  }

  function animateBrandToNav() {
    const splashTitle = document.getElementById("splashTitle");
    const navLogo = document.getElementById("navLogo");
    if (!splash || !splashTitle || !navLogo) return false;

    const from = splashTitle.getBoundingClientRect();
    if (from.width < 1 || from.height < 1) return false;

    document.body.classList.remove("splash-active");
    document.body.classList.add("splash-brand-flying");

    const to = navLogo.getBoundingClientRect();
    if (to.width < 1 || to.height < 1) {
      document.body.classList.remove("splash-brand-flying");
      document.body.classList.add("splash-active");
      return false;
    }

    const splashCs = getComputedStyle(splashTitle);

    const slot = document.createElement("span");
    slot.className = "logo-slot";
    slot.setAttribute("aria-hidden", "true");
    slot.style.width = `${to.width}px`;
    slot.style.height = `${to.height}px`;
    navLogo.parentNode.insertBefore(slot, navLogo);

    const fly = document.createElement("div");
    fly.className = "brand-fly";
    fly.setAttribute("aria-hidden", "true");
    fly.innerHTML = splashTitle.innerHTML;
    fly.style.left = `${from.left}px`;
    fly.style.top = `${from.top}px`;
    fly.style.fontSize = splashCs.fontSize;
    fly.style.letterSpacing = splashCs.letterSpacing;
    document.body.appendChild(fly);

    splashTitle.style.visibility = "hidden";
    splash.classList.add("splash--content-exit");

    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const scaleX = to.width / from.width;
    const scaleY = to.height / from.height;

    let finished = false;
    function complete() {
      if (finished) return;
      finished = true;
      finishSplash();
    }

    function runFlight() {
      fly.classList.add("brand-fly--active");
      fly.style.setProperty("--fly-tx", `${dx}px`);
      fly.style.setProperty("--fly-ty", `${dy}px`);
      fly.style.setProperty("--fly-sx", String(scaleX));
      fly.style.setProperty("--fly-sy", String(scaleY));
    }

    fly.addEventListener(
      "transitionend",
      (e) => {
        if (e.target !== fly || e.propertyName !== "transform") return;
        complete();
      },
      { once: false }
    );

    requestAnimationFrame(() => {
      requestAnimationFrame(runFlight);
    });

    window.setTimeout(complete, BRAND_FLY_MS + 150);
    return true;
  }

  function endSplash() {
    if (!splash) {
      finishSplash();
      return;
    }

    scheduleSplashSafety();

    try {
      if (!prefersReducedMotion && animateBrandToNav()) {
        return;
      }
    } catch (err) {
      console.error("Splash animation error:", err);
    }

    splash.classList.add("splash--exit");
    document.body.classList.remove("splash-active");
    window.setTimeout(finishSplash, prefersReducedMotion ? 350 : SPLASH_FADE_MS);
  }

  if (splash) {
    window.setTimeout(endSplash, SPLASH_DURATION_MS);
    window.setTimeout(finishSplash, SPLASH_DURATION_MS + BRAND_FLY_MS + 1200);
  } else {
    finishSplash();
  }

  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", function onErr() {
      if (img.dataset.fallback && img.src !== img.dataset.fallback) {
        img.src = img.dataset.fallback;
      }
      img.removeEventListener("error", onErr);
    });
  });

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function updateNavSection() {
    if (!siteHeader || document.body.classList.contains("splash-active")) return;

    const line = getHeaderOffset() + NAV_PROBE_OFFSET;
    const scrollY = getScrollY();
    let active = "hero";

    if (scrollY >= 48) {
      const visitEl = document.getElementById("visit");
      const aboutEl = document.getElementById("about");
      const contactEl = document.getElementById("contact");
      const visitTop = visitEl?.getBoundingClientRect().top ?? Infinity;
      const aboutTop = aboutEl?.getBoundingClientRect().top ?? Infinity;
      const contactTop = contactEl?.getBoundingClientRect().top ?? Infinity;
      const pinTop = pinSection?.getBoundingClientRect().top ?? Infinity;
      const pastPin = Boolean(pinSection && pinScrollable > 0 && pinTop <= -pinScrollable);

      if (visitTop <= line) {
        active = contactTop <= line ? "contact" : "visit";
      } else if (aboutTop <= line) {
        active = "about";
      } else if (pinSection && pinTop <= line && !pastPin) {
        active = "collections";
      } else if (pastPin) {
        active = "about";
      }
    }

    if (active === currentNavSection) return;
    currentNavSection = active;

    siteHeader.classList.remove(...NAV_SECTION_IDS.map((id) => `nav-at-${id}`));
    siteHeader.classList.add(`nav-at-${active}`);
    siteHeader.dataset.navSection = active;

    const activeLink = active === "contact" ? "visit" : active;
    document.querySelectorAll(".nav-links a").forEach((link) => {
      const href = link.getAttribute("href")?.replace("#", "");
      link.classList.toggle("is-active", href === activeLink);
    });
  }

  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");

  navToggle?.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navLinks?.classList.toggle("is-open", !open);
  });

  navLinks?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle?.setAttribute("aria-expanded", "false");
      navLinks?.classList.remove("is-open");
    });
  });

  const pinSection = document.querySelector(".collections-pin");
  const collectionsViewport = document.querySelector(".collections-viewport");
  const track = document.getElementById("collectionsTrack");
  const progressBar = document.getElementById("collectionsProgress");

  let maxScroll = 0;
  let pinScrollable = 1;
  let collectionsNear = false;

  function measureCollectionsScroll() {
    if (!track || !collectionsViewport) return 0;

    const lastCard = track.querySelector(".collection-card:last-child");
    if (!lastCard) return 0;

    const vpStyle = getComputedStyle(collectionsViewport);
    const padRight = parseFloat(vpStyle.paddingRight) || 0;
    const vpRect = collectionsViewport.getBoundingClientRect();
    const targetRight = vpRect.right - padRight;

    const prevTransform = track.style.transform;
    track.style.transform = "translate3d(0, 0, 0)";
    const scrollNeeded = lastCard.getBoundingClientRect().right - targetRight;
    track.style.transform = prevTransform;

    return Math.max(0, scrollNeeded);
  }

  function updateCollectionsLayout() {
    if (!pinSection || !track) return;

    maxScroll = measureCollectionsScroll();
    const scrollDistance = Math.max(maxScroll, 1);
    pinSection.style.height = `${scrollDistance + window.innerHeight}px`;
    pinScrollable = Math.max(1, pinSection.offsetHeight - window.innerHeight);
    lastCollectionsProgress = -1;
    onCollectionsScroll();
    updateNavSection();
  }

  function applyCollectionsProgress(progress) {
    if (!track) return;
    const x = progress * maxScroll;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
    if (progressBar) {
      progressBar.style.width = `${progress * 100}%`;
    }
  }

  onCollectionsScroll = function onCollectionsScrollHandler() {
    if (!collectionsNear || !pinSection || !track || maxScroll <= 0) return;

    const rect = pinSection.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    let progress = Math.min(1, Math.max(0, -rect.top / pinScrollable));
    if (progress > 0.992) progress = 1;

    const delta = Math.abs(progress - lastCollectionsProgress);
    if (delta < 0.0008 && progress > 0.01 && progress < 0.99) return;
    lastCollectionsProgress = progress;
    applyCollectionsProgress(progress);
  };

  const onResizeLayout = debounce(() => {
    updateCollectionsLayout();
    updateNavSection();
  }, 150);

  window.addEventListener("resize", onResizeLayout);

  if (!lenis) {
    window.addEventListener(
      "scroll",
      () => {
        onCollectionsScroll();
        updateNavSection();
      },
      { passive: true }
    );
  }

  if (pinSection && typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(
      ([entry]) => {
        collectionsNear = entry.isIntersecting;
        if (collectionsNear) onCollectionsScroll();
      },
      { root: null, rootMargin: "120% 0px", threshold: 0 }
    ).observe(pinSection);
  } else {
    collectionsNear = true;
  }

  updateCollectionsLayout();
  updateNavSection();
  initScrollReveals();

  track?.querySelectorAll("img").forEach((img) => {
    if (img.complete) return;
    img.addEventListener("load", onResizeLayout, { once: true });
  });

  if (track && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(onResizeLayout).observe(track);
  }

  window.addEventListener("load", () => {
    updateCollectionsLayout();
    requestAnimationFrame(updateCollectionsLayout);
  });

  if (!splash || document.body.classList.contains("splash-done")) {
    enableSmoothScroll();
  }

  const modal = document.getElementById("collectionModal");
  const modalImg = document.getElementById("modalImg");
  const modalTitle = document.getElementById("modalTitle");
  const modalCat = document.getElementById("modalCat");
  const modalDesc = document.getElementById("modalDesc");

  function openModal(card) {
    const imgSrc = card.dataset.img || card.querySelector("img")?.src || "";
    modalImg.src = imgSrc;
    modalImg.alt = card.dataset.title || "";
    modalTitle.textContent = card.dataset.title || "";
    modalCat.textContent = card.dataset.category || "";
    modalDesc.textContent = card.dataset.desc || "";

    modal.hidden = false;
    document.body.classList.add("modal-open");
    pauseSmoothScroll();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    resumeSmoothScroll();
    modalImg.removeAttribute("src");
  }

  function goToEnquiryForm() {
    closeModal();
    requestAnimationFrame(() => {
      scrollToSection("#contact");
      const focusDelay = prefersReducedMotion ? 0 : ANCHOR_SCROLL_DURATION * 1000 + 250;
      window.setTimeout(() => {
        document.getElementById("name")?.focus({ preventScroll: true });
      }, focusDelay);
    });
  }

  document.querySelector("[data-go-enquiry]")?.addEventListener("click", (e) => {
    e.preventDefault();
    goToEnquiryForm();
  });

  document.querySelectorAll(".collection-card").forEach((card) => {
    card.addEventListener("click", () => openModal(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(card);
      }
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  const EMAILJS_CONFIG = {
    PUBLIC_KEY: "YOUR_PUBLIC_KEY",
    SERVICE_ID: "YOUR_SERVICE_ID",
    TEMPLATE_ID: "YOUR_TEMPLATE_ID",
    TO_EMAIL: "tabjewellers999@gmail.com",
  };

  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  const emailjsReady =
    typeof emailjs !== "undefined" &&
    EMAILJS_CONFIG.PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

  if (emailjsReady) {
    emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
  }

  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!emailjsReady) {
      formStatus.textContent =
        "Email is not configured yet. Add your EmailJS keys in script.js (see comments).";
      formStatus.className = "form-status error";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    formStatus.textContent = "";
    formStatus.className = "form-status";

    const templateParams = {
      from_name: document.getElementById("name").value.trim(),
      reply_to: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      message: document.getElementById("message").value.trim(),
      to_email: EMAILJS_CONFIG.TO_EMAIL,
    };

    try {
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );
      formStatus.textContent = "Thank you! We’ll get back to you soon.";
      formStatus.className = "form-status success";
      contactForm.reset();
    } catch (err) {
      console.error("EmailJS error:", err);
      formStatus.textContent = "Something went wrong. Please call or WhatsApp us directly.";
      formStatus.className = "form-status error";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
    }
  });
})();