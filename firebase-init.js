/**
 * Initializes Firebase when PLAYSTACK_CONFIG.firebase is filled in and the compat SDKs are loaded.
 */
(function initPlaystackFirebase() {
  const cfg = window.PLAYSTACK_CONFIG && window.PLAYSTACK_CONFIG.firebase;
  if (!cfg || !cfg.apiKey || !cfg.projectId) {
    window.__playstackFirebase = null;
    window.waitForFirebaseAuthInit = () => Promise.resolve();
    return;
  }

  if (typeof firebase === "undefined") {
    console.error("Firebase SDK not loaded. Add firebase-app-compat, firebase-auth-compat, and firebase-firestore-compat before this script.");
    window.__playstackFirebase = null;
    window.waitForFirebaseAuthInit = () => Promise.resolve();
    return;
  }

  try {
    firebase.initializeApp(cfg);
  } catch (err) {
    console.error("Firebase initializeApp failed. Check playstack-config.js.", err);
    window.__playstackFirebase = null;
    window.waitForFirebaseAuthInit = () => Promise.resolve();
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

  window.__playstackFirebase = { auth, db, app: firebase.app() };

  window.waitForFirebaseAuthInit = () =>
    new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged(() => {
        unsub();
        resolve();
      });
    });
})();
