(function () {
  "use strict";

  const root = window.RE59;
  let initialized = false;

  function closeMore() {
    document.getElementById("mobile-more-sheet")?.classList.add("is-hidden");
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const nav = document.getElementById("mobile-bottom-navigation");
    const sheet = document.getElementById("mobile-more-sheet");
    nav?.addEventListener("click", (event) => {
      const route = event.target.closest("[data-route]");
      if (route) root.router.navigate(route.dataset.route);
    });
    document.getElementById("mobile-more-button")?.addEventListener("click", () => sheet?.classList.remove("is-hidden"));
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
    root.events.on("route:changed", ({ route }) => {
      nav?.querySelectorAll("[data-route]").forEach((button) => button.classList.toggle("active", button.dataset.route === route));
      document.getElementById("mobile-more-button")?.classList.toggle("active", ["leases", "tenants", "reports", "users", "settings"].includes(route));
      closeMore();
    });
  }

  root.mobile = { init, closeMore };
})();
