# SAAMS: Student Attendance and Analytics Monitoring System
## Comprehensive Architectural and Functional Summary

---

### 1. Project Overview & Problem Statement

**The Core Problem:**
Traditional manual attendance systems (roll calls, paper registers) are time-consuming, prone to human error, and easily manipulated (proxy attendance). Basic biometric systems (fingerprint or RFID scanners) create physical bottlenecks at classroom doors, require expensive hardware maintenance, and can present hygiene concerns.

**Exact Features Included:**
*   **Dual-Mode Attendance:** Support for both dynamic QR code scanning and strict Facial Recognition.
*   **Anti-Proxy Mechanisms:** Highly secure, auto-refreshing QR codes (5-second lifecycle) and strict facial descriptor matching to eliminate buddy punching.
*   **Role-Based Access Control (RBAC):** Distinct dashboards and capabilities for Superadmins, Admins, Faculty, and Students.
*   **Real-Time Monitoring:** Live attendance tracking for faculty using WebSocket (Socket.io) connections.
*   **Analytics & Reporting:** Visual dashboards with attendance percentages, absentees, and historical data aggregation using Recharts.
*   **Centralized Management:** Admin panels to manage Departments, Courses, Users, and Face Registration statuses.

**What Makes This System Unique ("What's New"):**
SAAMS introduces a "moving target" security model. Unlike static QR codes that can be photographed and shared on WhatsApp, our QR codes are signed JWTs that expire in 10 seconds and automatically refresh on the presentation screen every 5 seconds. Coupled with an edge-to-server facial recognition pipeline—where facial geometry is computed on the user's device and strictly validated on the server—it provides enterprise-grade security without requiring specialized hardware.

---

### 2. Tech Stack & Software Requirements

**MERN Stack Configuration:**
*   **MongoDB:** NoSQL database using Mongoose ODM for flexible, schema-based data modeling.
*   **Express.js:** Fast, minimalist web framework for Node.js routing and middleware.
*   **React 19 (with Vite):** Next-generation frontend framework for building a high-performance Single Page Application (SPA).
*   **Node.js (v22+):** Asynchronous event-driven JavaScript runtime for the backend server.

**Major Third-Party Libraries & SDKs:**
*   **`face-api.js` (Frontend):** Runs TensorFlow.js models in the browser to detect faces and compute 128-dimensional facial descriptors without sending raw video feeds to the server.
*   **`html5-qrcode` (Frontend):** Handles cross-device camera access and real-time QR code parsing.
*   **`qrcode` (Backend):** Generates base64 image strings from JWT tokens to render QR codes.
*   **`socket.io` (Full Stack):** Enables real-time, bi-directional event emission (e.g., instantly updating the faculty dashboard when a student marks attendance).
*   **`jsonwebtoken` (JWT):** Handles stateless authentication and generates the short-lived, time-sensitive QR tokens.
*   **`bcryptjs` (Backend):** Cryptographically hashes user passwords before database storage.
*   **`cloudinary` (Backend):** Cloud-based media management for storing reference profile images of users.
*   **`@tanstack/react-query` (Frontend):** Manages server state, caching, and background data synchronization.
*   **`tailwindcss` v4 (Frontend):** Utility-first CSS framework for rapid, responsive UI development.

---

### 3. System Architecture & Database Design

**Database Schema Overview:**
*   **`Users`**: The central entity. Stores `email`, hashed `password`, `role` (admin/faculty/student), `department` reference, and `faceDescriptors` (an array of multiple 128D float arrays captured during registration).
*   **`Departments`**: Represents organizational units. Contains `name`, `code`, and a reference to the `head` user.
*   **`Courses`**: Maps academic subjects. Contains `name`, `code`, references to the `Department`, an array of `faculty` who can teach it, and an array of enrolled `students`.
*   **`Sessions`**: Represents a single class instance. Contains references to `Course` and `faculty`, `startTime`, `endTime`, `attendanceMode` (qr/facial/dual), and current `status` (active/closed).
*   **`AttendanceRecords`**: The transactional ledger. Links a `Student`, `Session`, and `Course`. Stores `method` used, `markedAt` timestamp, and `status` (present). It utilizes a compound unique index on `{ session: 1, student: 1 }` to prevent double-marking.

**System Architecture:**
The application uses a decoupled Client-Server architecture.
1.  **Client Tier:** The React SPA serves the UI and accesses local device hardware (camera) via browser APIs. It handles heavy ML computations (face detection) locally to reduce server load and preserve privacy.
2.  **API Tier:** The Express server exposes RESTful endpoints for CRUD operations and houses the business logic (validation, face matching, token generation).
3.  **Data Tier:** MongoDB persistently stores application state.
4.  **Real-Time Tier:** Socket.io runs alongside Express. When the API tier successfully records attendance, it emits an event through Socket.io to the specific "Session Room", instantly updating the UI for any connected Faculty clients.

---

### 4. Data Flow & Logic

**Use Case 1: Taking Attendance via QR Code**
1.  **Initialization:** Faculty creates a Session. The frontend connects to a Socket.io room for that Session ID.
2.  **QR Generation:** The frontend requests a QR code. The backend generates a JWT containing the `sessionId` with an `expiresIn` of 10 seconds, converts it to an image, and sends it back. The frontend requests a new one every 5 seconds.
3.  **Scanning:** Student selects "QR Scan", the browser requests camera access, and `html5-qrcode` reads the code.
4.  **Verification:** The decoded JWT is sent to the backend. The backend verifies the signature and checks expiry. If valid, it verifies the student is enrolled in the course and hasn't already been marked.
5.  **Recording:** An `AttendanceRecord` is created in MongoDB.
6.  **Real-Time Update:** Backend emits `attendance:marked` via Socket.io. The faculty screen instantly increments the "Present" counter.

**Use Case 2: Face Recognition Registration & Verification**
1.  **Registration:** Student accesses the camera. `face-api.js` captures multiple frames, extracts 128D descriptors for each, and sends them to the backend alongside a reference image (saved to Cloudinary). Descriptors are saved to the `User` document.
2.  **Verification:** During attendance, the live camera captures the student's face, generates a single 128D descriptor, and POSTs it to the server.
3.  **Matching:** The server fetches the student's stored descriptors and runs the Euclidean Distance algorithm (see Section 5).
4.  **Result:** If the distance is below the threshold, attendance is marked and broadcasted.

---

### 5. Core Algorithms (Pseudo-code)

**Face Recognition Matching Process:**
The system uses the **Euclidean Distance** algorithm to calculate the difference between two points in a 128-dimensional space. A smaller distance means the faces are more similar.

```javascript
// Pseudo-code for Server-Side Face Matching
function matchStudent(liveDescriptor, storedStudentDescriptors) {
    let distances = [];
    
    // Calculate distance against every stored angle/lighting capture
    for (let stored of storedStudentDescriptors) {
        let distance = calculateEuclideanDistance(liveDescriptor, stored);
        distances.push(distance);
    }
    
    // Sort distances (lowest is best match)
    distances.sort(ascending);
    
    // Robustness Check: Average the top 3 best distances 
    // This prevents a single lucky false-positive from granting access
    let best3 = getTopN(distances, 3);
    let avgDistance = calculateAverage(best3);
    
    return avgDistance;
}

function verifyAttendance(student, liveDescriptor) {
    let THRESHOLD = 0.35; // Strict match boundary
    
    let distance = matchStudent(liveDescriptor, student.storedDescriptors);
    
    if (distance <= THRESHOLD) {
        return "MATCH_SUCCESS";
    } else {
        return "MATCH_FAILED_POSSIBLE_PROXY";
    }
}
```

**Dynamic QR Code Algorithm:**
```javascript
// Server generates time-sensitive token
function generateQRToken(sessionId, courseId) {
    let payload = {
        sessionId: sessionId,
        courseId: courseId,
        iat: CurrentUnixTime()
    };
    // Token strictly expires in 10 seconds
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '10s' });
}

// Client Auto-Refresh Loop
function startQRDisplay() {
    fetchNewQR();
    setInterval(() => {
        fetchNewQR(); // Requests new token every 5 seconds
    }, 5000);
}
```

---

### 6. File Structure

```text
Attendance/
├── client/                     # React Frontend
│   ├── package.json
│   ├── vite.config.js          # Vite config & API Proxy setup
│   └── src/
│       ├── App.jsx             # Main router and layout wrapper
│       ├── components/         # Reusable UI (Navbar, Sidebar, Loaders)
│       ├── context/            # Global State (AuthContext, SocketContext)
│       ├── pages/
│       │   ├── admin/          # Admin CRUD (ManageUsers, ManageCourses)
│       │   ├── auth/           # Login, FaceRegistration
│       │   ├── faculty/        # Dashboard, CreateSession, SessionDetail
│       │   └── student/        # QRScan, FaceScan, MyAttendance
│       └── services/           # Axios API wrappers (api.js, services.js)
│
└── server/                     # Express Backend
    ├── package.json
    ├── server.js               # Entry point, Express setup, Socket init
    ├── .env                    # Environment variables (Keys, Thresholds)
    ├── config/                 # Cloudinary, MongoDB, Nodemailer setups
    ├── controllers/            # Core logic (auth, attendance, sessions)
    ├── middleware/             # Route protection (JWT verify, Role check)
    ├── models/                 # Mongoose Schemas (User, Session, Attendance)
    ├── routes/                 # Express Router definitions
    ├── services/               # Reusable logic (faceMatch.service.js)
    ├── sockets/                # Socket.io event handlers
    └── utils/                  # Helpers (generateToken, euclideanDistance)
```

---

### 7. User Workflows (User Manual Outlines)

**Admin Workflow: System Provisioning**
1.  **Login:** Navigate to `/login` and enter admin credentials.
2.  **Create Department:** Go to "Departments" -> Click "Add New" -> Enter Name & Code.
3.  **Manage Users:** Go to "Users" -> Add Faculty and Students (or import data).
4.  **Create Course:** Go to "Courses" -> Create a course -> Assign Faculty -> Enroll Students.
5.  **Monitor Setup:** Go to "Face Status" to verify which students have completed their biometric onboarding.

**Faculty Workflow: Conducting a Class**
1.  **Login & Navigate:** Log in and navigate to "New Session".
2.  **Initialize Session:** Select the Course, set Start/End times, choose "Dual Mode", and click "Create Session".
3.  **Display QR:** On the Session Detail screen, click "Show QR". Project this screen on the classroom display. The QR will visibly refresh every 5 seconds.
4.  **Monitor Live:** Watch the "Attendance Records" table populate in real-time as students scan or use face recognition.
5.  **Close Session:** Click "Close Session" when class is over to lock the attendance record.

**Student Workflow: Marking Attendance**
1.  **Onboarding (First Time):** Log in. The system prompts for Face Registration. Look at the camera, rotate head slowly to capture 5 angles. Save data.
2.  **Taking Attendance (QR):** Log in -> Click "Mark Attendance" -> Select "QR Code". Point phone camera at the faculty's projected screen. Success message appears instantly.
3.  **Taking Attendance (Face):** Select "Face Scan" -> Ensure good lighting -> Look at device camera -> System verifies identity and marks attendance.
4.  **Review:** Go to "My Attendance" to see personal attendance percentages and historical logs.
