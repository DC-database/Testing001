/*
  59 Real Estate · Future Firebase Provider
  ----------------------------------------
  This file is intentionally not loaded in the demo build.

  When the production Firebase project is created, this provider will expose
  the same methods as indexeddb-provider.js (open, get, getAll, put, bulkPut,
  remove, exportAll and importAll). data-service.js can then select Firebase
  without rewriting Dashboard, Properties, Units, Tenants, Contracts, Payments
  or Reports.

  Production integration must also include:
  - Firebase Authentication (no public registration)
  - CEO / Property Manager / Administrator role claims
  - Realtime Database Security Rules with default deny
  - Firebase Storage rules for contracts and identity documents
  - App Check enforcement
  - MFA for CEO and Administrator
  - Audit logging and scheduled backups
*/
