function initContact() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const clearError = () => {
      input.classList.remove('invalid');
      const existing = form.parentNode.querySelector('.contact-message');
      if (existing) existing.remove();
    };
    input.addEventListener('input', clearError);
    if (input.tagName === 'SELECT') {
      input.addEventListener('change', clearError);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const subjectSelect = document.getElementById("contact-subject");
    const messageInput = document.getElementById("contact-message");

    const existing = form.parentNode.querySelector(".contact-message");
    if (existing) existing.remove();

    [nameInput, emailInput, messageInput].forEach(inp => {
      if (inp) inp.classList.remove("invalid");
    });

    let hasError = false;
    let errorMsgText = "";

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) {
      nameInput.classList.add("invalid");
      hasError = true;
      if (!errorMsgText) errorMsgText = "Le nom complet est requis.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      emailInput.classList.add("invalid");
      hasError = true;
      if (!errorMsgText) errorMsgText = "Veuillez entrer une adresse e-mail valide.";
    }

    if (!message) {
      messageInput.classList.add("invalid");
      hasError = true;
      if (!errorMsgText) errorMsgText = "Le message ne peut pas être vide.";
    }

    if (hasError) {
      const msg = document.createElement("div");
      msg.className = "contact-message error";
      msg.textContent = errorMsgText;
      form.parentNode.insertBefore(msg, form.nextSibling);
      return;
    }

    const submitBtn = form.querySelector(".contact-submit-btn");
    submitBtn.textContent = "ENVOI EN COURS...";
    submitBtn.disabled = true;

    setTimeout(() => {
      submitBtn.textContent = "Envoyer le message";
      submitBtn.disabled = false;

      const msg = document.createElement("div");
      msg.className = "contact-message success";
      msg.textContent = "Votre message a été envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.";
      form.parentNode.insertBefore(msg, form.nextSibling);
      form.reset();
    }, 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initContact();
});
