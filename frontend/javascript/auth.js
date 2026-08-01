function initAuth() {
  const togglePwBtn = document.getElementById("toggle-password");
  if (togglePwBtn) {
    const pwField = togglePwBtn.closest(".auth-password-wrap").querySelector("input");
    togglePwBtn.addEventListener("click", () => {
      const isPassword = pwField.type === "password";
      pwField.type = isPassword ? "text" : "password";
      togglePwBtn.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  }

  const signupPassword = document.getElementById("signup-password");
  if (signupPassword) {
    const reqLength = document.getElementById("req-length");
    const reqUpper = document.getElementById("req-upper");
    const reqNumber = document.getElementById("req-number");

    signupPassword.addEventListener("input", () => {
      const val = signupPassword.value;
      reqLength.classList.toggle("met", val.length >= 8);
      reqUpper.classList.toggle("met", /[A-Z]/.test(val));
      reqNumber.classList.toggle("met", /[0-9]/.test(val));
    });
  }

  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const loginEmailInput = document.getElementById("login-email");
    const loginPasswordInput = document.getElementById("login-password");

    [loginEmailInput, loginPasswordInput].forEach(input => {
      if (input) {
        input.addEventListener("input", () => {
          input.classList.remove("invalid");
        });
      }
    });

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("login-submit");
      const email = loginEmailInput.value;
      const pw = loginPasswordInput.value;

      loginEmailInput.classList.remove("invalid");
      loginPasswordInput.classList.remove("invalid");

      let hasError = false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        loginEmailInput.classList.add("invalid");
        hasError = true;
      }

      if (!pw) {
        loginPasswordInput.classList.add("invalid");
        hasError = true;
      }

      if (hasError) {
        const existing = loginForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message error";
        msg.textContent = "Veuillez entrer une adresse e-mail valide et remplir le mot de passe.";
        loginForm.parentNode.insertBefore(msg, loginForm.nextSibling);
        return;
      }

      btn.textContent = "CONNEXION EN COURS...";
      btn.disabled = true;

      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: pw
      });

      if (error) {
        const existing = loginForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message error";
        msg.textContent = error.message;
        loginForm.parentNode.insertBefore(msg, loginForm.nextSibling);
        btn.textContent = "Se Connecter";
        btn.disabled = false;
      } else {
        btn.textContent = "CONNECTÉ";
        const existing = loginForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message success";
        msg.textContent = "Bon retour ! Redirection vers la boutique...";
        loginForm.parentNode.insertBefore(msg, loginForm.nextSibling);
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1500);
      }
    });
  }

  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    const signupPasswordInput = document.getElementById("signup-password");
    const signupEmailInput = document.getElementById("signup-email");
    const signupFirstInput = document.getElementById("signup-first");
    const signupLastInput = document.getElementById("signup-last");

    [signupPasswordInput, signupEmailInput, signupFirstInput, signupLastInput].forEach(input => {
      if (input) {
        input.addEventListener("input", () => {
          input.classList.remove("invalid");
        });
      }
    });

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pw = signupPasswordInput.value;
      const email = signupEmailInput.value;
      const firstName = signupFirstInput.value;
      const lastName = signupLastInput.value;

      signupPasswordInput.classList.remove("invalid");
      signupEmailInput.classList.remove("invalid");
      signupFirstInput.classList.remove("invalid");
      signupLastInput.classList.remove("invalid");

      let hasError = false;
      let errorMsgText = "";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        signupEmailInput.classList.add("invalid");
        hasError = true;
        errorMsgText = "Veuillez entrer une adresse e-mail valide.";
      }

      const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
      if (!nameRegex.test(firstName)) {
        signupFirstInput.classList.add("invalid");
        hasError = true;
        if (!errorMsgText) errorMsgText = "Le prénom ne doit contenir que des lettres.";
      }
      if (!nameRegex.test(lastName)) {
        signupLastInput.classList.add("invalid");
        hasError = true;
        if (!errorMsgText) errorMsgText = "Le nom ne doit contenir que des lettres.";
      }

      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
        signupPasswordInput.classList.add("invalid");
        hasError = true;
        if (!errorMsgText) errorMsgText = "Veuillez respecter toutes les exigences relatives au mot de passe.";
      }

      if (hasError) {
        const existing = signupForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message error";
        msg.textContent = errorMsgText;
        signupForm.parentNode.insertBefore(msg, signupForm.nextSibling);
        return;
      }

      const btn = document.getElementById("signup-submit");
      btn.textContent = "CRÉATION DU COMPTE...";
      btn.disabled = true;

      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: pw,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName
          }
        }
      });

      if (error) {
        const existing = signupForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message error";
        msg.textContent = error.message;
        signupForm.parentNode.insertBefore(msg, signupForm.nextSibling);
        btn.textContent = "Créer un Compte";
        btn.disabled = false;
      } else {
        btn.textContent = "COMPTE CRÉÉ";
        const existing = signupForm.parentNode.querySelector(".auth-message");
        if (existing) existing.remove();
        const msg = document.createElement("div");
        msg.className = "auth-message success";
        msg.textContent = "Un e-mail de confirmation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.";
        signupForm.parentNode.insertBefore(msg, signupForm.nextSibling);
      }
    });
  }
}
