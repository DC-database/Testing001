(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  function statusBar(property, showCount = false) {
    const total = property.totalUnits || 1;
    return `<div class="premium-stacked-bar" title="${property.occupied} occupied · ${property.booked} booked · ${property.vacant} ready · ${property.maintenance} maintenance / renovation">
      <span class="occupied" style="width:${property.occupied / total * 100}%"></span>
      <span class="booked" style="width:${property.booked / total * 100}%"></span>
      <span class="vacant" style="width:${property.vacant / total * 100}%"></span>
      <span class="maintenance" style="width:${property.maintenance / total * 100}%"></span>
      ${showCount ? `<b>${u.number(property.totalUnits)}</b>` : ""}
    </div>`;
  }

  function riskLevel(count) {
    if (count >= 10) return { label: "HIGH", className: "high" };
    if (count >= 6) return { label: "MED", className: "medium" };
    return { label: "LOW", className: "low" };
  }

  function propertyRow(property) {
    const average = property.occupied ? property.monthlyRevenue / property.occupied : 0;
    const occupancyClass = property.occupancyRate >= 95 ? "excellent" : property.occupancyRate >= 80 ? "good" : "attention";
    return `<tr class="clickable" data-property-id="${property.id}">
      <td><div class="property-table-name"><span>${u.escapeHTML(property.code)}</span><div><strong>${u.escapeHTML(property.name)}</strong><small>${u.escapeHTML(property.type || property.location || "Property")}</small></div></div></td>
      <td>${u.number(property.totalUnits)}</td>
      <td><b class="count-positive">${u.number(property.occupied)}</b></td>
      <td><b class="count-booked">${u.number(property.booked)}</b></td>
      <td><b class="count-vacant">${u.number(property.vacant)}</b></td>
      <td><div class="occupancy-cell"><strong class="${occupancyClass}">${u.percent(property.occupancyRate)}</strong>${statusBar(property)}</div></td>
      <td><strong>${u.money(property.monthlyRevenue)}</strong></td>
      <td>${u.money(property.annualRevenue)}</td>
      <td>${u.money(average)}</td>
    </tr>`;
  }

  async function render(view) {
    const snapshot = await root.data.getDashboardSnapshot();
    const propertiesByRevenue = [...snapshot.properties].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
    const propertiesByOccupancy = [...snapshot.properties].sort((a, b) => a.occupancyRate - b.occupancyRate);
    const maxRevenue = Math.max(...propertiesByRevenue.map((item) => item.annualRevenue), 1);
    const maxExpiry = Math.max(...snapshot.leaseBuckets.map((item) => item.count), 1);
    const maxMaintenancePropertyCost = Math.max(...snapshot.maintenanceSummary.costsByProperty.map((item) => item.cost), 1);
    const maxMaintenanceMonthlyCost = Math.max(...snapshot.maintenanceSummary.costsByMonth.map((item) => item.cost), 1);
    const statusTotal = snapshot.totalUnits || 1;
    const occupiedEnd = snapshot.occupied / statusTotal * 360;
    const bookedEnd = occupiedEnd + snapshot.booked / statusTotal * 360;
    const vacantEnd = bookedEnd + snapshot.vacant / statusTotal * 360;
    const maintenanceDisplay = Math.max(0, snapshot.totalUnits - snapshot.occupied - snapshot.booked - snapshot.vacant);
    const highestRevenue = propertiesByRevenue[0];
    const lowestOccupancy = propertiesByOccupancy[0];
    const integrityGood = snapshot.integrityIssues.length === 0;
    const actionBadge = document.getElementById("nav-action-count");
    if (actionBadge) actionBadge.textContent = snapshot.actions.length;
    const maintenanceNavCount = document.getElementById("nav-maintenance-count");
    if (maintenanceNavCount) maintenanceNavCount.textContent = snapshot.maintenanceSummary.openCount;

    view.innerHTML = `
      <section class="dashboard-hero">
        <div class="dashboard-hero-copy">
          <div class="live-eyebrow"><span></span> LIVE PORTFOLIO · CURRENT RECORDS</div>
          <h1>Portfolio Overview</h1>
          
        </div>
        <div class="dashboard-hero-actions">
          <button class="button button-ghost" data-open-report="portfolio">Executive PDF</button>
          ${root.auth.can("create") ? `<button class="button button-light" data-route-properties>Manage records</button>` : `<button class="button button-light" data-route-properties>Explore properties</button>`}
        </div>
      </section>

      ${root.auth.can("create") ? `<section class="dashboard-quick-actions" aria-label="Quick actions">
        <button class="dashboard-quick-action" data-dashboard-quick="unit"><i>＋</i><span><strong>Add unit</strong><small>Choose property in the form</small></span></button>
        <button class="dashboard-quick-action" data-dashboard-quick="tenant"><i>T</i><span><strong>New tenant</strong><small>Assign tenant and contract</small></span></button>
        <button class="dashboard-quick-action" data-dashboard-quick="payment"><i>R</i><span><strong>Record payment</strong><small>Issue a receipt immediately</small></span></button>
        <button class="dashboard-quick-action" data-dashboard-quick="maintenance"><i>M</i><span><strong>Maintenance</strong><small>Create and schedule a work order</small></span></button>
      </section>` : ""}

      <section class="portfolio-kpi-grid" aria-label="Portfolio summary">
        <article class="portfolio-kpi clickable" data-kpi="units"><span>Total units</span><strong>${u.number(snapshot.totalUnits)}</strong><small>${u.number(snapshot.totalProperties)} properties</small></article>
        <article class="portfolio-kpi occupied clickable" data-kpi="occupied"><span>Occupied</span><strong>${u.number(snapshot.occupied)}</strong><small>${u.percent(snapshot.occupancyRate)} portfolio rate</small></article>
        <article class="portfolio-kpi booked clickable" data-kpi="booked"><span>Booked</span><strong>${u.number(snapshot.booked)}</strong><small>Future occupancy pipeline</small></article>
        <article class="portfolio-kpi vacant clickable" data-kpi="vacant"><span>Ready units</span><strong>${u.number(snapshot.vacant)}</strong><small>${u.money(snapshot.vacancyLoss)} potential / month</small></article>
        <article class="portfolio-kpi revenue clickable" data-kpi="monthly"><span>Annual revenue</span><strong>${u.compact(snapshot.annualRevenue)}</strong><small>${u.money(snapshot.monthlyRevenue)} active monthly</small></article>
      </section>

      <section class="executive-strip">
        <div><span>Occupancy rate</span><strong>${u.percent(snapshot.occupancyRate)}</strong></div>
        <div><span>Expiring in 90 days</span><strong>${u.number(snapshot.expiring90)}</strong></div>
        <div><span>Past due leases</span><strong>${u.number(snapshot.pastDue)}</strong></div>
        <div><span>Potential monthly</span><strong>${u.money(snapshot.potentialRevenue)}</strong></div>
        <div class="${integrityGood ? "integrity-ok" : "integrity-bad"}"><span>Data integrity</span><strong>${integrityGood ? "Verified" : `${snapshot.integrityIssues.length} issue(s)`}</strong></div>
      </section>

      <section class="dashboard-section dashboard-maintenance-section">
        <header class="dashboard-section-header"><div><h2>Maintenance Operation</h2></div><button class="text-button" data-open-maintenance>Open Maintenance →</button></header>
        <div class="dashboard-maintenance-grid maintenance-analytics-grid">
          <article class="premium-panel dashboard-maintenance-summary">
            <div><span>Open jobs</span><strong>${u.number(snapshot.maintenanceSummary.openCount)}</strong><small>${u.number(snapshot.maintenanceSummary.overdueCount)} overdue</small></div>
            <div><span>Due today</span><strong>${u.number(snapshot.maintenanceSummary.dueTodayCount)}</strong><small>${u.number(snapshot.maintenanceSummary.waitingPartsCount)} waiting for parts</small></div>
            <div><span>Cost this month</span><strong>${u.money(snapshot.maintenanceSummary.costThisMonth)}</strong><small>Completed work</small></div>
            <div><span>Cost this year</span><strong>${u.money(snapshot.maintenanceSummary.costThisYear)}</strong><small>Whole portfolio</small></div>
          </article>

          <article class="premium-panel maintenance-cost-property-chart">
            <header class="premium-panel-header"><div><span>MAINTENANCE COST BY PROPERTY</span><h3>Year to date</h3></div><strong>${u.money(snapshot.maintenanceSummary.costThisYear)}</strong></header>
            <div class="premium-panel-body maintenance-cost-bars">
              ${snapshot.maintenanceSummary.costsByProperty.slice(0, 8).map((row) => `<button data-property-id="${row.propertyId}"><span><b>${u.escapeHTML(row.propertyName)}</b><small>${u.money(row.cost)}</small></span><i><em style="width:${Math.max(2, row.cost / maxMaintenancePropertyCost * 100)}%"></em></i></button>`).join("") || `<div class="muted">No completed maintenance costs recorded.</div>`}
            </div>
          </article>

          <article class="premium-panel maintenance-cost-trend-chart">
            <header class="premium-panel-header"><div><span>MONTHLY MAINTENANCE COST TREND</span><h3>Last 12 months</h3></div><strong>${u.money(snapshot.maintenanceSummary.costThisMonth)}</strong></header>
            <div class="premium-panel-body maintenance-trend-bars">
              ${snapshot.maintenanceSummary.costsByMonth.map((row) => `<div title="${u.escapeHTML(row.fullLabel)} · ${u.money(row.cost)} · ${row.count} job(s)"><span><i style="height:${Math.max(row.cost ? 8 : 2, row.cost / maxMaintenanceMonthlyCost * 100)}%"></i></span><b>${u.escapeHTML(row.label)}</b><small>${row.cost ? u.compact(row.cost) : "—"}</small></div>`).join("")}
            </div>
          </article>

          <article class="premium-panel dashboard-maintenance-urgent">
            <header><div><span>ACTIVE PRIORITIES</span><strong>Urgent and high priority</strong></div></header>
            <div>${snapshot.maintenanceSummary.urgent.slice(0, 5).map((job) => { const unit = snapshot.maintenanceSummary.unitMap.get(job.unitId); const property = snapshot.maintenanceSummary.propertyMap.get(job.propertyId); return `<button data-maintenance-id="${job.id}"><span class="priority-dot ${job.priority}"></span><strong>${u.escapeHTML(job.title)}</strong><small>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</small></button>`; }).join("") || `<div class="muted">No urgent maintenance work.</div>`}</div>
          </article>
        </div>
      </section>

      <section class="dashboard-section">
        <header class="dashboard-section-header"><div><h2>Property Performance</h2></div><button class="text-button" data-route-properties>Open property collection →</button></header>
        <article class="premium-panel property-performance-panel">
          <div class="data-table-wrap"><table class="performance-table">
            <thead><tr><th>Property</th><th>Total</th><th>Occupied</th><th>Booked</th><th>Vacant</th><th>Occupancy</th><th>Monthly rent</th><th>Annual rent</th><th>Avg / occupied</th></tr></thead>
            <tbody>${propertiesByRevenue.map(propertyRow).join("")}</tbody>
            <tfoot><tr><td>Portfolio total</td><td>${u.number(snapshot.totalUnits)}</td><td>${u.number(snapshot.occupied)}</td><td>${u.number(snapshot.booked)}</td><td>${u.number(snapshot.vacant)}</td><td>${u.percent(snapshot.occupancyRate)}</td><td>${u.money(snapshot.monthlyRevenue)}</td><td>${u.money(snapshot.annualRevenue)}</td><td>${u.money(snapshot.occupied ? snapshot.monthlyRevenue / snapshot.occupied : 0)}</td></tr></tfoot>
          </table></div>
        </article>
      </section>

      <section class="dashboard-visual-grid">
        <article class="premium-panel occupancy-panel">
          <header class="premium-panel-header"><div><span>OCCUPANCY STATUS</span><h3>Occupancy by property</h3></div><div class="premium-legend"><i class="occupied"></i>Occupied<i class="booked"></i>Booked<i class="vacant"></i>Ready<i class="maintenance"></i>Work / inspection</div></header>
          <div class="premium-panel-body occupancy-chart-list">
            ${propertiesByRevenue.map((property) => `<button class="occupancy-chart-row" data-property-id="${property.id}"><span class="chart-property"><b>${u.escapeHTML(property.name)}</b><small>${u.number(property.totalUnits)} units</small></span>${statusBar(property)}<strong>${u.percent(property.occupancyRate, 0)}</strong></button>`).join("")}
          </div>
        </article>

        <article class="premium-panel status-mix-panel">
          <header class="premium-panel-header"><div><span>PORTFOLIO MIX</span><h3>Current unit status</h3></div></header>
          <div class="premium-panel-body status-mix-body">
            <div class="status-donut" style="background:conic-gradient(var(--status-occupied) 0deg ${occupiedEnd}deg,var(--status-booked) ${occupiedEnd}deg ${bookedEnd}deg,var(--status-vacant) ${bookedEnd}deg ${vacantEnd}deg,var(--status-maintenance) ${vacantEnd}deg 360deg)"><div><strong>${u.number(snapshot.totalUnits)}</strong><span>Total units</span></div></div>
            <div class="status-mix-list">
              <button data-kpi="occupied"><i class="occupied"></i><span>Occupied<small>${u.percent(snapshot.occupied / statusTotal * 100)}</small></span><b>${u.number(snapshot.occupied)}</b></button>
              <button data-kpi="booked"><i class="booked"></i><span>Booked<small>${u.percent(snapshot.booked / statusTotal * 100)}</small></span><b>${u.number(snapshot.booked)}</b></button>
              <button data-kpi="vacant"><i class="vacant"></i><span>Ready<small>${u.percent(snapshot.vacant / statusTotal * 100)}</small></span><b>${u.number(snapshot.vacant)}</b></button>
              <button><i class="maintenance"></i><span>Work / inspection<small>${u.percent(maintenanceDisplay / statusTotal * 100)}</small></span><b>${u.number(maintenanceDisplay)}</b></button>
            </div>
          </div>
        </article>
      </section>

      <section class="dashboard-visual-grid revenue-grid">
        <article class="premium-panel revenue-ranking-panel">
          <header class="premium-panel-header"><div><span>INCOME PERFORMANCE</span><h3>Annual revenue by property</h3></div><strong>${u.money(snapshot.annualRevenue)}</strong></header>
          <div class="premium-panel-body revenue-ranking-list">
            ${propertiesByRevenue.map((property, index) => `<button class="revenue-rank-row" data-property-id="${property.id}"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span class="rank-property"><b>${u.escapeHTML(property.name)}</b><small>${u.money(property.monthlyRevenue)} / month</small></span><span class="premium-revenue-bar"><i style="width:${property.annualRevenue / maxRevenue * 100}%"></i></span><strong>${u.compact(property.annualRevenue)}</strong></button>`).join("")}
          </div>
        </article>

        <article class="premium-panel executive-insight-panel">
          <header class="premium-panel-header"><div><span>EXECUTIVE HIGHLIGHTS</span><h3>What matters now</h3></div></header>
          <div class="premium-panel-body insight-list">
            <button data-property-id="${highestRevenue?.id || ""}"><span>Highest revenue property</span><strong>${u.escapeHTML(highestRevenue?.name || "—")}</strong><small>${u.money(highestRevenue?.monthlyRevenue || 0)} monthly</small></button>
            <button data-property-id="${lowestOccupancy?.id || ""}"><span>Lowest occupancy</span><strong>${u.escapeHTML(lowestOccupancy?.name || "—")}</strong><small>${u.percent(lowestOccupancy?.occupancyRate || 0)} occupancy</small></button>
            <button data-kpi="expiring"><span>Lease exposure</span><strong>${u.number(snapshot.expiring90)} expiring soon</strong><small>${u.number(snapshot.pastDue)} contract(s) already past due</small></button>
            <button data-kpi="vacant"><span>Ready-unit opportunity</span><strong>${u.money(snapshot.vacancyLoss)}</strong><small>Potential monthly revenue to recover</small></button>
          </div>
        </article>
      </section>

      <section class="dashboard-section">
        <header class="dashboard-section-header"><div><h2>Lease Expiry Calendar</h2><p>Next 12 months of revenue risk.</p></div><button class="text-button" data-open-report="lease-expiry">Detailed lease report →</button></header>
        <article class="premium-panel lease-panel">
          <div class="lease-risk-table-wrap"><table class="lease-risk-table"><thead><tr><th>Month</th><th>Expiring leases</th><th>Risk</th><th>Revenue at risk</th></tr></thead><tbody>
            ${snapshot.leaseBuckets.map((bucket) => { const risk = riskLevel(bucket.count); return `<tr><td>${u.escapeHTML(bucket.fullLabel)}</td><td><b>${bucket.count}</b></td><td><span class="risk-chip ${risk.className}">${risk.label}</span></td><td>${u.money(bucket.revenueAtRisk)}</td></tr>`; }).join("")}
          </tbody></table></div>
          <div class="premium-expiry-chart">
            <div class="expiry-axis"><span>${maxExpiry}</span><span>${Math.round(maxExpiry / 2)}</span><span>0</span></div>
            <div class="expiry-bars">${snapshot.leaseBuckets.map((bucket) => `<button title="${u.escapeHTML(bucket.fullLabel)} · ${bucket.count} leases · ${u.money(bucket.revenueAtRisk)} at risk"><span><i style="height:${Math.max(3, bucket.count / maxExpiry * 100)}%"></i></span><b>${bucket.count}</b><small>${u.escapeHTML(bucket.label)}</small></button>`).join("")}</div>
          </div>
        </article>
      </section>

      <section class="dashboard-section action-section">
        <header class="dashboard-section-header"><div><h2>Action Required</h2></div><button class="text-button" data-open-actions>Open Action Center →</button></header>
        <div class="executive-action-grid">
          ${snapshot.actions.slice(0, 8).map((item) => `<button class="executive-action-card ${item.severity}" data-unit-id="${item.unitId}"><span class="action-type">${u.escapeHTML(item.title)}</span><strong>${u.escapeHTML(item.detail)}</strong><small>${u.escapeHTML(item.meta)}</small><i>→</i></button>`).join("") || `<div class="premium-panel action-empty"><strong>No urgent actions</strong><span>The current records have no immediate warnings.</span></div>`}
        </div>
      </section>
    `;

    view.querySelectorAll("[data-dashboard-quick]").forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.dashboardQuick;
      if (action === "unit") root.modules.properties.openUnitForm();
      else if (action === "tenant") root.quickAdd.selectTenantUnit();
      else if (action === "payment") root.quickAdd.selectPaymentUnit();
      else if (action === "maintenance") root.modules.maintenance.openJobForm();
    }));
    view.querySelectorAll("[data-route-properties]").forEach((el) => el.addEventListener("click", () => root.router.navigate("properties")));
    view.querySelector("[data-open-actions]")?.addEventListener("click", () => root.router.navigate("actions"));
    view.querySelector("[data-open-maintenance]")?.addEventListener("click", () => root.router.navigate("maintenance"));
    view.querySelectorAll("[data-maintenance-id]").forEach((el) => el.addEventListener("click", () => root.modules.maintenance.openJob(el.dataset.maintenanceId)));
    view.querySelectorAll("[data-property-id]").forEach((el) => el.addEventListener("click", () => {
      if (el.dataset.propertyId) root.router.navigate("properties", { propertyId: el.dataset.propertyId });
    }));
    view.querySelectorAll("[data-unit-id]").forEach((el) => el.addEventListener("click", () => root.modules.unitDetail.open(el.dataset.unitId)));
    view.querySelectorAll("[data-open-report]").forEach((el) => el.addEventListener("click", () => root.modules.reports.openReport(el.dataset.openReport)));
    view.querySelectorAll("[data-kpi]").forEach((el) => el.addEventListener("click", () => {
      const key = el.dataset.kpi;
      if (["units", "occupied", "booked", "vacant", "monthly"].includes(key)) {
        const status = ["occupied", "booked", "vacant"].includes(key) ? key : "all";
        root.router.navigate("properties", { status });
      } else if (key === "expiring") root.router.navigate("leases", { status: "expiring" });
    }));
  }

  root.modules.dashboard = { render };
})();
