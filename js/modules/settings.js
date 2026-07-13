(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view) {
    const logs = await root.data.getAuditLogs();
    view.innerHTML = `
      <section class="page-heading"><div><div class="eyebrow">DEMO ADMINISTRATION</div><h1>System Settings</h1><p>Local database backup, restore and demo reset. Firebase configuration will replace the local provider later.</p></div></section>
      <div class="callout warning">This is a local demonstration. The login protects the interface for testing, but production security begins only after Firebase Authentication, Security Rules, App Check and MFA are enabled.</div>
      <div style="height:16px"></div>
      <section class="settings-grid">
        <article class="settings-card"><h3>Export local backup</h3><p>Download all properties, units, tenants, contracts, payments, settings and audit records as one JSON backup.</p><button class="button button-primary" data-export>Export backup</button></article>
        <article class="settings-card"><h3>Restore local backup</h3><p>Replace the current IndexedDB records with a previously exported 59 Real Estate demo backup.</p><input id="restore-file" type="file" accept="application/json" style="margin-bottom:10px"><button class="button button-secondary" data-restore>Restore selected file</button></article>
        <article class="settings-card"><h3>Reset demonstration</h3><p>Delete all local changes and rebuild the original 395-unit sample portfolio. This cannot be undone without a backup.</p><button class="button button-danger" data-reset>Reset demo data</button></article>
        <article class="settings-card"><h3>Future Firebase provider</h3><p>The application already uses a replaceable data-service layer. Later, IndexedDB will be switched to Firebase Realtime Database without rewriting the screens.</p><div class="detail-list"><div class="detail-item"><span>Current Provider</span><strong>IndexedDB</strong></div><div class="detail-item"><span>Target Provider</span><strong>Firebase Realtime Database</strong></div></div></article>
      </section>
      <div style="height:16px"></div>
      <article class="panel"><header class="panel-header"><div><h3>Recent audit activity</h3><p>The latest 30 system actions recorded in this browser.</p></div></header><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Date / Time</th><th>User</th><th>Action</th><th>Description</th></tr></thead><tbody>${logs.slice(0,30).map((log) => `<tr><td>${u.dateTime(log.createdAt)}</td><td>${u.escapeHTML(log.userName || "System")}</td><td>${u.escapeHTML(log.action)}</td><td>${u.escapeHTML(log.description)}</td></tr>`).join("")}</tbody></table></div></article>`;

    view.querySelector("[data-export]").addEventListener("click", async () => {
      try {
        root.ui.showLoading("Preparing backup…");
        const backup = await root.data.backup();
        root.ui.downloadJSON(`59-real-estate-backup-${u.isoDate()}.json`, backup);
        root.ui.toast("Backup exported.", "success");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });

    view.querySelector("[data-restore]").addEventListener("click", async () => {
      const file = view.querySelector("#restore-file").files[0];
      if (!file) return root.ui.toast("Select a backup JSON file first.", "error");
      const confirmed = await root.ui.confirm({ title: "Restore local backup", message: "This will replace every current local record with the selected backup.", confirmLabel: "Restore backup", danger: true });
      if (!confirmed) return;
      try {
        root.ui.showLoading("Restoring backup…");
        const payload = JSON.parse(await file.text());
        await root.data.restore(payload);
        root.ui.toast("Backup restored.", "success");
        await root.router.navigate("dashboard");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });

    view.querySelector("[data-reset]").addEventListener("click", async () => {
      const confirmed = await root.ui.confirm({ title: "Reset demo data", message: "Delete every local change and recreate the original demo portfolio?", confirmLabel: "Reset everything", danger: true });
      if (!confirmed) return;
      try {
        root.ui.showLoading("Rebuilding demo portfolio…");
        await root.data.resetDemo();
        root.ui.toast("Demo data reset.", "success");
        await root.router.navigate("dashboard");
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  root.modules.settings = { render };
})();
