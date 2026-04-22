/**
 * Login and sign-up forms on auth.html
 */
const refs = {
  loginForm: document.getElementById("login-form"),
  signupForm: document.getElementById("signup-form"),
  loginError: document.getElementById("login-error"),
  signupError: document.getElementById("signup-error"),
  tabLogin: document.getElementById("tab-login"),
  tabSignup: document.getElementById("tab-signup"),
  panelLogin: document.getElementById("panel-login"),
  panelSignup: document.getElementById("panel-signup"),
  openForgotPassword: document.getElementById("open-forgot-password"),
  forgotPasswordModal: document.getElementById("forgot-password-modal"),
  forgotPasswordClose: document.getElementById("forgot-password-close"),
  forgotPasswordForm: document.getElementById("forgot-password-form"),
  forgotPasswordError: document.getElementById("forgot-password-error"),
  forgotPasswordStatus: document.getElementById("forgot-password-status"),
  sendResetCode: document.getElementById("send-reset-code"),
  resetEmail: document.getElementById("reset-email"),
  resetToken: document.getElementById("reset-token"),
  resetPassword: document.getElementById("reset-password"),
  resetPasswordConfirm: document.getElementById("reset-password-confirm")
};

const showPanel = (which) => {
  const isLogin = which === "login";
  if (refs.panelLogin) refs.panelLogin.hidden = !isLogin;
  if (refs.panelSignup) refs.panelSignup.hidden = isLogin;
  if (refs.tabLogin) {
    refs.tabLogin.setAttribute("aria-selected", isLogin ? "true" : "false");
    refs.tabLogin.tabIndex = isLogin ? 0 : -1;
  }
  if (refs.tabSignup) {
    refs.tabSignup.setAttribute("aria-selected", isLogin ? "false" : "true");
    refs.tabSignup.tabIndex = isLogin ? -1 : 0;
  }
};

const setError = (el, msg) => {
  if (!el) return;
  el.textContent = msg || "";
  el.hidden = !msg;
};

const setStatus = (msg) => {
  if (!refs.forgotPasswordStatus) return;
  refs.forgotPasswordStatus.textContent = msg || "";
};

const handleLogin = async (event) => {
  event.preventDefault();
  setError(refs.loginError, "");
  const email = document.getElementById("login-email")?.value?.trim() || "";
  const password = document.getElementById("login-password")?.value || "";
  try {
    await PlaystackAuth.login(email, password);
    const next = new URLSearchParams(window.location.search).get("return") || "./index.html";
    window.location.href = next;
  } catch (e) {
    setError(refs.loginError, e.message || "Could not sign in.");
  }
};

const handleSignup = async (event) => {
  event.preventDefault();
  setError(refs.signupError, "");
  const email = document.getElementById("signup-email")?.value?.trim() || "";
  const password = document.getElementById("signup-password")?.value || "";
  const confirm = document.getElementById("signup-password-confirm")?.value || "";
  if (password !== confirm) {
    setError(refs.signupError, "Passwords do not match.");
    return;
  }
  try {
    await PlaystackAuth.register(email, password);
    const next = new URLSearchParams(window.location.search).get("return") || "./profile.html";
    window.location.href = next;
  } catch (e) {
    setError(refs.signupError, e.message || "Could not create account.");
  }
};

const handleTabKeyDown = (event, which) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  showPanel(which);
};

const handlePasswordToggle = (event) => {
  const button = event.currentTarget;
  const inputId = button?.dataset?.targetInput;
  if (!inputId) return;
  const input = document.getElementById(inputId);
  if (!input) return;
  const isShowing = input.type === "text";
  input.type = isShowing ? "password" : "text";
  button.setAttribute("aria-pressed", isShowing ? "false" : "true");
  button.setAttribute("aria-label", isShowing ? "Show password" : "Hide password");
  button.textContent = isShowing ? "\u{1F441}" : "\u{1F576}";
};

const openForgotPasswordModal = () => {
  if (!refs.forgotPasswordModal || typeof refs.forgotPasswordModal.showModal !== "function") return;
  refs.forgotPasswordForm?.reset();
  setError(refs.forgotPasswordError, "");
  setStatus("Enter your account email and request a verification code.");
  refs.forgotPasswordModal.showModal();
};

const closeForgotPasswordModal = () => {
  refs.forgotPasswordModal?.close();
};

const handleRequestResetCode = () => {
  setError(refs.forgotPasswordError, "");
  const email = refs.resetEmail?.value?.trim() || "";
  try {
    const result = PlaystackAuth.requestPasswordReset(email);
    setStatus(
      `Verification code sent to ${result.email}. Demo code: ${result.token} (expires in 15 minutes).`
    );
    if (refs.resetToken) refs.resetToken.value = result.token;
  } catch (e) {
    setError(refs.forgotPasswordError, e.message || "Could not send verification code.");
  }
};

const handleResetPassword = async (event) => {
  event.preventDefault();
  setError(refs.forgotPasswordError, "");
  const email = refs.resetEmail?.value?.trim() || "";
  const token = refs.resetToken?.value || "";
  const password = refs.resetPassword?.value || "";
  const confirm = refs.resetPasswordConfirm?.value || "";
  if (password !== confirm) {
    setError(refs.forgotPasswordError, "New passwords do not match.");
    return;
  }
  try {
    await PlaystackAuth.resetPasswordWithToken(email, token, password);
    setStatus("Password reset complete. You can now sign in with your new password.");
    refs.forgotPasswordForm?.reset();
  } catch (e) {
    setError(refs.forgotPasswordError, e.message || "Could not reset password.");
  }
};

refs.tabLogin?.addEventListener("click", () => showPanel("login"));
refs.tabSignup?.addEventListener("click", () => showPanel("signup"));
refs.tabLogin?.addEventListener("keydown", (e) => handleTabKeyDown(e, "login"));
refs.tabSignup?.addEventListener("keydown", (e) => handleTabKeyDown(e, "signup"));

refs.loginForm?.addEventListener("submit", handleLogin);
refs.signupForm?.addEventListener("submit", handleSignup);
refs.openForgotPassword?.addEventListener("click", openForgotPasswordModal);
refs.forgotPasswordClose?.addEventListener("click", closeForgotPasswordModal);
refs.sendResetCode?.addEventListener("click", handleRequestResetCode);
refs.forgotPasswordForm?.addEventListener("submit", handleResetPassword);

const passwordToggles = document.querySelectorAll("[data-password-toggle]");
passwordToggles.forEach((toggleButton) => {
  toggleButton.addEventListener("click", handlePasswordToggle);
});

showPanel("login");
