from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User, Course, CourseVideo, CourseStatus, Progress, Attendance  # Import models to ensure tables are created
from auth_service import router as auth_router
from course_service import router as course_router
from video_service import router as video_router
from attendance_service import router as progress_router, attendance_router
import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduTrack API Gateway", version="1.0.0")

# CORS configuration - supports both local development and production
# Add your frontend URL here or set FRONTEND_URL environment variable
frontend_url = os.getenv("FRONTEND_URL", "")
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://edutrack-frontend-163165605136.us-central1.run.app",  # Add your fr
]
# Add frontend URL from environment variable if provided
if frontend_url:
    allowed_origins.append(frontend_url)

# Add common Cloud Storage and Cloud Run patterns
# Uncomment and update these if needed:
# allowed_origins.append("https://storage.googleapis.com")
# allowed_origins.append("https://your-frontend-bucket.storage.googleapis.com")
# allowed_origins.append("https://your-frontend-url.run.app")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include service routers
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(video_router)
app.include_router(progress_router)
app.include_router(attendance_router)  # Backward compatibility for /attendance/* routes

@app.get("/")
def read_root():
    return {
        "message": "EduTrack API Gateway",
        "services": {
            "auth": "/auth",
            "courses": "/courses",
            "videos": "/videos",
            "progress": "/progress",
            "attendance": "/attendance (also available at /progress/attendance)"
        },
        "health": {
            "auth": "/auth/health",
            "courses": "/courses/health",
            "videos": "/videos/health",
            "progress": "/progress/health"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "gateway": "running"}
