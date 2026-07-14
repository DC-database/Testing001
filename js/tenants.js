(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view) {
    const [tenants, units, properties] = await Promise.all([
      root.data.getTenants(true),
      root.data.getUnits(true),
      root.data.getProperties(true)
    ]);
    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));

    view.innerHTML = `
      <section class="page-heading">
        <div><div class="eyebrow">TENANT DIRECTORY</div><h1>Tenants</h1><p>Current, upcoming and previous tenants remain linked to their unit and contract history.</p></div>
      </section>
      <div class="toolbar">
        <input id="tenant-search" class="search-input" type="search" placeholder="Search tenant, QID / CR, mobile or email">
        <div id="tenant-filter" class="segmented">${["all","active","upcoming","previous"].map((status) => `<button data-status="${status}" class="${status === "active" ? "active" : ""}">${u.titleCase(status)}</button>`).join("")}</div>
      </div>
      <article class="panel"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Tenant</th><th>Type</th><th>QID / CR</th><th>Property / Unit</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody id="tenant-table-body"></tbody></table></div></article>`;

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
