(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view) {
    const snapshot = await root.data.getDashboardSnapshot();
    const actionBadge = document.getElementById("nav-action-count");
    if (actionBadge) actionBadge.textContent = snapshot.actions.length;

    view.innerHTML = `
      <section class="page-heading">
        <div><div class="eyebrow">DAILY PRIORITIES</div><h1>Action Center</h1><p>One operational queue for contract risk, vacancies, maintenance and data-quality issues.</p></div>
        <div class="page-actions"><button class="button button-secondary" data-print>${root.ui.documentActionText("Print action list", "PDF action list")}</button></div>
      </section>
      <article class="panel">
        <header class="panel-header"><div><h3>${u.number(snapshot.actions.length)} active actions</h3><p>Sorted by urgency and days remaining.</p></div></header>
        <div class="data-table-wrap desktop-record-table">
          <table class="data-table">
            <thead><tr><th>Priority</th><th>Action</th><th>Record</th><th>Timing / Impact</th><th></th></tr></thead>
            <tbody>
              ${snapshot.actions.map((item) => `<tr class="clickable" data-unit-id="${item.unitId}"><td><span class="status-chip ${item.severity === "danger" ? "expired" : "expiring"}">${item.severity === "danger" ? "Urgent" : "Attention"}</span></td><td><div class="table-title">${u.escapeHTML(item.title)}</div></td><td>${u.escapeHTML(item.detail)}</td><td>${u.escapeHTML(item.meta)}</td><td>Open →</td></tr>`).join("") || `<tr><td colspan="5">${root.ui.emptyState("No actions", "The current records have no open actions.")}</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="mobile-record-list action-mobile-list">
          ${snapshot.actions.map((item) => `<button type="button" class="mobile-record-card action-mobile-card" data-unit-id="${item.unitId}"><span class="mobile-record-top"><b>${u.escapeHTML(item.detail)}</b><span class="status-chip ${item.severity === "danger" ? "expired" : "expiring"}">${item.severity === "danger" ? "Urgent" : "Attention"}</span></span><strong>${u.escapeHTML(item.title)}</strong><span class="mobile-record-meta"><span>Timing / Impact</span><b>${u.escapeHTML(item.meta)}</b></span><span class="mobile-record-bottom"><b>Open record</b><i>View →</i></span></button>`).join("") || root.ui.emptyState("No actions", "The current records have no open actions.")}
        </div>
      </article>`;

    view.querySelectorAll("[data-unit-id]").forEach((row) => row.addEventListener("click", () => root.modules.unitDetail.open(row.dataset.unitId)));
    view.querySelector("[data-print]")?.addEventListener("click", () => {
      root.ui.printDocument("59 Real Estate Action Center", `<header><div><div class="brand">59 REAL ESTATE</div><div class="muted">Private Portfolio System</div></div><div class="meta"><h1 class="title">Action Center</h1><div>${u.date(new Date())}</div></div></header><table><thead><tr><th>Priority</th><th>Action</th><th>Record</th><th>Timing / Impact</th></tr></thead><tbody>${snapshot.actions.map((item) => `<tr><td>${item.severity === "danger" ? "URGENT" : "ATTENTION"}</td><td>${u.escapeHTML(item.title)}</td><td>${u.escapeHTML(item.detail)}</td><td>${u.escapeHTML(item.meta)}</td></tr>`).join("")}</tbody></table><div class="footer">59 Real Estate · Confidential · Generated from current system records</div>`);
    });
  }

  root.modules.actions = { render };
})();
