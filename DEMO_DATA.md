# MedTrack St. Philips Demo Data Preparation

This file contains the exact demo data and workflow steps for the St. Philips Hospital presentation.

Use this file during rehearsal and live demo.

---

## 1. Start Backend

Open Terminal 1:

```bash
cd /d/projects/medtrack/backend-stphilips
npm start
```

Expected:

```bash
MongoDB Connected
Server running on port 5001
```

Keep this terminal open.

---

## 2. Start Mobile/Web App

Open Terminal 2:

```bash
cd /d/projects/medtrack/medtrack-stphilips
npx expo start -c
```

Then press:

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

Important:

```txt
Do not run from medtrack-mobile.
Always run from medtrack-stphilips.
```

---

## 3. Confirm Inventory Drug Name

Before prescribing, login as pharmacist or admin and open:

```txt
Dispense
```

Scroll to:

```txt
Available Drugs Reference
```

Find an exact drug name, for example:

```txt
Paracetamol
```

Use that exact name in all prescription fields.

If your inventory does not have Paracetamol, replace every example below with the exact drug name from your inventory.

---

## 4. Demo Accounts

Use these accounts:

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

# Patient 1 — Simple No-Laboratory Case

Purpose:

```txt
Show patient can go:
Consultation → Billing → Dispensary → Print Medical Form
```

This proves the doctor can send patient to billing without laboratory.

---

## Patient 1 Registration

Login as reception:

```txt
reception.stphilips@example.com
Reception123
```

Open:

```txt
Add Patient
```

Copy/paste:

```txt
Full Name: Sarah Noor
Age: 34
Gender: Female
Phone: 0788001001
Address: Gulu Town
Tribe: Lango
Next of Kin Name: Peter Noor
Next of Kin Phone: 0788001002
Visit Note: Sore throat and mild fever
```

Optional vitals:

```txt
Systolic: 120
Diastolic: 78
Temperature: 37.6
Pulse: 84
Weight: 62
```

Tap:

```txt
Register Patient + Create Visit
```

Talking point:

```txt
Reception captures patient identity, tribe, and emergency next of kin. This information follows the patient through the hospital workflow.
```

---

## Patient 1 Doctor Consultation

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
Sarah Noor
```

Tap:

```txt
Start Consultation
```

Confirm.

Then tap:

```txt
Send to Billing
```

Copy/paste consultation note:

```txt
No laboratory needed. Treat symptomatically and send to billing.
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
The doctor can prescribe medication even when the patient does not need laboratory testing. The prescription moves with the patient to billing.
```

---

## Patient 1 Billing

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
Sarah Noor
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
Quantity: 10
Dispensed: No
```

Tap:

```txt
Send to Dispensary
```

Copy/paste payment details:

```txt
Charged Amount: 30000
Amount Paid: 30000
Payment Method: Cash
Reference: CASH-SARAH-001
Billing Note: Consultation and medication
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

Talking point:

```txt
Billing sees the doctor prescription, records payment, and only then sends the patient to dispensary. Billing cannot edit the prescription.
```

---

## Patient 1 Pharmacist Dispensing

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
Sarah Noor
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
Prescribed Quantity: 10
Remaining Quantity: 10
Matched inventory drug: Paracetamol
```

Tap the medicine.

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

Then tap:

```txt
🖨️ Print Medical Form
```

Expected:

```txt
ST. PHILIPS HOSPITAL
Medical Form / Visit Summary
```

Talking point:

```txt
The pharmacist dispenses against the doctor prescription. Stock is reduced, and the system can print the patient medical form during checkout.
```

---

# Patient 2 — Laboratory Case

Purpose:

```txt
Show normal hospital flow:
Consultation → Laboratory → Interpretation → Prescription → Billing → Dispensary → Medical Form
```

This is the main demo patient.

---

## Patient 2 Registration

Login as reception:

```txt
reception.stphilips@example.com
Reception123
```

Open:

```txt
Add Patient
```

Copy/paste:

```txt
Full Name: Grace Achieng
Age: 29
Gender: Female
Phone: 0788005001
Address: Gulu
Tribe: Acholi
Next of Kin Name: John Achieng
Next of Kin Phone: 0788005002
Visit Note: Fever, headache, and body pain
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
The patient is registered with emergency contact details. Next of kin is visible to clinical staff.
```

---

## Patient 2 Doctor Consultation

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

Tap:

```txt
Start Consultation
```

Confirm.

Then tap:

```txt
Send to Laboratory
```

Copy/paste note:

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

## Patient 2 Laboratory

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

Copy/paste note:

```txt
Sample received. Running malaria parasite test.
```

Confirm.

Then tap:

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
The laboratory records structured results, not just patient movement. Result status can be normal, abnormal, critical, or pending.
```

---

## Patient 2 Doctor Interpretation and Prescription

Logout.

Login as doctor:

```txt
doctor.stphilips@example.com
Doctor123
```

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

Copy/paste interpretation note:

```txt
Malaria positive. Start treatment and send to billing.
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

Optional second medicine:

```txt
Drug Name: Amoxicillin Capsules
Strength: 500mg
Quantity: 15
Dosage: 1 capsule
Frequency: Three times daily
Duration: 5 days
Instructions: Complete the full course
```

Only add second medicine if those exact drug names exist in inventory.

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
The doctor reviews the laboratory result first, then adds the prescription. This prescription moves with the patient to billing and dispensary.
```

---

## Patient 2 Billing

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
Dispensed: No
```

Tap:

```txt
Send to Dispensary
```

Copy/paste payment details:

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

Talking point:

```txt
Billing sees the prescribed medicines and records payment. The patient is then sent to dispensary.
```

---

## Patient 2 Pharmacist Dispensing

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

Tap the medicine.

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

Then tap:

```txt
🖨️ Print Medical Form
```

Expected:

```txt
ST. PHILIPS HOSPITAL
Medical Form / Visit Summary
```

Talking point:

```txt
The full clinical trail is printed for the patient: vitals, laboratory results, prescriptions, dispensed medicines, and signature lines.
```

---

# Patient 3 — Emergency Procedure Room Case

Purpose:

```txt
Show doctor can send patient to treatment room before laboratory.
```

This directly addresses the hospital feedback.

---

## Patient 3 Registration

Login as reception:

```txt
reception.stphilips@example.com
Reception123
```

Open:

```txt
Add Patient
```

Copy/paste:

```txt
Full Name: Daniel Okello
Age: 41
Gender: Male
Phone: 0788007001
Address: Gulu Town
Tribe: Acholi
Next of Kin Name: Mary Okello
Next of Kin Phone: 0788007002
Visit Note: Hand injury with bleeding
```

Optional vitals:

```txt
Systolic: 118
Diastolic: 76
Temperature: 36.9
Pulse: 92
Weight: 74
```

Tap:

```txt
Register Patient + Create Visit
```

Talking point:

```txt
Emergency patients can be registered quickly with next of kin details.
```

---

## Patient 3 Doctor Sends to Procedure Room

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
Daniel Okello
```

Tap:

```txt
Start Consultation
```

Confirm.

Then tap:

```txt
Send to Procedure Room
```

Copy/paste note:

```txt
Patient needs emergency wound dressing before laboratory.
```

Confirm.

Expected:

```txt
Send to Procedure Room completed.
```

Talking point:

```txt
The doctor can send the patient to the procedure/treatment room before laboratory testing. This supports emergency stabilization.
```

---

## Patient 3 Procedure Room Treatment

Logout.

Login as staff:

```txt
staff.stphilips@example.com
Staff123
```

If staff account does not work, use admin:

```txt
admin.stphilips@example.com
Admin123
```

Open:

```txt
Procedure Room
```

Find:

```txt
Daniel Okello
```

Tap:

```txt
Start / Record Procedure
```

Copy/paste:

```txt
Procedure Name: Wound dressing
Treatment Given: Tetanus toxoid given
Emergency: Yes
Outcome: Stable
Procedure Notes: Patient arrived with bleeding hand wound. Cleaning and dressing done.
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

Copy/paste note:

```txt
Wound stabilized. Send for lab tests.
```

Confirm.

Expected:

```txt
Send to Laboratory completed.
```

Talking point:

```txt
The treatment room records the procedure, treatment given, emergency status, outcome, and notes. The patient is then sent to laboratory or billing without skipping payment.
```

---

## Patient 3 Laboratory

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
Daniel Okello
```

Tap:

```txt
Start Lab Test
```

Note:

```txt
Sample received. Running CBC.
```

Confirm.

Then tap:

```txt
Send to Interpretation
```

Enter lab result:

```txt
Test Name: CBC - WBC
Result Value: 11.2
Result Status: Abnormal
Notes: Mild leukocytosis.
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

---

## Patient 3 Doctor Interpretation and Prescription

Logout.

Login as doctor:

```txt
doctor.stphilips@example.com
Doctor123
```

Open:

```txt
Interpretation
```

Find:

```txt
Daniel Okello
```

Expected:

```txt
CBC - WBC
Result: 11.2
Status: abnormal
```

Tap:

```txt
Send to Billing
```

Copy/paste note:

```txt
Wound infection risk. Continue antibiotics and analgesia. Send to billing.
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

Optional antibiotic if inventory has exact name:

```txt
Drug Name: Amoxicillin Capsules
Strength: 500mg
Quantity: 15
Dosage: 1 capsule
Frequency: Three times daily
Duration: 5 days
Instructions: Complete the full course
```

Tap:

```txt
Confirm Send to Billing
```

Expected:

```txt
Send to Billing completed.
```

---

## Patient 3 Billing and Dispensary

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
Daniel Okello
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
```

Tap:

```txt
Send to Dispensary
```

Copy/paste payment:

```txt
Charged Amount: 70000
Amount Paid: 70000
Payment Method: Cash
Reference: CASH-DANIEL-001
Billing Note: Wound dressing, lab, and medication
```

Confirm.

Then logout and login as pharmacist:

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
Daniel Okello
```

Tap:

```txt
Dispense All Remaining + Complete Visit
```

Then tap:

```txt
🖨️ Print Medical Form
```

Talking point:

```txt
Even emergency treatment cases end with proper billing, dispensing, and printable medical form.
```

---

# Patient 4 — Doctor Forgot Prescription Recovery Case

Purpose:

```txt
Show system handles real human mistakes without sending patient backward.
```

This is a very strong demo moment.

---

## Patient 4 Registration

Login as reception:

```txt
reception.stphilips@example.com
Reception123
```

Open:

```txt
Add Patient
```

Copy/paste:

```txt
Full Name: Moses Adongo
Age: 50
Gender: Male
Phone: 0788009001
Address: Gulu
Tribe: Luo
Next of Kin Name: Grace Adongo
Next of Kin Phone: 0788009002
Visit Note: Hypertension review
```

Optional vitals:

```txt
Systolic: 150
Diastolic: 95
Temperature: 36.7
Pulse: 88
Weight: 82
```

Tap:

```txt
Register Patient + Create Visit
```

---

## Patient 4 Doctor Sends to Billing Without Prescription

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
Moses Adongo
```

Tap:

```txt
Start Consultation
```

Confirm.

Tap:

```txt
Send to Billing
```

Copy/paste note:

```txt
Hypertension review. Send to billing.
```

Do not add prescription.

Tap:

```txt
Confirm Send to Billing
```

Expected:

```txt
Send to Billing completed.
```

---

## Patient 4 Billing Cannot Send to Dispensary

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
Moses Adongo
```

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

Talking point:

```txt
The system prevents medication from being dispensed without a doctor prescription.
```

---

## Patient 4 Doctor Edits Prescription Remotely

Logout.

Login as doctor:

```txt
doctor.stphilips@example.com
Doctor123
```

Open:

```txt
Patients
```

Search:

```txt
Moses
```

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

Talking point:

```txt
The doctor corrects the prescription without sending the patient backward. The patient remains in billing.
```

---

## Patient 4 Billing Continues

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
Moses Adongo
```

Expected:

```txt
Prescribed Medicines
Paracetamol 500mg
```

Now record payment and send to dispensary:

```txt
Charged Amount: 40000
Amount Paid: 40000
Payment Method: Bank Transfer
Reference: BANK-MOSES-001
Billing Note: Hypertension review and medication
```

Tap:

```txt
Confirm Send to Dispensary
```

Then login as pharmacist and dispense.

---

# Recommended Final Demo Order

For the actual presentation, use this order:

```txt
1. Reception registers Grace Achieng.
2. Doctor starts consultation.
3. Doctor sends Grace to Laboratory.
4. Lab records Malaria Parasite: Positive.
5. Doctor opens Interpretation.
6. Doctor sees result and adds prescription.
7. Doctor sends to Billing.
8. Billing sees prescription, records payment, sends to Dispensary.
9. Pharmacist dispenses medicine.
10. Pharmacist prints Medical Form.
11. Open Patient History and show full trail.
```

Then, if time allows:

```txt
12. Show Procedure Room case with Daniel Okello.
13. Show Edit Prescription recovery case with Moses Adongo.
```

---

# Fallback Demo Data

Before the live demo, make sure at least one patient is fully completed.

Recommended fallback patient:

```txt
Grace Achieng
```

Confirm this patient has:

```txt
✅ Registration
✅ Consultation
✅ Laboratory result
✅ Interpretation
✅ Prescription
✅ Billing payment
✅ Dispensed medicine
✅ Completed visit
✅ Printable medical form
```

If live flow fails, open:

```txt
Patients → Grace Achieng → View Visit History
```

and present the completed record.

---

# Live Demo Talking Points

## Patient Safety

```txt
The system captures Next of Kin emergency contact details and displays them prominently on clinical screens.
```

## Emergency Treatment

```txt
The doctor can send a patient to the procedure/treatment room before laboratory testing.
```

## Laboratory Workflow

```txt
The laboratory records structured results with status flags such as normal, abnormal, or critical.
```

## Prescription Responsibility

```txt
Only doctors and administrators can create or edit prescriptions. Billing and pharmacy can view prescriptions but cannot change them.
```

## No Skipped Steps

```txt
The normal demo flow requires billing before dispensary. This prevents medication from being dispensed without payment clearance.
```

## Doctor Mistake Recovery

```txt
If the doctor forgets a prescription, the patient is not sent backward. The doctor edits the prescription remotely while the patient remains in billing.
```

## Printable Medical Form

```txt
The system prints a hospital medical form containing the patient's clinical summary, laboratory results, prescriptions, dispensed medicines, and signature lines.
```

---

# Troubleshooting During Demo

## 1. App shows old screen

Hard refresh:

```bash
Ctrl + Shift + R
```

Restart Expo:

```bash
npx expo start -c
```

---

## 2. Login fails

Check backend terminal shows:

```bash
Server running on port 5001
```

Then refresh browser and login again.

---

## 3. Procedure Room not in menu

Open directly:

```txt
http://localhost:8081/procedure
```

If direct URL works but menu does not, restart Expo and hard refresh.

---

## 4. Prescription drug not matched

Open pharmacist screen:

```txt
Dispense → Available Drugs Reference
```

Use the exact drug name shown there.

---

## 5. Cannot send to dispensary

This is expected if no prescription exists.

Fix:

```txt
Doctor → Patients → View Visit History → Edit Prescription
```

---

## 6. Medical form popup blocked

Allow popups for:

```txt
http://localhost:8081
```

In Chrome:

```txt
Click popup icon in address bar → Allow → Reload
```

---

## 7. Accidentally running old app

If terminal shows:

```txt
medtrack-mobile
```

stop it and run:

```bash
cd /d/projects/medtrack/medtrack-stphilips
npx expo start -c
```