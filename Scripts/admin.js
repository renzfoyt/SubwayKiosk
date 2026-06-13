// ============================================================
//  admin.js — Inventory Admin Panel with Login Gate
//  Load AFTER db.js and app.js.
// ============================================================

(function () {

  // ── Credentials ───────────────────────────────────────────
  const ADMIN_USERS = [
    { username: "admin",   password: "sub123" },
    { username: "mngr", password: "sub123" },
    { username: "1", password: "1" },
  ];

  const SESSION_KEY  = "subway_admin_session";
  const IDLE_TIMEOUT = 15000;
  const IDLE_WARN_AT = 10000;

  // ── Session helpers ───────────────────────────────────────
  // Always clear on load — a page reload must require re-login
  sessionStorage.removeItem(SESSION_KEY);

  function isLoggedIn() { return sessionStorage.getItem(SESSION_KEY) === "1"; }
  function login(u, p)  { return ADMIN_USERS.some(x => x.username === u && x.password === p); }
  function logout()     { sessionStorage.removeItem(SESSION_KEY); }

  // ── Idle timer state ──────────────────────────────────────
  let _idleTimer, _warnTimer, _countdownTimer, _countdownSecs = 5;

  function resetIdleTimer() {
    clearTimeout(_idleTimer); clearTimeout(_warnTimer); clearInterval(_countdownTimer);
    hideIdleWarning();
    _warnTimer = setTimeout(() => {
      _countdownSecs = Math.round((IDLE_TIMEOUT - IDLE_WARN_AT) / 1000);
      showIdleWarning(_countdownSecs);
      _countdownTimer = setInterval(() => {
        _countdownSecs--;
        updateIdleCountdown(_countdownSecs);
        if (_countdownSecs <= 0) clearInterval(_countdownTimer);
      }, 1000);
    }, IDLE_WARN_AT);
    _idleTimer = setTimeout(() => {
      clearInterval(_countdownTimer); hideIdleWarning(); forceLogout();
    }, IDLE_TIMEOUT);
  }

  function stopIdleTimer() {
    clearTimeout(_idleTimer); clearTimeout(_warnTimer); clearInterval(_countdownTimer);
    hideIdleWarning(); _idleTimer = _warnTimer = null;
  }

  function showIdleWarning(secs) {
    let w = document.getElementById("admin-idle-warning");
    if (!w) {
      w = document.createElement("div");
      w.id = "admin-idle-warning"; w.className = "admin-idle-warning";
      w.innerHTML = `
        <span class="admin-idle-warning__icon">⏱</span>
        <span class="admin-idle-warning__msg">
          Signing out in <strong id="admin-idle-countdown">${secs}s</strong> due to inactivity.
        </span>
        <button class="admin-idle-warning__btn" id="admin-idle-stay">Stay signed in</button>
      `;
      document.getElementById("admin-panel-inner").appendChild(w);
      requestAnimationFrame(() => w.classList.add("admin-idle-warning--visible"));
      document.getElementById("admin-idle-stay").addEventListener("click", resetIdleTimer);
    }
  }

  function updateIdleCountdown(secs) {
    const el = document.getElementById("admin-idle-countdown");
    if (el) el.textContent = secs + "s";
  }

  function hideIdleWarning() {
    const w = document.getElementById("admin-idle-warning");
    if (w) w.remove();
  }

  function forceLogout() {
    stopIdleTimer();
    logout();
    document.getElementById("admin-panel-view").style.display = "none";
    document.getElementById("admin-login-view").style.display = "none";
    dismissInlineConfirm();
    dismissSignOutConfirm();
    setTimeout(() => modalEl.classList.remove("open"), 80);
  }

  // ── Inject admin button ───────────────────────────────────
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "admin-toggle-btn";
  toggleBtn.textContent = "⚙ Admin";
  toggleBtn.style.opacity = "0";
  toggleBtn.style.pointerEvents = "none";
  document.body.appendChild(toggleBtn);

  const kioskApp = document.getElementById("kiosk-app");
  const _obs = new MutationObserver(() => {
    if (kioskApp.style.display !== "none" && kioskApp.style.display !== "") {
      toggleBtn.classList.add("admin-btn--visible");
      toggleBtn.style.pointerEvents = "";
      _obs.disconnect();
    }
  });
  _obs.observe(kioskApp, { attributes: true, attributeFilter: ["style"] });

  // ── Inject modal shell ────────────────────────────────────
  const modalEl = document.createElement("div");
  modalEl.id = "admin-modal";
  modalEl.innerHTML = `
    <div class="admin-panel" id="admin-panel-inner">

      <!-- LOGIN VIEW -->
      <div id="admin-login-view" style="display:none;">
        <div class="admin-login__header">
          <div class="admin-login__logo">⚙</div>
          <h2 class="admin-login__title">Admin Login</h2>
          <p class="admin-login__sub">Sign in to access inventory &amp; sales</p>
        </div>
        <div class="admin-login__form">

          <div class="admin-login__field">
            <label class="admin-login__label" for="admin-username">Username</label>
            <input class="admin-login__input" id="admin-username" type="text"
              placeholder="Tap field, then use keyboard" autocomplete="off" readonly />
          </div>

          <div class="admin-login__field">
            <label class="admin-login__label" for="admin-password">Password</label>
            <div class="admin-login__pw-wrap">
              <input class="admin-login__input" id="admin-password" type="password"
                placeholder="Tap field, then use keyboard" autocomplete="off" readonly />
              <button class="admin-login__eye" id="admin-pw-toggle" type="button" tabindex="-1">👁</button>
            </div>
          </div>

          <!-- ON-SCREEN KEYBOARD -->
          <div id="osk-container" style="
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 10px 8px 8px;
            margin-top: 4px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            user-select: none;
          ">
            <div style="font-size:0.68rem;color:#666;text-align:center;margin-bottom:2px;" id="osk-field-label">
              Typing into: <strong style="color:#008D43;">Username</strong>
            </div>
            <div id="osk-row1" style="display:flex;gap:4px;justify-content:center;"></div>
            <div id="osk-row2" style="display:flex;gap:4px;justify-content:center;"></div>
            <div id="osk-row3" style="display:flex;gap:4px;justify-content:center;"></div>
            <div id="osk-row4" style="display:flex;gap:4px;justify-content:center;"></div>
          </div>

          <div class="admin-login__error" id="admin-login-error" style="display:none;">
            ⚠ Incorrect username or password.
          </div>
          <button class="admin-login__btn" id="admin-login-btn">Sign In</button>
          <button class="admin-login__cancel" id="admin-login-cancel">Cancel</button>
        </div>
      </div>

      <!-- PANEL VIEW -->
      <div id="admin-panel-view" style="display:none;">
        <div class="admin-panel__header">
          <span class="admin-panel__title">📦 Inventory &amp; Sales</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="admin-logout-btn" id="admin-logout-btn">Sign Out</button>
            <button class="admin-panel__close" id="admin-close-btn">✕</button>
          </div>
        </div>
        <div class="admin-panel__body" id="admin-panel-body"></div>
      </div>

    </div>
  `;
  document.body.appendChild(modalEl);

  // ── On-Screen Keyboard ────────────────────────────────────
  const OSK = (() => {
    // Which input is currently targeted
    let _target = null; // 'username' | 'password'
    let _caps   = false;
    let _sym    = false;

    const ROWS_ALPHA = [
      ["1","2","3","4","5","6","7","8","9","0"],
      ["q","w","e","r","t","y","u","i","o","p"],
      ["CAPS","a","s","d","f","g","h","j","k","l","⌫"],
      ["SYM","z","x","c","v","b","n","m","-","_","⏎"],
    ];
    const ROWS_SYM = [
      ["!","@","#","$","%","^","&","*","(",")"],
      ["~","`","=","+","[","]","{","}","\\","|"],
      ["CAPS",";",":","'",'"',"<",">",",",".","/","⌫"],
      ["ABC","?","!","@","#","$","%","&","-","_","⏎"],
    ];
    const SPACE_ROW = 3; // 0-indexed row index that gets the spacebar

    // Map target id → display name
    const LABELS = { username: "Username", password: "Password" };

    function _getInput(target) {
      return document.getElementById("admin-" + target);
    }

    function _getValue() {
      return _getInput(_target)?.dataset?.oskValue || "";
    }

    function _setValue(v) {
      const inp = _getInput(_target);
      if (!inp) return;
      inp.dataset.oskValue = v;
      if (inp.type === "password") {
        inp.value = "•".repeat(v.length);
      } else {
        inp.value = v;
      }
    }

    function _handleKey(k) {
      if (k === "CAPS") { _caps = !_caps; render(); return; }
      if (k === "SYM")  { _sym = true;  render(); return; }
      if (k === "ABC")  { _sym = false; render(); return; }
      if (k === "⌫")   { _setValue(_getValue().slice(0, -1)); return; }
      if (k === "⏎")   { return; } // could trigger login if desired

      const ch = (!_sym && _caps) ? k.toUpperCase() : k;
      _setValue(_getValue() + ch);

      // Auto-release caps after one letter
      if (_caps && !_sym && k.length === 1 && /[a-z]/.test(k)) {
        _caps = false; render();
      }
    }

    function _makeKey(label, extraStyle, onClick) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        height: 36px;
        min-width: 28px;
        padding: 0 5px;
        font-size: 13px;
        font-weight: 500;
        font-family: 'Inter', sans-serif;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        color: #111;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        transition: background 0.1s;
        ${extraStyle || ""}
      `;
      btn.addEventListener("mousedown", (e) => e.preventDefault()); // don't blur the input
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseover", () => btn.style.background = "#f9fafb");
      btn.addEventListener("mouseout",  () => {
        // restore original bg
        if (extraStyle && extraStyle.includes("background")) {
          // leave as-is; the extraStyle sets a coloured bg
        } else {
          btn.style.background = "#ffffff";
        }
      });
      return btn;
    }

    function render() {
      const rows = _sym ? ROWS_SYM : ROWS_ALPHA;
      const fieldLabel = document.getElementById("osk-field-label");
      if (fieldLabel && _target) {
        fieldLabel.innerHTML = `Typing into: <strong style="color:#008D43;">${LABELS[_target]}</strong>`;
      }

      rows.forEach((keys, ri) => {
        const rowEl = document.getElementById("osk-row" + (ri + 1));
        if (!rowEl) return;
        rowEl.innerHTML = "";

        // Space bar row: inject spacebar before last key
        const insertSpaceAt = (ri === SPACE_ROW) ? keys.length - 1 : null;

        keys.forEach((k, ki) => {
          if (ki === insertSpaceAt) {
            // Spacebar
            const sp = _makeKey("space", `
              flex: 3;
              font-size: 11px;
              color: #555;
            `, () => { _setValue(_getValue() + " "); });
            rowEl.appendChild(sp);
          }

          let extra = "";
          let display = k;

          if (k === "CAPS") {
            extra = `
              flex: 1.4;
              font-size: 11px;
              ${_caps ? "background:#dbeafe;color:#1e40af;border-color:#93c5fd;" : "color:#555;"}
            `;
          } else if (k === "SYM" || k === "ABC") {
            extra = "flex: 1.4; font-size: 11px; color: #555;";
          } else if (k === "⌫") {
            extra = "flex: 1.4; background: #fee2e2; color: #991b1b; border-color: #fca5a5; font-size: 14px;";
          } else if (k === "⏎") {
            extra = "flex: 1.8; background: #d1fae5; color: #065f46; border-color: #6ee7b7; font-size: 11px;";
            display = "enter";
          } else if (!_sym && _caps && /^[a-z]$/.test(k)) {
            display = k.toUpperCase();
          }

          const btn = _makeKey(display, extra, () => _handleKey(k));
          rowEl.appendChild(btn);
        });
      });
    }

    function setTarget(target) {
      _target = target;
      render();
    }

    // Clear stored values
    function reset() {
      _target = "username";
      _caps = false;
      _sym = false;
      ["username", "password"].forEach(id => {
        const inp = document.getElementById("admin-" + id);
        if (inp) { inp.dataset.oskValue = ""; inp.value = ""; }
      });
      render();
    }

    return { setTarget, reset, render };
  })();

  // ── Wire OSK to inputs ─────────────────────────────────────
  // We delay wiring until modal exists in DOM
  function wireOSK() {
    const uInput = document.getElementById("admin-username");
    const pInput = document.getElementById("admin-password");
    if (!uInput || !pInput) return;

    // Focus-like clicks (inputs are readonly, so we use click)
    uInput.addEventListener("click", () => {
      uInput.style.borderColor = "#008D43";
      pInput.style.borderColor = "";
      OSK.setTarget("username");
    });
    pInput.addEventListener("click", () => {
      pInput.style.borderColor = "#008D43";
      uInput.style.borderColor = "";
      OSK.setTarget("password");
    });

    // Render initial keyboard
    OSK.setTarget("username");
  }

  // Wire after modalEl is in the DOM
  document.body.appendChild(modalEl);
  wireOSK();

  // ── View switchers ────────────────────────────────────────
  function showLogin() {
    stopIdleTimer();
    document.getElementById("admin-login-view").style.display  = "block";
    document.getElementById("admin-panel-view").style.display  = "none";
    document.getElementById("admin-login-error").style.display = "none";
    OSK.reset();
    // Highlight username field
    const u = document.getElementById("admin-username");
    if (u) { u.style.borderColor = "#008D43"; }
    setTimeout(() => OSK.setTarget("username"), 50);
  }

  function showPanel() {
    document.getElementById("admin-login-view").style.display = "none";
    document.getElementById("admin-panel-view").style.display = "block";
    renderAdminPanel();
    resetIdleTimer();
  }

  // ── Idle reset on panel interaction ───────────────────────
  const panelInner = document.getElementById("admin-panel-inner");
  panelInner.addEventListener("mousemove", () => { if (isLoggedIn()) resetIdleTimer(); });
  panelInner.addEventListener("click",     () => { if (isLoggedIn()) resetIdleTimer(); });
  panelInner.addEventListener("keydown",   () => { if (isLoggedIn()) resetIdleTimer(); });

  // ── Open modal ────────────────────────────────────────────
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    modalEl.classList.add("open");
    if (isLoggedIn()) showPanel();
    else showLogin();
  });

  // ── Sign-out confirm ──────────────────────────────────────
  function showSignOutConfirm(onYes, onNo) {
    dismissSignOutConfirm();
    const el = document.createElement("div");
    el.id = "admin-signout-confirm"; el.className = "admin-signout-confirm";
    el.innerHTML = `
      <div class="admin-signout-confirm__inner">
        <p class="admin-signout-confirm__msg">Sign out of the admin panel?</p>
        <div class="admin-signout-confirm__btns">
          <button class="admin-signout-confirm__yes">Yes, sign out</button>
          <button class="admin-signout-confirm__no">Stay</button>
        </div>
      </div>
    `;
    modalEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add("admin-signout-confirm--visible"));
    el.querySelector(".admin-signout-confirm__yes").addEventListener("click", () => { dismissSignOutConfirm(); onYes(); });
    el.querySelector(".admin-signout-confirm__no").addEventListener("click",  () => { dismissSignOutConfirm(); if (onNo) onNo(); });
  }

  function dismissSignOutConfirm() {
    const el = document.getElementById("admin-signout-confirm");
    if (el) el.remove();
  }

  function handleCloseAttempt() {
    if (isLoggedIn()) {
      stopIdleTimer();
      showSignOutConfirm(() => forceLogout(), () => resetIdleTimer());
    } else {
      modalEl.classList.remove("open");
    }
  }

  document.getElementById("admin-close-btn").addEventListener("click", handleCloseAttempt);
  document.getElementById("admin-login-cancel").addEventListener("click", () => modalEl.classList.remove("open"));
  modalEl.addEventListener("click", (e) => { if (e.target === modalEl) handleCloseAttempt(); });

  // ── Login logic (reads from OSK values via dataset) ───────
  document.getElementById("admin-login-btn").addEventListener("click", attemptLogin);

  function attemptLogin() {
    const uInp = document.getElementById("admin-username");
    const pInp = document.getElementById("admin-password");
    const username = (uInp.dataset.oskValue || "").trim();
    const password = (pInp.dataset.oskValue || "");
    const errorEl  = document.getElementById("admin-login-error");

    if (login(username, password)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      errorEl.style.display = "none";
      showPanel();
    } else {
      errorEl.style.display = "flex";
      // Clear password field
      pInp.dataset.oskValue = "";
      pInp.value = "";
      OSK.setTarget("password");
      const form = document.querySelector(".admin-login__form");
      form.classList.remove("admin-login--shake");
      void form.offsetWidth;
      form.classList.add("admin-login--shake");
    }
  }

  // ── Password visibility toggle ────────────────────────────
  document.getElementById("admin-pw-toggle").addEventListener("click", () => {
    const input = document.getElementById("admin-password");
    const btn   = document.getElementById("admin-pw-toggle");
    const val   = input.dataset.oskValue || "";
    if (input.type === "password") {
      input.type = "text";
      input.value = val;
      btn.textContent = "🙈";
    } else {
      input.type = "password";
      input.value = "•".repeat(val.length);
      btn.textContent = "👁";
    }
  });

  // ── Explicit Sign Out ─────────────────────────────────────
  document.getElementById("admin-logout-btn").addEventListener("click", () => {
    stopIdleTimer();
    showSignOutConfirm(() => forceLogout(), () => resetIdleTimer());
  });

  // ── Inline confirm banner ─────────────────────────────────
  function showInlineConfirm(containerId, { type = "warning", message, confirmLabel, onConfirm }) {
    dismissInlineConfirm();
    const banner = document.createElement("div");
    banner.id = "admin-inline-confirm";
    banner.className = `admin-confirm admin-confirm--${type}`;
    banner.innerHTML = `
      <div class="admin-confirm__msg">
        <span class="admin-confirm__icon">${type === "danger" ? "⚠️" : "ℹ️"}</span>
        <span>${message}</span>
      </div>
      <div class="admin-confirm__btns">
        <button class="admin-confirm__yes">${confirmLabel}</button>
        <button class="admin-confirm__no">Cancel</button>
      </div>
    `;
    const container = document.getElementById(containerId);
    const actionsEl = container.querySelector(".admin-actions");
    if (actionsEl) container.insertBefore(banner, actionsEl);
    else container.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add("admin-confirm--visible"));
    banner.querySelector(".admin-confirm__yes").addEventListener("click", () => { dismissInlineConfirm(); onConfirm(); });
    banner.querySelector(".admin-confirm__no").addEventListener("click", dismissInlineConfirm);
  }

  function dismissInlineConfirm() {
    const el = document.getElementById("admin-inline-confirm");
    if (el) el.remove();
  }

  // ── Render panel ──────────────────────────────────────────
  function renderAdminPanel() {
    const body       = document.getElementById("admin-panel-body");
    const allStock   = DB.getAllStock();
    const allSales   = DB.getAllSales();
    const allCustom  = DB.getAllCustom();
    const bestIds    = DB.getBestSellerIds();

    // Only count regular (non-custom) products for stock overview
    const regularProducts = PRODUCTS.filter(p => p.category !== "Custom");

    const totalUnits   = Object.values(allStock).reduce((a, b) => a + b, 0);
    const totalSold    = Object.values(allSales).reduce((a, b) => a + b, 0);
    const soldOutCount = regularProducts.filter(p => (allStock[p.id] ?? 0) <= 0).length;

    const bestNames = bestIds.map(id => PRODUCTS.find(p => p.id === id)?.name ?? id).join(", ") || "—";

    // Regular products table
    const rowsHTML = regularProducts.map(p => {
      const stock  = allStock[p.id] ?? 0;
      const sold   = allSales[p.id] ?? 0;
      const isBest = bestIds.includes(p.id);
      const isOut  = stock <= 0;
      const isLow  = !isOut && stock <= 5;

      let badges = "";
      if (isBest) badges += `<span class="admin-table__badge badge--best">🏆 Best</span>`;
      if (isOut)  badges += `<span class="admin-table__badge badge--out">Sold Out</span>`;
      else if (isLow) badges += `<span class="admin-table__badge badge--low">Low</span>`;

      return `
        <tr data-id="${p.id}">
          <td>
            <strong>${p.name}</strong>${badges}<br>
            <span style="color:#999;font-size:0.68rem;">${p.id} · ${p.category}</span>
          </td>
          <td style="font-family:'JetBrains Mono',monospace;text-align:center;color:${isOut ? '#dc2626' : isLow ? '#b45309' : '#16a34a'};font-weight:700;">${stock}</td>
          <td style="font-family:'JetBrains Mono',monospace;text-align:center;">${sold}</td>
          <td style="white-space:nowrap;">
            <input class="restock-input" type="number" min="1" max="999" value="10" id="ri-${p.id}" />
            <button class="restock-btn" data-id="${p.id}">+Add</button>
          </td>
        </tr>
      `;
    }).join("");

    // Custom orders table (persisted across reloads)
    const customEntries = Object.values(allCustom);
    const customRowsHTML = customEntries.length > 0
      ? customEntries.map(c => `
          <tr>
            <td>
              <strong>${c.name}</strong>
              <span style="margin-left:4px;background:#e0f2fe;color:#0369a1;border-radius:4px;padding:1px 6px;font-size:0.65rem;font-weight:700;">Custom</span><br>
              <span style="color:#999;font-size:0.68rem;">${c.id}</span>
            </td>
            <td style="font-family:'JetBrains Mono',monospace;text-align:center;color:#0369a1;font-weight:700;">∞</td>
            <td style="font-family:'JetBrains Mono',monospace;text-align:center;">${c.qtySold ?? 0}</td>
            <td style="text-align:center;color:#aaa;font-size:0.75rem;">—</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4" style="text-align:center;color:#aaa;padding:14px 0;font-size:0.8rem;">No custom orders yet.</td></tr>`;

    body.innerHTML = `
      <div>
        <div class="admin-section-title">Overview</div>
        <div class="admin-summary">
          <div class="admin-summary-card">
            <span class="admin-summary-card__val">${totalUnits}</span>
            <span class="admin-summary-card__label">Units in Stock</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-card__val">${totalSold}</span>
            <span class="admin-summary-card__label">Total Sold</span>
          </div>
          <div class="admin-summary-card">
            <span class="admin-summary-card__val" style="color:${soldOutCount > 0 ? '#dc2626' : '#008D43'}">${soldOutCount}</span>
            <span class="admin-summary-card__label">Sold Out Items</span>
          </div>

          <div class="admin-summary-card">
  <span class="admin-summary-card__val">₱${
    Object.entries(allSales)
      .reduce((sum, [id, qty]) => {
        const p = PRODUCTS.find(x => x.id === id);
        return sum + (p ? p.price * qty : 0);
      }, 0)
      .toFixed(2)
  }</span>
  <span class="admin-summary-card__label">Total Revenue</span>
</div>
        </div>
        


        ${bestIds.length > 0 ? `
          <div style="margin-top:10px;background:#fffbea;border:1px solid #FDBA12;border-radius:8px;padding:8px 12px;font-size:0.8rem;">
            🏆 <strong>Best Seller:</strong> ${bestNames}
          </div>` : ""}
      </div>

      <div>
        <div class="admin-section-title">Stock &amp; Sales</div>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center;">Stock</th>
              <th style="text-align:center;">Sold</th>
              <th>Restock</th>
            </tr>
          </thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>

      <div>
        <div class="admin-section-title" style="color:#0369a1;">🥪 Custom Orders</div>
        <p style="font-size:0.75rem;color:#64748b;margin:0 0 8px 0;">Built-your-own sandwiches — unlimited stock, sales tracked permanently.</p>
        <table class="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align:center;">Stock</th>
              <th style="text-align:center;">Sold</th>
              <th style="text-align:center;">Restock</th>
            </tr>
          </thead>
          <tbody>${customRowsHTML}</tbody>
        </table>
      </div>

      <div class="admin-actions">
        <button class="admin-action-btn admin-action-btn--green" id="admin-restock-all">↺ Restock All</button>
        <button class="admin-action-btn admin-action-btn--yellow" id="admin-reset-sales">🗑 Reset Sales</button>
        <button class="admin-action-btn admin-action-btn--red" id="admin-hard-reset">⚠ Hard Reset</button>
      </div>
    `;

    body.querySelectorAll(".restock-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id  = btn.dataset.id;
        const qty = parseInt(document.getElementById(`ri-${id}`).value) || 0;
        if (qty <= 0) return;
        DB.restock(id, qty);
        renderAdminPanel();
        if (typeof renderMenu === "function") renderMenu();
      });
    });

    document.getElementById("admin-restock-all").addEventListener("click", () => {
      showInlineConfirm("admin-panel-body", {
        type: "warning",
        message: "Restock all items to their default levels?",
        confirmLabel: "Yes, restock all",
        onConfirm: () => { DB.restockAll(); renderAdminPanel(); if (typeof renderMenu === "function") renderMenu(); },
      });
    });

    document.getElementById("admin-reset-sales").addEventListener("click", () => {
      showInlineConfirm("admin-panel-body", {
        type: "warning",
        message: "Reset all sales counters? The Best Seller badge will be cleared.",
        confirmLabel: "Yes, reset sales",
        onConfirm: () => { DB.resetSales(); renderAdminPanel(); if (typeof renderMenu === "function") renderMenu(); },
      });
    });

    document.getElementById("admin-hard-reset").addEventListener("click", () => {
      showInlineConfirm("admin-panel-body", {
        type: "danger",
        message: "This will reset ALL stock and sales data to factory defaults. This cannot be undone.",
        confirmLabel: "Yes, hard reset",
        onConfirm: () => { DB.hardReset(); renderAdminPanel(); if (typeof renderMenu === "function") renderMenu(); },
      });
    });
  }

  // ── Wipe session on tab close or reload ───────────────────
  // Belt-and-suspenders: even if the removeItem at init somehow
  // missed (e.g. script error before it ran), unload clears it.
  window.addEventListener("beforeunload", () => {
    sessionStorage.removeItem(SESSION_KEY);
  });

})();