(function () {
  "use strict";

  const root = window.RE59;
  const SESSION_KEY = "59re.session";
  const ACTIVITY_KEY = "59re.lastActivity";
  const ACCOUNT_KEY = "59re.localAccounts";
  const ACCESS_KEY = "59re.roleAccess";

  const BASE_USERS = [
    { id: "demo-ceo", email: "ceo@59re.local", password: "Demo59CEO!", name: "Chief Executive Officer", title: "Owner", role: "ceo", roleLabel: "CEO / Owner", active: true },
    { id: "demo-manager", email: "manager@59re.local", password: "Demo59PM!", name: "Property Manager", title: "Property Manager", role: "manager", roleLabel: "Property Manager", active: true },
    { id: "demo-admin", email: "admin@59re.local", password: "Demo59ADMIN!", name: "System Administrator", title: "Administrator", role: "admin", roleLabel: "System Administrator", active: true }
  ];

  const DEFAULT_PERMISSIONS = {
    ceo: ["view", "print", "export"],
    manager: ["view", "create", "update", "archive", "print", "export", "payment", "contract"],
    admin: ["view", "create", "update", "archive", "delete", "print", "export", "payment", "contract", "admin", "import"]
  };

  function readJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  function getAccounts() {
    const saved = readJSON(ACCOUNT_KEY, {});
    return BASE_USERS.map((base) => ({ ...base, ...(saved[base.id] || {}) }));
  }

  function saveAccount(userId, patch) {
    const saved = readJSON(ACCOUNT_KEY, {});
    saved[userId] = { ...(saved[userId] || {}), ...patch };
    writeJSON(ACCOUNT_KEY, saved);
    return getAccounts().find((item) => item.id === userId);
  }

  function getRoleAccess() {
    const saved = readJSON(ACCESS_KEY, {});
    return Object.fromEntries(Object.entries(DEFAULT_PERMISSIONS).map(([role, permissions]) => {
      const resolved = Array.isArray(saved[role]) ? [...saved[role]] : [...permissions];
      const withoutImport = resolved.filter((permission) => permission !== "import");
      if (role === "admin") withoutImport.push("import");
      return [role, Array.from(new Set(withoutImport))];
    }));
  }

  function setRoleAccess(role, permissions) {
    if (!DEFAULT_PERMISSIONS[role]) throw new Error("Unknown role.");
    const current = readJSON(ACCESS_KEY, {});
    const resolved = Array.from(new Set(permissions)).filter((permission) => permission !== "import");
    if (role === "admin") resolved.push("import");
    current[role] = resolved;
    writeJSON(ACCESS_KEY, current);
    return getRoleAccess();
  }

  function sanitizeUser(user) {
    if (!user) return null;
    const { password, ...safe } = user;
    return safe;
  }

  function saveSession(user) {
    const safe = sanitizeUser(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    root.state.user = safe;
    return safe;
  }

  function login(email, password) {
    const normalized = String(email || "").trim().toLowerCase();
    const user = getAccounts().find((candidate) => candidate.email.toLowerCase() === normalized && candidate.password === password);
    if (!user) throw new Error("The email or password is incorrect.");
    if (user.active === false) throw new Error("This account is currently disabled.");
    return saveSession(user);
  }

  function quickLogin(role) {
    const user = getAccounts().find((candidate) => candidate.role === role);
    if (!user) throw new Error("The selected role is unavailable.");
    if (user.active === false) throw new Error("This account is currently disabled.");
    return saveSession(user);
  }

  function restore() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!session) return null;
      const account = getAccounts().find((item) => item.id === session.id);
      if (!account || account.active === false) { logout(); return null; }
      const lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
      const timeout = root.config.inactivityMinutes * 60 * 1000;
      if (!lastActivity || Date.now() - lastActivity > timeout) { logout(); return null; }
      return saveSession(account);
    } catch {
      logout();
      return null;
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ACTIVITY_KEY);
    root.state.user = null;
  }

  function touch() {
    if (root.state.user) sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  }

  function can(permission) {
    const role = root.state.user?.role;
    const permissions = getRoleAccess()[role] || [];
    return permissions.includes(permission);
  }

  function updateCurrentProfile(patch) {
    if (!root.state.user) throw new Error("No user is signed in.");
    const allowed = {};
    if (patch.name != null) allowed.name = String(patch.name).trim();
    if (patch.title != null) allowed.title = String(patch.title).trim();
    if (patch.email != null) allowed.email = String(patch.email).trim().toLowerCase();
    if (!allowed.name || !allowed.email) throw new Error("Name and email are required.");
    const updated = saveAccount(root.state.user.id, allowed);
    return saveSession(updated);
  }

  function changePassword(currentPassword, newPassword) {
    if (!root.state.user) throw new Error("No user is signed in.");
    const account = getAccounts().find((item) => item.id === root.state.user.id);
    if (!account || account.password !== currentPassword) throw new Error("The current password is incorrect.");
    if (String(newPassword || "").length < 10) throw new Error("The new password must contain at least 10 characters.");
    saveAccount(account.id, { password: newPassword });
    return true;
  }

  function updateAccount(userId, patch) {
    if (!can("admin")) throw new Error("Administrator access is required.");
    if (userId === root.state.user?.id && patch.active === false) throw new Error("You cannot disable your own active session.");
    return sanitizeUser(saveAccount(userId, patch));
  }

  let inactivityTimer = null;
  function startInactivityWatch(onTimeout) {
    const timeout = root.config.inactivityMinutes * 60 * 1000;
    const reset = () => {
      touch();
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => { logout(); onTimeout?.(); }, timeout);
    };
    ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => document.addEventListener(eventName, reset, { passive: true }));
    reset();
  }

  root.auth = {
    get DEMO_USERS() { return getAccounts().map(sanitizeUser); },
    getAccounts: () => getAccounts().map(sanitizeUser),
    getRoleAccess,
    setRoleAccess,
    updateAccount,
    updateCurrentProfile,
    changePassword,
    login,
    quickLogin,
    restore,
    logout,
    can,
    touch,
    startInactivityWatch
  };
})();
