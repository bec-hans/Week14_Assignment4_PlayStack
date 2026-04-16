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
  panelSignup: document.getElementById("panel-signup")
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

refs.tabLogin?.addEventListener("click", () => showPanel("login"));
refs.tabSignup?.addEventListener("click", () => showPanel("signup"));
refs.tabLogin?.addEventListener("keydown", (e) => handleTabKeyDown(e, "login"));
refs.tabSignup?.addEventListener("keydown", (e) => handleTabKeyDown(e, "signup"));

refs.loginForm?.addEventListener("submit", handleLogin);
refs.signupForm?.addEventListener("submit", handleSignup);

showPanel("login");

const banner = document.getElementById("firebase-config-banner");
if (banner && window.PlaystackAuth && !PlaystackAuth.isConfigured()) {
  banner.hidden = false;
}
