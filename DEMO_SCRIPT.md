# MedTrack St. Philips Demo Script

This script demonstrates the complete hospital workflow for St. Philips Hospital.

Estimated demo time:

```txt
12–18 minutes
```

Recommended demo environment:

```txt
Backend running locally on port 5001
Frontend running in browser on localhost:8081
One phone or emulator optional for mobile demonstration
```

---

## Before the Demo

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

Prepare one known inventory drug name, for example:

```txt
Paracetamol
```

or whatever exact drug name exists in your inventory.

---

# Demo Part 1 — Reception Registration

Login as reception:

```txt
Email:
reception.stphilips@example.com

Password:
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

# Demo Part 2 — Patient Search and Edit

Still as reception, open:

```txt
Patients
```

Search:

```txt
Grace
```

or:

```txt
0788005001
```

Expected:

```txt
Grace Achieng
Phone: 0788005001
Tribe: Acholi
Next of Kin: John Achieng
```

Tap:

```txt
✏️ Edit Patient
```

Change:

```txt
Address: Gulu Town
Next of Kin Phone: 0788005003
```

Tap:

```txt
Save Changes
```

Talking point:

```txt
Reception can correct patient details later without deleting the patient or creating duplicates.
```

---

# Demo Part 3 — Doctor Consultation

Logout.

Login as doctor:

```txt
Email:
doctor.stphilips@example.com

Password:
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

# Demo Part 4 — Send to Laboratory

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

Talking point:

```txt
The doctor routes the patient to laboratory with a clear clinical note.
```

---

# Demo Part 5 — Laboratory Records Results

Logout.

Login as lab:

```txt
Email:
lab.stphilips@example.com

Password:
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

Talking point:

```txt
The laboratory does not just move the patient. It records structured results with status flags such as normal, abnormal, or critical.
```

---

# Demo Part 6 — Doctor Interprets Lab Results

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

Enter interpretation note:

```txt
Malaria positive. Start treatment and send to billing.
```

Confirm.

Talking point:

```txt
The doctor reviews the actual lab result before continuing the patient journey. This keeps the clinical record meaningful.
```

---

# Demo Part 7 — Billing and Receipt

Logout.

Login as billing:

```txt
Email:
billing.stphilips@example.com

Password:
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

Tap:

```txt
Send to Dispensary
```

Enter payment details:

```txt
Charged Amount: 50000
Amount Paid: 50000
Payment Method: Cash
Reference: CASH-001
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

Then the system should open or allow access to:

```txt
Billing Receipt
```

Talking point:

```txt
Billing captures the charge, actual payment, method, reference, and staff accountability. The patient receives a professional receipt.
```

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

If printing is demonstrated, click:

```txt
🖨️ Print Receipt
```

---

# Demo Part 8 — Doctor Prescribes Medication

For a cleaner demo, you can either:

```txt
A. Use a second patient and prescribe directly from consultation, or
B. Continue with Grace after billing if your workflow allows dispensary entry.
```

Recommended demo approach:

Before billing, doctor can send to dispensary with prescription. If you want to show prescription separately, register a second patient quickly.

Login as doctor.

Open:

```txt
Consultation
```

Start consultation for a patient.

Tap:

```txt
Send to Dispensary
```

Enter prescription:

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

Tap:

```txt
Confirm Send to Dispensary
```

Talking point:

```txt
The doctor writes the prescription electronically. This becomes the instruction the pharmacist follows.
```

---

# Demo Part 9 — Pharmacist Dispenses Prescription

Logout.

Login as pharmacist:

```txt
Email:
pharmacist.stphilips@example.com

Password:
Pharmacist123
```

Open:

```txt
Dispense
```

Select the patient.

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
Dispense Selected Prescription
```

or:

```txt
Dispense All Remaining + Complete Visit
```

Talking point:

```txt
The pharmacist dispenses against the doctor prescription, not from a free-text drug selection. Stock is reduced and the dispensed record is attached to the visit.
```

---

# Demo Part 10 — Patient History Shows Full Trail

Login as doctor, reception, or admin.

Open:

```txt
Patients
```

Search:

```txt
Grace
```

or the patient used for prescription.

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
Laboratory Results
Prescriptions
Dispensed status
Visit Summary / Discharge Note if completed
```

Talking point:

```txt
The patient history is not just a list of visits. It contains the clinical and operational trail: vitals, lab results, prescriptions, dispensing, billing, and discharge summary.
```

---

# Demo Part 11 — Visit Summary / Discharge Note

If demonstrating a completed visit, doctor should complete a visit and enter:

```txt
Diagnosis: Malaria
Treatment Given: Antimalarial treatment and supportive care
Advice: Use insecticide-treated bed net. Return if fever worsens or vomiting starts.
Discharge Status: Improved
```

Then patient history should show:

```txt
Visit Summary / Discharge Note
Diagnosis: Malaria
Treatment Given: ...
Advice: ...
Discharge Status: improved
```

Talking point:

```txt
Closing a visit with a structured discharge note makes the record clinically useful for future visits.
```

---

# Demo Part 12 — Admin Income and Operations

Login as admin:

```txt
Email:
admin.stphilips@example.com

Password:
Admin123
```

Open:

```txt
Admin Overview
```

or:

```txt
Payments & Income
```

Show:

```txt
Total charged
Total paid
Outstanding balance
Payment method breakdown
Collections by billing staff
```

Talking point:

```txt
Management can see daily income and which billing staff collected which payments. This supports accountability and end-of-day reconciliation.
```

---

# Demo Part 13 — Attendance

Open:

```txt
Attendance
```

Demonstrate:

```txt
Check In
Check Out
```

Talking point:

```txt
Staff attendance is captured within the same system, giving administrators operational visibility alongside patient flow and revenue.
```

---

# Short 5-Minute Fallback Demo

If time is short, do only this:

```txt
1. Reception registers patient with Tribe and Next of Kin.
2. Doctor starts consultation.
3. Doctor sends to Laboratory.
4. Lab records Malaria Parasite: Positive.
5. Doctor interprets result and sends to Billing.
6. Billing records payment and shows receipt.
7. Doctor prescribes Paracetamol.
8. Pharmacist dispenses prescription.
9. Open Patient History and show full trail.
```

This still demonstrates the complete hospital workflow.

---

# Closing Demo Statement

End with this summary:

```txt
MedTrack St. Philips demonstrates a complete hospital workflow from patient arrival to discharge and revenue capture.

It supports:
- reception registration,
- doctor consultation,
- laboratory results,
- result interpretation,
- electronic prescriptions,
- pharmacist dispensing,
- billing and receipts,
- income reporting,
- attendance,
- and a full patient history.

The goal is to reduce paper movement, improve patient tracking, support emergency contact visibility, and give hospital management clearer operational and financial insight.
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
✅ At least one completed patient history is available as fallback
✅ README.md is updated
✅ DEMO_SCRIPT.md is updated
✅ Git push is successful
```