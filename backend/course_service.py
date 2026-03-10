from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from models import Course, CourseVideo, User, CourseStatus
from schemas import CourseResponse, CourseVideoResponse, CourseRegistrationResponse, PaginatedResponse
from database import get_db
from dependencies import get_current_user, get_current_user_optional, get_current_user_id

router = APIRouter(prefix="/courses", tags=["Courses"])

@router.get("", response_model=PaginatedResponse)
def get_courses(
    current_user: User = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for course title"),
    sort_by: Optional[str] = Query("id", description="Field to sort by (id, course_title)"),
    sort_order: Optional[str] = Query("asc", regex="^(asc|desc)$", description="Sort order")
):
    """Get all courses for the catalog with pagination, sorting, and search"""
    query = db.query(Course)
    
    # Apply search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(func.lower(Course.course_title).like(search_term))
    
    # Get total count before pagination
    total = query.count()
    
    # Apply sorting
    if sort_by == "course_title":
        if sort_order == "desc":
            query = query.order_by(Course.course_title.desc())
        else:
            query = query.order_by(Course.course_title.asc())
    else:  # Default to id
        if sort_order == "desc":
            query = query.order_by(Course.id.desc())
        else:
            query = query.order_by(Course.id.asc())
    
    # Apply pagination
    skip = (page - 1) * page_size
    courses = query.offset(skip).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return {
        "items": courses,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

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
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Register user for a course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if already registered
    existing_registration = db.query(CourseStatus).filter(
        CourseStatus.user_id == user_id,
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
                user_id=user_id,
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

@router.delete("/{course_id}/register", response_model=CourseRegistrationResponse)
def unregister_from_course(
    course_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Unregister user from a course"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check if registered
    existing_registration = db.query(CourseStatus).filter(
        CourseStatus.user_id == user_id,
        CourseStatus.course_id == course_id
    ).first()
    
    if not existing_registration or not existing_registration.enrolled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not registered for this course"
        )
    
    try:
        # Set enrolled to False instead of deleting the record
        # This preserves the registration history
        existing_registration.enrolled = False
        db.commit()
        db.refresh(existing_registration)
        return {
            "course_id": course_id,
            "enrolled": False,
            "created_at": existing_registration.created_at
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unregistering from course: {str(e)}"
        )

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "course-service"}
