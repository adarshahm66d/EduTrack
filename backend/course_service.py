from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import Course, CourseVideo, VideoProgress
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

@router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete a course and all associated videos and progress"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    try:
        # Delete all video progress for this course
        db.query(VideoProgress).filter(VideoProgress.course_id == course_id).delete()
        
        # Delete all videos for this course
        db.query(CourseVideo).filter(CourseVideo.course_id == course_id).delete()
        
        # Delete the course
        db.delete(course)
        db.commit()
        
        return {"message": "Course deleted successfully", "course_id": course_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting course: {str(e)}"
        )

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "course-service"}
