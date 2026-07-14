(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  const REPORTS = [
    { id: "portfolio", icon: "59", title: "Executive Portfolio", description: "Owner-level summary of occupancy, income, vacancies and lease risk." },
    { id: "occupancy", icon: "%", title: "Occupancy Report", description: "Property-by-property occupied, booked, vacant and maintenance totals." },
    { id: "lease-expiry", icon: "D", title: "Lease Expiry", description: "Contracts sorted by expiry date with days remaining and revenue at risk." },
    { id: "vacancies", icon: "V", title: "Vacant Units", description: "Available units, asking rent and estimated monthly vacancy impact." },
    { id: "tenants", icon: "T", title: "Tenant Register", description: "Current, upcoming and previous tenant directory linked to units." },
    { id: "kahramaa", icon: "K", title: "Kahramaa Register", description: "Electricity, water, account, premise and meter details by unit." },
    { id: "receipts", icon: "R", title: "Payment & Receipt Register", description: "Contractual due dates, actual collections, balances, cheque status and receipt references." },
    { id: "maintenance", icon: "M", title: "Maintenance Cost & Jobs", description: "Portfolio maintenance workload, property costs, categories and completion performance." },
    { id: "audit", icon: "A", title: "Activity Audit", description: "Chronological system activity showing who changed each record." }
  ];

  async function render(view) {
    view.innerHTML = `
      <section class="page-heading compact-heading"><div><h1>Reports</h1></div></section>
      <section class="report-grid">${REPORTS.map((report) => `<article class="report-card"><div class="report-icon">${report.icon}</div><h3>${u.escapeHTML(report.title)}</h3><p>${u.escapeHTML(report.description)}</p><button class="button button-secondary" data-report="${report.id}">${root.ui.documentActionText("Preview & print", "Generate PDF")}</button></article>`).join("")}</section>`;
    view.querySelectorAll("[data-report]").forEach((button) => button.addEventListener("click", () => openReport(button.dataset.report)));
  }

  async function openReport(reportId) {
    root.ui.showLoading("Preparing report…");
    try {
      const report = await buildReport(reportId);
      root.ui.printDocument(report.title, report.html);
    } catch (error) {
      root.ui.toast(error.message || "Unable to build the report.", "error");
    } finally {
      root.ui.hideLoading();
    }
  }

  async function baseMaps() {
    const [properties, units, tenants, contracts, payments, maintenanceJobs] = await Promise.all([
      root.data.getProperties(true), root.data.getUnits(true), root.data.getTenants(true), root.data.getContracts(true), root.data.getPayments(), root.data.getMaintenanceJobs(true)
    ]);
    return {
      properties, units, tenants, contracts, payments, maintenanceJobs,
      propertyMap: new Map(properties.map((r) => [r.id, r])),
      unitMap: new Map(units.map((r) => [r.id, r])),
      tenantMap: new Map(tenants.map((r) => [r.id, r])),
      contractMap: new Map(contracts.map((r) => [r.id, r]))
    };
  }

  function reportHeader(title, subtitle = "Private Portfolio System") {
    return `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">${u.escapeHTML(subtitle)}</div></div><div class="meta"><h1 class="title">${u.escapeHTML(title)}</h1><div>${u.date(new Date())}</div></div></header>`;
  }

  async function buildReport(reportId) {
    const maps = await baseMaps();
    const footer = `<div class="footer">59 Real Estate · Confidential · Generated from current system records · ${u.dateTime(Date.now())}</div>`;

    if (reportId === "portfolio") {
      const snapshot = await root.data.getDashboardSnapshot();
      const rows = snapshot.properties.map((p) => `<tr><td>${u.escapeHTML(p.name)}</td><td>${p.totalUnits}</td><td>${p.occupied}</td><td>${p.booked}</td><td>${p.vacant}</td><td>${p.maintenance}</td><td>${u.percent(p.occupancyRate)}</td><td>${u.money(p.monthlyRevenue)}</td><td>${u.money(p.annualRevenue)}</td></tr>`).join("");
      return { title: "Executive Portfolio Report", html: `${reportHeader("Executive Portfolio Report")}<div class="grid"><div class="item"><span>Properties</span><strong>${snapshot.totalProperties}</strong></div><div class="item"><span>Total Units</span><strong>${snapshot.totalUnits}</strong></div><div class="item"><span>Occupancy</span><strong>${u.percent(snapshot.occupancyRate)}</strong></div><div class="item"><span>Active Monthly Rent</span><strong>${u.money(snapshot.monthlyRevenue)}</strong></div><div class="item"><span>Annualized Revenue</span><strong>${u.money(snapshot.annualRevenue)}</strong></div><div class="item"><span>Vacancy Impact</span><strong>${u.money(snapshot.vacancyLoss)}</strong></div></div><table><thead><tr><th>Property</th><th>Total</th><th>Occupied</th><th>Booked</th><th>Vacant</th><th>Maintenance</th><th>Occ. Rate</th><th>Monthly</th><th>Annual</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "occupancy") {
      const snapshot = await root.data.getDashboardSnapshot();
      const rows = snapshot.properties.map((p) => `<tr><td>${u.escapeHTML(p.name)}</td><td>${p.totalUnits}</td><td>${p.occupied}</td><td>${p.booked}</td><td>${p.vacant}</td><td>${p.maintenance}</td><td>${u.percent(p.occupancyRate)}</td></tr>`).join("");
      return { title: "Occupancy Report", html: `${reportHeader("Occupancy Report")}<table><thead><tr><th>Property</th><th>Total Units</th><th>Occupied</th><th>Booked</th><th>Vacant</th><th>Maintenance</th><th>Occupancy Rate</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "lease-expiry") {
      const rows = maps.contracts.filter((c) => ["active","upcoming"].includes(c.status)).map((contract) => {
        const unit = maps.unitMap.get(contract.unitId);
        const property = maps.propertyMap.get(contract.propertyId);
        const tenant = maps.tenantMap.get(contract.tenantId);
        const days = u.daysBetween(new Date(), contract.endDate);
        return { days, html: `<tr><td>${u.escapeHTML(contract.contractNumber)}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.date(contract.endDate)}</td><td>${days}</td><td>${u.money(contract.monthlyRent)}</td><td>${days < 0 ? "PAST DUE" : days <= 30 ? "URGENT" : days <= 90 ? "UPCOMING" : "FUTURE"}</td></tr>` };
      }).sort((a,b) => a.days - b.days).map((r) => r.html).join("");
      return { title: "Lease Expiry Report", html: `${reportHeader("Lease Expiry Report")}<table><thead><tr><th>Contract</th><th>Property / Unit</th><th>Tenant</th><th>End Date</th><th>Days Left</th><th>Monthly Rent</th><th>Priority</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "vacancies") {
      const vacancies = maps.units.filter((unit) => unit.status === "vacant" && !unit.archived);
      const rows = vacancies.map((unit) => `<tr><td>${u.escapeHTML(maps.propertyMap.get(unit.propertyId)?.name || "Property")}</td><td>${u.escapeHTML(unit.unitNumber)}</td><td>${u.escapeHTML(unit.aptType || "—")}</td><td>${u.escapeHTML(unit.specifics || "—")}</td><td>${u.money(unit.rentValue)}</td><td>${u.escapeHTML(unit.kahramaa?.connectionStatus || "—")}</td></tr>`).join("");
      return { title: "Vacant Units Report", html: `${reportHeader("Vacant Units Report")}<div class="grid"><div class="item"><span>Vacant Units</span><strong>${vacancies.length}</strong></div><div class="item"><span>Monthly Vacancy Impact</span><strong>${u.money(vacancies.reduce((s,r) => s + Number(r.rentValue || 0), 0))}</strong></div></div><table><thead><tr><th>Property</th><th>Unit</th><th>Type</th><th>Specifics</th><th>Asking Rent</th><th>Kahramaa</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "tenants") {
      const rows = maps.tenants.map((tenant) => {
        const unit = maps.unitMap.get(tenant.currentUnitId);
        const property = unit ? maps.propertyMap.get(unit.propertyId) : null;
        return `<tr><td>${u.escapeHTML(tenant.name)}</td><td>${u.escapeHTML(tenant.tenantType)}</td><td>${u.escapeHTML(tenant.qidOrCr || "—")}</td><td>${u.escapeHTML(tenant.mobile || "—")}</td><td>${unit ? `${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit.unitNumber)}` : "Historical"}</td><td>${u.titleCase(tenant.status)}</td></tr>`;
      }).join("");
      return { title: "Tenant Register", html: `${reportHeader("Tenant Register")}<table><thead><tr><th>Tenant</th><th>Type</th><th>QID / CR</th><th>Mobile</th><th>Property / Unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "kahramaa") {
      const rows = maps.units.filter((unit) => !unit.archived).map((unit) => `<tr><td>${u.escapeHTML(maps.propertyMap.get(unit.propertyId)?.name || "Property")}</td><td>${u.escapeHTML(unit.unitNumber)}</td><td>${u.escapeHTML(unit.kahramaa?.electricityNumber || "—")}</td><td>${u.escapeHTML(unit.kahramaa?.waterNumber || "—")}</td><td>${u.escapeHTML(unit.kahramaa?.accountNumber || "—")}</td><td>${u.escapeHTML(unit.kahramaa?.premiseNumber || "—")}</td><td>${u.escapeHTML(unit.kahramaa?.meterNumber || "—")}</td><td>${u.escapeHTML(unit.kahramaa?.connectionStatus || "—")}</td></tr>`).join("");
      return { title: "Kahramaa Register", html: `${reportHeader("Kahramaa Register")}<table><thead><tr><th>Property</th><th>Unit</th><th>Electricity</th><th>Water</th><th>Account</th><th>Premise</th><th>Meter</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "receipts") {
      const rows = maps.payments.map((payment) => {
        const unit = maps.unitMap.get(payment.unitId);
        const property = maps.propertyMap.get(payment.propertyId);
        const tenant = maps.tenantMap.get(payment.tenantId);
        return `<tr><td>${u.escapeHTML(payment.receiptNumber || "—")}</td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.date(payment.coverageStart)} – ${u.date(payment.coverageEnd)}</td><td>${u.date(payment.dueDate)}</td><td>${u.date(payment.paidDate)}</td><td>${u.money(payment.amountDue)}</td><td>${u.money(payment.amountPaid)}</td><td>${u.money(payment.balance)}</td><td>${u.escapeHTML(payment.method || payment.expectedMethod || "—")}</td><td>${u.titleCase(payment.status)}</td></tr>`;
      }).join("");
      return { title: "Payment & Receipt Register", html: `${reportHeader("Payment & Receipt Register")}<p>Contractual due dates remain fixed. Actual paid dates record early, on-time or late collection without changing future installments.</p><table><thead><tr><th>Receipt</th><th>Tenant</th><th>Property / Unit</th><th>Coverage</th><th>Due Date</th><th>Paid Date</th><th>Due</th><th>Paid</th><th>Balance</th><th>Method</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "maintenance") {
      const snapshot = await root.data.getMaintenanceSnapshot();
      const rows = maps.maintenanceJobs.map((job) => {
        const property = maps.propertyMap.get(job.propertyId);
        const unit = maps.unitMap.get(job.unitId);
        const performance = job.actualCompletionDate && job.expectedCompletionDate
          ? (() => { const days = u.daysBetween(job.actualCompletionDate, job.expectedCompletionDate); return days > 0 ? `${days} day(s) early` : days < 0 ? `${Math.abs(days)} day(s) late` : "On time"; })()
          : "—";
        return `<tr><td>${u.escapeHTML(job.jobNumber)}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.escapeHTML(job.issueCategory)}</td><td>${u.titleCase(job.requestType)}</td><td>${u.titleCase(job.status)}</td><td>${u.escapeHTML(job.assignedTo || "Unassigned")}</td><td>${u.money(job.actualCost || job.estimatedCost)}</td><td>${u.escapeHTML(performance)}</td></tr>`;
      }).join("");
      const propertyRows = snapshot.costsByProperty.map((row) => `<tr><td>${u.escapeHTML(row.propertyName)}</td><td>${u.money(row.cost)}</td></tr>`).join("");
      return { title: "Maintenance Cost & Jobs Report", html: `${reportHeader("Maintenance Cost & Jobs Report")}<div class="grid"><div class="item"><span>Open Jobs</span><strong>${snapshot.openCount}</strong></div><div class="item"><span>Overdue Jobs</span><strong>${snapshot.overdueCount}</strong></div><div class="item"><span>Cost This Month</span><strong>${u.money(snapshot.costThisMonth)}</strong></div><div class="item"><span>Cost This Year</span><strong>${u.money(snapshot.costThisYear)}</strong></div></div><h3>Cost by Property</h3><table><thead><tr><th>Property</th><th>Completed Maintenance Cost</th></tr></thead><tbody>${propertyRows}</tbody></table><h3>Maintenance Register</h3><table><thead><tr><th>Job</th><th>Property / Unit</th><th>Category</th><th>Type</th><th>Status</th><th>Assigned</th><th>Cost</th><th>Performance</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    if (reportId === "audit") {
      const logs = await root.data.getAuditLogs();
      const rows = logs.map((log) => `<tr><td>${u.dateTime(log.createdAt)}</td><td>${u.escapeHTML(log.userName || "System")}</td><td>${u.escapeHTML(log.action)}</td><td>${u.escapeHTML(log.entityType)}</td><td>${u.escapeHTML(log.description)}</td></tr>`).join("");
      return { title: "Activity Audit Report", html: `${reportHeader("Activity Audit Report")}<table><thead><tr><th>Date / Time</th><th>User</th><th>Action</th><th>Record Type</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>${footer}` };
    }

    throw new Error("Unknown report type.");
  }

  root.modules.reports = { render, openReport, buildReport };
})();
