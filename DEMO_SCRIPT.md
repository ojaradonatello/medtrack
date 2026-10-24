# MedTrack St. Philips Demo Script — Hospital Workflow + Billing Pilot

This script demonstrates both:

```txt
1. The full hospital patient workflow
2. The new billing pilot workflow for clinics, drug shops, and walk-in customers
```

Estimated demo time:

```txt
15–25 minutes
```

Recommended demo environment:

```txt
Backend running locally on port 5001
Frontend running in browser on localhost:8081
One phone or emulator optional for mobile demonstration
```

---

# Before the Demo

Start backend:

```bash
cd /d/projects/medtrack/backend-stphilips
npm start
```

Expected:

```bash
MongoDB Connected
Server running on port 5001
```

Start frontend from the correct folder:

```bash
cd /d/projects/medtrack/medtrack-stphilips
npx expo start -c
```

Press:

```bash
w
```

Open browser:

```txt
http://localhost:8081
```

Hard refresh:

```bash
Ctrl + Shift + R
```

Better: open an Incognito/Private window and go to:

```txt
http://localhost:8081
```

Prepare one known inventory drug name, for example:

```txt
Paracetamol
```

or whatever exact drug name exists in your inventory.

Important:

```txt
Use the exact inventory drug name when prescribing.
```

---

# Demo Accounts

```txt
Admin
email: admin.stphilips@example.com
password: Admin123

Reception
email: reception.stphilips@example.com
password: Reception123

Doctor
email: doctor.stphilips@example.com
password: Doctor123

Laboratory
email: lab.stphilips@example.com
password: Lab123

Billing
email: billing.stphilips@example.com
password: Billing123

Pharmacist
email: pharmacist.stphilips@example.com
password: Pharmacist123

Staff / Treatment Room
email: staff.stphilips@example.com
password: Staff123
```

If staff account does not exist, use admin for Procedure Room demo.

---

# Part 1 — Hospital Registration

Login as reception:

```txt
reception.stphilips@example.com
Reception123
```

Open:

```txt
Add Patient
```

Register:

```txt
Full Name: Grace Achieng
Age: 29
Gender: Female
Phone: 0788005001
Address: Gulu
Tribe: Acholi
Next of Kin Name: John Achieng
Next of Kin Phone: 0788005002
Visit Note: Fever and headache
```

Optional vitals:

```txt
Systolic: 128
Diastolic: 82
Temperature: 38.1
Pulse: 96
Weight: 68
```

Tap:

```txt
Register Patient + Create Visit
```

Talking point:

```txt
Reception captures patient identity, contact details, tribe, and emergency next of kin. The next of kin phone number is important for emergencies and is visible to clinical staff.
```

---

# Part 2 — Doctor Consultation

Logout.

Login as doctor:

```txt
doctor.stphilips@example.com
Doctor123
```

Open:

```txt
Consultation
```

Find:

```txt
Grace Achieng
```

Expected status:

```txt
waiting consultation
```

Tap:

```txt
Start Consultation
```

Confirm.

Talking point:

```txt
The doctor acknowledges the patient and begins the consultation. The system tracks the visit status in real time.
```

---

# Part 3 — Send to Laboratory

With Grace now in:

```txt
in consultation
```

Tap:

```txt
Send to Laboratory
```

Enter note:

```txt
Fever and headache. Order malaria parasite test.
```

Confirm.

Expected:

```txt
Send to Laboratory completed.
```

Talking point:

```txt
The doctor routes the patient to laboratory with a clear clinical note.
```

---

# Part 4 — Laboratory Records Result

Logout.

Login as lab:

```txt
lab.stphilips@example.com
Lab123
```

Open:

```txt
Laboratory
```

Find:

```txt
Grace Achieng
```

Tap:

```txt
Start Lab Test
```

Note:

```txt
Sample received. Running malaria parasite test.
```

Confirm.

Now tap:

```txt
Send to Interpretation
```

Enter lab result:

```txt
Test Name: Malaria Parasite
Result Value: Positive
Result Status: Abnormal
Notes: RBC smear shows malaria parasites.
```

Laboratory note:

```txt
Results ready for doctor interpretation.
```

Tap:

```txt
Confirm Send to Interpretation
```

Expected:

```txt
Send to Interpretation completed.
```

Talking point:

```txt
The laboratory does not just move the patient. It records structured results with status flags such as normal, abnormal, or critical.
```

---

# Part 5 — Doctor Interprets and Adds Prescription

Logout.

Login as doctor again.

Open:

```txt
Interpretation
```

Find:

```txt
Grace Achieng
```

Expected:

```txt
Laboratory Results
Malaria Parasite
Result: Positive
Status: abnormal
```

Tap:

```txt
Send to Billing
```

You should now see:

```txt
Prescription
```

Add prescription:

```txt
Drug Name: Paracetamol
Strength: 500mg
Quantity: 10
Dosage: 1 tablet
Frequency: Three times daily
Duration: 3 days
Instructions: Take after food
```

Important:

```txt
Use the exact drug name available in inventory.
```

Interpretation note:

```txt
Malaria positive. Start treatment and send to billing.
```

Tap:

```txt
Confirm Send to Billing
```

Expected:

```txt
Send to Billing completed.
```

Talking point:

```txt
The doctor reviews the actual lab result before continuing the patient journey. The prescription is created after interpretation and moves with the patient to billing and then dispensary.
```

---

# Part 6 — Billing Sees Prescription and Records Payment

Logout.

Login as billing:

```txt
billing.stphilips@example.com
Billing123
```

Open:

```txt
Billing
```

Find:

```txt
Grace Achieng
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
Quantity: 10
Dosage: 1 tablet
Frequency: Three times daily
Duration: 3 days
Instructions: Take after food
Dispensed: No
```

Tap:

```txt
Send to Dispensary
```

Enter payment details:

```txt
Charged Amount: 50000
Amount Paid: 50000
Payment Method: Mobile Money
Reference: MOMO-GRACE-001
Billing Note: Malaria treatment package
```

Tap:

```txt
Confirm Send to Dispensary
```

Expected:

```txt
Payment recorded
```

Receipt may open automatically.

Show receipt fields:

```txt
Receipt No.
Patient Name
Visit Number
Charged Amount
Amount Paid
Balance
Payment Method
Collected By
```

Talking point:

```txt
Billing sees what the doctor prescribed, records the payment, and only then sends the patient to dispensary. Billing cannot edit the prescription, which preserves clinical responsibility.
```

---

# Part 7 — Pharmacist Dispenses Prescription

Logout.

Login as pharmacist:

```txt
pharmacist.stphilips@example.com
Pharmacist123
```

Open:

```txt
Dispense
```

Select:

```txt
Grace Achieng
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
Prescribed Quantity: 10
Remaining Quantity: 10
Matched inventory drug: Paracetamol
```

Tap the prescription.

Quantity should auto-fill:

```txt
10
```

Tap:

```txt
Dispense All Remaining + Complete Visit
```

Expected:

```txt
All pending prescriptions dispensed and visit completed.
```

Talking point:

```txt
The pharmacist dispenses against the doctor prescription, not from a free-text drug selection. Stock is reduced and the dispensed record is attached to the visit.
```

---

# Part 8 — Print Medical Form

Still as pharmacist, after selecting the patient, tap:

```txt
🖨️ Print Medical Form
```

Expected:

A new browser tab/window opens with:

```txt
ST. PHILIPS HOSPITAL
Medical Form / Visit Summary
```

The form should include:

```txt
Patient information
Next of Kin
Visit information
Vitals
Procedures/treatments
Laboratory results
Prescriptions
Dispensed medicines
Diagnosis/discharge summary
Signature lines
```

Click:

```txt
Print
```

or:

```txt
Save as PDF
```

Talking point:

```txt
During checkout, the hospital can print a medical form for the patient. This gives the patient a physical clinical summary and supports record keeping.
```

If popup is blocked:

```txt
Allow popups for localhost:8081
```

---

# Part 9 — Patient History Shows Full Trail

Login as doctor, reception, or admin.

Open:

```txt
Patients
```

Search:

```txt
Grace
```

Tap:

```txt
View Visit History
```

Expected sections:

```txt
Patient details
Tribe
Next of Kin
Visit number
Status
Vitals
Procedures / Treatments
Laboratory Results
Prescriptions
Dispensed status
Visit Summary / Discharge Note if completed
Print Medical Form button
```

Talking point:

```txt
The patient history is not just a list of visits. It contains the clinical and operational trail: vitals, procedures, lab results, prescriptions, dispensing, billing, and discharge summary.
```

---

# Part 10 — Billing Pilot: Drug Shop Walk-in Sale

Now switch from hospital workflow to the billing pilot.

Login as billing, pharmacist, reception, staff, or admin.

Recommended:

```txt
billing.stphilips@example.com
Billing123
```

Open:

```txt
Billing Counter
```

Set:

```txt
Facility Type: Drug Shop
```

Use walk-in customer:

```txt
Walk-in Customer Name: Test Customer
Walk-in Customer Phone: 0788001111
```

Add item:

```txt
Description: Paracetamol
Category: Medicine
Quantity: 10
Unit Price: 200
```

Initial payment:

```txt
Amount Paying Now: 2000
Method: Cash
Reference: CASH-DRUGSHOP-001
```

Tap:

```txt
Create Bill
```

Expected:

```txt
Current Bill
Status: paid
Balance: UGX 0
```

Then tap:

```txt
🖨️ Print Bill Receipt
```

Expected:

A new browser tab/window opens with:

```txt
ST. PHILIPS HEALTH FACILITY
Bill Receipt
PAID
```

The receipt should show:

```txt
Bill number
Customer name
Phone
Items
Quantity
Unit price
Amount
Subtotal
Charged amount
Paid amount
Balance
Payment method
Reference
Created by
Date
```

Talking point:

```txt
For a drug shop or small clinic, the system can record a walk-in sale, accept cash or mobile money, track the balance, and print a customer receipt.
```

---

# Part 11 — Billing Pilot: Clinic Partial Payment

Still in:

```txt
Billing Counter
```

Tap:

```txt
Start New Bill
```

Set:

```txt
Facility Type: Clinic
```

Use walk-in customer:

```txt
Walk-in Customer Name: Partial Payer
Walk-in Customer Phone: 0788002222
```

Add item:

```txt
Description: Consultation fee
Category: Consultation
Quantity: 1
Unit Price: 50000
```

Initial payment:

```txt
Amount Paying Now: 20000
Method: Mobile Money
Reference: MOMO-PARTIAL-001
```

Tap:

```txt
Create Bill
```

Expected:

```txt
Status: partial
Balance: UGX 30,000
```

Then record remaining payment in Current Bill:

```txt
Amount: 30000
Method: Cash
Reference: CASH-PARTIAL-002
```

Tap:

```txt
Record Payment
```

Expected:

```txt
Status: paid
Balance: UGX 0
```

Talking point:

```txt
The system supports partial payments. This is important because patients/customers may not always pay the full amount immediately. The outstanding balance is tracked until cleared.
```

---

# Part 12 — Patient Ledger for Walk-in Customer

Open:

```txt
Patient Ledger
```

Search:

```txt
0788002222
```

or:

```txt
Partial Payer
```

Expected:

You should see a walk-in customer result.

Tap it.

Expected ledger summary:

```txt
Total Charged: UGX 50,000
Total Paid: UGX 50,000
Outstanding: UGX 0
Bills: 1
```

Under bills, you should see:

```txt
Bill number
Status: paid
Items: Consultation fee
Charged
Paid
Balance
Latest payment
Method
Reference
Collected by
Date
```

Talking point:

```txt
The Patient Ledger works for both registered patients and walk-in customers. This is useful for drug shops and clinics that do not want to force full patient registration for every sale.
```

---

# Part 13 — Daily Cashier Report

Open:

```txt
Daily Cashier
```

Login as:

```txt
admin
billing
pharmacist
```

Expected:

You should see:

```txt
Billing Summary — Today
Total Charged
Total Paid
Outstanding
Bills
```

Collections:

```txt
Total Collected
Payments Recorded
Average per Payment
```

Payment Methods:

```txt
Cash
Mobile Money
Bank Transfer
Insurance
Other
```

Collections by Staff:

```txt
Staff name
Number of payments
Amount collected
```

Talking point:

```txt
This is the reconciliation screen. It helps the owner or manager see what was charged, what was collected, which payment methods were used, and which staff collected the money. This directly addresses billing leakage.
```

---

# Part 14 — Doctor Forgot Prescription Recovery Flow

This is a strong demo moment because it shows the system can handle real human mistakes without breaking workflow.

Register or use another patient.

Login as doctor:

```txt
doctor.stphilips@example.com
Doctor123
```

Open:

```txt
Consultation
```

Start consultation for the patient.

Tap:

```txt
Send to Billing
```

Do not add prescription.

Confirm.

Now logout and login as billing:

```txt
billing.stphilips@example.com
Billing123
```

Open:

```txt
Billing
```

Find the patient.

Expected warning:

```txt
No prescription recorded
The doctor must record a prescription before this patient can be sent to dispensary.
```

Try:

```txt
Send to Dispensary
```

Expected backend block:

```txt
Cannot send patient to dispensary without a prescription. Record at least one prescribed medicine first.
```

Now logout and login as doctor again.

Open:

```txt
Patients
```

Search the patient.

Tap:

```txt
View Visit History
```

Tap:

```txt
✍️ Edit Prescription
```

Add:

```txt
Drug Name: Paracetamol
Strength: 500mg
Quantity: 10
Dosage: 1 tablet
Frequency: Three times daily
Duration: 3 days
Instructions: Take after food
```

Tap:

```txt
Save Prescription
```

Expected:

```txt
Prescription updated successfully.
```

Now logout and login as billing.

Open:

```txt
Billing
```

The patient should now show:

```txt
Prescribed Medicines
Paracetamol 500mg
```

Billing can now record payment and send to dispensary.

Talking point:

```txt
If the doctor forgets a prescription, the patient is not sent backward. The doctor corrects the prescription remotely while the patient remains in billing. This preserves workflow discipline and patient safety.
```

---

# Part 15 — Emergency Procedure Room Case

Use patient:

```txt
Daniel Okello
```

Flow:

```txt
Doctor consultation
        ↓
Send to Procedure Room
        ↓
Treatment officer records wound dressing
        ↓
Send to Laboratory or Billing
```

Talking point:

```txt
Some patients need emergency treatment before laboratory testing. The system supports that without losing the record.
```

Example procedure entry:

```txt
Procedure Name: Wound dressing
Treatment Given: Tetanus toxoid given
Emergency: Yes
Outcome: Stable
Procedure Notes: Patient arrived with bleeding hand wound. Cleaning and dressing done.
```

---

# Short 5-Minute Hospital Demo

If time is short, do only this:

```txt
1. Reception registers Grace Achieng.
2. Doctor starts consultation.
3. Doctor sends Grace to Laboratory.
4. Lab records Malaria Parasite: Positive.
5. Doctor opens Interpretation.
6. Doctor adds prescription and sends to Billing.
7. Billing sees prescription, records payment, sends to Dispensary.
8. Pharmacist dispenses medicine.
9. Pharmacist prints Medical Form.
10. Open Patient History and show full trail.
```

---

# Short 5-Minute Billing Pilot Demo

If meeting a drug shop or small clinic, do only this:

```txt
1. Open Billing Counter.
2. Select Drug Shop.
3. Create walk-in customer sale.
4. Add medicine item.
5. Record cash or mobile money payment.
6. Print Bill Receipt.
7. Open Patient Ledger and show customer balance.
8. Open Daily Cashier and show today’s collections by method and staff.
```

---

# Ultra-Short 3-Minute Demo

If extremely short, do only this:

```txt
1. Register patient.
2. Doctor sends to laboratory.
3. Lab records positive malaria result.
4. Doctor interprets, adds prescription, sends to billing.
5. Billing records payment and sends to dispensary.
6. Pharmacist dispenses and prints medical form.
7. Show patient history.
8. Show Daily Cashier report.
```

---

# Closing Demo Statement

End with this summary:

```txt
MedTrack St. Philips demonstrates a complete hospital workflow from patient arrival to discharge and revenue capture, plus a simpler billing pilot module for clinics, drug shops, and walk-in customers.

It supports:
- reception registration,
- doctor consultation,
- emergency procedure/treatment room,
- laboratory results,
- result interpretation,
- electronic prescriptions,
- doctor prescription correction,
- billing visibility of prescriptions,
- pharmacist dispensing,
- billing and receipts,
- printable medical forms,
- billing counter for clinic/drug-shop sales,
- partial payments,
- patient/customer ledger,
- daily cashier reconciliation,
- printable bill receipts,
- income reporting,
- attendance,
- and a full patient history.

The goal is to reduce paper movement, improve patient tracking, support emergency contact visibility, control billing and pharmacy workflows, and give hospital management clearer operational and financial insight.
```

---

# Positioning Against Streamline Health

If asked about Streamline Health, use this:

```txt
Streamline Health is focused on community-based health insurance and connecting communities to hospitals. It reports strong subscriber and hospital-network coverage.

MedTrack is focused on the facility side: what happens inside the clinic, hospital, pharmacy, or drug shop. It handles patient/service capture, billing, receipts, partial payments, outstanding balances, cashier reconciliation, prescription control, dispensing, and printable records.

So MedTrack is not trying to replace a community insurance platform. It can complement such platforms by managing the facility’s internal operations and billing records.
```

---

# Demo Backup Plan

If one role fails during live demo:

```txt
1. Refresh browser with Ctrl + Shift + R.
2. Confirm backend terminal still shows Server running on port 5001.
3. Confirm Expo is running from medtrack-stphilips, not medtrack-mobile.
4. Use a previously completed patient history screen to show the final result.
5. If prescription matching fails, use the exact drug name shown in Available Drugs Reference.
6. If medical form popup is blocked, allow popups for localhost:8081.
7. If bill receipt popup is blocked, allow popups for localhost:8081.
8. If doctor forgets prescription, demonstrate Edit Prescription from Patient History.
9. If Daily Cashier does not appear, logout/login as admin or billing and hard refresh.
```

---

# Demo Preparation Checklist

Before presenting, confirm:

```txt
✅ Backend starts successfully
✅ MongoDB connects
✅ Frontend starts from medtrack-stphilips
✅ Browser login works for all roles
✅ At least one inventory drug exists
✅ Drug name is known for prescription demo
✅ Procedure Room appears in menu
✅ Edit Patient button appears for doctor/lab/pharmacist
✅ Interpretation screen shows prescription when sending to billing
✅ Consultation screen shows prescription when sending to billing
✅ Billing screen shows prescribed medicines
✅ Dispensary is blocked without prescription
✅ Doctor can edit prescription from patient history
✅ Medical form prints from patient history
✅ Medical form prints from dispensary screen
✅ Billing Counter appears in Finance menu
✅ Patient Ledger appears in Finance menu
✅ Daily Cashier appears in Finance menu
✅ Bill Receipt prints from Billing Counter
✅ Walk-in customer appears in Patient Ledger
✅ Daily Cashier shows cash/mobile money totals
✅ At least one completed patient history is available as fallback
✅ README.md is updated
✅ DEMO_SCRIPT.md is updated
✅ Git push is successful
```