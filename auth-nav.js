/**
 * Renders sign-in / sign-out controls into #auth-bar after PlaystackAuth is available.
 */
const renderAuthBar = () => {
  const el = document.getElementById("auth-bar");
  if (!el || !window.PlaystackAuth) return;

  const user = PlaystackAuth.getCurrentUser();
  if (user) {
    el.innerHTML = `
      <div class="auth-bar-inner" role="group" aria-label="Account">
        <span class="auth-email muted">${escapeHtml(user.email)}</span>
        <button type="button" class="btn btn-small" id="auth-logout-btn">Sign out</button>
      </div>
    `;
    const btn = document.getElementById("auth-logout-btn");
    btn?.addEventListener("click", () => {
      PlaystackAuth.logout();
      window.location.reload();
    });
    return;
  }

  el.innerHTML = `
    <div class="auth-bar-inner">
      <a class="btn btn-small" href="./auth.html">Sign in</a>
    </div>
  `;
};

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderAuthBar);
} else {
  renderAuthBar();
}
