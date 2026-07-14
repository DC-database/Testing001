(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;
  const PERMISSIONS = [
    ["view", "View portfolio"],
    ["create", "Create records"],
    ["update", "Update records"],
    ["archive", "Archive records"],
    ["payment", "Record payments"],
    ["contract", "Manage leases"],
    ["print", "Print documents"],
    ["export", "Export reports"],
    ["import", "Portfolio import (Administrator only)"],
    ["admin", "Administration"]
  ];

  function roleName(role) {
    return role === "ceo" ? "CEO / Owner" : role === "manager" ? "Property Manager" : "Administrator";
  }

  async function render(view) {
    if (!root.auth.can("admin")) return root.router.navigate("overview");
    const accounts = root.auth.getAccounts();
    const access = root.auth.getRoleAccess();

    view.innerHTML = `
      <section class="page-heading compact-heading">
        <div><div class="eyebrow">ADMINISTRATION</div><h1>Users &amp; Access</h1><p>Control account availability and the actions assigned to each system role.</p></div>
      </section>

      <section class="access-summary-grid">
        <article><span>Active accounts</span><strong>${accounts.filter((item) => item.active !== false).length}</strong><small>Approved access</small></article>
        <article><span>Roles</span><strong>${new Set(accounts.map((item) => item.role)).size}</strong><small>CEO, Manager, Administrator</small></article>
        <article><span>Security model</span><strong>Role based</strong><small>Firebase claims ready</small></article>
      </section>

      <section class="settings-section">
        <header class="section-heading"><div><span>ACCOUNTS</span><h2>Authorized users</h2><p>Deactivate access immediately or update the display information shown throughout the system.</p></div></header>
        <div class="user-access-grid">
          ${accounts.map((account) => `<article class="user-access-card" data-user-id="${account.id}">
            <div class="user-access-head"><span class="avatar">${u.initials(account.name)}</span><div><strong>${u.escapeHTML(account.name)}</strong><small>${u.escapeHTML(account.email)}</small></div><span class="account-state ${account.active === false ? "disabled" : "active"}">${account.active === false ? "Disabled" : "Active"}</span></div>
            <div class="detail-list compact-detail-list">
              <div class="detail-item"><span>Role</span><strong>${u.escapeHTML(roleName(account.role))}</strong></div>
              <div class="detail-item"><span>Title</span><strong>${u.escapeHTML(account.title || account.roleLabel)}</strong></div>
            </div>
            <div class="card-actions"><button class="button button-secondary" data-edit-user>Edit profile</button><button class="button ${account.active === false ? "button-primary" : "button-danger"}" data-toggle-user>${account.active === false ? "Enable" : "Disable"}</button></div>
          </article>`).join("")}
        </div>
      </section>

      <section class="settings-section">
        <header class="section-heading"><div><span>ROLE PERMISSIONS</span><h2>Access matrix</h2><p>Changes apply immediately to the selected role in this browser and will later map to Firebase custom claims and Security Rules.</p></div></header>
        <div class="role-access-grid">
          ${Object.keys(access).map((role) => `<article class="role-access-card" data-role="${role}">
            <header><div><strong>${u.escapeHTML(roleName(role))}</strong><small>${role === "ceo" ? "Executive read-only access" : role === "manager" ? "Daily operations" : "Full system control"}</small></div></header>
            <div class="permission-list">${PERMISSIONS.map(([permission, label]) => `<label><input type="checkbox" data-permission-key="${permission}" ${access[role].includes(permission) ? "checked" : ""} ${permission === "view" || permission === "import" || (role === "admin" && permission === "admin") ? "disabled" : ""}><span>${u.escapeHTML(label)}</span></label>`).join("")}</div>
            <button class="button button-primary button-full" data-save-role>Save ${u.escapeHTML(roleName(role))} access</button>
          </article>`).join("")}
        </div>
      </section>`;

    view.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => {
      const card = button.closest("[data-user-id]");
      const account = accounts.find((item) => item.id === card.dataset.userId);
      const modal = root.ui.openModal({
        title: "Edit user profile",
        eyebrow: "USERS & ACCESS",
        content: `<form id="user-access-form" class="form-grid"><label><span>Display name</span><input name="name" required value="${u.escapeHTML(account.name)}"></label><label><span>Job title</span><input name="title" value="${u.escapeHTML(account.title || account.roleLabel)}"></label><label class="span-2"><span>Email</span><input type="email" name="email" required value="${u.escapeHTML(account.email)}"></label></form>`,
        footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save changes</button>`
      });
      modal.modal.querySelector("[data-cancel]").addEventListener("click", modal.close);
      modal.modal.querySelector("[data-save]").addEventListener("click", async () => {
        const data = Object.fromEntries(new FormData(modal.modal.querySelector("#user-access-form")));
        try {
          root.auth.updateAccount(account.id, { name: data.name.trim(), title: data.title.trim(), email: data.email.trim().toLowerCase() });
          modal.close();
          root.ui.toast("User profile updated.", "success");
          await root.router.navigate("users");
        } catch (error) { root.ui.toast(error.message, "error"); }
      });
    }));

    view.querySelectorAll("[data-toggle-user]").forEach((button) => button.addEventListener("click", async () => {
      const card = button.closest("[data-user-id]");
      const account = accounts.find((item) => item.id === card.dataset.userId);
      const next = account.active === false;
      const confirmed = await root.ui.confirm({
        title: next ? "Enable account" : "Disable account",
        message: `${next ? "Restore" : "Remove"} access for ${account.name}?`,
        confirmLabel: next ? "Enable" : "Disable",
        danger: !next
      });
      if (!confirmed) return;
      try {
        root.auth.updateAccount(account.id, { active: next });
        root.ui.toast(`Account ${next ? "enabled" : "disabled"}.`, "success");
        await root.router.navigate("users");
      } catch (error) { root.ui.toast(error.message, "error"); }
    }));

    view.querySelectorAll("[data-save-role]").forEach((button) => button.addEventListener("click", () => {
      const card = button.closest("[data-role]");
      const role = card.dataset.role;
      const permissions = Array.from(card.querySelectorAll("[data-permission-key]:checked")).map((input) => input.dataset.permissionKey);
      if (!permissions.includes("view")) permissions.push("view");
      if (role === "admin" && !permissions.includes("admin")) permissions.push("admin");
      root.auth.setRoleAccess(role, permissions);
      root.ui.toast(`${roleName(role)} access updated.`, "success");
    }));
  }

  root.modules.usersAccess = { render };
})();
