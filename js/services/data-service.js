(function () {
  "use strict";

  const root = window.RE59;
  const db = root.dbProvider;
  const u = root.utils;

  function currentUserMeta() {
    return {
      userId: root.state.user?.id || "system",
      userName: root.state.user?.name || "Demo System"
    };
  }

  async function init() {
    await db.open();
    const seeded = await db.get("settings", "seeded");
    if (!seeded?.value) await seedDemoData();
    return true;
  }

  async function seedDemoData() {
    const dataset = root.seedData.generateDemoDataset();
    for (const [store, rows] of Object.entries(dataset)) {
      if (rows.length) await db.bulkPut(store, rows);
    }
  }

  async function audit(action, entityType, entityId, description, oldValue = null, newValue = null) {
    const user = currentUserMeta();
    const log = {
      id: u.uid("log"),
      action,
      entityType,
      entityId,
      description,
      oldValue,
      newValue,
      ...user,
      createdAt: Date.now()
    };
    await db.put("auditLogs", log);
    return log;
  }

  async function getProperties(includeArchived = false) {
    const rows = await db.getAll("properties");
    return rows
      .filter((row) => includeArchived || !row.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function getProperty(id) {
    return db.get("properties", id);
  }

  async function saveProperty(input) {
    if (!root.auth.can(input.id ? "update" : "create")) throw new Error("Your demo role cannot modify properties.");
    const previous = input.id ? await getProperty(input.id) : null;
    const now = Date.now();
    const property = {
      id: input.id || u.uid("property"),
      code: String(input.code || "").trim().toUpperCase(),
      name: String(input.name || "").trim(),
      type: String(input.type || "Property").trim(),
      location: String(input.location || "").trim(),
      ownerName: String(input.ownerName || "59 Real Estate Owner").trim(),
      managerName: String(input.managerName || "Property Manager").trim(),
      description: String(input.description || "").trim(),
      coverImage: String(input.coverImage ?? previous?.coverImage ?? "").trim(),
      createdAt: previous?.createdAt || now,
      createdBy: previous?.createdBy || currentUserMeta().userId,
      updatedAt: now,
      updatedBy: currentUserMeta().userId,
      archived: Boolean(previous?.archived)
    };
    if (!property.name || !property.code) throw new Error("Property name and code are required.");
    await db.put("properties", property);
    await audit(previous ? "PROPERTY_UPDATED" : "PROPERTY_CREATED", "property", property.id, `${property.name} ${previous ? "updated" : "created"}.`, previous, property);
    return property;
  }

  async function getUnits(includeArchived = false) {
    const rows = await db.getAll("units");
    return rows.filter((row) => includeArchived || !row.archived);
  }

  async function getUnitsByProperty(propertyId, includeArchived = false) {
    const rows = await db.getAllByIndex("units", "propertyId", propertyId);
    return rows
      .filter((row) => includeArchived || !row.archived)
      .sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true }));
  }

  async function getUnit(id) {
    return db.get("units", id);
  }

  async function saveUnit(input) {
    if (!root.auth.can(input.id ? "update" : "create")) throw new Error("Your demo role cannot modify units.");
    const previous = input.id ? await getUnit(input.id) : null;
    const property = await getProperty(input.propertyId || previous?.propertyId);
    if (!property) throw new Error("Please select a valid property.");
    const sameProperty = await getUnitsByProperty(property.id, true);
    const duplicate = sameProperty.find((unit) => unit.id !== input.id && u.normalize(unit.unitNumber) === u.normalize(input.unitNumber) && !unit.archived);
    if (duplicate) throw new Error("That unit number already exists inside this property.");

    const now = Date.now();
    const status = input.status || previous?.status || "vacant";
    const unit = {
      id: input.id || u.uid("unit"),
      propertyId: property.id,
      unitNumber: String(input.unitNumber || "").trim(),
      aptType: String(input.aptType || "").trim(),
      specifics: String(input.specifics || "").trim(),
      floor: String(input.floor ?? "").trim(),
      bedrooms: String(input.bedrooms ?? "").trim(),
      bathrooms: String(input.bathrooms ?? "").trim(),
      furnished: String(input.furnished || "Unfurnished").trim(),
      parkingNumber: String(input.parkingNumber || "").trim(),
      status,
      rentValue: Math.max(0, u.safeNumber(input.rentValue, previous?.rentValue || 0)),
      currentTenantId: previous?.currentTenantId || null,
      currentContractId: previous?.currentContractId || null,
      kahramaa: {
        electricityNumber: String(input.electricityNumber ?? previous?.kahramaa?.electricityNumber ?? "").trim(),
        waterNumber: String(input.waterNumber ?? previous?.kahramaa?.waterNumber ?? "").trim(),
        accountNumber: String(input.accountNumber ?? previous?.kahramaa?.accountNumber ?? "").trim(),
        premiseNumber: String(input.premiseNumber ?? previous?.kahramaa?.premiseNumber ?? "").trim(),
        meterNumber: String(input.meterNumber ?? previous?.kahramaa?.meterNumber ?? "").trim(),
        accountHolder: String(input.accountHolder ?? previous?.kahramaa?.accountHolder ?? "59 Real Estate").trim(),
        connectionStatus: String(input.connectionStatus ?? previous?.kahramaa?.connectionStatus ?? "Active").trim(),
        notes: String(input.kahramaaNotes ?? previous?.kahramaa?.notes ?? "").trim()
      },
      notes: String(input.notes ?? previous?.notes ?? "").trim(),
      createdAt: previous?.createdAt || now,
      createdBy: previous?.createdBy || currentUserMeta().userId,
      updatedAt: now,
      updatedBy: currentUserMeta().userId,
      archived: Boolean(previous?.archived)
    };
    if (!unit.unitNumber) throw new Error("Unit number is required.");
    if (unit.status === "occupied" && !unit.currentTenantId && !previous?.currentTenantId) {
      unit.status = "vacant";
    }
    await db.put("units", unit);
    await audit(previous ? "UNIT_UPDATED" : "UNIT_CREATED", "unit", unit.id, `${property.name} · ${unit.unitNumber} ${previous ? "updated" : "created"}.`, previous, unit);
    return unit;
  }

  async function archiveUnit(unitId) {
    if (!root.auth.can("archive")) throw new Error("Your demo role cannot archive units.");
    const unit = await getUnit(unitId);
    if (!unit) throw new Error("Unit not found.");
    if (unit.currentContractId) throw new Error("Close the active tenancy before archiving this unit.");
    const updated = { ...unit, archived: true, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
    await db.put("units", updated);
    await audit("UNIT_ARCHIVED", "unit", unitId, `${unit.unitNumber} archived.`, unit, updated);
    return updated;
  }

  async function getTenants(includeArchived = false) {
    const rows = await db.getAll("tenants");
    return rows.filter((row) => includeArchived || !row.archived).sort((a, b) => a.name.localeCompare(b.name));
  }

  async function getTenant(id) {
    return id ? db.get("tenants", id) : null;
  }

  async function getContracts(includeArchived = false) {
    const rows = await db.getAll("contracts");
    return rows.filter((row) => includeArchived || !row.archived);
  }

  async function getContractsByUnit(unitId) {
    const rows = await db.getAllByIndex("contracts", "unitId", unitId);
    return rows.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }

  async function getContract(id) {
    return id ? db.get("contracts", id) : null;
  }

  async function getPayments() {
    return db.getAll("payments");
  }

  async function getPaymentsByUnit(unitId) {
    const rows = await db.getAllByIndex("payments", "unitId", unitId);
    return rows.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  }

  async function getAuditLogs(entityId = null) {
    const rows = entityId ? await db.getAllByIndex("auditLogs", "entityId", entityId) : await db.getAll("auditLogs");
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }

  async function closeTenancy(unitId, closeDate = u.isoDate(), reason = "Tenant moved out") {
    if (!root.auth.can("contract")) throw new Error("Your demo role cannot close a tenancy.");
    const unit = await getUnit(unitId);
    if (!unit) throw new Error("Unit not found.");
    const contract = await getContract(unit.currentContractId);
    const tenant = await getTenant(unit.currentTenantId);
    if (!contract || !tenant) throw new Error("This unit has no active tenant and contract to close.");

    const oldBundle = { unit, contract, tenant };
    const updatedContract = { ...contract, status: "completed", endDate: closeDate, closedReason: reason, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
    const updatedTenant = { ...tenant, status: "previous", currentUnitId: null, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
    const updatedUnit = { ...unit, status: "vacant", currentTenantId: null, currentContractId: null, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };

    await db.put("contracts", updatedContract);
    await db.put("tenants", updatedTenant);
    await db.put("units", updatedUnit);
    await audit("TENANCY_CLOSED", "unit", unitId, `${unit.unitNumber} tenancy closed: ${reason}.`, oldBundle, { unit: updatedUnit, contract: updatedContract, tenant: updatedTenant });
    return updatedUnit;
  }

  async function assignTenantAndContract(unitId, input) {
    if (!root.auth.can("contract")) throw new Error("Your demo role cannot create a tenancy.");
    let unit = await getUnit(unitId);
    if (!unit) throw new Error("Unit not found.");
    if (unit.currentContractId) await closeTenancy(unitId, input.startDate || u.isoDate(), "Replaced by a new tenancy");
    unit = await getUnit(unitId);

    const startDate = input.startDate;
    const endDate = input.endDate;
    if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) throw new Error("The contract end date must be after the start date.");
    const monthlyRent = Math.max(1, u.safeNumber(input.monthlyRent, unit.rentValue));
    const tenantId = u.uid("tenant");
    const contractId = u.uid("contract");
    const now = Date.now();
    const upcoming = new Date(startDate) > new Date();

    const tenant = {
      id: tenantId,
      name: String(input.tenantName || "").trim(),
      tenantType: input.tenantType || "Individual",
      qidOrCr: String(input.qidOrCr || "").trim(),
      nationality: String(input.nationality || "").trim(),
      mobile: String(input.mobile || "").trim(),
      email: String(input.email || "").trim(),
      emergencyContact: String(input.emergencyContact || "").trim(),
      occupants: String(input.occupants || "").trim(),
      status: upcoming ? "upcoming" : "active",
      currentUnitId: unit.id,
      createdAt: now,
      createdBy: currentUserMeta().userId,
      updatedAt: now,
      archived: false
    };
    if (!tenant.name) throw new Error("Tenant name is required.");

    const property = await getProperty(unit.propertyId);
    const contract = {
      id: contractId,
      contractNumber: input.contractNumber || `59RE-${property.code}-${String(now).slice(-6)}`,
      propertyId: unit.propertyId,
      unitId: unit.id,
      tenantId,
      status: upcoming ? "upcoming" : "active",
      startDate,
      endDate,
      monthlyRent,
      annualRent: monthlyRent * 12,
      securityDeposit: Math.max(0, u.safeNumber(input.securityDeposit, monthlyRent)),
      paymentFrequency: input.paymentFrequency || "Monthly",
      numberOfCheques: Math.max(0, u.safeNumber(input.numberOfCheques, 12)),
      noticePeriodDays: Math.max(0, u.safeNumber(input.noticePeriodDays, 60)),
      terms: String(input.terms || "Demo contract terms. Final legal wording must be approved by 59 Real Estate.").trim(),
      createdAt: now,
      createdBy: currentUserMeta().userId,
      updatedAt: now,
      archived: false
    };

    const updatedUnit = {
      ...unit,
      status: upcoming ? "booked" : "occupied",
      rentValue: monthlyRent,
      currentTenantId: tenantId,
      currentContractId: contractId,
      updatedAt: now,
      updatedBy: currentUserMeta().userId
    };

    await db.put("tenants", tenant);
    await db.put("contracts", contract);
    await db.put("units", updatedUnit);
    await audit("TENANCY_CREATED", "unit", unit.id, `${tenant.name} assigned to ${property.name} · ${unit.unitNumber}.`, unit, { unit: updatedUnit, tenant, contract });
    return { unit: updatedUnit, tenant, contract };
  }

  async function createPayment(unitId, input) {
    if (!root.auth.can("payment")) throw new Error("Your demo role cannot record payments.");
    const unit = await getUnit(unitId);
    if (!unit?.currentContractId || !unit.currentTenantId) throw new Error("An active tenant and contract are required.");
    const contract = await getContract(unit.currentContractId);
    const counterSetting = await db.get("settings", "receiptCounter");
    const counter = Number(counterSetting?.value || 1);
    const now = Date.now();
    const payment = {
      id: u.uid("payment"),
      receiptNumber: `59RE-RCT-${new Date().getFullYear()}-${String(counter).padStart(6, "0")}`,
      contractId: contract.id,
      propertyId: unit.propertyId,
      unitId: unit.id,
      tenantId: unit.currentTenantId,
      dueDate: input.dueDate || u.isoDate(),
      paidDate: input.paidDate || u.isoDate(),
      amount: Math.max(1, u.safeNumber(input.amount, contract.monthlyRent)),
      method: input.method || "Bank Transfer",
      reference: String(input.reference || "").trim(),
      status: "paid",
      notes: String(input.notes || "").trim(),
      createdAt: now,
      createdBy: currentUserMeta().userId
    };
    await db.put("payments", payment);
    await db.put("settings", { key: "receiptCounter", value: counter + 1 });
    await audit("PAYMENT_RECORDED", "unit", unitId, `${payment.receiptNumber} issued for ${u.money(payment.amount)}.`, null, payment);
    return payment;
  }

  async function getUnitBundle(unitId) {
    const unit = await getUnit(unitId);
    if (!unit) return null;
    const [property, tenant, contract, contracts, payments, logs] = await Promise.all([
      getProperty(unit.propertyId),
      getTenant(unit.currentTenantId),
      getContract(unit.currentContractId),
      getContractsByUnit(unitId),
      getPaymentsByUnit(unitId),
      getAuditLogs(unitId)
    ]);
    const tenantMap = new Map((await getTenants(true)).map((row) => [row.id, row]));
    return { unit, property, tenant, contract, contracts, payments, logs, tenantMap };
  }

  function summarizeProperty(property, units) {
    const relevant = units.filter((unit) => unit.propertyId === property.id && !unit.archived);
    const counts = relevant.reduce((acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    }, {});
    const occupied = counts.occupied || 0;
    const total = relevant.length;
    const monthly = relevant.filter((unit) => unit.status === "occupied").reduce((sum, unit) => sum + Number(unit.rentValue || 0), 0);
    const potential = relevant.filter((unit) => unit.status !== "maintenance").reduce((sum, unit) => sum + Number(unit.rentValue || 0), 0);
    return {
      ...property,
      totalUnits: total,
      occupied,
      booked: counts.booked || 0,
      vacant: counts.vacant || 0,
      maintenance: counts.maintenance || 0,
      occupancyRate: total ? occupied / total * 100 : 0,
      monthlyRevenue: monthly,
      annualRevenue: monthly * 12,
      potentialRevenue: potential,
      vacancyLoss: relevant.filter((unit) => unit.status === "vacant").reduce((sum, unit) => sum + Number(unit.rentValue || 0), 0)
    };
  }

  async function getDashboardSnapshot() {
    const [properties, units, contracts, payments] = await Promise.all([
      getProperties(),
      getUnits(),
      getContracts(),
      getPayments()
    ]);
    const propertyStats = properties.map((property) => summarizeProperty(property, units));
    const totalUnits = units.length;
    const statusCounts = units.reduce((acc, unit) => {
      acc[unit.status] = (acc[unit.status] || 0) + 1;
      return acc;
    }, {});
    const occupied = statusCounts.occupied || 0;
    const booked = statusCounts.booked || 0;
    const vacant = statusCounts.vacant || 0;
    const maintenance = statusCounts.maintenance || 0;
    const monthlyRevenue = propertyStats.reduce((sum, property) => sum + property.monthlyRevenue, 0);
    const potentialRevenue = propertyStats.reduce((sum, property) => sum + property.potentialRevenue, 0);
    const vacancyLoss = propertyStats.reduce((sum, property) => sum + property.vacancyLoss, 0);
    const collected = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const outstanding = payments.filter((payment) => payment.status === "overdue").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const today = new Date();

    const expiryContracts = contracts
      .filter((contract) => ["active", "upcoming"].includes(contract.status))
      .map((contract) => ({ ...contract, daysLeft: u.daysBetween(today, contract.endDate) }))
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const unitMap = new Map(units.map((row) => [row.id, row]));
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const tenantMap = new Map((await getTenants(true)).map((row) => [row.id, row]));

    const actions = [];
    expiryContracts.filter((contract) => contract.daysLeft < 0 && contract.status === "active").slice(0, 10).forEach((contract) => {
      const unit = unitMap.get(contract.unitId);
      actions.push({ type: "past-due", severity: "danger", title: "Contract past due", detail: `${propertyMap.get(contract.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${tenantMap.get(contract.tenantId)?.name || "Tenant"}`, meta: `${Math.abs(contract.daysLeft)} days overdue`, unitId: contract.unitId, sort: contract.daysLeft });
    });
    expiryContracts.filter((contract) => contract.daysLeft >= 0 && contract.daysLeft <= 90 && contract.status === "active").slice(0, 20).forEach((contract) => {
      const unit = unitMap.get(contract.unitId);
      actions.push({ type: "expiring", severity: contract.daysLeft <= 30 ? "danger" : "warning", title: "Lease expiring", detail: `${propertyMap.get(contract.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${u.money(contract.monthlyRent)}/mo`, meta: `${contract.daysLeft} days`, unitId: contract.unitId, sort: contract.daysLeft + 1000 });
    });
    units.filter((unit) => unit.status === "vacant").forEach((unit) => {
      actions.push({ type: "vacant", severity: "warning", title: "Vacant unit", detail: `${propertyMap.get(unit.propertyId)?.name || "Property"} · ${unit.unitNumber} · ${unit.aptType || "Unit"}`, meta: `${u.money(unit.rentValue)}/mo potential`, unitId: unit.id, sort: 3000 });
    });
    units.filter((unit) => unit.status === "maintenance").forEach((unit) => {
      actions.push({ type: "maintenance", severity: "warning", title: "Maintenance review", detail: `${propertyMap.get(unit.propertyId)?.name || "Property"} · ${unit.unitNumber}`, meta: "Needs review", unitId: unit.id, sort: 2500 });
    });
    units.filter((unit) => ["occupied", "booked"].includes(unit.status) && (!unit.currentTenantId || !unit.currentContractId)).forEach((unit) => {
      actions.push({ type: "integrity", severity: "danger", title: "Incomplete occupancy record", detail: `${propertyMap.get(unit.propertyId)?.name || "Property"} · ${unit.unitNumber}`, meta: "Missing tenant or contract", unitId: unit.id, sort: -5000 });
    });
    actions.sort((a, b) => a.sort - b.sort);

    const leaseBuckets = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(today.getFullYear(), today.getMonth() + index, 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + index + 1, 1);
      const bucketContracts = contracts.filter((contract) => {
        const end = new Date(contract.endDate);
        return ["active", "upcoming"].includes(contract.status) && end >= monthDate && end < nextMonth;
      });
      return {
        label: new Intl.DateTimeFormat(root.config.locale, { month: "short" }).format(monthDate),
        fullLabel: new Intl.DateTimeFormat(root.config.locale, { month: "long", year: "numeric" }).format(monthDate),
        count: bucketContracts.length,
        revenueAtRisk: bucketContracts.reduce((sum, contract) => sum + Number(contract.monthlyRent || 0), 0)
      };
    });

    const expectedByDefinition = new Map(root.seedData.PROPERTY_DEFINITIONS.map((row) => [row.id, row.total]));
    const integrityIssues = propertyStats.filter((property) => expectedByDefinition.has(property.id) && property.totalUnits !== expectedByDefinition.get(property.id));

    return {
      properties: propertyStats,
      totalProperties: properties.length,
      totalUnits,
      occupied,
      booked,
      vacant,
      maintenance,
      occupancyRate: totalUnits ? occupied / totalUnits * 100 : 0,
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      potentialRevenue,
      vacancyLoss,
      collected,
      outstanding,
      expiring90: expiryContracts.filter((contract) => contract.daysLeft >= 0 && contract.daysLeft <= 90).length,
      pastDue: expiryContracts.filter((contract) => contract.daysLeft < 0 && contract.status === "active").length,
      actions,
      leaseBuckets,
      integrityIssues
    };
  }

  async function search(query) {
    const term = u.normalize(query);
    if (!term) return [];
    const [properties, units, tenants, contracts] = await Promise.all([getProperties(), getUnits(), getTenants(), getContracts()]);
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const results = [];
    properties.forEach((property) => {
      if ([property.name, property.code, property.location, property.type].some((value) => u.normalize(value).includes(term))) {
        results.push({ type: "property", id: property.id, title: property.name, subtitle: `${property.code} · ${property.location}` });
      }
    });
    units.forEach((unit) => {
      const property = propertyMap.get(unit.propertyId);
      if ([unit.unitNumber, unit.aptType, unit.specifics, unit.status, unit.kahramaa?.accountNumber, property?.name].some((value) => u.normalize(value).includes(term))) {
        results.push({ type: "unit", id: unit.id, title: `${property?.name || "Property"} · ${unit.unitNumber}`, subtitle: `${unit.aptType || "Unit"} · ${u.titleCase(unit.status)}` });
      }
    });
    tenants.forEach((tenant) => {
      if ([tenant.name, tenant.mobile, tenant.email, tenant.qidOrCr].some((value) => u.normalize(value).includes(term))) {
        results.push({ type: "tenant", id: tenant.id, unitId: tenant.currentUnitId, title: tenant.name, subtitle: `${tenant.tenantType} · ${tenant.mobile || "No mobile"}` });
      }
    });
    contracts.forEach((contract) => {
      if (u.normalize(contract.contractNumber).includes(term)) {
        results.push({ type: "contract", id: contract.id, unitId: contract.unitId, title: contract.contractNumber, subtitle: `${u.titleCase(contract.status)} · ${u.date(contract.endDate)}` });
      }
    });
    return results.slice(0, 30);
  }


  function importSlug(value, fallback = "record") {
    const cleaned = String(value || "").trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || fallback;
  }

  function importHash(value) {
    let hash = 0;
    const text = String(value || "");
    for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    return Math.abs(hash).toString(36);
  }

  async function importPortfolioRows(rows, options = {}) {
    if (!root.auth.can("create")) throw new Error("Your demo role cannot import portfolio records.");
    if (!Array.isArray(rows) || !rows.length) throw new Error("There are no rows to import.");

    const mode = options.mode === "replace" ? "replace" : "merge";
    const now = Date.now();
    const user = currentUserMeta();

    if (mode === "replace") {
      for (const store of ["properties", "units", "tenants", "contracts", "payments"]) await db.clear(store);
    }

    const [existingProperties, existingUnits, existingTenants, existingContracts] = await Promise.all([
      db.getAll("properties"), db.getAll("units"), db.getAll("tenants"), db.getAll("contracts")
    ]);

    const propertyByCode = new Map(existingProperties.map((row) => [u.normalize(row.code), row]));
    const unitByKey = new Map(existingUnits.map((row) => [`${row.propertyId}|${u.normalize(row.unitNumber)}`, row]));
    const tenantByIdentity = new Map();
    existingTenants.forEach((row) => {
      if (row.qidOrCr) tenantByIdentity.set(`id|${u.normalize(row.qidOrCr)}`, row);
      tenantByIdentity.set(`unit|${row.currentUnitId || ""}|${u.normalize(row.name)}`, row);
    });
    const contractByNumber = new Map(existingContracts.filter((row) => row.contractNumber).map((row) => [u.normalize(row.contractNumber), row]));

    const properties = new Map();
    const units = [];
    const tenants = [];
    const contracts = [];
    const closedTenants = [];
    const closedContracts = [];
    const tenantIds = new Set();
    const contractIds = new Set();

    for (const source of rows) {
      const propertyCode = String(source.property_code || "").trim().toUpperCase();
      const propertyKey = u.normalize(propertyCode);
      const previousProperty = propertyByCode.get(propertyKey);
      const propertyId = previousProperty?.id || `property-${importSlug(propertyCode)}`;
      const property = {
        id: propertyId,
        code: propertyCode,
        name: String(source.property_name || previousProperty?.name || propertyCode).trim(),
        type: String(source.property_type || previousProperty?.type || "Property").trim(),
        location: String(source.property_location || previousProperty?.location || "").trim(),
        ownerName: previousProperty?.ownerName || "59 Real Estate Owner",
        managerName: previousProperty?.managerName || "Property Manager",
        description: previousProperty?.description || "",
        createdAt: previousProperty?.createdAt || now,
        createdBy: previousProperty?.createdBy || user.userId,
        updatedAt: now,
        updatedBy: user.userId,
        archived: false
      };
      properties.set(propertyId, property);
      propertyByCode.set(propertyKey, property);

      const unitNumber = String(source.unit_number || "").trim();
      const unitKey = `${propertyId}|${u.normalize(unitNumber)}`;
      const previousUnit = unitByKey.get(unitKey);
      const unitId = previousUnit?.id || `unit-${importSlug(propertyCode)}-${importSlug(unitNumber)}`;
      const status = String(source.unit_status || "vacant").trim().toLowerCase();
      const hasTenancy = ["occupied", "booked"].includes(status) && String(source.tenant_name || "").trim();

      if (previousUnit?.currentContractId) {
        const oldContract = existingContracts.find((row) => row.id === previousUnit.currentContractId);
        const oldTenant = existingTenants.find((row) => row.id === previousUnit.currentTenantId);
        const incomingContractNumber = String(source.contract_number || `59RE-${propertyCode}-${unitNumber}`).trim();
        const tenantChanged = oldTenant && (
          (source.qid_or_cr && u.normalize(source.qid_or_cr) !== u.normalize(oldTenant.qidOrCr)) ||
          (!source.qid_or_cr && u.normalize(source.tenant_name) !== u.normalize(oldTenant.name))
        );
        const contractChanged = oldContract && u.normalize(incomingContractNumber) !== u.normalize(oldContract.contractNumber);
        if (!hasTenancy || tenantChanged || contractChanged) {
          if (oldContract) closedContracts.push({
            ...oldContract,
            status: "completed",
            endDate: String(source.contract_start || oldContract.endDate || u.isoDate()).trim(),
            closedReason: "Replaced by portfolio CSV import",
            updatedAt: now,
            updatedBy: user.userId
          });
          if (oldTenant) closedTenants.push({
            ...oldTenant,
            status: "previous",
            currentUnitId: null,
            updatedAt: now,
            updatedBy: user.userId
          });
        }
      }

      let tenantId = null;
      let contractId = null;
      if (hasTenancy) {
        const tenantIdentity = source.qid_or_cr
          ? `id|${u.normalize(source.qid_or_cr)}`
          : `unit|${unitId}|${u.normalize(source.tenant_name)}`;
        const previousTenant = tenantByIdentity.get(tenantIdentity);
        tenantId = previousTenant?.id || `tenant-${importSlug(propertyCode)}-${importSlug(unitNumber)}-${importHash(source.tenant_name)}`;
        const tenant = {
          id: tenantId,
          name: String(source.tenant_name || "").trim(),
          tenantType: String(source.tenant_type || "Individual").trim(),
          qidOrCr: String(source.qid_or_cr || "").trim(),
          nationality: String(source.nationality || "").trim(),
          mobile: String(source.mobile || "").trim(),
          email: String(source.email || "").trim(),
          emergencyContact: String(source.emergency_contact || "").trim(),
          occupants: String(source.occupants || "").trim(),
          status: status === "booked" ? "upcoming" : "active",
          currentUnitId: unitId,
          createdAt: previousTenant?.createdAt || now,
          createdBy: previousTenant?.createdBy || user.userId,
          updatedAt: now,
          updatedBy: user.userId,
          archived: false
        };
        if (!tenantIds.has(tenant.id)) {
          tenants.push(tenant);
          tenantIds.add(tenant.id);
        }
        tenantByIdentity.set(tenantIdentity, tenant);

        const contractNumber = String(source.contract_number || `59RE-${propertyCode}-${unitNumber}`).trim();
        const previousContract = contractByNumber.get(u.normalize(contractNumber));
        contractId = previousContract?.id || `contract-${importSlug(contractNumber)}-${importHash(`${propertyCode}|${unitNumber}`)}`;
        const monthlyRent = Math.max(0, Number(String(source.monthly_rent || 0).replaceAll(",", "")) || 0);
        const contractStatus = String(source.contract_status || (status === "booked" ? "upcoming" : "active")).trim().toLowerCase();
        const contract = {
          id: contractId,
          contractNumber,
          propertyId,
          unitId,
          tenantId,
          status: contractStatus,
          startDate: String(source.contract_start || "").trim(),
          endDate: String(source.contract_end || "").trim(),
          monthlyRent,
          annualRent: monthlyRent * 12,
          securityDeposit: Math.max(0, Number(String(source.security_deposit || monthlyRent).replaceAll(",", "")) || 0),
          paymentFrequency: String(source.payment_frequency || "Monthly").trim(),
          numberOfCheques: Math.max(0, Number(source.number_of_cheques || 0) || 0),
          noticePeriodDays: Math.max(0, Number(source.notice_period_days || 60) || 0),
          terms: String(source.contract_terms || "").trim(),
          createdAt: previousContract?.createdAt || now,
          createdBy: previousContract?.createdBy || user.userId,
          updatedAt: now,
          updatedBy: user.userId,
          archived: false
        };
        if (!contractIds.has(contract.id)) {
          contracts.push(contract);
          contractIds.add(contract.id);
        }
        contractByNumber.set(u.normalize(contractNumber), contract);
      }

      const rentValue = Math.max(0, Number(String(source.monthly_rent || 0).replaceAll(",", "")) || 0);
      const unit = {
        id: unitId,
        propertyId,
        unitNumber,
        aptType: String(source.unit_type || "").trim(),
        specifics: String(source.specifics || "").trim(),
        floor: String(source.floor || "").trim(),
        bedrooms: String(source.bedrooms || "").trim(),
        bathrooms: String(source.bathrooms || "").trim(),
        furnished: String(source.furnished || "Unfurnished").trim(),
        parkingNumber: String(source.parking_number || "").trim(),
        status,
        rentValue,
        currentTenantId: tenantId,
        currentContractId: contractId,
        kahramaa: {
          electricityNumber: String(source.electricity_number || "").trim(),
          waterNumber: String(source.water_number || "").trim(),
          accountNumber: String(source.kahramaa_account_number || "").trim(),
          premiseNumber: String(source.premise_number || "").trim(),
          meterNumber: String(source.meter_number || "").trim(),
          accountHolder: String(source.kahramaa_account_holder || "59 Real Estate").trim(),
          connectionStatus: String(source.kahramaa_connection_status || "Active").trim(),
          notes: ""
        },
        notes: String(source.unit_notes || "").trim(),
        createdAt: previousUnit?.createdAt || now,
        createdBy: previousUnit?.createdBy || user.userId,
        updatedAt: now,
        updatedBy: user.userId,
        archived: false
      };
      units.push(unit);
      unitByKey.set(unitKey, unit);
    }

    if (properties.size) await db.bulkPut("properties", [...properties.values()]);
    if (closedTenants.length) await db.bulkPut("tenants", closedTenants);
    if (closedContracts.length) await db.bulkPut("contracts", closedContracts);
    if (tenants.length) await db.bulkPut("tenants", tenants);
    if (contracts.length) await db.bulkPut("contracts", contracts);
    if (units.length) await db.bulkPut("units", units);

    await audit(
      "PORTFOLIO_CSV_IMPORTED",
      "system",
      "portfolio-import",
      `${units.length} unit rows imported across ${properties.size} properties using ${mode} mode.`,
      null,
      { mode, properties: properties.size, units: units.length, tenants: tenants.length, contracts: contracts.length }
    );

    return { mode, properties: properties.size, units: units.length, tenants: tenants.length, contracts: contracts.length };
  }

  async function backup() {
    await audit("BACKUP_EXPORTED", "system", "backup", "Local demo backup exported.");
    return db.exportAll();
  }

  async function restore(payload) {
    if (!root.auth.can("admin")) throw new Error("Only the demo administrator can restore backups.");
    await db.importAll(payload);
    await audit("BACKUP_RESTORED", "system", "backup", "Local demo backup restored.");
  }

  async function resetDemo() {
    if (!root.auth.can("admin")) throw new Error("Only the demo administrator can reset the database.");
    await db.clearAll();
    await seedDemoData();
  }

  root.data = {
    init,
    audit,
    getProperties,
    getProperty,
    saveProperty,
    getUnits,
    getUnitsByProperty,
    getUnit,
    saveUnit,
    archiveUnit,
    getTenants,
    getTenant,
    getContracts,
    getContractsByUnit,
    getContract,
    getPayments,
    getPaymentsByUnit,
    getAuditLogs,
    closeTenancy,
    assignTenantAndContract,
    createPayment,
    getUnitBundle,
    getDashboardSnapshot,
    search,
    importPortfolioRows,
    backup,
    restore,
    resetDemo,
    summarizeProperty
  };
})();
