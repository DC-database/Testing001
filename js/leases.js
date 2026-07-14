(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view, params = {}) {
    const [contracts, units, properties, tenants] = await Promise.all([
      root.data.getContracts(true),
      root.data.getUnits(true),
      root.data.getProperties(true),
      root.data.getTenants(true)
    ]);
    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const tenantMap = new Map(tenants.map((row) => [row.id, row]));
    const requested = params.status || "active";

    view.innerHTML = `
      <section class="page-heading">
        <div><div class="eyebrow">LEASE MANAGEMENT</div><h1>Leases</h1><p>Active, upcoming and historical contracts with direct access to the corresponding unit folder.</p></div>
        <div class="page-actions"><button class="button button-secondary" data-print>Print contract register</button></div>
      </section>
      <div class="toolbar">
        <input id="contract-search" class="search-input" type="search" placeholder="Search contract, tenant, property or unit">
        <div id="contract-filter" class="segmented">${["active","expiring","upcoming","completed","expired","all"].map((status) => `<button data-status="${status}" class="${requested === status ? "active" : ""}">${u.titleCase(status)}</button>`).join("")}</div>
      </div>
      <article class="panel"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Contract</th><th>Tenant</th><th>Property / Unit</th><th>Start</th><th>End</th><th>Monthly Rent</th><th>Status</th><th></th></tr></thead><tbody id="contract-table-body"></tbody></table></div></article>`;

    const resolvedStatus = (contract) => {
      if (contract.status === "active") {
        const days = u.daysBetween(new Date(), contract.endDate);
        if (days < 0) return "expired";
        if (days <= 90) return "expiring";
      }
      return contract.status;
    };

    const draw = () => {
      const term = u.normalize(view.querySelector("#contract-search").value);
      const selected = view.querySelector("#contract-filter button.active")?.dataset.status || "active";
      const filtered = contracts.filter((contract) => {
        const unit = unitMap.get(contract.unitId);
        const property = propertyMap.get(contract.propertyId);
        const tenant = tenantMap.get(contract.tenantId);
        const status = resolvedStatus(contract);
        const matchesStatus = selected === "all" || status === selected;
        const matchesText = [contract.contractNumber, tenant?.name, property?.name, unit?.unitNumber, status].some((value) => u.normalize(value).includes(term));
        return matchesStatus && matchesText;
      }).sort((a,b) => new Date(a.endDate) - new Date(b.endDate));
      view.querySelector("#contract-table-body").innerHTML = filtered.map((contract) => {
        const unit = unitMap.get(contract.unitId);
        const property = propertyMap.get(contract.propertyId);
        const tenant = tenantMap.get(contract.tenantId);
        const status = resolvedStatus(contract);
        return `<tr class="clickable" data-unit-id="${contract.unitId}"><td><div class="table-title">${u.escapeHTML(contract.contractNumber)}</div></td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.date(contract.startDate)}</td><td>${u.date(contract.endDate)}</td><td>${u.money(contract.monthlyRent)}</td><td><span class="status-chip ${status}">${u.titleCase(status)}</span></td><td>Open →</td></tr>`;
      }).join("") || `<tr><td colspan="8">${root.ui.emptyState("No contracts found", "Change the search or status filter.")}</td></tr>`;
      view.querySelectorAll("[data-unit-id]").forEach((row) => row.addEventListener("click", () => root.modules.unitDetail.open(row.dataset.unitId, "contract")));
    };

    draw();
    view.querySelector("#contract-search").addEventListener("input", u.debounce(draw, 120));
    view.querySelectorAll("#contract-filter button").forEach((button) => button.addEventListener("click", () => {
      view.querySelectorAll("#contract-filter button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      draw();
    }));
    view.querySelector("[data-print]").addEventListener("click", () => {
      const rows = contracts.map((contract) => {
        const unit = unitMap.get(contract.unitId);
        const property = propertyMap.get(contract.propertyId);
        const tenant = tenantMap.get(contract.tenantId);
        return `<tr><td>${u.escapeHTML(contract.contractNumber)}</td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.date(contract.startDate)}</td><td>${u.date(contract.endDate)}</td><td>${u.money(contract.monthlyRent)}</td><td>${u.titleCase(resolvedStatus(contract))}</td></tr>`;
      }).join("");
      root.ui.printDocument("59 Real Estate Contract Register", `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Private Portfolio System</div></div><div class="meta"><h1 class="title">Contract Register</h1><div>${u.date(new Date())}</div></div></header><table><thead><tr><th>Contract</th><th>Tenant</th><th>Property / Unit</th><th>Start</th><th>End</th><th>Monthly Rent</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">59 Real Estate · Confidential · Generated from current system records</div>`);
    });
  }

  root.modules.contracts = { render };
})();
