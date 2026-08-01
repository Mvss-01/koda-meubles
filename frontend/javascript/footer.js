function initFooter() {
  const isInContentDir = window.location.pathname.includes('/content/');
  const rootPrefix = isInContentDir ? '../' : './';
  const contentPrefix = isInContentDir ? './' : './content/';

  const footerHTML = `
  <footer>
    <div class="footer-container">
      <div class="footer-top" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 2rem;">
        <div class="footer-brand" style="flex: 1; min-width: 300px;">
          <a href="index.html" class="footer-logo">K&thinsp;O&thinsp;D&thinsp;A</a>
          <p>Où le design rencontre le confort. Nous sélectionnons des meubles de qualité supérieure qui transforment vos espaces de vie en œuvres d'art.</p>
        </div>
        <div class="footer-links" style="display: flex; gap: 2rem;">
          <div class="footer-col">
            <h4>Liens rapides</h4>
            <ul style="display: flex; flex-direction: column; gap: 0.5rem; list-style: none; padding: 0;">
              <li><a href="index.html">Acceuil</a></li>
              <li><a href="products-list.html">Produits</a></li>
              <li><a href="about.html">À propos</a></li>
              <li><a href="contact.html">Contact nous</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-bottom">
        <p>&copy; 2026 KODA. Tous droits réservés.</p>
        <div class="footer-social">
          <a href="#">Facebook</a>
          <a href="#">Instagram</a>
          <a href="#">Email</a>
        </div>
      </div>
    </div>
  </footer>
  `;

  let renderedHTML = footerHTML
    .replace(/href="index\.html"/g, `href="${rootPrefix}index.html"`)
    .replace(/href="products-list\.html"/g, `href="${contentPrefix}products-list.html"`)
    .replace(/href="about\.html"/g, `href="${contentPrefix}about.html"`)
    .replace(/href="contact\.html"/g, `href="${contentPrefix}contact.html"`);

  document.body.insertAdjacentHTML('beforeend', renderedHTML);
}
