(function () {
  "use strict";

  const root = window.RE59;
  const { uid, isoDate, addMonths } = root.utils;

  const PROPERTY_DEFINITIONS = [
    { id: "property-r16", code: "R16", name: "Marina Tower 16", type: "Mixed-use tower", location: "Doha", total: 127, occupied: 119, booked: 4, vacant: 4, maintenance: 0, monthly: 1345400, coverImage: "assets/property-marina-tower-16.jpg" },
    { id: "property-r19", code: "R19", name: "R19 Tower", type: "Residential tower", location: "Doha", total: 158, occupied: 158, booked: 0, vacant: 0, maintenance: 0, monthly: 997000, coverImage: "assets/property-r19-tower.jpg" },
    { id: "property-foxhills", code: "D5-D6", name: "D5 & D6 Foxhills", type: "Residential buildings", location: "Lusail", total: 36, occupied: 36, booked: 0, vacant: 0, maintenance: 0, monthly: 330100, coverImage: "assets/property-foxhills.jpg" },
    { id: "property-a29", code: "A29", name: "Building A29 Foxhills", type: "Residential unit", location: "Lusail", total: 1, occupied: 1, booked: 0, vacant: 0, maintenance: 0, monthly: 6500, coverImage: "assets/property-building-a29.jpg" },
    { id: "property-villas", code: "VILLAS", name: "Stand Alone Villas", type: "Villa portfolio", location: "Doha", total: 5, occupied: 5, booked: 0, vacant: 0, maintenance: 0, monthly: 79000, coverImage: "assets/property-stand-alone-villas.jpg" },
    { id: "property-nb1", code: "NB1", name: "NB1 Residence", type: "Residential & commercial", location: "Doha", total: 18, occupied: 14, booked: 1, vacant: 2, maintenance: 1, monthly: 119800, coverImage: "assets/property-nb1-residence.jpg" },
    { id: "property-muntazah", code: "MUN", name: "Muntazah Building", type: "Residential building", location: "Al Muntazah", total: 15, occupied: 15, booked: 0, vacant: 0, maintenance: 0, monthly: 63200, coverImage: "assets/property-muntazah-building.jpg" },
    { id: "property-mansoura", code: "B46", name: "Building 46 Al-Mansoura", type: "Residential building", location: "Al Mansoura", total: 14, occupied: 14, booked: 0, vacant: 0, maintenance: 0, monthly: 85000, coverImage: "assets/property-al-mansoura-46.jpg" },
    { id: "property-ghazal", code: "AGC", name: "Al-Ghazal Villas Ain Khaled", type: "Villa compound", location: "Ain Khaled", total: 8, occupied: 8, booked: 0, vacant: 0, maintenance: 0, monthly: 80000, coverImage: "assets/property-al-ghazal-compound.jpg" },
    { id: "property-umm", code: "B-5", name: "Umm Ghuwailina B-5", type: "Residential building", location: "Umm Ghuwailina", total: 12, occupied: 2, booked: 6, vacant: 4, maintenance: 0, monthly: 15750, coverImage: "assets/property-umm-ghuwailina-b5.jpg" },
    { id: "property-store", code: "BAW", name: "Store Birkat Al Awamer", type: "Warehouse / store", location: "Birkat Al Awamer", total: 1, occupied: 1, booked: 0, vacant: 0, maintenance: 0, monthly: 43000, coverImage: "assets/property-store-birkat-al-awamer.jpg" }
  ];

  const R16_EXPLICIT_END_DATES = {
    "301": "2026-06-14",
    "1104": "2026-06-30",
    "1205": "2026-06-30",
    "1502": "2026-06-30",
    "501": "2026-07-06",
    "1105": "2026-07-11",
    "707": "2026-07-13",
    "902": "2026-07-19",
    "703": "2026-07-27",
    "207": "2026-07-31",
    "1101": "2026-07-31",
    "1506": "2026-08-13"
  };

  const BUSINESS_NAMES = {
    "property-r16:SHOP-1": "ADRENALINE GYM",
    "property-r16:SHOP-2": "SKY BRIDGE REAL ESTATE",
    "property-r16:SHOP-3": "SKY BRIDGE REAL ESTATE",
    "property-r16:SHOP-5": "QUICK EXPRESS LAUNDRY",
    "property-r16:SHOP-6": "HME FOOD PREPARATION",
    "property-nb1:SHOP-1": "SIXTY MINUTES LAUNDRY",
    "property-nb1:SHOP-2": "DOHA AND CO COFFEE",
    "property-nb1:SHOP-3": "CARE U CURE",
    "property-nb1:SHOP-5": "ZAIN RESH MARKET",
    "property-nb1:SHOP-6": "SCENTOZA PERFUMERY",
    "property-nb1:SHOP-7": "BAKEY AND PASTRIES",
    "property-nb1:SHOP-8": "GELATO MONDO"
  };

  function pad(value, size = 2) {
    return String(value).padStart(size, "0");
  }

  function makeR16Numbers() {
    const residential = [];
    for (let floor = 1; floor <= 16; floor += 1) {
      for (let unit = 1; unit <= 8; unit += 1) residential.push(`${floor}${pad(unit)}`);
    }
    return [...residential.slice(0, 121), ...Array.from({ length: 6 }, (_, index) => `SHOP-${index + 1}`)];
  }

  function makeR19Numbers() {
    const values = [];
    for (let floor = 1; floor <= 20; floor += 1) {
      for (let unit = 1; unit <= 8; unit += 1) values.push(`${floor}${pad(unit)}`);
    }
    return values.slice(0, 158);
  }

  function makeUnitNumbers(property) {
    if (property.id === "property-r16") return makeR16Numbers();
    if (property.id === "property-r19") return makeR19Numbers();
    if (property.id === "property-foxhills") {
      return Array.from({ length: 36 }, (_, index) => `${index < 18 ? "D5" : "D6"}-${pad((index % 18) + 1, 3)}`);
    }
    if (property.id === "property-a29") return ["A29"];
    if (property.id === "property-villas") return ["Villa 15 (Rawdat)", "Villa 71 (Al Thumama)", "Villa 50 (Al Hilal)", "Villa 52 (Al Hilal)", "Villa 54 (Al Hilal)"];
    if (property.id === "property-nb1") return [...Array.from({ length: 9 }, (_, i) => `APT-${i + 1}`), ...Array.from({ length: 9 }, (_, i) => `SHOP-${i + 1}`)];
    if (property.id === "property-ghazal") return Array.from({ length: 8 }, (_, i) => `Villa ${i + 1}`);
    if (property.id === "property-store") return ["Main Store"];
    return Array.from({ length: property.total }, (_, index) => `Unit ${pad(index + 1, 3)}`);
  }

  function statusFor(property, unitNumber, index) {
    if (property.id === "property-r16") {
      if (["202", "702", "1306", "SHOP-4"].includes(unitNumber)) return "vacant";
      if (["1405", "1406", "1407", "1408"].includes(unitNumber)) return "booked";
      return "occupied";
    }
    if (property.id === "property-nb1") {
      if (["SHOP-4", "SHOP-9"].includes(unitNumber)) return "vacant";
      if (unitNumber === "SHOP-7") return "booked";
      if (unitNumber === "APT-9") return "maintenance";
      return "occupied";
    }
    if (property.id === "property-umm") {
      if (index < 2) return "occupied";
      if (index < 8) return "booked";
      return "vacant";
    }
    if (index < property.occupied) return "occupied";
    if (index < property.occupied + property.booked) return "booked";
    if (index < property.occupied + property.booked + property.vacant) return "vacant";
    return "maintenance";
  }

  function unitType(property, unitNumber, index) {
    if (unitNumber.startsWith("SHOP")) return "Commercial Shop";
    if (property.id === "property-store") return "Warehouse";
    if (property.id === "property-villas" || property.id === "property-ghazal") return "5BHK Villa";
    if (property.id === "property-a29") return "1BHK";
    const pattern = ["1BHK", "2BHK", "2BHK", "3BHK"];
    return pattern[index % pattern.length];
  }

  function specificsFor(property, unitNumber, index) {
    if (unitNumber.startsWith("SHOP")) return index % 2 ? "Front corner commercial unit" : "Ground floor commercial unit";
    if (property.id === "property-r16") return index % 3 === 0 ? "Sea view" : index % 3 === 1 ? "City view" : "Corner unit";
    if (property.id === "property-villas" || property.id === "property-ghazal") return "Private villa with parking";
    if (property.id === "property-store") return "Industrial storage facility";
    return index % 2 ? "Furnished" : "Unfurnished";
  }

  function allocateOccupiedRents(count, total) {
    if (!count) return [];
    const weights = Array.from({ length: count }, (_, i) => [0.86, 0.93, 1, 1.08, 1.13][i % 5]);
    const weightTotal = weights.reduce((sum, value) => sum + value, 0);
    const rents = weights.map((weight) => Math.max(500, Math.round((total * weight / weightTotal) / 50) * 50));
    const difference = total - rents.reduce((sum, value) => sum + value, 0);
    rents[rents.length - 1] += difference;
    return rents;
  }

  function contractEndDate(property, unitNumber, index, status) {
    if (property.id === "property-r16" && R16_EXPLICIT_END_DATES[unitNumber]) return R16_EXPLICIT_END_DATES[unitNumber];
    const today = new Date();
    const months = status === "booked" ? 25 + (index % 8) : 1 + (index % 30);
    return isoDate(addMonths(today, months));
  }

  function generateDemoDataset() {
    const now = Date.now();
    const properties = PROPERTY_DEFINITIONS.map((property, index) => ({
      ...property,
      ownerName: "59 Real Estate Owner",
      managerName: "Property Manager",
      description: `${property.type} managed within the 59 Real Estate private portfolio.`,
      createdAt: now - (index + 1) * 86400000,
      updatedAt: now,
      archived: false
    }));

    const units = [];
    const tenants = [];
    const contracts = [];
    const payments = [];
    let receiptCounter = 1;

    properties.forEach((property, propertyIndex) => {
      const unitNumbers = makeUnitNumbers(property);
      const averageRent = property.occupied ? Math.round(property.monthly / property.occupied) : 0;
      const statusPreview = unitNumbers.map((unitNumber, index) => statusFor(property, unitNumber, index));
      const r16ResidentialOccupied = property.id === "property-r16" ? unitNumbers.filter((unitNumber, index) => !unitNumber.startsWith("SHOP") && statusPreview[index] === "occupied").length : 0;
      const nb1ApartmentOccupied = property.id === "property-nb1" ? unitNumbers.filter((unitNumber, index) => unitNumber.startsWith("APT") && statusPreview[index] === "occupied").length : 0;
      const occupiedRents = property.id === "property-r16"
        ? allocateOccupiedRents(r16ResidentialOccupied, 1270400)
        : property.id === "property-nb1"
          ? allocateOccupiedRents(nb1ApartmentOccupied, 41800)
          : allocateOccupiedRents(property.occupied, property.monthly);
      let occupiedRentIndex = 0;
      const r16ShopRents = { "SHOP-1": 35000, "SHOP-2": 25000, "SHOP-3": 0, "SHOP-4": 0, "SHOP-5": 5000, "SHOP-6": 10000 };
      const nb1ShopRents = { "SHOP-1": 10000, "SHOP-2": 10000, "SHOP-3": 20000, "SHOP-4": 0, "SHOP-5": 10000, "SHOP-6": 10000, "SHOP-7": 0, "SHOP-8": 18000, "SHOP-9": 0 };
      const villaRents = property.id === "property-villas" ? [20000, 20000, 13000, 13000, 13000] : null;

      unitNumbers.forEach((unitNumber, index) => {
        const status = statusPreview[index];
        let rentValue = averageRent;
        if (property.id === "property-r16") {
          if (unitNumber.startsWith("SHOP")) rentValue = r16ShopRents[unitNumber] || 0;
          else if (status === "occupied") rentValue = occupiedRents[occupiedRentIndex++];
        } else if (property.id === "property-nb1") {
          if (unitNumber.startsWith("SHOP")) rentValue = nb1ShopRents[unitNumber] || 0;
          else if (status === "occupied") rentValue = occupiedRents[occupiedRentIndex++];
        } else if (villaRents) {
          rentValue = villaRents[index];
        } else if (status === "occupied") {
          rentValue = occupiedRents[occupiedRentIndex++];
        }
        const unitId = `unit-${property.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${String(index + 1).padStart(3, "0")}`;
        const isCommercial = unitNumber.startsWith("SHOP") || property.id === "property-store";
        const currentTenantId = ["occupied", "booked"].includes(status) ? `tenant-${unitId}` : null;
        const currentContractId = ["occupied", "booked"].includes(status) ? `contract-${unitId}` : null;
        const floorMatch = String(unitNumber).match(/^(\d{1,2})\d{2}$/);

        const unit = {
          id: unitId,
          propertyId: property.id,
          unitNumber,
          aptType: unitType(property, unitNumber, index),
          specifics: specificsFor(property, unitNumber, index),
          floor: floorMatch ? Number(floorMatch[1]) : "",
          bedrooms: isCommercial ? "" : (index % 3) + 1,
          bathrooms: isCommercial ? "" : Math.min(3, (index % 3) + 1),
          furnished: isCommercial ? "N/A" : index % 2 ? "Furnished" : "Unfurnished",
          parkingNumber: isCommercial ? "Commercial bay" : `P-${pad(index + 1, 3)}`,
          status,
          rentValue,
          currentTenantId,
          currentContractId,
          kahramaa: {
            electricityNumber: `E${String(propertyIndex + 1).padStart(2, "0")}${String(index + 1).padStart(5, "0")}`,
            waterNumber: `W${String(propertyIndex + 1).padStart(2, "0")}${String(index + 1).padStart(5, "0")}`,
            accountNumber: `KA-${String(propertyIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(5, "0")}`,
            premiseNumber: `PR-${String(propertyIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(4, "0")}`,
            meterNumber: `MT-${String(propertyIndex + 1).padStart(2, "0")}-${String(index + 1).padStart(4, "0")}`,
            accountHolder: "59 Real Estate",
            connectionStatus: status === "maintenance" ? "Review" : "Active",
            notes: "Sample utility record"
          },
          notes: status === "maintenance" ? "Sample record marked for maintenance review." : "",
          createdAt: now - (index + 2) * 3600000,
          createdBy: "system-seed",
          updatedAt: now,
          updatedBy: "system-seed",
          archived: false
        };
        units.push(unit);

        if (currentTenantId && currentContractId) {
          const businessName = BUSINESS_NAMES[`${property.id}:${unitNumber}`];
          const tenantName = businessName || `Sample Tenant ${property.code}-${unitNumber}`;
          const startDate = status === "booked" ? isoDate(addMonths(new Date(), 1)) : isoDate(addMonths(new Date(), -12 - (index % 18)));
          const endDate = contractEndDate(property, unitNumber, index, status);
          const tenant = {
            id: currentTenantId,
            name: tenantName,
            tenantType: businessName || isCommercial ? "Company" : "Individual",
            qidOrCr: businessName || isCommercial ? `CR-SAMPLE-${String(index + 1).padStart(5, "0")}` : `QID-SAMPLE-${String(index + 1).padStart(5, "0")}`,
            nationality: businessName || isCommercial ? "Qatar" : ["Qatar", "India", "Philippines", "Jordan", "Egypt"][index % 5],
            mobile: `+974 55${String((propertyIndex * 100000 + index * 317) % 1000000).padStart(6, "0")}`,
            email: `tenant.${propertyIndex + 1}.${index + 1}@sample.local`,
            emergencyContact: "",
            occupants: isCommercial ? "" : 1 + (index % 5),
            status: status === "booked" ? "upcoming" : "active",
            currentUnitId: unitId,
            createdAt: now,
            updatedAt: now,
            archived: false
          };
          tenants.push(tenant);

          const contractStatus = status === "booked" ? "upcoming" : "active";
          const contract = {
            id: currentContractId,
            contractNumber: `59RE-${property.code}-${String(index + 1).padStart(4, "0")}`,
            propertyId: property.id,
            unitId,
            tenantId: currentTenantId,
            status: contractStatus,
            startDate,
            endDate,
            monthlyRent: rentValue,
            annualRent: rentValue * 12,
            securityDeposit: rentValue,
            paymentFrequency: index % 3 === 0 ? "Quarterly" : "Monthly",
            numberOfCheques: index % 3 === 0 ? 4 : 12,
            noticePeriodDays: 60,
            terms: "Sample contract terms. Final legal wording must be approved by 59 Real Estate.",
            createdAt: now,
            createdBy: "system-seed",
            updatedAt: now,
            archived: false
          };
          contracts.push(contract);

          if (status === "occupied") {
            const isPaid = (index + propertyIndex) % 11 !== 0;
            payments.push({
              id: `payment-${unitId}`,
              receiptNumber: isPaid ? `59RE-RCT-2026-${String(receiptCounter++).padStart(6, "0")}` : "",
              contractId: currentContractId,
              propertyId: property.id,
              unitId,
              tenantId: currentTenantId,
              dueDate: isoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
              paidDate: isPaid ? isoDate(new Date()) : "",
              amount: rentValue,
              method: isPaid ? ["Bank Transfer", "Cheque", "Cash"][index % 3] : "",
              reference: isPaid ? `SAMPLE-${propertyIndex + 1}-${index + 1}` : "",
              status: isPaid ? "paid" : "overdue",
              notes: "Sample payment record",
              createdAt: now,
              createdBy: "system-seed"
            });
          }
        }
      });
    });

    const maintenanceJobs = [];
    const maintenanceTeam = [
      "In-house Maintenance Team",
      "AC Technician",
      "Electrician",
      "Plumber",
      "Carpenter / Painter",
      "Cleaning Team",
      "External Contractor"
    ];
    const propertyById = new Map(properties.map((item) => [item.id, item]));
    const demoJobs = [
      { propertyId: "property-r16", unitStatus: "occupied", offset: 0, requestType: "tenant_request", category: "Air Conditioning", title: "AC deep cleaning and airflow check", priority: "normal", status: "scheduled", assignedTo: "AC Technician", scheduledDays: 1, expectedDays: 1, estimatedCost: 260, materialCost: 35, laborCost: 180, responsibility: "owner", impact: "none" },
      { propertyId: "property-r19", unitStatus: "occupied", offset: 4, requestType: "tenant_request", category: "Electrical", title: "Replace damaged light fittings", priority: "normal", status: "in_progress", assignedTo: "Electrician", scheduledDays: 0, expectedDays: 0, estimatedCost: 320, materialCost: 145, laborCost: 150, responsibility: "owner", impact: "none" },
      { propertyId: "property-foxhills", unitStatus: "occupied", offset: 8, requestType: "tenant_request", category: "Plumbing", title: "Bathroom water leakage inspection", priority: "high", status: "waiting_parts", assignedTo: "Plumber", scheduledDays: -1, expectedDays: 2, estimatedCost: 850, materialCost: 430, laborCost: 260, responsibility: "owner", impact: "none" },
      { propertyId: "property-muntazah", unitStatus: "occupied", offset: 2, requestType: "tenant_request", category: "General Repair", title: "Door lock and hinge adjustment", priority: "normal", status: "reported", assignedTo: "In-house Maintenance Team", scheduledDays: 2, expectedDays: 2, estimatedCost: 180, materialCost: 65, laborCost: 90, responsibility: "owner", impact: "none" },
      { propertyId: "property-mansoura", unitStatus: "occupied", offset: 5, requestType: "emergency", category: "Electrical", title: "Intermittent power fault in kitchen", priority: "urgent", status: "dispatched", assignedTo: "Electrician", scheduledDays: 0, expectedDays: 0, estimatedCost: 650, materialCost: 220, laborCost: 300, responsibility: "owner", impact: "none" },
      { propertyId: "property-ghazal", unitStatus: "occupied", offset: 1, requestType: "preventive", category: "Air Conditioning", title: "Quarterly AC servicing", priority: "low", status: "scheduled", assignedTo: "AC Technician", scheduledDays: 4, expectedDays: 4, estimatedCost: 450, materialCost: 80, laborCost: 320, responsibility: "owner", impact: "none" },
      { propertyId: "property-nb1", unitStatus: "maintenance", offset: 0, requestType: "move_out_inspection", category: "Turnover Preparation", title: "Repaint, repair socket and seal bathroom leak", priority: "high", status: "in_progress", assignedTo: "Carpenter / Painter", scheduledDays: -2, expectedDays: 3, estimatedCost: 2600, materialCost: 1250, laborCost: 900, contractorCost: 250, responsibility: "owner", impact: "maintenance" },
      { propertyId: "property-umm", unitStatus: "vacant", offset: 0, requestType: "move_out_inspection", category: "Inspection", title: "Move-out condition inspection", priority: "normal", status: "scheduled", assignedTo: "Property Manager", scheduledDays: 1, expectedDays: 1, estimatedCost: 0, responsibility: "owner", impact: "inspection" },
      { propertyId: "property-r16", unitStatus: "vacant", offset: 1, requestType: "pre_leasing", category: "Cleaning", title: "Deep cleaning before tenant handover", priority: "normal", status: "completed", assignedTo: "Cleaning Team", scheduledDays: -8, expectedDays: -7, actualDays: -7, estimatedCost: 420, materialCost: 70, laborCost: 330, responsibility: "owner", impact: "maintenance" },
      { propertyId: "property-r16", unitStatus: "occupied", offset: 20, requestType: "tenant_request", category: "Plumbing", title: "Kitchen mixer replacement", priority: "normal", status: "closed", assignedTo: "Plumber", scheduledDays: -35, expectedDays: -34, actualDays: -34, estimatedCost: 390, materialCost: 210, laborCost: 150, responsibility: "owner", impact: "none" },
      { propertyId: "property-r19", unitStatus: "occupied", offset: 34, requestType: "tenant_request", category: "Appliance", title: "Owner-supplied cooker repair", priority: "high", status: "closed", assignedTo: "External Contractor", scheduledDays: -52, expectedDays: -49, actualDays: -50, estimatedCost: 980, materialCost: 440, contractorCost: 470, responsibility: "owner", impact: "none" },
      { propertyId: "property-villas", unitStatus: "occupied", offset: 0, requestType: "preventive", category: "Pest Control", title: "Quarterly pest-control service", priority: "low", status: "verified", assignedTo: "External Contractor", scheduledDays: -18, expectedDays: -18, actualDays: -18, estimatedCost: 750, contractorCost: 720, responsibility: "owner", impact: "none" },
      { propertyId: "property-foxhills", unitStatus: "occupied", offset: 14, requestType: "tenant_request", category: "Air Conditioning", title: "Replace AC capacitor", priority: "high", status: "closed", assignedTo: "AC Technician", scheduledDays: -70, expectedDays: -69, actualDays: -69, estimatedCost: 480, materialCost: 250, laborCost: 190, responsibility: "owner", impact: "none" },
      { propertyId: "property-muntazah", unitStatus: "occupied", offset: 9, requestType: "tenant_request", category: "Electrical", title: "Replace bathroom exhaust fan", priority: "normal", status: "closed", assignedTo: "Electrician", scheduledDays: -95, expectedDays: -93, actualDays: -94, estimatedCost: 360, materialCost: 170, laborCost: 150, responsibility: "owner", impact: "none" },
      { propertyId: "property-umm", unitStatus: "vacant", offset: 2, requestType: "renovation", category: "Renovation", title: "Kitchen cabinet and flooring refresh", priority: "normal", status: "completed", assignedTo: "External Contractor", scheduledDays: -22, expectedDays: -8, actualDays: -10, estimatedCost: 12500, materialCost: 6400, contractorCost: 5400, transportCost: 300, responsibility: "owner", impact: "renovation" },
      { propertyId: "property-store", unitStatus: "occupied", offset: 0, requestType: "preventive", category: "Fire Safety", title: "Annual fire-safety equipment inspection", priority: "normal", status: "closed", assignedTo: "External Contractor", scheduledDays: -120, expectedDays: -120, actualDays: -120, estimatedCost: 1150, contractorCost: 1100, responsibility: "owner", impact: "none" }
    ];

    demoJobs.forEach((definition, index) => {
      const matching = units.filter((unit) => unit.propertyId === definition.propertyId && unit.status === definition.unitStatus);
      const unit = matching[definition.offset % Math.max(matching.length, 1)] || units.find((item) => item.propertyId === definition.propertyId);
      if (!unit) return;
      const scheduledDate = isoDate(new Date(Date.now() + definition.scheduledDays * 86400000));
      const expectedCompletionDate = isoDate(new Date(Date.now() + definition.expectedDays * 86400000));
      const actualCompletionDate = definition.actualDays === undefined ? "" : isoDate(new Date(Date.now() + definition.actualDays * 86400000));
      const actualCost = Number(definition.materialCost || 0) + Number(definition.laborCost || 0) + Number(definition.contractorCost || 0) + Number(definition.transportCost || 0) + Number(definition.otherCost || 0);
      maintenanceJobs.push({
        id: `maintenance-demo-${String(index + 1).padStart(3, "0")}`,
        jobNumber: `59RE-MNT-${new Date().getFullYear()}-${String(index + 1).padStart(4, "0")}`,
        propertyId: unit.propertyId,
        unitId: unit.id,
        requestType: definition.requestType,
        issueCategory: definition.category,
        title: definition.title,
        description: `${definition.title}. Sample maintenance record for ${propertyById.get(unit.propertyId)?.name || "property"} · ${unit.unitNumber}.`,
        priority: definition.priority,
        responsibility: definition.responsibility,
        availabilityImpact: definition.impact,
        status: definition.status,
        reportedBy: definition.requestType === "tenant_request" ? "Current Tenant" : "Property Manager",
        reportedAt: now + (definition.scheduledDays - 2) * 86400000,
        scheduledDate,
        scheduledTime: ["08:30", "09:00", "10:30", "13:00", "15:00"][index % 5],
        expectedCompletionDate,
        actualCompletionDate,
        assignedTo: definition.assignedTo,
        assignedType: definition.assignedTo === "External Contractor" ? "Contractor" : "Internal / Approved Team",
        estimatedCost: Number(definition.estimatedCost || 0),
        materialCost: Number(definition.materialCost || 0),
        laborCost: Number(definition.laborCost || 0),
        contractorCost: Number(definition.contractorCost || 0),
        transportCost: Number(definition.transportCost || 0),
        otherCost: Number(definition.otherCost || 0),
        actualCost,
        costStatus: ["completed", "verified", "closed"].includes(definition.status) ? "actual" : "estimated",
        workNotes: "Sample work notes. Add quotations, materials and progress updates here.",
        completionNotes: actualCompletionDate ? "Work completed and recorded in the history." : "",
        beforePhotos: [],
        afterPhotos: [],
        createdAt: now + (definition.scheduledDays - 2) * 86400000,
        createdBy: "system-seed",
        updatedAt: now,
        updatedBy: "system-seed",
        archived: false
      });
    });

    const auditLogs = [{
      id: uid("log"),
      action: "DEMO_INITIALIZED",
      entityType: "system",
      entityId: "demo",
      description: "59 Real Estate sample portfolio initialized in IndexedDB.",
      oldValue: null,
      newValue: { properties: properties.length, units: units.length },
      userId: "system-seed",
      userName: "System",
      createdAt: now
    }];

    const settings = [
      { key: "seeded", value: true },
      { key: "company", value: { name: "59 Real Estate", theme: "black-white", mode: "local" } },
      { key: "receiptCounter", value: receiptCounter },
      { key: "schemaVersion", value: 2 }
    ];

    settings.push({ key: "maintenanceTeam", value: maintenanceTeam });
    settings.push({ key: "maintenanceCounter", value: maintenanceJobs.length + 1 });

    return { properties, units, tenants, contracts, payments, maintenanceJobs, auditLogs, settings };
  }

  root.seedData = {
    PROPERTY_DEFINITIONS,
    generateDemoDataset
  };
})();
