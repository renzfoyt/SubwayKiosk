// ============================================================
//  app.js — Subway Kiosk application logic
// ============================================================

// ── State ────────────────────────────────────────────────────
let cart = [];
let activeCategory = "All";
let discountType = "none";
let discountPct  = 0;

// ── DOM refs ─────────────────────────────────────────────────
const menuGrid        = document.getElementById("menu-grid");
const categoryTabs    = document.getElementById("category-tabs");
const cartList        = document.getElementById("cart-list");
const cartEmpty       = document.getElementById("cart-empty");
const bill            = document.getElementById("bill");
const discountSection = document.getElementById("discount-section");
const paymentSection  = document.getElementById("payment-section");
const checkoutBtn     = document.getElementById("checkout-btn");
const clearCartBtn    = document.getElementById("clear-cart-btn");
const paymentInput    = document.getElementById("payment-input");
const changeDisplay   = document.getElementById("change-display");
const changeAmount    = document.getElementById("change-amount");
const paymentError    = document.getElementById("payment-error");
const receiptModal    = document.getElementById("receipt-modal");
const receiptContent  = document.getElementById("receipt-content");
const newOrderBtn     = document.getElementById("new-order-btn");
const liveTime        = document.getElementById("live-time");
const quickBtns       = document.getElementById("quick-btns");

// ── Helpers ───────────────────────────────────────────────────
const peso = (n) => "₱" + n.toFixed(2);

function getCategories() {
  // Never expose the "Custom" category as a menu tab
  const cats = [...new Set(PRODUCTS.filter(p => p.category !== "Custom").map((p) => p.category))];
  return ["All", ...cats];
}

function getFiltered() {
  // Custom sandwiches never appear in the menu grid
  if (activeCategory === "All") return PRODUCTS.filter(p => p.category !== "Custom");
  return PRODUCTS.filter((p) => p.category === activeCategory && p.category !== "Custom");
}

// ── Live Clock ────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  liveTime.textContent = now.toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: true,
  });
}
setInterval(updateClock, 1000);
updateClock();

// ── Category Tabs ─────────────────────────────────────────────
function renderCategories() {
  categoryTabs.innerHTML = "";
  getCategories().forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-tab" + (cat === activeCategory ? " category-tab--active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderCategories();
      renderMenu();
    });
    categoryTabs.appendChild(btn);
  });

  // ── Build Your Own Sandwich button ──────────────────────────
  const byoBtn = document.createElement("button");
  byoBtn.className = "category-tab";
  byoBtn.textContent = "Build Your Own";
  byoBtn.style.cssText = "background:#008D43; color:#fff; border-color:#008D43; font-weight:700;";
  byoBtn.addEventListener("mouseenter", () => {
    byoBtn.style.background = "#006e34";
  });
  byoBtn.addEventListener("mouseleave", () => {
    byoBtn.style.background = "#008D43";
  });
  byoBtn.addEventListener("click", openBYO);
  categoryTabs.appendChild(byoBtn);
}

// ── Menu Grid ─────────────────────────────────────────────────
function scrollToTop() {
  menuGrid.scrollTop = 0;
  const cartView = document.getElementById('cart-view');
  if (cartView) cartView.scrollTop = 0;
  const paymentView = document.getElementById('payment-view');
  if (paymentView) paymentView.scrollTop = 0;
}

function renderMenu() {
  menuGrid.innerHTML = "";
  const bestSellerIds = DB.getBestSellerIds();

  getFiltered().forEach((product) => {
    const inCart    = cart.find((i) => i.product.id === product.id);
    const stock     = DB.getStock(product.id);
    const soldOut   = stock <= 0;
    const isBest    = bestSellerIds.includes(product.id);

    const card = document.createElement("div");
    card.className = "menu-card"
      + (inCart   ? " menu-card--in-cart"  : "")
      + (soldOut  ? " menu-card--sold-out" : "");

    const thumbHTML = product.image
      ? `<div class="menu-card__thumb">
           <img src="${product.image}" alt="${product.name}" class="menu-card__img" />
           ${soldOut ? '<div class="menu-card__sold-out-overlay"><span>SOLD OUT</span></div>' : ""}
           ${isBest && !soldOut ? '<div class="menu-card__best-seller-badge">🏆 Best Seller</div>' : ""}
         </div>`
      : `<div class="menu-card__icon" style="position:relative;">
           ${CATEGORY_ICONS[product.category] || "🍽️"}
           ${isBest && !soldOut ? '<div class="menu-card__best-seller-badge">🏆 Best Seller</div>' : ""}
         </div>`;

    let stockPillClass = "stock-pill--ok";
    let stockLabel = "";
    if (soldOut)         { stockPillClass = "stock-pill--out"; stockLabel = "Sold Out"; }
    else if (stock <= 5) { stockPillClass = "stock-pill--low"; stockLabel = "Low Stock"; }

    card.innerHTML = `
      ${thumbHTML}
      <div class="menu-card__body">
        <span class="menu-card__id">${product.id}</span>
        <h3 class="menu-card__name">${product.name}</h3>
        <span class="menu-card__cat">${product.category}</span>
      </div>
      <div class="menu-card__price">${peso(product.price)}</div>
      ${stockLabel ? `<div class="stock-pill ${stockPillClass}">${stockLabel}</div>` : ""}
      <div class="menu-card__actions">
        ${soldOut
          ? `<button class="menu-card__add menu-card__add--soldout" disabled>Sold Out</button>`
          : inCart
            ? `<button class="menu-card__add menu-card__add--added" data-id="${product.id}">In Cart (${inCart.qty})</button>
               <button class="menu-card__remove" data-id="${product.id}">Remove</button>`
            : ``
        }
      </div>
    `;

    if (!soldOut) {
      const addBtn = card.querySelector(".menu-card__add");
      if (addBtn) {
        addBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          addToCart(product);
        });
      }
      const removeBtn = card.querySelector(".menu-card__remove");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeFromCart(product.id);
        });
      }
      card.addEventListener("click", () => addToCart(product));
    }

    menuGrid.appendChild(card);
  });
}

// ── Cart Operations ───────────────────────────────────────────
function addToCart(product) {
  const inCart   = cart.find((i) => i.product.id === product.id);
  const cartQty  = inCart ? inCart.qty : 0;
  const available = DB.getStock(product.id) - cartQty;
  if (available <= 0) return;

  if (inCart) {
    inCart.qty += 1;
  } else {
    cart.push({ product, qty: 1 });
  }
  renderMenu();
  renderCart();
  updateCartBadge();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.product.id !== productId);
  renderMenu();
  renderCart();
  updateCartBadge();
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.product.id === productId);
  if (!item) return;

  if (delta > 0) {
    const available = DB.getStock(productId); // returns 999 for BYO items
    if (item.qty >= available) return;
  }

  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(productId);
    return;
  }
  renderMenu();
  renderCart();
  updateCartBadge();
}

function clearCart() {
  cart = [];
  discountType = "none";
  discountPct  = 0;
  activeCategory = "All";
  paymentInput.value = "";
  renderCategories();
  renderMenu();
  renderCart();
  updateCartBadge();
  resetDiscountButtons();
  document.getElementById('cart-view').style.display    = 'flex';
  document.getElementById('payment-view').style.display = 'none';
}

// ── Cart Render ───────────────────────────────────────────────
function renderCart() {
  const cartView = document.getElementById('cart-view');
  if (cartView) cartView.scrollTop = 0;
  cartList.querySelectorAll(".cart-item").forEach((el) => el.remove());

  const hasItems = cart.length > 0;
  cartEmpty.style.display = hasItems ? "none" : "flex";

  if (hasItems) {
    cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      const subtotal  = item.product.price * item.qty;
      const available = DB.getStock(item.product.id);
      const atMax     = item.qty >= available;

      row.innerHTML = `
        <div class="cart-item__info">
          <span class="cart-item__name">${item.product.name}</span>
          <span class="cart-item__unit">${peso(item.product.price)} each</span>
        </div>
        <div class="cart-item__controls">
          <button class="qty-btn" data-id="${item.product.id}" data-delta="-1">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn ${atMax ? 'qty-btn--disabled' : ''}" data-id="${item.product.id}" data-delta="1" ${atMax ? 'disabled title="Max stock reached"' : ''}>+</button>
        </div>
        <div class="cart-item__subtotal">${peso(subtotal)}</div>
        <button class="cart-item__remove" data-id="${item.product.id}">✕</button>
      `;
      cartList.appendChild(row);
    });

    cartList.querySelectorAll(".qty-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        changeQty(btn.dataset.id, parseInt(btn.dataset.delta))
      );
    });
    cartList.querySelectorAll(".cart-item__remove").forEach((btn) => {
      btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
    });
  }

  document.getElementById('proceed-btn').style.display = hasItems ? "block" : "none";
  document.getElementById('clear-cart-btn').style.display = hasItems ? "block" : "none";

  document.getElementById('cart-view').style.display    = 'flex';
  document.getElementById('payment-view').style.display = 'none';

  if (hasItems) {
    updateBill();
    updateQuickBtns();
  } else {
    changeDisplay.style.display = "none";
    paymentError.style.display  = "none";
  }
}

// ── Bill Calculation ──────────────────────────────────────────
function computeBill() {
  const subtotal     = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discountAmt  = subtotal * (discountPct / 100);
  const afterDisc    = subtotal - discountAmt;
  const vat          = afterDisc * 0.12;
  const grandTotal   = afterDisc + vat;
  return { subtotal, discountAmt, afterDisc, vat, grandTotal };
}

function updateBill() {
  const { subtotal, discountAmt, afterDisc, vat, grandTotal } = computeBill();

  document.getElementById("bill-subtotal").textContent = peso(subtotal);
  document.getElementById("bill-vat").textContent      = peso(vat);
  document.getElementById("bill-grand").textContent    = peso(grandTotal);

  const discountRow   = document.getElementById("discount-row");
  const billDiscount  = document.getElementById("bill-discount");
  const discLabelText = document.getElementById("discount-label-text");

  if (discountPct > 0) {
    discountRow.style.display  = "flex";
    billDiscount.textContent   = `-${peso(discountAmt)}`;
    discLabelText.textContent  = discountType === "senior"
      ? `Senior Discount (${discountPct}%)`
      : `PWD Discount (${discountPct}%)`;
  } else {
    discountRow.style.display = "none";
  }

  const entered = parseFloat(paymentInput.value);
  if (!isNaN(entered) && entered > 0) evaluatePayment(entered, grandTotal);
}

// ── Quick Payment Buttons ─────────────────────────────────────
function updateQuickBtns() {
  const { grandTotal } = computeBill();
  const suggestions = [
    Math.ceil(grandTotal / 100) * 100,
    Math.ceil(grandTotal / 500) * 500,
    Math.ceil(grandTotal / 1000) * 1000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= grandTotal);

  quickBtns.innerHTML = "";
  suggestions.slice(0, 3).forEach((amt) => {
    const btn = document.createElement("button");
    btn.className   = "quick-btn";
    btn.textContent = peso(amt);
    btn.addEventListener("click", () => {
      paymentInput.value = amt;
      evaluatePayment(amt, grandTotal);
    });
    quickBtns.appendChild(btn);
  });
}

// ── Payment Evaluation ────────────────────────────────────────
function evaluatePayment(paid, grandTotal) {
  changeDisplay.style.display = "none";
  paymentError.style.display  = "none";
  if (paid < grandTotal) {
    paymentError.style.display = "block";
  } else {
    const change = paid - grandTotal;
    changeAmount.textContent    = peso(change);
    changeDisplay.style.display = "block";
  }
}

paymentInput.addEventListener("input", () => {
  const paid = parseFloat(paymentInput.value);
  const { grandTotal } = computeBill();
  if (!isNaN(paid) && paid > 0) evaluatePayment(paid, grandTotal);
  else {
    changeDisplay.style.display = "none";
    paymentError.style.display  = "none";
  }
});

// ── Discount Buttons ──────────────────────────────────────────
document.querySelectorAll(".discount-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    discountType = btn.dataset.type;
    discountPct  = parseInt(btn.dataset.pct);
    resetDiscountButtons();
    btn.classList.add("discount-btn--active");
    updateBill();
    updateQuickBtns();
  });
});

function resetDiscountButtons() {
  document.querySelectorAll(".discount-btn").forEach((b) =>
    b.classList.remove("discount-btn--active")
  );
  if (discountType === "none") {
    document.querySelector('.discount-btn[data-type="none"]').classList.add("discount-btn--active");
  }
}

// ── Clear Cart ────────────────────────────────────────────────
clearCartBtn.addEventListener("click", () => {
  if (cart.length === 0) return;
  clearCart();
});

// ── Checkout / Receipt ────────────────────────────────────────
checkoutBtn.addEventListener("click", () => {
  const paid       = parseFloat(paymentInput.value);
  const { grandTotal, subtotal, discountAmt, vat } = computeBill();

  if (isNaN(paid) || paid < grandTotal) {
    paymentError.style.display  = "block";
    changeDisplay.style.display = "none";
    paymentInput.focus();
    return;
  }

  DB.recordOrder(cart);
  renderMenu();

  showOrderLoading({ paid, grandTotal, subtotal, discountAmt, vat });
});

function showOrderLoading(receiptData) {
  const overlay = document.getElementById("order-loading-overlay");
  const msg     = document.getElementById("order-loading-msg");

  msg.textContent = "Thank you for ordering, sending your order into the kitchen!";
  msg.classList.remove("fade-out", "success");
  overlay.style.display = "flex";

  // After 3s: fade out first message, then show "Success!"
  setTimeout(() => {
    msg.classList.add("fade-out");
    setTimeout(() => {
      msg.textContent = "Success!";
      msg.classList.remove("fade-out");
      msg.classList.add("success");
    }, 400);
  }, 1000);

  // After 3s: hide loading screen and show receipt
  setTimeout(() => {
    overlay.style.display = "none";
    showReceipt(receiptData);
  }, 3000);
}

function showReceipt({ paid, grandTotal, subtotal, discountAmt, vat }) {
  const change = paid - grandTotal;
  const now    = new Date().toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  let itemsHTML = cart
    .map((i) => `
      <div class="receipt__item">
        <span class="receipt__item-name">${i.product.name} ×${i.qty}</span>
        <span class="receipt__item-price">${peso(i.product.price * i.qty)}</span>
      </div>`)
    .join("");

  let discountLine = "";
  if (discountPct > 0) {
    const label = discountType === "senior" ? "Senior Discount" : "PWD Discount";
    discountLine = `
      <div class="receipt__row receipt__row--discount">
        <span>${label} (${discountPct}%)</span>
        <span>-${peso(discountAmt)}</span>
      </div>`;
  }

  receiptContent.innerHTML = `
    <div class="receipt__header">
      <span class="receipt__store-icon"><img src="images/Subway-logo.png" class="receipt-logoicon"></span>
      <h2 class="receipt__store"></h2>
      <p class="receipt__date">${now}</p>
    </div>
    <div class="receipt__divider"></div>
    <div class="receipt__items">${itemsHTML}</div>
    <div class="receipt__divider"></div>
    <div class="receipt__totals">
      <div class="receipt__row">
        <span>Subtotal</span><span>${peso(subtotal)}</span>
      </div>
      ${discountLine}
      <div class="receipt__row">
        <span>VAT (12%)</span><span>${peso(vat)}</span>
      </div>
      <div class="receipt__row receipt__row--grand">
        <span>Grand Total</span><span>${peso(grandTotal)}</span>
      </div>
      <div class="receipt__row">
        <span>Payment</span><span>${peso(paid)}</span>
      </div>
      <div class="receipt__row receipt__row--change">
        <span>Change</span><span>${peso(change)}</span>
      </div>
    </div>
    <div class="receipt__divider"></div>
    <p class="receipt__footer">Thank you for ordering at Subway! Come again!</p>
  `;

  receiptModal.style.display = "flex";

  if (typeof window.startReceiptTimer === "function") {
    window.startReceiptTimer();
  }
}

newOrderBtn.addEventListener("click", () => {
  if (typeof window.stopReceiptTimer === "function") {
    window.stopReceiptTimer();
  }
  receiptModal.style.display = "none";
  clearCart();
  switchTab("menu");
});

// ── Tab switching ─────────────────────────────────────────────
function switchTab(tab) {
  scrollToTop();
  const isMenu = tab === 'menu';

  document.getElementById('view-menu').style.display  = isMenu ? 'flex' : 'none';
  document.getElementById('view-order').style.display = isMenu ? 'none' : 'flex';
  document.getElementById('view-order').style.flexDirection = 'column';

  const tabMenu  = document.getElementById('tab-menu');
  const tabOrder = document.getElementById('tab-order');

  tabMenu.style.background   = isMenu ? 'rgba(255,255,255,0.15)' : 'none';
  tabMenu.style.borderTop    = isMenu ? '3px solid #FDBA12'      : '3px solid transparent';
  tabMenu.style.color        = isMenu ? '#fff'                   : 'rgba(255,255,255,0.75)';

  tabOrder.style.background  = isMenu ? 'none'                   : 'rgba(255,255,255,0.15)';
  tabOrder.style.borderTop   = isMenu ? '3px solid transparent'  : '3px solid #FDBA12';
  tabOrder.style.color       = isMenu ? 'rgba(255,255,255,0.75)' : '#fff';
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  const total = cart.reduce((sum, i) => sum + i.qty, 0);
  if (total > 0) {
    badge.textContent   = total;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── Init ─────────────────────────────────────────────────────
renderCategories();
renderMenu();
renderCart();
resetDiscountButtons();
updateCartBadge();

// ── Drag scroll ───────────────────────────────────────────────
function addDragScroll(el) {
  let isDown = false;
  let didDrag = false;
  let startY, scrollTop;
  el.addEventListener('mousedown', (e) => {
    isDown = true; didDrag = false; el.style.cursor = 'grabbing';
    startY = e.pageY - el.offsetTop; scrollTop = el.scrollTop;
  });
  el.addEventListener('mouseleave', () => { isDown = false; el.style.cursor = 'default'; });
  el.addEventListener('mouseup',    () => { isDown = false; el.style.cursor = 'default'; });
  el.addEventListener('mousemove',  (e) => {
    if (!isDown) return; e.preventDefault();
    const y = e.pageY - el.offsetTop;
    const walk = (y - startY) * 1.5;
    if (Math.abs(walk) > 4) didDrag = true;
    el.scrollTop = scrollTop - walk;
  });
  el.addEventListener('click', (e) => {
    if (didDrag) { e.stopPropagation(); didDrag = false; }
  }, true);
}
addDragScroll(document.getElementById('menu-grid'));
addDragScroll(document.getElementById('cart-view'));
addDragScroll(document.querySelector('.cart-scroll'));
addDragScroll(document.querySelector('#receipt-modal .modal'));

// ── Numpad ────────────────────────────────────────────────────
function renderNumpad() {
  const container = document.createElement("div");
  container.className = "numpad";
  const keys = ["1","2","3","4","5","6","7","8","9","C","0","⌫"];
  keys.forEach((key) => {
    const btn = document.createElement("button");
    btn.className = "numpad__btn";
    btn.textContent = key;
    if (key === "C") btn.classList.add("numpad__btn--clear");
    if (key === "⌫") btn.classList.add("numpad__btn--backspace");
    btn.addEventListener("click", () => {
      let val = paymentInput.value;
      if (key === "C") {
        paymentInput.value = "";
      } else if (key === "⌫") {
        paymentInput.value = val.slice(0, -1);
      } else {
        paymentInput.value = val === "0" ? key : val + key;
      }
      const paid = parseFloat(paymentInput.value);
      const { grandTotal } = computeBill();
      if (!isNaN(paid) && paid > 0) evaluatePayment(paid, grandTotal);
      else {
        changeDisplay.style.display = "none";
        paymentError.style.display  = "none";
      }
    });
    container.appendChild(btn);
  });
  quickBtns.parentNode.insertBefore(container, quickBtns.nextSibling);
}

paymentInput.addEventListener("keydown", (e) => e.preventDefault());
renderNumpad();

// ── Proceed / Edit ────────────────────────────────────────────
document.getElementById('proceed-btn').addEventListener('click', () => {
  document.getElementById('cart-view').style.display   = 'none';
  document.getElementById('payment-view').style.display = 'flex';
  updateBill();
  updateQuickBtns();
});

document.getElementById('edit-order-btn').addEventListener('click', () => {
  document.getElementById('payment-view').style.display = 'none';
  document.getElementById('cart-view').style.display    = 'flex';
  paymentInput.value          = "";
  changeDisplay.style.display = "none";
  paymentError.style.display  = "none";
});

// ============================================================
//  BUILD YOUR OWN SANDWICH
// ============================================================

// ── Ingredient data — add image paths or leave image:null for emoji fallback ──
const BYO_INGREDIENTS = {
  "Bread": [
    { id: "byo-bread-italian",  name: "White",       emoji: "🍞", image: "images/byoingredients/bread/White.jpg" },
    { id: "byo-bread-wheat",    name: "Wheat",         emoji: "🌾", image: "images/byoingredients/bread/Wheat.jpg" },
    { id: "byo-bread-honey",    name: "Honey Oat",     emoji: "🍯", image: "images/byoingredients/bread/HoneyOat.jpg" },
    { id: "byo-bread-flatbread",name: "Parmesan Oregano",     emoji: "🫓", image: "images/byoingredients/bread/ParmesanOregano.jpg" },
  ],  
  "Protein": [
    { id: "byo-meat-chicken",   name: "Chicken",       emoji: "🍗", image: "images/byoingredients/protein/chicken.jpg", price: 30 },
    { id: "byo-meat-ham",       name: "Ham",           emoji: "🥩", image: "images/byoingredients/protein/ham.jpg", price: 35 },
    { id: "byo-meat-tuna",      name: "Tuna",          emoji: "🐟", image: "images/byoingredients/protein/tuna.png", price: 30 },
    { id: "byo-meat-steak",     name: "Steak",         emoji: "🥩", image: "images/byoingredients/protein/steak.jpeg", price: 43 },
    { id: "byo-meat-bacon",     name: "Bacon",         emoji: "🥓", image: "images/byoingredients/protein/bacon.jpg", price: 30 },
    { id: "byo-meat-falafel",   name: "Falafel",       emoji: "🧆", image: "images/byoingredients/protein/falafel.png", price: 30 },
  ],
  "Cheese": [
    { id: "byo-cheese-american",name: "American",      emoji: "🧀", image: "images/byoingredients/cheese/american.jpg", price: 1.00 },
    { id: "byo-cheese-swiss",   name: "Swiss",         emoji: "🧀", image: "images/byoingredients/cheese/swiss.jpg", price: 2.00 },
    { id: "byo-cheese-pepper",  name: "Pepper Jack",   emoji: "🧀", image: "images/byoingredients/cheese/pepperj.png", price: 2.50 },
    { id: "byo-cheese-none",    name: "No Cheese",     emoji: "🚫", image: null},
  ],
  "Veggies": [
    { id: "byo-veg-lettuce",    name: "Lettuce",       emoji: "🥬", image: "images/byoingredients/greens/Lettuce.png", price: 0.50 },
    { id: "byo-veg-tomato",     name: "Tomato",        emoji: "🍅", image: "images/byoingredients/greens/Tomatoes.png", price: 0.50 },
    { id: "byo-veg-cucumber",   name: "Cucumber",      emoji: "🥒", image: "images/byoingredients/greens/Cucumbers.png", price: 0.50 },
    { id: "byo-veg-onion",      name: "Onion",         emoji: "🧅", image: "images/byoingredients/greens/Onions.jpg", price: 0.50 },
    { id: "byo-veg-peppers",    name: "Green Peppers", emoji: "🫑", image: "images/byoingredients/greens/GreenPeppers.png", price: 0.50 },
    { id: "byo-veg-jalapeno",   name: "Jalapeño",      emoji: "🌶️", image: "images/byoingredients/greens/Jalapenos.png", price: 0.50 },
    { id: "byo-veg-olive",      name: "Olives",        emoji: "🫒", image: "images/byoingredients/greens/Olives.jpg", price: 0.50 },
    { id: "byo-veg-spinach",    name: "Pickles",       emoji: "🌿", image: "images/byoingredients/greens/Pickles.png", price: 0.50 },
  ],
  "Sauce": [
    { id: "byo-sauce-ranch",    name: "Chipotle",         emoji: "🥣", image: "images/byoingredients/sauce/Chipotle.png", price: 0.50 },
    { id: "byo-sauce-chipotle", name: "Honey Mustard",      emoji: "🌶️", image: "images/byoingredients/sauce/HoneyMustard.png", price: 0.50 },
    { id: "byo-sauce-honey",    name: "Italian Dressing", emoji: "🍯", image: "images/byoingredients/sauce/Italian.png", price: 0.50 },
    { id: "byo-sauce-mayo",     name: "Mayo",          emoji: "🥄", image: "images/byoingredients/sauce/Mayonnaise.png", price: 0.50 },
    { id: "byo-sauce-oil",       name: "Olive Oil",   emoji: "🧅", image: "images/byoingredients/sauce/OliveOil.png", price: 0.50 },
    { id: "byo-sauce-vinegar",  name: "Red Wine Vinegar", emoji: "🫙", image: "images/byoingredients/sauce/RedWine.png", price: 0.50 },
    { id: "byo-sauce-sonion",     name: "Sweet Onion",          emoji: "🥄", image: "images/byoingredients/sauce/SweetOnion.png", price: 0.50 },
    { id: "byo-sauce-Island",       name: "Thousand Island",   emoji: "🧅", image: "images/byoingredients/sauce/ThousandIsland.png", price: 0.50 },
    { id: "byo-sauce-mustard",  name: "Yellow Mustard", emoji: "🫙", image: "images/byoingredients/sauce/YellowMustard.png", price: 0.50 },
  ],

};

const BYO_BASE_PRICE = 99;
const BYO_EXTRA_PER_SECTION = 35; // charge per section after bread

// Track which ingredients are selected (set of ids)
let byoSelected = new Set();

function openBYO() {
  byoSelected = new Set();
  renderBYOModal();
  document.getElementById('byo-overlay').style.display = 'flex';
}

function closeBYO() {
  
  document.querySelectorAll('#byo-overlay *').forEach(el => {
    if (el.scrollTop > 0) el.scrollTop = 0;
  });
  document.getElementById('byo-overlay').style.display = 'none';
  byoModal.style.display = "none";
  byoSelected.clear();
  renderBYO();
  
}

function toggleBYOItem(id, isRadio) {
  if (isRadio) {
    // For Bread and Cheese: only one selection allowed in that group
    const section = Object.entries(BYO_INGREDIENTS).find(([, items]) =>
      items.some((i) => i.id === id)
    );
    if (section) {
      section[1].forEach((i) => byoSelected.delete(i.id));
    }
    byoSelected.add(id);
  } else {
    if (byoSelected.has(id)) byoSelected.delete(id);
    else byoSelected.add(id);
  }
  updateBYOFooter();
  // Re-render just the items (highlight selected)
  document.querySelectorAll('.byo-item').forEach((el) => {
    const iid = el.dataset.id;
    el.classList.toggle('byo-item--selected', byoSelected.has(iid));
    el.querySelector('.byo-item__check').textContent = byoSelected.has(iid) ? '✓ Selected' : '';
  });
}

function computeBYOPrice() {
  let total = BYO_BASE_PRICE;
  byoSelected.forEach((id) => {
    for (const items of Object.values(BYO_INGREDIENTS)) {
      const found = items.find((i) => i.id === id);
      if (found) { total += found.price ?? 0; break; }
    }
  });
  return total;
}

function updateBYOFooter() {
  const price = computeBYOPrice();
  const selectedNames = [...byoSelected]
    .map((id) => {
      for (const items of Object.values(BYO_INGREDIENTS)) {
        const found = items.find((i) => i.id === id);
        if (found) return found.name;
      }
      return null;
    })
    .filter(Boolean);

  const summary = document.getElementById('byo-summary');
  const priceEl = document.getElementById('byo-price');
  const addBtn  = document.getElementById('byo-add-btn');

  const hasBread = BYO_INGREDIENTS["Bread"].some((i) => byoSelected.has(i.id));
  const hasProtein = BYO_INGREDIENTS["Protein"].some((i) => byoSelected.has(i.id));

  if (selectedNames.length === 0) {
    summary.textContent = "Select your bread and fillings to get started.";
  } else {
    summary.textContent = selectedNames.join(", ");
  }
  priceEl.textContent = peso(price);
  addBtn.disabled = !(hasBread && hasProtein);
}

function addBYOToCart() {
  const selectedNames = [...byoSelected].map((id) => {
    for (const items of Object.values(BYO_INGREDIENTS)) {
      const found = items.find((i) => i.id === id);
      if (found) return found.name;
    }
    return null;
  }).filter(Boolean);

  const price = computeBYOPrice();
  const byoProduct = {
    id:       "BYO-" + Date.now(),
    name:     "Custom: " + selectedNames.join(", "),
    category: "Custom",
    price:    price,
    image:    null,
    stock:    999,
  };

  // Persist to localStorage so it survives reloads and shows in inventory
  DB.saveCustomProduct(byoProduct);

  // Add directly to cart — do NOT push to PRODUCTS (keeps it off the menu grid)
  cart.push({ product: byoProduct, qty: 1 });
  renderMenu();
  renderCart();
  updateCartBadge();
  closeBYO();
}

function renderBYOModal() {
  // Build the modal HTML
  const radioSections = new Set(["Bread", "Cheese"]);

  let sectionsHTML = Object.entries(BYO_INGREDIENTS).map(([section, items]) => {
    const isRadio = radioSections.has(section);
    const itemsHTML = items.map((ing) => {
      const isSelected = byoSelected.has(ing.id);
      const mediaHTML = ing.image
        ? `<img class="byo-item__img" src="${ing.image}" alt="${ing.name}" />`
        : `<span class="byo-item__emoji">${ing.emoji}</span>`;
      return `
        <div class="byo-item${isSelected ? ' byo-item--selected' : ''}"
             data-id="${ing.id}" data-radio="${isRadio}">
          ${mediaHTML}
          <span class="byo-item__name">${ing.name}</span>
          <span class="byo-item__check">${isSelected ? '✓ Selected' : ''}</span>
        </div>`;
    }).join("");

    const hint = isRadio
      ? '<span style="font-size:0.7rem;color:#6b7280;font-weight:400;margin-left:6px;">(choose one)</span>'
      : '<span style="font-size:0.7rem;color:#6b7280;font-weight:400;margin-left:6px;">(choose any)</span>';

    return `
      <div class="byo-section">
        <p class="byo-section__label">${section}${hint}</p>
        <div class="byo-items">${itemsHTML}</div>
      </div>`;
  }).join("");

  const overlay = document.getElementById('byo-overlay');
  overlay.innerHTML = `
    <div class="byo-modal">
      <div class="byo-modal__header">
        <h2 class="byo-modal__title">Build Your Own Sandwich</h2>
        <button class="byo-modal__close" id="byo-close-btn">✕</button>
      </div>
      <div class="byo-modal__body">
        ${sectionsHTML}
      </div>
      <div class="byo-modal__footer">
        <span class="byo-modal__summary" id="byo-summary">Select your bread and fillings to get started.</span>
        <span class="byo-modal__price" id="byo-price">${peso(BYO_BASE_PRICE)}</span>
        <button class="byo-modal__add" id="byo-add-btn" disabled>Add to Order</button>
      </div>
    </div>
  `;

  document.getElementById('byo-close-btn').addEventListener('click', closeBYO);
  document.getElementById('byo-add-btn').addEventListener('click', addBYOToCart);

  overlay.querySelectorAll('.byo-item').forEach((el) => {
    el.addEventListener('click', () => {
      const isRadio = el.dataset.radio === 'true';
      toggleBYOItem(el.dataset.id, isRadio);
    });
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeBYO();
  });

  // Drag-to-scroll on the BYO ingredient list
  addDragScroll(overlay.querySelector('.byo-modal__body'));
}

// Inject the overlay container into the page once
(function injectBYOOverlay() {
  const div = document.createElement('div');
  div.id = 'byo-overlay';
  div.className = 'byo-overlay';
  div.style.display = 'none';
  document.body.appendChild(div);
})();