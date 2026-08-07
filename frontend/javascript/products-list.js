function initProductsList() {
  const sortSelect = document.getElementById('sort-select');
  const searchInput = document.getElementById('search-input');

  const productsGrid = document.getElementById("products-grid");
  const itemsFound = document.getElementById("items-found");

  const paginationContainer = document.querySelector(".pagination");
  const prevPageBtn = document.querySelector(".pag-btn.group-hover-left");
  const nextPageBtn = document.querySelector(".pag-btn.group-hover-right");
  const pagDotsContainer = document.querySelector(".pag-dots");

  if (!productsGrid) return;

  const productCardsNodeList = document.querySelectorAll(".product-card");
  const allProducts = Array.from(productCardsNodeList).map(card => {
    const titleEl = card.querySelector('.product-info h3');
    return {
      element: card.cloneNode(true),
      category: card.getAttribute("data-category") || "",
      subcategory: card.getAttribute("data-subcategory") || "",
      price: parseFloat(card.getAttribute("data-price") || "0"),
      title: titleEl ? titleEl.textContent.toLowerCase() : ""
    };
  });

  let currentCategory = "all";
  let currentSubcategory = "all";
  let currentSort = "default";
  let currentSearch = "";
  let currentPage = 1;
  let currentTotalPages = 1;
  const itemsPerPage = 9;

  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    currentCategory = categoryParam;
  }

  const saved = sessionStorage.getItem('productsListState');
  if (saved) {
    try {
      const state = JSON.parse(saved);
      currentSort = state.sort || "default";
      currentSearch = state.search || "";
      currentPage = state.page || 1;

      // Only inherit subcategory if category matches
      if (state.category === currentCategory) {
        currentSubcategory = state.subcategory || "all";
      } else {
        currentSubcategory = "all";
      }

      if (sortSelect) sortSelect.value = currentSort;
      if (searchInput) searchInput.value = currentSearch;
    } catch (e) {
      console.error(e);
    }
  }

  const saveState = () => {
    sessionStorage.setItem('productsListState', JSON.stringify({
      category: currentCategory,
      sort: currentSort,
      search: currentSearch,
      page: currentPage,
      subcategory: currentSubcategory
    }));
  };

  const renderProducts = () => {
    let filtered = allProducts.filter(p => {
      let matchCat = currentCategory === "all" || p.category === currentCategory;
      let matchSubcat = currentSubcategory === "all" || String(p.subcategory) === String(currentSubcategory);
      let matchSearch = currentSearch.trim() === "" || p.title.includes(currentSearch.trim().toLowerCase());
      return matchCat && matchSubcat && matchSearch;
    });

    if (currentSort === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    currentTotalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > currentTotalPages && currentTotalPages > 0) {
      currentPage = currentTotalPages;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = filtered.slice(startIndex, endIndex);

    productsGrid.innerHTML = "";
    if (paginatedProducts.length === 0) {
      productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 2rem;">Aucun produit ne correspond à votre recherche.</p>';
    } else {
      paginatedProducts.forEach(p => {
        productsGrid.appendChild(p.element.cloneNode(true));
      });
    }

    if (itemsFound) itemsFound.textContent = `${filtered.length} Items Found`;

    renderPagination();
  };

  const renderPagination = () => {
    if (!paginationContainer) return;

    if (currentTotalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    paginationContainer.style.display = 'flex';

    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage === 1;
      prevPageBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
      prevPageBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage === currentTotalPages;
      nextPageBtn.style.opacity = currentPage === currentTotalPages ? '0.5' : '1';
      nextPageBtn.style.cursor = currentPage === currentTotalPages ? 'not-allowed' : 'pointer';
    }

    if (pagDotsContainer) {
      pagDotsContainer.innerHTML = '';
      for (let i = 1; i <= currentTotalPages; i++) {
        const dot = document.createElement('div');
        dot.className = `dot ${i === currentPage ? 'active-dot' : ''}`;
        dot.addEventListener('click', () => {
          currentPage = i;
          saveState();
          renderProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        pagDotsContainer.appendChild(dot);
      }
    }
  };

  const updateCategoryUI = (categoryValue) => {
    const pills = document.querySelectorAll('.top-categories-list .top-category-pill');
    pills.forEach(pill => {
      const pillCat = pill.dataset.category || 'all';
      if (pillCat === categoryValue) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    const subList = document.querySelector('.subcategories-list');
    if (subList) {
      if (categoryValue === 'all') {
        subList.style.height = '0';
        setTimeout(() => { subList.style.display = 'none'; }, 300);
        return;
      }
      
      const cached = window.getCachedData ? window.getCachedData() : null;
      if (cached && cached.categories && cached.subcategories) {
        const catObj = cached.categories.find(c => c.slug === categoryValue);
        if (catObj) {
          const matchingSubs = cached.subcategories.filter(s => s.category_id === catObj.id);
          if (matchingSubs.length > 0) {
            subList.innerHTML = `<div class="top-category-pill ${currentSubcategory === 'all' ? 'active' : ''}" data-subcategory="all" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: 9999px; background: ${currentSubcategory === 'all' ? '#111827' : '#f3f4f6'}; color: ${currentSubcategory === 'all' ? '#ffffff' : '#111827'}; font-size: 0.875rem; font-weight: 600;">Tout</div>` +
              matchingSubs.map(sub => `
                <div class="top-category-pill ${String(currentSubcategory) === String(sub.id) ? 'active' : ''}" data-subcategory="${sub.id}" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: 9999px; background: ${String(currentSubcategory) === String(sub.id) ? '#111827' : '#f3f4f6'}; color: ${String(currentSubcategory) === String(sub.id) ? '#ffffff' : '#111827'}; font-size: 0.875rem; font-weight: 600;">${sub.name}</div>
              `).join('');
            
            subList.style.display = 'flex';
            subList.style.flexWrap = 'wrap';
            subList.style.justifyContent = 'center';
            subList.style.gap = '0.5rem';
            
            setTimeout(() => { subList.style.height = 'auto'; }, 10);
            
            subList.querySelectorAll('.top-category-pill').forEach(spill => {
              spill.addEventListener('click', () => {
                currentSubcategory = spill.dataset.subcategory;
                currentPage = 1;
                updateCategoryUI(currentCategory);
                saveState();
                renderProducts();
              });
            });
          } else {
            subList.style.height = '0';
            setTimeout(() => { subList.style.display = 'none'; }, 300);
          }
        }
      }
    }
  };

  const topCategoriesContainer = document.querySelector('.top-categories-list');
  if (topCategoriesContainer) {
    topCategoriesContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.top-category-pill');
      if (pill) {
        const cat = pill.dataset.category || "all";
        currentCategory = cat;
        currentSubcategory = "all";
        currentPage = 1;
        updateCategoryUI(currentCategory);
        saveState();
        renderProducts();
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      currentPage = 1;
      saveState();
      renderProducts();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      currentPage = 1;
      saveState();
      renderProducts();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        saveState();
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      if (currentPage < currentTotalPages) {
        currentPage++;
        saveState();
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  updateCategoryUI(currentCategory);
  renderProducts();
  saveState();
}
