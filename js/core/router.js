(function () {
  "use strict";

  const root = window.RE59;

  const routeMeta = {
    dashboard: { title: "Executive Dashboard", eyebrow: "PORTFOLIO" },
    actions: { title: "Action Center", eyebrow: "PRIORITIES" },
    properties: { title: "Properties", eyebrow: "PORTFOLIO" },
    tenants: { title: "Tenants", eyebrow: "OCCUPANCY" },
    contracts: { title: "Contracts", eyebrow: "LEASE MANAGEMENT" },
    payments: { title: "Payments & Receipts", eyebrow: "FINANCIAL RECORDS" },
    reports: { title: "Reports", eyebrow: "PORTFOLIO INTELLIGENCE" },
    import: { title: "Data Import", eyebrow: "BULK MIGRATION", permission: "create" },
    settings: { title: "System Settings", eyebrow: "ADMINISTRATION", permission: "admin" }
  };

  async function navigate(route, params = {}) {
    const meta = routeMeta[route] || routeMeta.dashboard;
    if (meta.permission && !root.auth.can(meta.permission)) {
      root.ui.toast("Your role cannot open that area.", "error");
      return navigate("dashboard");
    }
    root.state.route = route;
    root.state.routeParams = params;
    root.ui.setPageHeader(meta.title, meta.eyebrow);
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.route === route));
    const module = root.modules[route] || root.modules.dashboard;
    const view = document.getElementById("app-view");
    view.innerHTML = `<div class="empty-state"><div><strong>Loading</strong><span>Preparing ${meta.title.toLowerCase()}…</span></div></div>`;
    await module.render(view, params);
    view.focus({ preventScroll: true });
    document.body.classList.remove("sidebar-open");
  }

  root.router = { navigate, routeMeta };
})();
