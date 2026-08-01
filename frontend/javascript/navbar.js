const navbarHTML = `
  <header class="navbar" id="navbar">
    <div class="nav-left">
      <button class="menu-btn" id="menu-btn" aria-label="Open menu">
        <img src="../images/icons/menu-mobile.png" alt="Menu" width="22" height="22">
      </button>
      <a href="index.html" class="logo">
        <span class="logo-text tracking-wide">KODA</span>
      </a>
    </div>
    <div class="nav-center nav-links-desktop">
      <a href="index.html">Accueil</a>
      <a href="products-list.html">Produits</a>
      <a href="about.html">À Propos</a>
      <a href="contact.html">Contact</a>
    </div>
    <div class="nav-right">
      <button class="nav-icon-btn" aria-label="Shopping Bag">
        <img src="../images/icons/panier.png" alt="Panier" width="20" height="20">
      </button>
      <a href="login.html" class="nav-icon-btn" aria-label="Profile">
        <img src="../images/icons/utilisateur.png" alt="Profil" width="20" height="20">
      </a>
    </div>
  </header>

  <div class="overlay" id="overlay"></div>

  <nav class="side-menu" id="side-menu">
    <div class="menu-header">
      <span class="menu-logo">K&thinsp;O&thinsp;D&thinsp;A</span>
      <button class="close-btn" id="close-btn" aria-label="Close menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
    <div class="divider"></div>
    <div class="primary-links">
      <ul>
        <li><a href="../content/index.html" style="animation-delay: 0ms;">Accueil</a></li>
        <li><a href="../content/products-list.html" style="animation-delay: 50ms;">Produits</a></li>
        <li><a href="../content/about.html" style="animation-delay: 100ms;">À Propos</a></li>
        <li><a href="../content/contact.html" style="animation-delay: 150ms;">Contactez-nous</a></li>
      </ul>
    </div>
    <div class="menu-bottom">
      <div class="divider-bottom"></div>
      <div class="social-links">
        <a href="#">Facebook</a>
        <a href="#">Instagram</a>
        <a href="#">Email</a>
      </div>
    </div>
  </nav>
`;

function initNavbar() {
  const isInContentDir = window.location.pathname.includes('/content/');
  const rootPrefix = isInContentDir ? '../' : './';
  const contentPrefix = isInContentDir ? './' : './content/';
  const imgPrefix = isInContentDir ? '../' : './';

  let renderedHTML = navbarHTML
    .replace(/href="index\.html"/g, `href="${rootPrefix}index.html"`)
    .replace(/href="\.\.\/content\/index\.html"/g, `href="${rootPrefix}index.html"`)
    .replace(/href="products-list\.html"/g, `href="${contentPrefix}products-list.html"`)
    .replace(/href="\.\.\/content\/products-list\.html"/g, `href="${contentPrefix}products-list.html"`)
    .replace(/href="about\.html"/g, `href="${contentPrefix}about.html"`)
    .replace(/href="\.\.\/content\/about\.html"/g, `href="${contentPrefix}about.html"`)
    .replace(/href="contact\.html"/g, `href="${contentPrefix}contact.html"`)
    .replace(/href="\.\.\/content\/contact\.html"/g, `href="${contentPrefix}contact.html"`)
    .replace(/href="login\.html"/g, `href="${contentPrefix}login.html"`)
    .replace(/src="\.\.\/images\//g, `src="${imgPrefix}images/`);

  if (!document.getElementById("navbar")) {
    document.body.insertAdjacentHTML('afterbegin', renderedHTML);
  }

  const navbar = document.getElementById("navbar");
  const menuBtn = document.getElementById("menu-btn");
  const closeBtn = document.getElementById("close-btn");
  const overlay = document.getElementById("overlay");
  const sideMenu = document.getElementById("side-menu");

  if (!navbar || !sideMenu) return;

  const menuLinks = sideMenu.querySelectorAll("a");

  const handleScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  const openMenu = () => {
    sideMenu.classList.add("active");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeMenu = () => {
    sideMenu.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  };

  if (menuBtn) menuBtn.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);
  if (overlay) overlay.addEventListener("click", closeMenu);

  menuLinks.forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  const checkAuthAndRenderProfile = async () => {
    if (!window.supabaseClient) return;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    const profileLink = document.querySelector('a[aria-label="Profile"]');

    if (session && profileLink) {
      const user = session.user;
      const firstName = user.user_metadata?.first_name || 'User';
      const initial = firstName.charAt(0).toUpperCase();

      const wrap = document.createElement('div');
      wrap.className = 'user-dropdown-wrap';

      wrap.innerHTML = `
        <button class="user-pill-btn">
          <div class="user-initial">${initial}</div>
          <span class="user-name">${firstName}</span>
        </button>
        <div class="user-dropdown-menu">
          <button id="sign-out-btn">Sign Out</button>
        </div>
      `;

      profileLink.replaceWith(wrap);

      const pillBtn = wrap.querySelector('.user-pill-btn');
      pillBtn.addEventListener('click', () => {
        wrap.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) {
          wrap.classList.remove('active');
        }
      });

      const signOutBtn = wrap.querySelector('#sign-out-btn');
      signOutBtn.addEventListener('click', async () => {
        await window.supabaseClient.auth.signOut();
        window.location.reload();
      });
    }
  };

  checkAuthAndRenderProfile();
}
