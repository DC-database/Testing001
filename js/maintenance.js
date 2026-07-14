(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;
  let activeTab = "overview";

  const TABS = [
    ["overview", "Overview"],
    ["requests", "Requests"],
    ["schedule", "Schedule"],
    ["active", "Active Jobs"],
    ["completed", "Completed"],
    ["costs", "Costs"]
  ];

  const OPEN_STATUSES = new Set(["reported", "reviewed", "scheduled", "dispatched", "in_progress", "waiting_parts", "reopened"]);
  const COMPLETE_STATUSES = new Set(["completed", "verified", "closed"]);
  const STATUS_LABELS = {
    reported: "Reported",
    reviewed: "Reviewed",
    scheduled: "Scheduled",
    dispatched: "Dispatched",
    in_progress: "In Progress",
    waiting_parts: "Waiting for Parts",
    completed: "Completed",
    verified: "Verified",
    closed: "Closed",
    cancelled: "Cancelled",
    reopened: "Reopened"
  };
  const TYPE_LABELS = {
    tenant_request: "Tenant Request",
    move_out_inspection: "Move-out Inspection",
    pre_leasing: "Pre-leasing Preparation",
    preventive: "Preventive Maintenance",
    emergency: "Emergency Repair",
    renovation: "Renovation"
  };

  function statusLabel(status) {
    return STATUS_LABELS[status] || u.titleCase(status);
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || u.titleCase(type);
  }

  function completionPerformance(job) {
    if (!job.actualCompletionDate || !job.expectedCompletionDate) return "—";
    const difference = u.daysBetween(job.actualCompletionDate, job.expectedCompletionDate);
    if (difference > 0) return `${difference} day${difference === 1 ? "" : "s"} early`;
    if (difference < 0) return `${Math.abs(difference)} day${difference === -1 ? "" : "s"} late`;
    return "On time";
  }

  function jobCost(job) {
    return Number(job.actualCost || job.estimatedCost || 0);
  }

  function jobContext(job, snapshot) {
    const property = snapshot.propertyMap.get(job.propertyId);
    const unit = snapshot.unitMap.get(job.unitId);
    return {
      property,
      unit,
      label: `${property?.name || "Property"} · ${unit?.unitNumber || "Unit"}`
    };
  }

  function compactJobCard(job, snapshot) {
    const context = jobContext(job, snapshot);
    const overdue = OPEN_STATUSES.has(job.status) && job.expectedCompletionDate && job.expectedCompletionDate < u.isoDate();
    return `<button class="maintenance-job-card ${job.priority} ${overdue ? "overdue" : ""}" data-maintenance-id="${job.id}">
      <div class="maintenance-card-top">
        <span class="maintenance-job-number">${u.escapeHTML(job.jobNumber)}</span>
        <span class="status-chip ${job.status}">${statusLabel(job.status)}</span>
      </div>
      <strong>${u.escapeHTML(job.title)}</strong>
      <small>${u.escapeHTML(context.label)} · ${u.escapeHTML(job.issueCategory)}</small>
      <div class="maintenance-card-meta">
        <span>${u.escapeHTML(job.assignedTo || "Unassigned")}</span>
        <span>${job.expectedCompletionDate ? u.date(job.expectedCompletionDate) : "No due date"}</span>
        <b>${u.money(jobCost(job))}</b>
      </div>
    </button>`;
  }

  function jobRow(job, snapshot) {
    const context = jobContext(job, snapshot);
    const overdue = OPEN_STATUSES.has(job.status) && job.expectedCompletionDate && job.expectedCompletionDate < u.isoDate();
    return `<tr class="clickable ${overdue ? "maintenance-row-overdue" : ""}" data-maintenance-id="${job.id}">
      <td><div class="table-title">${u.escapeHTML(job.jobNumber)}</div><div class="table-subtitle">${u.escapeHTML(typeLabel(job.requestType))}</div></td>
      <td><div class="table-title">${u.escapeHTML(context.label)}</div><div class="table-subtitle">${u.escapeHTML(job.issueCategory)}</div></td>
      <td><div class="table-title">${u.escapeHTML(job.title)}</div><div class="table-subtitle">${u.escapeHTML(job.assignedTo || "Unassigned")}</div></td>
      <td><span class="priority-chip ${job.priority}">${u.titleCase(job.priority)}</span></td>
      <td><span class="status-chip ${job.status}">${statusLabel(job.status)}</span></td>
      <td>${job.scheduledDate ? `${u.date(job.scheduledDate)}${job.scheduledTime ? `<small>${u.escapeHTML(job.scheduledTime)}</small>` : ""}` : "—"}</td>
      <td>${job.expectedCompletionDate ? u.date(job.expectedCompletionDate) : "—"}</td>
      <td><strong>${u.money(jobCost(job))}</strong></td>
    </tr>`;
  }

  async function render(view, params = {}) {
    const snapshot = await root.data.getMaintenanceSnapshot();
    if (params.tab && TABS.some(([id]) => id === params.tab)) activeTab = params.tab;
    const highestCost = snapshot.costsByProperty[0];

    view.innerHTML = `
      <section class="page-hero maintenance-hero">
        <div>
          <h1>Maintenance Operation</h1>
        </div>
        <div class="page-actions">
          ${root.auth.can("create") ? `<button class="button button-accent" data-new-maintenance>＋ New maintenance job</button>` : ""}
        </div>
      </section>

      <section class="maintenance-kpi-grid" aria-label="Maintenance summary">
        <button class="maintenance-kpi" data-maintenance-tab="active"><span>Open jobs</span><strong>${u.number(snapshot.openCount)}</strong><small>${u.number(snapshot.waitingPartsCount)} waiting for parts</small></button>
        <button class="maintenance-kpi warning" data-maintenance-tab="schedule"><span>Due today</span><strong>${u.number(snapshot.dueTodayCount)}</strong><small>${u.number(snapshot.overdueCount)} overdue</small></button>
        <button class="maintenance-kpi" data-maintenance-tab="completed"><span>Awaiting verification</span><strong>${u.number(snapshot.awaitingVerificationCount)}</strong><small>Complete before final closure</small></button>
        <button class="maintenance-kpi cost" data-maintenance-tab="costs"><span>Cost this year</span><strong>${u.compact(snapshot.costThisYear)}</strong><small>${u.money(snapshot.costThisMonth)} this month</small></button>
      </section>

      <div class="maintenance-tabs" role="tablist">
        ${TABS.map(([id, label]) => `<button type="button" data-maintenance-tab="${id}" class="${activeTab === id ? "active" : ""}" role="tab">${label}</button>`).join("")}
      </div>

      <section id="maintenance-tab-content"></section>

      <section class="maintenance-guidance">
        <div><strong>Occupied unit request</strong><span>The unit remains Occupied for normal owner-responsibility work such as AC cleaning, bulbs, plumbing or electrical repair.</span></div>
        <div><strong>Vacant-unit turnover</strong><span>After move-out, inspect first. If work is needed, use Under Maintenance or Under Renovation. When verified, the unit returns to Ready for Tenant.</span></div>
      </section>
    `;

    const draw = (tab) => {
      activeTab = tab;
      view.querySelectorAll("[data-maintenance-tab]").forEach((button) => button.classList.toggle("active", button.dataset.maintenanceTab === tab));
      const content = view.querySelector("#maintenance-tab-content");
      if (tab === "overview") content.innerHTML = renderOverview(snapshot, highestCost);
      else if (tab === "requests") content.innerHTML = renderTable(snapshot.jobs.filter((job) => ["reported", "reviewed", "reopened"].includes(job.status)), snapshot, "No new requests", "New tenant and inspection requests will appear here.");
      else if (tab === "schedule") content.innerHTML = renderSchedule(snapshot);
      else if (tab === "active") content.innerHTML = renderTable(snapshot.activeJobs, snapshot, "No active jobs", "Scheduled and in-progress maintenance jobs will appear here.");
      else if (tab === "completed") content.innerHTML = renderTable(snapshot.jobs.filter((job) => COMPLETE_STATUSES.has(job.status)), snapshot, "No completed jobs", "Completed, verified and closed work will appear here.");
      else if (tab === "costs") content.innerHTML = renderCosts(snapshot);
      bindContentActions(view, snapshot);
    };

    view.querySelectorAll("[data-maintenance-tab]").forEach((button) => button.addEventListener("click", () => draw(button.dataset.maintenanceTab)));
    view.querySelector("[data-new-maintenance]")?.addEventListener("click", () => openJobForm());
    draw(activeTab);
  }

  function renderOverview(snapshot, highestCost) {
    return `<section class="maintenance-overview-grid">
      <article class="premium-panel">
        <header class="premium-panel-header"><div><span>PRIORITY QUEUE</span><h3>What needs attention now</h3></div><button class="text-button" data-jump-tab="active">Open all jobs →</button></header>
        <div class="premium-panel-body maintenance-priority-list">
          ${snapshot.urgent.slice(0, 6).map((job) => compactJobCard(job, snapshot)).join("") || root.ui.emptyState("No urgent work", "There are no urgent or high-priority open jobs.")}
        </div>
      </article>
      <article class="premium-panel">
        <header class="premium-panel-header"><div><span>EXECUTIVE COST VIEW</span><h3>Maintenance spending</h3></div><button class="text-button" data-jump-tab="costs">Full cost view →</button></header>
        <div class="premium-panel-body maintenance-cost-summary">
          <div class="maintenance-cost-lead"><span>Total this year</span><strong>${u.money(snapshot.costThisYear)}</strong><small>${highestCost ? `${highestCost.propertyName} is currently the highest-cost property.` : "No completed costs yet."}</small></div>
          <div class="maintenance-cost-bars">
            ${snapshot.costsByProperty.slice(0, 5).map((row) => `<button data-property-maintenance="${row.propertyId}"><span>${u.escapeHTML(row.propertyName)}</span><i><b style="width:${snapshot.costsByProperty[0]?.cost ? row.cost / snapshot.costsByProperty[0].cost * 100 : 0}%"></b></i><strong>${u.money(row.cost)}</strong></button>`).join("") || root.ui.emptyState("No cost history", "Costs appear after jobs are completed.")}
          </div>
        </div>
      </article>
    </section>
    <section class="premium-panel maintenance-recent-panel">
      <header class="premium-panel-header"><div><span>RECENT OPERATIONS</span><h3>Latest maintenance jobs</h3></div></header>
      <div class="premium-panel-body maintenance-card-grid">${snapshot.jobs.slice(0, 8).map((job) => compactJobCard(job, snapshot)).join("")}</div>
    </section>`;
  }

  function renderTable(jobs, snapshot, emptyTitle, emptyMessage) {
    return `<article class="premium-panel maintenance-table-panel">
      <header class="premium-panel-header"><div><span>MAINTENANCE REGISTER</span><h3>${u.number(jobs.length)} job${jobs.length === 1 ? "" : "s"}</h3></div></header>
      <div class="data-table-wrap desktop-record-table"><table class="data-table maintenance-table"><thead><tr><th>Job</th><th>Property / Unit</th><th>Work</th><th>Priority</th><th>Status</th><th>Schedule</th><th>Expected</th><th>Cost</th></tr></thead><tbody>
        ${jobs.map((job) => jobRow(job, snapshot)).join("") || `<tr><td colspan="8">${root.ui.emptyState(emptyTitle, emptyMessage)}</td></tr>`}
      </tbody></table></div>
      <div class="mobile-record-list mobile-maintenance-job-list">${jobs.map((job) => compactJobCard(job, snapshot)).join("") || root.ui.emptyState(emptyTitle, emptyMessage)}</div>
    </article>`;
  }

  function renderSchedule(snapshot) {
    const jobs = snapshot.activeJobs
      .filter((job) => job.scheduledDate)
      .sort((a, b) => `${a.scheduledDate}${a.scheduledTime || ""}`.localeCompare(`${b.scheduledDate}${b.scheduledTime || ""}`));
    const groups = new Map();
    jobs.forEach((job) => {
      if (!groups.has(job.scheduledDate)) groups.set(job.scheduledDate, []);
      groups.get(job.scheduledDate).push(job);
    });
    return `<article class="premium-panel maintenance-schedule-panel">
      <header class="premium-panel-header"><div><span>SCHEDULE & DISPATCH</span><h3>Upcoming work</h3></div></header>
      <div class="premium-panel-body maintenance-schedule-list">
        ${[...groups.entries()].map(([date, rows]) => `<section class="maintenance-schedule-day"><header><strong>${u.date(date, { weekday: "long", day: "2-digit", month: "short" })}</strong><span>${rows.length} job${rows.length === 1 ? "" : "s"}</span></header>${rows.map((job) => {
          const context = jobContext(job, snapshot);
          return `<button data-maintenance-id="${job.id}"><time>${u.escapeHTML(job.scheduledTime || "TBC")}</time><span><strong>${u.escapeHTML(job.title)}</strong><small>${u.escapeHTML(context.label)} · ${u.escapeHTML(job.assignedTo || "Unassigned")}</small></span><span class="status-chip ${job.status}">${statusLabel(job.status)}</span></button>`;
        }).join("")}</section>`).join("") || root.ui.emptyState("No scheduled work", "Schedule a maintenance job to place it on the dispatch calendar.")}
      </div>
    </article>`;
  }

  function renderCosts(snapshot) {
    const maxProperty = snapshot.costsByProperty[0]?.cost || 1;
    const maxCategory = snapshot.costsByCategory[0]?.cost || 1;
    return `<section class="maintenance-cost-grid">
      <article class="premium-panel">
        <header class="premium-panel-header"><div><span>PROPERTY COSTS</span><h3>Completed maintenance spending</h3></div><strong>${u.money(snapshot.costThisYear)}</strong></header>
        <div class="premium-panel-body cost-ranking-list">
          ${snapshot.costsByProperty.map((row, index) => `<button data-property-maintenance="${row.propertyId}"><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span><strong>${u.escapeHTML(row.propertyName)}</strong><small>Owner maintenance cost</small></span><i><b style="width:${row.cost / maxProperty * 100}%"></b></i><strong>${u.money(row.cost)}</strong></button>`).join("") || root.ui.emptyState("No property costs", "Complete a job and enter actual costs to build this view.")}
        </div>
      </article>
      <article class="premium-panel">
        <header class="premium-panel-header"><div><span>COST BY JOB TYPE</span><h3>Where the money is going</h3></div></header>
        <div class="premium-panel-body cost-ranking-list compact">
          ${snapshot.costsByCategory.map((row, index) => `<div><span class="rank-number">${String(index + 1).padStart(2, "0")}</span><span><strong>${u.escapeHTML(row.category)}</strong><small>Completed work</small></span><i><b style="width:${row.cost / maxCategory * 100}%"></b></i><strong>${u.money(row.cost)}</strong></div>`).join("") || root.ui.emptyState("No category costs", "Completed jobs will be grouped here.")}
        </div>
      </article>
    </section>`;
  }

  function bindContentActions(view, snapshot) {
    view.querySelectorAll("[data-maintenance-id]").forEach((element) => element.addEventListener("click", () => openJob(element.dataset.maintenanceId)));
    view.querySelectorAll("[data-jump-tab]").forEach((button) => button.addEventListener("click", () => {
      activeTab = button.dataset.jumpTab;
      root.router.navigate("maintenance", { tab: activeTab });
    }));
    view.querySelectorAll("[data-property-maintenance]").forEach((button) => button.addEventListener("click", () => {
      root.router.navigate("properties", { propertyId: button.dataset.propertyMaintenance });
    }));
  }

  async function openJob(jobId) {
    const [job, snapshot] = await Promise.all([root.data.getMaintenanceJob(jobId), root.data.getMaintenanceSnapshot()]);
    if (!job) return root.ui.toast("Maintenance job not found.", "error");
    const context = jobContext(job, snapshot);
    const editable = root.auth.can("update");
    const performance = completionPerformance(job);
    const instance = root.ui.openModal({
      title: job.jobNumber,
      eyebrow: `${context.label} · ${typeLabel(job.requestType)}`,
      size: "wide",
      content: `<div class="maintenance-detail-head">
        <div><span class="status-chip ${job.status}">${statusLabel(job.status)}</span><span class="priority-chip ${job.priority}">${u.titleCase(job.priority)}</span><h2>${u.escapeHTML(job.title)}</h2><p>${u.escapeHTML(job.description || "No description recorded.")}</p></div>
        <div class="maintenance-detail-cost"><span>Recorded cost</span><strong>${u.money(jobCost(job))}</strong><small>${u.escapeHTML(job.costStatus || "estimated")}</small></div>
      </div>
      <div class="detail-list maintenance-detail-list">
        <div class="detail-item"><span>Property / Unit</span><strong>${u.escapeHTML(context.label)}</strong></div>
        <div class="detail-item"><span>Issue Category</span><strong>${u.escapeHTML(job.issueCategory)}</strong></div>
        <div class="detail-item"><span>Assigned To</span><strong>${u.escapeHTML(job.assignedTo || "Unassigned")}</strong></div>
        <div class="detail-item"><span>Responsibility</span><strong>${u.titleCase(job.responsibility)}</strong></div>
        <div class="detail-item"><span>Scheduled Dispatch</span><strong>${job.scheduledDate ? `${u.date(job.scheduledDate)} · ${u.escapeHTML(job.scheduledTime || "TBC")}` : "Not scheduled"}</strong></div>
        <div class="detail-item"><span>Expected Completion</span><strong>${u.date(job.expectedCompletionDate)}</strong></div>
        <div class="detail-item"><span>Actual Completion</span><strong>${u.date(job.actualCompletionDate)}</strong></div>
        <div class="detail-item"><span>Performance</span><strong>${u.escapeHTML(performance)}</strong></div>
        <div class="detail-item"><span>Availability Impact</span><strong>${job.availabilityImpact === "none" ? "Unit remains in normal status" : u.titleCase(job.availabilityImpact)}</strong></div>
        <div class="detail-item"><span>Reported By</span><strong>${u.escapeHTML(job.reportedBy || "—")}</strong></div>
      </div>
      <section class="maintenance-cost-breakdown">
        <div><span>Materials</span><strong>${u.money(job.materialCost)}</strong></div><div><span>Labour</span><strong>${u.money(job.laborCost)}</strong></div><div><span>Contractor</span><strong>${u.money(job.contractorCost)}</strong></div><div><span>Transport</span><strong>${u.money(job.transportCost)}</strong></div><div><span>Other</span><strong>${u.money(job.otherCost)}</strong></div>
      </section>
      <div class="callout"><strong>Work notes</strong><br>${u.escapeHTML(job.workNotes || "No work notes recorded.")}</div>
      ${job.completionNotes ? `<div style="height:12px"></div><div class="callout success"><strong>Completion notes</strong><br>${u.escapeHTML(job.completionNotes)}</div>` : ""}`,
      footer: `${editable ? `<button class="button button-secondary" data-edit>Edit job</button>${statusActions(job)}` : ""}<button class="button button-primary" data-close>Close</button>`
    });
    instance.modal.querySelector("[data-close]").addEventListener("click", instance.close);
    instance.modal.querySelector("[data-edit]")?.addEventListener("click", () => { instance.close(); openJobForm({ job }); });
    instance.modal.querySelectorAll("[data-next-status]").forEach((button) => button.addEventListener("click", async () => {
      try {
        root.ui.showLoading("Updating maintenance status…");
        await root.data.updateMaintenanceStatus(job.id, button.dataset.nextStatus);
        instance.close();
        root.ui.toast(`Job updated to ${statusLabel(button.dataset.nextStatus)}.`, "success");
        await root.router.navigate("maintenance", { tab: activeTab });
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    }));
  }

  function statusActions(job) {
    const transitions = {
      reported: [["reviewed", "Review"]],
      reviewed: [["scheduled", "Schedule"]],
      scheduled: [["dispatched", "Dispatch"]],
      dispatched: [["in_progress", "Start work"]],
      in_progress: [["waiting_parts", "Waiting for parts"], ["completed", "Complete"]],
      waiting_parts: [["in_progress", "Resume"], ["completed", "Complete"]],
      completed: [["verified", "Verify work"], ["reopened", "Reopen"]],
      verified: [["closed", "Close job"], ["reopened", "Reopen"]],
      reopened: [["in_progress", "Resume work"]]
    };
    return (transitions[job.status] || []).map(([status, label]) => `<button class="button ${status === "completed" || status === "verified" || status === "closed" ? "button-primary" : "button-secondary"}" data-next-status="${status}">${label}</button>`).join("");
  }

  async function openJobForm(options = {}) {
    if (!root.auth.can(options.job ? "update" : "create")) return root.ui.toast("Your role has read-only access.", "error");
    const [properties, units] = await Promise.all([root.data.getProperties(), root.data.getUnits()]);
    const job = options.job || null;
    const selectedUnitId = options.unitId || job?.unitId || "";
    const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
    const selectedPropertyId = selectedUnit?.propertyId || job?.propertyId || options.propertyId || properties[0]?.id || "";
    const teamSetting = await root.dbProvider.get("settings", "maintenanceTeam");
    const team = Array.isArray(teamSetting?.value) ? teamSetting.value : ["In-house Maintenance Team", "AC Technician", "Electrician", "Plumber", "External Contractor"];

    const instance = root.ui.openModal({
      title: job ? "Edit maintenance job" : "New maintenance job",
      eyebrow: "MAINTENANCE WORK ORDER",
      size: "wide",
      content: `<form id="maintenance-form" class="form-grid maintenance-form">
        <label><span>Property</span><select name="propertyId" id="maintenance-property" required>${properties.map((property) => `<option value="${property.id}" ${property.id === selectedPropertyId ? "selected" : ""}>${u.escapeHTML(property.name)}</option>`).join("")}</select></label>
        <label><span>Unit</span><select name="unitId" id="maintenance-unit" required></select></label>
        <label><span>Request Type</span><select name="requestType">${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}" ${job?.requestType === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>Issue Category</span><select name="issueCategory">${["Air Conditioning", "Electrical", "Plumbing", "Carpentry", "Painting", "Appliance", "Cleaning", "Pest Control", "Civil Work", "Kahramaa", "Inspection", "Turnover Preparation", "Renovation", "Fire Safety", "General Repair", "Other"].map((value) => `<option ${job?.issueCategory === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label class="span-2"><span>Job Title</span><input name="title" required value="${u.escapeHTML(job?.title || "")}" placeholder="Example: AC cleaning and airflow check"></label>
        <label class="span-2"><span>Description</span><textarea name="description" placeholder="Describe the issue and required work">${u.escapeHTML(job?.description || "")}</textarea></label>
        <label><span>Priority</span><select name="priority">${["low", "normal", "high", "urgent"].map((value) => `<option value="${value}" ${job?.priority === value || (!job && value === "normal") ? "selected" : ""}>${u.titleCase(value)}</option>`).join("")}</select></label>
        <label><span>Status</span><select name="status">${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${job?.status === value || (!job && value === "reported") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>Cost Responsibility</span><select name="responsibility">${[["owner", "Owner"], ["tenant", "Tenant"], ["warranty", "Warranty"], ["shared", "Shared"], ["not_covered", "Not Covered"]].map(([value, label]) => `<option value="${value}" ${job?.responsibility === value || (!job && value === "owner") ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label><span>Unit Availability Impact</span><select name="availabilityImpact"><option value="none" ${!job || job?.availabilityImpact === "none" ? "selected" : ""}>No change — unit remains occupied/ready</option><option value="inspection" ${job?.availabilityImpact === "inspection" ? "selected" : ""}>Inspection Pending</option><option value="maintenance" ${job?.availabilityImpact === "maintenance" ? "selected" : ""}>Under Maintenance</option><option value="renovation" ${job?.availabilityImpact === "renovation" ? "selected" : ""}>Under Renovation</option></select></label>
        <label><span>Reported By</span><input name="reportedBy" value="${u.escapeHTML(job?.reportedBy || "Property Manager")}"></label>
        <label><span>Assigned To</span><select name="assignedTo">${["Unassigned", ...team].map((value) => `<option ${job?.assignedTo === value ? "selected" : ""}>${u.escapeHTML(value)}</option>`).join("")}</select></label>
        <label><span>Assigned Type</span><select name="assignedType"><option ${job?.assignedType === "Internal / Approved Team" ? "selected" : ""}>Internal / Approved Team</option><option ${job?.assignedType === "Contractor" ? "selected" : ""}>Contractor</option></select></label>
        <label><span>Scheduled Date</span><input name="scheduledDate" type="date" value="${u.escapeHTML(job?.scheduledDate || u.isoDate())}"></label>
        <label><span>Dispatch Time</span><input name="scheduledTime" type="time" value="${u.escapeHTML(job?.scheduledTime || "09:00")}"></label>
        <label><span>Expected Completion</span><input name="expectedCompletionDate" type="date" value="${u.escapeHTML(job?.expectedCompletionDate || u.isoDate())}"></label>
        <label><span>Actual Completion</span><input name="actualCompletionDate" type="date" value="${u.escapeHTML(job?.actualCompletionDate || "")}"></label>
        <label><span>Estimated Cost</span><input name="estimatedCost" type="number" min="0" value="${job?.estimatedCost || 0}"></label>
        <label><span>Cost Status</span><select name="costStatus"><option ${job?.costStatus === "estimated" ? "selected" : ""}>estimated</option><option ${job?.costStatus === "approved" ? "selected" : ""}>approved</option><option ${job?.costStatus === "actual" ? "selected" : ""}>actual</option><option ${job?.costStatus === "paid" ? "selected" : ""}>paid</option></select></label>
        <label><span>Materials Cost</span><input name="materialCost" type="number" min="0" value="${job?.materialCost || 0}"></label>
        <label><span>Labour Cost</span><input name="laborCost" type="number" min="0" value="${job?.laborCost || 0}"></label>
        <label><span>Contractor Cost</span><input name="contractorCost" type="number" min="0" value="${job?.contractorCost || 0}"></label>
        <label><span>Transport Cost</span><input name="transportCost" type="number" min="0" value="${job?.transportCost || 0}"></label>
        <label><span>Other Cost</span><input name="otherCost" type="number" min="0" value="${job?.otherCost || 0}"></label>
        <label class="span-2"><span>Work Notes</span><textarea name="workNotes">${u.escapeHTML(job?.workNotes || "")}</textarea></label>
        <label class="span-2"><span>Completion Notes</span><textarea name="completionNotes">${u.escapeHTML(job?.completionNotes || "")}</textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>${job ? "Save changes" : "Create job"}</button>`
    });

    const propertySelect = instance.modal.querySelector("#maintenance-property");
    const unitSelect = instance.modal.querySelector("#maintenance-unit");
    const drawUnits = () => {
      const rows = units.filter((unit) => unit.propertyId === propertySelect.value).sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true }));
      unitSelect.innerHTML = rows.map((unit) => `<option value="${unit.id}" ${unit.id === selectedUnitId ? "selected" : ""}>${u.escapeHTML(unit.unitNumber)} · ${u.escapeHTML(unit.aptType || "Unit")} · ${u.titleCase(unit.status)}</option>`).join("");
    };
    propertySelect.addEventListener("change", drawUnits);
    drawUnits();

    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#maintenance-form");
      if (!form.reportValidity()) return;
      try {
        root.ui.showLoading(job ? "Saving maintenance job…" : "Creating maintenance job…");
        const values = Object.fromEntries(new FormData(form));
        if (job) values.id = job.id;
        const saved = await root.data.saveMaintenanceJob(values);
        instance.close();
        root.ui.toast(`${saved.jobNumber} saved.`, "success");
        if (options.returnToUnit && saved.unitId) await root.modules.unitDetail.open(saved.unitId, "maintenance");
        else await root.router.navigate("maintenance", { tab: activeTab });
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  root.modules.maintenance = { render, openJob, openJobForm };
})();
