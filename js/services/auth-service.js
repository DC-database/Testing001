(function () {
  "use strict";

  const root = window.RE59;
  const SESSION_KEY = "59re.demo.session";
  const ACTIVITY_KEY = "59re.demo.lastActivity";

  const DEMO_USERS = [
    { id: "demo-ceo", email: "ceo@59re.demo", password: "Demo59CEO!", name: "Chief Executive Officer", role: "ceo", roleLabel: "CEO / Owner" },
    { id: "demo-manager", email: "manager@59re.demo", password: "Demo59PM!", name: "Property Manager", role: "manager", roleLabel: "Property Manager" },
    { id: "demo-admin", email: "admin@59re.demo", password: "Demo59ADMIN!", name: "System Administrator", role: "admin", roleLabel: "System Administrator" }
  ];

  const PERMISSIONS = {
    ceo: new Set(["view", "print", "export"]),
    manager: new Set(["view", "create", "update", "archive", "print", "export", "payment", "contract"]),
    admin: new Set(["view", "create", "update", "archive", "delete", "print", "export", "payment", "contract", "admin"])
  };

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
    const user = DEMO_USERS.find((candidate) => candidate.email.toLowerCase() === normalized && candidate.password === password);
    if (!user) throw new Error("The email or password is incorrect.");
    return saveSession(user);
  }

  function quickLogin(role) {
    const user = DEMO_USERS.find((candidate) => candidate.role === role);
    if (!user) throw new Error("Demo account is unavailable.");
    return saveSession(user);
  }

  function restore() {
    try {
      const session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
      if (!session) return null;
      const lastActivity = Number(sessionStorage.getItem(ACTIVITY_KEY) || 0);
      const timeout = root.config.inactivityMinutes * 60 * 1000;
      if (!lastActivity || Date.now() - lastActivity > timeout) {
        logout();
        return null;
      }
      root.state.user = session;
      return session;
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
    return Boolean(role && PERMISSIONS[role]?.has(permission));
  }

  let inactivityTimer = null;
  function startInactivityWatch(onTimeout) {
    const timeout = root.config.inactivityMinutes * 60 * 1000;
    const reset = () => {
      touch();
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        onTimeout?.();
      }, timeout);
    };
    ["click", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
      document.addEventListener(eventName, reset, { passive: true });
    });
    reset();
  }

  root.auth = {
    DEMO_USERS: DEMO_USERS.map(sanitizeUser),
    login,
    quickLogin,
    restore,
    logout,
    can,
    touch,
    startInactivityWatch
  };
})();
