# MedTrack St. Philips — Hospital Workflow & Billing Pilot MVP

MedTrack St. Philips is a hospital workflow and billing system MVP built for demo and pilot use.

It currently supports two major directions:

```txt
1. Hospital Workflow Mode
   Full patient journey:
   Reception → Consultation → Procedure/Treatment Room → Laboratory →
   Interpretation → Prescription → Billing → Dispensary → Medical Form →
   Patient History

2. Billing Pilot Mode
   Simpler billing and cashier control for:
   - small clinics
   - drug shops
   - walk-in customers
   - lab-only customers
   - consultation-only customers
```

The system is designed to help facilities reduce paper movement, improve patient tracking, control prescriptions, improve billing accountability, and produce printable records for patients/customers.

---

## Strategic Positioning

MedTrack is not positioned as a direct replacement for community health insurance platforms.

For example, Streamline Health is described publicly as:

```txt
A digital platform facilitating community-based health insurance.
It connects communities to trusted hospitals where they can access affordable health care.
It reports 75k+ active Stre@mline Ubuntu subscribers and 106+ hospital coverage in Uganda.
```

MedTrack focuses on a different layer:

```txt
What happens inside the facility.
```

MedTrack helps facilities manage:

```txt
- patient/customer registration
- service capture
- billing
- receipts
- partial payments
- outstanding balances
- cashier reconciliation
- prescription control
- pharmacy dispensing
- printable medical forms
- daily income visibility
```

A useful positioning statement is:

```txt
Streamline Health helps connect communities and insurance-covered patients to hospitals.
MedTrack helps the facility manage what happens inside: billing, receipts, balances, dispensing/sales, and daily cashier reconciliation.
```

Or:

```txt
MedTrack can complement platforms like Streamline Health by handling the facility-side operational and billing records.
```

---

# Core Modules

## 1. Authentication and User Management

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
Role-based API access
Role-based mobile/web route access
Protected workflows
```

---

## 2. Reception and Patient Registration

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

## 3. Patient Search and Edit

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

Allowed roles for patient editing:

```txt
admin
reception
doctor
lab
pharmacist
```

This allows clinical staff to correct patient details when they discover errors during their workflow.

The Edit Patient button is available from workflow screens such as:

```txt
Consultation
Laboratory
Interpretation
Dispensary
```

---

## 4. Consultation Module

Doctors can:

```txt
Start consultation
Record vitals
Send patient to procedure/treatment room
Send patient to laboratory
Send patient to billing with optional prescription
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

Prescription entry is available when the doctor sends the patient to billing. This supports patients who do not need laboratory testing.

Example normal no-lab workflow:

```txt
Consultation
        ↓
Send to Billing
        ↓
Doctor adds prescription if needed
        ↓
Billing records payment
        ↓
Billing sends to Dispensary
        ↓
Pharmacist dispenses
```

---

## 5. Procedure / Treatment Room Module

The system supports an emergency treatment/procedure workflow before laboratory testing or other departments.

Doctors can send a patient to:

```txt
Procedure / Treatment Room
```

Treatment room staff can record:

```txt
Procedure name
Treatment given
Emergency status
Outcome
Procedure notes
Performed by
Performed at
```

Example:

```txt
Procedure: Wound dressing
Treatment Given: Tetanus toxoid given
Emergency: Yes
Outcome: Stable
Notes: Patient arrived bleeding from hand injury. Dressing done before lab.
```

After treatment, the patient can be sent to:

```txt
Laboratory
Billing
Completed
Cancelled
```

For the normal demo workflow, the procedure room does not send patients directly to dispensary. This ensures billing is not skipped.

Access roles:

```txt
admin
doctor
staff
```

---

## 6. Laboratory Module

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

## 7. Result Interpretation Module

Doctors can review laboratory results and:

```txt
Read structured lab results
Add interpretation notes
Add prescription if medication is needed
Send patient to billing
Complete visit
Cancel visit
```

Critical results are highlighted for faster review.

This supports the normal hospital workflow where the doctor decides medication after seeing laboratory results.

Example lab workflow:

```txt
Consultation
        ↓
Laboratory
        ↓
Interpretation
        ↓
Doctor reviews result
        ↓
Doctor adds prescription
        ↓
Send to Billing
        ↓
Billing records payment
        ↓
Billing sends to Dispensary
        ↓
Pharmacist dispenses
```

---

## 8. Prescription Module

Doctors can prescribe one or more medicines from:

```txt
Consultation → Send to Billing
Interpretation → Send to Billing
Patient History → Edit Prescription
```

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
Paracetamol 500mg
Quantity: 10
Dosage: 1 tablet
Frequency: Three times daily
Duration: 3 days
Instructions: Take after food
```

The system prevents a patient from being sent to dispensary without at least one recorded prescription.

Expected safeguard error:

```txt
Cannot send patient to dispensary without a prescription. Record at least one prescribed medicine first.
```

---

## 9. Doctor Edit Prescription Workflow

If a doctor forgets to add a prescription during consultation or interpretation, the doctor can later edit the prescription from patient history while the patient remains in the current department.

This avoids sending the patient backward and avoids skipping workflow steps.

Allowed roles:

```txt
admin
doctor
```

The doctor can edit prescriptions only while the visit is active.

Prescription editing is blocked when:

```txt
Visit is completed
Visit is cancelled
Visit is marked no show
Pharmacist has already dispensed any medicine
```

This preserves clinical responsibility and pharmacy safety.

---

## 10. Hospital Billing Workflow

Billing staff can:

```txt
View patients waiting for billing
See prescribed medicines recorded by the doctor
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

Billing can view prescriptions but cannot edit them.

If no prescription exists, billing sees a warning:

```txt
No prescription recorded
The doctor must record a prescription before this patient can be sent to dispensary.
```

---

## 11. Billing Pilot Module — Billing Counter

The Billing Counter is a newer billing-first module designed for pilots with small clinics, drug shops, and walk-in customers.

It allows authorized users to create bills without requiring a full hospital visit.

Allowed roles:

```txt
admin
billing
reception
pharmacist
staff
```

Supported facility types:

```txt
clinic
drug_shop
hospital
walk_in
```

Features:

```txt
Search registered patient
Use walk-in customer name and phone
Add multiple bill items
Select item category:
   consultation
   laboratory
   procedure
   medicine
   service
   other
Enter quantity and unit price
Apply discount
Add bill note
Record initial payment
Support partial payment
Track balance
Void unpaid bills with reason
View today’s bills
Open existing bill
Record additional payment
Print bill receipt
```

Example drug shop walk-in sale:

```txt
Facility Type: Drug Shop
Customer: Walk-in Customer
Phone: 0788001111

Item:
Paracetamol
Category: Medicine
Quantity: 10
Unit Price: 200

Payment:
Cash
UGX 2,000
```

Example clinic partial payment:

```txt
Facility Type: Clinic
Item:
Consultation fee
Quantity: 1
Unit Price: 50,000

Initial Payment:
Mobile Money
UGX 20,000

Balance:
UGX 30,000
```

Important current limitation:

```txt
The Billing Counter records medicine/product charges, but it does not yet automatically reduce Drug/Inventory stock.
Inventory stock reduction is currently part of the hospital/pharmacy dispensing workflow.
Automatic drug shop stock deduction is a planned pilot enhancement.
```

---

## 12. Patient Ledger

The Patient Ledger shows all bills, payments, and outstanding balances for:

```txt
registered patients
walk-in customers from bills
```

Allowed roles:

```txt
admin
billing
reception
pharmacist
staff
```

It displays:

```txt
Patient/customer name
Phone
Age/gender/tribe/next of kin for registered patients
Total charged
Total paid
Outstanding balance
Number of bills
Bill list
Bill status
Bill items
Payment history
Latest payment
Reference
Collected by
Date
Void reason if applicable
```

This is useful for follow-up of patients/customers who owe money.

---

## 13. Daily Cashier Report

The Daily Cashier Report gives facility owners, managers, cashiers, and accountants a clear reconciliation view.

Allowed roles:

```txt
admin
billing
pharmacist
```

Supported ranges:

```txt
Today
Last 7 days
Last 30 days
All time
```

It displays:

```txt
Total charged
Total paid
Outstanding balance
Number of bills
Total collected
Number of payments
Average payment
Cash total
Mobile Money total
Bank Transfer total
Insurance total
Other total
Collections by staff
Outstanding bills count
```

This supports:

```txt
- daily income visibility
- cashier accountability
- mobile money reconciliation
- cash reconciliation
- outstanding balance follow-up
- reduced billing leakage
```

---

## 14. Printable Bill Receipt

The Billing Counter can generate a printable bill receipt.

Allowed roles:

```txt
admin
billing
reception
pharmacist
staff
```

The receipt includes:

```txt
Facility header
Bill number
Bill status
Date
Facility type
Customer name
Customer phone
Visit number if linked
Created by
Items
Category
Quantity
Unit price
Amount
Subtotal
Discount
Charged amount
Paid amount
Balance
Payments
Payment method
Reference
Collected by
Payment date
Bill note
Void reason if applicable
Thank-you footer
```

Status labels:

```txt
PAID
PARTIAL
UNPAID
VOID
REFUNDED
```

On web, the receipt can be printed or saved as PDF using the browser print dialog.

---

## 15. Pharmacist Dispensing Module

Pharmacists can:

```txt
View patients waiting in dispensary
View prescribed medicines
Match prescriptions to inventory drugs
Dispense selected prescription
Dispense all remaining prescriptions
Complete visit
Print medical form
```

The system reduces inventory stock when medication is dispensed in the hospital/pharmacy workflow.

Dispensing records include:

```txt
Drug name
Strength
Quantity dispensed
Prescribing doctor
Dispensing pharmacist
Dispensed date/time
```

Pharmacists dispense against doctor prescriptions. Pharmacists do not create or edit prescriptions.

---

## 16. Billing Receipt / Invoice for Hospital Visits

After hospital visit payment is recorded, the system can generate a printable receipt.

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

## 17. Printable Medical Form / Visit Summary

The system can generate a printable clinical medical form for the patient during checkout.

The medical form includes:

```txt
St. Philips Hospital header
Patient name
Phone number
Age
Gender
Address
Tribe
Next of Kin
Next of Kin phone
Visit number
Visit status
Department
Registration date
Started date
Completed date
Vitals
Procedures/treatments
Laboratory results
Prescriptions
Dispensed medicines
Diagnosis
Treatment given
Advice
Discharge status
Signature lines
```

Signature lines include:

```txt
Doctor
Treatment Officer
Pharmacist
Reception / Billing
Patient / Guardian
```

The medical form can be opened from:

```txt
Patient History
Dispensary
```

On web, the form can be printed or saved as PDF using the browser print dialog.

---

## 18. Payments and Income Reports

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

The newer Billing Pilot module also provides:

```txt
GET /api/bills/summary
```

for daily cashier reconciliation based on bills.

---

## 19. Visit Summary / Discharge Note

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

The discharge summary is stored on the visit and displayed in patient history and the printable medical form.

---

## 20. Patient History

Patient history shows the full clinical trail for each visit:

```txt
Visit number
Status
Department
Registration date
Vitals
Procedures/treatments
Laboratory results
Prescriptions
Dispensed medicines
Billing/payment information where applicable
Visit summary / discharge note
Print medical form button
Edit prescription button for active visits, doctor/admin only
```

This makes the patient record useful for doctors, reception, pharmacists, and administrators.

---

## 21. Attendance Module

Staff can check in and check out.

Administrators can review attendance activity for operational oversight.

---

## 22. Admin Overview

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

# Backend Billing Pilot API

The new Bill module exposes these endpoints:

```txt
POST   /api/bills
GET    /api/bills
GET    /api/bills/summary
GET    /api/bills/patient/:patientId
GET    /api/bills/:id
POST   /api/bills/:id/payments
POST   /api/bills/:id/void
```

## Bill Model

A bill can represent:

```txt
clinic bill
drug shop sale
hospital bill
walk-in sale
lab-only bill
consultation-only bill
```

Main fields:

```txt
billNumber
facilityType
visit
patient
customerName
customerPhone
status
items
subtotal
discount
chargedAmount
paidAmount
balance
payments
notes
voidReason
voidedBy
voidedAt
refundReason
refundedBy
refundedAt
createdBy
```

Bill statuses:

```txt
open
partial
paid
void
refunded
```

Bill item categories:

```txt
consultation
laboratory
procedure
medicine
service
other
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

# Technology Stack

## Backend

```txt
Node.js
Express.js
MongoDB
Mongoose
JWT authentication
Role-based authorization
```

## Mobile / Web Frontend

```txt
React Native
Expo
Expo Router
TypeScript
React Native Web
```

The frontend can run as a mobile app through Expo Go and as a web app in the browser.

---

# Project Structure

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
├── DEMO_SCRIPT.md
└── DEMO_DATA.md
```

Important:

```txt
Use medtrack-stphilips for the current St. Philips app.
Do not run the old medtrack-mobile folder for this demo.
```

---

# Local Setup

## 1. Backend

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

## 2. Mobile / Web App

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

# Demo Accounts

Use the seeded demo accounts configured in your local environment.

Standard demo roles:

```txt
Admin
Reception
Doctor
Laboratory
Billing
Pharmacist
Staff
```

For a local demo, typical credentials may be:

```txt
admin.stphilips@example.com / Admin123
reception.stphilips@example.com / Reception123
doctor.stphilips@example.com / Doctor123
lab.stphilips@example.com / Lab123
billing.stphilips@example.com / Billing123
pharmacist.stphilips@example.com / Pharmacist123
staff.stphilips@example.com / Staff123
```

Security note:

```txt
These credentials are for demo/local use only.
Change all default passwords before any real deployment.
Never commit .env files or real secrets to Git.
```

---

# Main Workflows

## A. Full Hospital Workflow with Laboratory

```txt
Reception registers patient
        ↓
Doctor starts consultation
        ↓
Doctor sends patient to laboratory
        ↓
Laboratory records test results
        ↓
Laboratory sends patient to interpretation
        ↓
Doctor reviews lab results
        ↓
Doctor adds prescription if needed
        ↓
Doctor sends patient to billing
        ↓
Billing sees prescription and records payment
        ↓
Billing sends patient to dispensary
        ↓
Pharmacist dispenses prescribed medication
        ↓
System prints medical form
        ↓
Visit is completed
        ↓
Full record appears in patient history
```

---

## B. Full Hospital Workflow without Laboratory

```txt
Reception registers patient
        ↓
Doctor starts consultation
        ↓
Doctor sends patient to billing
        ↓
Doctor adds prescription if needed
        ↓
Billing records payment
        ↓
Billing sends patient to dispensary
        ↓
Pharmacist dispenses medication
        ↓
System prints medical form
        ↓
Visit is completed
```

---

## C. Emergency Treatment Workflow

```txt
Reception registers patient
        ↓
Doctor starts consultation
        ↓
Doctor sends patient to procedure/treatment room
        ↓
Treatment officer records emergency procedure/treatment
        ↓
Patient is sent to laboratory or billing
        ↓
Doctor later reviews results and adds prescription if needed
        ↓
Billing records payment
        ↓
Dispensary dispenses medication
        ↓
Medical form is printed
```

---

## D. Doctor Forgot Prescription Workflow

```txt
Doctor sends patient to billing without prescription
        ↓
Billing sees warning: no prescription recorded
        ↓
Billing cannot send patient to dispensary
        ↓
Doctor opens patient history
        ↓
Doctor taps Edit Prescription
        ↓
Doctor adds prescription
        ↓
Patient remains in billing, not moved backward
        ↓
Billing can now send patient to dispensary
        ↓
Pharmacist dispenses medication
```

---

## E. Billing Pilot — Drug Shop Walk-in Sale

```txt
Open Billing Counter
        ↓
Select Drug Shop facility type
        ↓
Enter walk-in customer name/phone or leave default
        ↓
Add medicine/product item
        ↓
Enter quantity and unit price
        ↓
Record cash or mobile money payment
        ↓
Create bill
        ↓
Print bill receipt
        ↓
Bill appears in Today’s Bills
        ↓
Customer appears in Patient Ledger
        ↓
Sale appears in Daily Cashier Report
```

---

## F. Billing Pilot — Clinic Partial Payment

```txt
Open Billing Counter
        ↓
Select Clinic facility type
        ↓
Search patient or use walk-in customer
        ↓
Add consultation fee item
        ↓
Record partial initial payment
        ↓
Create bill
        ↓
Bill status becomes partial
        ↓
Balance is tracked
        ↓
Later open bill from Today’s Bills
        ↓
Record remaining payment
        ↓
Bill status becomes paid
        ↓
Print receipt
```

---

# Role Responsibility Model

```txt
Reception
- registers patients
- searches patients
- edits patient demographics
- views patient history
- can access Billing Counter for pilot billing
- can view Patient Ledger
- does not prescribe medication
- does not access Daily Cashier unless later configured

Doctor
- consults patients
- records vitals
- sends patients to laboratory/procedure/billing/completion
- interprets lab results
- creates prescriptions
- edits active prescriptions before dispensing

Laboratory
- records lab results
- sends patient to interpretation/billing
- can correct patient demographics
- does not prescribe medication

Billing
- views prescribed medicines
- records hospital visit payments
- prints receipts
- sends patient to dispensary after payment
- cannot edit prescriptions
- can access Billing Counter
- can view Patient Ledger
- can access Daily Cashier

Pharmacist
- views prescribed medicines
- dispenses prescribed medicines
- reduces inventory in hospital dispensing workflow
- prints medical form
- can correct patient demographics
- can access Billing Counter for pilot billing
- can view Patient Ledger
- can access Daily Cashier
- cannot create or edit prescriptions

Staff / Treatment Room
- records procedures/treatments
- sends patient to laboratory/billing/completion
- can access Billing Counter for pilot billing
- can view Patient Ledger
- does not prescribe medication
- does not access Daily Cashier unless later configured

Admin
- full operational oversight
- can act across modules for demo/support
- can access Billing Counter
- can view Patient Ledger
- can access Daily Cashier
```

---

# Key Demo Talking Points

## Patient Safety

The system captures Next of Kin emergency contact details and displays them prominently on clinical screens.

Example:

```txt
🚨 Next of Kin: John Doe (0788002002)
```

---

## Emergency Treatment Support

The doctor can send a patient to the procedure/treatment room before laboratory testing.

This supports cases such as:

```txt
bleeding wounds
dehydration
difficulty breathing
emergency stabilization
injections
dressings
nebulization
catheterization
```

---

## Clinical Completeness

The system stores:

```txt
Vitals
Procedures/treatments
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

## Prescription Flexibility Without Skipping Steps

Prescriptions can be added:

```txt
During consultation when sending to billing
During interpretation after lab results
Later by doctor from patient history if forgotten
```

But dispensary still requires:

```txt
Billing clearance
Valid prescription
Pharmacist dispensing
```

This preserves hospital workflow discipline.

---

## Billing Control

The new Billing Counter helps facilities answer:

```txt
What was charged?
What was paid?
What balance remains?
Who collected the payment?
By what method?
What is the reference?
Can we print a receipt?
Can we reconcile the cashier daily?
```

This is especially valuable for small clinics, pharmacies, and drug shops.

---

## Financial Accountability

Hospital visit billing captures:

```txt
Charged amount
Amount paid
Balance
Payment method
Reference
Collected by
```

The Billing Pilot module additionally captures:

```txt
Bill number
Bill items
Discount
Partial payments
Multiple payments per bill
Walk-in customer details
Void reason
Collections by staff
Daily cashier summary
```

---

## Pharmacy Control

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

The system prevents dispensary routing without a recorded prescription.

---

## Printable Medical Form

During checkout, the pharmacist, receptionist, doctor, or administrator can print a medical form containing the patient’s clinical summary.

This supports the hospital requirement of giving the patient a printed medical form.

---

## Printable Bill Receipt

The Billing Counter can print a customer receipt showing:

```txt
Items
Quantities
Prices
Total charged
Amount paid
Balance
Payment method
Reference
Cashier
Date
```

This is critical for drug shops and clinics.

---

# Troubleshooting

## 1. App runs from the wrong folder

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

## 2. Browser shows old UI

Hard refresh:

```bash
Ctrl + Shift + R
```

Restart Expo with cache clear:

```bash
rm -rf .expo
rm -rf node_modules/.cache
npx expo start -c
```

---

## 3. JSX text appears literally

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

## 4. Receipt route not found

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

## 5. Medical form route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/medical-form.tsx
```

It should contain only:

```tsx
import MedicalFormScreen from "../src/screens/MedicalFormScreen";

export default MedicalFormScreen;
```

---

## 6. Prescription editor route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/prescription-editor.tsx
```

It should contain only:

```tsx
import PrescriptionEditorScreen from "../src/screens/PrescriptionEditorScreen";

export default PrescriptionEditorScreen;
```

---

## 7. Billing Counter route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/billing-counter.tsx
```

It should contain only:

```tsx
import BillingCounterScreen from "../src/screens/BillingCounterScreen";

export default BillingCounterScreen;
```

---

## 8. Patient Ledger route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/patient-ledger.tsx
```

It should contain only:

```tsx
import PatientLedgerScreen from "../src/screens/PatientLedgerScreen";

export default PatientLedgerScreen;
```

---

## 9. Daily Cashier route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/daily-cashier.tsx
```

It should contain only:

```tsx
import DailyCashierScreen from "../src/screens/DailyCashierScreen";

export default DailyCashierScreen;
```

---

## 10. Bill Receipt route not found

Ensure this file exists:

```txt
medtrack-stphilips/app/bill-receipt.tsx
```

It should contain only:

```tsx
import BillReceiptScreen from "../src/screens/BillReceiptScreen";

export default BillReceiptScreen;
```

---

## 11. Daily Cashier does not appear in menu

Check:

```bash
grep -n "Daily Cashier" app/_layout.tsx
grep -n "daily-cashier" app/_layout.tsx
grep -n "daily-cashier" src/config/routeGuards.ts
```

Expected:

```bash
label: "Daily Cashier",
route: "/daily-cashier",
"/daily-cashier": ["admin", "billing", "pharmacist"],
```

Then clear cache:

```bash
rm -rf .expo
rm -rf node_modules/.cache
npx expo start -c
```

Open browser in Incognito/Private mode and login as admin or billing.

---

## 12. ObjectId cast failed for value "summary"

Ensure backend payment routes define:

```js
router.get("/summary", ...)
```

before:

```js
router.get("/:id", ...)
```

The new billing routes already place `/summary` before `/:id`.

---

## 13. Prescription cannot dispense because drug not matched

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

## 14. Cannot send patient to dispensary without prescription

This is expected behavior.

The doctor must record at least one prescribed medicine before the patient can be sent to dispensary.

Expected error:

```txt
Cannot send patient to dispensary without a prescription. Record at least one prescribed medicine first.
```

Fix:

```txt
Doctor opens Patient History
        ↓
Tap Edit Prescription
        ↓
Add medicine
        ↓
Billing can now send patient to dispensary
```

---

## 15. Doctor cannot edit prescription

Possible reasons:

```txt
User is not doctor or admin
Visit is completed
Visit is cancelled
Visit is marked no show
Pharmacist has already dispensed medicine
```

This is intentional.

---

## 16. Medical form or bill receipt popup blocked

When printing, the browser may block the popup.

Allow popups for:

```txt
http://localhost:8081
```

In Chrome:

```txt
Click the popup icon in the address bar
→ Allow popups
→ Reload
```

---

# Current MVP Status

This repository currently supports a strong demo-ready hospital and billing pilot workflow:

```txt
✅ Patient registration
✅ Tribe and Next of Kin capture
✅ Patient search
✅ Edit patient
✅ Doctor, lab, and pharmacist patient editing
✅ Consultation queue
✅ Vitals capture
✅ Procedure / Treatment Room
✅ Emergency treatment recording
✅ Laboratory queue
✅ Lab results entry
✅ Interpretation queue
✅ Doctor review of lab results
✅ Doctor prescription capture from consultation
✅ Doctor prescription capture from interpretation
✅ Doctor edit prescription on active visits
✅ Prescription safeguard before dispensary
✅ Billing sees prescriptions
✅ Pharmacist dispensing against prescription
✅ Inventory stock reduction in hospital dispensing workflow
✅ Billing queue
✅ Hospital payment capture
✅ Hospital billing receipt / invoice
✅ Printable Medical Form / Visit Summary
✅ Payments and income report
✅ Collections by billing staff
✅ Visit summary / discharge note
✅ Patient history with full clinical trail
✅ Attendance
✅ Admin overview
✅ Role-based protection

Billing Pilot:
✅ Billing Counter
✅ Clinic bills
✅ Drug shop bills
✅ Walk-in customer bills
✅ Itemized bills
✅ Partial payments
✅ Multiple payments per bill
✅ Outstanding balance tracking
✅ Void unpaid bills with reason
✅ Patient Ledger for registered patients
✅ Patient Ledger for walk-in customers
✅ Daily Cashier Report
✅ Payment method breakdown
✅ Collections by staff
✅ Printable Bill Receipt
```

---

# Planned Pilot Enhancements

These are not fully implemented yet but are logical next steps:

```txt
1. Automatic stock reduction from Billing Counter medicine/product sales
2. Barcode scanning for drug shop sales
3. Customer