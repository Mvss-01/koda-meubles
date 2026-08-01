window.cartAPI = {
  getUser: async () => {
    if (!window.supabaseClient) return null;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    return session?.user || null;
  },

  getCartItems: async () => {
    const user = await window.cartAPI.getUser();
    if (!user) return [];

    const { data, error } = await window.supabaseClient
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart items:', error);
      return [];
    }

    return data.map(item => ({
      cartItemId: item.id,
      product: item.products,
      quantity: item.quantity
    }));
  },

  addToCart: async (product, quantity = 1) => {
    const user = await window.cartAPI.getUser();
    if (!user) {
      const isInContentDir = window.location.pathname.includes('/content/');
      const contentPrefix = isInContentDir ? './' : './content/';
      window.location.href = `${contentPrefix}login.html`;
      return;
    }

    const { data: existing } = await window.supabaseClient
      .from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (existing) {
      await window.supabaseClient
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
    } else {
      await window.supabaseClient
        .from('cart_items')
        .insert([{ user_id: user.id, product_id: product.id, quantity }]);
    }
    await window.cartAPI.updateCartCount();
  },

  removeFromCart: async (productId) => {
    const user = await window.cartAPI.getUser();
    if (!user) return;

    await window.supabaseClient
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    await window.cartAPI.updateCartCount();
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity < 1) return;
    const user = await window.cartAPI.getUser();
    if (!user) return;

    await window.supabaseClient
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);

    await window.cartAPI.updateCartCount();
  },

  clearCart: async () => {
    const user = await window.cartAPI.getUser();
    if (!user) return;

    await window.supabaseClient
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    await window.cartAPI.updateCartCount();
  },

  updateCartCount: async () => {
    const items = await window.cartAPI.getCartItems();
    const count = items.reduce((acc, item) => acc + item.quantity, 0);

    const cartBtns = document.querySelectorAll('button[aria-label="Shopping Bag"], a[aria-label="Shopping Bag"]');
    cartBtns.forEach(btn => {
      let badge = btn.querySelector('.cart-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-badge';
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';

      const isInContentDir = window.location.pathname.includes('/content/');
      const contentPrefix = isInContentDir ? './' : './content/';
      const checkoutUrl = `${contentPrefix}checkout.html`;

      if (btn.tagName.toLowerCase() === 'button') {
        const a = document.createElement('a');
        a.href = checkoutUrl;
        a.className = btn.className;
        a.style.cssText = btn.style.cssText;
        a.setAttribute('aria-label', btn.getAttribute('aria-label'));
        a.innerHTML = btn.innerHTML;
        btn.parentNode.replaceChild(a, btn);
      } else {
        btn.href = checkoutUrl;
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.cartAPI.updateCartCount();
});
