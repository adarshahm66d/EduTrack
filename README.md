# EduTrack - E-Learning Platform

A microservices-based e-learning platform built with FastAPI (backend) and React (frontend) that provides comprehensive course management, video playback, and attendance tracking.

## Architecture

EduTrack follows a microservices architecture with the following services:

- **Auth Service** - User authentication and authorization
- **Course Service** - Course management and registration
- **Video Service** - Video content management and YouTube playlist integration
- **Attendance Service** - Video progress tracking and attendance management
- **API Gateway** - Unified entry point for all services

## Tech Stack

### Backend
- FastAPI (Python)
- PostgreSQL
- SQLAlchemy (ORM)
- JWT Authentication
- yt-dlp (YouTube playlist extraction)

### Frontend
- React 18
- React Router
- Axios
- YouTube IFrame API
- Modern CSS with responsive design

## Project Structure

```
EduTrack/
├── backend/              # Backend microservices
│   ├── main.py          # API Gateway
│   ├── auth_service.py  # Authentication service
│   ├── course_service.py# Course service
│   ├── video_service.py # Video service
│   ├── attendance_service.py # Progress & Attendance service
│   ├── models.py        # Database models
│   ├── schemas.py       # Pydantic schemas
│   ├── database.py      # Database connection
│   ├── dependencies.py  # Dependency injection
│   ├── auth.py          # Auth utilities
│   ├── requirements.txt # Python dependencies
│   ├── Dockerfile       # Backend container image
│   └── .dockerignore    # Files to exclude from Docker build
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── AdminDashboard.js
│   │   │   ├── CourseCatalog.js
│   │   │   ├── CourseDetail.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Landing.js
│   │   │   ├── Login.js
│   │   │   ├── Signup.js
│   │   │   ├── StudentList.js
│   │   │   └── VideoPopup.js
│   │   ├── api.js       # API client
│   │   ├── App.js       # Main app component
│   │   └── global.css   # Global styles
|   ├── Dockerfile       # Frontend container image
│   └── .dockerignore    # Files to exclude from Docker build
│   ├── package.json     # Node dependencies
│   └── public/          # Static files
├── database/            # Database schemas
│   └── schema.sql 
├── cloudbuild.yaml      # GCP Cloud Build configuration for CI/CD
├── creat-pod.sh         # Podman pod creation script
├── README.md            # Main documentation
└── README_MICROSERVICES.md # Microservices documentation
```

## Quick Start

### Prerequisites
- Podman (or Docker)
- PostgreSQL
- Node.js 18+ (for local frontend development)
- Python 3.9+ (for local backend development)

### 1. Create Podman Pod
```bash
./creat-pod.sh
```

### 2. Apply Database Schema
```bash
podman exec -i database psql -U postgres -d edutrack < database/schema.sql
```

### 3. Install Backend Dependencies
```bash
podman exec -it backend /bin/sh -c "cd /app && pip install -r requirements.txt"
```

### 4. Start Backend (API Gateway)
```bash
podman exec -it backend /bin/sh -c "cd /app && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
```

### 5. Install Frontend Dependencies
```bash
podman exec -it frontend /bin/sh -c "cd /app && npm install"
```

### 6. Start Frontend
```bash
podman exec -it frontend /bin/sh -c "cd /app && npm start"
```

### 7. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Features

### User Management
- ✅ User registration and authentication
- ✅ Role-based access (Student/Admin)
- ✅ JWT token-based session management
- ✅ Secure password hashing

### Course Management
- ✅ Course catalog with search functionality
- ✅ Course registration for students
- ✅ Course deletion for admins
- ✅ YouTube playlist integration
- ✅ Course thumbnails and metadata
- ✅ Course detail expansion with descriptions

### Video Playback
- ✅ Embedded YouTube video player
- ✅ Video playlist navigation
- ✅ Auto-play next video
- ✅ Video progress indicators
- ✅ Interactive popups (feedback, rating, captcha)

### Progress Tracking
- ✅ **Real-time video watch time tracking**
- ✅ **Per-day progress records**
- ✅ **Automatic progress saving on:**
  - Video play start (creates entry with start_time)
  - Video pause (updates with end_time and watch_time)
  - Video end
  - Component unmount/video change
- ✅ **Accurate watch time calculation** (difference between start_time and end_time)
- ✅ **Progress accumulation** across multiple play sessions
- ✅ Progress visualization in video list

### Attendance Management
- ✅ Automatic attendance calculation based on watch time
- ✅ Daily attendance records
- ✅ Admin dashboard for viewing student attendance
- ✅ Attendance status tracking (present/absent)
- ✅ Minimum watch time requirements

### Admin Features
- ✅ Admin dashboard
- ✅ Student list with attendance overview
- ✅ Course management (add, delete courses)
- ✅ Attendance reports by date/user
- ✅ YouTube playlist integration for adding courses

### UI/UX
- ✅ Modern, clean interface
- ✅ Smooth navigation
- ✅ Loading states and error handling
- ✅ User-friendly forms and validation

## API Endpoints

### Authentication Service (`/auth`)
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/users/me` - Get current user
- `GET /auth/users/students` - Get all students (authenticated users)
- `GET /auth/users` - Get all users (admin only)
- `GET /auth/health` - Health check

### Course Service (`/courses`)
- `GET /courses` - Get all courses
- `GET /courses/{course_id}` - Get specific course
- `GET /courses/{course_id}/videos` - Get all videos for a course
- `POST /courses/{course_id}/register` - Register for course (student)
- `GET /courses/{course_id}/registration` - Check registration status
- `DELETE /courses/{course_id}` - Delete course and all associated data (admin only)
- `GET /courses/health` - Health check

### Video Service (`/videos`)
- `POST /videos/youtube-playlist` - Add YouTube playlist (admin only)
- `GET /videos/health` - Health check

**Note:** Course videos are accessed via `/courses/{course_id}/videos` endpoint in the Course Service.

### Attendance Service (`/progress`, `/attendance`)
- `POST /progress` - Track video watchtime progress
  - **Request body:**
    - `video_id` (required): Video ID
    - `start_time` (optional): Start time in HH:MM:SS format (sent on play)
    - `end_time` (optional): End time in HH:MM:SS format (sent on pause)
    - `watchtime_seconds` (optional): Watch time in seconds (calculated on pause)
- `GET /progress/video/{video_id}` - Get video progress for current user
- `GET /attendance/me` - Get current user's attendance
- `GET /attendance/user/{user_id}` - Get user attendance (admin only)
- `GET /attendance/date/{date}` - Get attendance by date (admin only)
- `GET /attendance/today` - Get today's attendance
- `POST /attendance/update-status` - Update attendance status based on watch time (admin only)
- `GET /progress/health` - Health check

## Progress Tracking System

The progress tracking system works as follows:

1. **First Play**: When a video is played for the first time in a day, the system creates a progress record with `start_time` only.

2. **First Pause**: When the video is paused for the first time, the system:
   - Updates the record with `end_time`
   - Calculates `watch_time` as the difference between `start_time` and `end_time`
   - Saves the watch time in seconds

3. **Subsequent Plays**: On subsequent plays, the system updates the `start_time` for the new session.

4. **Subsequent Pauses**: On subsequent pauses, the system:
   - Updates `end_time`
   - Calculates new watch time
   - **Accumulates** the new watch time with existing watch time

5. **Automatic Saving**: Progress is automatically saved when:
   - Video starts playing
   - Video is paused
   - Video ends
   - User switches to another video
   - Component unmounts (user navigates away)

## Adding a YouTube Playlist

### Via API
```bash
curl -X POST "http://localhost:8000/videos/youtube-playlist" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"playlist_url": "YOUR_PLAYLIST_URL"}'
```

### Via UI
1. Log in as an admin
2. Navigate to the Course Catalog
3. Click "Add Playlist"
4. Enter the YouTube playlist URL
5. Submit the form

## Development

### Hot Reload
The application uses hot reload for both frontend and backend:
- Frontend: Automatic reload on file changes (with polling enabled)
- Backend: Uvicorn with `--reload` flag

### Code Quality
- ESLint for frontend code quality
- React Hooks best practices
- Clean, maintainable code structure
- Proper error handling

## Database Schema

The application uses PostgreSQL with the following main tables:
- `user` - User accounts (note: table name is "user" not "users")
- `course` - Course information
- `course_video` - Video content
- `progress` - Video watch time tracking (per day, per video, per user)
- `attendance` - Daily attendance records
- `course_status` - Student course enrollments (tracks registration status)

## Security

- JWT token authentication
- Password hashing with bcrypt
- Role-based access control
- CORS configuration
- Input validation
- SQL injection prevention (SQLAlchemy ORM)

## Deployment

### Google Cloud Platform (GCP) Deployment

EduTrack can be deployed to GCP using Cloud Run and Cloud SQL:

#### Prerequisites
- GCP account with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud Run and Cloud SQL APIs enabled

#### Quick Deployment Steps

1. **Set up Cloud SQL Database:**
   ```bash
   gcloud sql instances create edutrack-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=YOUR_Reagion\
     --root-password=YOUR_SECURE_PASSWORD
   
   gcloud sql databases create edutrack --instance=edutrack-db
   gcloud sql users create postgres --instance=edutrack-db --password=postgres
   ```

2. **Apply Database Schema:**
   ```bash
   gcloud sql connect edutrack-db --user=postgres
   # Then run: \c edutrack and paste database/schema.sql
   ```

3. **Deploy Backend:**
   ```bash
   cd backend
   gcloud run deploy edutrack-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --add-cloudsql-instances=PROJECT_ID:YOUR_Reagion:edutrack-db \
     --set-env-vars="DATABASE_URL=postgresql://postgres:postgres@/edutrack?host=/cloudsql/PROJECT_ID:us-central1:edutrack-db,SECRET_KEY=your-secret-key"
   ```

4. **Deploy Frontend:**
   ```bash
   cd frontend
   BACKEND_URL=$(gcloud run services describe edutrack-backend --region us-central1 --format="value(status.url)")
   docker build --build-arg REACT_APP_API_URL=$BACKEND_URL -t gcr.io/PROJECT_ID/edutrack-frontend:latest .
   docker push gcr.io/PROJECT_ID/edutrack-frontend:latest
   gcloud run deploy edutrack-frontend \
     --image gcr.io/PROJECT_ID/edutrack-frontend:latest \
     --region us-central1 \
     --allow-unauthenticated
   ```

#### Automated Deployment with Cloud Build

The project includes `cloudbuild.yaml` for automated CI/CD:

1. **Connect GitHub Repository:**
   - Go to Cloud Console → Cloud Build → Triggers
   - Connect your GitHub repository

2. **Create Build Trigger:**
   ```bash
   gcloud builds triggers create github \
     --name=edutrack-deploy \
     --repo-name=EduTrack \
     --repo-owner=YOUR_USERNAME \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

3. **Push to main branch** - Deployment happens automatically!

For detailed deployment instructions, see the deployment section in the project repository.

## Documentation

For detailed microservices documentation, see [README_MICROSERVICES.md](README_MICROSERVICES.md)

## License

This project is part of an educational platform demonstration.
