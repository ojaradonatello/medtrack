# MedTrack AI — St. Philips Hospital MVP

MedTrack AI is a smart healthcare inventory and medication management platform designed to help hospitals, clinics, pharmacies, and health centers efficiently manage drugs, patients, dispensing records, stock levels, alerts, and staff activities.

The system combines inventory management, patient tracking, department workflow, analytics, and AI-powered insights to improve healthcare operations and reduce medication stock-outs.

This repository currently contains the **St. Philips Hospital MVP**, covering the full patient journey from reception registration to pharmacy dispensing and visit completion.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Current Active MVP Folders](#current-active-mvp-folders)
- [Repository Structure](#repository-structure)
- [Core Hospital Workflow](#core-hospital-workflow)
- [Implemented Modules](#implemented-modules)
- [Role-Based Access Control](#role-based-access-control)
- [Technology Stack](#technology-stack)
- [Features](#features)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Database Notes](#database-notes)
- [Backend API Overview](#backend-api-overview)
- [Mobile App Screens](#mobile-app-screens)
- [Testing / Demo Flow](#testing--demo-flow)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [Author](#author)
- [License](#license)

---

## Project Overview

MedTrack AI is built to support hospital operations by providing a centralized system for:

- Patient registration and visit tracking
- Reception workflow management
- Doctor consultation worklists
- Laboratory and interpretation routing
- Billing and dispensary handoff
- Pharmacy dispensing
- Drug inventory management
- Stock monitoring
- Low-stock and expiry alerts
- AI anomaly detection
- Admin supervision
- Audit/activity logs
- Staff user management
- Role-based mobile access

The MVP is designed to be simple enough for hospital staff while still supporting a realistic multi-department clinical workflow.

---

## Current Active MVP Folders

The active St. Philips MVP code is currently stored in:

```txt
backend-stphilips/
medtrack-stphilips/
```

Legacy/reference folders may also exist:

```txt
backend/
frontend/
medtrack-mobile/
dashboard/
```

Those older folders are not the current MVP source of truth.

---

## Repository Structure

Current working structure:

```txt
MedTrack/
├── backend-stphilips/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── app.js
│   │   └── server.js
│   ├── seed/
│   ├── .env.example
│   ├── package.json
│   └── ...
│
├── medtrack-stphilips/
│   ├── app/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   ├── config/
│   │   └── data/
│   ├── assets/
│   ├── app.json
│   ├── package.json
│   └── ...
│
├── DEMO_SCRIPT.md
├── README.md
└── .gitignore
```

---

## Core Hospital Workflow

The MVP supports the following hospital patient journey:

```txt
Reception registration
        ↓
Doctor consultation
        ↓
Laboratory
        ↓
Interpretation
        ↓
Billing
        ↓
Dispensary
        ↓
Visit completion
```

### Workflow Summary

1. **Reception**
   - Registers a new patient
   - Searches returning patients by phone
   - Creates a new visit
   - Captures initial patient vitals
   - Views patient queue
   - Can cancel visits or mark no-shows

2. **Doctor**
   - Views consultation worklist
   - Starts consultation
   - Updates vitals
   - Sends patient to laboratory, billing, or dispensary
   - Interprets lab results where applicable

3. **Laboratory**
   - Views laboratory worklist
   - Starts lab test
   - Sends results for interpretation or billing

4. **Billing**
   - Views billing worklist
   - Clears charges
   - Sends patient to dispensary

5. **Pharmacy**
   - Views dispensary queue
   - Dispenses medication
   - Reduces inventory stock automatically
   - Completes visit after dispensing

6. **Admin**
   - Views hospital-wide overview
   - Monitors workflow
   - Monitors inventory risk
   - Views alerts and AI anomalies
   - Views audit/activity logs
   - Manages staff users

---

## Implemented Modules

### Authentication

- User login
- JWT-based authentication
- Protected API routes
- Role-based middleware
- Session persistence in mobile app

### Patient Management

- Register new patient
- Search patient by name or phone
- View patient details
- View patient visit history
- Create return visit for existing patient
- Prevent duplicate active visits unless forced by workflow rules

### Reception Module

- Reception dashboard
- Patient queue
- Add patient flow
- Capture initial vitals
- Cancel visit
- Mark no-show
- Find patient by phone

### Visit Workflow

- Visit creation
- Visit status tracking
- Department routing
- Role-controlled visit movement
- Visit notes
- Vitals updates during workflow
- Completion and cancellation states

### Doctor Module

- Consultation worklist
- Start consultation
- Update vitals
- Send to laboratory
- Send to billing
- Send to dispensary
- Interpretation worklist
- Complete visit where permitted

### Laboratory Module

- Laboratory worklist
- Start lab test
- Send to interpretation
- Send to billing where permitted

### Billing Module

- Billing worklist
- Clear charges
- Send to dispensary
- Complete visit where permitted

### Pharmacy / Dispensing Module

- Dispensary queue
- Dispense medication
- Dispense multiple medications
- Dispense and complete visit
- Automatic stock reduction
- Low-stock and expiry warnings during dispensing
- Dispensing history

### Inventory Module

- View inventory
- Create drug
- Add initial stock
- Add stock to existing drug
- Track quantity
- Track minimum stock level
- Track expiry date
- Track batch number
- Low-stock highlighting
- Expiry status labels

### Alerts Module

- System alerts
- Alert types:
  - anomaly
  - low-stock
  - expiry
  - warning
- Resolve alerts
- Filter alerts:
  - All
  - Unresolved
  - Resolved

### AI Anomaly Module

- AI alerts screen
- Detects unusual dispensing behavior
- Detects usage spikes
- Detects staff anomalies
- Detects stock risk
- Detects expiry warnings
- Normalizes backend anomaly responses for mobile display

### Admin Module

- Admin overview
- Total users
- Total patients
- Total visits
- Active visits
- Completed today
- Registered today
- Users by role
- Workflow status counts
- Inventory risk summary
- Low stock count
- Expiring soon / expired count
- Unresolved alerts count
- Recent activity logs
- Recent visits

### User Management Module

- Create staff user
- Edit user
- Reset password
- Assign role
- Prevent admin from changing own role
- Admin-only access

### Audit / Activity Logs

- Tracks important system actions
- Stores actor information
- Stores patient and visit references where applicable
- Shows status and department changes
- Shows vitals updated flags
- Shows notes updated flags

---

## Role-Based Access Control

Supported roles:

```txt
admin
reception
doctor
lab
billing
pharmacist
staff
```

### Role Permissions Overview

| Role | Access |
|---|---|
| admin | Full system access, admin overview, user management, alerts, AI alerts, history, inventory, dispense, worklists |
| reception | Dashboard, patient queue, add patient, patients, patient history |
| doctor | Worklist, patients, patient history |
| lab | Worklist |
| billing | Worklist |
| pharmacist | Worklist, inventory, dispense |
| staff | Worklist only, depending on configuration |

The mobile app uses route guards so each role only sees permitted modules.

Backend routes are protected using:

```txt
JWT authentication
role middleware
```

Important administrative and clinical routes are not publicly accessible.

---

## Technology Stack

### Backend

```txt
Node.js
Express.js
MongoDB
Mongoose
JWT Authentication
Bcrypt
```

### Mobile / Web App

```txt
React Native
Expo
Expo Router
Axios
TanStack Query
```

### Tooling

```txt
Git
GitHub
Postman
MongoDB Compass optional
```

---

## Features

### Patient Features

- Register and manage patients
- View patient medication history
- Search and filter patient records
- Capture patient vitals
- Track patient visits across departments
- Prevent duplicate active visits
- View visit status and department

### Inventory Features

- Add, edit, and remove drugs
- Track stock quantities
- Low-stock monitoring
- Expiry monitoring
- Batch tracking
- Inventory analytics
- Add stock to existing drugs
- Create drug with initial stock

### Dispensing Features

- Dispense medication to patients
- Record dispensing history
- Track dispensing staff
- Reduce stock automatically
- Dispense multiple medications
- Complete visit after dispensing
- Receive low-stock and expiry warnings

### Admin Features

- User authentication and authorization
- Staff activity tracking
- Admin overview dashboard
- Role-based permissions
- Audit logs
- Alert monitoring
- AI anomaly monitoring
- User management
- Inventory risk monitoring

### Analytics Features

- Drug usage trends
- Top dispensed drugs
- Staff activity reports
- Inventory insights
- Low-stock alerts
- Real-time notifications foundation
- Workflow status summaries

---

## Local Development Setup

### Prerequisites

Install:

```txt
Node.js 18+
npm or yarn
MongoDB local or MongoDB Atlas
Git
```

---

## 1. Backend Setup

Go to the backend folder:

```bash
cd backend-stphilips
```

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Edit the environment file:

```bash
nano .env
```

For local testing, use:

```env
PORT=5001
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/stphilips
JWT_SECRET=replace_with_strong_jwt_secret
```

Start the backend:

```bash
npm start
```

Expected output:

```txt
MongoDB Connected
Server running on port 5001
```

---

## 2. Optional Database Seeding

The backend contains seed scripts for demo data.

Run only if you want to populate a fresh local database:

```bash
node seed/admin-user.js
node seed/reception-user.js
node seed/clinical-users.js
node seed/staff.js
node seed/drugs.js
node seed/inventory.js
node seed/patients.js
```

Important:

```txt
Do not commit real passwords or secrets.
Change default demo passwords before production use.
```

---

## 3. Mobile / Web App Setup

Open another terminal.

Go to the mobile folder:

```bash
cd medtrack-stphilips
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start -c
```

For browser testing:

```bash
npx expo start -c
```

Then press:

```bash
w
```

For mobile testing, scan the QR code using Expo Go.

---

## Environment Variables

### Backend `.env.example`

```env
PORT=5001
NODE_ENV=development

# Use local MongoDB for testing
MONGO_URI=mongodb://127.0.0.1:27017/stphilips

# Replace this with a strong secret in production
JWT_SECRET=replace_with_strong_jwt_secret

# Optional integration placeholders
# Do not commit real API keys
SMS_PROVIDER_KEY=
WHATSAPP_TOKEN=
```

Never commit real values for:

```txt
MONGO_URI with password
JWT_SECRET
SMS_PROVIDER_KEY
WHATSAPP_TOKEN
```

---

## Database Notes

The MVP can run against:

```txt
Local MongoDB
MongoDB Atlas
```

For hospital demos and offline testing, local MongoDB is recommended.

The project supports copying data between Atlas and local MongoDB using:

```bash
mongodump
mongorestore
```

Example workflow:

```bash
mongodump --uri="YOUR_ATLAS_URI" --db="stphilips" --out="./atlas-backup"
mongorestore --uri="mongodb://127.0.0.1:27017" --drop "./atlas-backup/stphilips"
```

Do not commit real Atlas connection strings or passwords.

---

## Backend API Overview

### Authentication

```http
POST /api/auth/login
```

### Patients

```http
GET    /api/patients
GET    /api/patients/search
GET    /api/patients/:id
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/:id/visits
```

### Visits

```http
GET    /api/visits
GET    /api/visits/:id
POST   /api/visits
PATCH  /api/visits/:id/move
```

### Reception

```http
GET  /api/reception/dashboard
GET  /api/reception/queue
GET  /api/reception/find-patient
POST /api/reception/register-patient-visit
POST /api/reception/create-visit-for-existing-patient
```

### Inventory

```http
GET  /api/inventory
POST /api/inventory
```

### Drugs

```http
GET  /api/drugs
POST /api/drugs
```

### Dispensing

```http
GET  /api/dispense/queue
POST /api/dispense
```

### History

```http
GET /api/history
GET /api/history/staff-analytics
```

### Alerts

```http
GET /api/alerts
PUT /api/alerts/:id/resolve
```

### AI Anomalies

```http
GET /api/anomalies
```

### Admin

```http
GET  /api/admin/overview
GET  /api/admin/activity-logs
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/:id
```

---

## Mobile App Screens

### Authentication

```txt
Login
```

### Reception

```txt
Reception Dashboard
Patient Queue
Add Patient
Patients
Patient History
```

### Clinical Workflow

```txt
Department Worklist
```

### Pharmacy

```txt
Inventory
Dispense
```

### Administration

```txt
Admin Overview
User Management
Alerts
AI Alerts
History
```

### Shared UI States

The app uses reusable state components:

```txt
LoadingState
ErrorState
EmptyState
ErrorBanner
SuccessBanner
InfoBanner
```

This provides consistent feedback across screens.

---

## Testing / Demo Flow

A full hospital demo flow is available in:

```txt
DEMO_SCRIPT.md
```

### Quick Demo Summary

1. Login as reception
2. Register a new patient
3. Capture initial vitals
4. Confirm patient appears in queue
5. Login as doctor
6. Start consultation
7. Send patient to laboratory
8. Login as lab
9. Start lab test
10. Send to interpretation
11. Login as doctor
12. Send to billing
13. Login as billing
14. Send to dispensary
15. Login as pharmacist
16. Dispense medication
17. Complete visit
18. Login as admin
19. Review admin overview
20. Review inventory, history, alerts, AI alerts, and activity logs

---

## Security Notes

Never commit:

```txt
.env
.env.atlas-backup
real JWT secrets
real MongoDB passwords
real SMS keys
real WhatsApp tokens
login response JSON files
```

The repository includes:

```txt
.env.example
```

only as a safe template.

If any secret has ever been committed or shared, rotate it immediately.

Recommended production practices:

```txt
Use strong JWT secrets
Use HTTPS
Use MongoDB Atlas IP allowlisting
Use least-privilege database users
Enable audit logging
Rotate credentials regularly
Do not expose admin routes publicly
Use environment-specific configuration
```

---

## Roadmap

### Completed MVP

```txt
Drug Inventory Management
Patient Management
Medication Dispensing
Role-Based Permissions
Audit Logs
Admin Overview
Alerts
AI Anomaly Alerts
User Management
Reception Vitals Capture
Department Workflows
Dispensing History
Inventory Risk Monitoring
```

### Future Enhancements

```txt
AI Stock Prediction
Prescription OCR
Multi-Hospital Support
SMS Notifications
Advanced Reporting
Offline Mode
Attendance Monitoring Enhancement
Performance Analytics Enhancement
Real-Time Notifications
Exportable PDF/Excel Reports
```

---

## Author

**Donato Ojara**  
Software Engineer | ICT Officer | Full-Stack Developer  
Email: ojaradonato4@gmail.com  
Location: Uganda

---

## License

This project is licensed under the MIT License.