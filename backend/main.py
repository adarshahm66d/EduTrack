from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from models import User, Course, CourseVideo, CourseStatus  # Import models to ensure tables are created
from auth_service import router as auth_router
from course_service import router as course_router
from video_service import router as video_router

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EduTrack API Gateway", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include service routers
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(video_router)

@app.get("/")
def read_root():
    return {
        "message": "EduTrack API Gateway",
        "services": {
            "auth": "/auth",
            "courses": "/courses",
            "videos": "/videos"
        },
        "health": {
            "auth": "/auth/health",
            "courses": "/courses/health",
            "videos": "/videos/health"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "gateway": "running"}
