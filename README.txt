59 REAL ESTATE · DEMO SYSTEM
Version 0.5.0-demo

WHAT CHANGED IN 0.5.0
- Added a complete Maintenance operations module without crowding the main dashboard.
- Added separate workflows for occupied-unit tenant requests and vacant-unit turnover preparation.
- Added New Requests, Schedule, Active Jobs, Completed Jobs and Costs views.
- Added dispatch date/time, expected completion, actual completion and early/on-time/late tracking.
- Added assignment to an internal team member or approved contractor.
- Added estimated and actual Materials, Labour, Contractor, Transport and Other costs.
- Added owner, tenant, warranty, shared and not-covered cost responsibility.
- Added annual maintenance cost by property and by issue category.
- Added a concise CEO maintenance summary on the Executive Dashboard.
- Added a Maintenance tab inside every unit folder.
- Added maintenance jobs to global search, reports, backup and audit history.
- Closing a tenancy now moves the unit to Inspection Pending and automatically creates a move-out inspection job.
- Vacant-unit workflow is now: Inspection Pending → Under Maintenance / Renovation when needed → Ready for Tenant after verification.
- Normal occupied-unit repairs do not change the unit from Occupied.

MAINTENANCE WORKFLOW
Reported → Reviewed → Scheduled → Dispatched → In Progress → Completed → Verified → Closed
Waiting for Parts and Reopened are also supported.

UNIT AVAILABILITY IS SEPARATE FROM JOB STATUS
- Occupied: normal tenant repairs may remain open while the unit stays occupied.
- Inspection Pending: tenant moved out and the turnover inspection is not finished.
- Under Maintenance: empty unit needs repair before reletting.
- Under Renovation: empty unit needs major work.
- Ready for Tenant: inspection and required work are complete.

CORE FEATURES
- Premium responsive interface using black, white, warm grey and gold
- Local demo login for CEO, Property Manager and Administrator
- IndexedDB CRUD data provider; records remain in this browser
- 11 seeded properties and 395 demo unit records
- CEO executive dashboard and Action Center
- Premium image-led property cards with replaceable local photos
- Property and unit folder views
- Unit, Kahramaa, tenant, contract, payment, receipt, maintenance and history tabs
- Tenant replacement that preserves previous tenant and contract history
- Printable contracts, receipts, portfolio and maintenance reports
- Local audit log
- JSON backup, restore and reset
- CSV and Excel bulk-import templates
- Modular JavaScript, styles and assets prepared for Firebase later

HOW TO OPEN
1. Extract the ZIP file.
2. Open index.html in Google Chrome, or run START-DEMO.bat.
3. Use one of the three Demo Access cards on the sign-in screen.

DEMO CREDENTIALS
CEO / Owner
Email: ceo@59re.demo
Password: Demo59CEO!

Property Manager
Email: manager@59re.demo
Password: Demo59PM!

System Administrator
Email: admin@59re.demo
Password: Demo59ADMIN!

HOW TO TEST MAINTENANCE
1. Sign in as Property Manager or Administrator.
2. Open Maintenance from the left menu.
3. Review the seeded jobs, schedule, completed work and costs.
4. Select + New Maintenance Job to create a tenant request, inspection, repair or renovation.
5. Open a job to progress it through Dispatch, In Progress, Complete, Verify and Close.
6. Open any unit folder and choose the Maintenance tab to see that unit's jobs and total cost.

BULK IMPORT
1. Sign in as Property Manager or Administrator.
2. Open Data Import from the left menu.
3. Download the CSV template, or use the Excel template inside data-import.
4. Enter one row per unit.
5. Upload the completed CSV and review all validation messages.
6. Use Replace Portfolio for the first migration, or Merge and Update for later changes.

The portfolio import file contains property, unit, Kahramaa, current tenant and current contract information. Maintenance jobs are operational records created inside the system and can later receive their own migration template if historical maintenance data is available.

IMPORTANT SECURITY NOTE
This is a local demonstration. Login and role controls are for workflow testing only.
Do not enter real QIDs, contracts, bank information or confidential tenant records yet.
Production security will use Firebase Authentication, server-enforced Realtime Database and Storage Security Rules, App Check, MFA, session controls and backups.

DATA NOTE
The portfolio is seeded from the summary figures in the supplied dashboard PDF. Tenant names, contacts, meter numbers, most unit-level contract dates and all maintenance work orders are synthetic demo records. Property photographs are design placeholders and must later be replaced by official photographs.
