(function () {
//   // ── Config ─────────────────────────────────────────────────
  const SLIDE_INTERVAL      = 4000;   // ms between slide transitions
  const IDLE_WARN           = 10000;  // ms of inactivity before warning (15 s)
  const IDLE_WARN_DURATION  = 10000;  // ms warning stays before returning to splash
  const RECEIPT_TIMEOUT     = 10000;  // ms before receipt auto-dismisses (10 s)

  // ── Elements ───────────────────────────────────────────────
  const splash   = document.getElementById("splash-screen");
  const kioskApp = document.getElementById("kiosk-app");
  const carousel = document.getElementById("splash-carousel");
  const dotsWrap = document.getElementById("splash-dots");

  // ── Carousel state ─────────────────────────────────────────
  const slides = Array.from(carousel.querySelectorAll(".splash__slide"));
  let currentSlide = 0;
  let carouselTimer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "splash__dot" + (i === 0 ? " splash__dot--active" : "");
    dot.setAttribute("aria-label", "Slide " + (i + 1));
    dot.addEventListener("click", (e) => { e.stopPropagation(); goToSlide(i); });
    dotsWrap.appendChild(dot);
  });

  function goToSlide(index) {
    slides[currentSlide].classList.remove("splash__slide--active");
    dotsWrap.children[currentSlide].classList.remove("splash__dot--active");
    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add("splash__slide--active");
    dotsWrap.children[currentSlide].classList.add("splash__dot--active");
  }

  function startCarousel() {
    slides[0].classList.add("splash__slide--active");
    dotsWrap.children[0].classList.add("splash__dot--active");
    carouselTimer = setInterval(() => goToSlide(currentSlide + 1), SLIDE_INTERVAL);
  }

  function stopCarousel() {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }

  // ── Show / hide splash ─────────────────────────────────────
  function showSplash() {
    stopIdle();
    hideIdleWarning();
    if (typeof clearCart === "function") clearCart();
    kioskApp.style.display = "none";
    splash.style.display   = "flex";
    splash.classList.remove("splash--exiting");
    slides.forEach(s => s.classList.remove("splash__slide--active"));
    Array.from(dotsWrap.children).forEach(d => d.classList.remove("splash__dot--active"));
    currentSlide = 0;
    startCarousel();
  }

  function hideSplash() {
    stopCarousel();
    hideIdleWarning();
    splash.classList.add("splash--exiting");
    splash.addEventListener("animationend", function onEnd() {
      splash.removeEventListener("animationend", onEnd);
      splash.style.display = "none";
      splash.classList.remove("splash--exiting");
      kioskApp.style.display = "block";
      if (typeof switchTab === "function") switchTab('menu');
      startIdle();
    }, { once: true });
  }

  splash.addEventListener("click", hideSplash);
  dotsWrap.addEventListener("click", e => e.stopPropagation());

  // ── Idle warning banner ────────────────────────────────────
  let idleWarnTimer    = null;
  let idleReturnTimer  = null;
  let idleCountdown    = null;
  let idleSecsLeft     = 0;

  // Create the warning banner element (appended to kiosk-app)
  const warnBanner = document.createElement("div");
  warnBanner.id = "idle-warning";
  warnBanner.innerHTML = `
    <div class="idle-warning__inner">
      <span class="idle-warning__icon">⏱</span>
      <span class="idle-warning__msg">Still there? Returning to start in <strong id="idle-countdown">10</strong>s</span>
      <button class="idle-warning__btn" id="idle-stay-btn">I'm here</button>
    </div>
  `;
  warnBanner.style.display = "none";
  document.body.appendChild(warnBanner);

  document.getElementById("idle-stay-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    hideIdleWarning();
    resetIdle();
  });

  function showIdleWarning() {
    idleSecsLeft = Math.round(IDLE_WARN_DURATION / 1000);
    document.getElementById("idle-countdown").textContent = idleSecsLeft;
    warnBanner.style.display = "flex";
    warnBanner.classList.add("idle-warning--visible");

    idleCountdown = setInterval(() => {
      idleSecsLeft--;
      const el = document.getElementById("idle-countdown");
      if (el) el.textContent = idleSecsLeft;
      if (idleSecsLeft <= 0) {
        clearInterval(idleCountdown);
      }
    }, 1000);

    idleReturnTimer = setTimeout(() => {
      hideIdleWarning();
      showSplash();
    }, IDLE_WARN_DURATION);
  }

  function hideIdleWarning() {
    clearTimeout(idleReturnTimer);
    clearInterval(idleCountdown);
    warnBanner.classList.remove("idle-warning--visible");
    warnBanner.style.display = "none";
  }

  // ── Idle tracking ──────────────────────────────────────────
  let idleTimer = null;

  function resetIdle() {
    clearTimeout(idleWarnTimer);
    clearTimeout(idleReturnTimer);
    clearInterval(idleCountdown);
    hideIdleWarning();
    idleWarnTimer = setTimeout(showIdleWarning, IDLE_WARN);
  }

  function startIdle() {
    const events = ["click", "touchstart", "keydown", "mousemove", "scroll"];
    events.forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();
  }

  function stopIdle() {
    clearTimeout(idleWarnTimer);
    clearTimeout(idleReturnTimer);
    clearInterval(idleCountdown);
    const events = ["click", "touchstart", "keydown", "mousemove", "scroll"];
    events.forEach(ev => document.removeEventListener(ev, resetIdle));
  }

  // ── Receipt auto-return ────────────────────────────────────
  let receiptTimer     = null;
  let receiptCountdown = null;
  let receiptSecsLeft  = 0;

  // Create receipt countdown badge (injected into modal__actions)
  const receiptBadge = document.createElement("div");
  receiptBadge.id = "receipt-countdown-badge";
  receiptBadge.style.display = "none";
  receiptBadge.innerHTML = `Returning to start in <strong id="receipt-secs">10</strong>s`;

  function startReceiptTimer() {
    // Find modal actions and inject badge above the New Order button
    const actions = document.querySelector(".modal__actions");
    if (actions && !actions.contains(receiptBadge)) {
      actions.insertBefore(receiptBadge, actions.firstChild);
    }

    receiptSecsLeft = Math.round(RECEIPT_TIMEOUT / 1000);
    document.getElementById("receipt-secs").textContent = receiptSecsLeft;
    receiptBadge.style.display = "block";

    receiptCountdown = setInterval(() => {
      receiptSecsLeft--;
      const el = document.getElementById("receipt-secs");
      if (el) el.textContent = receiptSecsLeft;
      if (receiptSecsLeft <= 0) clearInterval(receiptCountdown);
    }, 1000);

    receiptTimer = setTimeout(() => {
      stopReceiptTimer();
      // Close receipt modal and return to splash
      const modal = document.getElementById("receipt-modal");
      if (modal) modal.style.display = "none";
      // Run clearCart if available
      if (typeof clearCart === "function") clearCart();
      showSplash();
    }, RECEIPT_TIMEOUT);
  }

  function stopReceiptTimer() {
    clearTimeout(receiptTimer);
    clearInterval(receiptCountdown);
    receiptBadge.style.display = "none";
  }

  // Expose so app.js can call them
  window.startReceiptTimer = startReceiptTimer;
  window.stopReceiptTimer  = stopReceiptTimer;

  // ── Boot ───────────────────────────────────────────────────
  showSplash();

})();