/**
 * Editable profile on profile.html — requires Firebase sign-in when cloud is configured.
 */
const refs = {
  form: document.getElementById("profile-form"),
  displayName: document.getElementById("profile-display-name"),
  bio: document.getElementById("profile-bio"),
  emailDisplay: document.getElementById("profile-email-readonly"),
  status: document.getElementById("profile-save-status"),
  main: document.querySelector("main")
};

const init = async () => {
  if (typeof waitForFirebaseAuthInit === "function") {
    await waitForFirebaseAuthInit();
  }

  const user = PlaystackAuth.getCurrentUser();
  if (!user) {
    window.location.href = `./auth.html?return=${encodeURIComponent("./profile.html")}`;
    return;
  }

  const profile = await PlaystackAuth.getProfile(user.id);
  if (refs.emailDisplay) refs.emailDisplay.textContent = user.email;
  if (refs.displayName) refs.displayName.value = profile.displayName || "";
  if (refs.bio) refs.bio.value = profile.bio || "";

  refs.form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!refs.status) return;
    try {
      await PlaystackAuth.saveProfile(user.id, {
        displayName: refs.displayName?.value?.trim() || "",
        bio: refs.bio?.value?.trim() || ""
      });
      refs.status.textContent = "Profile saved.";
      refs.status.hidden = false;
      setTimeout(() => {
        refs.status.hidden = true;
      }, 2500);
    } catch (e) {
      refs.status.textContent = e.message || "Could not save.";
      refs.status.hidden = false;
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
