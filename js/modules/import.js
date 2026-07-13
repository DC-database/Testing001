(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;
  let currentRows = [];
  let currentValidation = null;

  function previewRows(rows) {
    return rows.slice(0, 8).map((row) => `
      <tr>
        <td>${row.__row}</td>
        <td><strong>${u.escapeHTML(row.property_code)}</strong><small>${u.escapeHTML(row.property_name)}</small></td>
        <td><strong>${u.escapeHTML(row.unit_number)}</strong><small>${u.escapeHTML(row.unit_type || "Unit")}</small></td>
        <td><span class="status-chip ${u.escapeHTML(row.unit_status.toLowerCase())}">${u.escapeHTML(row.unit_status)}</span></td>
        <td>${u.money(Number(String(row.monthly_rent || 0).replaceAll(",", "")) || 0)}</td>
        <td>${u.escapeHTML(row.tenant_name || "—")}</td>
        <td>${u.escapeHTML(row.contract_end || "—")}</td>
      </tr>`).join("");
  }

  function renderValidation(view) {
    const panel = view.querySelector("[data-import-preview]");
    if (!currentValidation) {
      panel.innerHTML = `<div class="import-empty"><span>CSV</span><strong>No file selected</strong><p>Choose the completed template to validate it before any record is written.</p></div>`;
      return;
    }

    panel.innerHTML = `
      <div class="import-summary ${currentValidation.valid ? "valid" : "invalid"}">
        <div><span>${currentValidation.valid ? "READY TO IMPORT" : "FIX REQUIRED"}</span><strong>${u.number(currentValidation.rowCount)} unit rows</strong></div>
        <div class="import-summary-metrics">
          <span><b>${u.number(currentValidation.propertyCount)}</b> Properties</span>
          <span><b>${u.number(currentValidation.occupiedCount)}</b> Occupied</span>
          <span><b>${u.number(currentValidation.bookedCount)}</b> Booked</span>
          <span><b>${u.number(currentValidation.vacantCount)}</b> Vacant</span>
        </div>
      </div>
      ${currentValidation.errors.length ? `<div class="import-messages error"><strong>${currentValidation.errors.length} error(s)</strong>${currentValidation.errors.slice(0, 12).map((item) => `<p>Row ${item.row}: ${u.escapeHTML(item.message)}</p>`).join("")}</div>` : ""}
      ${currentValidation.warnings.length ? `<details class="import-messages warning"><summary>${currentValidation.warnings.length} warning(s)</summary>${currentValidation.warnings.slice(0, 16).map((item) => `<p>Row ${item.row}: ${u.escapeHTML(item.message)}</p>`).join("")}</details>` : ""}
      <div class="data-table-wrap import-preview-table"><table class="data-table"><thead><tr><th>Row</th><th>Property</th><th>Unit</th><th>Status</th><th>Monthly Rent</th><th>Current Tenant</th><th>Contract End</th></tr></thead><tbody>${previewRows(currentRows)}</tbody></table></div>
      ${currentRows.length > 8 ? `<div class="import-more">Previewing 8 of ${u.number(currentRows.length)} rows.</div>` : ""}`;

    view.querySelector("[data-import-button]").disabled = !currentValidation.valid;
  }

  async function render(view) {
    currentRows = [];
    currentValidation = null;
    view.innerHTML = `
      <section class="page-heading premium-heading">
        <div><div class="eyebrow">BULK DATA MIGRATION</div><h1>Import the full portfolio at once.</h1><p>One row represents one unit. Occupied and booked rows can include the current tenant, contract and Kahramaa information, then the system separates everything into the correct records automatically.</p></div>
        <div class="page-actions"><button class="button button-secondary" data-download-template>Download CSV template</button></div>
      </section>

      <section class="import-steps">
        <article><span>01</span><div><strong>Download</strong><p>Use the provided template without renaming the column headers.</p></div></article>
        <article><span>02</span><div><strong>Complete</strong><p>Paste or copy the existing Excel information into one row per unit.</p></div></article>
        <article><span>03</span><div><strong>Validate</strong><p>The system checks statuses, dates, duplicate units and required tenancy details.</p></div></article>
        <article><span>04</span><div><strong>Import</strong><p>Use merge mode for updates or replace mode for the first clean migration.</p></div></article>
      </section>

      <section class="import-layout">
        <article class="panel import-control-panel">
          <header class="panel-header"><div><h3>Select portfolio CSV</h3><p>The original file remains on your computer. Nothing is uploaded during this local demo.</p></div></header>
          <div class="panel-body">
            <label class="drop-zone" for="portfolio-csv">
              <input id="portfolio-csv" type="file" accept=".csv,text/csv">
              <span class="drop-icon">＋</span>
              <strong>Choose completed CSV</strong>
              <small>UTF-8 CSV · one row per unit</small>
            </label>

            <div class="import-mode">
              <label><input type="radio" name="import-mode" value="merge" checked><span><strong>Merge and update</strong><small>Upsert matching property code + unit number. Best for later updates.</small></span></label>
              <label><input type="radio" name="import-mode" value="replace"><span><strong>Replace portfolio</strong><small>Clear properties, units, tenants, contracts and payments first. Best for initial migration.</small></span></label>
            </div>

            <button class="button button-primary button-large" data-import-button disabled>Import validated records</button>
            <p class="import-security-note">Before production, the same validated importer will write through the Firebase data provider and Firebase Security Rules. The CSV will not contain passwords or user accounts.</p>
          </div>
        </article>

        <article class="panel import-preview-panel">
          <header class="panel-header"><div><h3>Validation preview</h3><p>No database changes happen until the Import button is pressed.</p></div></header>
          <div class="panel-body" data-import-preview></div>
        </article>
      </section>

      <section class="panel import-field-guide">
        <header class="panel-header"><div><h3>Required logic</h3><p>These rules prevent the dashboard totals from becoming inaccurate again.</p></div></header>
        <div class="panel-body guide-grid">
          <div><span>UNIT STATUS</span><strong>occupied · booked · vacant · maintenance · unavailable</strong></div>
          <div><span>DATES</span><strong>Use YYYY-MM-DD, for example 2027-12-31</strong></div>
          <div><span>OCCUPIED / BOOKED</span><strong>Tenant name, contract start and contract end are required</strong></div>
          <div><span>VACANT / MAINTENANCE</span><strong>Leave tenant and contract columns blank</strong></div>
          <div><span>IDENTITY</span><strong>Property code + unit number must be unique</strong></div>
          <div><span>RENT</span><strong>Enter numbers only; do not type QAR inside the amount</strong></div>
        </div>
      </section>`;

    renderValidation(view);

    view.querySelector("[data-download-template]").addEventListener("click", () => root.importService.downloadTemplate());
    view.querySelector("#portfolio-csv").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try {
        currentRows = root.importService.parseCSV(await file.text());
        currentValidation = root.importService.validateRows(currentRows);
        renderValidation(view);
      } catch (error) {
        currentRows = [];
        currentValidation = { valid: false, rowCount: 0, propertyCount: 0, occupiedCount: 0, bookedCount: 0, vacantCount: 0, errors: [{ row: "—", message: error.message }], warnings: [] };
        renderValidation(view);
      }
    });

    view.querySelector("[data-import-button]").addEventListener("click", async () => {
      if (!currentValidation?.valid) return;
      const mode = view.querySelector('input[name="import-mode"]:checked')?.value || "merge";
      const confirmed = await root.ui.confirm({
        title: mode === "replace" ? "Replace portfolio records" : "Import portfolio records",
        message: mode === "replace"
          ? `This will delete the current local properties, units, tenants, contracts and payments, then import ${currentRows.length} unit rows.`
          : `This will merge ${currentRows.length} unit rows into the current local portfolio. Matching property code and unit number records will be updated.`,
        confirmLabel: mode === "replace" ? "Replace and import" : "Import records",
        danger: mode === "replace"
      });
      if (!confirmed) return;
      try {
        root.ui.showLoading(`Importing ${currentRows.length} portfolio rows…`);
        const result = await root.data.importPortfolioRows(currentRows, { mode });
        root.ui.toast(`${result.units} units imported across ${result.properties} properties.`, "success", 5000);
        await root.router.navigate("dashboard");
      } catch (error) {
        root.ui.toast(error.message, "error", 6000);
      } finally {
        root.ui.hideLoading();
      }
    });
  }

  root.modules.import = { render };
})();
