(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  const PERMISSIONS = {
    portfolio: {
      title: "Portfolio Records",
      items: [["view", "View portfolio"], ["create", "Create records"], ["update", "Update records"], ["archive", "Archive records"]]
    },
    operations: {
      title: "Leases & Financials",
      items: [["contract", "Manage leases"], ["payment", "Record payments"]]
    },
    reporting: {
      title: "Reports & Data",
      items: [["print", "Official desktop printing"], ["export", "Generate and export reports"], ["import", "Portfolio import"]]
    },
    administration: {
      title: "Administration",
      items: [["delete", "Permanent deletion"], ["admin", "Users and system administration"]]
    }
  };

  function roleName(role) {
    return role === "ceo" ? "CEO / Owner" : role === "manager" ? "Property Manager" : "Administrator";
  }

  function roleDescription(role) {
    if (role === "ceo") return "Executive view and reporting access";
    if (role === "manager") return "Daily portfolio, tenant and maintenance operations";
    return "Full access, security and data administration";
  }

  function accountStatus(account) {
    return account.active === false ? "disabled" : "active";
  }

  async function render(view) {
    if (!root.auth.can("admin")) return root.router.navigate("overview");
    const accounts = root.auth.getAccounts();
    const access = root.auth.getRoleAccess();
    const logs = await root.data.getAuditLogs();
    const currentUser = root.state.user;
    let selectedRole = "manager";

    view.innerHTML = `
      <section class="page-heading compact-heading"><div><h1>Users &amp; Access</h1></div></section>

      <section class="access-summary-grid premium-access-summary">
        <article><span>Total users</span><strong>${accounts.length}</strong><small>${accounts.filter((item) => item.active !== false).length} active</small></article>
        <article><span>Active accounts</span><strong>${accounts.filter((item) => item.active !== false).length}</strong><small>${accounts.filter((item) => item.active === false).length} disabled</small></article>
        <article><span>Roles</span><strong>${new Set(accounts.map((item) => item.role)).size}</strong><small>Controlled access groups</small></article>
        <article><span>Current session</span><strong>Secure</strong><small>${u.escapeHTML(currentUser?.name || "Administrator")}</small></article>
      </section>

      <nav class="access-tabs" aria-label="Users and access sections">
        ${["users","roles","permissions","sessions","activity"].map((tab) => `<button type="button" data-access-tab="${tab}" class="${tab === "users" ? "active" : ""}">${u.titleCase(tab)}</button>`).join("")}
      </nav>

      <section class="access-tab-panel" data-access-panel="users">
        <header class="access-panel-heading"><div><h2>Authorized Users</h2></div><button class="button button-primary" data-add-user disabled title="User creation will be enabled with Firebase Authentication">＋ Add user</button></header>
        <div class="premium-user-list">
          ${accounts.map((account) => `<article class="premium-user-row" data-user-id="${account.id}">
            <span class="avatar premium-user-avatar">${u.initials(account.name)}</span>
            <div class="premium-user-identity"><strong>${u.escapeHTML(account.name)}</strong><small>${u.escapeHTML(account.title || account.roleLabel)}</small><em>${u.escapeHTML(account.email)}</em></div>
            <div class="premium-user-role"><span>Role</span><strong>${u.escapeHTML(roleName(account.role))}</strong></div>
            <div class="premium-user-security"><span>Security</span><strong>${account.id === currentUser?.id ? "Current session" : "Approved account"}</strong></div>
            <span class="account-state ${accountStatus(account)}">${u.titleCase(accountStatus(account))}</span>
            <button type="button" class="button button-secondary button-small" data-view-user>View Access</button>
            <button type="button" class="user-more-button" data-user-menu aria-label="User actions">•••</button>
          </article>`).join("")}
        </div>
      </section>

      <section class="access-tab-panel is-hidden" data-access-panel="roles">
        <header class="access-panel-heading"><div><h2>Roles</h2></div></header>
        <div class="premium-role-grid">
          ${Object.keys(access).map((role) => `<button type="button" class="premium-role-card" data-open-role="${role}">
            <span class="role-card-mark">${role === "ceo" ? "C" : role === "manager" ? "P" : "A"}</span>
            <strong>${u.escapeHTML(roleName(role))}</strong>
            <p>${u.escapeHTML(roleDescription(role))}</p>
            <div><span>${access[role].length} permissions</span><i>Review role →</i></div>
          </button>`).join("")}
        </div>
      </section>

      <section class="access-tab-panel is-hidden" data-access-panel="permissions">
        <header class="access-panel-heading"><div><h2>Permissions</h2></div></header>
        <div class="permission-role-picker segmented">
          ${Object.keys(access).map((role) => `<button type="button" data-permission-role="${role}" class="${role === selectedRole ? "active" : ""}">${u.escapeHTML(roleName(role))}</button>`).join("")}
        </div>
        <div id="permission-editor" class="premium-permission-editor"></div>
      </section>

      <section class="access-tab-panel is-hidden" data-access-panel="sessions">
        <header class="access-panel-heading"><div><h2>Sessions</h2></div></header>
        <div class="session-list">
          <article class="session-card current"><span class="avatar">${u.initials(currentUser?.name || "Administrator")}</span><div><strong>${u.escapeHTML(currentUser?.name || "Administrator")}</strong><small>This browser · Current secure session</small></div><span class="account-state active">Current</span><button class="button button-danger button-small" data-revoke-current>Sign out</button></article>
          <div class="access-information-card"><strong>Production session controls</strong><span>When Firebase Authentication is connected, this area will show devices, last activity and remote session revocation for every user.</span></div>
        </div>
      </section>

      <section class="access-tab-panel is-hidden" data-access-panel="activity">
        <header class="access-panel-heading"><div><h2>Security Activity</h2></div></header>
        <div class="access-activity-list">
          ${logs.slice(0, 20).map((log) => `<article><span>${u.dateTime(log.createdAt)}</span><div><strong>${u.escapeHTML(log.action || "System activity")}</strong><small>${u.escapeHTML(log.description || log.entityType || "Record updated")}</small></div><b>${u.escapeHTML(log.userName || "System")}</b></article>`).join("") || root.ui.emptyState("No security activity", "Administrative actions will appear here.")}
        </div>
      </section>`;

    function showTab(tab) {
      view.querySelectorAll("[data-access-tab]").forEach((button) => button.classList.toggle("active", button.dataset.accessTab === tab));
      view.querySelectorAll("[data-access-panel]").forEach((panel) => panel.classList.toggle("is-hidden", panel.dataset.accessPanel !== tab));
    }

    function drawPermissions() {
      const permissions = access[selectedRole] || [];
      view.querySelector("#permission-editor").innerHTML = `
        <div class="permission-editor-head"><div><strong>${u.escapeHTML(roleName(selectedRole))}</strong><span>${u.escapeHTML(roleDescription(selectedRole))}</span></div><b>${permissions.length} enabled</b></div>
        <div class="permission-group-list">
          ${Object.values(PERMISSIONS).map((group, groupIndex) => `<details class="permission-group" ${groupIndex === 0 ? "open" : ""}>
            <summary><span><strong>${u.escapeHTML(group.title)}</strong><small>${group.items.filter(([key]) => permissions.includes(key)).length} enabled</small></span><i>⌄</i></summary>
            <div>${group.items.map(([permission, label]) => {
              const fixed = permission === "view" || permission === "import" || (selectedRole === "admin" && permission === "admin");
              const checked = permissions.includes(permission);
              const unavailable = permission === "import" && selectedRole !== "admin";
              return `<label class="premium-permission-row ${unavailable ? "is-unavailable" : ""}"><span><strong>${u.escapeHTML(label)}</strong><small>${permission === "import" ? "Administrator only" : fixed ? "Required by this role" : "Optional access"}</small></span><input type="checkbox" data-permission-key="${permission}" ${checked ? "checked" : ""} ${fixed || unavailable ? "disabled" : ""}><i class="permission-toggle"></i></label>`;
            }).join("")}</div>
          </details>`).join("")}
        </div>
        <div class="access-save-bar"><button class="button button-secondary" data-reset-role>Reset</button><button class="button button-primary" data-save-role>Save Changes</button></div>`;

      view.querySelector("[data-save-role]").addEventListener("click", () => {
        const values = Array.from(view.querySelectorAll("#permission-editor [data-permission-key]:checked")).map((input) => input.dataset.permissionKey);
        if (!values.includes("view")) values.push("view");
        if (selectedRole === "admin" && !values.includes("admin")) values.push("admin");
        if (selectedRole === "admin" && !values.includes("import")) values.push("import");
        root.auth.setRoleAccess(selectedRole, values);
        Object.assign(access, root.auth.getRoleAccess());
        root.ui.toast(`${roleName(selectedRole)} access updated.`, "success");
        drawPermissions();
      });
      view.querySelector("[data-reset-role]").addEventListener("click", drawPermissions);
    }

    function openUser(account) {
      const modal = root.ui.openModal({
        title: account.name,
        eyebrow: "USER ACCESS",
        size: "medium",
        content: `<div class="user-profile-overview"><span class="avatar">${u.initials(account.name)}</span><div><strong>${u.escapeHTML(account.title || account.roleLabel)}</strong><small>${u.escapeHTML(account.email)}</small></div><span class="account-state ${accountStatus(account)}">${u.titleCase(accountStatus(account))}</span></div>
          <div class="user-profile-sections">
            <section><h3>Account</h3><div class="detail-list compact-detail-list"><div class="detail-item"><span>Display name</span><strong>${u.escapeHTML(account.name)}</strong></div><div class="detail-item"><span>Job title</span><strong>${u.escapeHTML(account.title || account.roleLabel)}</strong></div><div class="detail-item"><span>Email</span><strong>${u.escapeHTML(account.email)}</strong></div><div class="detail-item"><span>Status</span><strong>${u.titleCase(accountStatus(account))}</strong></div></div></section>
            <section><h3>Role &amp; Access</h3><div class="detail-list compact-detail-list"><div class="detail-item"><span>Role</span><strong>${u.escapeHTML(roleName(account.role))}</strong></div><div class="detail-item"><span>Permissions</span><strong>${(access[account.role] || []).length} enabled</strong></div></div></section>
            <section><h3>Security</h3><div class="access-information-card"><strong>${account.id === currentUser?.id ? "Current session" : "Approved account"}</strong><span>Multi-factor authentication and remote session history will be enforced when Firebase Authentication is connected.</span></div></section>
          </div>`,
        footer: `<button class="button button-secondary" data-close>Close</button><button class="button button-secondary" data-edit>Edit Profile</button><button class="button ${account.active === false ? "button-primary" : "button-danger"}" data-toggle>${account.active === false ? "Enable Account" : "Disable Account"}</button>`
      });
      modal.modal.querySelector("[data-close]").addEventListener("click", modal.close);
      modal.modal.querySelector("[data-edit]").addEventListener("click", () => { modal.close(); editUser(account); });
      modal.modal.querySelector("[data-toggle]").addEventListener("click", async () => {
        const next = account.active === false;
        const confirmed = await root.ui.confirm({ title: next ? "Enable account" : "Disable account", message: `${next ? "Restore" : "Remove"} access for ${account.name}?`, confirmLabel: next ? "Enable" : "Disable", danger: !next });
        if (!confirmed) return;
        root.auth.updateAccount(account.id, { active: next });
        modal.close();
        root.ui.toast(`Account ${next ? "enabled" : "disabled"}.`, "success");
        root.router.navigate("users");
      });
    }

    function editUser(account) {
      const modal = root.ui.openModal({
        title: "Edit User Profile",
        eyebrow: "USERS & ACCESS",
        content: `<form id="user-access-form" class="form-grid"><label><span>Display name</span><input name="name" required value="${u.escapeHTML(account.name)}"></label><label><span>Job title</span><input name="title" value="${u.escapeHTML(account.title || account.roleLabel)}"></label><label class="span-2"><span>Email</span><input type="email" name="email" required value="${u.escapeHTML(account.email)}"></label></form>`,
        footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save Changes</button>`
      });
      modal.modal.querySelector("[data-cancel]").addEventListener("click", modal.close);
      modal.modal.querySelector("[data-save]").addEventListener("click", () => {
        const form = modal.modal.querySelector("#user-access-form");
        if (!form.reportValidity()) return;
        const data = Object.fromEntries(new FormData(form));
        root.auth.updateAccount(account.id, { name: data.name.trim(), title: data.title.trim(), email: data.email.trim().toLowerCase() });
        modal.close();
        root.ui.toast("User profile updated.", "success");
        root.router.navigate("users");
      });
    }

    view.querySelectorAll("[data-access-tab]").forEach((button) => button.addEventListener("click", () => showTab(button.dataset.accessTab)));
    view.querySelectorAll("[data-view-user]").forEach((button) => button.addEventListener("click", () => {
      const account = accounts.find((item) => item.id === button.closest("[data-user-id]").dataset.userId);
      openUser(account);
    }));
    view.querySelectorAll("[data-user-menu]").forEach((button) => button.addEventListener("click", () => {
      const account = accounts.find((item) => item.id === button.closest("[data-user-id]").dataset.userId);
      openUser(account);
    }));
    view.querySelectorAll("[data-open-role]").forEach((button) => button.addEventListener("click", () => {
      selectedRole = button.dataset.openRole;
      showTab("permissions");
      view.querySelectorAll("[data-permission-role]").forEach((item) => item.classList.toggle("active", item.dataset.permissionRole === selectedRole));
      drawPermissions();
    }));
    view.querySelectorAll("[data-permission-role]").forEach((button) => button.addEventListener("click", () => {
      selectedRole = button.dataset.permissionRole;
      view.querySelectorAll("[data-permission-role]").forEach((item) => item.classList.toggle("active", item === button));
      drawPermissions();
    }));
    view.querySelector("[data-revoke-current]")?.addEventListener("click", async () => {
      const confirmed = await root.ui.confirm({ title: "End current session", message: "Sign out this administrator session now?", confirmLabel: "Sign out", danger: true });
      if (confirmed) document.getElementById("logout-button")?.click();
    });

    drawPermissions();
  }

  root.modules.usersAccess = { render };
})();
