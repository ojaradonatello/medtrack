# MedTrack St. Philips Hospital MVP

MedTrack St. Philips is a hospital workflow and patient management MVP built for a demo environment. It supports the full patient journey from reception registration through consultation, laboratory testing, result interpretation, billing, prescription dispensing, and visit completion.

The system is designed to demonstrate a realistic hospital information workflow for St. Philips Hospital, including clinical, laboratory, pharmacy, billing, and administrative operations.

---

## Core Modules

### 1. Authentication and User Management

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

Features:

```txt
Secure login
JWT authentication
Role-based access control
Protected API routes
User management for administrators
```

---

### 2. Reception and Patient Registration

Reception staff can:

```txt
Register a new patient
Create the first visit
Search existing patients
View patient visit history
Edit patient details
```

Patient details include:

```txt
Full name
Phone number
Age
Gender
Address
Tribe
Next of Kin name
Next of Kin phone
```

The Next of Kin fields are displayed across clinical screens as emergency contact information.

---

### 3. Patient Search and Edit

Patients can be searched by:

```txt
Name
Phone number
```

Authorized users can edit patient demographic information, including:

```txt
Name
Phone
Age
Gender
Address
Tribe
Next of Kin
```

---

### 4. Consultation Module

Doctors can:

```txt
Start consultation
Record vitals
Send patient to laboratory
Send patient to billing
Send patient to dispensary with prescription
Complete visit with discharge summary
Cancel visit
```

Vitals supported:

```txt
Blood pressure systolic/diastolic
Temperature
Pulse
Weight
```

---

### 5. Laboratory Module

Laboratory staff can:

```txt
Start lab test
Record one or more lab results
Mark result status
Add result notes
Send patient to interpretation
Send patient to billing
Cancel visit
```

Lab result statuses:

```txt
normal
abnormal
critical
pending
```

Example:

```txt
Malaria Parasite: Positive
CBC - WBC: 11.2
```

---

### 6. Result Interpretation Module

Doctors can review laboratory results and:

```txt
Read structured lab results
Add interpretation notes
Send patient to billing
Complete visit
Cancel visit
```

Critical results are highlighted for faster review.

---

### 7. Prescription Module

Doctors can prescribe one or more medicines when sending a patient to dispensary.

Prescription fields:

```txt
Drug name
Strength
Quantity
Dosage
Frequency
Duration
Instructions
```

Example:

```txt
Amoxicillin 500mg
Quantity: 10
Dosage: 1 capsule
Frequency: Twice daily
Duration: 5 days
Instructions: Take after food
```

---

### 8. Pharmacist Dispensing Module

Pharmacists can:

```txt
View patients waiting in dispensary
View prescribed medicines
Match prescriptions to inventory drugs
Dispense selected prescription
Dispense all remaining prescriptions
Complete visit
```

The system reduces inventory stock when medication is dispensed.

Dispensing records include:

```txt
Drug name
Strength
Quantity dispensed
Prescribing doctor
Dispensing pharmacist
Dispensed date/time
```

---

### 9. Billing and Payments

Billing staff can:

```txt
View patients waiting for billing
Capture charged amount
Capture amount paid
Select payment method
Add payment reference
Add billing note
Send patient to dispensary
Complete visit
Cancel visit
```

Payment methods:

```txt
cash
mobile_money
bank_transfer
insurance
other
```

---

### 10. Billing Receipt / Invoice

After payment is recorded, the system can generate a printable receipt.

Receipt includes:

```txt
Receipt number
Hospital name
Patient name
Phone number
Visit number
Department
Charged amount
Amount paid
Balance
Payment method
Reference
Collected by
Payment date
Billing note
```

On web, the receipt can be printed using the browser print dialog.

---

### 11. Payments and Income Reports

Admin and billing staff can view:

```txt
Daily income
Total charged
Total paid
Outstanding balance
Payment method breakdown
Collections by billing staff
```

This supports financial accountability and end-of-day reporting.

---

### 12. Visit Summary / Discharge Note

When a doctor completes a visit, they can record:

```txt
Diagnosis
Treatment given
Advice / follow-up
Discharge status
Summary note
```

Discharge statuses:

```txt
improved
stable
referred
admitted
discharged
other
```

The discharge summary is stored on the visit and displayed in patient history.

---

### 13. Patient History

Patient history shows the full clinical trail for each visit:

```txt
Visit number
Status
Department
Registration date
Vitals
Laboratory results
Prescriptions
Dispensed medicines
Billing/payment information where applicable
Visit summary / discharge note
```

This makes the patient record useful for doctors, reception, pharmacists, and administrators.

---

### 14. Attendance Module

Staff can check in and check out.

Administrators can review attendance activity for operational oversight.

---

### 15. Admin Overview

Admin users can review operational and financial summaries, including:

```txt
Patient flow
Department queues
Income summary
Payment method totals
Staff collections
System activity
```

---

## Technology Stack

### Backend

```txt
Node.js
Express.js
MongoDB
Mongoose
JWT authentication
Role-based authorization
```

### Mobile / Web Frontend

```txt
React Native
Expo
Expo Router
TypeScript
React Native Web
```

The frontend can run as a mobile app through Expo Go and as a web app in the browser.

---

## Project Structure

```txt
medtrack/
├── backend-stphilips/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   └── package.json
│
├── medtrack-stphilips/
│   ├── app/
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── context/
│   │   ├── services/
│   │   └── config/
│   └── package.json
│
├── README.md
└── DEMO_SCRIPT.md
```

Important:

```txt
Use medtrack-stphilips for the current St. Philips app.
Do not run the old medtrack-mobile folder for this demo.
```

---

## Local Setup

### 1. Backend

Go to backend folder:

```bash
cd backend-stphilips
```

Install dependencies:

```bash
npm install
```

Create or confirm `.env` contains the required local settings, for example:

```env
PORT=5001
MONGO_URI=your_local_or_cloud_mongodb_uri
JWT_SECRET=your_jwt_secret
```

Start backend:

```bash
npm start
```

Expected:

```bash
MongoDB Connected
Server running on port 5001
```

---

### 2. Mobile / Web App

Open a separate terminal.

Go to mobile folder:

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

For browser demo:

```bash
w
```

Then open:

```txt
http://localhost:8081
```

For mobile demo:

```txt
Scan the QR code using Expo Go on Android.
```

---

## Demo Accounts

Use the seeded demo accounts configured in your local environment.

Standard demo roles:

```txt
Admin
Reception
Doctor
Laboratory
Billing
Pharmacist
```

For a local demo, typical credentials may be:

```txt
admin.stphilips@example.com / Admin123
reception.stphilips@example.com / Reception123
doctor.stphilips@example.com / Doctor123
lab.stphilips@example.com / Lab123
billing.stphilips@example.com / Billing123
pharmacist.stphilips@example.com / Pharmacist123
```

Security note:

```txt
These credentials are for demo/local use only.
Change all default passwords before any real deployment.
Never commit .env files or real secrets to Git.
```

---

## Main Hospital Workflow

```txt
Reception registers patient
        ↓
Patient waits for consultation
        ↓
Doctor starts consultation
        ↓
Doctor records vitals
        ↓
Doctor sends patient to laboratory if needed
        ↓
Laboratory records test results
        ↓
Doctor interprets results
        ↓
Doctor prescribes medication if needed
        ↓
Patient goes to billing
        ↓
Billing records payment and generates receipt
        ↓
Patient goes to dispensary
        ↓
Pharmacist dispenses prescribed medication
        ↓
Visit is completed
        ↓
Full record appears in patient history
```

---

## Key Demo Talking Points

### Patient Safety

The system captures Next of Kin emergency contact details and displays them prominently on clinical screens.

Example:

```txt
🚨 Next of Kin: John Doe (0788002002)
```

---

### Clinical Completeness

The system stores:

```txt
Vitals
Lab results
Prescriptions
Dispensed medicines
Diagnosis
Treatment
Advice
Discharge status
```

This creates a meaningful patient history rather than only a department queue.

---

### Financial Accountability

Billing captures:

```txt
Charged amount
Amount paid
Balance
Payment method
Reference
Collected by
```

Admin can review income and collections by staff.

---

### Pharmacy Control

Pharmacists dispense against doctor prescriptions.

This connects:

```txt
Doctor prescription
        ↓
Pharmacy inventory
        ↓
Dispensed record
        ↓
Patient history
```

---

## Troubleshooting

### 1. App runs from the wrong folder

If you see paths like:

```txt
medtrack-mobile/node_modules
```

stop Expo and run from:

```txt
medtrack-stphilips
```

Correct command:

```bash
cd /d/projects/medtrack/medtrack-stphilips
npx expo start -c
```

---

### 2. Browser shows old UI

Hard refresh:

```bash
Ctrl + Shift + R
```

Restart Expo with cache clear:

```bash
npx expo start -c
```

---

### 3. JSX text appears literally

If the screen shows:

```txt
{patient.nextOfKinName || "—"}
```

as plain text, the JSX expression was accidentally placed inside quotes.

Correct:

```tsx
<Text>
  Next of Kin: {patient.nextOfKinName || "—"}
</Text>
```

Wrong:

```tsx
<Text>
  {"Next of Kin: {patient.nextOfKinName || '—'}"}
</Text>
```

---

### 4. Receipt route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/receipt.tsx
```

It should contain only:

```tsx
import ReceiptScreen from "../src/screens/ReceiptScreen";

export default ReceiptScreen;
```

---

### 5. ObjectId cast failed for value "summary"

Ensure backend payment routes define:

```js
router.get("/summary", ...)
```

before:

```js
router.get("/:id", ...)
```

---

### 6. Prescription cannot dispense because drug not matched

The pharmacist screen matches prescribed drug names to inventory drug names.

Use the exact drug name from inventory, for example:

```txt
Paracetamol
Amoxicillin Capsules
Metronidazole Tablets
```

If the prescription says:

```txt
Paracetamol 500mg
```

but inventory only has:

```txt
Panadol
```

the system may not match them automatically.

For demo reliability, prescribe using the exact inventory drug name shown on the pharmacist screen.

---

## Current MVP Status

This repository currently supports a strong demo-ready hospital workflow:

```txt
✅ Patient registration
✅ Tribe and Next of Kin capture
✅ Patient search
✅ Edit patient
✅ Consultation queue
✅ Vitals capture
✅ Laboratory queue
✅ Lab results entry
✅ Interpretation queue
✅ Doctor review of lab results
✅ Doctor prescription capture
✅ Pharmacist dispensing against prescription
✅ Inventory stock reduction
✅ Billing queue
✅ Payment capture
✅ Billing receipt / invoice
✅ Payments and income report
✅ Collections by billing staff
✅ Visit summary / discharge note
✅ Patient history with full clinical trail
✅ Attendance
✅ Admin overview
✅ Role-based protection
```

---

## Disclaimer

This is an MVP/demo system for hospital workflow demonstration.

Before real clinical deployment, additional work is required, including:

```txt
Production-grade authentication
Audit logging review
Data encryption
Role permission review
Backup and recovery
Real data protection compliance review
Drug inventory master data validation
Clinical safety review by licensed professionals
Penetration testing
Hosting and uptime monitoring
```