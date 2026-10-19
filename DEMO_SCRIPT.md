# MedTrack St. Philips Demo Script

This script demonstrates the complete hospital workflow for St. Philips Hospital.

Estimated demo time:

```txt
12–20 minutes
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

Important:

```txt
Use the exact inventory drug name when prescribing.
```

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
Reception can correct patient details later without deleting the patient or creating duplicates. Doctors, laboratory staff, and pharmacists can also correct patient details when they find errors.
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

# Demo Part 4 — Emergency Procedure / Treatment Room

This demonstrates the hospital feedback that a doctor may send a patient to treatment before laboratory testing.

With Grace now in:

```txt
in consultation
```

Tap:

```txt
Send to Procedure Room
```

Enter note:

```txt
Patient needs emergency wound dressing before lab.
```

Confirm.

Expected:

```txt
Send to Procedure Room completed.
```

Now logout or switch role.

Login as staff if available:

```txt
Email:
staff.stphilips@example.com

Password:
Staff123
```

If a staff account is not available, use admin:

```txt
Email:
admin.stphilips@example.com

Password:
Admin123
```

Open:

```txt
Procedure Room
```

Find:

```txt
Grace Achieng
```

Tap:

```txt
Start / Record Procedure
```

Enter:

```txt
Procedure Name: Wound dressing
Treatment Given: Tetanus toxoid given
Emergency: Yes
Outcome: Stable
Procedure Notes: Patient arrived with bleeding hand wound. Dressing done.
```

Tap:

```txt
Confirm Start / Record Procedure
```

Expected:

```txt
procedure in progress
```

Then tap:

```txt
Send to Laboratory
```

Enter note:

```txt
Wound stabilized. Send for lab tests.
```

Confirm.

Talking point:

```txt
The system supports emergency treatment before laboratory testing. The treatment room records the procedure, treatment given, emergency status, outcome, and notes. The patient is not sent directly to dispensary, so billing is not skipped.
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

# Demo Part 6 — Doctor Interprets Lab Results and Adds Prescription

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

# Demo Part 7 — Billing Sees Prescription and Records Payment

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

Expected:

You should see:

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

Talking point:

```txt
Billing sees what the doctor prescribed, records the payment, and only then sends the patient to dispensary. Billing cannot edit the prescription, which preserves clinical responsibility.
```

---

# Demo Part 8 — Pharmacist Dispenses Prescription

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

Expected:

```txt
Dispensed 10 × Paracetamol ...
```

or:

```txt
All pending prescriptions dispensed and visit completed.
```

Talking point:

```txt
The pharmacist dispenses against the doctor prescription, not from a free-text drug selection. Stock is reduced and the dispensed record is attached to the visit.
```

---

# Demo Part 9 — Print Medical Form During Checkout

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

# Demo Part 11 — Doctor Forgot Prescription Recovery Flow

This is a very important demo moment because it shows the system can handle real human mistakes without breaking workflow.

Register or use another patient.

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

Start consultation for the patient.

Tap:

```txt
Send to Billing
```

Do not add prescription.

Confirm.

Now logout and login as billing:

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
If the doctor forgets a prescription, the patient is not sent backward through the hospital. The doctor corrects the prescription remotely while the patient remains in billing. This preserves workflow discipline and patient safety.
```

---

# Demo Part 12 — Visit Summary / Discharge Note

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

# Demo Part 13 — Admin Income and Operations

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

# Demo Part 14 — Attendance

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
3. Doctor sends patient to Laboratory.
4. Lab records Malaria Parasite: Positive.
5. Doctor opens Interpretation.
6. Doctor adds prescription and sends to Billing.
7. Billing sees prescription, records payment, sends to Dispensary.
8. Pharmacist dispenses prescription.
9. Pharmacist prints medical form.
10. Open Patient History and show full trail.
```

This still demonstrates the complete hospital workflow.

---

# Ultra-Short 3-Minute Demo

If extremely short, do only this:

```txt
1. Register patient.
2. Doctor starts consultation.
3. Doctor sends to laboratory.
4. Lab records positive malaria result.
5. Doctor interprets, adds prescription, sends to billing.
6. Billing records payment and sends to dispensary.
7. Pharmacist dispenses and prints medical form.
8. Show patient history.
```

---

# Closing Demo Statement

End with this summary:

```txt
MedTrack St. Philips demonstrates a complete hospital workflow from patient arrival to discharge and revenue capture.

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
6. If medical form popup is blocked, allow popups for localhost:8081.
7. If doctor forgets prescription, demonstrate Edit Prescription from Patient History.
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
✅ At least one completed patient history is available as fallback
✅ README.md is updated
✅ DEMO_SCRIPT.md is updated
✅ Git push is successful
```