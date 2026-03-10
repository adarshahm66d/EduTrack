# EduTrack - Project Overview

## 1. Folder Structure

```
EduTrack/
├── backend/                    # FastAPI Backend (Microservices)
│   ├── main.py                 # API Gateway (entry point)
│   ├── auth_service.py         # Authentication microservice
│   ├── course_service.py       # Course management microservice
│   ├── video_service.py        # Video/YouTube playlist microservice
│   ├── attendance_service.py   # Progress & Attendance microservice
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── database.py            # PostgreSQL connection & session
│   ├── dependencies.py        # FastAPI dependency injection
│   ├── auth.py                # JWT token utilities
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── index.js           # React entry point
│   │   ├── App.js             # Main router & auth state
│   │   ├── api.js             # Axios API client (interceptors)
│   │   ├── global.css         # Global styles
│   │   └── components/
│   │       ├── Landing.js     # Public landing page
│   │       ├── Login.js        # Login form
│   │       ├── Signup.js       # Registration form
│   │       ├── Dashboard.js    # Student dashboard
│   │       ├── AdminDashboard.js # Admin dashboard
│   │       ├── CourseCatalog.js # Course listing/search
│   │       ├── CourseDetail.js  # Video player & progress
│   │       ├── StudentList.js    # Admin student management
│   │       └── VideoPopup.js     # Interactive popups
│   ├── public/
│   │   └── index.html         # HTML template
│   └── package.json           # Node dependencies
│
├── database/
│   └── schema.sql             # PostgreSQL schema
│
├── cloudbuild.yaml            # GCP CI/CD config
└── README.md                   # Documentation
```

## 2. High Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Login   │  │ Dashboard│  │  Course  │  │  Video   │   │
│  │  Signup   │  │  Admin   │  │ Catalog  │  │  Player  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP/REST (Axios)
                        │ JWT Bearer Token
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         FastAPI API Gateway (Port 8000) - main.py           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  CORS Middleware │ JWT Auth │ Route Dispatching      │  │
│  └──────────────────────────────────────────────────────┘  │
└───────┬──────────┬──────────┬──────────┬───────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   Auth   │ │  Course  │ │  Video   │ │Progress/ │
│ Service  │ │ Service  │ │ Service  │ │Attendance│
│          │ │          │ │          │ │ Service  │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   PostgreSQL Database │
        │  ┌─────────────────┐  │
        │  │ user            │  │
        │  │ course          │  │
        │  │ course_video    │  │
        │  │ course_status   │  │
        │  │ progress        │  │
        │  │ attendance      │  │
        │  └─────────────────┘  │
        └───────────────────────┘
```

**Architecture Pattern:** Microservices with API Gateway
- **Frontend:** React SPA with client-side routing
- **Backend:** FastAPI monolith with service separation (modular microservices)
- **Database:** PostgreSQL with SQLAlchemy ORM
- **Auth:** JWT tokens stored in localStorage
- **External:** YouTube IFrame API for video playback

## 3. Main Flow: Login → Course → Video → Progress → DB

### Flow Diagram

```
1. LOGIN FLOW
   ┌─────────┐      POST /auth/login      ┌──────────┐
   │  Login  │ ──────────────────────────>│  Auth   │
   │   UI    │ <──────────────────────────│ Service │
   └────┬────┘   JWT Token + User Data    └────┬─────┘
        │                                      │
        │ Store token in localStorage          │
        │ Dispatch 'tokenUpdated' event        │
        │                                      │
        ▼                                      ▼
   ┌─────────┐                          ┌──────────┐
   │  App.js │                          │Database  │
   │ Router  │                          │  user    │
   └────┬────┘                          └──────────┘
        │
        │ Navigate to /dashboard
        ▼
   ┌──────────┐
   │Dashboard │
   └────┬─────┘

2. COURSE DISCOVERY
   ┌──────────┐     GET /courses         ┌──────────┐
   │Dashboard │ ────────────────────────>│ Course   │
   │          │ <────────────────────────│ Service  │
   └────┬─────┘   Course List + Thumbnails└────┬─────┘
        │                                      │
        │ GET /courses/{id}/videos             │
        │ (for thumbnails)                     │
        │                                      ▼
        │                                 ┌──────────┐
        │                                 │Database  │
        │                                 │ course   │
        │                                 │course_   │
        │                                 │ video    │
        │                                 └──────────┘
        │
        │ User clicks "Register" or "View Course"
        ▼
   ┌──────────┐     POST /courses/{id}/register
   │Course    │ ────────────────────────────────>
   │Catalog   │ <────────────────────────────────
   └────┬─────┘     Registration confirmed
        │
        │ Navigate to /course/{id}
        ▼
   ┌────────────┐
   │CourseDetail│
   └─────┬──────┘

3. VIDEO PLAYBACK
   ┌────────────┐    GET /courses/{id}/videos  ┌──────────┐
   │CourseDetail│ ────────────────────────────>│ Course   │
   │            │ <────────────────────────────│ Service  │
   └─────┬──────┘   Video List (YouTube URLs)  └────┬─────┘
         │                                          │
         │ Load YouTube IFrame API                 │
         │ Initialize player with first video      │
         │                                          ▼
         │                                    ┌──────────┐
         │                                    │Database  │
         │                                    │course_   │
         │                                    │ video    │
         │                                    └──────────┘
         │
         │ User clicks play
         ▼
   ┌─────────────────┐
   │ YouTube Player  │
   │ (IFrame API)    │
   └────────┬────────┘
            │
            │ onStateChange: PLAYING
            ▼
   ┌─────────────────┐
   │ Progress Tracker│
   └────────┬────────┘

4. PROGRESS TRACKING
   ┌─────────────────┐
   │ Progress Tracker│
   │ (CourseDetail)  │
   └────────┬────────┘
            │
            │ Video starts playing
            │ POST /progress
            │ { video_id, start_time }
            ▼
   ┌──────────┐                          ┌──────────┐
   │Progress  │ ────────────────────────>│Database  │
   │Service   │                          │ progress │
   └────┬─────┘   Create/Update record   └──────────┘
        │
        │ Video paused/ended
        │ POST /progress
        │ { video_id, end_time, watchtime_seconds }
        │
        │ Calculate: watchtime = end_time - start_time
        │ Accumulate with existing watch_time
        ▼
   ┌──────────┐                          ┌──────────┐
   │Progress  │ ────────────────────────>│Database  │
   │Service   │                          │ progress │
   └──────────┘   Update watch_time     └────┬─────┘
                                              │
                                              │ Daily aggregation
                                              ▼
                                        ┌──────────┐
                                        │Database  │
                                        │attendance│
                                        │ (auto)   │
                                        └──────────┘

5. DATABASE WRITES
   ┌─────────────────────────────────────────────────┐
   │ PostgreSQL Database                              │
   │                                                  │
   │ progress table:                                 │
   │   - user_id, video_id, date                     │
   │   - start_time (TIME)                           │
   │   - end_time (TIME)                           │
   │   - watch_time (INTERVAL) - accumulated         │
   │                                                  │
   │ attendance table (auto-calculated):              │
   │   - user_id, date                                │
   │   - total_time (INTERVAL) - sum of watch_time   │
   │   - status (present/absent)                     │
   └─────────────────────────────────────────────────┘
```

### Step-by-Step Flow

**Step 1: Login**
- User enters credentials in `Login.js`
- `api.js` → POST `/auth/login` → `auth_service.py`
- Backend validates → Returns JWT token + user data
- Frontend stores token in `localStorage`
- `App.js` detects token → Routes to `/dashboard`

**Step 2: Course Selection**
- `Dashboard.js` → GET `/courses` → `course_service.py`
- Fetches course list from `course` table
- For each course, fetches first video thumbnail
- User clicks "Register" → POST `/courses/{id}/register`
- Creates entry in `course_status` table

**Step 3: Video Playback**
- Navigate to `/course/{id}` → `CourseDetail.js`
- GET `/courses/{id}/videos` → Returns videos from `course_video` table
- Loads YouTube IFrame API
- Initializes player with first video URL

**Step 4: Progress Tracking**
- **On Play:** 
  - YouTube player fires `onStateChange(PLAYING)`
  - POST `/progress` with `{video_id, start_time}` 
  - Creates/updates `progress` record with `start_time`
  
- **On Pause/End:**
  - Calculate `watchtime_seconds = end_time - start_time`
  - POST `/progress` with `{video_id, end_time, watchtime_seconds}`
  - Updates `progress.watch_time` (accumulated INTERVAL)
  - Backend auto-calculates `attendance.total_time` for the day

**Step 5: Database State**
- `progress` table: Multiple records per video per day (each play session)
- `attendance` table: One record per user per day (aggregated from progress)
- Watch time accumulates across multiple play/pause cycles
- Attendance status calculated based on minimum watch time threshold

---

**Key Technologies:**
- **Frontend:** React 18, React Router, Axios, YouTube IFrame API
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, JWT
- **Pattern:** Microservices architecture with API Gateway
- **State Management:** React hooks (useState, useEffect, useRef, useCallback)
- **Auth:** JWT tokens in localStorage with event-based sync
