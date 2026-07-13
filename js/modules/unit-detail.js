(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  const TABS = [
    ["overview", "Overview"],
    ["unit", "Unit Information"],
    ["kahramaa", "Kahramaa"],
    ["tenant", "Current Tenant"],
    ["contract", "Current Contract"],
    ["payments", "Payments & Receipts"],
    ["history", "History"]
  ];

  async function open(unitId, initialTab = "overview") {
    const bundle = await root.data.getUnitBundle(unitId);
    if (!bundle) return root.ui.toast("Unit record not found.", "error");
    root.state.selectedUnitId = unitId;

    const instance = root.ui.openModal({
      title: `${bundle.property.name} · ${bundle.unit.unitNumber}`,
      eyebrow: "UNIT FOLDER",
      size: "wide",
      content: `<div class="unit-modal-body"><div class="unit-tabs">${TABS.map(([id, label]) => `<button class="unit-tab ${id === initialTab ? "active" : ""}" data-unit-tab="${id}">${label}</button>`).join("")}</div><div id="unit-tab-content" class="unit-tab-content"></div></div>`
    });

    const draw = (tabId) => {
      instance.modal.querySelectorAll("[data-unit-tab]").forEach((button) => button.classList.toggle("active", button.dataset.unitTab === tabId));
      instance.modal.querySelector("#unit-tab-content").innerHTML = renderTab(tabId, bundle);
      bindTabActions(tabId, bundle, instance);
    };
    instance.modal.querySelectorAll("[data-unit-tab]").forEach((button) => button.addEventListener("click", () => draw(button.dataset.unitTab)));
    draw(initialTab);
  }

  function renderTab(tabId, bundle) {
    const { unit, property, tenant, contract, contracts, payments, logs, tenantMap } = bundle;
    const editable = root.auth.can("update");
    if (tabId === "overview") {
      return `
        <div class="unit-summary-grid">
          <div class="unit-summary-card"><span>Status</span><strong><span class="status-chip ${unit.status}">${u.titleCase(unit.status)}</span></strong></div>
          <div class="unit-summary-card"><span>Current Tenant</span><strong>${u.escapeHTML(tenant?.name || "No active tenant")}</strong></div>
          <div class="unit-summary-card"><span>Monthly Rent</span><strong>${u.money(contract?.monthlyRent || unit.rentValue)}</strong></div>
          <div class="unit-summary-card"><span>Contract Ends</span><strong>${u.date(contract?.endDate)}</strong></div>
        </div>
        <div class="detail-list">
          <div class="detail-item"><span>Property</span><strong>${u.escapeHTML(property.name)}</strong></div>
          <div class="detail-item"><span>Unit</span><strong>${u.escapeHTML(unit.unitNumber)} · ${u.escapeHTML(unit.aptType || "Unit")}</strong></div>
          <div class="detail-item"><span>Specifics</span><strong>${u.escapeHTML(unit.specifics || "—")}</strong></div>
          <div class="detail-item"><span>Kahramaa</span><strong>${u.escapeHTML(unit.kahramaa?.accountNumber || "Not recorded")}</strong></div>
          <div class="detail-item"><span>Electricity / Water</span><strong>${u.escapeHTML(unit.kahramaa?.electricityNumber || "—")} / ${u.escapeHTML(unit.kahramaa?.waterNumber || "—")}</strong></div>
          <div class="detail-item"><span>Last Updated</span><strong>${u.dateTime(unit.updatedAt)}</strong></div>
        </div>
        <div class="form-actions">
          ${editable ? `<button class="button button-secondary" data-edit-unit>Edit unit</button>` : ""}
          ${root.auth.can("contract") ? (unit.currentContractId ? `<button class="button button-secondary" data-close-tenancy>Close tenancy</button><button class="button button-primary" data-new-tenant>Replace tenant</button>` : `<button class="button button-primary" data-new-tenant>Assign tenant & contract</button>`) : ""}
        </div>`;
    }

    if (tabId === "unit") {
      return `<div class="detail-list">
        <div class="detail-item"><span>Unit Number</span><strong>${u.escapeHTML(unit.unitNumber)}</strong></div>
        <div class="detail-item"><span>Apartment / Unit Type</span><strong>${u.escapeHTML(unit.aptType || "—")}</strong></div>
        <div class="detail-item"><span>Specifics</span><strong>${u.escapeHTML(unit.specifics || "—")}</strong></div>
        <div class="detail-item"><span>Floor</span><strong>${u.escapeHTML(unit.floor || "—")}</strong></div>
        <div class="detail-item"><span>Bedrooms / Bathrooms</span><strong>${u.escapeHTML(unit.bedrooms || "—")} / ${u.escapeHTML(unit.bathrooms || "—")}</strong></div>
        <div class="detail-item"><span>Furnishing</span><strong>${u.escapeHTML(unit.furnished || "—")}</strong></div>
        <div class="detail-item"><span>Parking</span><strong>${u.escapeHTML(unit.parkingNumber || "—")}</strong></div>
        <div class="detail-item"><span>Standard Rent</span><strong>${u.money(unit.rentValue)}</strong></div>
        <div class="detail-item"><span>Status</span><strong>${u.titleCase(unit.status)}</strong></div>
        <div class="detail-item"><span>Notes</span><strong>${u.escapeHTML(unit.notes || "—")}</strong></div>
      </div>${editable ? `<div class="form-actions"><button class="button button-primary" data-edit-unit>Edit unit information</button></div>` : ""}`;
    }

    if (tabId === "kahramaa") {
      return `<div class="callout">Kahramaa details belong to the permanent unit record. They remain unchanged when a tenant leaves unless the utility account itself changes.</div><div style="height:14px"></div><div class="detail-list">
        <div class="detail-item"><span>Electricity Number</span><strong>${u.escapeHTML(unit.kahramaa?.electricityNumber || "—")}</strong></div>
        <div class="detail-item"><span>Water Number</span><strong>${u.escapeHTML(unit.kahramaa?.waterNumber || "—")}</strong></div>
        <div class="detail-item"><span>Account Number</span><strong>${u.escapeHTML(unit.kahramaa?.accountNumber || "—")}</strong></div>
        <div class="detail-item"><span>Premise Number</span><strong>${u.escapeHTML(unit.kahramaa?.premiseNumber || "—")}</strong></div>
        <div class="detail-item"><span>Meter Number</span><strong>${u.escapeHTML(unit.kahramaa?.meterNumber || "—")}</strong></div>
        <div class="detail-item"><span>Account Holder</span><strong>${u.escapeHTML(unit.kahramaa?.accountHolder || "—")}</strong></div>
        <div class="detail-item"><span>Connection Status</span><strong>${u.escapeHTML(unit.kahramaa?.connectionStatus || "—")}</strong></div>
        <div class="detail-item"><span>Notes</span><strong>${u.escapeHTML(unit.kahramaa?.notes || "—")}</strong></div>
      </div>${editable ? `<div class="form-actions"><button class="button button-primary" data-edit-unit>Edit Kahramaa details</button></div>` : ""}`;
    }

    if (tabId === "tenant") {
      if (!tenant) return `${root.ui.emptyState("No active tenant", "This unit is currently available or under review.")}${root.auth.can("contract") ? `<div class="form-actions"><button class="button button-primary" data-new-tenant>Assign tenant & contract</button></div>` : ""}`;
      return `<div class="detail-list">
        <div class="detail-item"><span>Tenant Name</span><strong>${u.escapeHTML(tenant.name)}</strong></div>
        <div class="detail-item"><span>Tenant Type</span><strong>${u.escapeHTML(tenant.tenantType)}</strong></div>
        <div class="detail-item"><span>QID / CR</span><strong>${u.escapeHTML(tenant.qidOrCr || "—")}</strong></div>
        <div class="detail-item"><span>Nationality</span><strong>${u.escapeHTML(tenant.nationality || "—")}</strong></div>
        <div class="detail-item"><span>Mobile</span><strong>${u.escapeHTML(tenant.mobile || "—")}</strong></div>
        <div class="detail-item"><span>Email</span><strong>${u.escapeHTML(tenant.email || "—")}</strong></div>
        <div class="detail-item"><span>Occupants</span><strong>${u.escapeHTML(tenant.occupants || "—")}</strong></div>
        <div class="detail-item"><span>Status</span><strong>${u.titleCase(tenant.status)}</strong></div>
      </div>${root.auth.can("contract") ? `<div class="form-actions"><button class="button button-secondary" data-close-tenancy>Tenant moving out</button><button class="button button-primary" data-new-tenant>Replace tenant</button></div>` : ""}`;
    }

    if (tabId === "contract") {
      if (!contract) return `${root.ui.emptyState("No active contract", "Create a tenant and contract to occupy or book this unit.")}${root.auth.can("contract") ? `<div class="form-actions"><button class="button button-primary" data-new-tenant>Create tenant & contract</button></div>` : ""}`;
      const daysLeft = u.daysBetween(new Date(), contract.endDate);
      return `<div class="unit-summary-grid">
        <div class="unit-summary-card"><span>Contract</span><strong>${u.escapeHTML(contract.contractNumber)}</strong></div>
        <div class="unit-summary-card"><span>Status</span><strong><span class="status-chip ${contract.status}">${u.titleCase(contract.status)}</span></strong></div>
        <div class="unit-summary-card"><span>Monthly Rent</span><strong>${u.money(contract.monthlyRent)}</strong></div>
        <div class="unit-summary-card"><span>Days Remaining</span><strong>${daysLeft >= 0 ? daysLeft : `${Math.abs(daysLeft)} overdue`}</strong></div>
      </div><div class="detail-list">
        <div class="detail-item"><span>Start Date</span><strong>${u.date(contract.startDate)}</strong></div>
        <div class="detail-item"><span>End Date</span><strong>${u.date(contract.endDate)}</strong></div>
        <div class="detail-item"><span>Annual Rent</span><strong>${u.money(contract.annualRent)}</strong></div>
        <div class="detail-item"><span>Security Deposit</span><strong>${u.money(contract.securityDeposit)}</strong></div>
        <div class="detail-item"><span>Payment Frequency</span><strong>${u.escapeHTML(contract.paymentFrequency)}</strong></div>
        <div class="detail-item"><span>Number of Cheques</span><strong>${u.escapeHTML(contract.numberOfCheques)}</strong></div>
        <div class="detail-item"><span>Notice Period</span><strong>${u.escapeHTML(contract.noticePeriodDays)} days</strong></div>
        <div class="detail-item"><span>Terms</span><strong>${u.escapeHTML(contract.terms || "—")}</strong></div>
      </div><div class="form-actions"><button class="button button-secondary" data-print-contract>Print / PDF contract</button>${root.auth.can("contract") ? `<button class="button button-secondary" data-close-tenancy>Close contract</button><button class="button button-primary" data-new-tenant>Renew / replace</button>` : ""}</div>`;
    }

    if (tabId === "payments") {
      return `<div class="page-heading" style="margin-bottom:16px"><div><h3 style="margin-bottom:5px">Payment & receipt history</h3><p>${contract ? `Active contract ${u.escapeHTML(contract.contractNumber)}` : "No active contract"}</p></div>${root.auth.can("payment") && contract ? `<div class="page-actions"><button class="button button-primary" data-add-payment>Record payment & issue receipt</button></div>` : ""}</div>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Receipt</th><th>Due Date</th><th>Paid Date</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead><tbody>${payments.map((payment) => `<tr><td><div class="table-title">${u.escapeHTML(payment.receiptNumber || "Not issued")}</div></td><td>${u.date(payment.dueDate)}</td><td>${u.date(payment.paidDate)}</td><td>${u.money(payment.amount)}</td><td>${u.escapeHTML(payment.method || "—")}</td><td><span class="status-chip ${payment.status}">${u.titleCase(payment.status)}</span></td><td>${payment.receiptNumber ? `<button class="button button-secondary button-small" data-print-receipt="${payment.id}">Print</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7">${root.ui.emptyState("No payments", "Payment and receipt records will appear here.")}</td></tr>`}</tbody></table></div>`;
    }

    if (tabId === "history") {
      const contractRows = contracts.map((item) => {
        const previousTenant = tenantMap.get(item.tenantId);
        return `<tr><td>${u.escapeHTML(item.contractNumber)}</td><td>${u.escapeHTML(previousTenant?.name || "Tenant")}</td><td>${u.date(item.startDate)}</td><td>${u.date(item.endDate)}</td><td><span class="status-chip ${item.status}">${u.titleCase(item.status)}</span></td></tr>`;
      }).join("");
      return `<h3>Tenant & contract history</h3><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Contract</th><th>Tenant</th><th>Start</th><th>End</th><th>Status</th></tr></thead><tbody>${contractRows || `<tr><td colspan="5">No history yet.</td></tr>`}</tbody></table></div><div style="height:22px"></div><h3>Activity log</h3><div class="timeline">${logs.map((log) => `<div class="timeline-item"><span class="timeline-mark"></span><div><strong>${u.escapeHTML(log.description)}</strong><p>${u.escapeHTML(log.userName || "System")}</p></div><time>${u.dateTime(log.createdAt)}</time></div>`).join("") || `<div class="muted">No activity recorded.</div>`}</div>`;
    }
    return "";
  }

  function bindTabActions(tabId, bundle, instance) {
    instance.modal.querySelectorAll("[data-edit-unit]").forEach((button) => button.addEventListener("click", () => {
      instance.close();
      root.modules.properties.openUnitForm(bundle.unit);
    }));
    instance.modal.querySelectorAll("[data-new-tenant]").forEach((button) => button.addEventListener("click", () => openTenantContractForm(bundle, instance)));
    instance.modal.querySelectorAll("[data-close-tenancy]").forEach((button) => button.addEventListener("click", () => closeTenancy(bundle, instance)));
    instance.modal.querySelector("[data-print-contract]")?.addEventListener("click", () => printContract(bundle));
    instance.modal.querySelector("[data-add-payment]")?.addEventListener("click", () => openPaymentForm(bundle, instance));
    instance.modal.querySelectorAll("[data-print-receipt]").forEach((button) => button.addEventListener("click", () => {
      const payment = bundle.payments.find((row) => row.id === button.dataset.printReceipt);
      printReceipt(bundle, payment);
    }));
  }

  function openTenantContractForm(bundle, parentInstance = null, options = {}) {
    const { unit, contract } = bundle;
    parentInstance?.close();
    const returnToUnit = options.returnToUnit !== false;
    const defaultStart = u.isoDate();
    const defaultEnd = u.isoDate(u.addMonths(new Date(), 12));
    const instance = root.ui.openModal({
      title: contract ? "Replace tenant / renew contract" : "Assign tenant & contract",
      eyebrow: `${bundle.property.name} · ${unit.unitNumber}`,
      size: "medium",
      content: `${contract ? `<div class="callout warning">Saving this form will close the current tenancy and preserve it in history before creating the new tenant and contract.</div><div style="height:16px"></div>` : ""}<form id="tenant-contract-form" class="form-grid">
        <label><span>Tenant Name</span><input name="tenantName" required></label>
        <label><span>Tenant Type</span><select name="tenantType"><option>Individual</option><option>Company</option></select></label>
        <label><span>QID / CR Number</span><input name="qidOrCr"></label>
        <label><span>Nationality</span><input name="nationality"></label>
        <label><span>Mobile</span><input name="mobile"></label>
        <label><span>Email</span><input name="email" type="email"></label>
        <label><span>Number of Occupants</span><input name="occupants" type="number" min="0"></label>
        <label><span>Emergency Contact</span><input name="emergencyContact"></label>
        <label><span>Contract Number</span><input name="contractNumber" placeholder="Automatic if empty"></label>
        <label><span>Payment Frequency</span><select name="paymentFrequency"><option>Monthly</option><option>Quarterly</option><option>Semiannual</option><option>Annual</option></select></label>
        <label><span>Start Date</span><input name="startDate" type="date" required value="${defaultStart}"></label>
        <label><span>End Date</span><input name="endDate" type="date" required value="${defaultEnd}"></label>
        <label><span>Monthly Rent (QAR)</span><input name="monthlyRent" type="number" min="1" required value="${contract?.monthlyRent || unit.rentValue || 0}"></label>
        <label><span>Security Deposit</span><input name="securityDeposit" type="number" min="0" value="${contract?.monthlyRent || unit.rentValue || 0}"></label>
        <label><span>Number of Cheques</span><input name="numberOfCheques" type="number" min="0" value="12"></label>
        <label><span>Notice Period (days)</span><input name="noticePeriodDays" type="number" min="0" value="60"></label>
        <label class="span-2"><span>Contract Terms</span><textarea name="terms">Demo contract terms. Final legal wording must be approved by 59 Real Estate.</textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Create tenancy</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", () => {
      instance.close();
      if (returnToUnit) open(unit.id, contract ? "tenant" : "overview");
    });
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#tenant-contract-form");
      if (!form.reportValidity()) return;
      try {
        root.ui.showLoading("Creating tenant and contract…");
        await root.data.assignTenantAndContract(unit.id, Object.fromEntries(new FormData(form)));
        instance.close();
        root.ui.toast("Tenant and contract created. Previous tenancy remains in history.", "success");
        await open(unit.id, "overview");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  async function closeTenancy(bundle, parentInstance) {
    parentInstance.close();
    const confirmed = await root.ui.confirm({ title: "Close current tenancy", message: `Move ${bundle.tenant?.name || "the current tenant"} out of ${bundle.property.name} · ${bundle.unit.unitNumber}? The tenant and contract will remain in history.`, confirmLabel: "Close tenancy", danger: true });
    if (!confirmed) { await open(bundle.unit.id, "tenant"); return; }
    try {
      root.ui.showLoading("Closing tenancy…");
      await root.data.closeTenancy(bundle.unit.id);
      root.ui.toast("Tenancy closed and unit marked vacant.", "success");
      await open(bundle.unit.id, "history");
    } catch (error) { root.ui.toast(error.message, "error"); }
    finally { root.ui.hideLoading(); }
  }

  function openPaymentForm(bundle, parentInstance = null, options = {}) {
    parentInstance?.close();
    const returnToUnit = options.returnToUnit !== false;
    const instance = root.ui.openModal({
      title: "Record payment & issue receipt",
      eyebrow: `${bundle.property.name} · ${bundle.unit.unitNumber}`,
      content: `<form id="payment-form" class="form-grid">
        <label><span>Due Date</span><input name="dueDate" type="date" required value="${u.isoDate()}"></label>
        <label><span>Paid Date</span><input name="paidDate" type="date" required value="${u.isoDate()}"></label>
        <label><span>Amount (QAR)</span><input name="amount" type="number" min="1" required value="${bundle.contract?.monthlyRent || bundle.unit.rentValue}"></label>
        <label><span>Payment Method</span><select name="method"><option>Bank Transfer</option><option>Cheque</option><option>Cash</option><option>Online Payment</option></select></label>
        <label class="span-2"><span>Reference / Cheque Number</span><input name="reference"></label>
        <label class="span-2"><span>Notes</span><textarea name="notes"></textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Issue receipt</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", () => {
      instance.close();
      if (returnToUnit) open(bundle.unit.id, "payments");
    });
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#payment-form");
      if (!form.reportValidity()) return;
      try {
        root.ui.showLoading("Issuing receipt…");
        const payment = await root.data.createPayment(bundle.unit.id, Object.fromEntries(new FormData(form)));
        const refreshed = await root.data.getUnitBundle(bundle.unit.id);
        instance.close();
        root.ui.toast(`${payment.receiptNumber} issued.`, "success");
        printReceipt(refreshed, payment);
        await open(bundle.unit.id, "payments");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  async function assignTenant(unitId) {
    const bundle = await root.data.getUnitBundle(unitId);
    if (!bundle) return root.ui.toast("Unit record not found.", "error");
    if (["maintenance", "unavailable"].includes(bundle.unit.status)) {
      return root.ui.toast("This unit is not currently available for a tenancy.", "error");
    }
    openTenantContractForm(bundle, null, { returnToUnit: false });
  }

  async function recordPayment(unitId) {
    const bundle = await root.data.getUnitBundle(unitId);
    if (!bundle) return root.ui.toast("Unit record not found.", "error");
    if (!bundle.contract || !bundle.tenant) return root.ui.toast("This unit has no active tenant and contract.", "error");
    openPaymentForm(bundle, null, { returnToUnit: false });
  }

  function printContract(bundle) {
    const { property, unit, tenant, contract } = bundle;
    if (!contract || !tenant) return root.ui.toast("No active contract to print.", "error");
    root.ui.printDocument(`Contract ${contract.contractNumber}`, `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Private Property Portfolio</div></div><div class="meta"><h1 class="title">Residential / Commercial Lease Contract</h1><div>${u.escapeHTML(contract.contractNumber)}</div></div></header>
      <p>This demo contract is generated directly from the 59 Real Estate system. Final legal terms and Arabic wording must be approved before production use.</p>
      <div class="grid">
        <div class="item"><span>Property</span><strong>${u.escapeHTML(property.name)}</strong></div><div class="item"><span>Unit</span><strong>${u.escapeHTML(unit.unitNumber)} · ${u.escapeHTML(unit.aptType || "Unit")}</strong></div>
        <div class="item"><span>Tenant</span><strong>${u.escapeHTML(tenant.name)}</strong></div><div class="item"><span>QID / CR</span><strong>${u.escapeHTML(tenant.qidOrCr || "—")}</strong></div>
        <div class="item"><span>Contract Start</span><strong>${u.date(contract.startDate)}</strong></div><div class="item"><span>Contract End</span><strong>${u.date(contract.endDate)}</strong></div>
        <div class="item"><span>Monthly Rent</span><strong>${u.money(contract.monthlyRent)}</strong></div><div class="item"><span>Annual Rent</span><strong>${u.money(contract.annualRent)}</strong></div>
        <div class="item"><span>Security Deposit</span><strong>${u.money(contract.securityDeposit)}</strong></div><div class="item"><span>Payment Frequency</span><strong>${u.escapeHTML(contract.paymentFrequency)}</strong></div>
        <div class="item"><span>Kahramaa Account</span><strong>${u.escapeHTML(unit.kahramaa?.accountNumber || "—")}</strong></div><div class="item"><span>Electricity / Water</span><strong>${u.escapeHTML(unit.kahramaa?.electricityNumber || "—")} / ${u.escapeHTML(unit.kahramaa?.waterNumber || "—")}</strong></div>
      </div><h3>Terms and conditions</h3><p>${u.escapeHTML(contract.terms || "")}</p><div class="signature-grid"><div class="signature">For 59 Real Estate</div><div class="signature">Tenant Signature</div></div><div class="footer">59 Real Estate · Confidential · Generated from the demo system</div>`);
  }

  function printReceipt(bundle, payment) {
    if (!payment) return root.ui.toast("Receipt record not found.", "error");
    const tenant = bundle.tenantMap?.get(payment.tenantId) || bundle.tenant;
    root.ui.printDocument(payment.receiptNumber, `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Official Rental Receipt · Demo</div></div><div class="meta"><h1 class="title">RECEIPT</h1><div>${u.escapeHTML(payment.receiptNumber)}</div><div>${u.date(payment.paidDate)}</div></div></header><div class="amount">${u.money(payment.amount)}</div><div class="grid">
      <div class="item"><span>Received From</span><strong>${u.escapeHTML(tenant?.name || "Tenant")}</strong></div><div class="item"><span>Property / Unit</span><strong>${u.escapeHTML(bundle.property.name)} · ${u.escapeHTML(bundle.unit.unitNumber)}</strong></div>
      <div class="item"><span>Contract</span><strong>${u.escapeHTML(bundle.contract?.contractNumber || payment.contractId)}</strong></div><div class="item"><span>Payment Method</span><strong>${u.escapeHTML(payment.method || "—")}</strong></div>
      <div class="item"><span>Payment Reference</span><strong>${u.escapeHTML(payment.reference || "—")}</strong></div><div class="item"><span>Payment Period / Due</span><strong>${u.date(payment.dueDate)}</strong></div>
      <div class="item"><span>Status</span><strong>PAID</strong></div><div class="item"><span>Recorded By</span><strong>${u.escapeHTML(root.state.user?.name || "59 Real Estate")}</strong></div>
    </div><div class="signature-grid"><div class="signature">Received By</div><div class="signature">Authorized Signature / Stamp</div></div><div class="footer">This demo receipt was generated from local IndexedDB records. Production receipts will include approved company registration and verification details.</div>`);
  }

  root.modules.unitDetail = { open, assignTenant, recordPayment, printContract, printReceipt };
})();
