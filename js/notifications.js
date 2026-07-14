(function () {
  "use strict";

  const root = window.RE59;
  let initialized = false;

  function notificationMarkup(action) {
    const icon = action.type === "maintenance" ? "⌁" : action.type === "payment" ? "◫" : action.type === "expiring" || action.type === "past-due" ? "▤" : action.type === "vacant" ? "▥" : "•";
    return `<button type="button" class="notification-item ${action.severity || ""}" data-unit-id="${action.unitId || ""}" data-maintenance-id="${action.maintenanceId || ""}">
      <span class="notification-item-icon">${icon}</span>
      <span><strong>${root.utils.escapeHTML(action.title || "Attention required")}</strong><small>${root.utils.escapeHTML(action.detail || "")}</small></span>
      <b>${root.utils.escapeHTML(action.meta || "")}</b>
    </button>`;
  }

  async function refresh() {
    const button = document.getElementById("notification-button");
    const panel = document.getElementById("notification-panel");
    const count = document.getElementById("notification-count");
    if (!button || !panel || !count || !root.state.user) return;
    try {
      const snapshot = await root.data.getDashboardSnapshot();
      const actions = snapshot.actions.slice(0, 12);
      count.textContent = actions.length > 99 ? "99+" : String(actions.length);
      count.classList.toggle("is-hidden", actions.length === 0);
      panel.innerHTML = `<header><div><strong>Notifications</strong><small>${actions.length ? `${actions.length} item${actions.length === 1 ? "" : "s"} need attention` : "Everything is up to date"}</small></div><button type="button" data-close-notifications>×</button></header>
        <div class="notification-list">${actions.length ? actions.map(notificationMarkup).join("") : root.ui.emptyState("No new alerts", "The portfolio has no urgent notifications.")}</div>
        <footer><button type="button" data-open-overview>Open Portfolio Overview</button></footer>`;
      panel.querySelector("[data-close-notifications]")?.addEventListener("click", () => panel.classList.add("is-hidden"));
      panel.querySelector("[data-open-overview]")?.addEventListener("click", () => {
        panel.classList.add("is-hidden");
        root.router.navigate("overview");
      });
      panel.querySelectorAll("[data-unit-id]").forEach((item) => item.addEventListener("click", () => {
        panel.classList.add("is-hidden");
        if (item.dataset.maintenanceId) root.modules.maintenance.openJob(item.dataset.maintenanceId);
        else if (item.dataset.unitId) root.modules.unitDetail.open(item.dataset.unitId);
      }));
    } catch (error) {
      console.warn("Unable to refresh notifications", error);
    }
  }

  function init() {
    if (!initialized) {
      initialized = true;
      const button = document.getElementById("notification-button");
      const panel = document.getElementById("notification-panel");
      button?.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = panel.classList.contains("is-hidden");
        panel.classList.toggle("is-hidden", !open);
        document.getElementById("account-menu")?.classList.add("is-hidden");
        if (open) refresh();
      });
      document.addEventListener("click", (event) => {
        if (!event.target.closest(".notification-wrap")) panel?.classList.add("is-hidden");
      });
      root.events.on("route:changed", refresh);
    }
    refresh();
  }

  root.notifications = { init, refresh };
})();
