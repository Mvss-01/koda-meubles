const DATA_CACHE_KEY = 'koda_data_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedData() {
  try {
    const raw = sessionStorage.getItem(DATA_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(DATA_CACHE_KEY);
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function setCachedData(categories, subcategories, products) {
  try {
    sessionStorage.setItem(DATA_CACHE_KEY, JSON.stringify({
      categories,
      subcategories,
      products,
      timestamp: Date.now()
    }));
  } catch {
  }
}

async function loadData() {
  try {
    const isInContentDir = window.location.pathname.includes('/content/');
    const contentPrefix = isInContentDir ? './' : './content/';
    const productsGrid = document.getElementById('products-grid');
    const popularGrid = document.querySelector('.popular-grid');
    const skeletonHTML = `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-short"></div>
      </div>`;
    if (productsGrid && !productsGrid.children.length) {
      productsGrid.innerHTML = skeletonHTML.repeat(9);
    }
    if (popularGrid && !popularGrid.children.length) {
      popularGrid.innerHTML = skeletonHTML.repeat(4);
    }

    let categories, subcategories, productsData;
    const cached = getCachedData();

    if (cached) {
      categories = cached.categories;
      subcategories = cached.subcategories;
      productsData = cached.products;
    } else {
      const [catRes, subRes, prodRes] = await Promise.all([
        window.supabaseClient.from('categories').select('*'),
        window.supabaseClient.from('subcategories').select('*'),
        window.supabaseClient.from('products').select('*')
      ]);

      if (catRes.error || subRes.error || prodRes.error) {
        console.error('Error loading data:', catRes.error || subRes.error || prodRes.error);
        return;
      }

      categories = catRes.data;
      subcategories = subRes.data;
      productsData = prodRes.data;

      setCachedData(categories, subcategories, productsData);
    }

    const products = productsData ? productsData.filter(p => p.stock > 0) : [];

    const catMap = {};
    if (categories) {
      categories.forEach(c => catMap[c.id] = c.slug);
    }


    const categoriesGrid = document.querySelector('.categories-grid');
    if (categoriesGrid && categories) {
      categoriesGrid.innerHTML = '';
      categories.forEach(cat => {
        const a = document.createElement('a');
        a.href = `${contentPrefix}products-list.html?category=${cat.slug}`;
        a.className = 'category-card';
        a.innerHTML = `
          <div class="category-img">
            <img src="${cat.images}" alt="${cat.name}">
          </div>
          <h3>${cat.name}</h3>
        `;
        categoriesGrid.appendChild(a);
      });
    }


    const topCategoriesList = document.querySelector('.top-categories-list');
    if (topCategoriesList && categories) {
      topCategoriesList.innerHTML = '';
      categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'top-category-pill';
        div.dataset.category = cat.slug;
        div.innerHTML = `
          <span class="clear-btn"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>
          ${cat.name}
        `;
        topCategoriesList.appendChild(div);
      });
    }

    const createProductCard = (prod) => {
      const a = document.createElement('a');
      a.href = `${contentPrefix}product.html?id=${prod.id}`;
      a.className = 'product-card';
      const catSlug = catMap[prod.category_id] || 'all';
      a.dataset.category = catSlug;
      a.dataset.subcategory = prod.subcategory_id || '';
      a.dataset.price = prod.price;

      const rating = parseFloat(prod.rating) || 0;
      const ratingCount = prod.rating_count || 0;

      let starsHTML = '';
      for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
          starsHTML += `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="star filled"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        } else if (rating >= i - 0.5) {
          starsHTML += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="star half">
            <defs>
              <linearGradient id="half-${prod.id}-${i}">
                <stop offset="50%" stop-color="currentColor" />
                <stop offset="50%" stop-color="transparent" />
              </linearGradient>
            </defs>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="url(#half-${prod.id}-${i})"/>
          </svg>`;
        } else {
          starsHTML += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="star empty"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        }
      }

      a.innerHTML = `
        <div class="product-img"><img src="${prod.images}" alt="${prod.name}"></div>
        <div class="product-info">
          <div class="product-info-top">
            <h3>${prod.name}</h3>
            <span class="price">${prod.price} DZD</span>
          </div>
          <div class="product-rating">
            <div class="stars">${starsHTML}</div>
            <span class="rating-count">(${ratingCount})</span>
          </div>
        </div>
      `;
      return a;
    };


    if (popularGrid && products) {
      popularGrid.innerHTML = '';
      const topProducts = [...products].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)).slice(0, 4);
      topProducts.forEach(prod => {
        popularGrid.appendChild(createProductCard(prod));
      });
    }


    if (productsGrid && products) {
      productsGrid.innerHTML = '';
      products.forEach(prod => {
        productsGrid.appendChild(createProductCard(prod));
      });
    }
  } catch (err) {
    console.error('Unexpected error loading data:', err);
  }
}
