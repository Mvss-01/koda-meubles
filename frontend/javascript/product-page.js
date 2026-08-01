async function initProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) return;

  const layoutEl = document.querySelector(".product-layout");
  if (layoutEl) layoutEl.classList.remove("loaded");

  const titleEl = document.querySelector(".product-title");
  const priceEl = document.querySelector(".product-price");
  const descEl = document.querySelector(".product-desc");
  const imgEl = document.querySelector(".product-image-container img");
  const breadcrumbCategory = document.querySelector(".breadcrumb span:last-child");
  const dimensionsEl = document.querySelector(".spec-row:first-child p");

  if (titleEl) titleEl.textContent = "Chargement...";
  if (priceEl) priceEl.textContent = "";
  if (descEl) descEl.textContent = "";
  if (imgEl) {
    imgEl.src = "";
    imgEl.alt = "Chargement...";
  }
  if (breadcrumbCategory) breadcrumbCategory.textContent = "...";
  if (dimensionsEl) dimensionsEl.textContent = "";

  let product = null;
  let catName = "Products";

  const cached = getCachedData ? getCachedData() : null;
  if (cached && cached.products) {
    product = cached.products.find(p => String(p.id) === String(productId));
    if (product && product.category_id && cached.categories) {
      const cat = cached.categories.find(c => c.id === product.category_id);
      if (cat) catName = cat.name;
    }
  }

  if (!product) {
    const { data, error } = await window.supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error || !data) {
      console.error("Product not found:", error);
      return;
    }
    product = data;

    if (product.category_id) {
      const { data: category } = await window.supabaseClient
        .from('categories')
        .select('name')
        .eq('id', product.category_id)
        .single();
      if (category) catName = category.name;
    }
  }



  if (titleEl) titleEl.textContent = product.name;
  if (priceEl) priceEl.textContent = `${product.price} DZD`;
  if (descEl) descEl.textContent = product.description || `${product.name} premium pour sublimer votre espace.`;
  if (imgEl) {
    imgEl.src = product.images;
    imgEl.alt = product.name;
  }
  if (breadcrumbCategory) breadcrumbCategory.textContent = catName;
  if (dimensionsEl) dimensionsEl.textContent = `${product.width_cm || 0}cm L x ${product.height_cm || 0}cm H, Poids: ${product.weight_kg || 0}kg`;

  document.title = `${product.name} - KODA Meubles`;

  if (layoutEl) layoutEl.classList.add("loaded");

  const backLink = document.querySelector(".back-link a");
  if (backLink && document.referrer) {
    if (document.referrer.includes("index.html") || document.referrer.endsWith("/")) {
      backLink.href = "../index.html";
      backLink.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>\n          RETOUR À LA BOUTIQUE`;
    } else if (document.referrer.includes("products-list.html")) {
      backLink.href = "products-list.html";
      backLink.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>\n          RETOUR AUX PRODUITS`;
    }
  }

  const qtyValueEl = document.getElementById("product-quantity");
  const qtyControl = document.getElementById("product-qty-control");
  let currentQty = 1;
  const maxStock = product.stock !== undefined ? product.stock : 1;

  function showStockToast() {
    const existing = qtyControl.querySelector('.stock-toast');
    if (existing) existing.remove();
    const toast = document.createElement('span');
    toast.className = 'stock-toast';
    toast.textContent = 'Stock maximum atteint';
    qtyControl.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  if (qtyControl) {
    const minusBtn = qtyControl.querySelector(".qty-minus");
    const plusBtn = qtyControl.querySelector(".qty-plus");

    function updateQtyDisplay() {
      if (qtyValueEl) qtyValueEl.textContent = currentQty;
      if (minusBtn) minusBtn.classList.toggle("qty-disabled", currentQty <= 1);
      if (plusBtn) plusBtn.classList.toggle("qty-disabled", currentQty >= maxStock);
    }

    updateQtyDisplay();

    if (minusBtn) {
      minusBtn.addEventListener("click", () => {
        if (currentQty > 1) {
          currentQty--;
          updateQtyDisplay();
        }
      });
    }

    if (plusBtn) {
      plusBtn.addEventListener("click", () => {
        if (currentQty < maxStock) {
          currentQty++;
          updateQtyDisplay();
        }
        if (currentQty >= maxStock) {
          showStockToast();
        }
      });
    }
  }

  const addToCartBtn = document.querySelector(".add-to-cart-btn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", async () => {
      const { data: { session }, error } = await window.supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = "login.html";
      } else {
        const quantity = currentQty;

        if (product.stock !== undefined && quantity > product.stock) {
          currentQty = product.stock;
          if (qtyValueEl) qtyValueEl.textContent = currentQty;
          if (qtyControl) showStockToast();
          return;
        }

        const originalText = addToCartBtn.textContent;
        const originalBg = addToCartBtn.style.backgroundColor;

        addToCartBtn.textContent = "AJOUT EN COURS...";
        addToCartBtn.disabled = true;

        if (window.cartAPI) {
          await window.cartAPI.addToCart(product, quantity);
        }

        setTimeout(() => {
          addToCartBtn.textContent = "AJOUTÉ AU PANIER ✓";
          addToCartBtn.style.backgroundColor = "#16a34a";

          setTimeout(() => {
            addToCartBtn.textContent = originalText;
            addToCartBtn.style.backgroundColor = originalBg;
            addToCartBtn.disabled = false;
          }, 2000);
        }, 300);
      }
    });
  }
}
