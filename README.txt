59 REAL ESTATE · DEMO SYSTEM
Version 0.4.0-demo

WHAT CHANGED IN 0.4.0
- Rebuilt Properties & Units as premium image-led portfolio cards.
- Added cinematic black-and-white placeholder photographs for all 11 properties.
- Each card now shows total units, Occupied, Booked, Vacant, Maintenance, monthly revenue and occupancy rate.
- Added a premium image-led property detail header.
- Added Manage Photos so official property photographs can replace placeholders later.
- Property photos are compressed and stored in IndexedDB during the local demo.
- Kept the All Units, Occupied, Booked, Vacant and Maintenance filters beside the search field.
- Kept the fast New Tenant unit picker with Vacant, Booked, Occupied and All Eligible tabs.
- Login remains fixed in Night mode and every sign-in opens Night mode by default.

CORE FEATURES
- Premium responsive interface using black, white, warm grey and gold
- Local demo login for CEO, Property Manager and Administrator
- IndexedDB CRUD data provider; records remain in this browser
- 11 seeded properties and 395 demo unit records
- CEO executive dashboard and Action Center
- Property and unit folder views
- Unit, Kahramaa, tenant, contract, payment, receipt and history tabs
- Tenant replacement that preserves previous tenant and contract history
- Printable contract, receipt and portfolio reports
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

PROPERTY PHOTOS
1. Sign in as Property Manager or Administrator.
2. Open Properties & Units.
3. Select Manage Photos, or open a property and choose Edit property & photo.
4. Choose a JPG, PNG or WebP file and save.
5. The system stores a compressed local copy without changing the unit, tenant or contract records.

BULK IMPORT
1. Sign in as Property Manager or Administrator.
2. Open Data Import from the left menu.
3. Download the CSV template, or use the Excel template inside data-import.
4. Enter one row per unit.
5. Upload the completed CSV and review all validation messages.
6. Use Replace Portfolio for the first migration, or Merge and Update for later changes.

The import file can contain property, unit, Kahramaa, current tenant and current contract information in one row. When Firebase is connected, the same validated workflow will write through the Firebase provider.

IMPORTANT SECURITY NOTE
This is a local demonstration. Login and role controls are for workflow testing only.
Do not enter real QIDs, contracts, bank information or confidential tenant records yet.
Production security will use Firebase Authentication, server-enforced Realtime Database and Storage Security Rules, App Check, MFA, session controls and backups.

DATA NOTE
The portfolio is seeded from the summary figures in the supplied dashboard PDF. Tenant names, contacts, meter numbers and most unit-level contract dates are synthetic demo data and are not official records. Property photographs are design placeholders and must later be replaced by the official photographs.

FOLDER STRUCTURE
- index.html
- js/main.js
- js/core/
- js/data/
- js/services/
- js/modules/
- js/utilities/
- styles/
- styles/modules/
- assets/logos/
- assets/images/properties/
- assets/audio/
- assets/icons/
- assets/documents/
- data-import/
