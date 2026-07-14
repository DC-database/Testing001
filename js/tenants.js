(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view) {
    const [tenants, units, properties, contracts] = await Promise.all([
      root.data.getTenants(true),
      root.data.getUnits(true),
      root.data.getProperties(true),
      root.data.getContracts(true)
    ]);
    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const contractMap = new Map(contracts.map((row) => [row.id, row]));

    view.innerHTML = `
      <section class="page-heading compact-heading"><div><h1>Tenants</h1></div></section>
      <div class="toolbar">
        <input id="tenant-search" class="search-input" type="search" placeholder="Search tenant, QID / CR, mobile or email">
        <div id="tenant-filter" class="segmented">${["all","active","upcoming","previous"].map((status) => `<button data-status="${status}" class="${status === "active" ? "active" : ""}">${u.titleCase(status)}</button>`).join("")}</div>
      </div>
      <article class="panel desktop-record-table tenant-desktop-table"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Tenant</th><th>Type</th><th>QID / CR</th><th>Property / Unit</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody id="tenant-table-body"></tbody></table></div></article>
      <section id="tenant-mobile-list" class="mobile-record-list tenant-mobile-list" aria-label="Tenant records"></section>`;

    const draw = () => {
      const term = u.normalize(view.querySelector("#tenant-search").value);
      const status = view.querySelector("#tenant-filter button.active")?.dataset.status || "all";
      const filtered = tenants.filter((tenant) => {
        const unit = unitMap.get(tenant.currentUnitId);
        const property = unit ? propertyMap.get(unit.propertyId) : null;
        const matchesStatus = status === "all" || tenant.status === status;
        const matchesText = [tenant.name, tenant.qidOrCr, tenant.mobile, tenant.email, property?.name, unit?.unitNumber].some((value) => u.normalize(value).includes(term));
        return matchesStatus && matchesText;
      });

      view.querySelector("#tenant-table-body").innerHTML = filtered.map((tenant) => {
        const unit = unitMap.get(tenant.currentUnitId);
        const property = unit ? propertyMap.get(unit.propertyId) : null;
        return `<tr class="${unit ? "clickable" : ""}" ${unit ? `data-unit-id="${unit.id}"` : ""}><td><div class="table-title">${u.escapeHTML(tenant.name)}</div><div class="table-subtitle">${u.escapeHTML(tenant.email || "No email")}</div></td><td>${u.escapeHTML(tenant.tenantType)}</td><td>${u.escapeHTML(tenant.qidOrCr || "—")}</td><td>${unit ? `${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit.unitNumber)}` : "Historical record"}</td><td>${u.escapeHTML(tenant.mobile || "—")}</td><td><span class="status-chip ${tenant.status}">${u.titleCase(tenant.status)}</span></td><td>${unit ? "Open unit →" : "—"}</td></tr>`;
      }).join("") || `<tr><td colspan="7">${root.ui.emptyState("No tenants found", "Change the search or status filter.")}</td></tr>`;

      view.querySelector("#tenant-mobile-list").innerHTML = filtered.map((tenant) => {
        const unit = unitMap.get(tenant.currentUnitId);
        const property = unit ? propertyMap.get(unit.propertyId) : null;
        const contract = unit ? contractMap.get(unit.currentContractId) : null;
        const location = unit ? `${property?.code || property?.name || "Property"} · ${unit.unitNumber}` : "Previous tenancy record";
        const leaseLine = tenant.status === "upcoming"
          ? `Starts ${u.date(contract?.startDate)}`
          : contract?.endDate
            ? `Lease ends ${u.date(contract.endDate)}`
            : tenant.status === "previous" ? "Tenancy completed" : "No active lease";
        return `<button type="button" class="mobile-record-card tenant-record-card ${unit ? "" : "is-static"}" ${unit ? `data-unit-id="${unit.id}"` : "disabled"}>
          <span class="mobile-record-top"><b>${u.escapeHTML(tenant.name)}</b><span class="status-chip ${tenant.status}">${u.titleCase(tenant.status)}</span></span>
          <strong>${u.escapeHTML(location)}</strong>
          <span class="mobile-record-meta"><span>Lease</span><b>${u.escapeHTML(leaseLine)}</b></span>
          <span class="mobile-record-meta"><span>Contact</span><b>${u.escapeHTML(tenant.mobile || tenant.email || "—")}</b></span>
          <span class="mobile-record-bottom"><b>${contract ? `${u.money(contract.monthlyRent)} / month` : u.escapeHTML(tenant.tenantType || "Tenant")}</b><i>${unit ? "View tenant →" : "History"}</i></span>
        </button>`;
      }).join("") || root.ui.emptyState("No tenants found", "Change the search or status filter.");

      view.querySelectorAll("[data-unit-id]").forEach((row) => row.addEventListener("click", () => root.modules.unitDetail.open(row.dataset.unitId, "tenant")));
    };

    draw();
    view.querySelector("#tenant-search").addEventListener("input", u.debounce(draw, 120));
    view.querySelectorAll("#tenant-filter button").forEach((button) => button.addEventListener("click", () => {
      view.querySelectorAll("#tenant-filter button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      draw();
    }));
  }

  root.modules.tenants = { render };
})();
