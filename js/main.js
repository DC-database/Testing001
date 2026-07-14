(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;
  const THEME_KEY = "59re.theme";

  document.addEventListener("DOMContentLoaded", boot);

  async function boot() {
    applyTheme("night", false);
    bindStaticEvents();
    root.ui.showLoading("Preparing local portfolio records…");
    try {
      await root.data.init();
      const user = root.auth.restore();
      if (user) await enterApplication(user);
      else showLogin();
      root.state.initialized = true;
    } catch (error) {
      console.error(error);
      showLogin();
      document.getElementById("login-error").textContent = `Unable to initialize the local database: ${error.message}`;
    } finally {
      root.ui.hideLoading();
    }
  }

  function bindStaticEvents() {
    document.getElementById("toggle-password").addEventListener("click", () => {
      const input = document.getElementById("login-password");
      const button = document.getElementById("toggle-password");
      input.type = input.type === "password" ? "text" : "password";
      button.textContent = input.type === "password" ? "Show" : "Hide";
    });

    document.getElementById("login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = document.getElementById("login-error");
      error.textContent = "";
      try {
        const user = root.auth.login(document.getElementById("login-email").value, document.getElementById("login-password").value);
        await enterApplication(user);
      } catch (loginError) {
        error.textContent = loginError.message;
      }
    });

    document.querySelectorAll("[data-demo-role]").forEach((button) => button.addEventListener("click", async () => {
      try {
        const user = root.auth.quickLogin(button.dataset.demoRole);
        await enterApplication(user);
      } catch (error) { document.getElementById("login-error").textContent = error.message; }
    }));

    document.getElementById("logout-button").addEventListener("click", logout);
    document.getElementById("mobile-menu-button").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    document.getElementById("quick-add-button").addEventListener("click", openQuickAdd);
    document.getElementById("presentation-button").addEventListener("click", () => {
      document.body.classList.toggle("presentation-mode");
      document.getElementById("presentation-button").textContent = document.body.classList.contains("presentation-mode") ? "Exit presentation" : "Presentation";
    });


    const userButton = document.getElementById("topbar-user-button");
    const accountMenu = document.getElementById("account-menu");
    userButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = accountMenu.classList.contains("is-hidden");
      accountMenu.classList.toggle("is-hidden", !willOpen);
      userButton.setAttribute("aria-expanded", String(willOpen));
      document.getElementById("notification-panel")?.classList.add("is-hidden");
    });
    accountMenu.addEventListener("click", (event) => {
      const routeButton = event.target.closest("[data-account-route]");
      if (!routeButton) return;
      accountMenu.classList.add("is-hidden");
      userButton.setAttribute("aria-expanded", "false");
      root.router.navigate(routeButton.dataset.accountRoute);
    });

    document.getElementById("primary-navigation").addEventListener("click", (event) => {
      const item = event.target.closest("[data-route]");
      if (item) root.router.navigate(item.dataset.route);
    });
    document.querySelectorAll(".sidebar-snapshot-link[data-route]").forEach((button) => button.addEventListener("click", () => root.router.navigate(button.dataset.route)));

    const searchInput = document.getElementById("global-search");
    searchInput.addEventListener("input", u.debounce(async () => {
      const panel = document.getElementById("global-search-results");
      const query = searchInput.value.trim();
      if (query.length < 2) {
        panel.classList.add("is-hidden");
        panel.innerHTML = "";
        return;
      }
      const results = await root.data.search(query);
      panel.innerHTML = results.length ? results.map((result) => `<button class="search-result-item" data-result-type="${result.type}" data-result-id="${result.id}" data-unit-id="${result.unitId || ""}"><span><strong>${u.escapeHTML(result.title)}</strong><small>${u.escapeHTML(result.subtitle)}</small></span><b class="search-result-type">${u.escapeHTML(result.type)}</b></button>`).join("") : root.ui.emptyState("No results", "Try another property, unit, tenant or contract.");
      panel.classList.remove("is-hidden");
      panel.querySelectorAll("[data-result-type]").forEach((button) => button.addEventListener("click", () => {
        panel.classList.add("is-hidden");
        searchInput.value = "";
        if (button.dataset.resultType === "property") root.router.navigate("properties", { propertyId: button.dataset.resultId });
        else if (button.dataset.resultType === "maintenance") root.modules.maintenance.openJob(button.dataset.resultId);
        else if (button.dataset.unitId) root.modules.unitDetail.open(button.dataset.unitId);
        else if (button.dataset.resultType === "unit") root.modules.unitDetail.open(button.dataset.resultId);
      }));
    }, 180));

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".global-search-wrap")) document.getElementById("global-search-results").classList.add("is-hidden");
      if (!event.target.closest(".account-wrap")) {
        document.getElementById("account-menu")?.classList.add("is-hidden");
        document.getElementById("topbar-user-button")?.setAttribute("aria-expanded", "false");
      }
    });
  }


  function applyTheme(theme, persist = true) {
    const resolved = theme === "night" ? "night" : "day";
    document.documentElement.dataset.theme = resolved;
    if (persist) localStorage.setItem(THEME_KEY, resolved);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "night" ? "#080808" : "#f3f0e9");
    document.querySelectorAll(".theme-toggle").forEach((button) => {
      const icon = button.querySelector(".theme-icon");
      const label = button.querySelector(".theme-label");
      if (icon) icon.textContent = resolved === "night" ? "☾" : "☀";
      if (label) label.textContent = resolved === "night" ? "Night" : "Day";
      button.setAttribute("aria-label", resolved === "night" ? "Switch to day theme" : "Switch to night theme");
      button.title = resolved === "night" ? "Switch to day theme" : "Switch to night theme";
    });
  }

  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === "night" ? "day" : "night");
  }

  function openQuickAdd() {
    if (!root.auth.can("create")) return root.ui.toast("Your role has read-only access.", "error");
    const instance = root.ui.openModal({
      title: "Create a new record",
      eyebrow: "QUICK ACTIONS",
      size: "medium",
      content: `<div class="quick-action-grid">
        <button class="quick-action-card" data-quick-action="unit"><span class="quick-icon">U</span><strong>Add new unit</strong><small>Select the property directly in the form. You do not need to open the property first.</small></button>
        <button class="quick-action-card" data-quick-action="tenant"><span class="quick-icon">T</span><strong>New tenant & contract</strong><small>Choose a unit, then create the tenant and active contract in one guided form.</small></button>
        <button class="quick-action-card" data-quick-action="payment"><span class="quick-icon">R</span><strong>Record payment</strong><small>Choose an occupied unit, record payment and issue its receipt.</small></button>
        <button class="quick-action-card" data-quick-action="maintenance"><span class="quick-icon">M</span><strong>Maintenance job</strong><small>Create a tenant request, turnover inspection, scheduled repair or renovation job.</small></button>
        <button class="quick-action-card" data-quick-action="property"><span class="quick-icon">P</span><strong>Add property</strong><small>Create another building, villa, shop, warehouse or compound.</small></button>
        <button class="quick-action-card" data-quick-action="search"><span class="quick-icon">⌕</span><strong>Find a record</strong><small>Use the global search to open any property, unit, tenant or contract quickly.</small></button>
      </div>`,
      footer: `<button class="button button-secondary" data-cancel>Close</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelectorAll("[data-quick-action]").forEach((button) => button.addEventListener("click", async () => {
      const action = button.dataset.quickAction;
      instance.close();
      if (action === "unit") return root.modules.properties.openUnitForm();
      if (action === "tenant") return openUnitPicker("tenant");
      if (action === "payment") return openUnitPicker("payment");
      if (action === "maintenance") return root.modules.maintenance.openJobForm();
      if (action === "property") return root.modules.properties.openPropertyForm();
      if (action === "search") {
        document.getElementById("global-search")?.focus();
        return;
      }
    }));
  }

  async function openUnitPicker(action) {
    const [units, properties, tenants] = await Promise.all([
      root.data.getUnits(),
      root.data.getProperties(),
      root.data.getTenants(true)
    ]);
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const tenantMap = new Map(tenants.map((row) => [row.id, row]));
    const eligibleUnits = units.filter((unit) => {
      if (action === "payment") return Boolean(unit.currentContractId && unit.currentTenantId);
      return !["inspection", "maintenance", "renovation", "unavailable"].includes(unit.status);
    });
    const actionTitle = action === "payment" ? "Select unit for payment" : "Select unit for tenant & contract";
    const actionHelp = action === "payment"
      ? "Only units with an active tenant and contract are shown."
      : "Vacant units are shown first. Choose Booked to review an incoming tenant, or Occupied when replacing the current tenant.";
    let selectedStatus = action === "tenant" ? "vacant" : "all";
    const tenantStatusTabs = action === "tenant" ? `<div class="quick-picker-status-row">
      <span class="quick-picker-label">Show units</span>
      <div class="segmented quick-status-segmented" role="tablist" aria-label="Filter units by status">
        <button type="button" class="active" data-quick-status="vacant" role="tab" aria-selected="true">Vacant <b data-quick-count="vacant">0</b></button>
        <button type="button" data-quick-status="booked" role="tab" aria-selected="false">Booked <b data-quick-count="booked">0</b></button>
        <button type="button" data-quick-status="occupied" role="tab" aria-selected="false">Occupied <b data-quick-count="occupied">0</b></button>
        <button type="button" data-quick-status="all" role="tab" aria-selected="false">All eligible <b data-quick-count="all">0</b></button>
      </div>
    </div>` : "";
    const instance = root.ui.openModal({
      title: actionTitle,
      eyebrow: "QUICK NAVIGATION",
      size: "medium",
      content: `<div class="quick-unit-picker">
        <div class="callout">${actionHelp}</div>
        ${tenantStatusTabs}
        <div class="quick-picker-filters">
          <select id="quick-property-filter"><option value="all">All properties</option>${properties.map((property) => `<option value="${property.id}">${u.escapeHTML(property.name)}</option>`).join("")}</select>
          <input id="quick-unit-search" type="search" placeholder="Search property, unit, type or tenant">
        </div>
        <div id="quick-picker-summary" class="quick-picker-summary" aria-live="polite"></div>
        <div id="quick-unit-list" class="quick-unit-list"></div>
      </div>`,
      footer: `<button class="button button-secondary" data-back>Back to quick actions</button><button class="button button-secondary" data-cancel>Cancel</button>`
    });

    const draw = () => {
      const propertyId = instance.modal.querySelector("#quick-property-filter").value;
      const term = u.normalize(instance.modal.querySelector("#quick-unit-search").value);
      const matchingBeforeStatus = eligibleUnits.filter((unit) => {
        const property = propertyMap.get(unit.propertyId);
        const tenant = tenantMap.get(unit.currentTenantId);
        const matchesProperty = propertyId === "all" || unit.propertyId === propertyId;
        const matchesText = [property?.name, property?.code, unit.unitNumber, unit.aptType, unit.specifics, tenant?.name].some((value) => u.normalize(value).includes(term));
        return matchesProperty && matchesText;
      });

      if (action === "tenant") {
        const counts = {
          vacant: matchingBeforeStatus.filter((unit) => unit.status === "vacant").length,
          booked: matchingBeforeStatus.filter((unit) => unit.status === "booked").length,
          occupied: matchingBeforeStatus.filter((unit) => unit.status === "occupied").length,
          all: matchingBeforeStatus.length
        };
        Object.entries(counts).forEach(([status, count]) => {
          const target = instance.modal.querySelector(`[data-quick-count="${status}"]`);
          if (target) target.textContent = count;
        });
      }

      const filtered = matchingBeforeStatus.filter((unit) => selectedStatus === "all" || unit.status === selectedStatus).sort((a, b) => {
        const propertyCompare = String(propertyMap.get(a.propertyId)?.name || "").localeCompare(String(propertyMap.get(b.propertyId)?.name || ""));
        return propertyCompare || String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true });
      });

      const summary = instance.modal.querySelector("#quick-picker-summary");
      if (summary) {
        const label = action === "tenant" && selectedStatus !== "all" ? u.titleCase(selectedStatus) : "eligible";
        summary.innerHTML = `<strong>${filtered.length}</strong> ${label.toLowerCase()} unit${filtered.length === 1 ? "" : "s"} shown`;
      }

      instance.modal.querySelector("#quick-unit-list").innerHTML = filtered.map((unit) => {
        const property = propertyMap.get(unit.propertyId);
        const tenant = tenantMap.get(unit.currentTenantId);
        let actionHint = "Assign tenant";
        if (action === "payment") actionHint = "Record payment";
        else if (unit.status === "occupied") actionHint = "Replace tenant";
        else if (unit.status === "booked") actionHint = unit.currentTenantId ? "Review tenant" : "Assign tenant";
        return `<button class="quick-unit-row" data-unit-id="${unit.id}"><span><strong>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit.unitNumber)}</strong><small>${u.escapeHTML(unit.aptType || "Unit")} · ${u.escapeHTML(tenant?.name || "No current tenant")}</small></span><span><span class="status-chip ${unit.status}">${u.titleCase(unit.status)}</span><b>${actionHint} →</b></span></button>`;
      }).join("") || root.ui.emptyState("No matching units", action === "tenant" ? "Choose another status, property, or search term." : "Change the property filter or search text.");
      instance.modal.querySelectorAll("[data-unit-id]").forEach((button) => button.addEventListener("click", async () => {
        const unitId = button.dataset.unitId;
        instance.close();
        if (action === "payment") await root.modules.unitDetail.recordPayment(unitId);
        else await root.modules.unitDetail.assignTenant(unitId);
      }));
    };

    instance.modal.querySelectorAll("[data-quick-status]").forEach((button) => button.addEventListener("click", () => {
      selectedStatus = button.dataset.quickStatus;
      instance.modal.querySelectorAll("[data-quick-status]").forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", String(active));
      });
      draw();
    }));
    draw();
    instance.modal.querySelector("#quick-property-filter").addEventListener("change", draw);
    instance.modal.querySelector("#quick-unit-search").addEventListener("input", u.debounce(draw, 100));
    instance.modal.querySelector("[data-back]").addEventListener("click", () => { instance.close(); openQuickAdd(); });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
  }

  root.quickAdd = { open: openQuickAdd, selectTenantUnit: () => openUnitPicker("tenant"), selectPaymentUnit: () => openUnitPicker("payment") };

  async function enterApplication(user) {
    applyTheme("night", false);
    document.getElementById("login-screen").classList.add("is-hidden");
    document.getElementById("app-shell").classList.remove("is-hidden");
    document.getElementById("login-password").value = "";
    document.getElementById("login-error").textContent = "";
    root.state.user = user;
    updateUserInterface(user);
    applyRoleNavigation();
    root.auth.startInactivityWatch(() => {
      showLogin();
      root.ui.toast("Session locked after inactivity. Sign in again.", "error", 5000);
    });
    await updateSidebarSnapshot();
    root.mobile?.init?.();
    root.notifications?.init?.();
    await root.router.navigate(user.role === "ceo" ? "overview" : "properties");
  }

  function updateUserInterface(user) {
    const initials = u.initials(user.name);
    ["topbar-user-initials", "account-menu-initials"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = initials;
    });
    ["topbar-user-name", "account-menu-name"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = user.name;
    });
    ["topbar-user-role", "account-menu-role"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = user.roleLabel;
    });
  }

  async function updateSidebarSnapshot() {
    try {
      const snapshot = await root.data.getDashboardSnapshot();
      const values = {
        "snapshot-properties": u.number(snapshot.properties.length),
        "snapshot-units": u.number(snapshot.totalUnits),
        "snapshot-occupancy": u.percent(snapshot.occupancyRate),
        "snapshot-revenue": u.money(snapshot.monthlyRevenue)
      };
      Object.entries(values).forEach(([id, value]) => {
        const target = document.getElementById(id);
        if (target) target.textContent = value;
      });
      const maintenanceCount = document.getElementById("nav-maintenance-count");
      if (maintenanceCount) maintenanceCount.textContent = snapshot.maintenanceSummary?.openCount || 0;
    } catch (error) {
      console.warn("Unable to refresh sidebar snapshot", error);
    }
  }

  function applyRoleNavigation() {
    document.querySelectorAll("[data-permission]").forEach((item) => {
      item.classList.toggle("is-hidden", !root.auth.can(item.dataset.permission));
    });
  }

  function logout() {
    root.auth.logout();
    showLogin();
  }

  function showLogin() {
    applyTheme("night", false);
    document.getElementById("app-shell").classList.add("is-hidden");
    document.getElementById("login-screen").classList.remove("is-hidden");
    document.body.classList.remove("presentation-mode", "sidebar-open");
    document.getElementById("global-search-results").classList.add("is-hidden");
    document.getElementById("account-menu")?.classList.add("is-hidden");
    document.getElementById("notification-panel")?.classList.add("is-hidden");
    document.getElementById("mobile-more-sheet")?.classList.add("is-hidden");
    setTimeout(() => document.getElementById("login-email").focus(), 50);
  }
})();
