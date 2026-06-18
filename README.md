# MedTrack AI

MedTrack AI is a smart healthcare inventory and medication management platform designed to help hospitals, clinics, pharmacies, and health centers efficiently manage drugs, patients, dispensing records, stock levels, alerts, and staff activities.

The system combines inventory management, patient tracking, analytics, and AI-powered insights to improve healthcare operations and reduce medication stock-outs.

---

## Features

### Patient Management

* Register and manage patients
* View patient medication history
* Search and filter patient records

### Drug & Inventory Management

* Add, edit, and remove drugs
* Track stock quantities
* Low-stock monitoring
* Inventory analytics

### Medication Dispensing

* Dispense medication to patients
* Record dispensing history
* Track dispensing staff
* Drug usage analytics

### Staff Management

* User authentication and authorization
* Staff activity tracking
* Attendance monitoring
* Performance analytics

### Alerts & Notifications

* Low-stock alerts
* Inventory monitoring
* Real-time notifications

### Dashboard & Analytics

* Drug usage trends
* Top dispensed drugs
* Staff activity reports
* Attendance analytics
* Inventory insights

---

## Tech Stack

### Frontend

* React Native
* Expo
* Expo Router
* Axios

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* Bcrypt

### Development Tools

* Git
* GitHub
* Postman

---

## Project Structure

```text
MedTrack/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── app.js
│   ├── server.js
│   └── package.json
│
├── mobile/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── hooks/
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/medtrack-ai.git
cd medtrack-ai
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key
```

### 4. Start Backend

```bash
npm run dev
```

or

```bash
node server.js
```

### 5. Install Frontend Dependencies

```bash
cd mobile
npm install
```

### 6. Start Expo

```bash
npx expo start
```

---

## API Endpoints

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
```

### Patients

```http
GET    /api/patients
POST   /api/patients
PUT    /api/patients/:id
DELETE /api/patients/:id
```

### Drugs

```http
GET    /api/drugs
POST   /api/drugs
PUT    /api/drugs/:id
DELETE /api/drugs/:id
```

### Dispensing

```http
POST /api/dispense
GET  /api/history
```

### Attendance

```http
GET /api/attendance/today
```

### Dashboard

```http
GET /api/dashboard
```

---

## Roadmap

### Current Version

* Drug Inventory Management
* Patient Management
* Medication Dispensing
* Attendance Tracking
* Dashboard Analytics

### Upcoming Features

* AI Stock Prediction
* Prescription OCR
* Multi-Hospital Support
* SMS Notifications
* Advanced Reporting
* Offline Mode
* Role-Based Permissions
* Audit Logs

---

## Author

**Donato Ojara**

Software Engineer | ICT Officer | Full-Stack Developer

Email: [ojaradonato4@gmail.com](mailto:ojaradonato4@gmail.com)

Location: Uganda

---

## License

This project is licensed under the MIT License.
