(function () {
  "use strict";

  const root = window.RE59;
  const db = root.dbProvider;
  const u = root.utils;

  function currentUserMeta() {
    return {
      userId: root.state.user?.id || "system",
      userName: root.state.user?.name || "System"
    };
  }


  const PROPERTY_IMAGE_BY_ID = {
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

  const LEGACY_PROPERTY_IMAGE_NAMES = {
    "marina-tower-16.jpg": "assets/property-marina-tower-16.jpg",
    "r19-tower.jpg": "assets/property-r19-tower.jpg",
    "foxhills.jpg": "assets/property-foxhills.jpg",
    "building-a29.jpg": "assets/property-building-a29.jpg",
    "stand-alone-villas.jpg": "assets/property-stand-alone-villas.jpg",
    "nb1-residence.jpg": "assets/property-nb1-residence.jpg",
    "muntazah-building.jpg": "assets/property-muntazah-building.jpg",
    "al-mansoura-46.jpg": "assets/property-al-mansoura-46.jpg",
    "al-ghazal-compound.jpg": "assets/property-al-ghazal-compound.jpg",
    "umm-ghuwailina-b5.jpg": "assets/property-umm-ghuwailina-b5.jpg",
    "store-birkat-al-awamer.jpg": "assets/property-store-birkat-al-awamer.jpg",
    "property-marina-tower-16.jpg": "assets/property-marina-tower-16.jpg",
    "property-r19-tower.jpg": "assets/property-r19-tower.jpg",
    "property-foxhills.jpg": "assets/property-foxhills.jpg",
    "property-building-a29.jpg": "assets/property-building-a29.jpg",
    "property-stand-alone-villas.jpg": "assets/property-stand-alone-villas.jpg",
    "property-nb1-residence.jpg": "assets/property-nb1-residence.jpg",
    "property-muntazah-building.jpg": "assets/property-muntazah-building.jpg",
    "property-al-mansoura-46.jpg": "assets/property-al-mansoura-46.jpg",
    "property-al-ghazal-compound.jpg": "assets/property-al-ghazal-compound.jpg",
    "property-umm-ghuwailina-b5.jpg": "assets/property-umm-ghuwailina-b5.jpg",
    "property-store-birkat-al-awamer.jpg": "assets/property-store-birkat-al-awamer.jpg"
  };

  function canonicalPropertyImage(property) {
    const value = String(property?.coverImage || "").trim();
    if (!value) return PROPERTY_IMAGE_BY_ID[property?.id] || "";
    if (/^(data:|blob:|https?:)/i.test(value)) return value;
    const clean = value.replace(/\\/g, "/").split(/[?#]/)[0];
    const basename = clean.split("/").pop().toLowerCase();
    return LEGACY_PROPERTY_IMAGE_NAMES[basename] || PROPERTY_IMAGE_BY_ID[property?.id] || value;
  }

  async function migrateLegacyPropertyImages() {
    const properties = await db.getAll("properties");
    const updates = properties.map((property) => {
      const next = canonicalPropertyImage(property);
      if (!next || next === property.coverImage) return null;
      return { ...property, coverImage: next, updatedAt: Date.now(), imagePathMigratedAt: Date.now() };
    }).filter(Boolean);
    if (updates.length) await db.bulkPut("properties", updates);
    return updates.length;
  }

  const PAYMENT_TERMINAL_STATUSES = new Set(["paid", "cleared", "cancelled", "waived"]);
  const PAYMENT_MANUAL_STATUSES = new Set(["cheque_received", "ready_to_deposit", "deposited", "returned", "auto_debit_failed", "partially_paid"]);

  function localDate(value) {
    if (!value) return null;
    const text = String(value).slice(0, 10);
    const parts = text.split("-").map(Number);
    if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function isoLocal(value) {
    const date = value instanceof Date ? value : localDate(value);
    if (!date || Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addMonthsClamped(value, months) {
    const date = value instanceof Date ? new Date(value) : localDate(value);
    if (!date) return null;
    const day = date.getDate();
    const result = new Date(date.getFullYear(), date.getMonth() + Number(months || 0), 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDay));
    return result;
  }

  function addDays(value, days) {
    const date = value instanceof Date ? new Date(value) : localDate(value);
    if (!date) return null;
    date.setDate(date.getDate() + Number(days || 0));
    return date;
  }

  function paymentFrequencyMonths(frequency) {
    const normalized = u.normalize(frequency);
    if (normalized.includes("quarter")) return 3;
    if (normalized.includes("semi") || normalized.includes("half")) return 6;
    if (normalized.includes("annual") || normalized.includes("year")) return 12;
    return 1;
  }

  function paymentAmountDue(payment) {
    return Math.max(0, Number(payment.amountDue ?? payment.amount ?? 0));
  }

  function paymentAmountPaid(payment) {
    if (payment.amountPaid != null) return Math.max(0, Number(payment.amountPaid || 0));
    return ["paid", "cleared"].includes(payment.status) ? paymentAmountDue(payment) : 0;
  }

  function derivePaymentStatus(payment, today = u.isoDate()) {
    const amountDue = paymentAmountDue(payment);
    const amountPaid = paymentAmountPaid(payment);
    const balance = Math.max(0, Number(payment.balance ?? (amountDue - amountPaid)));
    if (payment.status === "cancelled" || payment.status === "waived") return payment.status;
    if (balance <= 0 && amountDue > 0) return payment.status === "cleared" ? "cleared" : "paid";
    if (amountPaid > 0 && balance > 0) return "partially_paid";
    if (payment.status === "cheque_received" && String(payment.chequeDate || payment.dueDate || "") <= today) return "ready_to_deposit";
    if (PAYMENT_MANUAL_STATUSES.has(payment.status)) return payment.status;
    const graceDate = addDays(payment.dueDate, Number(payment.gracePeriodDays || 0));
    const due = graceDate ? isoLocal(graceDate) : payment.dueDate;
    const days = u.daysBetween(today, due);
    if (days < 0) return "overdue";
    if (days === 0) return "due_today";
    if (days <= 7) return "due_soon";
    return "upcoming";
  }

  function normalizePayment(payment) {
    const amountDue = paymentAmountDue(payment);
    const amountPaid = paymentAmountPaid(payment);
    const balance = Math.max(0, Number(payment.balance ?? (amountDue - amountPaid)));
    return {
      ...payment,
      amount: amountDue,
      amountDue,
      amountPaid,
      balance,
      transactions: Array.isArray(payment.transactions) ? payment.transactions : [],
      status: derivePaymentStatus({ ...payment, amountDue, amountPaid, balance })
    };
  }

  function paymentScheduleRows(contract) {
    if (!contract?.id || !contract.startDate || !contract.endDate) return [];
    const start = localDate(contract.firstDueDate || contract.startDate);
    const contractEnd = localDate(contract.endDate);
    if (!start || !contractEnd || start > contractEnd) return [];
    const intervalMonths = paymentFrequencyMonths(contract.paymentFrequency);
    const statedCount = Math.max(0, Number(contract.numberOfCheques || contract.numberOfInstallments || 0));
    const maxCount = statedCount || 240;
    const expectedMethod = String(contract.expectedPaymentMethod || (statedCount ? "Post-Dated Cheque" : "Bank Transfer")).trim();
    const monthlyRent = Math.max(0, Number(contract.monthlyRent || 0));
    const rows = [];
    let due = new Date(start);
    let installment = 1;
    while (due <= contractEnd && installment <= maxCount) {
      const nextDue = addMonthsClamped(due, intervalMonths);
      const coverageEnd = addDays(nextDue, -1);
      const boundedCoverageEnd = coverageEnd && coverageEnd > contractEnd ? contractEnd : coverageEnd;
      const amountDue = intervalMonths === 1
        ? monthlyRent
        : monthlyRent * intervalMonths;
      const dueDate = isoLocal(due);
      rows.push({
        id: `schedule-${contract.id}-${String(installment).padStart(3, "0")}`,
        scheduleKey: `${contract.id}|${dueDate}`,
        isSchedule: true,
        installmentNumber: installment,
        contractId: contract.id,
        propertyId: contract.propertyId,
        unitId: contract.unitId,
        tenantId: contract.tenantId,
        dueDate,
        coverageStart: dueDate,
        coverageEnd: isoLocal(boundedCoverageEnd || due),
        amount: amountDue,
        amountDue,
        amountPaid: 0,
        balance: amountDue,
        expectedMethod,
        method: "",
        chequeNumber: "",
        chequeDate: expectedMethod.toLowerCase().includes("cheque") ? dueDate : "",
        chequeBank: "",
        depositDate: "",
        clearedDate: "",
        returnedDate: "",
        returnReason: "",
        autoDebitDate: expectedMethod.toLowerCase().includes("auto") ? dueDate : "",
        gracePeriodDays: Math.max(0, Number(contract.gracePeriodDays || 0)),
        status: derivePaymentStatus({ dueDate, amountDue, amountPaid: 0, balance: amountDue, gracePeriodDays: contract.gracePeriodDays || 0 }),
        receiptNumber: "",
        paidDate: "",
        reference: "",
        notes: "",
        transactions: [],
        createdAt: Date.now(),
        createdBy: contract.createdBy || "system",
        updatedAt: Date.now(),
        updatedBy: contract.updatedBy || contract.createdBy || "system"
      });
      due = nextDue;
      installment += 1;
      if (!due) break;
    }
    return rows;
  }

  async function ensurePaymentSchedulesForContracts(contracts) {
    const currentPayments = await db.getAll("payments");
    const byContract = new Map();
    currentPayments.forEach((payment) => {
      if (!byContract.has(payment.contractId)) byContract.set(payment.contractId, []);
      byContract.get(payment.contractId).push(payment);
    });

    const toPut = [];
    const toRemove = [];
    for (const contract of contracts.filter((item) => ["active", "upcoming"].includes(item.status))) {
      const existing = byContract.get(contract.id) || [];
      if (existing.some((item) => item.isSchedule || item.installmentNumber)) continue;
      const schedule = paymentScheduleRows(contract);
      const legacy = existing.filter((item) => !item.isSchedule);
      legacy.forEach((oldPayment) => {
        if (!schedule.length) return;
        let nearest = schedule[0];
        let nearestDistance = Math.abs(u.daysBetween(oldPayment.dueDate || contract.startDate, nearest.dueDate));
        schedule.forEach((row) => {
          const distance = Math.abs(u.daysBetween(oldPayment.dueDate || contract.startDate, row.dueDate));
          if (distance < nearestDistance) {
            nearest = row;
            nearestDistance = distance;
          }
        });
        const paidAmount = ["paid", "cleared"].includes(oldPayment.status)
          ? Number(oldPayment.amount || oldPayment.amountDue || nearest.amountDue)
          : Number(oldPayment.amountPaid || 0);
        nearest.amountPaid = Math.min(nearest.amountDue, Math.max(0, paidAmount));
        nearest.balance = Math.max(0, nearest.amountDue - nearest.amountPaid);
        nearest.receiptNumber = oldPayment.receiptNumber || "";
        nearest.paidDate = oldPayment.paidDate || "";
        nearest.method = oldPayment.method || "";
        nearest.reference = oldPayment.reference || "";
        nearest.notes = oldPayment.notes || "";
        nearest.status = derivePaymentStatus({ ...nearest, status: oldPayment.status });
        if (oldPayment.receiptNumber) {
          nearest.transactions = [{
            id: `txn-${oldPayment.id}`,
            receiptNumber: oldPayment.receiptNumber,
            paidDate: oldPayment.paidDate || oldPayment.createdAt,
            amount: nearest.amountPaid,
            method: oldPayment.method || "",
            reference: oldPayment.reference || "",
            notes: oldPayment.notes || ""
          }];
        }
        toRemove.push(oldPayment.id);
      });
      toPut.push(...schedule);
    }
    for (const id of toRemove) await db.remove("payments", id);
    if (toPut.length) await db.bulkPut("payments", toPut);
    return toPut.length;
  }

  async function ensurePaymentSchedules() {
    return ensurePaymentSchedulesForContracts(await getContracts());
  }

  async function cancelFuturePaymentSchedule(contractId, effectiveDate) {
    const rows = (await db.getAllByIndex("payments", "contractId", contractId)).map(normalizePayment);
    const cutoff = String(effectiveDate || u.isoDate()).slice(0, 10);
    const updates = rows
      .filter((row) => row.isSchedule && row.dueDate >= cutoff && !PAYMENT_TERMINAL_STATUSES.has(row.status) && row.amountPaid <= 0)
      .map((row) => ({ ...row, status: "cancelled", cancelledAt: Date.now(), updatedAt: Date.now(), updatedBy: currentUserMeta().userId }));
    if (updates.length) await db.bulkPut("payments", updates);
    return updates.length;
  }

  async function init() {
    await db.open();
    const seeded = await db.get("settings", "seeded");
    if (!seeded?.value) {
      await seedDemoData();
    } else {
      const maintenanceJobs = await db.getAll("maintenanceJobs");
      if (!maintenanceJobs.length) {
        const dataset = root.seedData.generateDemoDataset();
        if (dataset.maintenanceJobs?.length) await db.bulkPut("maintenanceJobs", dataset.maintenanceJobs);
        const team = dataset.settings?.find((row) => row.key === "maintenanceTeam");
        const counter = dataset.settings?.find((row) => row.key === "maintenanceCounter");
        if (team) await db.put("settings", team);
        if (counter) await db.put("settings", counter);
      }
    }
    await migrateLegacyPropertyImages();
    await ensurePaymentSchedules();
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
    if (!root.auth.can(input.id ? "update" : "create")) throw new Error("Your role cannot modify properties.");
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
    if (!root.auth.can(input.id ? "update" : "create")) throw new Error("Your role cannot modify units.");
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
    if (!root.auth.can("archive")) throw new Error("Your role cannot archive units.");
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
    const rows = await db.getAll("payments");
    return rows.map(normalizePayment).sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  }

  async function getPaymentsByUnit(unitId) {
    const rows = await db.getAllByIndex("payments", "unitId", unitId);
    return rows.map(normalizePayment).sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
  }

  async function getMaintenanceJobs(includeArchived = false) {
    const rows = await db.getAll("maintenanceJobs");
    return rows
      .filter((row) => includeArchived || !row.archived)
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  }

  async function getMaintenanceJob(id) {
    return id ? db.get("maintenanceJobs", id) : null;
  }

  async function getMaintenanceJobsByUnit(unitId, includeArchived = false) {
    const rows = await db.getAllByIndex("maintenanceJobs", "unitId", unitId);
    return rows
      .filter((row) => includeArchived || !row.archived)
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
  }

  function maintenanceActualCost(input) {
    return ["materialCost", "laborCost", "contractorCost", "transportCost", "otherCost"]
      .reduce((sum, key) => sum + Math.max(0, u.safeNumber(input[key], 0)), 0);
  }

  function maintenanceIsClosed(status) {
    return ["verified", "closed", "cancelled"].includes(status);
  }

  async function synchronizeUnitAvailability(job, previous = null) {
    const unit = await getUnit(job.unitId);
    if (!unit) return;
    const impact = job.availabilityImpact || "none";
    const isFinal = maintenanceIsClosed(job.status);
    let nextStatus = unit.status;

    if (!isFinal && !unit.currentContractId) {
      if (impact === "inspection") nextStatus = "inspection";
      if (impact === "maintenance") nextStatus = "maintenance";
      if (impact === "renovation") nextStatus = "renovation";
    }

    if (isFinal && ["inspection", "maintenance", "renovation"].includes(impact)) {
      nextStatus = unit.currentContractId ? "occupied" : "vacant";
    }

    if (nextStatus !== unit.status) {
      const updatedUnit = { ...unit, status: nextStatus, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
      await db.put("units", updatedUnit);
      await audit("UNIT_AVAILABILITY_UPDATED", "unit", unit.id, `${unit.unitNumber} status changed from ${unit.status} to ${nextStatus} by maintenance workflow.`, unit, updatedUnit);
    }
  }

  async function saveMaintenanceJob(input) {
    if (!root.auth.can(input.id ? "update" : "create")) throw new Error("Your role cannot modify maintenance jobs.");
    const previous = input.id ? await getMaintenanceJob(input.id) : null;
    const unit = await getUnit(input.unitId || previous?.unitId);
    if (!unit) throw new Error("Please select a valid unit.");
    const property = await getProperty(unit.propertyId);
    const counterSetting = await db.get("settings", "maintenanceCounter");
    const counter = Number(counterSetting?.value || 1);
    const now = Date.now();
    const status = String(input.status || previous?.status || "reported").trim();
    const actualCost = maintenanceActualCost(input);
    const job = {
      id: previous?.id || u.uid("maintenance"),
      jobNumber: previous?.jobNumber || `59RE-MNT-${new Date().getFullYear()}-${String(counter).padStart(4, "0")}`,
      propertyId: unit.propertyId,
      unitId: unit.id,
      requestType: String(input.requestType || previous?.requestType || "tenant_request").trim(),
      issueCategory: String(input.issueCategory || previous?.issueCategory || "General Repair").trim(),
      title: String(input.title || previous?.title || "").trim(),
      description: String(input.description || previous?.description || "").trim(),
      priority: String(input.priority || previous?.priority || "normal").trim(),
      responsibility: String(input.responsibility || previous?.responsibility || "owner").trim(),
      availabilityImpact: String(input.availabilityImpact || previous?.availabilityImpact || "none").trim(),
      status,
      reportedBy: String(input.reportedBy || previous?.reportedBy || "Property Manager").trim(),
      reportedAt: previous?.reportedAt || now,
      scheduledDate: String(input.scheduledDate || previous?.scheduledDate || "").trim(),
      scheduledTime: String(input.scheduledTime || previous?.scheduledTime || "").trim(),
      expectedCompletionDate: String(input.expectedCompletionDate || previous?.expectedCompletionDate || "").trim(),
      actualCompletionDate: String(input.actualCompletionDate || previous?.actualCompletionDate || (["completed", "verified", "closed"].includes(status) ? u.isoDate() : "")).trim(),
      assignedTo: String(input.assignedTo || previous?.assignedTo || "Unassigned").trim(),
      assignedType: String(input.assignedType || previous?.assignedType || "Internal / Approved Team").trim(),
      estimatedCost: Math.max(0, u.safeNumber(input.estimatedCost, previous?.estimatedCost || 0)),
      materialCost: Math.max(0, u.safeNumber(input.materialCost, previous?.materialCost || 0)),
      laborCost: Math.max(0, u.safeNumber(input.laborCost, previous?.laborCost || 0)),
      contractorCost: Math.max(0, u.safeNumber(input.contractorCost, previous?.contractorCost || 0)),
      transportCost: Math.max(0, u.safeNumber(input.transportCost, previous?.transportCost || 0)),
      otherCost: Math.max(0, u.safeNumber(input.otherCost, previous?.otherCost || 0)),
      actualCost,
      costStatus: String(input.costStatus || previous?.costStatus || (actualCost ? "actual" : "estimated")).trim(),
      workNotes: String(input.workNotes || previous?.workNotes || "").trim(),
      completionNotes: String(input.completionNotes || previous?.completionNotes || "").trim(),
      beforePhotos: previous?.beforePhotos || [],
      afterPhotos: previous?.afterPhotos || [],
      createdAt: previous?.createdAt || now,
      createdBy: previous?.createdBy || currentUserMeta().userId,
      updatedAt: now,
      updatedBy: currentUserMeta().userId,
      archived: Boolean(previous?.archived)
    };
    if (!job.title) throw new Error("Maintenance job title is required.");
    if (!job.issueCategory) throw new Error("Please select an issue category.");
    if (job.expectedCompletionDate && job.scheduledDate && new Date(job.expectedCompletionDate) < new Date(job.scheduledDate)) {
      throw new Error("Expected completion cannot be earlier than the scheduled date.");
    }
    await db.put("maintenanceJobs", job);
    if (!previous) await db.put("settings", { key: "maintenanceCounter", value: counter + 1 });
    await synchronizeUnitAvailability(job, previous);
    await audit(previous ? "MAINTENANCE_UPDATED" : "MAINTENANCE_CREATED", "maintenance", job.id, `${job.jobNumber} · ${property.name} · ${unit.unitNumber} ${previous ? "updated" : "created"}.`, previous, job);
    return job;
  }

  async function updateMaintenanceStatus(jobId, status, extra = {}) {
    const job = await getMaintenanceJob(jobId);
    if (!job) throw new Error("Maintenance job not found.");
    return saveMaintenanceJob({ ...job, ...extra, id: job.id, status });
  }

  async function getMaintenanceSnapshot() {
    const [jobs, properties, units] = await Promise.all([getMaintenanceJobs(), getProperties(), getUnits()]);
    const propertyMap = new Map(properties.map((row) => [row.id, row]));
    const unitMap = new Map(units.map((row) => [row.id, row]));
    const openStatuses = new Set(["reported", "reviewed", "scheduled", "dispatched", "in_progress", "waiting_parts", "reopened"]);
    const activeJobs = jobs.filter((job) => openStatuses.has(job.status));
    const today = u.isoDate();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const completedJobs = jobs.filter((job) => ["completed", "verified", "closed"].includes(job.status));
    const jobCost = (job) => Number(job.actualCost || job.estimatedCost || 0);
    const costThisYear = completedJobs.filter((job) => new Date(job.actualCompletionDate || job.updatedAt).getFullYear() === currentYear).reduce((sum, job) => sum + jobCost(job), 0);
    const costThisMonth = completedJobs.filter((job) => {
      const date = new Date(job.actualCompletionDate || job.updatedAt);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).reduce((sum, job) => sum + jobCost(job), 0);
    const overdue = activeJobs.filter((job) => job.expectedCompletionDate && job.expectedCompletionDate < today);
    const dueToday = activeJobs.filter((job) => job.scheduledDate === today);
    const costsByPropertyMap = new Map();
    completedJobs.forEach((job) => costsByPropertyMap.set(job.propertyId, (costsByPropertyMap.get(job.propertyId) || 0) + jobCost(job)));
    const costsByProperty = [...costsByPropertyMap.entries()].map(([propertyId, cost]) => ({
      propertyId,
      propertyName: propertyMap.get(propertyId)?.name || "Property",
      cost
    })).sort((a, b) => b.cost - a.cost);
    const costsByCategoryMap = new Map();
    completedJobs.forEach((job) => costsByCategoryMap.set(job.issueCategory, (costsByCategoryMap.get(job.issueCategory) || 0) + jobCost(job)));
    const costsByCategory = [...costsByCategoryMap.entries()].map(([category, cost]) => ({ category, cost })).sort((a, b) => b.cost - a.cost);
    const costsByMonth = [];
    for (let offset = 11; offset >= 0; offset -= 1) {
      const monthStart = new Date(currentYear, currentMonth - offset, 1);
      const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      const monthJobs = completedJobs.filter((job) => {
        const date = new Date(job.actualCompletionDate || job.updatedAt);
        return date >= monthStart && date < nextMonth;
      });
      costsByMonth.push({
        key: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
        label: new Intl.DateTimeFormat(root.config.locale, { month: "short" }).format(monthStart),
        fullLabel: new Intl.DateTimeFormat(root.config.locale, { month: "long", year: "numeric" }).format(monthStart),
        cost: monthJobs.reduce((sum, job) => sum + jobCost(job), 0),
        count: monthJobs.length
      });
    }
    const urgent = activeJobs.filter((job) => ["urgent", "high"].includes(job.priority)).sort((a, b) => {
      const pa = a.priority === "urgent" ? 0 : 1;
      const pb = b.priority === "urgent" ? 0 : 1;
      return pa - pb || String(a.expectedCompletionDate || "9999").localeCompare(String(b.expectedCompletionDate || "9999"));
    });
    return {
      jobs,
      activeJobs,
      completedJobs,
      openCount: activeJobs.length,
      overdueCount: overdue.length,
      dueTodayCount: dueToday.length,
      waitingPartsCount: activeJobs.filter((job) => job.status === "waiting_parts").length,
      awaitingVerificationCount: jobs.filter((job) => job.status === "completed").length,
      costThisMonth,
      costThisYear,
      costsByProperty,
      costsByCategory,
      costsByMonth,
      urgent,
      overdue,
      propertyMap,
      unitMap
    };
  }

  async function getAuditLogs(entityId = null) {
    const rows = entityId ? await db.getAllByIndex("auditLogs", "entityId", entityId) : await db.getAll("auditLogs");
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }

  async function closeTenancy(unitId, closeDate = u.isoDate(), reason = "Tenant moved out") {
    if (!root.auth.can("contract")) throw new Error("Your role cannot close a tenancy.");
    const unit = await getUnit(unitId);
    if (!unit) throw new Error("Unit not found.");
    const contract = await getContract(unit.currentContractId);
    const tenant = await getTenant(unit.currentTenantId);
    if (!contract || !tenant) throw new Error("This unit has no active tenant and contract to close.");

    const oldBundle = { unit, contract, tenant };
    const updatedContract = { ...contract, status: "completed", endDate: closeDate, closedReason: reason, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
    const updatedTenant = { ...tenant, status: "previous", currentUnitId: null, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };
    const updatedUnit = { ...unit, status: "inspection", currentTenantId: null, currentContractId: null, updatedAt: Date.now(), updatedBy: currentUserMeta().userId };

    await db.put("contracts", updatedContract);
    await cancelFuturePaymentSchedule(contract.id, closeDate);
    await db.put("tenants", updatedTenant);
    await db.put("units", updatedUnit);
    await saveMaintenanceJob({
      unitId,
      requestType: "move_out_inspection",
      issueCategory: "Inspection",
      title: "Move-out condition inspection",
      description: `Inspect ${unit.unitNumber} after tenant move-out and confirm whether it is ready, requires maintenance, or requires renovation.`,
      priority: "normal",
      responsibility: "owner",
      availabilityImpact: "inspection",
      status: "reported",
      reportedBy: currentUserMeta().userName,
      assignedTo: "Property Manager",
      assignedType: "Internal / Approved Team",
      estimatedCost: 0,
      scheduledDate: u.isoDate(),
      expectedCompletionDate: u.isoDate()
    });
    await audit("TENANCY_CLOSED", "unit", unitId, `${unit.unitNumber} tenancy closed: ${reason}. Move-out inspection created.`, oldBundle, { unit: updatedUnit, contract: updatedContract, tenant: updatedTenant });
    return updatedUnit;
  }

  async function assignTenantAndContract(unitId, input) {
    if (!root.auth.can("contract")) throw new Error("Your role cannot create a tenancy.");
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
      firstDueDate: String(input.firstDueDate || startDate).trim(),
      gracePeriodDays: Math.max(0, u.safeNumber(input.gracePeriodDays, 0)),
      expectedPaymentMethod: String(input.expectedPaymentMethod || "Post-Dated Cheque").trim(),
      noticePeriodDays: Math.max(0, u.safeNumber(input.noticePeriodDays, 60)),
      terms: String(input.terms || "Sample contract terms. Final legal wording must be approved by 59 Real Estate.").trim(),
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
    const paymentSchedule = paymentScheduleRows(contract);
    if (paymentSchedule.length) await db.bulkPut("payments", paymentSchedule);
    await audit("TENANCY_CREATED", "unit", unit.id, `${tenant.name} assigned to ${property.name} · ${unit.unitNumber}. ${paymentSchedule.length} contractual payment due date(s) generated.`, unit, { unit: updatedUnit, tenant, contract, paymentScheduleCount: paymentSchedule.length });
    return { unit: updatedUnit, tenant, contract, paymentSchedule };
  }

  async function nextReceiptNumber() {
    const counterSetting = await db.get("settings", "receiptCounter");
    const counter = Number(counterSetting?.value || 1);
    await db.put("settings", { key: "receiptCounter", value: counter + 1 });
    return `59RE-RCT-${new Date().getFullYear()}-${String(counter).padStart(6, "0")}`;
  }

  async function createPayment(unitId, input) {
    if (!root.auth.can("payment")) throw new Error("Your role cannot record payments.");
    const unit = await getUnit(unitId);
    if (!unit?.currentContractId || !unit.currentTenantId) throw new Error("An active tenant and contract are required.");
    const contract = await getContract(unit.currentContractId);
    const schedules = (await getPaymentsByUnit(unitId)).filter((row) => row.contractId === contract.id && row.isSchedule);
    let payment = input.scheduleId ? schedules.find((row) => row.id === input.scheduleId) : null;
    if (!payment) {
      payment = schedules.find((row) => !PAYMENT_TERMINAL_STATUSES.has(row.status) && row.status !== "cancelled")
        || paymentScheduleRows(contract)[0];
    }
    if (!payment) throw new Error("No contractual payment schedule is available.");

    const now = Date.now();
    const method = String(input.method || payment.expectedMethod || "Bank Transfer").trim();
    const normalizedMethod = u.normalize(method);
    const paidDate = String(input.paidDate || u.isoDate()).trim();
    const requestedAmount = Math.max(0, u.safeNumber(input.amount, payment.balance || payment.amountDue));
    const existingTransactions = Array.isArray(payment.transactions) ? payment.transactions : [];
    const chequeOnly = normalizedMethod.includes("cheque");
    const autoDebitPending = normalizedMethod.includes("auto") && input.confirmCleared !== "true";

    if (chequeOnly || autoDebitPending) {
      const registered = {
        ...payment,
        expectedMethod: method,
        method,
        chequeNumber: String(input.chequeNumber || input.reference || payment.chequeNumber || "").trim(),
        chequeDate: String(input.chequeDate || payment.chequeDate || payment.dueDate).trim(),
        chequeBank: String(input.chequeBank || payment.chequeBank || "").trim(),
        autoDebitDate: String(input.autoDebitDate || payment.autoDebitDate || payment.dueDate).trim(),
        reference: String(input.reference || payment.reference || "").trim(),
        notes: String(input.notes || payment.notes || "").trim(),
        status: chequeOnly ? "cheque_received" : derivePaymentStatus({ ...payment, status: "upcoming" }),
        updatedAt: now,
        updatedBy: currentUserMeta().userId
      };
      await db.put("payments", registered);
      await audit(
        chequeOnly ? "CHEQUE_REGISTERED" : "AUTO_DEBIT_SCHEDULED",
        "payment",
        registered.id,
        `${chequeOnly ? "Post-dated cheque" : "Auto-debit"} registered for ${u.money(registered.amountDue)} due ${registered.dueDate}.`,
        payment,
        registered
      );
      return normalizePayment(registered);
    }

    if (requestedAmount <= 0) throw new Error("Payment amount must be greater than zero.");
    if (requestedAmount > payment.balance + 0.001) throw new Error(`The maximum amount currently due is ${u.money(payment.balance)}.`);
    const receiptNumber = await nextReceiptNumber();
    const transaction = {
      id: u.uid("txn"),
      receiptNumber,
      paidDate,
      amount: requestedAmount,
      method,
      reference: String(input.reference || "").trim(),
      chequeNumber: String(input.chequeNumber || "").trim(),
      chequeBank: String(input.chequeBank || "").trim(),
      chequeDate: String(input.chequeDate || "").trim(),
      notes: String(input.notes || "").trim(),
      createdAt: now,
      createdBy: currentUserMeta().userId
    };
    const amountPaid = Math.min(payment.amountDue, payment.amountPaid + requestedAmount);
    const balance = Math.max(0, payment.amountDue - amountPaid);
    const updated = {
      ...payment,
      receiptNumber,
      paidDate,
      amountPaid,
      balance,
      method,
      reference: transaction.reference,
      chequeNumber: transaction.chequeNumber || payment.chequeNumber || "",
      chequeBank: transaction.chequeBank || payment.chequeBank || "",
      chequeDate: transaction.chequeDate || payment.chequeDate || "",
      notes: transaction.notes,
      transactions: [...existingTransactions, transaction],
      status: balance <= 0 ? "paid" : "partially_paid",
      updatedAt: now,
      updatedBy: currentUserMeta().userId
    };
    await db.put("payments", updated);
    await audit("PAYMENT_RECORDED", "payment", updated.id, `${receiptNumber} issued for ${u.money(requestedAmount)}. Contractual due date remains ${updated.dueDate}.`, payment, updated);
    return normalizePayment({ ...updated, lastTransaction: transaction });
  }

  async function updatePaymentEntry(paymentId, input) {
    if (!root.auth.can("payment")) throw new Error("Your role cannot update payment records.");
    const currentRaw = await db.get("payments", paymentId);
    if (!currentRaw) throw new Error("Payment schedule not found.");
    const current = normalizePayment(currentRaw);
    const nextStatus = String(input.status || current.status).trim();
    const now = Date.now();
    let updated = {
      ...current,
      chequeNumber: String(input.chequeNumber ?? current.chequeNumber ?? "").trim(),
      chequeDate: String(input.chequeDate ?? current.chequeDate ?? current.dueDate ?? "").trim(),
      chequeBank: String(input.chequeBank ?? current.chequeBank ?? "").trim(),
      depositDate: String(input.depositDate ?? current.depositDate ?? "").trim(),
      clearedDate: String(input.clearedDate ?? current.clearedDate ?? "").trim(),
      returnedDate: String(input.returnedDate ?? current.returnedDate ?? "").trim(),
      returnReason: String(input.returnReason ?? current.returnReason ?? "").trim(),
      reference: String(input.reference ?? current.reference ?? "").trim(),
      notes: String(input.notes ?? current.notes ?? "").trim(),
      status: nextStatus,
      updatedAt: now,
      updatedBy: currentUserMeta().userId
    };

    if (nextStatus === "cleared") {
      const receiptNumber = current.receiptNumber || await nextReceiptNumber();
      const paidDate = updated.clearedDate || u.isoDate();
      const clearedMethod = u.normalize(current.expectedMethod).includes("auto") ? "Auto-Debit" : "Post-Dated Cheque";
      const transaction = {
        id: u.uid("txn"),
        receiptNumber,
        paidDate,
        amount: current.balance,
        method: clearedMethod,
        reference: updated.chequeNumber,
        chequeNumber: updated.chequeNumber,
        chequeBank: updated.chequeBank,
        chequeDate: updated.chequeDate,
        notes: updated.notes,
        createdAt: now,
        createdBy: currentUserMeta().userId
      };
      updated = {
        ...updated,
        receiptNumber,
        paidDate,
        method: clearedMethod,
        amountPaid: current.amountDue,
        balance: 0,
        status: "cleared",
        transactions: [...current.transactions, transaction]
      };
    } else if (nextStatus === "returned") {
      updated = {
        ...updated,
        amountPaid: 0,
        balance: current.amountDue,
        receiptNumber: "",
        paidDate: "",
        status: "returned"
      };
    } else if (nextStatus === "deposited") {
      updated.depositDate = updated.depositDate || u.isoDate();
    } else if (nextStatus === "ready_to_deposit" || nextStatus === "cheque_received") {
      updated.amountPaid = 0;
      updated.balance = current.amountDue;
    } else if (nextStatus === "auto_debit_failed") {
      updated.amountPaid = 0;
      updated.balance = current.amountDue;
    }

    await db.put("payments", updated);
    await audit("PAYMENT_STATUS_UPDATED", "payment", paymentId, `Payment due ${current.dueDate} changed to ${u.titleCase(nextStatus)}.`, current, updated);
    return normalizePayment(updated);
  }

  async function getUnitBundle(unitId) {
    const unit = await getUnit(unitId);
    if (!unit) return null;
    const [property, tenant, contract, contracts, payments, maintenanceJobs, logs] = await Promise.all([
      getProperty(unit.propertyId),
      getTenant(unit.currentTenantId),
      getContract(unit.currentContractId),
      getContractsByUnit(unitId),
      getPaymentsByUnit(unitId),
      getMaintenanceJobsByUnit(unitId),
      getAuditLogs(unitId)
    ]);
    const tenantMap = new Map((await getTenants(true)).map((row) => [row.id, row]));
    return { unit, property, tenant, contract, contracts, payments, maintenanceJobs, logs, tenantMap };
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
    const potential = relevant.filter((unit) => !["maintenance", "renovation", "unavailable"].includes(unit.status)).reduce((sum, unit) => sum + Number(unit.rentValue || 0), 0);
    return {
      ...property,
      totalUnits: total,
      occupied,
      booked: counts.booked || 0,
      vacant: counts.vacant || 0,
      inspection: counts.inspection || 0,
      maintenance: (counts.maintenance || 0) + (counts.renovation || 0) + (counts.inspection || 0),
      renovation: counts.renovation || 0,
      occupancyRate: total ? occupied / total * 100 : 0,
      monthlyRevenue: monthly,
      annualRevenue: monthly * 12,
      potentialRevenue: potential,
      vacancyLoss: relevant.filter((unit) => unit.status === "vacant").reduce((sum, unit) => sum + Number(unit.rentValue || 0), 0)
    };
  }

  async function getDashboardSnapshot() {
    const [properties, units, contracts, payments, maintenanceSummary] = await Promise.all([
      getProperties(),
      getUnits(),
      getContracts(),
      getPayments(),
      getMaintenanceSnapshot()
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
    const inspection = statusCounts.inspection || 0;
    const underMaintenance = statusCounts.maintenance || 0;
    const renovation = statusCounts.renovation || 0;
    const unavailable = statusCounts.unavailable || 0;
    const knownBlocked = inspection + underMaintenance + renovation + unavailable;
    const blocked = Math.max(0, totalUnits - occupied - booked - vacant);
    const otherBlocked = Math.max(0, blocked - knownBlocked);
    const maintenance = underMaintenance + renovation;
    const monthlyRevenue = propertyStats.reduce((sum, property) => sum + property.monthlyRevenue, 0);
    const potentialRevenue = propertyStats.reduce((sum, property) => sum + property.potentialRevenue, 0);
    const vacancyLoss = propertyStats.reduce((sum, property) => sum + property.vacancyLoss, 0);
    const collected = payments.reduce((sum, payment) => sum + Number(payment.amountPaid || 0), 0);
    const outstanding = payments
      .filter((payment) => ["overdue", "returned", "auto_debit_failed", "partially_paid"].includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.balance || 0), 0);
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
    maintenanceSummary.overdue.slice(0, 12).forEach((job) => {
      const unit = unitMap.get(job.unitId);
      actions.push({ type: "maintenance", severity: job.priority === "urgent" ? "danger" : "warning", title: "Maintenance overdue", detail: `${propertyMap.get(job.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${job.title}`, meta: `${Math.abs(u.daysBetween(job.expectedCompletionDate, today))} day(s) overdue`, unitId: job.unitId, maintenanceId: job.id, sort: -2500 });
    });
    payments.filter((payment) => payment.status === "ready_to_deposit").slice(0, 12).forEach((payment) => {
      const unit = unitMap.get(payment.unitId);
      actions.push({ type: "payment", severity: "warning", title: "Cheque ready to deposit", detail: `${propertyMap.get(payment.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${tenantMap.get(payment.tenantId)?.name || "Tenant"}`, meta: `${u.money(payment.amountDue)} · ${u.date(payment.chequeDate || payment.dueDate)}`, unitId: payment.unitId, paymentId: payment.id, sort: -2200 });
    });
    payments.filter((payment) => ["returned", "auto_debit_failed"].includes(payment.status)).slice(0, 12).forEach((payment) => {
      const unit = unitMap.get(payment.unitId);
      actions.push({ type: "payment", severity: "danger", title: payment.status === "returned" ? "Cheque returned" : "Auto-debit failed", detail: `${propertyMap.get(payment.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${tenantMap.get(payment.tenantId)?.name || "Tenant"}`, meta: `${u.money(payment.balance)} outstanding`, unitId: payment.unitId, paymentId: payment.id, sort: -3500 });
    });
    payments.filter((payment) => payment.status === "overdue").slice(0, 20).forEach((payment) => {
      const unit = unitMap.get(payment.unitId);
      const lateDays = Math.abs(u.daysBetween(payment.dueDate, u.isoDate()));
      actions.push({ type: "payment", severity: lateDays > 7 ? "danger" : "warning", title: "Rent payment overdue", detail: `${propertyMap.get(payment.propertyId)?.name || "Property"} · ${unit?.unitNumber || "Unit"} · ${tenantMap.get(payment.tenantId)?.name || "Tenant"}`, meta: `${u.money(payment.balance)} · ${lateDays} day(s) late`, unitId: payment.unitId, paymentId: payment.id, sort: -1800 + lateDays });
    });
    units.filter((unit) => ["inspection", "maintenance", "renovation"].includes(unit.status)).forEach((unit) => {
      actions.push({ type: "maintenance", severity: "warning", title: u.titleCase(unit.status), detail: `${propertyMap.get(unit.propertyId)?.name || "Property"} · ${unit.unitNumber}`, meta: "Not ready for tenant", unitId: unit.id, sort: 2500 });
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
      blocked,
      maintenance,
      underMaintenance,
      inspection,
      renovation,
      unavailable,
      otherBlocked,
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
      integrityIssues,
      maintenanceSummary
    };
  }

  async function search(query) {
    const term = u.normalize(query);
    if (!term) return [];
    const [properties, units, tenants, contracts, maintenanceJobs] = await Promise.all([getProperties(), getUnits(), getTenants(), getContracts(), getMaintenanceJobs()]);
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
    maintenanceJobs.forEach((job) => {
      if ([job.jobNumber, job.title, job.issueCategory, job.assignedTo, job.status].some((value) => u.normalize(value).includes(term))) {
        results.push({ type: "maintenance", id: job.id, unitId: job.unitId, title: `${job.jobNumber} · ${job.title}`, subtitle: `${u.titleCase(job.status)} · ${job.assignedTo || "Unassigned"}` });
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
    if (!root.auth.can("import")) throw new Error("Administrator access is required to import portfolio records.");
    if (!Array.isArray(rows) || !rows.length) throw new Error("There are no rows to import.");

    const mode = options.mode === "replace" ? "replace" : "merge";
    const now = Date.now();
    const user = currentUserMeta();

    if (mode === "replace") {
      for (const store of ["properties", "units", "tenants", "contracts", "payments", "maintenanceJobs"]) await db.clear(store);
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
          firstDueDate: String(source.first_due_date || source.contract_start || "").trim(),
          gracePeriodDays: Math.max(0, Number(source.grace_period_days || 0) || 0),
          expectedPaymentMethod: String(source.expected_payment_method || (Number(source.number_of_cheques || 0) ? "Post-Dated Cheque" : "Bank Transfer")).trim(),
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
    if (contracts.length) await ensurePaymentSchedulesForContracts(contracts);

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
    await audit("BACKUP_EXPORTED", "system", "backup", "Local backup exported.");
    return db.exportAll();
  }

  async function restore(payload) {
    if (!root.auth.can("admin")) throw new Error("Only the administrator can restore backups.");
    await db.importAll(payload);
    await audit("BACKUP_RESTORED", "system", "backup", "Local backup restored.");
  }

  async function resetDemo() {
    if (!root.auth.can("admin")) throw new Error("Only the administrator can reset the database.");
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
    getMaintenanceJobs,
    getMaintenanceJob,
    getMaintenanceJobsByUnit,
    saveMaintenanceJob,
    updateMaintenanceStatus,
    getMaintenanceSnapshot,
    getAuditLogs,
    closeTenancy,
    assignTenantAndContract,
    createPayment,
    updatePaymentEntry,
    ensurePaymentSchedules,
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
