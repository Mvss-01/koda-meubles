function initFilters() {
  const categoryFilters = document.querySelectorAll('input[name="category"]');
  const sortFilters = document.querySelectorAll('input[name="sort"]');
  const productsGrid = document.getElementById("products-grid");
  const itemsFound = document.getElementById("items-found");
  const gridViewBtn = document.getElementById("grid-view-btn");
  const listViewBtn = document.getElementById("list-view-btn");

  if (!productsGrid) return;

  const productCardsNodeList = document.querySelectorAll(".product-card");
  const allProducts = Array.from(productCardsNodeList).map(card => ({
    element: card.cloneNode(true),
    category: card.getAttribute("data-category") || "",
    price: parseFloat(card.getAttribute("data-price") || "0")
  }));

  let currentCategory = "all";
  let currentSort = "default";

  const renderProducts = () => {
    let filtered = allProducts;
    if (currentCategory !== "all") {
      filtered = allProducts.filter(p => p.category.includes(currentCategory));
    }

    if (currentSort === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (currentSort === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered = allProducts.filter(p => {
        if (currentCategory === "all") return true;
        return p.category.includes(currentCategory);
      });
    }

    productsGrid.innerHTML = "";
    filtered.forEach(p => {
      productsGrid.appendChild(p.element.cloneNode(true));
    });

    if (itemsFound) itemsFound.textContent = `${filtered.length} Items Found`;
  };

  categoryFilters.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentCategory = e.target.value;
      renderProducts();
    });
  });

  sortFilters.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderProducts();
    });
  });

  if (gridViewBtn) {
    gridViewBtn.addEventListener("click", () => {
      productsGrid.classList.remove("list-view");
      gridViewBtn.classList.add("active");
      if (listViewBtn) listViewBtn.classList.remove("active");
    });
  }

  if (listViewBtn) {
    listViewBtn.addEventListener("click", () => {
      productsGrid.classList.add("list-view");
      listViewBtn.classList.add("active");
      if (gridViewBtn) gridViewBtn.classList.remove("active");
    });
  }
}
