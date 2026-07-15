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
    ["maintenance", "Maintenance"],
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
      return `<div class="detail-list">
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
      const documentStatus = contract.contractDocument?.status || "draft";
      return `<div class="unit-summary-grid">
        <div class="unit-summary-card"><span>Contract</span><strong>${u.escapeHTML(contract.contractNumber)}</strong></div>
        <div class="unit-summary-card"><span>Lease Status</span><strong><span class="status-chip ${contract.status}">${u.titleCase(contract.status)}</span></strong></div>
        <div class="unit-summary-card"><span>Document</span><strong><span class="status-chip ${documentStatus === "final" ? "completed" : "pending"}">${documentStatus === "final" ? "Approved & Locked" : "Draft"}</span></strong></div>
        <div class="unit-summary-card"><span>Days Remaining</span><strong>${daysLeft >= 0 ? daysLeft : `${Math.abs(daysLeft)} overdue`}</strong></div>
      </div><div class="detail-list">
        <div class="detail-item"><span>Start Date</span><strong>${u.date(contract.startDate)}</strong></div>
        <div class="detail-item"><span>End Date</span><strong>${u.date(contract.endDate)}</strong></div>
        <div class="detail-item"><span>Annual Rent</span><strong>${u.money(contract.annualRent)}</strong></div>
        <div class="detail-item"><span>Security Deposit</span><strong>${u.money(contract.securityDeposit)}</strong></div>
        <div class="detail-item"><span>Payment Frequency</span><strong>${u.escapeHTML(contract.paymentFrequency)}</strong></div>
        <div class="detail-item"><span>Expected Method</span><strong>${u.escapeHTML(contract.expectedPaymentMethod || "—")}</strong></div>
        <div class="detail-item"><span>First Due Date</span><strong>${u.date(contract.firstDueDate || contract.startDate)}</strong></div>
        <div class="detail-item"><span>Number of Cheques / Installments</span><strong>${u.escapeHTML(contract.numberOfCheques)}</strong></div>
        <div class="detail-item"><span>Grace Period</span><strong>${u.number(contract.gracePeriodDays || 0)} days</strong></div>
        <div class="detail-item"><span>Notice Period</span><strong>${u.escapeHTML(contract.noticePeriodDays)} days</strong></div>
        <div class="detail-item"><span>Terms</span><strong>${u.escapeHTML(contract.terms || "—")}</strong></div>
      </div><div class="form-actions"><button class="button button-secondary" data-print-contract>${root.ui.documentActionText("Preview / Print Contract", "Contract PDF")}</button>${root.auth.can("contract") || ["ceo", "admin"].includes(root.state.user?.role) ? `<button class="button button-primary" data-open-contract-editor>${documentStatus === "final" ? "Review Bilingual Contract" : "Review / Edit Bilingual Contract"}</button>` : ""}${root.auth.can("contract") ? `<button class="button button-secondary" data-close-tenancy>Close contract</button><button class="button button-primary" data-new-tenant>Renew / replace</button>` : ""}</div>`;
    }

    if (tabId === "payments") {
      const activeSchedule = payments.filter((payment) => payment.contractId === contract?.id && payment.isSchedule);
      const outstandingBalance = activeSchedule.reduce((sum, payment) => sum + Number(payment.balance || 0), 0);
      const nextDue = activeSchedule.find((payment) => !["paid", "cleared", "cancelled", "waived"].includes(payment.status));
      return `<div class="page-heading" style="margin-bottom:16px"><div><h3 style="margin-bottom:5px">Payment Schedule</h3></div>${root.auth.can("payment") && contract ? `<div class="page-actions"><button class="button button-primary" data-add-payment>Record payment / cheque</button></div>` : ""}</div>
      <div class="unit-summary-grid payment-summary-grid">
        <div class="unit-summary-card"><span>Scheduled Installments</span><strong>${u.number(activeSchedule.length)}</strong></div>
        <div class="unit-summary-card"><span>Next Contractual Due</span><strong>${u.date(nextDue?.dueDate)}</strong></div>
        <div class="unit-summary-card"><span>Outstanding</span><strong>${u.money(outstandingBalance)}</strong></div>
        <div class="unit-summary-card"><span>Expected Method</span><strong>${u.escapeHTML(contract?.expectedPaymentMethod || "—")}</strong></div>
      </div>
      <div class="data-table-wrap desktop-record-table"><table class="data-table payment-schedule-table"><thead><tr><th>Installment / Period</th><th>Due Date</th><th>Expected Method</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${activeSchedule.map((payment) => `<tr><td><div class="table-title">#${u.number(payment.installmentNumber || 0)}</div><div class="table-subtitle">${u.date(payment.coverageStart)} – ${u.date(payment.coverageEnd)}</div></td><td>${u.date(payment.dueDate)}</td><td><div class="table-title">${u.escapeHTML(payment.expectedMethod || payment.method || "—")}</div><div class="table-subtitle">${payment.chequeNumber ? `Cheque ${u.escapeHTML(payment.chequeNumber)}` : ""}</div></td><td>${u.money(payment.amountDue)}</td><td>${u.money(payment.amountPaid)}</td><td>${u.money(payment.balance)}</td><td><span class="status-chip ${payment.status}">${u.titleCase(payment.status)}</span></td><td><div class="row-actions">${payment.balance > 0 && root.auth.can("payment") ? `<button class="button button-primary button-small" data-record-payment="${payment.id}">${["cheque_received","ready_to_deposit","deposited"].includes(payment.status) ? "Settle / Update" : "Record"}</button>` : ""}${payment.receiptNumber ? `<button class="button button-secondary button-small" data-print-receipt="${payment.id}">${root.ui.documentActionText("Print receipt", "Receipt PDF")}</button>` : ""}</div></td></tr>`).join("") || `<tr><td colspan="8">${root.ui.emptyState("No payment schedule", "Create an active contract to generate fixed contractual due dates.")}</td></tr>`}</tbody></table></div>
      <div class="mobile-record-list unit-payment-mobile-list">${activeSchedule.map((payment) => `<article class="mobile-payment-card"><div class="mobile-payment-head"><span><b>Installment #${u.number(payment.installmentNumber || 0)}</b><small>${u.date(payment.coverageStart)} – ${u.date(payment.coverageEnd)}</small></span><span class="status-chip ${payment.status}">${u.titleCase(payment.status)}</span></div><div class="mobile-payment-amount"><span><small>Balance</small><strong>${u.money(payment.balance)}</strong></span><span><small>Due Date</small><b>${u.date(payment.dueDate)}</b></span></div><div class="mobile-payment-meta"><span><small>Method</small><b>${u.escapeHTML(payment.expectedMethod || payment.method || "—")}</b></span><span><small>Paid</small><b>${u.money(payment.amountPaid)}</b></span></div><div class="mobile-payment-actions">${payment.balance > 0 && root.auth.can("payment") ? `<button class="button button-primary" data-record-payment="${payment.id}">${["cheque_received","ready_to_deposit","deposited"].includes(payment.status) ? "Settle / Update" : "Record Payment"}</button>` : ""}${payment.receiptNumber ? `<button class="button button-secondary" data-print-receipt="${payment.id}">Receipt PDF</button>` : ""}</div></article>`).join("") || root.ui.emptyState("No payment schedule", "Create an active contract to generate fixed contractual due dates.")}</div>`;
    }

    if (tabId === "maintenance") {
      const jobs = bundle.maintenanceJobs || [];
      const openJobs = jobs.filter((job) => ["reported", "reviewed", "scheduled", "dispatched", "in_progress", "waiting_parts", "reopened"].includes(job.status));
      const completedJobs = jobs.filter((job) => ["completed", "verified", "closed"].includes(job.status));
      const totalCost = completedJobs.reduce((sum, job) => sum + Number(job.actualCost || job.estimatedCost || 0), 0);
      return `<div class="page-heading" style="margin-bottom:16px"><div><h3 style="margin-bottom:5px">Unit maintenance</h3></div>${root.auth.can("create") ? `<div class="page-actions"><button class="button button-primary" data-add-maintenance>New maintenance job</button></div>` : ""}</div>
        <div class="unit-summary-grid">
          <div class="unit-summary-card"><span>Open Jobs</span><strong>${openJobs.length}</strong></div>
          <div class="unit-summary-card"><span>Completed Jobs</span><strong>${completedJobs.length}</strong></div>
          <div class="unit-summary-card"><span>Recorded Cost</span><strong>${u.money(totalCost)}</strong></div>
          <div class="unit-summary-card"><span>Unit Availability</span><strong>${u.titleCase(unit.status)}</strong></div>
        </div>
        <div class="data-table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Job</th><th>Work</th><th>Status</th><th>Assigned</th><th>Expected</th><th>Cost</th></tr></thead><tbody>${jobs.map((job) => `<tr class="clickable" data-maintenance-id="${job.id}"><td><div class="table-title">${u.escapeHTML(job.jobNumber)}</div><div class="table-subtitle">${u.titleCase(job.requestType)}</div></td><td><div class="table-title">${u.escapeHTML(job.title)}</div><div class="table-subtitle">${u.escapeHTML(job.issueCategory)}</div></td><td><span class="status-chip ${job.status}">${u.titleCase(job.status)}</span></td><td>${u.escapeHTML(job.assignedTo || "Unassigned")}</td><td>${u.date(job.expectedCompletionDate)}</td><td>${u.money(job.actualCost || job.estimatedCost)}</td></tr>`).join("") || `<tr><td colspan="6">${root.ui.emptyState("No maintenance history", "Create a job when the tenant reports an issue or when the unit needs turnover work.")}</td></tr>`}</tbody></table></div>
        <div class="mobile-record-list unit-maintenance-mobile-list">${jobs.map((job) => `<button type="button" class="mobile-record-card" data-maintenance-id="${job.id}"><span class="mobile-record-top"><b>${u.escapeHTML(job.jobNumber)}</b><span class="status-chip ${job.status}">${u.titleCase(job.status)}</span></span><strong>${u.escapeHTML(job.title)}</strong><span class="mobile-record-meta"><span>Assigned</span><b>${u.escapeHTML(job.assignedTo || "Unassigned")}</b></span><span class="mobile-record-meta"><span>Expected</span><b>${u.date(job.expectedCompletionDate)}</b></span><span class="mobile-record-bottom"><b>${u.money(job.actualCost || job.estimatedCost)}</b><i>Open job →</i></span></button>`).join("") || root.ui.emptyState("No maintenance history", "Create a job when the tenant reports an issue or when the unit needs turnover work.")}</div>`;
    }

    if (tabId === "history") {
      const contractRows = contracts.map((item) => {
        const previousTenant = tenantMap.get(item.tenantId);
        return `<tr><td>${u.escapeHTML(item.contractNumber)}</td><td>${u.escapeHTML(previousTenant?.name || "Tenant")}</td><td>${u.date(item.startDate)}</td><td>${u.date(item.endDate)}</td><td><span class="status-chip ${item.status}">${u.titleCase(item.status)}</span></td></tr>`;
      }).join("");
      return `<h3>Tenant & contract history</h3><div class="data-table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Contract</th><th>Tenant</th><th>Start</th><th>End</th><th>Status</th></tr></thead><tbody>${contractRows || `<tr><td colspan="5">No history yet.</td></tr>`}</tbody></table></div><div class="mobile-record-list unit-history-mobile-list">${contracts.map((item) => { const previousTenant = tenantMap.get(item.tenantId); return `<article class="mobile-record-card"><span class="mobile-record-top"><b>${u.escapeHTML(item.contractNumber)}</b><span class="status-chip ${item.status}">${u.titleCase(item.status)}</span></span><strong>${u.escapeHTML(previousTenant?.name || "Tenant")}</strong><span class="mobile-record-meta"><span>Lease Period</span><b>${u.date(item.startDate)} – ${u.date(item.endDate)}</b></span></article>`; }).join("") || root.ui.emptyState("No tenancy history", "Previous tenants and contracts will appear here.")}</div><div style="height:22px"></div><h3>Activity log</h3><div class="timeline">${logs.map((log) => `<div class="timeline-item"><span class="timeline-mark"></span><div><strong>${u.escapeHTML(log.description)}</strong><p>${u.escapeHTML(log.userName || "System")}</p></div><time>${u.dateTime(log.createdAt)}</time></div>`).join("") || `<div class="muted">No activity recorded.</div>`}</div>`;
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
    instance.modal.querySelector("[data-print-contract]")?.addEventListener("click", () => root.modules.contractDocument.printContract(bundle));
    instance.modal.querySelector("[data-open-contract-editor]")?.addEventListener("click", () => {
      instance.close();
      root.modules.contractDocument.openEditor(bundle, { returnToUnit: true });
    });
    instance.modal.querySelector("[data-add-payment]")?.addEventListener("click", () => openPaymentForm(bundle, instance));
    instance.modal.querySelectorAll("[data-record-payment]").forEach((button) => button.addEventListener("click", () => openPaymentForm(bundle, instance, { scheduleId: button.dataset.recordPayment })));
    instance.modal.querySelector("[data-add-maintenance]")?.addEventListener("click", () => {
      instance.close();
      root.modules.maintenance.openJobForm({ unitId: bundle.unit.id, propertyId: bundle.property.id, returnToUnit: true });
    });
    instance.modal.querySelectorAll("[data-maintenance-id]").forEach((row) => row.addEventListener("click", () => {
      instance.close();
      root.modules.maintenance.openJob(row.dataset.maintenanceId);
    }));
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
    const defaultEndDate = u.addMonths(new Date(), 12);
    defaultEndDate.setDate(defaultEndDate.getDate() - 1);
    const defaultEnd = u.isoDate(defaultEndDate);
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
        <label><span>Expected Payment Method</span><select name="expectedPaymentMethod"><option>Post-Dated Cheque</option><option>Auto-Debit</option><option>Bank Transfer</option><option>Cash</option><option>Card</option><option>Mixed / Custom</option></select></label>
        <label><span>Grace Period (days)</span><input name="gracePeriodDays" type="number" min="0" value="0"></label>
        <label><span>Start Date</span><input name="startDate" type="date" required value="${defaultStart}"></label>
        <label><span>First Due Date</span><input name="firstDueDate" type="date" required value="${defaultStart}"></label>
        <label><span>End Date</span><input name="endDate" type="date" required value="${defaultEnd}"></label>
        <label><span>Monthly Rent (QAR)</span><input name="monthlyRent" type="number" min="1" required value="${contract?.monthlyRent || unit.rentValue || 0}"></label>
        <label><span>Security Deposit</span><input name="securityDeposit" type="number" min="0" value="${contract?.monthlyRent || unit.rentValue || 0}"></label>
        <label><span>Number of Cheques / Installments</span><input name="numberOfCheques" type="number" min="0" value="12"></label>
        <label><span>Notice Period (days)</span><input name="noticePeriodDays" type="number" min="0" value="60"></label>
        <label class="span-2"><span>Contract Terms</span><textarea name="terms">Final legal wording and approved lease conditions will appear here.</textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Create tenancy</button>`
    });
    const startInput = instance.modal.querySelector('[name="startDate"]');
    const firstDueInput = instance.modal.querySelector('[name="firstDueDate"]');
    const endInput = instance.modal.querySelector('[name="endDate"]');
    const frequencyInput = instance.modal.querySelector('[name="paymentFrequency"]');
    const chequeCountInput = instance.modal.querySelector('[name="numberOfCheques"]');
    startInput?.addEventListener("change", () => {
      if (!firstDueInput.dataset.manuallyChanged) firstDueInput.value = startInput.value;
      if (startInput.value) {
        const end = u.addMonths(new Date(`${startInput.value}T00:00:00`), 12);
        end.setDate(end.getDate() - 1);
        endInput.value = u.isoDate(end);
      }
    });
    firstDueInput?.addEventListener("change", () => { firstDueInput.dataset.manuallyChanged = "true"; });
    frequencyInput?.addEventListener("change", () => {
      const counts = { Monthly: 12, Quarterly: 4, Semiannual: 2, Annual: 1 };
      chequeCountInput.value = counts[frequencyInput.value] || chequeCountInput.value;
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
      root.ui.toast("Tenancy closed. The unit is now waiting for move-out inspection.", "success");
      await open(bundle.unit.id, "history");
    } catch (error) { root.ui.toast(error.message, "error"); }
    finally { root.ui.hideLoading(); }
  }

  function openPaymentForm(bundle, parentInstance = null, options = {}) {
    parentInstance?.close();
    const returnToUnit = options.returnToUnit !== false;
    const schedules = (bundle.payments || []).filter((payment) => payment.contractId === bundle.contract?.id && payment.isSchedule && payment.balance > 0 && !["cancelled", "waived"].includes(payment.status));
    const selected = schedules.find((payment) => payment.id === options.scheduleId) || schedules[0];
    if (!selected) {
      root.ui.toast("There is no outstanding contractual payment for this unit.", "error");
      if (returnToUnit) open(bundle.unit.id, "payments");
      return;
    }
    const expectedMethod = selected.expectedMethod || bundle.contract?.expectedPaymentMethod || "Bank Transfer";
    const instance = root.ui.openModal({
      title: "Record payment or cheque",
      eyebrow: `${bundle.property.name} · ${bundle.unit.unitNumber}`,
      size: "medium",
      content: `<div class="callout">Contractual due date: <strong>${u.date(selected.dueDate)}</strong>. This date stays fixed even when the tenant pays early or late.</div><div style="height:14px"></div><form id="payment-form" class="form-grid">
        <label class="span-2"><span>Payment Schedule</span><select name="scheduleId">${schedules.map((payment) => `<option value="${payment.id}" ${payment.id === selected.id ? "selected" : ""}>#${payment.installmentNumber} · ${u.date(payment.dueDate)} · ${u.money(payment.balance)} outstanding</option>`).join("")}</select></label>
        <label><span>Actual Paid / Received Date</span><input name="paidDate" type="date" required value="${u.isoDate()}"></label>
        <label><span>Amount (QAR)</span><input name="amount" type="number" min="1" step="0.01" required value="${selected.balance}"></label>
        <label><span>Payment Method</span><select name="method"><option ${expectedMethod === "Post-Dated Cheque" ? "selected" : ""}>Post-Dated Cheque</option><option ${expectedMethod === "Auto-Debit" ? "selected" : ""}>Auto-Debit</option><option ${expectedMethod === "Bank Transfer" ? "selected" : ""}>Bank Transfer</option><option>Cash</option><option>Card</option><option>Replacement Cheque</option></select></label>
        <label><span>Reference</span><input name="reference" placeholder="Transaction or payment reference"></label>
        <label><span>Cheque Number</span><input name="chequeNumber"></label>
        <label><span>Cheque Date</span><input name="chequeDate" type="date" value="${selected.chequeDate || selected.dueDate || ""}"></label>
        <label class="span-2"><span>Cheque Bank</span><input name="chequeBank"></label>
        <label class="span-2"><span>Notes</span><textarea name="notes"></textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save transaction</button>`
    });
    const scheduleSelect = instance.modal.querySelector('[name="scheduleId"]');
    const syncSchedule = () => {
      const row = schedules.find((payment) => payment.id === scheduleSelect.value);
      if (!row) return;
      instance.modal.querySelector('[name="amount"]').value = row.balance;
      instance.modal.querySelector('[name="chequeDate"]').value = row.chequeDate || row.dueDate || "";
    };
    scheduleSelect.addEventListener("change", syncSchedule);
    instance.modal.querySelector("[data-cancel]").addEventListener("click", () => {
      instance.close();
      if (returnToUnit) open(bundle.unit.id, "payments");
    });
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#payment-form");
      if (!form.reportValidity()) return;
      try {
        root.ui.showLoading("Saving payment record…");
        const payment = await root.data.createPayment(bundle.unit.id, Object.fromEntries(new FormData(form)));
        const refreshed = await root.data.getUnitBundle(bundle.unit.id);
        instance.close();
        if (payment.receiptNumber) {
          root.ui.toast(`${payment.receiptNumber} issued. The next due date remains unchanged.`, "success");
          printReceipt(refreshed, payment);
        } else {
          root.ui.toast(payment.status === "cheque_received" ? "Post-dated cheque registered. It remains unpaid until cleared." : "Payment instruction saved.", "success");
        }
        if (returnToUnit) await open(bundle.unit.id, "payments");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  async function assignTenant(unitId) {
    const bundle = await root.data.getUnitBundle(unitId);
    if (!bundle) return root.ui.toast("Unit record not found.", "error");
    if (["inspection", "maintenance", "renovation", "unavailable"].includes(bundle.unit.status)) {
      return root.ui.toast("This unit is not currently available for a tenancy.", "error");
    }
    openTenantContractForm(bundle, null, { returnToUnit: false });
  }

  async function recordPayment(unitId, scheduleId = null) {
    const bundle = await root.data.getUnitBundle(unitId);
    if (!bundle) return root.ui.toast("Unit record not found.", "error");
    if (!bundle.contract || !bundle.tenant) return root.ui.toast("This unit has no active tenant and contract.", "error");
    openPaymentForm(bundle, null, { returnToUnit: false, scheduleId });
  }

  function printContract(bundle) {
    return root.modules.contractDocument.printContract(bundle);
  }

  function printReceipt(bundle, payment) {
    if (!payment?.receiptNumber) return root.ui.toast("Receipt record not found.", "error");
    const tenant = bundle.tenantMap?.get(payment.tenantId) || bundle.tenant;
    const transactions = Array.isArray(payment.transactions) ? payment.transactions : [];
    const transaction = payment.lastTransaction || transactions[transactions.length - 1] || {
      receiptNumber: payment.receiptNumber,
      paidDate: payment.paidDate,
      amount: payment.amountPaid || payment.amountDue,
      method: payment.method,
      reference: payment.reference,
      notes: payment.notes
    };
    root.ui.printDocument(transaction.receiptNumber, `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Official Rental Receipt</div></div><div class="meta"><h1 class="title">RECEIPT</h1><div>${u.escapeHTML(transaction.receiptNumber)}</div><div>${u.date(transaction.paidDate)}</div></div></header><div class="amount">${u.money(transaction.amount)}</div><div class="grid">
      <div class="item"><span>Received From</span><strong>${u.escapeHTML(tenant?.name || "Tenant")}</strong></div><div class="item"><span>Property / Unit</span><strong>${u.escapeHTML(bundle.property.name)} · ${u.escapeHTML(bundle.unit.unitNumber)}</strong></div>
      <div class="item"><span>Contract</span><strong>${u.escapeHTML(bundle.contract?.contractNumber || payment.contractId)}</strong></div><div class="item"><span>Payment Method</span><strong>${u.escapeHTML(transaction.method || payment.method || "—")}</strong></div>
      <div class="item"><span>Payment Reference</span><strong>${u.escapeHTML(transaction.reference || "—")}</strong></div><div class="item"><span>Contractual Due Date</span><strong>${u.date(payment.dueDate)}</strong></div>
      <div class="item"><span>Rental Coverage</span><strong>${u.date(payment.coverageStart)} – ${u.date(payment.coverageEnd)}</strong></div><div class="item"><span>Actual Paid Date</span><strong>${u.date(transaction.paidDate)}</strong></div>
      <div class="item"><span>Remaining Balance</span><strong>${u.money(payment.balance)}</strong></div><div class="item"><span>Recorded By</span><strong>${u.escapeHTML(root.state.user?.name || "59 Real Estate")}</strong></div>
    </div><div class="signature-grid"><div class="signature">Received By</div><div class="signature">Authorized Signature / Stamp</div></div><div class="footer">The contractual due date remains fixed by the lease schedule. This receipt records the actual payment date only.</div>`);
  }

  root.modules.unitDetail = { open, assignTenant, recordPayment, printContract, printReceipt };
})();
