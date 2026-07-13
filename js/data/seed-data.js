(function () {
  "use strict";

  const root = window.RE59;
  const { uid, isoDate, addMonths } = root.utils;

  const PROPERTY_DEFINITIONS = [
    { id: "property-r16", code: "R16", name: "Marina Tower 16", type: "Mixed-use tower", location: "Doha", total: 127, occupied: 119, booked: 4, vacant: 4, maintenance: 0, monthly: 1345400, coverImage: "assets/images/properties/marina-tower-16.jpg" },
    { id: "property-r19", code: "R19", name: "R19 Tower", type: "Residential tower", location: "Doha", total: 158, occupied: 158, booked: 0, vacant: 0, maintenance: 0, monthly: 997000, coverImage: "assets/images/properties/r19-tower.jpg" },
    { id: "property-foxhills", code: "D5-D6", name: "D5 & D6 Foxhills", type: "Residential buildings", location: "Lusail", total: 36, occupied: 36, booked: 0, vacant: 0, maintenance: 0, monthly: 330100, coverImage: "assets/images/properties/foxhills.jpg" },
    { id: "property-a29", code: "A29", name: "Building A29 Foxhills", type: "Residential unit", location: "Lusail", total: 1, occupied: 1, booked: 0, vacant: 0, maintenance: 0, monthly: 6500, coverImage: "assets/images/properties/building-a29.jpg" },
    { id: "property-villas", code: "VILLAS", name: "Stand Alone Villas", type: "Villa portfolio", location: "Doha", total: 5, occupied: 5, booked: 0, vacant: 0, maintenance: 0, monthly: 79000, coverImage: "assets/images/properties/stand-alone-villas.jpg" },
    { id: "property-nb1", code: "NB1", name: "NB1 Residence", type: "Residential & commercial", location: "Doha", total: 18, occupied: 14, booked: 1, vacant: 2, maintenance: 1, monthly: 119800, coverImage: "assets/images/properties/nb1-residence.jpg" },
    { id: "property-muntazah", code: "MUN", name: "Muntazah Building", type: "Residential building", location: "Al Muntazah", total: 15, occupied: 15, booked: 0, vacant: 0, maintenance: 0, monthly: 63200, coverImage: "assets/images/properties/muntazah-building.jpg" },
    { id: "property-mansoura", code: "B46", name: "Building 46 Al-Mansoura", type: "Residential building", location: "Al Mansoura", total: 14, occupied: 14, booked: 0, vacant: 0, maintenance: 0, monthly: 85000, coverImage: "assets/images/properties/al-mansoura-46.jpg" },
    { id: "property-ghazal", code: "AGC", name: "Al-Ghazal Villas Ain Khaled", type: "Villa compound", location: "Ain Khaled", total: 8, occupied: 8, booked: 0, vacant: 0, maintenance: 0, monthly: 80000, coverImage: "assets/images/properties/al-ghazal-compound.jpg" },
    { id: "property-umm", code: "B-5", name: "Umm Ghuwailina B-5", type: "Residential building", location: "Umm Ghuwailina", total: 12, occupied: 2, booked: 6, vacant: 4, maintenance: 0, monthly: 15750, coverImage: "assets/images/properties/umm-ghuwailina-b5.jpg" },
    { id: "property-store", code: "BAW", name: "Store Birkat Al Awamer", type: "Warehouse / store", location: "Birkat Al Awamer", total: 1, occupied: 1, booked: 0, vacant: 0, maintenance: 0, monthly: 43000, coverImage: "assets/images/properties/store-birkat-al-awamer.jpg" }
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
            notes: "Demo utility record"
          },
          notes: status === "maintenance" ? "Demo record marked for maintenance review." : "",
          createdAt: now - (index + 2) * 3600000,
          createdBy: "system-seed",
          updatedAt: now,
          updatedBy: "system-seed",
          archived: false
        };
        units.push(unit);

        if (currentTenantId && currentContractId) {
          const businessName = BUSINESS_NAMES[`${property.id}:${unitNumber}`];
          const tenantName = businessName || `Demo Tenant ${property.code}-${unitNumber}`;
          const startDate = status === "booked" ? isoDate(addMonths(new Date(), 1)) : isoDate(addMonths(new Date(), -12 - (index % 18)));
          const endDate = contractEndDate(property, unitNumber, index, status);
          const tenant = {
            id: currentTenantId,
            name: tenantName,
            tenantType: businessName || isCommercial ? "Company" : "Individual",
            qidOrCr: businessName || isCommercial ? `CR-DEMO-${String(index + 1).padStart(5, "0")}` : `QID-DEMO-${String(index + 1).padStart(5, "0")}`,
            nationality: businessName || isCommercial ? "Qatar" : ["Qatar", "India", "Philippines", "Jordan", "Egypt"][index % 5],
            mobile: `+974 55${String((propertyIndex * 100000 + index * 317) % 1000000).padStart(6, "0")}`,
            email: `tenant.${propertyIndex + 1}.${index + 1}@demo.local`,
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
            terms: "Demo contract terms. Final legal wording must be approved by 59 Real Estate.",
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
              reference: isPaid ? `DEMO-${propertyIndex + 1}-${index + 1}` : "",
              status: isPaid ? "paid" : "overdue",
              notes: "Demo payment record",
              createdAt: now,
              createdBy: "system-seed"
            });
          }
        }
      });
    });

    const auditLogs = [{
      id: uid("log"),
      action: "DEMO_INITIALIZED",
      entityType: "system",
      entityId: "demo",
      description: "59 Real Estate demo portfolio initialized in IndexedDB.",
      oldValue: null,
      newValue: { properties: properties.length, units: units.length },
      userId: "system-seed",
      userName: "Demo System",
      createdAt: now
    }];

    const settings = [
      { key: "seeded", value: true },
      { key: "company", value: { name: "59 Real Estate", theme: "black-white", mode: "demo" } },
      { key: "receiptCounter", value: receiptCounter },
      { key: "schemaVersion", value: 1 }
    ];

    return { properties, units, tenants, contracts, payments, auditLogs, settings };
  }

  root.seedData = {
    PROPERTY_DEFINITIONS,
    generateDemoDataset
  };
})();
