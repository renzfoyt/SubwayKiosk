// ============================================================
//  db.js — Persistent Inventory & Sales Database
//  Uses localStorage to persist stock levels and sales counts.
//  Must be loaded AFTER data.js and BEFORE app.js.
// ============================================================

const DB_KEY_STOCK   = "subway_kiosk_stock";
const DB_KEY_SALES   = "subway_kiosk_sales";
const DB_KEY_CUSTOM  = "subway_kiosk_custom";   // { id: { name, price, category, qty_sold } }

const DB = (() => {

  // ── Load / save helpers ────────────────────────────────────────
  function _loadStock() {
    try { const r = localStorage.getItem(DB_KEY_STOCK);  return r ? JSON.parse(r) : null; }
    catch { return null; }
  }
  function _loadSales() {
    try { const r = localStorage.getItem(DB_KEY_SALES);  return r ? JSON.parse(r) : {}; }
    catch { return {}; }
  }
  function _loadCustom() {
    try { const r = localStorage.getItem(DB_KEY_CUSTOM); return r ? JSON.parse(r) : {}; }
    catch { return {}; }
  }

  function _saveStock(v)  { localStorage.setItem(DB_KEY_STOCK,  JSON.stringify(v)); }
  function _saveSales(v)  { localStorage.setItem(DB_KEY_SALES,  JSON.stringify(v)); }
  function _saveCustom(v) { localStorage.setItem(DB_KEY_CUSTOM, JSON.stringify(v)); }

  // ── Seed stock from PRODUCTS if no saved data ──────────────────
  function init() {
    let stock = _loadStock();
    if (!stock) {
      stock = {};
      PRODUCTS.forEach(p => { stock[p.id] = p.stock ?? 20; });
      _saveStock(stock);
    } else {
      let changed = false;
      PRODUCTS.forEach(p => {
        if (!(p.id in stock)) { stock[p.id] = p.stock ?? 20; changed = true; }
      });
      if (changed) _saveStock(stock);
    }

    let sales = _loadSales();
    PRODUCTS.forEach(p => { if (!(p.id in sales)) sales[p.id] = 0; });
    _saveSales(sales);
    // custom bucket initialises lazily — no seeding needed
  }

  // ── Public API ─────────────────────────────────────────────────

  function getStock(productId) {
    // Custom sandwiches have unlimited stock — never sold out
    if (productId && productId.startsWith("BYO-")) return 999;
    const stock = _loadStock() || {};
    return stock[productId] ?? 0;
  }

  function getAllStock() { return _loadStock() || {}; }
  function getAllSales() { return _loadSales(); }

  /** Save a new custom sandwich to persistent storage */
  function saveCustomProduct(product) {
    const custom = _loadCustom();
    custom[product.id] = {
      id:       product.id,
      name:     product.name,
      category: product.category,
      price:    product.price,
      image:    product.image ?? null,
      qtySold:  0,
    };
    _saveCustom(custom);
  }

  /** Get all persisted custom sandwiches as an array */
  function getCustomProducts() {
    const custom = _loadCustom();
    return Object.values(custom);
  }

  /** Get all custom sales data */
  function getAllCustom() { return _loadCustom(); }

  /**
   * Record a completed order.
   * Regular items → deduct stock + increment sales.
   * Custom items   → increment their qtySold in the custom bucket only.
   */
  function recordOrder(cartItems) {
    const stock  = _loadStock() || {};
    const sales  = _loadSales();
    const custom = _loadCustom();

    cartItems.forEach(({ product, qty }) => {
      if (product.id && product.id.startsWith("BYO-")) {
        // Custom sandwich: persist sales count, no stock deduction
        if (custom[product.id]) {
          custom[product.id].qtySold = (custom[product.id].qtySold ?? 0) + qty;
        }
      } else {
        stock[product.id] = Math.max(0, (stock[product.id] ?? 0) - qty);
        sales[product.id] = (sales[product.id] ?? 0) + qty;
      }
    });

    _saveStock(stock);
    _saveSales(sales);
    _saveCustom(custom);
  }

  function getBestSellerIds() {
    const sales = _loadSales();
    const max = Math.max(...Object.values(sales));
    if (max === 0) return [];
    return Object.entries(sales).filter(([, v]) => v === max).map(([id]) => id);
  }

  function restock(productId, qty) {
    const stock = _loadStock() || {};
    stock[productId] = (stock[productId] ?? 0) + qty;
    _saveStock(stock);
  }

  function restockAll() {
    const stock = {};
    PRODUCTS.forEach(p => { stock[p.id] = p.stock ?? 20; });
    _saveStock(stock);
  }

  function resetSales() {
    const sales = {};
    PRODUCTS.forEach(p => { sales[p.id] = 0; });
    _saveSales(sales);
    // custom qtySold preserved intentionally — use hardReset to wipe everything
  }

  function hardReset() {
    localStorage.removeItem(DB_KEY_STOCK);
    localStorage.removeItem(DB_KEY_SALES);
    localStorage.removeItem(DB_KEY_CUSTOM);
    init();
  }

  init();

  return {
    getStock, getAllStock, getAllSales,
    saveCustomProduct, getCustomProducts, getAllCustom,
    recordOrder, getBestSellerIds,
    restock, restockAll, resetSales, hardReset,
  };
})();
