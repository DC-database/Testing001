(function () {
  "use strict";

  const root = window.RE59;
  const u = root.utils;

  let propertySearch = "";
  let unitStatusFilter = "all";
  const UNIT_STATUS_OPTIONS = ["all", "occupied", "booked", "vacant", "inspection", "work"];


  const PROPERTY_PLACEHOLDERS = {
    "property-r16": "assets/property-marina-tower-16.jpg",
    "property-r19": "assets/property-r19-tower.jpg",
    "property-foxhills": "assets/property-foxhills.jpg",
    "property-a29": "assets/property-building-a29.jpg",
    "property-villas": "assets/property-stand-alone-villas.jpg",
    "property-nb1": "assets/property-nb1-residence.jpg",
    "property-muntazah": "assets/property-muntazah-building.jpg",
    "property-mansoura": "assets/property-al-mansoura-46.jpg",
    "property-ghazal": "assets/property-al-ghazal-compound.jpg",
    "property-umm": "assets/property-umm-ghuwailina-b5.jpg",
    "property-store": "assets/property-store-birkat-al-awamer.jpg"
  };
  const PROPERTY_PLACEHOLDER_LIST = Object.values(PROPERTY_PLACEHOLDERS);

  function propertyImage(property) {
    if (property?.coverImage) return property.coverImage;
    if (PROPERTY_PLACEHOLDERS[property?.id]) return PROPERTY_PLACEHOLDERS[property.id];
    const key = String(property?.id || property?.code || property?.name || "property");
    const hash = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return PROPERTY_PLACEHOLDER_LIST[hash % PROPERTY_PLACEHOLDER_LIST.length];
  }

  function readPropertyImage(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      if (!file.type.startsWith("image/")) return reject(new Error("Please choose a JPG, PNG or WebP image."));
      if (file.size > 8 * 1024 * 1024) return reject(new Error("The property photo must be smaller than 8 MB."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("The property photo could not be read."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("The selected property photo is invalid."));
        image.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 900;
          const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", .84));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function statusLabel(status) {
    if (status === "all") return "All Units";
    if (status === "vacant") return "Ready";
    if (status === "inspection") return "Inspection";
    if (status === "work") return "Maintenance / Renovation";
    if (status === "maintenance") return "Under Maintenance";
    if (status === "renovation") return "Under Renovation";
    return u.titleCase(status);
  }

  function statusMatches(unit, filter) {
    if (filter === "all") return true;
    if (filter === "work") return ["maintenance", "renovation"].includes(unit.status);
    return unit.status === filter;
  }

  async function render(view, params = {}) {
    if (params.propertyId) return renderPropertyDetail(view, params.propertyId, params);
    return renderPropertyList(view, params);
  }

  async function renderPropertyList(view, params = {}) {
    const [properties, units, tenants, contracts] = await Promise.all([
      root.data.getProperties(),
      root.data.getUnits(),
      root.data.getTenants(),
      root.data.getContracts()
    ]);
    const stats = properties.map((property) => root.data.summarizeProperty(property, units));
    const requestedStatus = UNIT_STATUS_OPTIONS.includes(params.status) ? params.status : (UNIT_STATUS_OPTIONS.includes(unitStatusFilter) ? unitStatusFilter : "all");
    unitStatusFilter = requestedStatus;

    const propertyMap = new Map(properties.map((property) => [property.id, property]));
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));
    const contractMap = new Map(contracts.map((contract) => [contract.id, contract]));
    const statusCount = (status) => units.filter((unit) => statusMatches(unit, status)).length;

    view.innerHTML = `
      <section class="page-heading property-page-heading">
        <div><h1>Properties &amp; Units</h1></div>
        <div class="page-actions">${root.auth.can("create") ? `<button class="button button-secondary" data-manage-photos>Manage photos</button><button class="button button-accent" data-add-property>＋ New property</button>` : ""}</div>
      </section>

      <section class="portfolio-browser-section">
        <div class="portfolio-toolbar">
          <div class="portfolio-search-box">
            <span aria-hidden="true">⌕</span>
            <input class="search-input" id="portfolio-search" type="search" placeholder="Search property, unit, tenant or Kahramaa" value="${u.escapeHTML(propertySearch)}">
          </div>
          <div class="segmented portfolio-status-tabs" id="portfolio-unit-status-filter" aria-label="Filter units by status">
            ${UNIT_STATUS_OPTIONS.map((status) => `<button type="button" data-status="${status}" class="${requestedStatus === status ? "active" : ""}"><span>${statusLabel(status)}</span><b>${statusCount(status)}</b></button>`).join("")}
          </div>
        </div>
        <div class="portfolio-filter-summary" id="portfolio-filter-summary"></div>
        <section id="property-grid" class="property-grid"></section>
        <div class="property-photo-notice">
          <span class="property-photo-notice-icon">i</span>
          <div><strong>Property images are design placeholders.</strong><span>Open Edit property &amp; photo to replace any image with the official property photograph.</span></div>
          ${root.auth.can("update") ? `<button class="button button-secondary" data-manage-photos>Manage photos</button>` : ""}
        </div>
      </section>

      <article class="panel unit-directory-panel" id="unit-directory-panel">
        <header class="panel-header unit-directory-header">
          <div><h3 id="unit-directory-title">All Units</h3><p id="unit-directory-subtitle">Every current unit in the portfolio.</p></div>
        </header>
        <div class="panel-body unit-directory-help">
          <div class="status-explanation" id="status-explanation"></div>
        </div>
        <div class="data-table-wrap desktop-record-table portfolio-unit-desktop-table"><table class="data-table"><thead><tr><th>Property</th><th>Unit</th><th>Type / Specifics</th><th>Current Tenant</th><th>Status</th><th>Rent Value</th><th>Contract End</th><th></th></tr></thead><tbody id="portfolio-unit-table-body"></tbody></table></div>
        <section id="portfolio-unit-mobile-list" class="mobile-record-list portfolio-unit-mobile-list" aria-label="Unit records"></section>
      </article>`;

    const statusMessages = {
      all: "All Units includes every current unit status.",
      occupied: "Occupied shows units with an active tenant and tenancy.",
      booked: "Booked shows units reserved for an incoming tenant or upcoming contract.",
      vacant: "Ready shows empty units that passed inspection and can accept another tenant.",
      inspection: "Inspection shows units waiting for the move-out or turnover check before they can be offered again.",
      work: "Maintenance / Renovation shows empty units unavailable while major work is being completed. Normal tenant repair requests remain under Occupied."
    };

    const unitMatchesTerm = (unit, term) => {
      if (!term) return true;
      const property = propertyMap.get(unit.propertyId);
      const tenant = tenantMap.get(unit.currentTenantId);
      return [
        property?.name,
        property?.code,
        property?.location,
        unit.unitNumber,
        unit.aptType,
        unit.specifics,
        unit.status,
        tenant?.name,
        unit.kahramaa?.accountNumber,
        unit.kahramaa?.electricityNumber,
        unit.kahramaa?.waterNumber
      ].some((value) => u.normalize(value).includes(term));
    };

    const drawPortfolio = () => {
      const term = u.normalize(view.querySelector("#portfolio-search").value);
      const status = view.querySelector("#portfolio-unit-status-filter button.active")?.dataset.status || "all";
      const matchingUnits = units
        .filter((unit) => statusMatches(unit, status))
        .filter((unit) => unitMatchesTerm(unit, term))
        .sort((a, b) => {
          const propertyCompare = String(propertyMap.get(a.propertyId)?.name || "").localeCompare(String(propertyMap.get(b.propertyId)?.name || ""));
          if (propertyCompare) return propertyCompare;
          return String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true });
        });

      const matchingPropertyIds = new Set(matchingUnits.map((unit) => unit.propertyId));
      const filteredProperties = stats.filter((property) => {
        const directPropertyMatch = !term || [property.name, property.code, property.location, property.type].some((value) => u.normalize(value).includes(term));
        if (status !== "all") return matchingPropertyIds.has(property.id);
        return directPropertyMatch || matchingPropertyIds.has(property.id);
      });

      view.querySelector("#property-grid").innerHTML = filteredProperties.map((property) => {
        const count = matchingUnits.filter((unit) => unit.propertyId === property.id).length;
        return propertyCard(property, status, count);
      }).join("") || root.ui.emptyState("No matching properties", "Change the status tab or search text.");

      const filterName = statusLabel(status);
      const summary = status === "all"
        ? `${matchingUnits.length} units across ${filteredProperties.length} properties`
        : `${matchingUnits.length} ${filterName.toLowerCase()} units across ${filteredProperties.length} properties`;
      view.querySelector("#portfolio-filter-summary").innerHTML = `<strong>${u.escapeHTML(filterName)}</strong><span>${u.escapeHTML(summary)}${term ? ` · Search: “${u.escapeHTML(view.querySelector("#portfolio-search").value.trim())}”` : ""}</span>`;
      view.querySelector("#status-explanation").textContent = statusMessages[status] || statusMessages.all;
      view.querySelector("#unit-directory-title").textContent = status === "all" ? "All units" : `${filterName} units`;
      view.querySelector("#unit-directory-subtitle").textContent = `${matchingUnits.length} exact record${matchingUnits.length === 1 ? "" : "s"} shown below.`;

      view.querySelector("#portfolio-unit-table-body").innerHTML = matchingUnits.map((unit) => {
        const property = propertyMap.get(unit.propertyId);
        const tenant = tenantMap.get(unit.currentTenantId);
        const contract = contractMap.get(unit.currentContractId);
        return `<tr class="clickable" data-unit-id="${unit.id}">
          <td><div class="table-title">${u.escapeHTML(property?.name || "Unknown property")}</div><div class="table-subtitle">${u.escapeHTML(property?.code || "—")}</div></td>
          <td><div class="table-title">${u.escapeHTML(unit.unitNumber)}</div></td>
          <td><div class="table-title">${u.escapeHTML(unit.aptType || "—")}</div><div class="table-subtitle">${u.escapeHTML(unit.specifics || "—")}</div></td>
          <td>${u.escapeHTML(tenant?.name || "—")}</td>
          <td><span class="status-chip ${unit.status}">${statusLabel(unit.status)}</span></td>
          <td>${u.money(unit.rentValue)}</td>
          <td>${contract?.endDate ? u.date(contract.endDate) : "—"}</td>
          <td>Open →</td>
        </tr>`;
      }).join("") || `<tr><td colspan="8">${root.ui.emptyState(`No ${filterName.toLowerCase()} found`, "Change the status tab or search text.")}</td></tr>`;

      view.querySelector("#portfolio-unit-mobile-list").innerHTML = matchingUnits.map((unit) => {
        const property = propertyMap.get(unit.propertyId);
        const tenant = tenantMap.get(unit.currentTenantId);
        const contract = contractMap.get(unit.currentContractId);
        const secondary = tenant?.name || unit.aptType || unit.specifics || "No tenant assigned";
        return `<button type="button" class="mobile-record-card unit-record-card" data-unit-id="${unit.id}">
          <span class="mobile-record-top"><b>${u.escapeHTML(property?.code || property?.name || "Property")} · ${u.escapeHTML(unit.unitNumber)}</b><span class="status-chip ${unit.status}">${statusLabel(unit.status)}</span></span>
          <strong>${u.escapeHTML(secondary)}</strong>
          <span class="mobile-record-meta"><span>Property</span><b>${u.escapeHTML(property?.name || "Unknown property")}</b></span>
          <span class="mobile-record-meta"><span>${tenant ? "Lease end" : "Unit type"}</span><b>${tenant && contract?.endDate ? u.date(contract.endDate) : u.escapeHTML(unit.aptType || "—")}</b></span>
          <span class="mobile-record-bottom"><b>${u.money(unit.rentValue)} / month</b><i>View unit →</i></span>
        </button>`;
      }).join("") || root.ui.emptyState(`No ${filterName.toLowerCase()} found`, "Change the status tab or search text.");

      view.querySelectorAll("[data-property-id]").forEach((card) => card.addEventListener("click", () => root.router.navigate("properties", { propertyId: card.dataset.propertyId, status })));
      view.querySelectorAll("#portfolio-unit-table-body [data-unit-id], #portfolio-unit-mobile-list [data-unit-id]").forEach((row) => row.addEventListener("click", () => root.modules.unitDetail.open(row.dataset.unitId)));
    };

    drawPortfolio();
    view.querySelector("#portfolio-search").addEventListener("input", u.debounce((event) => {
      propertySearch = event.target.value;
      drawPortfolio();
    }, 120));
    view.querySelectorAll("#portfolio-unit-status-filter button").forEach((button) => button.addEventListener("click", () => {
      view.querySelectorAll("#portfolio-unit-status-filter button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      unitStatusFilter = button.dataset.status;
      drawPortfolio();
      view.querySelector("#unit-directory-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    view.querySelector("[data-add-property]")?.addEventListener("click", () => openPropertyForm());
    view.querySelectorAll("[data-manage-photos]").forEach((button) => button.addEventListener("click", () => openPhotoManager(properties)));
  }

  function propertyCard(property, activeStatus = "all", matchingCount = 0) {
    const context = activeStatus === "all"
      ? `<span>Portfolio overview</span>`
      : `<span class="property-match-badge">${matchingCount} ${statusLabel(activeStatus).toLowerCase()}</span>`;
    const rate = Math.max(0, Math.min(100, Number(property.occupancyRate || 0)));
    return `<article class="property-card property-photo-card" data-property-id="${property.id}">
      <div class="property-card-media">
        <img src="${u.escapeHTML(propertyImage(property))}" alt="${u.escapeHTML(property.name)} property placeholder" loading="lazy">
        <div class="property-card-media-shade"></div>
        <div class="property-card-heading">
          <div>
            <div class="property-code">${u.escapeHTML(property.code)} · ${u.escapeHTML(property.location || "Qatar")}</div>
            <h3>${u.escapeHTML(property.name)}</h3>
          </div>
          <div class="property-total"><strong>${u.number(property.totalUnits)}</strong><span>Total units</span></div>
        </div>
      </div>
      <div class="property-card-body">
        <div class="property-filter-context">${context}</div>
        <div class="property-status-grid">
          <div><strong>${u.number(property.occupied)}</strong><span>Occupied</span></div>
          <div><strong>${u.number(property.booked)}</strong><span>Booked</span></div>
          <div><strong>${u.number(property.vacant)}</strong><span>Ready</span></div>
          <div><strong>${u.number(property.maintenance)}</strong><span>Work</span></div>
        </div>
        <div class="property-card-finance">
          <div><strong>${u.money(property.monthlyRevenue)}</strong><span>Monthly revenue</span></div>
          <div class="property-occupancy">
            <div><strong>${u.percent(property.occupancyRate, 0)}</strong><span>Occupancy rate</span></div>
            <i class="property-rate-ring" style="--rate:${rate * 3.6}deg"></i>
          </div>
        </div>
        <div class="property-card-footer"><span>View Property</span><b>→</b></div>
      </div>
    </article>`;
  }

  async function renderPropertyDetail(view, propertyId, params = {}) {
    const [property, allUnits] = await Promise.all([root.data.getProperty(propertyId), root.data.getUnits()]);
    if (!property) return root.router.navigate("properties");
    const stats = root.data.summarizeProperty(property, allUnits);
    const units = allUnits.filter((unit) => unit.propertyId === propertyId).sort((a,b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true }));
    unitStatusFilter = UNIT_STATUS_OPTIONS.includes(params.status) ? params.status : (UNIT_STATUS_OPTIONS.includes(unitStatusFilter) ? unitStatusFilter : "all");
    const statusCount = (status) => units.filter((unit) => statusMatches(unit, status)).length;

    view.innerHTML = `
      <div class="breadcrumb"><button data-back>Properties</button><span>/</span><span>${u.escapeHTML(property.name)}</span></div>
      <section class="property-hero property-hero-photo">
        <img class="property-hero-image" src="${u.escapeHTML(propertyImage(property))}" alt="${u.escapeHTML(property.name)}">
        <div class="property-hero-shade"></div>
        <div class="property-hero-content">
          <div class="property-hero-top">
            <div><div class="eyebrow">${u.escapeHTML(property.code)} · ${u.escapeHTML(property.type || "Property")} · ${u.escapeHTML(property.location || "Qatar")}</div><h1>${u.escapeHTML(property.name)}</h1><p>${u.escapeHTML(property.description || "59 Real Estate private portfolio property.")}</p></div>
            <div class="page-actions">${root.auth.can("update") ? `<button class="button button-inverse" data-edit-property>Edit property &amp; photo</button><button class="button button-secondary" data-add-unit>Add unit</button>` : ""}</div>
          </div>
          <div class="property-hero-metrics">
            <div class="property-hero-metric"><span>Total units</span><strong>${stats.totalUnits}</strong></div>
            <div class="property-hero-metric"><span>Occupied</span><strong>${stats.occupied}</strong></div>
            <div class="property-hero-metric"><span>Booked / Ready</span><strong>${stats.booked} / ${stats.vacant}</strong></div>
            <div class="property-hero-metric"><span>Occupancy</span><strong>${u.percent(stats.occupancyRate)}</strong></div>
            <div class="property-hero-metric"><span>Monthly income</span><strong>${u.money(stats.monthlyRevenue)}</strong></div>
          </div>
        </div>
      </section>

      <article class="panel">
        <header class="panel-header">
          <div><h3>Units</h3><p>Search or choose a status, then open a unit's complete folder.</p></div>
        </header>
        <div class="panel-body property-unit-toolbar-wrap">
          <div class="portfolio-toolbar property-detail-toolbar">
            <div class="portfolio-search-box"><span aria-hidden="true">⌕</span><input id="unit-search" class="search-input" type="search" placeholder="Search unit, type, specifics or Kahramaa"></div>
            <div class="segmented portfolio-status-tabs" id="unit-status-filter">
              ${UNIT_STATUS_OPTIONS.map((status) => `<button type="button" data-status="${status}" class="${unitStatusFilter === status ? "active" : ""}"><span>${statusLabel(status)}</span><b>${statusCount(status)}</b></button>`).join("")}
            </div>
          </div>
          <div class="status-explanation" id="property-status-explanation"></div>
        </div>
        <div class="data-table-wrap desktop-record-table property-unit-desktop-table"><table class="data-table"><thead><tr><th>Unit</th><th>Type</th><th>Specifics</th><th>Status</th><th>Rent Value</th><th>Kahramaa</th><th></th></tr></thead><tbody id="unit-table-body"></tbody></table></div>
        <section id="property-unit-mobile-list" class="mobile-record-list property-unit-mobile-list" aria-label="Property unit records"></section>
      </article>`;

    const statusMessages = {
      all: "Showing every unit in this property.",
      occupied: "Showing occupied units with an active tenancy.",
      booked: "Showing units reserved for an incoming tenant.",
      vacant: "Showing units ready for another tenant.",
      inspection: "Showing units waiting for turnover inspection.",
      work: "Showing units unavailable because of major maintenance or renovation."
    };

    const drawUnits = () => {
      const term = u.normalize(view.querySelector("#unit-search").value);
      const status = view.querySelector("#unit-status-filter button.active")?.dataset.status || "all";
      const filtered = units.filter((unit) => {
        const matchStatus = statusMatches(unit, status);
        const matchText = [unit.unitNumber, unit.aptType, unit.specifics, unit.status, unit.kahramaa?.accountNumber, unit.kahramaa?.electricityNumber, unit.kahramaa?.waterNumber].some((value) => u.normalize(value).includes(term));
        return matchStatus && matchText;
      });
      view.querySelector("#property-status-explanation").textContent = `${statusMessages[status] || statusMessages.all} ${filtered.length} record${filtered.length === 1 ? "" : "s"} shown.`;
      view.querySelector("#unit-table-body").innerHTML = filtered.map((unit) => `<tr class="clickable" data-unit-id="${unit.id}"><td><div class="table-title">${u.escapeHTML(unit.unitNumber)}</div><div class="table-subtitle">${u.escapeHTML(property.code)}</div></td><td>${u.escapeHTML(unit.aptType || "—")}</td><td>${u.escapeHTML(unit.specifics || "—")}</td><td><span class="status-chip ${unit.status}">${statusLabel(unit.status)}</span></td><td>${u.money(unit.rentValue)}</td><td>${u.escapeHTML(unit.kahramaa?.accountNumber || "—")}</td><td>Open →</td></tr>`).join("") || `<tr><td colspan="7">${root.ui.emptyState("No units found", "Change the search or status filter.")}</td></tr>`;
      view.querySelector("#property-unit-mobile-list").innerHTML = filtered.map((unit) => `<button type="button" class="mobile-record-card unit-record-card" data-unit-id="${unit.id}">
        <span class="mobile-record-top"><b>${u.escapeHTML(property.code)} · ${u.escapeHTML(unit.unitNumber)}</b><span class="status-chip ${unit.status}">${statusLabel(unit.status)}</span></span>
        <strong>${u.escapeHTML(unit.aptType || "Unit")}</strong>
        <span class="mobile-record-meta"><span>Specifics</span><b>${u.escapeHTML(unit.specifics || "—")}</b></span>
        <span class="mobile-record-meta"><span>Kahramaa</span><b>${u.escapeHTML(unit.kahramaa?.accountNumber || "—")}</b></span>
        <span class="mobile-record-bottom"><b>${u.money(unit.rentValue)} / month</b><i>View unit →</i></span>
      </button>`).join("") || root.ui.emptyState("No units found", "Change the search or status filter.");
      view.querySelectorAll("[data-unit-id]").forEach((row) => row.addEventListener("click", () => root.modules.unitDetail.open(row.dataset.unitId)));
    };

    drawUnits();
    view.querySelector("[data-back]").addEventListener("click", () => root.router.navigate("properties"));
    view.querySelector("[data-edit-property]")?.addEventListener("click", () => openPropertyForm(property));
    view.querySelector("[data-add-unit]")?.addEventListener("click", () => openUnitForm({ propertyId }));
    view.querySelector("#unit-search").addEventListener("input", u.debounce(drawUnits, 120));
    view.querySelectorAll("#unit-status-filter button").forEach((button) => button.addEventListener("click", () => {
      view.querySelectorAll("#unit-status-filter button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      unitStatusFilter = button.dataset.status;
      drawUnits();
    }));
  }

  function openPhotoManager(properties) {
    const instance = root.ui.openModal({
      title: "Property photography",
      eyebrow: "PORTFOLIO IMAGES",
      size: "medium",
      content: `<div class="photo-manager-list">
        ${properties.map((property) => `<button type="button" class="photo-manager-row" data-photo-property="${property.id}">
          <img src="${u.escapeHTML(propertyImage(property))}" alt="">
          <span><strong>${u.escapeHTML(property.name)}</strong><small>${u.escapeHTML(property.code)} · ${u.escapeHTML(property.location || "Qatar")}</small></span>
          <b>Change photo →</b>
        </button>`).join("")}
      </div>`,
      footer: `<button class="button button-secondary" data-cancel>Close</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelectorAll("[data-photo-property]").forEach((button) => button.addEventListener("click", () => {
      const property = properties.find((item) => item.id === button.dataset.photoProperty);
      instance.close();
      openPropertyForm(property);
    }));
  }

  function openPropertyForm(property = null) {
    const instance = root.ui.openModal({
      title: property ? "Edit property" : "Add property",
      eyebrow: "PROPERTY RECORD",
      content: `<form id="property-form" class="form-grid">
        <label><span>Property code</span><input name="code" required value="${u.escapeHTML(property?.code || "")}" placeholder="R16"></label>
        <label><span>Property name</span><input name="name" required value="${u.escapeHTML(property?.name || "")}" placeholder="Marina Tower 16"></label>
        <label><span>Property type</span><input name="type" value="${u.escapeHTML(property?.type || "")}" placeholder="Residential building"></label>
        <label><span>Location</span><input name="location" value="${u.escapeHTML(property?.location || "")}" placeholder="Doha"></label>
        <label><span>Owner</span><input name="ownerName" value="${u.escapeHTML(property?.ownerName || "59 Real Estate Owner")}"></label>
        <label><span>Property Manager</span><input name="managerName" value="${u.escapeHTML(property?.managerName || "Property Manager")}"></label>
        <label class="span-2"><span>Description</span><textarea name="description">${u.escapeHTML(property?.description || "")}</textarea></label>
        <div class="span-2 property-photo-field">
          <div class="property-photo-preview"><img data-property-photo-preview src="${u.escapeHTML(propertyImage(property || {}))}" alt="Property cover preview"></div>
          <label><span>Property cover photo</span><input name="coverPhoto" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG or WebP. The system stores a compressed local copy until Firebase Storage is connected.</small></label>
        </div>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save property</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    const photoInput = instance.modal.querySelector("[name=coverPhoto]");
    photoInput?.addEventListener("change", async () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      try {
        const previewImage = await readPropertyImage(file);
        instance.modal.querySelector("[data-property-photo-preview]").src = previewImage;
      } catch (error) {
        root.ui.toast(error.message, "error");
        photoInput.value = "";
      }
    });
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#property-form");
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      delete data.coverPhoto;
      try {
        root.ui.showLoading("Saving property…");
        const coverImage = photoInput?.files?.[0] ? await readPropertyImage(photoInput.files[0]) : (property?.coverImage || "");
        const saved = await root.data.saveProperty({ ...data, coverImage, id: property?.id });
        instance.close();
        root.ui.toast("Property saved.", "success");
        await root.router.navigate("properties", { propertyId: saved.id });
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  async function openUnitForm(unit = {}) {
    const properties = await root.data.getProperties();
    const instance = root.ui.openModal({
      title: unit.id ? "Edit unit" : "Add unit",
      eyebrow: "UNIT RECORD",
      size: "medium",
      content: `<form id="unit-form" class="form-grid">
        <label><span>Property</span><select name="propertyId" required>${properties.map((property) => `<option value="${property.id}" ${(unit.propertyId === property.id) ? "selected" : ""}>${u.escapeHTML(property.name)}</option>`).join("")}</select></label>
        <label><span>Unit No.</span><input name="unitNumber" required value="${u.escapeHTML(unit.unitNumber || "")}"></label>
        <label><span>Apartment / Unit Type</span><input name="aptType" value="${u.escapeHTML(unit.aptType || "")}" placeholder="2BHK"></label>
        <label><span>Status</span><select name="status">${[["vacant","Ready for Tenant"],["booked","Booked"],["occupied","Occupied"],["inspection","Inspection Pending"],["maintenance","Under Maintenance"],["renovation","Under Renovation"],["unavailable","Unavailable"]].map(([status,label]) => `<option value="${status}" ${unit.status === status ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="span-2"><span>Specifics</span><input name="specifics" value="${u.escapeHTML(unit.specifics || "")}" placeholder="Sea view, front corner"></label>
        <label><span>Floor</span><input name="floor" value="${u.escapeHTML(unit.floor ?? "")}"></label>
        <label><span>Rent Value (QAR / month)</span><input name="rentValue" type="number" min="0" value="${u.escapeHTML(unit.rentValue ?? 0)}"></label>
        <label><span>Bedrooms</span><input name="bedrooms" value="${u.escapeHTML(unit.bedrooms ?? "")}"></label>
        <label><span>Bathrooms</span><input name="bathrooms" value="${u.escapeHTML(unit.bathrooms ?? "")}"></label>
        <label><span>Furnished</span><select name="furnished">${["Furnished","Unfurnished","Partly Furnished","N/A"].map((value) => `<option ${unit.furnished === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label><span>Parking</span><input name="parkingNumber" value="${u.escapeHTML(unit.parkingNumber || "")}"></label>
        <label><span>Electricity Number</span><input name="electricityNumber" value="${u.escapeHTML(unit.kahramaa?.electricityNumber || "")}"></label>
        <label><span>Water Number</span><input name="waterNumber" value="${u.escapeHTML(unit.kahramaa?.waterNumber || "")}"></label>
        <label><span>Kahramaa Account</span><input name="accountNumber" value="${u.escapeHTML(unit.kahramaa?.accountNumber || "")}"></label>
        <label><span>Premise Number</span><input name="premiseNumber" value="${u.escapeHTML(unit.kahramaa?.premiseNumber || "")}"></label>
        <label><span>Meter Number</span><input name="meterNumber" value="${u.escapeHTML(unit.kahramaa?.meterNumber || "")}"></label>
        <label><span>Connection Status</span><select name="connectionStatus">${["Active","Disconnected","Review"].map((value) => `<option ${unit.kahramaa?.connectionStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label class="span-2"><span>Notes</span><textarea name="notes">${u.escapeHTML(unit.notes || "")}</textarea></label>
      </form>`,
      footer: `<button class="button button-secondary" data-cancel>Cancel</button><button class="button button-primary" data-save>Save unit</button>`
    });
    instance.modal.querySelector("[data-cancel]").addEventListener("click", instance.close);
    instance.modal.querySelector("[data-save]").addEventListener("click", async () => {
      const form = instance.modal.querySelector("#unit-form");
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      try {
        root.ui.showLoading("Saving unit…");
        const saved = await root.data.saveUnit({ ...data, id: unit.id });
        instance.close();
        root.ui.toast("Unit saved.", "success");
        await root.router.navigate("properties", { propertyId: saved.propertyId });
        if (saved.id) root.modules.unitDetail.open(saved.id);
      } catch (error) { root.ui.toast(error.message, "error"); }
      finally { root.ui.hideLoading(); }
    });
  }

  root.modules.properties = { render, openPropertyForm, openUnitForm };
})();
