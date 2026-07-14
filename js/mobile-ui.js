(function () {
  "use strict";

  const root = window.RE59;
  const MOBILE_BREAKPOINT = 760;
  const MOBILE_SHORT_SIDE = 920;
  let initialized = false;
  let mode = document.documentElement.dataset.ui === "mobile" ? "mobile" : "desktop";

  function detectMode() {
    const narrow = window.innerWidth <= MOBILE_BREAKPOINT;
    const coarse = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    const noHover = window.matchMedia("(hover: none)").matches;
    const shortSide = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
    return narrow || ((coarse || noHover) && shortSide <= MOBILE_SHORT_SIDE) ? "mobile" : "desktop";
  }

  function updateViewportHeight() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
  }

  function applyMode(force) {
    const next = force || detectMode();
    mode = next;
    document.documentElement.dataset.ui = next;
    document.body?.classList.toggle("is-mobile-app", next === "mobile");
    document.body?.classList.toggle("is-desktop-app", next === "desktop");
    document.body?.classList.remove("sidebar-open");
    updateViewportHeight();
    root.events?.emit?.("ui:mode", { mode: next });
    return next;
  }

  function isMobile() {
    return mode === "mobile";
  }

  function closeMore() {
    document.getElementById("mobile-more-sheet")?.classList.add("is-hidden");
    document.body?.classList.remove("mobile-sheet-open");
  }

  function openMore() {
    if (!isMobile()) return;
    document.getElementById("mobile-more-sheet")?.classList.remove("is-hidden");
    document.getElementById("account-menu")?.classList.add("is-hidden");
    document.getElementById("notification-panel")?.classList.add("is-hidden");
    document.body?.classList.add("mobile-sheet-open");
  }

  function init() {
    applyMode();
    if (initialized) return;
    initialized = true;

    const nav = document.getElementById("mobile-bottom-navigation");
    const sheet = document.getElementById("mobile-more-sheet");

    nav?.addEventListener("click", (event) => {
      const route = event.target.closest("[data-route]");
      if (route) root.router.navigate(route.dataset.route);
    });

    document.getElementById("mobile-more-button")?.addEventListener("click", openMore);
    sheet?.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-more]")) return closeMore();
      const route = event.target.closest("[data-route]");
      if (route) {
        closeMore();
        root.router.navigate(route.dataset.route);
      }
      if (event.target.closest("[data-mobile-logout]")) document.getElementById("logout-button")?.click();
    });

    document.getElementById("mobile-fab")?.addEventListener("click", () => root.quickAdd?.open?.());

    document.addEventListener("click", (event) => {
      if (isMobile() && !event.target.closest("#mobile-more-sheet") && !event.target.closest("#mobile-more-button")) closeMore();
    });

    root.events.on("route:changed", ({ route }) => {
      nav?.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("active", button.dataset.route === route));
      document.getElementById("mobile-more-button")?.classList.toggle("active", ["leases", "tenants", "reports", "users", "settings"].includes(route));
      closeMore();
      if (isMobile()) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    window.addEventListener("orientationchange", () => setTimeout(() => applyMode(), 120), { passive: true });
    window.addEventListener("resize", () => {
      updateViewportHeight();
      const next = detectMode();
      if (next !== mode) applyMode(next);
    }, { passive: true });
    window.visualViewport?.addEventListener("resize", updateViewportHeight, { passive: true });
  }

  root.device = { isMobile, mode: () => mode, applyMode };
  root.mobile = { init, closeMore, openMore, applyMode };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => applyMode(), { once: true });
  else applyMode();
})();
