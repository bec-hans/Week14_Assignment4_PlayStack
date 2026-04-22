/**
 * Client-side auth and profiles for PlayStack.
 * Passwords are never stored in plain text — only PBKDF2-SHA256 hashes with per-user salts (Web Crypto).
 * Sessions use random tokens registered in localStorage (best-effort for a static app; production apps need a server).
 * Game saves are namespaced per user when logged in; legacy "playstack.games" is used when signed out.
 */
const LEGACY_GAMES_KEY = "playstack.games";
const USERS_KEY = "playstack.auth.users";
const SESSION_KEY = "playstack.auth.session";
const SESSIONS_REGISTRY_KEY = "playstack.auth.sessionRegistry";
const PROFILES_KEY = "playstack.auth.profiles";
const RESET_TOKENS_KEY = "playstack.auth.resetTokens";
const SESSION_MS = 14 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100000;
const RESET_TOKEN_MS = 15 * 60 * 1000;

const textEncoder = new TextEncoder();

const arrayBufferToBase64 = (buf) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (b64) => {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

const pruneExpiredSessions = () => {
  const now = Date.now();
  const reg = loadRegistry().filter((r) => r.exp > now);
  saveRegistry(reg);
};

const pbkdf2Hash = async (password, saltBytes) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  return arrayBufferToBase64(bits);
};

const loadUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const loadProfiles = () => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveProfiles = (profiles) => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

const loadRegistry = () => {
  try {
    const raw = localStorage.getItem(SESSIONS_REGISTRY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveRegistry = (list) => {
  localStorage.setItem(SESSIONS_REGISTRY_KEY, JSON.stringify(list));
};

const loadResetTokens = () => {
  try {
    const raw = localStorage.getItem(RESET_TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveResetTokens = (tokens) => {
  localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));
};

const pruneResetTokens = () => {
  const now = Date.now();
  const valid = loadResetTokens().filter((tokenRecord) => tokenRecord.exp > now && !tokenRecord.used);
  saveResetTokens(valid);
};

const userGamesKey = (userId) => `playstack.games.u.${userId}`;

const migrateGamesToUserIfNeeded = (userId) => {
  const uk = userGamesKey(userId);
  if (localStorage.getItem(uk)) return;
  const legacy = localStorage.getItem(LEGACY_GAMES_KEY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy);
    if (Array.isArray(parsed) && parsed.length > 0) {
      localStorage.setItem(uk, legacy);
    }
  } catch {
    /* ignore */
  }
};

const establishSession = (userId) => {
  pruneExpiredSessions();
  const token = arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(32)));
  const exp = Date.now() + SESSION_MS;
  const reg = loadRegistry().filter((r) => !(r.userId === userId));
  reg.push({ token, userId, exp });
  saveRegistry(reg);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, userId, exp }));
};

const registerAccount = async (email, password) => {
  if (!crypto.subtle) {
    throw new Error("Password security requires a secure context (HTTPS or localhost).");
  }
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }
  const users = loadUsers();
  if (users.some((u) => u.email === emailLower)) {
    throw new Error("That email is already registered.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashB64 = await pbkdf2Hash(password, salt);
  const user = {
    id: crypto.randomUUID(),
    email: emailLower,
    hashB64,
    saltB64: arrayBufferToBase64(salt),
    createdAt: Date.now()
  };
  users.push(user);
  saveUsers(users);
  const profiles = loadProfiles();
  profiles[user.id] = {
    displayName: emailLower.split("@")[0],
    bio: "",
    updatedAt: Date.now()
  };
  saveProfiles(profiles);
  establishSession(user.id);
  migrateGamesToUserIfNeeded(user.id);
  return { id: user.id, email: user.email };
};

const loginAccount = async (email, password) => {
  if (!crypto.subtle) {
    throw new Error("Password security requires a secure context (HTTPS or localhost).");
  }
  const emailLower = email.trim().toLowerCase();
  const users = loadUsers();
  const user = users.find((u) => u.email === emailLower);
  if (!user) {
    throw new Error("Invalid email or password.");
  }
  if (!user.saltB64 || !user.hashB64) {
    throw new Error("Your account record is missing password data. Create a new account or reset your password.");
  }
  const salt = base64ToUint8Array(user.saltB64);
  const hash = await pbkdf2Hash(password, salt);
  if (hash !== user.hashB64) {
    throw new Error("Invalid email or password.");
  }
  establishSession(user.id);
  migrateGamesToUserIfNeeded(user.id);
  return { id: user.id, email: user.email };
};

const requestPasswordReset = (email) => {
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    throw new Error("Enter a valid email address.");
  }
  const users = loadUsers();
  const user = users.find((u) => u.email === emailLower);
  if (!user) {
    throw new Error("No account was found for that email.");
  }
  pruneResetTokens();
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  const exp = Date.now() + RESET_TOKEN_MS;
  const tokens = loadResetTokens();
  tokens.push({ token, userId: user.id, email: user.email, exp, used: false });
  saveResetTokens(tokens);
  return {
    email: user.email,
    token,
    expiresAt: exp
  };
};

const resetPasswordWithToken = async (email, token, newPassword) => {
  if (!crypto.subtle) {
    throw new Error("Password reset requires a secure context (HTTPS or localhost).");
  }
  const emailLower = email.trim().toLowerCase();
  const cleanToken = (token || "").trim();
  if (!cleanToken) {
    throw new Error("Enter your verification code.");
  }
  if (newPassword.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }
  pruneResetTokens();
  const users = loadUsers();
  const user = users.find((u) => u.email === emailLower);
  if (!user) {
    throw new Error("No account was found for that email.");
  }
  const tokens = loadResetTokens();
  const matchingToken = tokens.find(
    (record) => record.email === emailLower && record.token === cleanToken && !record.used && record.exp > Date.now()
  );
  if (!matchingToken) {
    throw new Error("Invalid or expired verification code.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashB64 = await pbkdf2Hash(newPassword, salt);
  const nextUsers = users.map((existingUser) => {
    if (existingUser.id !== user.id) return existingUser;
    return {
      ...existingUser,
      hashB64,
      saltB64: arrayBufferToBase64(salt)
    };
  });
  saveUsers(nextUsers);
  saveResetTokens(
    tokens.map((record) => {
      if (record === matchingToken) return { ...record, used: true };
      return record;
    })
  );
  const registry = loadRegistry().filter((sessionRecord) => sessionRecord.userId !== user.id);
  saveRegistry(registry);
  localStorage.removeItem(SESSION_KEY);
  return { email: user.email };
};

const logoutAccount = () => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      const reg = loadRegistry().filter((r) => r.token !== s.token);
      saveRegistry(reg);
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(SESSION_KEY);
};

const getSessionRecord = () => {
  pruneExpiredSessions();
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (!s.token || !s.userId || s.exp < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const reg = loadRegistry();
    const hit = reg.find((r) => r.token === s.token && r.userId === s.userId && r.exp > Date.now());
    if (!hit) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
};

const getCurrentUser = () => {
  const s = getSessionRecord();
  if (!s) return null;
  const users = loadUsers();
  const u = users.find((x) => x.id === s.userId);
  if (!u) {
    logoutAccount();
    return null;
  }
  return { id: u.id, email: u.email };
};

const getGamesStorageKey = () => {
  const s = getSessionRecord();
  if (s?.userId) return userGamesKey(s.userId);
  return LEGACY_GAMES_KEY;
};

const getProfile = (userId) => {
  const profiles = loadProfiles();
  return (
    profiles[userId] || {
      displayName: "",
      bio: "",
      updatedAt: Date.now()
    }
  );
};

const saveProfile = (userId, partial) => {
  const profiles = loadProfiles();
  const prev = profiles[userId] || {};
  profiles[userId] = {
    ...prev,
    ...partial,
    updatedAt: Date.now()
  };
  saveProfiles(profiles);
  return profiles[userId];
};

window.PlaystackAuth = {
  register: registerAccount,
  login: loginAccount,
  logout: logoutAccount,
  getCurrentUser,
  getGamesStorageKey,
  getProfile,
  saveProfile,
  requestPasswordReset,
  resetPasswordWithToken,
  getSessionRecord,
  LEGACY_GAMES_KEY
};
