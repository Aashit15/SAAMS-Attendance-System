# Product Requirements Document (PRD)
## Automated Student Attendance Monitoring and Analytics System (SAAMS)
**Tech Stack:** MERN (MongoDB, Express.js, React.js, Node.js)
**Version:** 2.0
**Status:** Ready for Development

---

## 1. Project Overview

Build a full-stack MERN web application that automates student attendance tracking for colleges using two methods:

1. **QR Code Scanning** — student scans a session-specific QR code from faculty's screen
2. **Facial Recognition** — system identifies students by their face using a live webcam feed

**Facial recognition is a core, mandatory feature — not optional.** Every student must register their face during account creation. This stored face data is later used to identify and mark attendance automatically during live sessions. The system replaces manual roll calls, eliminates proxy attendance, and provides analytics dashboards for faculty and administrators.

---

## 2. Tech Stack & Architecture

### Frontend
- **React.js** (Vite) with React Router v6
- **Tailwind CSS** for styling
- **Recharts** for analytics/charts
- **React Query (TanStack Query)** for server state management
- **Axios** for HTTP requests
- **QR Code libraries:** `qrcode` (generation), `html5-qrcode` (scanning via webcam)
- **Face Recognition (client-side):** `face-api.js` — runs TensorFlow.js models in the browser for face detection, landmark extraction, and descriptor generation (no server round-trip for detection, only for matching)
- **Socket.io-client** for real-time attendance updates

### Backend
- **Node.js + Express.js** REST API
- **MongoDB + Mongoose** for database
- **Socket.io** for real-time updates
- **JWT** (jsonwebtoken) for authentication
- **bcryptjs** for password hashing
- **node-cron** for scheduled tasks (auto-close sessions, reminders)
- **nodemailer** for email alerts
- **multer + cloudinary** for storing face registration images
- **express-validator** for input validation
- **@vladmandic/face-api** — server-side face-api.js wrapper for Node.js (used for descriptor comparison and re-validation)

### Face Recognition Architecture
```
Registration Flow:
  Browser (face-api.js) → detect face → extract 128-d descriptor array → POST to backend → store in MongoDB

Attendance Flow (Facial):
  Browser (face-api.js) → detect face from webcam → extract descriptor → POST to backend
  Backend → fetch all enrolled students' descriptors for that course → compute Euclidean distance
  Backend → find best match below threshold (0.6) → mark attendance
```

### Database
- **MongoDB Atlas** (cloud) or local MongoDB

### DevOps / Deployment
- Backend: **Render** or **Railway**
- Frontend: **Vercel** or **Netlify**
- DB: **MongoDB Atlas**
- Environment config via `.env`

---

## 3. User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Super Admin** | Manage colleges, departments, users; view all analytics |
| **Admin** | Manage faculty, students, courses within their college; view all reports; manage face data |
| **Faculty** | Create/manage attendance sessions (QR or facial mode), view analytics, manually override attendance |
| **Student** | Must register face during signup; scan QR or use face to mark attendance; view own records |

---

## 4. Core Features & Modules

---

### 4.1 Authentication & User Management (with Mandatory Face Registration for Students)

**Requirements:**
- Register/Login with email and password (JWT-based, access + refresh tokens)
- **For students: face registration is a mandatory final step of the signup flow — account is not activated until a valid face is registered**
- Role-based route protection on both frontend and backend
- Password reset via email OTP
- Profile management (name, avatar, department, contact)
- Session management with token expiry (access token: 15 min, refresh token: 7 days)
- Admin can re-trigger face registration for a student (e.g., if face data is corrupted or student requests a re-enrollment)

**Student Registration Flow (Step-by-Step):**
```
Step 1: Fill basic details (name, email, password, roll number, department)
Step 2: Verify email via OTP
Step 3: MANDATORY — Face Registration
  a. Webcam opens in browser
  b. face-api.js loads models (ssdMobilenetv1, faceLandmark68Net, faceRecognitionNet)
  c. Real-time face detection overlay shown to guide student
  d. System captures 5 snapshots from slightly different angles
  e. For each snapshot: detect face → extract 128-dimension descriptor float array
  f. All 5 descriptors sent to backend as faceDescriptors[]
  g. Backend stores descriptors + one reference image (Cloudinary) in User document
  h. Account status set to 'active'; student can now log in
  i. If no clear face detected → show error → retry (cannot skip)
```

**API Endpoints:**
```
POST   /api/auth/register                    — Step 1: create pending user
POST   /api/auth/verify-email               — Step 2: OTP verification
POST   /api/auth/register/face              — Step 3: upload face descriptors (multipart: image + descriptors JSON)
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
PUT    /api/users/:id
POST   /api/users/:id/re-enroll-face        — Admin: trigger face re-registration
DELETE /api/users/:id/face                  — Admin: clear face data
```

**MongoDB Schema — User:**
```js
{
  name: String,
  email: { type: String, unique: true },
  password: String,                         // bcrypt hashed
  role: { type: String, enum: ['superadmin', 'admin', 'faculty', 'student'] },
  department: { type: ObjectId, ref: 'Department' },
  college: { type: ObjectId, ref: 'College' },
  rollNumber: String,                       // students only
  employeeId: String,                       // faculty only
  avatar: String,

  // Face Recognition Fields (students only)
  faceDescriptors: [[Number]],              // Array of 5 × 128-float arrays
  faceImageUrl: String,                     // Cloudinary URL of reference face photo
  faceRegisteredAt: Date,
  isFaceRegistered: { type: Boolean, default: false },

  // Account Status
  accountStatus: {
    type: String,
    enum: ['pending_email', 'pending_face', 'active', 'suspended'],
    default: 'pending_email'
  },

  isActive: Boolean,
  refreshToken: String,
  emailVerifiedAt: Date,
  createdAt, updatedAt
}
```

> **IMPORTANT:** Students with `accountStatus !== 'active'` cannot log in. The face registration step sets it to `'active'`. Email verification sets it from `'pending_email'` to `'pending_face'`.

---

### 4.2 College, Department & Course Management (Admin)

**Requirements:**
- Admin can create/edit/delete departments
- Admin can create/edit/delete courses and assign faculty
- Admin can bulk-enroll students into courses via CSV upload
- Admin can view all courses with enrollment counts
- Admin can view face registration status of all students (registered / pending)

**API Endpoints:**
```
CRUD   /api/departments
CRUD   /api/courses
POST   /api/courses/:id/enroll              — enroll student(s)
DELETE /api/courses/:id/enroll/:studentId
POST   /api/courses/:id/enroll/bulk         — CSV upload
GET    /api/courses/:id/students
GET    /api/students/face-status            — list students with face registration status
```

**MongoDB Schema — Course:**
```js
{
  name: String,
  code: { type: String, unique: true },
  department: { type: ObjectId, ref: 'Department' },
  faculty: [{ type: ObjectId, ref: 'User' }],
  students: [{ type: ObjectId, ref: 'User' }],
  semester: String,
  academicYear: String,
  totalClasses: { type: Number, default: 0 },
  isActive: Boolean,
  createdAt, updatedAt
}
```

---

### 4.3 Attendance Session Management (Faculty)

**Requirements:**
- Faculty creates an attendance session and chooses the attendance method:
  - **QR Code mode** — generates a time-limited QR code for students to scan
  - **Facial Recognition mode** — faculty starts a live facial scan session; students' faces are recognized from a shared webcam or individual student webcams
  - **Dual mode** — both QR and facial recognition active simultaneously
- QR code is displayed on faculty's screen (projector-friendly full-screen mode)
- Faculty can manually mark/override attendance for individual students
- Faculty can close a session early or extend the QR expiry window
- Session status: `active`, `closed`, `expired`
- Real-time count of students marked present (via Socket.io)

**API Endpoints:**
```
POST   /api/sessions                        — create session + generate QR (if applicable)
GET    /api/sessions?courseId=&date=        — list sessions (faculty)
GET    /api/sessions/:id                    — session detail + present/absent list
PUT    /api/sessions/:id                    — update (extend time, close, change mode)
DELETE /api/sessions/:id
POST   /api/sessions/:id/manual-mark        — manually mark a student
GET    /api/sessions/:id/qr                 — regenerate/refresh QR token
POST   /api/sessions/:id/facial-recognize   — submit a face descriptor for recognition
```

**MongoDB Schema — Session:**
```js
{
  course: { type: ObjectId, ref: 'Course' },
  faculty: { type: ObjectId, ref: 'User' },
  date: Date,
  startTime: Date,
  endTime: Date,

  // QR fields
  qrToken: String,
  qrExpiresAt: Date,

  // Attendance mode
  attendanceMode: {
    type: String,
    enum: ['qr', 'facial', 'dual'],
    default: 'dual'
  },

  status: { type: String, enum: ['active', 'closed', 'expired'] },
  location: String,
  type: { type: String, enum: ['in-person', 'online'] },
  remarks: String,
  createdAt, updatedAt
}
```

---

### 4.4 QR Code Attendance Marking (Student)

**Requirements:**
- Student opens the app and navigates to "Mark Attendance"
- Webcam-based QR code scanner opens in browser (no app install required)
- Student scans the QR code displayed by faculty
- System validates: QR valid + not expired + student enrolled + not already marked
- On success: attendance record created, real-time update pushed to faculty dashboard
- On failure: specific error shown (already marked, QR expired, not enrolled)
- **Anti-proxy:** QR token is session-specific, time-limited, single-use per student; IP and device info logged

**API Endpoints:**
```
POST   /api/attendance/mark-qr             — body: { qrToken }
GET    /api/attendance/session/:id         — all records for a session
GET    /api/attendance/student/:id         — all records for a student
GET    /api/attendance/course/:id          — aggregate by course
```

**MongoDB Schema — Attendance:**
```js
{
  session: { type: ObjectId, ref: 'Session' },
  course: { type: ObjectId, ref: 'Course' },
  student: { type: ObjectId, ref: 'User' },
  markedAt: Date,
  method: { type: String, enum: ['qr', 'manual', 'facial'] },
  status: { type: String, enum: ['present', 'absent', 'late', 'excused'] },
  faceMatchConfidence: Number,              // 0–1 score (facial method only)
  faceMatchDistance: Number,               // Euclidean distance (lower = better match)
  ipAddress: String,
  deviceInfo: String,
  isProxy: { type: Boolean, default: false },
  proxyFlagReason: String,
  createdAt
}
```

---

### 4.5 Facial Recognition Attendance (Core Feature)

This is the primary anti-proxy attendance mechanism. It runs entirely within the MERN stack using **face-api.js** on the client and descriptor matching on the server.

---

#### 4.5.1 Face Registration (During Student Signup — Mandatory)

**Frontend Logic:**
```
1. Load face-api.js models from /public/models/:
   - ssd_mobilenetv1 (face detection)
   - face_landmark_68 (landmark points)
   - face_recognition (128-d descriptor)

2. Open webcam stream using getUserMedia()

3. Draw real-time detection overlay on <canvas> over <video>:
   - Green box = face detected correctly
   - Red box / warning = face too far, bad lighting, multiple faces, no face

4. Capture 5 frames when face quality is good:
   - Frontal face (looking straight)
   - Slight left turn
   - Slight right turn
   - Slight up tilt
   - Slight down tilt
   (Guide the student with on-screen arrows/instructions)

5. For each frame:
   - detectSingleFace().withFaceLandmarks().withFaceDescriptor()
   - Store the Float32Array (128 values) as a regular JS number array

6. Convert one frame to base64 JPEG for reference photo

7. POST to /api/auth/register/face:
   {
     faceDescriptors: [[...128 floats] × 5],
     faceImage: "data:image/jpeg;base64,..."
   }

8. Show success screen → redirect to login
```

**Backend Logic:**
```
1. Receive descriptors array + image
2. Validate: exactly 5 descriptors, each has 128 numeric values
3. Upload faceImage to Cloudinary → get URL
4. Save faceDescriptors and faceImageUrl to User document
5. Set isFaceRegistered = true, accountStatus = 'active'
6. Return success
```

---

#### 4.5.2 Facial Attendance During a Session

**Two sub-modes are supported:**

**Mode A — Student Self-Scan (Individual)**
Each student opens their own device, webcam captures their face, descriptor sent to server for matching.

```
Frontend (Student Device):
1. Student navigates to "Mark Attendance via Face"
2. Webcam opens, face-api.js detects and extracts descriptor in real-time
3. When a clear face is detected (confidence > 0.85), auto-capture
4. POST /api/attendance/mark-face:
   {
     sessionId: "...",
     faceDescriptor: [...128 floats]   // from student's webcam
   }

Backend:
1. Verify session is active
2. Check student is enrolled in the course
3. Check no duplicate attendance record
4. Compare incoming descriptor against ONLY that student's stored faceDescriptors
   (since student is already authenticated, we just verify it's really them)
   - Compute Euclidean distance between incoming descriptor and each of 5 stored descriptors
   - Take the minimum distance
   - If minDistance <= 0.6 → MATCH (mark present)
   - If minDistance > 0.6 → FACE_MISMATCH (reject, possible proxy)
5. Create Attendance record with method: 'facial', faceMatchDistance
6. Emit socket event to faculty dashboard
```

**Mode B — Faculty Bulk Scan (Classroom Mode)**
Faculty uses a single webcam (on laptop/projector screen) to scan the entire classroom. System identifies multiple students simultaneously.

```
Frontend (Faculty Device):
1. Faculty opens "Facial Attendance Mode" for an active session
2. Webcam stream shows classroom
3. face-api.js runs detectAllFaces() in a loop (every 2 seconds):
   - Detect all faces in frame
   - Extract descriptor for each face
4. Descriptors array sent to backend:
   POST /api/sessions/:id/facial-recognize:
   {
     faceDescriptors: [[...128], [...128], ...]   // all faces in current frame
   }

Backend:
1. Fetch all enrolled students' faceDescriptors for this course
2. Build a FaceMatcher:
   - For each incoming descriptor, compute distance against every student's stored descriptors
   - Use labeledDescriptors approach (one label per student)
   - Find best match: student with lowest distance below threshold (0.6)
3. For each matched student:
   - Check not already marked
   - Create Attendance record (method: 'facial')
   - Emit socket event: attendance:face_marked { studentId, studentName, confidence }
4. Return: { recognized: [{studentId, name, distance}], unrecognized: count }

Frontend:
- Real-time overlay: show student name tag above each recognized face
- "Already marked" students shown in grey
- Running count of recognized students
```

**Face Matching Algorithm (Euclidean Distance):**
```js
// Euclidean distance between two 128-d descriptors
function euclideanDistance(d1, d2) {
  return Math.sqrt(d1.reduce((sum, val, i) => sum + Math.pow(val - d2[i], 2), 0));
}

// Match incoming descriptor against a student's 5 stored descriptors
function matchStudent(incoming, storedDescriptors) {
  const distances = storedDescriptors.map(stored => euclideanDistance(incoming, stored));
  return Math.min(...distances); // best match
}

// Thresholds
const MATCH_THRESHOLD = 0.6;     // below = same person
const CONFIDENT_THRESHOLD = 0.45; // below = high confidence match
```

**face-api.js Models to Include in `/public/models`:**
```
ssd_mobilenetv1_model-weights_manifest.json + shards
face_landmark_68_model-weights_manifest.json + shards
face_recognition_model-weights_manifest.json + shards
```
Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

---

#### 4.5.3 Face Re-Enrollment (Admin)

- Admin can view a student's registered face photo on their profile
- Admin can delete face data and send student a re-enrollment email with a one-time link
- Student clicks link → goes through face registration step again → updates descriptors
- Use case: student changes appearance significantly (beard, haircut, glasses), low match rates in attendance

**API Endpoints:**
```
POST   /api/users/:id/re-enroll-face        — Admin: send re-enrollment email + invalidate old data
POST   /api/auth/face-reenroll/:token       — Student: submit new face via one-time token
GET    /api/users/:id/face-status           — Check face registration status
```

---

#### 4.5.4 Face Recognition Edge Cases & Fallbacks

| Scenario | System Behavior |
|----------|----------------|
| Student face not registered | Block facial attendance; show "Face not registered, use QR" |
| Face not detected (bad lighting) | Show guidance overlay; retry |
| Multiple faces in self-scan | Show error: "Only one face should be visible" |
| Match distance between 0.6–0.7 | Flag as low-confidence; mark present but flag for review |
| Match distance > 0.7 | Reject; student must use QR or ask faculty for manual mark |
| Student wearing mask/glasses | Show warning; retry without obstruction or use QR fallback |
| Face re-enrollment pending | Allow QR attendance only until re-enrollment complete |

---

### 4.6 Analytics Dashboard

**Requirements — Faculty View:**
- Per-course attendance percentage over time (line chart)
- Per-session attendance count (bar chart) — broken down by method (QR vs facial vs manual)
- Students below threshold (default 75%) — highlighted list with % and contact info
- Attendance heatmap by weekday/time slot
- Face match confidence trends (flag sessions with many low-confidence matches)
- Downloadable reports: CSV and PDF per course per date range

**Requirements — Admin View:**
- College-wide attendance summary by department
- Department-wise attendance trends (line/bar charts)
- Top defaulters list across all courses
- Faculty activity summary (sessions conducted)
- Face registration completion rate across all students
- Export full reports

**Requirements — Student View:**
- Own attendance percentage per course (progress rings/bars)
- Session-by-session history (date, status, method used: QR/facial/manual)
- Warning banner if below threshold in any course
- Calendar view of attended vs missed classes
- Face registration status indicator on profile

**API Endpoints:**
```
GET    /api/analytics/course/:id?from=&to=
GET    /api/analytics/student/:id
GET    /api/analytics/department/:id
GET    /api/analytics/college/:id
GET    /api/analytics/face-registration-stats    — Admin
GET    /api/reports/course/:id/export?format=csv
GET    /api/reports/student/:id/export
```

---

### 4.7 Notifications & Alerts

**Requirements:**
- Automated email alerts to students when attendance falls below 75%
- Email to faculty summarizing session attendance after session closes (with QR vs facial breakdown)
- Email to students with face re-enrollment pending reminder
- Optional: in-app notification bell
- Admin can configure threshold percentage per course

**Implementation:**
- `node-cron` daily job for threshold checks
- `nodemailer` with SMTP (Gmail/SendGrid)
- Notifications stored in DB for in-app display

**MongoDB Schema — Notification:**
```js
{
  recipient: { type: ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['low_attendance', 'session_created', 'report_ready', 'face_reenroll_required', 'general']
  },
  message: String,
  isRead: { type: Boolean, default: false },
  relatedCourse: { type: ObjectId, ref: 'Course' },
  createdAt
}
```

---

### 4.8 Real-Time Features (Socket.io)

**Events:**
```
Server → Faculty:  attendance:marked         { studentId, studentName, method, count, total }
Server → Faculty:  attendance:face_marked    { studentId, studentName, matchDistance, confidence }
Server → Faculty:  session:expired           { sessionId }
Server → Faculty:  face:low_confidence       { studentId, distance }    — flag for review
Server → Student:  attendance:confirmed      { sessionId, status, method }
Server → Student:  face:mismatch             { sessionId, reason }
Faculty → Server:  session:extend            { sessionId, extraMinutes }
Faculty → Server:  session:close             { sessionId }
```

---

## 5. Page / Component Structure (React Frontend)

```
src/
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx              — multi-step form
│   │   ├── FaceRegistration.jsx      — Step 3 of signup (mandatory)
│   │   ├── FaceReEnroll.jsx          — re-enrollment via one-time token
│   │   └── ForgotPassword.jsx
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── ManageCourses.jsx
│   │   ├── ManageUsers.jsx
│   │   ├── FaceRegistrationStatus.jsx — list of students, registered/pending
│   │   └── Reports.jsx
│   ├── faculty/
│   │   ├── Dashboard.jsx
│   │   ├── Sessions.jsx
│   │   ├── CreateSession.jsx          — choose mode: QR / Facial / Dual
│   │   ├── SessionDetail.jsx          — live attendance, socket updates
│   │   ├── FacialScanMode.jsx         — classroom bulk face scan
│   │   └── CourseAnalytics.jsx
│   ├── student/
│   │   ├── Dashboard.jsx
│   │   ├── MarkAttendance.jsx         — choose QR or Face
│   │   ├── QRScan.jsx
│   │   ├── FaceScan.jsx               — self face scan for attendance
│   │   └── MyAttendance.jsx
│   └── shared/
│       ├── NotFound.jsx
│       └── Unauthorized.jsx
├── components/
│   ├── layout/            Navbar.jsx, Sidebar.jsx, ProtectedRoute.jsx
│   ├── charts/            AttendanceLine.jsx, SessionBar.jsx, CourseRings.jsx, Heatmap.jsx, MethodBreakdown.jsx
│   ├── face/
│   │   ├── FaceCapture.jsx            — reusable: webcam + detection overlay + capture logic
│   │   ├── FaceModelLoader.jsx        — loads face-api.js models, shows progress
│   │   ├── FaceOverlay.jsx            — canvas overlay with bounding boxes + name tags
│   │   ├── FaceGuidance.jsx           — real-time instructions (move closer, better lighting)
│   │   └── LiveFaceRecognizer.jsx     — faculty classroom scan component
│   ├── qr/                QRDisplay.jsx, QRScanner.jsx
│   ├── tables/            AttendanceTable.jsx, StudentList.jsx
│   └── ui/                Button, Modal, Badge, Spinner, Alert, Toast, StepIndicator
├── hooks/
│   ├── useAuth.js
│   ├── useSocket.js
│   ├── useAttendance.js
│   ├── useFaceApi.js                  — loads models, exposes detectFace(), getDescriptor()
│   └── useWebcam.js                  — getUserMedia, stream management
├── services/
│   ├── api.js             (axios instance)
│   ├── auth.service.js
│   ├── attendance.service.js
│   └── face.service.js                — face registration + mark-face API calls
├── context/               AuthContext.jsx, SocketContext.jsx, FaceModelContext.jsx
├── utils/
│   ├── formatDate.js
│   ├── calculatePercentage.js
│   ├── exportCSV.js
│   └── faceUtils.js                   — descriptor helpers, distance calculation
└── App.jsx
```

---

## 6. Backend Folder Structure

```
server/
├── config/               db.js, cloudinary.js, nodemailer.js
├── controllers/
│   ├── auth.controller.js
│   ├── session.controller.js
│   ├── attendance.controller.js
│   ├── face.controller.js             — face registration, re-enrollment, recognition
│   └── analytics.controller.js
├── middleware/           auth.middleware.js, role.middleware.js, validate.middleware.js, errorHandler.js
├── models/               User.js, Course.js, Department.js, Session.js, Attendance.js, Notification.js
├── routes/
│   ├── auth.routes.js
│   ├── session.routes.js
│   ├── attendance.routes.js
│   ├── face.routes.js
│   └── analytics.routes.js
├── services/
│   ├── qr.service.js
│   ├── mail.service.js
│   ├── report.service.js
│   └── faceMatch.service.js           — descriptor comparison, FaceMatcher logic
├── jobs/                 attendanceAlert.cron.js, sessionExpiry.cron.js, faceEnrollReminder.cron.js
├── sockets/              index.js, sessionHandlers.js, faceHandlers.js
├── utils/                generateToken.js, apiResponse.js, catchAsync.js, euclideanDistance.js
└── server.js
```

---

## 7. API Response Format (Standard)

```json
{
  "success": true,
  "message": "Attendance marked via facial recognition",
  "data": { },
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Face mismatch detected. Possible proxy attempt.",
  "errorCode": "FACE_MISMATCH",
  "data": { "distance": 0.78, "threshold": 0.60 }
}
```

**Face-specific error codes:**
```
FACE_NOT_REGISTERED     — student has no face data
FACE_MISMATCH           — distance above threshold
FACE_LOW_CONFIDENCE     — distance between 0.60–0.70 (flagged)
FACE_MULTIPLE_DETECTED  — more than 1 face in self-scan
FACE_NOT_DETECTED       — no face found in image
FACE_MODEL_ERROR        — descriptor extraction failed
```

---

## 8. QR Code Generation Logic

```
1. Faculty creates session → server generates a short-lived signed JWT:
   payload: { sessionId, courseId, iat, exp: now + expiryMinutes }
   signed with: SESSION_QR_SECRET env variable

2. QR code encodes this token as a URL or plain string

3. Student scans → frontend sends token to POST /api/attendance/mark-qr

4. Server verifies:
   a. JWT signature valid
   b. Token not expired
   c. Session is still 'active'
   d. Student enrolled in course
   e. No duplicate record for this student + session

5. On pass → create Attendance record (method: 'qr'), emit socket event
6. On fail → return specific error code
```

---

## 9. Face Recognition Logic (Detailed)

### 9.1 Descriptor Storage Strategy
- Each student stores **5 descriptors** (different angles/expressions captured during registration)
- Stored as `[[number × 128] × 5]` in MongoDB
- 5 × 128 floats × 4 bytes = ~2.5 KB per student — lightweight, no separate vector DB needed
- For 1000 students: ~2.5 MB total descriptor storage

### 9.2 Matching Strategy (Server-Side)
```js
// faceMatch.service.js

import { euclideanDistance } from '../utils/euclideanDistance.js';

// Match one incoming descriptor against one student's stored descriptors
export function matchStudent(incoming, student) {
  const distances = student.faceDescriptors.map(stored =>
    euclideanDistance(incoming, stored)
  );
  const bestDistance = Math.min(...distances);
  return { studentId: student._id, name: student.name, distance: bestDistance };
}

// Find best matching student from a list (bulk mode)
export function findBestMatch(incomingDescriptor, students, threshold = 0.6) {
  const results = students.map(s => matchStudent(incomingDescriptor, s));
  results.sort((a, b) => a.distance - b.distance);
  const best = results[0];
  if (best && best.distance <= threshold) return best;
  return null; // unrecognized
}
```

### 9.3 Performance Optimization
- In bulk mode (faculty scan), only fetch descriptors of students **enrolled in the specific course** — not all students
- Index `faceDescriptors` queries by `course.students` array
- Cache enrolled students' descriptors in memory during an active session (Map keyed by sessionId)
- Clear cache when session is closed or expired

### 9.4 Anti-Spoofing Notes
- Liveness detection is NOT implemented in v1.0 (out of scope for MERN-only stack)
- For v1.0, flag suspicious patterns: same IP marking multiple students, unusually fast recognition, etc.
- Log all recognition attempts with timestamp, IP, and match distance for audit
- Phase 2: integrate liveness detection (blink detection via landmark tracking)

---

## 10. Security Requirements

- All routes (except login/register) protected with JWT middleware
- Role-based middleware on sensitive routes (`requireRole('admin')`)
- Rate limiting on `/api/auth/*` routes (express-rate-limit: 10 req/15 min)
- Rate limiting on `/api/attendance/mark-face` (5 req/min per user) — prevent brute-force face spoofing
- QR tokens are single-use per student (duplicate check in DB)
- Face descriptors are mathematical float arrays, not raw images — no biometric image stored on server (only one reference photo on Cloudinary)
- CORS configured to allow only frontend origin
- Helmet.js for HTTP security headers
- Input validation on all POST/PUT routes
- Passwords minimum 8 characters, bcrypt (salt rounds: 12)
- Refresh tokens in httpOnly cookies
- Face re-enrollment tokens are single-use, expire in 24 hours

---

## 11. Environment Variables (.env)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://...

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
SESSION_QR_SECRET=your_qr_secret
FACE_REENROLL_TOKEN_SECRET=your_reenroll_secret
FACE_REENROLL_TOKEN_EXPIRES=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# Cloudinary (face reference images + profile photos)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FACE_FOLDER=saams_faces

# Face Recognition
FACE_MATCH_THRESHOLD=0.6
FACE_LOW_CONFIDENCE_THRESHOLD=0.7
FACE_REQUIRED_DESCRIPTORS=5
FACE_DESCRIPTOR_LENGTH=128

# Frontend URL (CORS)
CLIENT_URL=http://localhost:3000

# Attendance threshold for alerts
DEFAULT_ATTENDANCE_THRESHOLD=75
```

---

## 12. MVP — Phase 1 (Build in this order)

1. Auth system — register, login, JWT, roles
2. Email OTP verification
3. **Face registration step** — mandatory for students (FaceCapture component + descriptor storage)
4. Department + Course CRUD (admin)
5. Student/Faculty management (admin)
6. Session creation with mode selection: QR / Facial / Dual (faculty)
7. QR code generation + display (faculty)
8. QR scanning + attendance marking (student)
9. **Facial self-scan attendance** — student scans own face to mark present
10. Basic session detail view: present/absent list with method column (faculty)
11. Student's own attendance summary page

---

## 13. Phase 2 Enhancements

- **Faculty bulk classroom facial scan** (Mode B — LiveFaceRecognizer component)
- Real-time Socket.io updates with face recognition events
- Face match confidence analytics (flag low-confidence sessions)
- Bulk student enrollment via CSV
- Email alerts for low attendance (cron job)
- Face re-enrollment email flow (admin triggers → student re-registers)
- Advanced analytics: heatmap, trend charts, method breakdown charts
- Downloadable CSV/PDF reports
- In-app notification bell
- Offline PWA support

---

## 14. Phase 3 (Future Scope)

- **Liveness detection** — blink-based or depth estimation to prevent photo spoofing
- Mobile app (React Native) with native face ID integration
- LMS integration (Moodle, Google Classroom)
- Geo-fencing: mark attendance only within campus radius
- Parent portal with attendance visibility
- AI-based at-risk student prediction (low attendance + engagement pattern)
- Replace face-api.js with a Python Flask/FastAPI microservice using DeepFace or InsightFace for higher accuracy

---

## 15. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time | < 500ms for QR mark; < 1500ms for face recognition (bulk) |
| Concurrent users | 500 concurrent users |
| Uptime | 99.5% |
| Face model load time | < 3 seconds on first load (models cached in browser) |
| Face descriptor extraction | < 200ms per face (client-side, face-api.js) |
| Face matching (100 students) | < 300ms server-side |
| Mobile responsive | All pages work on 360px+ viewport |
| Data retention | Attendance records kept minimum 5 years |
| Accessibility | WCAG 2.1 AA for key pages |

---

## 16. Development Notes for AI Code Editor

**General:**
- Use **ES Modules** (`"type": "module"` in package.json) or CommonJS — pick one and be consistent
- Use **async/await** throughout; wrap controllers in `catchAsync` utility
- Use **MongoDB indexes:** `Attendance.session + student` (unique compound), `Session.qrToken`, `User.email`, `User.isFaceRegistered`
- All date/time stored as UTC in MongoDB, formatted on the frontend
- Add `db/seed.js` to populate demo data: 1 admin, 2 faculty, 20 students with face descriptors (generate random 128-d float arrays for seed), 3 courses, 10 sessions

**Face Recognition Specific:**
- face-api.js models must be served from `/public/models` — download weights from the official repo and commit them (they are static files, ~6 MB total)
- Load models once on app init via `FaceModelContext` — do NOT reload on every component mount
- `getUserMedia()` and face-api.js canvas overlay require `https` or `localhost` — local dev is fine; production must use HTTPS
- When storing `faceDescriptors` in MongoDB, convert `Float32Array` to a plain JS number array: `Array.from(descriptor)` before saving; convert back with `new Float32Array(stored)` before computing distance
- In bulk classroom mode, cap maximum concurrent face comparisons at 50 students per frame to prevent blocking the event loop — use `Promise.all` with batching if needed
- The `FaceCapture` component should be reusable for both registration (5 captures) and attendance (1 capture) — accept a `mode` prop (`'register' | 'verify'`)
- Socket.io server must be on same HTTP server as Express
- Use **React Context** for auth state; `FaceModelContext` for sharing loaded face-api.js model instances
- For CSV export use `json2csv` or `papaparse` on the backend
- Protect `/api/users/:id/face-status` and all face management routes behind `requireRole('admin')`
