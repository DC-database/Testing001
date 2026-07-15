(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  async function render(view) {
    const user = root.state.user;
    const isAdmin = root.auth.can("admin");
    const logs = isAdmin ? await root.data.getAuditLogs() : [];
    view.innerHTML = `
      <section class="page-heading"><div><h1>Settings</h1></div></section>
      <div class="settings-tabs"><button class="active" data-settings-tab="profile">My Settings</button>${isAdmin ? `<button data-settings-tab="system">Data Management</button>` : ""}</div>
      <section data-settings-panel="profile">
        <div class="profile-settings-grid">
          <article class="panel account-profile-hero"><span class="avatar">${u.initials(user.name)}</span><div><strong>${u.escapeHTML(user.name)}</strong><span>${u.escapeHTML(user.title || user.roleLabel)}</span><small>${u.escapeHTML(user.email)}</small></div></article>
          <article class="panel settings-form-panel"><h3>Profile</h3><form id="profile-settings-form" class="form-stack"><label><span>Display name</span><input name="name" required value="${u.escapeHTML(user.name)}"></label><label><span>Job title</span><input name="title" value="${u.escapeHTML(user.title || user.roleLabel)}"></label><label><span>Email</span><input name="email" type="email" required value="${u.escapeHTML(user.email)}"></label></form><div class="settings-form-actions"><button class="button button-primary" data-save-profile>Save profile</button></div></article>
          <article class="panel settings-form-panel"><h3>Change password</h3><form id="password-settings-form" class="form-stack"><label><span>Current password</span><input name="currentPassword" type="password" required></label><label><span>New password</span><input name="newPassword" type="password" required minlength="10"></label><label><span>Confirm new password</span><input name="confirmPassword" type="password" required minlength="10"></label></form><div class="settings-form-actions"><button class="button button-primary" data-change-password>Change password</button></div></article>
          <article class="panel settings-form-panel"><h3>Appearance</h3><p class="muted">Every new sign-in begins in Night mode. You may switch the current session here.</p><button class="button button-secondary theme-toggle"><span class="theme-icon">☾</span><span class="theme-label">Night</span></button></article>
        </div>
      </section>
      ${isAdmin ? `<section data-settings-panel="system" class="is-hidden">
        <div class="settings-grid">
          <article class="settings-card"><h3>Import portfolio</h3><p>Upload the approved CSV template to create or update properties, units, Kahramaa details, tenants and leases in bulk.</p><button class="button button-primary" data-open-import>Open Import Portfolio</button></article>
          <article class="settings-card"><h3>Export backup</h3><p>Download every current local record as one JSON backup before major changes.</p><button class="button button-primary" data-export>Export backup</button></article>
          <article class="settings-card"><h3>Restore backup</h3><p>Replace the local records with a previously exported backup.</p><input id="restore-file" type="file" accept="application/json"><button class="button button-secondary" data-restore>Restore selected file</button></article>
          <article class="settings-card"><h3>Reset local records</h3><p>Rebuild the original sample portfolio. Use only during local development.</p><button class="button button-danger" data-reset>Reset local data</button></article>
          <article class="settings-card"><h3>Bilingual tenancy contract</h3><p>Manage the controlled English/Arabic master template used for new tenancy contracts. Approved contracts remain locked to their saved version.</p><button class="button button-primary" data-contract-template>Open Contract Template</button></article>
          <article class="settings-card"><h3>Production data provider</h3><p>The screens use a replaceable data service. Firebase Realtime Database will become the official read/write source later.</p><div class="detail-list"><div class="detail-item"><span>Current</span><strong>IndexedDB</strong></div><div class="detail-item"><span>Target</span><strong>Firebase Realtime Database</strong></div></div></article>
        </div>
        <article class="panel" style="margin-top:16px"><header class="panel-header"><div><h3>Recent audit activity</h3><p>Latest actions recorded in this browser.</p></div></header><div class="data-table-wrap desktop-record-table"><table class="data-table"><thead><tr><th>Date / Time</th><th>User</th><th>Action</th><th>Description</th></tr></thead><tbody>${logs.slice(0,30).map((log)=>`<tr><td>${u.dateTime(log.createdAt)}</td><td>${u.escapeHTML(log.userName||"System")}</td><td>${u.escapeHTML(log.action)}</td><td>${u.escapeHTML(log.description)}</td></tr>`).join("")}</tbody></table></div><div class="mobile-record-list audit-mobile-list">${logs.slice(0,30).map((log)=>`<article class="mobile-record-card audit-mobile-card"><span class="mobile-record-top"><b>${u.escapeHTML(log.action)}</b><i>${u.dateTime(log.createdAt)}</i></span><strong>${u.escapeHTML(log.description)}</strong><span class="mobile-record-meta"><span>User</span><b>${u.escapeHTML(log.userName||"System")}</b></span></article>`).join("") || root.ui.emptyState("No audit activity", "Administrative changes will appear here.")}</div></article>
      </section>` : ""}`;

    view.querySelectorAll("[data-settings-tab]").forEach((button)=>button.addEventListener("click",()=>{
      view.querySelectorAll("[data-settings-tab]").forEach((item)=>item.classList.toggle("active",item===button));
      view.querySelectorAll("[data-settings-panel]").forEach((panel)=>panel.classList.toggle("is-hidden",panel.dataset.settingsPanel!==button.dataset.settingsTab));
    }));
    view.querySelector("[data-save-profile]").addEventListener("click",()=>{
      try{const data=Object.fromEntries(new FormData(view.querySelector("#profile-settings-form"))); const updated=root.auth.updateCurrentProfile(data); root.ui.toast("Profile updated.","success"); document.getElementById("topbar-user-name").textContent=updated.name; document.getElementById("topbar-user-role").textContent=updated.roleLabel; document.getElementById("topbar-user-initials").textContent=u.initials(updated.name); render(view);}catch(error){root.ui.toast(error.message,"error");}
    });
    view.querySelector("[data-change-password]").addEventListener("click",()=>{
      const data=Object.fromEntries(new FormData(view.querySelector("#password-settings-form"))); if(data.newPassword!==data.confirmPassword)return root.ui.toast("The new passwords do not match.","error"); try{root.auth.changePassword(data.currentPassword,data.newPassword); view.querySelector("#password-settings-form").reset(); root.ui.toast("Password changed.","success");}catch(error){root.ui.toast(error.message,"error");}
    });
    view.querySelectorAll(".theme-toggle").forEach((button)=>button.addEventListener("click",()=>document.getElementById("theme-toggle").click()));
    if(!isAdmin)return;
    view.querySelector("[data-open-import]").addEventListener("click",()=>root.router.navigate("import"));
    view.querySelector("[data-contract-template]").addEventListener("click",()=>root.modules.contractDocument.openTemplateEditor());
    view.querySelector("[data-export]").addEventListener("click",async()=>{try{root.ui.showLoading("Preparing backup…");root.ui.downloadJSON(`59-real-estate-backup-${u.isoDate()}.json`,await root.data.backup());root.ui.toast("Backup exported.","success");}catch(error){root.ui.toast(error.message,"error");}finally{root.ui.hideLoading();}});
    view.querySelector("[data-restore]").addEventListener("click",async()=>{const file=view.querySelector("#restore-file").files[0];if(!file)return root.ui.toast("Select a backup file first.","error");if(!await root.ui.confirm({title:"Restore backup",message:"This replaces every current local record.",confirmLabel:"Restore",danger:true}))return;try{root.ui.showLoading("Restoring backup…");await root.data.restore(JSON.parse(await file.text()));root.ui.toast("Backup restored.","success");await root.router.navigate("overview");}catch(error){root.ui.toast(error.message,"error");}finally{root.ui.hideLoading();}});
    view.querySelector("[data-reset]").addEventListener("click",async()=>{if(!await root.ui.confirm({title:"Reset local data",message:"Delete local changes and rebuild the sample portfolio?",confirmLabel:"Reset",danger:true}))return;try{root.ui.showLoading("Rebuilding portfolio…");await root.data.resetDemo();root.ui.toast("Local records reset.","success");await root.router.navigate("overview");}catch(error){root.ui.toast(error.message,"error");}finally{root.ui.hideLoading();}});
  }

  root.modules.settings={render};
})();
