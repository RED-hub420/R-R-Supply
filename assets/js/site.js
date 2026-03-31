(function () {
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const CART_KEY = 'rrp-quote-basket';

  function getProducts() {
    return window.RRP_PRODUCTS || [];
  }

  function getProductById(id) {
    return getProducts().find((p) => p.id === id);
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function cartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
  }

  function updateCartCount() {
    const count = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
    });
  }

  function addToCart(productId, quantity = 1) {
    const product = getProductById(productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find((item) => item.id === productId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, product.stock);
    } else {
      cart.push({ id: productId, quantity: Math.min(quantity, product.stock) });
    }
    saveCart(cart);
    showToast(`${product.name} added to quote basket`);
  }

  function updateQuantity(productId, quantity) {
    let cart = getCart();
    cart = cart
      .map((item) => (item.id === productId ? { ...item, quantity: Number(quantity) } : item))
      .filter((item) => item.quantity > 0);
    saveCart(cart);
    renderCartPage();
  }

  function removeFromCart(productId) {
    const cart = getCart().filter((item) => item.id !== productId);
    saveCart(cart);
    renderCartPage();
  }

  function cartDetailed() {
    return getCart()
      .map((item) => {
        const product = getProductById(item.id);
        if (!product) return null;
        return {
          ...product,
          quantity: item.quantity,
          lineTotal: product.price * item.quantity,
        };
      })
      .filter(Boolean);
  }

  function cartTotals() {
    const items = cartDetailed();
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return { subtotal };
  }

  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__rrpToastTimer);
    window.__rrpToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function cardMarkup(product) {
    return `
      <article class="product-card">
        <a class="product-media" href="product.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}">
        </a>
        <div class="product-body">
          <div class="product-meta-row">
            <span class="product-badge">${product.category}</span>
            <span class="product-sku">${product.sku}</span>
          </div>
          <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
          <p class="product-machine">${product.subtitle}</p>
          <div class="product-meta-list">
            <span>${product.condition}</span>
            <span>${product.stock} in stock</span>
          </div>
          <div class="product-actions">
            <strong>${currency.format(product.price)}</strong>
            <button class="button button-primary" data-add-to-cart="${product.id}">Add to Quote</button>
          </div>
        </div>
      </article>
    `;
  }

  function bindAddButtons() {
    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      button.addEventListener('click', () => addToCart(button.getAttribute('data-add-to-cart')));
    });
  }

  function renderFeatured() {
    const mount = document.querySelector('[data-featured-products]');
    if (!mount) return;
    mount.innerHTML = getProducts().slice(0, 4).map(cardMarkup).join('');
    bindAddButtons();
  }

  function renderInventoryPage() {
    const grid = document.querySelector('[data-inventory-grid]');
    if (!grid) return;

    const searchInput = document.querySelector('[data-search]');
    const categorySelect = document.querySelector('[data-category]');
    const sortSelect = document.querySelector('[data-sort]');

    const render = () => {
      let items = [...getProducts()];
      const search = (searchInput?.value || '').toLowerCase().trim();
      const category = categorySelect?.value || 'all';
      const sort = sortSelect?.value || 'featured';

      if (search) {
        items = items.filter((item) =>
          [item.name, item.subtitle, item.category, item.sku, item.partNumber].join(' ').toLowerCase().includes(search)
        );
      }

      if (category !== 'all') {
        items = items.filter((item) => item.category === category);
      }

      if (sort === 'price-low') items.sort((a, b) => a.price - b.price);
      if (sort === 'price-high') items.sort((a, b) => b.price - a.price);
      if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));

      grid.innerHTML = items.length
        ? items.map(cardMarkup).join('')
        : '<div class="empty-state"><h3>No inventory matched that search.</h3><p>Try a different size, product type, SKU, or category.</p></div>';

      const results = document.querySelector('[data-results-count]');
      if (results) results.textContent = `${items.length} products found`;
      bindAddButtons();
    };

    [searchInput, categorySelect, sortSelect].forEach((el) => el && el.addEventListener('input', render));
    [categorySelect, sortSelect].forEach((el) => el && el.addEventListener('change', render));
    render();
  }

  function renderProductPage() {
    const mount = document.querySelector('[data-product-detail]');
    if (!mount) return;
    const params = new URLSearchParams(window.location.search);
    const product = getProductById(params.get('id')) || getProducts()[0];

    mount.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-detail-image-wrap">
          <img src="${product.image}" alt="${product.name}" class="product-detail-image">
        </div>
        <div class="product-detail-copy">
          <span class="product-badge">${product.category}</span>
          <h1>${product.name}</h1>
          <p class="product-machine large">${product.subtitle}</p>
          <div class="price-row">
            <strong>${currency.format(product.price)}</strong>
            <span>${product.condition}</span>
          </div>
          <div class="spec-grid">
            <div><span>SKU</span><strong>${product.sku}</strong></div>
            <div><span>Item Code</span><strong>${product.partNumber}</strong></div>
            <div><span>Pack Weight</span><strong>${product.weight}</strong></div>
            <div><span>Stock</span><strong>${product.stock} available</strong></div>
            <div><span>Fulfillment</span><strong>${product.shipping}</strong></div>
            <div><span>Location</span><strong>${product.location}</strong></div>
          </div>
          <p>${product.description}</p>
          <div class="detail-actions">
            <button class="button button-primary" data-add-to-cart="${product.id}">Add to Quote</button>
            <a class="button button-secondary" href="contact.html">Ask About This Item</a>
          </div>
          <div class="detail-block">
            <h3>Common Uses</h3>
            <ul>${product.applications.map((item) => `<li>${item}</li>`).join('')}</ul>
          </div>
          <div class="detail-block">
            <h3>Highlights</h3>
            <ul>${product.features.map((item) => `<li>${item}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
    `;
    bindAddButtons();
  }

  function renderCartPage() {
    const mount = document.querySelector('[data-cart-page]');
    if (!mount) return;

    const items = cartDetailed();
    const totals = cartTotals();

    if (!items.length) {
      mount.innerHTML = `
        <div class="empty-state cart-empty">
          <h2>Your quote basket is empty</h2>
          <p>Add material to build a clean request before sending it to the counter.</p>
          <a class="button button-primary" href="inventory.html">Browse Inventory</a>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div class="cart-layout">
        <div class="cart-list">
          ${items.map((item) => `
            <article class="cart-item">
              <img src="${item.image}" alt="${item.name}">
              <div class="cart-item-copy">
                <h3><a href="product.html?id=${item.id}">${item.name}</a></h3>
                <p>${item.subtitle}</p>
                <div class="cart-mini-specs">
                  <span>${item.sku}</span>
                  <span>${item.condition}</span>
                </div>
              </div>
              <div class="cart-item-controls">
                <label>
                  Qty
                  <input type="number" min="1" max="${item.stock}" value="${item.quantity}" data-qty-input="${item.id}">
                </label>
                <strong>${currency.format(item.lineTotal)}</strong>
                <button class="text-button" data-remove-item="${item.id}">Remove</button>
              </div>
            </article>
          `).join('')}
        </div>
        <aside class="summary-card">
          <h3>Quote Summary</h3>
          <div class="summary-line"><span>Material subtotal</span><strong>${currency.format(totals.subtotal)}</strong></div>
          <div class="summary-line"><span>Freight / delivery</span><strong>Quoted separately</strong></div>
          <div class="summary-line"><span>Sales tax</span><strong>Calculated if applicable</strong></div>
          <div class="summary-line total"><span>Estimated material total</span><strong>${currency.format(totals.subtotal)}</strong></div>
          <p class="summary-note">Final pricing is confirmed after stock, delivery method, and any cut, thread, or groove work is reviewed.</p>
          <a class="button button-primary full-width" href="checkout.html">Request a Quote</a>
        </aside>
      </div>
    `;

    document.querySelectorAll('[data-qty-input]').forEach((input) => {
      input.addEventListener('change', () => updateQuantity(input.getAttribute('data-qty-input'), input.value));
    });

    document.querySelectorAll('[data-remove-item]').forEach((button) => {
      button.addEventListener('click', () => removeFromCart(button.getAttribute('data-remove-item')));
    });
  }

  function renderCheckoutPage() {
    const mount = document.querySelector('[data-checkout-page]');
    if (!mount) return;

    const items = cartDetailed();
    const totals = cartTotals();

    mount.innerHTML = `
      <div class="checkout-layout">
        <form class="checkout-form" data-order-request>
          <div class="section-heading"><h2>Quote Request Details</h2><p>Provide the contact information and job notes needed to review the request cleanly.</p></div>
          <div class="form-grid">
            <label><span>Company Name</span><input required placeholder="Your company"></label>
            <label><span>Contact Name</span><input required placeholder="Your name"></label>
            <label><span>Email</span><input required type="email" placeholder="you@example.com"></label>
            <label><span>Phone</span><input required placeholder="(940) 555-5555"></label>
            <label><span>City</span><input required placeholder="Wichita Falls"></label>
            <label><span>State</span><input required placeholder="TX"></label>
            <label><span>Delivery Method</span><select><option>Local delivery</option><option>Will-call pickup</option><option>Parcel / freight quote</option></select></label>
            <label><span>Needed By</span><input placeholder="ASAP / next week / project date"></label>
            <label class="full"><span>Notes</span><textarea placeholder="Add size confirmations, project details, cutting or threading requests, or delivery instructions."></textarea></label>
          </div>
          <button class="button button-primary full-width" type="submit">Submit Quote Request</button>
          <p class="summary-note">Include any delivery notes, jobsite details, or custom prep instructions that affect the order.</p>
        </form>
        <aside class="summary-card">
          <h3>Quote Basket</h3>
          ${items.length ? items.map((item) => `<div class="summary-line"><span>${item.name} × ${item.quantity}</span><strong>${currency.format(item.lineTotal)}</strong></div>`).join('') : '<p>No items in quote basket yet.</p>'}
          <div class="summary-line"><span>Material subtotal</span><strong>${currency.format(totals.subtotal)}</strong></div>
          <div class="summary-line"><span>Freight / delivery</span><strong>Quoted separately</strong></div>
        </aside>
      </div>
    `;

    const form = mount.querySelector('[data-order-request]');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      localStorage.removeItem(CART_KEY);
      updateCartCount();
      showToast('Quote request submitted');
      window.location.href = 'index.html?quoteRequest=1';
    });
  }

  function bindContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.reset();
      showToast('Request received');
    });
  }

  function showSuccessBanner() {
    const params = new URLSearchParams(window.location.search);
    const mount = document.querySelector('[data-home-banner]');
    if (mount && params.get('quoteRequest') === '1') {
      mount.innerHTML = '<div class="success-banner">Quote request received. The request includes quantities, delivery method, and job notes for follow-up.</div>';
      history.replaceState({}, '', 'index.html');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
    renderFeatured();
    renderInventoryPage();
    renderProductPage();
    renderCartPage();
    renderCheckoutPage();
    bindContactForm();
    showSuccessBanner();
    bindAddButtons();
  });
})();
