document.addEventListener('DOMContentLoaded', async () => {
  const listContainer = document.getElementById('cart-items-list');
  const payBtn = document.getElementById('pay-btn');
  let finalTotal = 0;
  let cartItems = [];

  function parsePrice(product) {
    const priceStr = typeof product.price === 'string' ? product.price : String(product.price);
    return Number(priceStr.replace(/[^0-9.-]+/g, ""));
  }

  async function renderCheckout() {
    cartItems = await window.cartAPI.getCartItems();

    if (cartItems.length === 0) {
      listContainer.innerHTML = '<p class="empty-cart-msg">Votre panier est vide.</p>';
      if (payBtn) payBtn.disabled = true;
      const subtotalEl = document.getElementById('summary-subtotal');
      const shippingEl = document.getElementById('summary-shipping');
      const totalEl = document.getElementById('summary-total');
      if (subtotalEl) subtotalEl.textContent = '0 DZD';
      if (shippingEl) shippingEl.textContent = 'Gratuit';
      if (totalEl) totalEl.textContent = '0 DZD';
      if (payBtn) payBtn.textContent = 'Commander';
      return;
    }

    let listHTML = '';
    let subtotal = 0;

    cartItems.forEach(item => {
      const priceNum = parsePrice(item.product);
      const lineTotal = priceNum * item.quantity;
      subtotal += lineTotal;
      const maxStock = item.product.stock || 999;

      listHTML += `
        <div class="cart-item">
          <div class="cart-item-img-wrap">
            <img src="${item.product.images || '.images/popular/luxe-lounger.jpg'}" alt="${item.product.name}">
          </div>
          <div class="cart-item-details">
            <div class="cart-item-name">${item.product.name}</div>
            <div class="cart-item-meta">
              <div class="qty-control qty-control-sm" data-id="${item.product.id}" data-stock="${maxStock}">
                <button type="button" class="qty-btn qty-minus${item.quantity <= 1 ? ' qty-disabled' : ''}" aria-label="Diminuer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <span class="qty-value">${item.quantity}</span>
                <button type="button" class="qty-btn qty-plus${item.quantity >= maxStock ? ' qty-disabled' : ''}" aria-label="Augmenter">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              <button type="button" class="remove-item-btn" data-id="${item.product.id}" aria-label="Supprimer">
                <img src="../images/icons/trash.png" alt="Supprimer" width="16" height="16">
              </button>
            </div>
          </div>
          <div class="cart-item-price">${lineTotal.toLocaleString()} DZD</div>
        </div>
      `;
    });

    listContainer.innerHTML = listHTML;

    finalTotal = subtotal;

    const subtotalEl = document.getElementById('summary-subtotal');
    const shippingEl = document.getElementById('summary-shipping');
    const totalEl = document.getElementById('summary-total');

    if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + ' DZD';
    if (shippingEl) shippingEl.textContent = 'Gratuit';
    if (totalEl) totalEl.textContent = finalTotal.toLocaleString() + ' DZD';

    if (payBtn) {
      payBtn.textContent = `Commander · ${finalTotal.toLocaleString()} DZD`;
      payBtn.disabled = false;
    }

    document.querySelectorAll('.qty-control[data-id]').forEach(control => {
      const productId = control.dataset.id;
      const stock = parseInt(control.dataset.stock) || 999;
      const minusBtn = control.querySelector('.qty-minus');
      const plusBtn = control.querySelector('.qty-plus');
      const valEl = control.querySelector('.qty-value');

      function showStockToast() {
        const existing = control.querySelector('.stock-toast');
        if (existing) existing.remove();
        const toast = document.createElement('span');
        toast.className = 'stock-toast';
        toast.textContent = 'Stock maximum atteint';
        control.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
      }

      function updateCartTotals() {
        let subtotal = 0;
        document.querySelectorAll('.cart-item').forEach(item => {
          const priceEl = item.querySelector('.cart-item-price');
          const qtyEl = item.querySelector('.qty-value');
          const ctrl = item.querySelector('.qty-control[data-id]');
          if (priceEl && qtyEl && ctrl) {
            const pid = ctrl.dataset.id;
            const cartItem = cartItems.find(ci => String(ci.product.id) === String(pid));
            if (cartItem) {
              const priceNum = parsePrice(cartItem.product);
              const qty = parseInt(qtyEl.textContent) || 1;
              const lineTotal = priceNum * qty;
              priceEl.textContent = lineTotal.toLocaleString() + ' DZD';
              subtotal += lineTotal;
            }
          }
        });
        finalTotal = subtotal;
        const subtotalEl = document.getElementById('summary-subtotal');
        const totalEl = document.getElementById('summary-total');
        if (subtotalEl) subtotalEl.textContent = subtotal.toLocaleString() + ' DZD';
        if (totalEl) totalEl.textContent = finalTotal.toLocaleString() + ' DZD';
        if (payBtn) payBtn.textContent = `Commander · ${finalTotal.toLocaleString()} DZD`;
      }

      if (minusBtn) {
        minusBtn.addEventListener('click', async () => {
          let qty = parseInt(valEl.textContent) || 1;
          if (qty <= 1) return;
          qty--;
          valEl.textContent = qty;
          // Update button states
          minusBtn.classList.toggle('qty-disabled', qty <= 1);
          plusBtn.classList.remove('qty-disabled');
          updateCartTotals();
          await window.cartAPI.updateQuantity(productId, qty);
        });
      }

      if (plusBtn) {
        plusBtn.addEventListener('click', async () => {
          let qty = parseInt(valEl.textContent) || 1;
          if (qty >= stock) {
            showStockToast();
            return;
          }
          qty++;
          valEl.textContent = qty;
          plusBtn.classList.toggle('qty-disabled', qty >= stock);
          minusBtn.classList.remove('qty-disabled');
          updateCartTotals();
          await window.cartAPI.updateQuantity(productId, qty);
        });
      }
    });

    document.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.currentTarget.dataset.id;
        const cartItem = e.currentTarget.closest('.cart-item');
        if (cartItem) {
          cartItem.style.transition = 'opacity 0.25s, transform 0.25s';
          cartItem.style.opacity = '0';
          cartItem.style.transform = 'translateX(20px)';
        }
        setTimeout(async () => {
          await window.cartAPI.removeFromCart(productId);
          renderCheckout();
        }, 250);
      });
    });
  }

  await renderCheckout();

  const form = document.getElementById('checkout-form');
  if (form) {
    const inputs = form.querySelectorAll('.form-input, .form-select');
    inputs.forEach(input => {
      const clearError = () => {
        input.classList.remove('invalid');
        const existing = document.querySelector('.checkout-error-msg');
        if (existing) existing.remove();
      };
      input.addEventListener('input', clearError);
      if (input.tagName === 'SELECT') {
        input.addEventListener('change', clearError);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (cartItems.length === 0) return;

      const showError = (msg) => {
        const existing = document.querySelector('.checkout-error-msg');
        if (existing) existing.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'checkout-error-msg';
        errorDiv.style.color = '#dc2626';
        errorDiv.style.marginBottom = '1rem';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.fontWeight = '500';
        errorDiv.textContent = msg;
        payBtn.parentNode.insertBefore(errorDiv, payBtn);
        if (payBtn) {
          payBtn.textContent = `Commander`;
          payBtn.disabled = false;
        }
      };

      try {
        const wilayaSelect = document.getElementById('checkout-wilaya');
        const firstNameInput = document.getElementById('checkout-firstname');
        const lastNameInput = document.getElementById('checkout-lastname');
        const addressInput = document.getElementById('checkout-address');
        const phoneInput = document.getElementById('checkout-phone');
        const emailInput = document.getElementById('checkout-email');

        const wilayaVal = wilayaSelect.options[wilayaSelect.selectedIndex]?.value;
        const wilaya = wilayaSelect.options[wilayaSelect.selectedIndex]?.text || '';
        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const address = addressInput.value.trim();
        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();

        [wilayaSelect, firstNameInput, lastNameInput, addressInput, phoneInput, emailInput].forEach(el => {
          if (el) el.classList.remove('invalid');
        });

        let hasError = false;
        let firstErrorMsg = "";

        if (!wilayaVal) {
          wilayaSelect.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "Veuillez sélectionner votre Wilaya.";
        }

        if (!firstName) {
          firstNameInput.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "Le prénom est requis.";
        } else {
          const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
          if (!nameRegex.test(firstName)) {
            firstNameInput.classList.add('invalid');
            hasError = true;
            if (!firstErrorMsg) firstErrorMsg = "Le prénom ne doit contenir que des lettres.";
          }
        }

        if (!lastName) {
          lastNameInput.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "Le nom est requis.";
        } else {
          const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
          if (!nameRegex.test(lastName)) {
            lastNameInput.classList.add('invalid');
            hasError = true;
            if (!firstErrorMsg) firstErrorMsg = "Le nom ne doit contenir que des lettres.";
          }
        }

        if (!address) {
          addressInput.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "L'adresse complète est requise.";
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
          phoneInput.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "Le numéro de téléphone doit contenir exactement 10 chiffres.";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          emailInput.classList.add('invalid');
          hasError = true;
          if (!firstErrorMsg) firstErrorMsg = "Veuillez entrer une adresse e-mail valide.";
        }

        if (hasError) {
          return showError(firstErrorMsg);
        }

        if (payBtn) {
          payBtn.textContent = "Traitement...";
          payBtn.disabled = true;
        }

        const fullAddress = address;
        const fullName = `${firstName} ${lastName}`;

        const user = await window.cartAPI.getUser();
        if (!user) throw new Error("Not logged in");

        const { data: orderData, error: orderError } = await window.supabaseClient
          .from('orders')
          .insert([{
            status: 'pending',
            total_amount: finalTotal,
            adress: fullAddress,
            phone_number: phone,
            user_id: user.id,
            wilaya: wilaya,
            full_name: fullName
          }])
          .select()
          .single();

        if (orderError) throw orderError;

        for (const item of cartItems) {
          const priceNum = parsePrice(item.product);

          await window.supabaseClient
            .from('order_items')
            .insert([{
              order_id: orderData.id,
              product_id: item.product.id,
              quantity: item.quantity,
              unit_price: priceNum
            }]);

          const newStock = Math.max(0, (item.product.stock || 0) - item.quantity);
          await window.supabaseClient
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product.id);
        }

        await window.cartAPI.clearCart();

        const main = document.getElementById('checkout-main');
        main.innerHTML = `
          <div class="success-screen">
            <div class="success-box">
              <div class="success-icon-wrap">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <h1 class="success-title">Commande Confirmée</h1>
              <p class="success-desc">Merci pour votre achat. Nous avons bien reçu votre commande et la préparons pour l'expédition. Nous vous enverrons un e-mail lorsqu'elle sera en route.</p>
              <a href="../index.html" class="continue-shopping-btn">Continuer vos achats</a>
            </div>
          </div>
        `;
      } catch (err) {
        console.error("Checkout error:", err);
        if (payBtn) {
          payBtn.textContent = `Erreur - Réessayer`;
          payBtn.disabled = false;
        }
      }
    });
  }
});
