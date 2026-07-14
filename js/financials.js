(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  const FILTERS = [
    ["all", "All Schedule"],
    ["due", "Due Soon"],
    ["cheques", "Cheques"],
    ["overdue", "Overdue"],
    ["returned", "Returned"],
    ["partial", "Partial"],
    ["paid", "Paid"]
  ];

  function isSameMonth(value, reference = new Date()) {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
  }

  function matchesFilter(payment, filter) {
    if (filter === "all") return true;
    if (filter === "due") return ["due_soon", "due_today", "upcoming"].includes(payment.status) && u.daysBetween(u.isoDate(), payment.dueDate) <= 14;
    if (filter === "cheques") return ["cheque_received", "ready_to_deposit", "deposited"].includes(payment.status) || u.normalize(payment.expectedMethod).includes("cheque");
    if (filter === "overdue") return ["overdue", "auto_debit_failed"].includes(payment.status);
    if (filter === "returned") return payment.status === "returned";
    if (filter === "partial") return payment.status === "partially_paid";
    if (filter === "paid") return ["paid", "cleared"].includes(payment.status);
    return true;
  }

  function paymentMethodLine(payment) {
    const method = payment.method || payment.expectedMethod || "—";
    if (!u.normalize(method).includes("cheque")) return u.escapeHTML(method);
    return `${u.escapeHTML(method)}${payment.chequeNumber ? `<small>Cheque ${u.escapeHTML(payment.chequeNumber)}</small>` : ""}`;
  }

  function openPaymentStatusForm(payment, refresh) {
    const instance = root.ui.openModal({
      title: "Update cheque / collection status",
      eyebrow: `DUE ${u.date(payment.dueDate)}`,
      size: "medium",
      content: `<form id="payment-status-form" class="form-grid">
        <label><span>Status</span><select name="status">
          <option value="cheque_received" ${payment.status === "cheque_received" ? "selected" : ""}>Cheque Received</option>
          <option value="ready_to_deposit" ${payment.status === "ready_to_deposit" ? "selected" : ""}>Ready to Deposit</option>
          <option value="deposited" ${payment.status === "deposited" ? "selected" : ""}>Deposited</option>
          <option value="cleared" ${payment.status === "cleared" ? "selected" : ""}>Cleared / Paid</option>
          <option value="returned" ${payment.status === "returned" ? "selected" : ""}>Returned Cheque</option>
          <option value="auto_debit_failed" ${payment.status === "auto_debit_failed" ? "selected" : ""}>Auto-Debit Failed</option>
        </select></label>
        <label><span>Cheque Number</span><input name="chequeNumber" value="${u.escapeHTML(payment.chequeNumber || "")}"></label>
        <label><span>Cheque Date</span><input name="chequeDate" type="date" value="${u.escapeHTML(payment.chequeDate || payment.dueDate || "")}"></label>
        <label><span>Bank</span><input name="chequeBank" value="${u.escapeHTML(payment.chequeBank || "")}"></label>
        <label><span>Deposit Date</span><input name="depositDate" type="date" value="${u.escapeHTML(payment.depositDate || "")}"></label>
        <label><span>Cleared Date</span><input name="clearedDate" type="date" value="${u.escapeHTML(payment.clearedDate || "")}"></label>
        <label><span>Returned Date</span><input name="returnedDate" type="date" value="${u.escapeHTML(payment.returnedDate || "")}"></label>
        <label><span>Return Reason</span><input name="returnReason" value="${u.escapeHTML(payment.returnReason || "")}"></label>
        <label class="span-2"><span>Notes</span><textarea name="notes">${u.escapeHTML(payment.notes || "")}</textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save status</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      try {
        root.ui.showLoading("Updating payment status…");
        const data = Object.fromEntries(new FormData(instance.modal.querySelector("#payment-status-form")));
        const updated = await root.data.updatePaymentEntry(payment.id, data);
        instance.close();
        root.ui.toast(updated.status === "cleared" ? "Cheque cleared and receipt issued." : "Payment status updated.", "success");
        await refresh();
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  async function render(view, params = {}) {
    const load = async () => Promise.all([
      root.data.getPayments(),
      root.data.getUnits(true),
      root.data.getProperties(true),
      root.data.getTenants(true),
      root.data.getContracts(true)
    ]);

    let [payments, units, properties, tenants, contracts] = await load();
    let requested = params.status || "all";
    if (!FILTERS.some(([key]) => key === requested)) requested = "all";

    const refreshData = async () => {
      [payments, units, properties, tenants, contracts] = await load();
      await render(view, { status: view.querySelector("#payment-filter button.active")?.dataset.status || requested });
    };

    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const tenantMap = new Map(tenants.map((row) => [row.id, row]));
    const contractMap = new Map(contracts.map((row) => [row.id, row]));
    const currentMonth = new Date();
    const expectedThisMonth = payments.filter((p) => isSameMonth(p.dueDate, currentMonth) && !["cancelled", "waived"].includes(p.status)).reduce((sum, p) => sum + Number(p.amountDue || 0), 0);
    const collectedThisMonth = payments.reduce((sum, p) => sum + (p.transactions || []).filter((txn) => isSameMonth(txn.paidDate, currentMonth)).reduce((subtotal, txn) => subtotal + Number(txn.amount || 0), 0), 0);
    const outstanding = payments.filter((p) => !["paid", "cleared", "cancelled", "waived"].includes(p.status)).reduce((sum, p) => sum + Number(p.balance || 0), 0);
    const overdue = payments.filter((p) => ["overdue", "returned", "auto_debit_failed"].includes(p.status));
    const chequesToDeposit = payments.filter((p) => ["ready_to_deposit", "cheque_received"].includes(p.status) && String(p.chequeDate || p.dueDate || "") <= u.isoDate());

    view.innerHTML = `
      <section class="page-heading">
        <div><h1>Financials</h1></div>
        <div class="page-actions"><button class="button button-secondary" data-print-register>Print payment schedule</button></div>
      </section>
      <section class="financial-kpi-grid">
        <article class="financial-kpi"><span>Expected This Month</span><strong>${u.money(expectedThisMonth)}</strong><small>Contractual schedule</small></article>
        <article class="financial-kpi"><span>Collected This Month</span><strong>${u.money(collectedThisMonth)}</strong><small>Actual paid dates</small></article>
        <article class="financial-kpi"><span>Outstanding</span><strong>${u.money(outstanding)}</strong><small>${u.number(overdue.length)} urgent record(s)</small></article>
        <article class="financial-kpi"><span>Cheques to Deposit</span><strong>${u.number(chequesToDeposit.length)}</strong><small>${u.money(chequesToDeposit.reduce((sum, p) => sum + Number(p.balance || 0), 0))}</small></article>
      </section>
      <div class="toolbar financial-toolbar">
        <input id="payment-search" class="search-input" type="search" placeholder="Search tenant, property, unit, cheque or contract">
        <div id="payment-filter" class="segmented payment-status-tabs">${FILTERS.map(([status, label]) => `<button data-status="${status}" class="${requested === status ? "active" : ""}">${label}</button>`).join("")}</div>
      </div>
      <article class="panel payment-schedule-panel"><div class="data-table-wrap"><table class="data-table mobile-card-table"><thead><tr><th>Tenant / Unit</th><th>Coverage</th><th>Due Date</th><th>Method</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody id="payment-table-body"></tbody></table></div></article>`;

    const draw = () => {
      const term = u.normalize(view.querySelector("#payment-search").value);
      const status = view.querySelector("#payment-filter button.active")?.dataset.status || "all";
      const filtered = payments.filter((payment) => {
        const unit = unitMap.get(payment.unitId);
        const property = propertyMap.get(payment.propertyId);
        const tenant = tenantMap.get(payment.tenantId);
        const contract = contractMap.get(payment.contractId);
        const matchesStatus = matchesFilter(payment, status);
        const matchesText = [payment.receiptNumber, payment.reference, payment.chequeNumber, payment.chequeBank, tenant?.name, property?.name, unit?.unitNumber, contract?.contractNumber, payment.expectedMethod, payment.status].some((value) => u.normalize(value).includes(term));
        return matchesStatus && matchesText;
      }).sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));

      view.querySelector("#payment-table-body").innerHTML = filtered.map((payment) => {
        const unit = unitMap.get(payment.unitId);
        const property = propertyMap.get(payment.propertyId);
        const tenant = tenantMap.get(payment.tenantId);
        const canRecord = root.auth.can("payment") && payment.balance > 0 && !["cancelled", "waived"].includes(payment.status);
        const canUpdate = root.auth.can("payment") && (["cheque_received", "ready_to_deposit", "deposited", "returned", "auto_debit_failed"].includes(payment.status) || u.normalize(payment.expectedMethod).includes("cheque"));
        return `<tr data-payment-id="${payment.id}"><td data-label="Tenant / Unit"><div class="table-title">${u.escapeHTML(tenant?.name || "Tenant")}</div><div class="table-subtitle">${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</div></td><td data-label="Coverage">${u.date(payment.coverageStart)} – ${u.date(payment.coverageEnd)}</td><td data-label="Due Date"><strong>${u.date(payment.dueDate)}</strong></td><td data-label="Method"><div class="payment-method-cell">${paymentMethodLine(payment)}</div></td><td data-label="Due">${u.money(payment.amountDue)}</td><td data-label="Paid">${u.money(payment.amountPaid)}</td><td data-label="Balance"><strong>${u.money(payment.balance)}</strong></td><td data-label="Status"><span class="status-chip ${payment.status}">${u.titleCase(payment.status)}</span></td><td data-label="Actions"><div class="row-actions">${canRecord ? `<button class="button button-primary button-small" data-record-payment="${payment.id}">Record</button>` : ""}${canUpdate ? `<button class="button button-secondary button-small" data-update-payment="${payment.id}">Update</button>` : ""}${payment.receiptNumber ? `<button class="button button-secondary button-small" data-print-id="${payment.id}">Receipt</button>` : ""}</div></td></tr>`;
      }).join("") || `<tr><td colspan="9">${root.ui.emptyState("No payment schedule records", "Change the search or payment-status filter.")}</td></tr>`;

      view.querySelectorAll("[data-record-payment]").forEach((button) => button.addEventListener("click", () => {
        const payment = payments.find((row) => row.id === button.dataset.recordPayment);
        root.modules.unitDetail.recordPayment(payment.unitId, payment.id);
      }));
      view.querySelectorAll("[data-update-payment]").forEach((button) => button.addEventListener("click", () => {
        const payment = payments.find((row) => row.id === button.dataset.updatePayment);
        openPaymentStatusForm(payment, refreshData);
      }));
      view.querySelectorAll("[data-print-id]").forEach((button) => button.addEventListener("click", async () => {
        const payment = payments.find((row) => row.id === button.dataset.printId);
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
        return `<tr><td>${u.escapeHTML(tenant?.name || "Tenant")}</td><td>${u.escapeHTML(property?.name || "Property")} · ${u.escapeHTML(unit?.unitNumber || "Unit")}</td><td>${u.escapeHTML(contract?.contractNumber || "—")}</td><td>${u.date(payment.dueDate)}</td><td>${u.money(payment.amountDue)}</td><td>${u.money(payment.amountPaid)}</td><td>${u.money(payment.balance)}</td><td>${u.titleCase(payment.status)}</td></tr>`;
      }).join("");
      root.ui.printDocument("59 Real Estate Payment Schedule", `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Contractual Payment Schedule</div></div><div class="meta"><h1 class="title">PAYMENT SCHEDULE</h1><div>${u.date(new Date())}</div></div></header><p>Due dates are fixed from the lease agreement. Actual payment dates do not move future installments.</p><table><thead><tr><th>Tenant</th><th>Property / Unit</th><th>Contract</th><th>Due Date</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">59 Real Estate · Confidential · Generated from current system records</div>`);
    });
  }

  root.modules.payments = { render };
})();
