from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import Course, CourseVideo, User, CourseStatus
from schemas import CourseResponse, CourseVideoResponse, CourseRegistrationResponse, EnrollmentCountResponse
from database import get_db
from dependencies import get_current_user, get_current_user_optional, get_current_user_id

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("", response_model=list[CourseResponse])
def get_courses(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all courses for the catalog (public, but tracks authenticated users)"""
    courses = db.query(Course).all()
    return courses

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific course by ID (requires authentication)"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course

@router.get("/{course_id}/videos", response_model=list[CourseVideoResponse])
def get_course_videos(
    course_id: int,
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Get all videos for a specific course (public, but tracks authenticated users)"""
    videos = db.query(CourseVideo).filter(CourseVideo.course_id == course_id).all()
    return videos

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a course and all associated videos and progress (admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    try:
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

@router.get("/enrollment/count", response_model=EnrollmentCountResponse)
def get_enrollment_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of courses the current user is enrolled in"""
    enrolled_count = db.query(CourseStatus).filter(
        CourseStatus.user_id == current_user.id,
        CourseStatus.enrolled == True
    ).count()
    
    return {
        "enrolled_count": enrolled_count,
        "max_enrollments": 3 if current_user.role == 'student' else None
    }

@router.get("/{course_id}/registration", response_model=CourseRegistrationResponse)
def get_course_registration(
    course_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Check if user is registered for a course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    registration = db.query(CourseStatus).filter(
        CourseStatus.user_id == user_id,
        CourseStatus.course_id == course_id
    ).first()
    
    if registration:
        return {
            "course_id": course_id,
            "enrolled": registration.enrolled,
            "created_at": registration.created_at
        }
    else:
        return {
            "course_id": course_id,
            "enrolled": False,
            "created_at": None
        }

@router.post("/{course_id}/register", response_model=CourseRegistrationResponse)
def register_for_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register user for a course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check enrollment limit for students only (admins have no limit)
    if current_user.role == 'student':
        # Count how many courses the student is currently enrolled in
        enrolled_count = db.query(CourseStatus).filter(
            CourseStatus.user_id == current_user.id,
            CourseStatus.enrolled == True
        ).count()
        
        # Check if already registered for this specific course
        existing_registration = db.query(CourseStatus).filter(
            CourseStatus.user_id == current_user.id,
            CourseStatus.course_id == course_id
        ).first()
        
        # If not already registered for this course, check the limit
        if not existing_registration or not existing_registration.enrolled:
            if enrolled_count >= 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can only be enrolled in a maximum of 3 courses. Please unenroll from a course before registering for a new one."
                )
    
    # Check if already registered
    existing_registration = db.query(CourseStatus).filter(
        CourseStatus.user_id == current_user.id,
        CourseStatus.course_id == course_id
    ).first()
    
    if existing_registration:
        if existing_registration.enrolled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Already registered for this course"
            )
        else:
            # Update existing record
            existing_registration.enrolled = True
            db.commit()
            db.refresh(existing_registration)
            return {
                "course_id": course_id,
                "enrolled": True,
                "created_at": existing_registration.created_at
            }
    else:
        # Create new registration
        try:
            new_registration = CourseStatus(
                user_id=current_user.id,
                course_id=course_id,
                enrolled=True
            )
            db.add(new_registration)
            db.commit()
            db.refresh(new_registration)
            return {
                "course_id": course_id,
                "enrolled": True,
                "created_at": new_registration.created_at
            }
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error registering for course: {str(e)}"
            )

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "course-service"}
