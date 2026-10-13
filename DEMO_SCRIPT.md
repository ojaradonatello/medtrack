# St. Philips MedTrack AI — Hospital Demo Script

## Demo Goal

Show that the system supports the full hospital patient, pharmacy, billing, attendance, and admin workflow:

```txt
Reception registration
        ↓
Doctor consultation
        ↓
Laboratory
        ↓
Interpretation
        ↓
Billing + payment capture
        ↓
Dispensary
        ↓
Visit completion
        ↓
Admin income and operations review
```

---

## Demo Environment

Backend:

```txt
http://localhost:5001
```

Mobile/Web app:

```txt
Expo dev server
```

Database:

```txt
Local MongoDB
Database: stphilips
```

---

## Test Accounts

Use these accounts during demo:

```txt
Admin
admin.stphilips@example.com / Admin123

Reception
reception.stphilips@example.com / Reception123

Doctor
doctor.stphilips@example.com / Doctor123

Lab
lab.stphilips@example.com / Lab123

Billing
billing.stphilips@example.com / Billing123

Pharmacist
pharmacist.stphilips@example.com / Pharmacist123
```

---

## Demo Flow

### 1. Reception registers patient

Login as:

```txt
reception.stphilips@example.com
```

Open:

```txt
Add Patient
```

Search a new phone number:

```txt
0788000777
```

Register:

```txt
Name: Demo Patient
Age: 35
Gender: Female
Phone: 0788000777
Address: Gulu
```

Capture vitals:

```txt
BP: 122/80
Temp: 36.8
Pulse: 76
Weight: 68
```

Create visit.

Expected:

```txt
Patient registered
Visit created
Patient appears in queue
```

---

### 2. Doctor starts consultation

Login as:

```txt
doctor.stphilips@example.com
```

Open:

```txt
Consultation
```

Select patient.

Expected vitals already visible:

```txt
BP: 122/80
Temp: 36.8 °C
Pulse: 76 bpm
Weight: 68 kg
```

Actions:

```txt
Start Consultation
Send to Laboratory
```

---

### 3. Laboratory processes patient

Login as:

```txt
lab.stphilips@example.com
```

Open:

```txt
Laboratory
```

Actions:

```txt
Start Lab Test
Send to Interpretation
```

---

### 4. Doctor interprets results

Login as:

```txt
doctor.stphilips@example.com
```

Open:

```txt
Interpretation
```

Action:

```txt
Send to Billing
```

Add note:

```txt
Results interpreted. Patient requires treatment.
```

---

### 5. Billing captures payment

Login as:

```txt
billing.stphilips@example.com
```

Open:

```txt
Billing
```

Select patient.

Tap:

```txt
Send to Dispensary
```

Fill payment details:

```txt
Charged Amount: 50000
Amount Paid: 50000
Payment Method: Cash
Reference: RECEIPT-001
Billing Note: Full payment received
```

Tap:

```txt
Confirm Send to Dispensary
```

Expected:

```txt
Payment recorded
Visit sent to dispensary
```

Optional second patient demo:

```txt
Charged Amount: 80000
Amount Paid: 30000
Payment Method: Mobile Money
Reference: MM-889900
Billing Note: Partial payment, balance 50000
```

Expected payment status:

```txt
partial
```

---

### 6. Pharmacist dispenses medication

Login as:

```txt
pharmacist.stphilips@example.com
```

Open:

```txt
Dispense
```

Select patient waiting in dispensary.

Select drug:

```txt
Paracetamol 500mg
```

Quantity:

```txt
10
```

Tap:

```txt
Dispense Only
```

Then optionally select another drug:

```txt
Amoxicillin 500mg
```

Quantity:

```txt
7
```

Tap:

```txt
Dispense Only
```

Finally tap:

```txt
Dispense + Complete Visit
```

using any drug and quantity, for example:

```txt
Quantity: 5
```

Expected:

```txt
Medication dispensed
Inventory stock reduced
Visit completed
Patient disappears from dispensary queue
```

---

### 7. Staff attendance demo

Login as any staff role, for example reception:

```txt
reception.stphilips@example.com
```

Open:

```txt
Attendance
```

Tap:

```txt
Check In
```

Expected:

```txt
Checked in successfully
```

Status becomes:

```txt
Present
```

or:

```txt
Late
```

Then tap:

```txt
Check Out
```

Expected:

```txt
Checked out successfully
```

---

### 8. Admin reviews system

Login as:

```txt
admin.stphilips@example.com
```

Open:

```txt
Admin Overview
```

Show:

```txt
Total Patients
Total Visits
Active Visits
Completed Today
Income Today
Total Income
Transactions Today
Total Payment Records
Average Payment Today
Payment Methods Today
Inventory Risk
Unresolved Alerts
Recent Activity Log
Recent Visits
```

Open:

```txt
Attendance
```

Show:

```txt
Team Attendance Today
Present
Late
Checked Out
Missing Staff
```

Open:

```txt
Inventory
```

Show stock reduction.

Open:

```txt
History
```

Show dispensing records.

Open:

```txt
Alerts
```

Show system alerts.

Open:

```txt
AI Alerts
```

Show anomaly detection.

Open:

```txt
User Management
```

Show ability to create/edit staff accounts and reset passwords.

---

## Key Selling Points

Tell the hospital:

```txt
1. Reception controls first contact and captures initial vitals.
2. Each department has a dedicated screen and sees only its own queue.
3. Patient movement is controlled by role.
4. Billing captures charged amount, actual amount paid, payment method, and reference.
5. Admin can monitor income flowing into the hospital.
6. Every visit action is logged for audit.
7. Pharmacy stock is connected to dispensing.
8. Attendance helps track staff check-in and check-out.
9. Alerts and anomaly detection support supervision.
10. User management removes dependency on manual database seeding.
```

---

## Backup / Security Notes

Current testing uses:

```txt
Local MongoDB
```

Atlas backup configuration should be stored separately and never committed.

Atlas password should be rotated after any accidental exposure.

Do not commit `.env` files containing secrets.