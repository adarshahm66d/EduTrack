# EduTrack - E-Learning Platform

A microservices-based e-learning platform built with FastAPI (backend) and React (frontend).

## Architecture

EduTrack follows a microservices architecture with the following services:

- **Auth Service** - User authentication and authorization
- **Course Service** - Course management
- **Video Service** - Video content management and YouTube playlist integration
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
- Modern CSS with responsive design

## Project Structure

```
EduTrack/
├── backend/              # Backend microservices
│   ├── main.py          # API Gateway
│   ├── auth_service.py # Authentication service
│   ├── course_service.py# Course service
│   ├── video_service.py # Video service
│   ├── models.py        # Database models
│   ├── schemas.py       # Pydantic schemas
│   ├── database.py      # Database connection
│   └── auth.py          # Auth utilities
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # React components
│       └── api.js       # API client
├── database/            # Database schemas
│   └── schema.sql
└── creat-pod.sh        # Podman pod creation script
```

## Quick Start

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
podman exec -it backend /bin/sh -c "cd /app && pip install -r requirments.txt"
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

## API Endpoints

### Authentication Service (`/auth`)
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/users/me` - Get current user
- `GET /auth/health` - Health check

### Course Service (`/courses`)
- `GET /courses` - Get all courses
- `GET /courses/{course_id}` - Get specific course
- `GET /courses/health` - Health check

### Video Service (`/videos`)
- `GET /videos/course/{course_id}` - Get course videos
- `POST /videos/youtube-playlist` - Add YouTube playlist
- `GET /videos/health` - Health check

## Features

- ✅ User authentication (Signup/Login)
- ✅ Course catalog
- ✅ YouTube playlist integration
- ✅ Embedded video player
- ✅ Responsive design
- ✅ Microservices architecture
- ✅ JWT token authentication

## Adding a YouTube Playlist

```bash
curl -X POST "http://localhost:8000/videos/youtube-playlist" \
  -H "Content-Type: application/json" \
  -d '{"playlist_url": "YOUR_PLAYLIST_URL"}'
```

## Development

The application uses hot reload for both frontend and backend:
- Frontend: Automatic reload on file changes (with polling enabled)
- Backend: Uvicorn with `--reload` flag

## Documentation

For detailed microservices documentation, see [README_MICROSERVICES.md](README_MICROSERVICES.md)
