(function () {
  "use strict";

  const root = window.RE59;

  const REQUIRED_HEADERS = [
    "property_code", "property_name", "unit_number", "unit_status", "monthly_rent"
  ];

  const TEMPLATE_HEADERS = [
    "property_code", "property_name", "property_type", "property_location",
    "unit_number", "unit_type", "specifics", "floor", "bedrooms", "bathrooms",
    "furnished", "parking_number", "unit_status", "monthly_rent",
    "electricity_number", "water_number", "kahramaa_account_number", "premise_number",
    "meter_number", "kahramaa_account_holder", "kahramaa_connection_status", "unit_notes",
    "tenant_name", "tenant_type", "qid_or_cr", "nationality", "mobile", "email",
    "emergency_contact", "occupants", "contract_number", "contract_status",
    "contract_start", "contract_end", "security_deposit", "payment_frequency",
    "number_of_cheques", "notice_period_days", "contract_terms"
  ];

  function parseCSV(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const next = source[index + 1];
      if (char === '"' && quoted && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(field);
        if (row.some((value) => String(value).trim() !== "")) rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    if (field.length || row.length) {
      row.push(field);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
    }
    if (!rows.length) throw new Error("The CSV file is empty.");

    const headers = rows[0].map((value) => String(value).trim().toLowerCase());
    const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
    if (duplicates.length) throw new Error(`Duplicate CSV header: ${duplicates[0]}`);

    const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
    if (missing.length) throw new Error(`Missing required column(s): ${missing.join(", ")}`);

    return rows.slice(1).map((values, rowIndex) => {
      const record = { __row: rowIndex + 2 };
      headers.forEach((header, columnIndex) => { record[header] = String(values[columnIndex] ?? "").trim(); });
      return record;
    });
  }

  function validDate(value) {
    if (!value) return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
  }

  function validateRows(rows) {
    const errors = [];
    const warnings = [];
    const seen = new Set();
    const allowedStatuses = new Set(["occupied", "booked", "vacant", "inspection", "maintenance", "renovation", "unavailable"]);
    const allowedContractStatuses = new Set(["active", "upcoming", "draft", "expired", "completed", "terminated", "cancelled", ""]);

    rows.forEach((row) => {
      const key = `${row.property_code.toLowerCase()}|${row.unit_number.toLowerCase()}`;
      if (!row.property_code) errors.push({ row: row.__row, message: "Property code is required." });
      if (!row.property_name) errors.push({ row: row.__row, message: "Property name is required." });
      if (!row.unit_number) errors.push({ row: row.__row, message: "Unit number is required." });
      if (seen.has(key)) errors.push({ row: row.__row, message: "Duplicate property code and unit number in this file." });
      seen.add(key);

      const status = row.unit_status.toLowerCase();
      if (!allowedStatuses.has(status)) errors.push({ row: row.__row, message: `Invalid unit status “${row.unit_status}”.` });
      const rent = Number(String(row.monthly_rent).replaceAll(",", ""));
      if (!Number.isFinite(rent) || rent < 0) errors.push({ row: row.__row, message: "Monthly rent must be zero or a positive number." });

      if (["occupied", "booked"].includes(status)) {
        if (!row.tenant_name) errors.push({ row: row.__row, message: "Occupied/booked units require a tenant name." });
        if (!validDate(row.contract_start)) errors.push({ row: row.__row, message: "Occupied/booked units require contract_start in YYYY-MM-DD format." });
        if (!validDate(row.contract_end)) errors.push({ row: row.__row, message: "Occupied/booked units require contract_end in YYYY-MM-DD format." });
        if (validDate(row.contract_start) && validDate(row.contract_end) && new Date(row.contract_end) <= new Date(row.contract_start)) {
          errors.push({ row: row.__row, message: "Contract end must be after contract start." });
        }
      } else if (row.tenant_name || row.contract_number) {
        warnings.push({ row: row.__row, message: `Tenant/contract details will be ignored because unit status is ${status}.` });
      }

      if (!allowedContractStatuses.has(row.contract_status.toLowerCase())) {
        errors.push({ row: row.__row, message: `Invalid contract status “${row.contract_status}”.` });
      }
      if (!row.unit_type) warnings.push({ row: row.__row, message: "Unit type is blank." });
      if (!row.kahramaa_account_number && !row.electricity_number && !row.water_number) {
        warnings.push({ row: row.__row, message: "Kahramaa/electricity/water fields are blank." });
      }
    });

    return {
      rowCount: rows.length,
      propertyCount: new Set(rows.map((row) => row.property_code.toLowerCase())).size,
      occupiedCount: rows.filter((row) => row.unit_status.toLowerCase() === "occupied").length,
      bookedCount: rows.filter((row) => row.unit_status.toLowerCase() === "booked").length,
      vacantCount: rows.filter((row) => row.unit_status.toLowerCase() === "vacant").length,
      errors,
      warnings,
      valid: errors.length === 0
    };
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function toCSV(rows, headers = TEMPLATE_HEADERS) {
    return [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\r\n");
  }

  function downloadText(filename, text, type = "text/csv;charset=utf-8") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function sampleRows() {
    return [
      {
        property_code: "R16", property_name: "Marina Tower 16", property_type: "Mixed-use tower", property_location: "Doha",
        unit_number: "301", unit_type: "2BHK", specifics: "Sea view - front corner", floor: "3", bedrooms: "2", bathrooms: "2",
        furnished: "Unfurnished", parking_number: "P-301", unit_status: "occupied", monthly_rent: "11000",
        electricity_number: "ELEC-R16-301", water_number: "WATER-R16-301", kahramaa_account_number: "KAHR-R16-301",
        premise_number: "PREM-R16-301", meter_number: "MTR-R16-301", kahramaa_account_holder: "59 Real Estate",
        kahramaa_connection_status: "Active", unit_notes: "",
        tenant_name: "Sample Tenant", tenant_type: "Individual", qid_or_cr: "", nationality: "", mobile: "", email: "",
        emergency_contact: "", occupants: "3", contract_number: "59RE-R16-301-2026", contract_status: "active",
        contract_start: "2026-01-01", contract_end: "2026-12-31", security_deposit: "11000",
        payment_frequency: "Monthly", number_of_cheques: "12", notice_period_days: "60", contract_terms: "Approved company terms"
      },
      {
        property_code: "R16", property_name: "Marina Tower 16", property_type: "Mixed-use tower", property_location: "Doha",
        unit_number: "302", unit_type: "1BHK", specifics: "City view", floor: "3", bedrooms: "1", bathrooms: "1",
        furnished: "Unfurnished", parking_number: "P-302", unit_status: "vacant", monthly_rent: "8500",
        electricity_number: "ELEC-R16-302", water_number: "WATER-R16-302", kahramaa_account_number: "KAHR-R16-302",
        premise_number: "PREM-R16-302", meter_number: "MTR-R16-302", kahramaa_account_holder: "59 Real Estate",
        kahramaa_connection_status: "Active", unit_notes: "Ready for leasing"
      },
      {
        property_code: "NB1", property_name: "NB1 Residence", property_type: "Residential & commercial", property_location: "Doha",
        unit_number: "SHOP-7", unit_type: "Commercial Shop", specifics: "Ground floor", floor: "Ground", bedrooms: "", bathrooms: "1",
        furnished: "N/A", parking_number: "", unit_status: "booked", monthly_rent: "18000",
        electricity_number: "ELEC-NB1-S7", water_number: "WATER-NB1-S7", kahramaa_account_number: "KAHR-NB1-S7",
        premise_number: "PREM-NB1-S7", meter_number: "MTR-NB1-S7", kahramaa_account_holder: "59 Real Estate",
        kahramaa_connection_status: "Active", unit_notes: "",
        tenant_name: "Sample Business LLC", tenant_type: "Company", qid_or_cr: "CR-SAMPLE", nationality: "", mobile: "", email: "",
        emergency_contact: "", occupants: "", contract_number: "59RE-NB1-S7-2026", contract_status: "upcoming",
        contract_start: "2026-09-01", contract_end: "2028-08-31", security_deposit: "36000",
        payment_frequency: "Quarterly", number_of_cheques: "8", notice_period_days: "90", contract_terms: "Approved commercial terms"
      }
    ];
  }

  function downloadTemplate() {
    downloadText("59-real-estate-portfolio-import-template.csv", toCSV(sampleRows()));
  }

  root.importService = {
    REQUIRED_HEADERS,
    TEMPLATE_HEADERS,
    parseCSV,
    validateRows,
    toCSV,
    downloadText,
    downloadTemplate
  };
})();
