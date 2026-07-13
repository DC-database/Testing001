(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view, params = {}) {
    const [payments, units, properties, tenants, contracts] = await Promise.all([
      root.data.getPayments(),
      root.data.getUnits(true),
      root.data.getProperties(true),
      root.data.getTenants(true),
      root.data.getContracts(true)
    ]);
    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const tenantMap = new Map(tenants.map((row) => [row.id, row]));
    const contractMap = new Map(contracts.map((row) => [row.id, row]));
    const paidTotal = payments.filter((p) => p.status === "paid").reduce((s,p) => s + Number(p.amount || 0), 0);
    const overdueTotal = payments.filter((p) => p.status === "overdue").reduce((s,p) => s + Number(p.amount || 0), 0);
    const requested = params.status || "all";

    view.innerHTML = `
      <section class="page-heading">
        <div><div class="eyebrow">FINANCIAL RECORDS</div><h1>Payments & Receipts</h1><p>Payment records, overdue amounts and system-issued receipts connected to each active contract.</p></div>
        <div class="page-actions"><button class="button button-secondary" data-print-register>Print receipt register</button></div>
      </section>
      <section class="card-grid" style="margin-bottom:16px">
        <article class="stat-card dark"><span class="stat-label">Paid Records</span><strong>${u.number(payments.filter((p) => p.status === "paid").length)}</strong><small>${u.money(paidTotal)}</small></article>
        <article class="stat-card"><span class="stat-label">Overdue Records</span><strong>${u.number(payments.filter((p) => p.status === "overdue").length)}</strong><small>${u.money(overdueTotal)}</small></article>
        <article class="stat-card"><span class="stat-label">Receipts Issued</span><strong>${u.number(payments.filter((p) => p.receiptNumber).length)}</strong><small>Demo receipt numbers</small></article>
        <article class="stat-card"><span class="stat-label">Payment Methods</span><strong>${new Set(payments.filter((p) => p.method).map((p) => p.method)).size}</strong><small>Bank, cheque, cash and online</small></article>
      </section>
      <div class="toolbar">
        <input id="payment-search" class="search-input" type="search" placeholder="Search receipt, tenant, property, unit or reference">
        <div id="payment-filter" class="segmented">${["all","paid","overdue"].map((status) => `<button data-status="${status}" class="${requested === status ? "active" : ""}">${u.titleCase(status)}</button>`).join("")}</div>
      </div>
      <article class="panel"><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Receipt</th><th>Tenant</th><th>Property / Unit</th><th>Due</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead><tbody id="payment-table-body"></tbody></table></div></article>`;

    const draw = () => {
      const term = u.normalize(view.querySelector("#payment-search").value);
      const status = view.querySelector("#payment-filter button.active")?.dataset.status || "all";
      const filtered = payments.filter((payment) => {
        const unit = unitMap.get(payment.unitId);
        const property = propertyMap.get(payment.propertyId);
        const tenant = tenantMap.get(payment.tenantId);
        const matchesStatus = status === "all" || payment.status === status;
        const matchesText = [payment.receiptNumber, payment.reference, tenant?.name, property?.name, unit?.unitNumber, payment.method].some((value) => u.normalize(value).includes(term));
        return matchesStatus && matchesText;
      }).sort((a,b) => new Date(b.dueDate) - new Date(a.dueDate));
      view.querySelector("#payment-table-body").innerHTML = filtered.map((payment) => {
        const unit = unitMap.get(payment.unitId);
        const property = propertyMap.get(payment.propertyId);
        const tenant = tenantMap.get(payment.tenantId);
        return `<tr class="clickable" data-unit-id="${payment.unitId}"><td><div class="table-title">${u.escapeHTML(payment.receiptNumber || "Not issued")}</div><div class="table-subtitle">${u.escapeHTML(payment.reference || "No reference")}</div></td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.date(payment.dueDate)}</td><td>${u.money(payment.amount)}</td><td>${u.escapeHTML(payment.method || "—")}</td><td><span class="status-chip ${payment.status}">${u.titleCase(payment.status)}</span></td><td>${payment.receiptNumber ? `<button class="button button-secondary button-small" data-print-id="${payment.id}">Print</button>` : "Open →"}</td></tr>`;
      }).join("") || `<tr><td colspan="8">${root.ui.emptyState("No payment records found", "Change the search or status filter.")}</td></tr>`;
      view.querySelectorAll("tr[data-unit-id]").forEach((row) => row.addEventListener("click", (event) => {
        if (event.target.closest("[data-print-id]")) return;
        root.modules.unitDetail.open(row.dataset.unitId, "payments");
      }));
      view.querySelectorAll("[data-print-id]").forEach((button) => button.addEventListener("click", async (event) => {
        event.stopPropagation();
        const payment = payments.find((p) => p.id === button.dataset.printId);
        const bundle = await root.data.getUnitBundle(payment.unitId);
        root.modules.unitDetail.printReceipt(bundle, payment);
      }));
    };

    draw();
    view.querySelector("#payment-search").addEventListener("input", u.debounce(draw, 120));
    view.querySelectorAll("#payment-filter button").forEach((button) => button.addEventListener("click", () => {
      view.querySelectorAll("#payment-filter button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      draw();
    }));
    view.querySelector("[data-print-register]").addEventListener("click", () => {
      const rows = payments.map((payment) => {
        const unit = unitMap.get(payment.unitId);
        const property = propertyMap.get(payment.propertyId);
        const tenant = tenantMap.get(payment.tenantId);
        const contract = contractMap.get(payment.contractId);
        return `<tr><td>${u.escapeHTML(payment.receiptNumber || "—")}</td><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.escapeHTML(contract?.contractNumber || "—")}</td><td>${u.date(payment.dueDate)}</td><td>${u.money(payment.amount)}</td><td>${u.titleCase(payment.status)}</td></tr>`;
      }).join("");
      root.ui.printDocument("59 Real Estate Receipt Register", `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Private Portfolio System</div></div><div class="meta"><h1 class="title">Receipt Register</h1><div>${u.date(new Date())}</div></div></header><table><thead><tr><th>Receipt</th><th>Tenant</th><th>Property / Unit</th><th>Contract</th><th>Due Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">59 Real Estate · Confidential · Generated from local demo records</div>`);
    });
  }

  root.modules.payments = { render };
})();
