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

# CORS middleware
# Allow both local development and production frontend URLs
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://edutrack-frontend-163165605136.us-central1.run.app",  # Production frontend
        FRONTEND_URL,  # Additional URL from environment variable if set
    ],
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
