/**
 * PlayStack auth + cloud game storage via Firebase Auth and Firestore.
 * Guest mode (signed out): games stay in localStorage (playstack.games).
 * Signed in: profiles and game library are stored in Firestore under the user’s account.
 */
const LEGACY_GAMES_KEY = "playstack.games";

const getFirebase = () => window.__playstackFirebase || null;

const isConfigured = () => {
  const cfg = window.PLAYSTACK_CONFIG && window.PLAYSTACK_CONFIG.firebase;
  return Boolean(cfg && cfg.apiKey && cfg.projectId);
};

const gamesDocRef = (uid) => getFirebase().db.collection("gameLibrary").doc(uid);

const profileDocRef = (uid) => getFirebase().db.collection("profiles").doc(uid);

const tryReadLegacyGames = () => {
  try {
    const raw = localStorage.getItem(LEGACY_GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistGamesToCloud = async (games, uid) => {
  const ref = gamesDocRef(uid);
  await ref.set(
    {
      games,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
};

const loadGamesForActiveUser = async () => {
  const fb = getFirebase();
  const user = fb && fb.auth.currentUser;
  if (!user) return tryReadLegacyGames();

  const snap = await gamesDocRef(user.uid).get();
  const data = snap.data();
  let games = Array.isArray(data && data.games) ? data.games : [];

  if (games.length === 0) {
    const legacy = tryReadLegacyGames();
    if (legacy.length > 0) {
      games = legacy;
      await persistGamesToCloud(games, user.uid);
    }
  }

  return games;
};

const ensureProfileDoc = async (user) => {
  const ref = profileDocRef(user.uid);
  const snap = await ref.get();
  if (snap.exists) return;
  const email = user.email || "";
  await ref.set({
    displayName: (email.split("@")[0] || "Player").slice(0, 80),
    bio: "",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
};

const registerAccount = async (email, password) => {
  if (!getFirebase()) throw new Error("Firebase is not configured. Add your web app config to playstack-config.js.");
  const cred = await getFirebase().auth.createUserWithEmailAndPassword(email, password);
  await ensureProfileDoc(cred.user);
  return { id: cred.user.uid, email: cred.user.email || email };
};

const loginAccount = async (email, password) => {
  if (!getFirebase()) throw new Error("Firebase is not configured. Add your web app config to playstack-config.js.");
  const cred = await getFirebase().auth.signInWithEmailAndPassword(email, password);
  return { id: cred.user.uid, email: cred.user.email || email };
};

const logoutAccount = async () => {
  if (getFirebase()) {
    await getFirebase().auth.signOut();
  }
};

const getCurrentUser = () => {
  const fb = getFirebase();
  if (!fb) return null;
  const u = fb.auth.currentUser;
  return u ? { id: u.uid, email: u.email || "" } : null;
};

const getProfile = async (userId) => {
  if (!getFirebase()) {
    return { displayName: "", bio: "", updatedAt: Date.now() };
  }
  const snap = await profileDocRef(userId).get();
  if (!snap.exists) {
    return { displayName: "", bio: "", updatedAt: Date.now() };
  }
  const d = snap.data();
  const updatedAt =
    d.updatedAt && typeof d.updatedAt.toMillis === "function" ? d.updatedAt.toMillis() : Date.now();
  return {
    displayName: d.displayName || "",
    bio: d.bio || "",
    updatedAt
  };
};

const saveProfile = async (userId, partial) => {
  if (!getFirebase()) throw new Error("Firebase is not configured.");
  await profileDocRef(userId).set(
    {
      displayName: partial.displayName ?? "",
      bio: partial.bio ?? "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  return partial;
};

const useCloudGames = () => Boolean(getFirebase() && getFirebase().auth.currentUser);

const persistGames = async (games) => {
  const fb = getFirebase();
  const u = fb && fb.auth.currentUser;
  if (!fb || !u) {
    localStorage.setItem(LEGACY_GAMES_KEY, JSON.stringify(games));
    return;
  }
  await persistGamesToCloud(games, u.uid);
};

const getGamesStorageKey = () => LEGACY_GAMES_KEY;

window.PlaystackAuth = {
  register: registerAccount,
  login: loginAccount,
  logout: logoutAccount,
  getCurrentUser,
  getProfile,
  saveProfile,
  getGamesStorageKey,
  loadGamesForActiveUser,
  persistGames,
  isConfigured,
  useCloudGames,
  LEGACY_GAMES_KEY
};
