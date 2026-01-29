from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import Course
from schemas import CourseResponse
from database import get_db

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("", response_model=list[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    """Get all courses for the catalog"""
    courses = db.query(Course).all()
    return courses

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get a specific course by ID"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "course-service"}
