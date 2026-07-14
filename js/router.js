(function () {
  "use strict";

  const root = window.RE59;

  const routeMeta = {
    properties: { title: "Properties & Units", eyebrow: "PORTFOLIO" },
    overview: { title: "Portfolio Overview", eyebrow: "EXECUTIVE" },
    leases: { title: "Leases", eyebrow: "LEASE MANAGEMENT" },
    tenants: { title: "Tenants", eyebrow: "TENANT DIRECTORY" },
    maintenance: { title: "Maintenance", eyebrow: "OPERATIONS" },
    financials: { title: "Financials", eyebrow: "FINANCIAL CONTROL" },
    reports: { title: "Reports", eyebrow: "PORTFOLIO INTELLIGENCE" },
    users: { title: "Users & Access", eyebrow: "ADMINISTRATION", permission: "admin" },
    settings: { title: "Settings", eyebrow: "ACCOUNT & SYSTEM" },
    import: { title: "Import Portfolio", eyebrow: "DATA MANAGEMENT", permission: "import" },
    actions: { title: "Requires Attention", eyebrow: "PRIORITIES" }
  };

  const routeModules = {
    overview: "dashboard",
    leases: "contracts",
    financials: "payments",
    users: "usersAccess"
  };

  async function navigate(route, params = {}) {
    const resolvedRoute = routeMeta[route] ? route : "overview";
    const meta = routeMeta[resolvedRoute];
    if (meta.permission && !root.auth.can(meta.permission)) {
      root.ui.toast("Your role cannot open that area.", "error");
      return navigate(root.state.user?.role === "ceo" ? "overview" : "properties");
    }

    root.state.route = resolvedRoute;
    root.state.routeParams = params;
    root.ui.setPageHeader(meta.title, meta.eyebrow);
    document.querySelectorAll("[data-route]").forEach((item) => item.classList.toggle("active", item.dataset.route === resolvedRoute));

    const moduleName = routeModules[resolvedRoute] || resolvedRoute;
    const module = root.modules[moduleName] || root.modules.dashboard;
    const view = document.getElementById("app-view");
    view.innerHTML = `<div class="empty-state"><div><strong>Loading</strong><span>Preparing ${meta.title.toLowerCase()}…</span></div></div>`;
    await module.render(view, params);
    view.focus({ preventScroll: true });
    document.body.classList.remove("sidebar-open");
    document.getElementById("mobile-more-sheet")?.classList.add("is-hidden");
    root.events.emit("route:changed", { route: resolvedRoute, params, meta });
  }

  root.router = { navigate, routeMeta };
})();
