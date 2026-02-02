from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, time, datetime, timedelta
from models import Progress, User, CourseVideo, Attendance
from schemas import ProgressRequest, ProgressResponse, AttendanceResponse
from database import get_db
from dependencies import get_current_user_id, get_current_user
from typing import Optional

router = APIRouter(prefix="/progress", tags=["Progress"])
attendance_router = APIRouter(prefix="/attendance", tags=["Attendance"])

# 3 hours in seconds (change back to 10800 for production)
MINIMUM_ATTENDANCE_SECONDS = 30  # 10800 seconds for production (3 * 60 * 60)

@router.post("", response_model=ProgressResponse, status_code=status.HTTP_201_CREATED)
def track_progress(
    progress_data: ProgressRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Track video watchtime progress"""
    # Verify video exists
    video = db.query(CourseVideo).filter(CourseVideo.id == progress_data.video_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    today = date.today()
    
    # Helper function to ensure attendance exists
    def ensure_attendance():
        attendance = db.query(Attendance).filter(
            Attendance.user_id == user_id,
            Attendance.date == today
        ).first()
        
        if not attendance:
            # First video of the day - create attendance entry
            try:
                new_attendance = Attendance(
                    user_id=user_id,
                    date=today,
                    total_time=timedelta(0),
                    status="in progress"
                )
                db.add(new_attendance)
                db.commit()
                db.refresh(new_attendance)
                return new_attendance
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create attendance record: {str(e)}"
                )
        return attendance
    
    # Check if this is the first video of the day (when start_time is provided)
    # Create attendance record if it doesn't exist
    if progress_data.start_time:
        ensure_attendance()
    
    # Parse time strings if provided
    start_time_obj = None
    end_time_obj = None
    
    if progress_data.start_time:
        try:
            start_time_obj = datetime.strptime(progress_data.start_time, "%H:%M:%S").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_time format. Use HH:MM:SS"
            )
    
    if progress_data.end_time:
        try:
            end_time_obj = datetime.strptime(progress_data.end_time, "%H:%M:%S").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_time format. Use HH:MM:SS"
            )
    
    # Calculate watch_time from watchtime_seconds if provided
    watch_time_delta = None
    if progress_data.watchtime_seconds is not None and progress_data.watchtime_seconds > 0:
        watch_time_delta = timedelta(seconds=progress_data.watchtime_seconds)
    
    # Check if progress record exists for today
    existing_progress = db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.video_id == progress_data.video_id,
        Progress.date == today
    ).first()
    
    if existing_progress:
        # Update existing record - accumulate watch_time
        if start_time_obj and not existing_progress.start_time:
            # Set first start_time of the day
            existing_progress.start_time = start_time_obj
        if end_time_obj:
            # Update to latest end_time
            existing_progress.end_time = end_time_obj
        
        # Accumulate watch_time
        if watch_time_delta:
            if existing_progress.watch_time:
                existing_progress.watch_time += watch_time_delta
            else:
                existing_progress.watch_time = watch_time_delta
        
        db.commit()
        db.refresh(existing_progress)
        
        # Ensure attendance exists (in case it wasn't created earlier)
        attendance = ensure_attendance()
        
        # Update attendance total_time - sum all watch_time from progress table for this user today
        total_watch_time = db.query(func.sum(Progress.watch_time)).filter(
            Progress.user_id == user_id,
            Progress.date == today
        ).scalar()
        
        # Convert to timedelta if it's not already (handles PostgreSQL INTERVAL type)
        if total_watch_time is None:
            total_watch_time = timedelta(0)
        elif not isinstance(total_watch_time, timedelta):
            # If it's a string or other type, try to convert
            total_watch_time = timedelta(seconds=float(total_watch_time))
        
        attendance.total_time = total_watch_time
        
        # Check if total time >= 3 hours, update status to "present"
        total_seconds = total_watch_time.total_seconds()
        if total_seconds >= MINIMUM_ATTENDANCE_SECONDS:
            attendance.status = "present"
        
        db.commit()
        db.refresh(attendance)
        
        # Format watch_time as HH:MM:SS
        watch_time_str = None
        if existing_progress.watch_time:
            total_seconds = int(existing_progress.watch_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            watch_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        return {
            "id": existing_progress.id,
            "user_id": existing_progress.user_id,
            "video_id": existing_progress.video_id,
            "date": existing_progress.date.isoformat(),
            "start_time": existing_progress.start_time.strftime("%H:%M:%S") if existing_progress.start_time else None,
            "end_time": existing_progress.end_time.strftime("%H:%M:%S") if existing_progress.end_time else None,
            "watch_time": watch_time_str
        }
    else:
        # Create new progress record
        new_progress = Progress(
            user_id=user_id,
            video_id=progress_data.video_id,
            date=today,
            start_time=start_time_obj,
            end_time=end_time_obj,
            watch_time=watch_time_delta
        )
        db.add(new_progress)
        db.commit()
        db.refresh(new_progress)
        
        # Ensure attendance exists (in case it wasn't created earlier)
        attendance = ensure_attendance()
        
        # Update attendance total_time - sum all watch_time from progress table for this user today
        total_watch_time = db.query(func.sum(Progress.watch_time)).filter(
            Progress.user_id == user_id,
            Progress.date == today
        ).scalar()
        
        # Convert to timedelta if it's not already (handles PostgreSQL INTERVAL type)
        if total_watch_time is None:
            total_watch_time = timedelta(0)
        elif not isinstance(total_watch_time, timedelta):
            # If it's a string or other type, try to convert
            total_watch_time = timedelta(seconds=float(total_watch_time))
        
        attendance.total_time = total_watch_time
        
        # Check if total time >= 3 hours, update status to "present"
        total_seconds = total_watch_time.total_seconds()
        if total_seconds >= MINIMUM_ATTENDANCE_SECONDS:
            attendance.status = "present"
        
        db.commit()
        db.refresh(attendance)
        
        # Format watch_time as HH:MM:SS
        watch_time_str = None
        if new_progress.watch_time:
            total_seconds = int(new_progress.watch_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            watch_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        return {
            "id": new_progress.id,
            "user_id": new_progress.user_id,
            "video_id": new_progress.video_id,
            "date": new_progress.date.isoformat(),
            "start_time": new_progress.start_time.strftime("%H:%M:%S") if new_progress.start_time else None,
            "end_time": new_progress.end_time.strftime("%H:%M:%S") if new_progress.end_time else None,
            "watch_time": watch_time_str
        }

@router.get("/video/{video_id}", response_model=list[ProgressResponse])
def get_video_progress(
    video_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get progress records for a specific video"""
    progress_records = db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.video_id == video_id
    ).order_by(Progress.date.desc()).all()
    
    result = []
    for p in progress_records:
        # Format watch_time as HH:MM:SS
        watch_time_str = None
        if p.watch_time:
            total_seconds = int(p.watch_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            watch_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "video_id": p.video_id,
            "date": p.date.isoformat(),
            "start_time": p.start_time.strftime("%H:%M:%S") if p.start_time else None,
            "end_time": p.end_time.strftime("%H:%M:%S") if p.end_time else None,
            "watch_time": watch_time_str
        })
    
    return result

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "progress-service"}

# ==================== ATTENDANCE ENDPOINTS ====================

@router.get("/attendance/me", response_model=list[AttendanceResponse])
@attendance_router.get("/me", response_model=list[AttendanceResponse])
def get_my_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's attendance records"""
    attendance_records = db.query(Attendance).filter(
        Attendance.user_id == current_user.id
    ).order_by(Attendance.date.desc()).all()
    
    # Format total_time as HH:MM:SS string
    result = []
    for attendance in attendance_records:
        total_time_str = None
        if attendance.total_time:
            total_seconds = int(attendance.total_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            total_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        result.append({
            "id": attendance.id,
            "user_id": attendance.user_id,
            "date": attendance.date.isoformat(),
            "total_time": total_time_str,
            "status": attendance.status
        })
    
    return result

@router.get("/attendance/user/{user_id}", response_model=list[AttendanceResponse])
@attendance_router.get("/user/{user_id}", response_model=list[AttendanceResponse])
def get_user_attendance(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records for a specific user (admin only)"""
    # Only admins can view other users' attendance
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view other users' attendance"
        )
    
    attendance_records = db.query(Attendance).filter(
        Attendance.user_id == user_id
    ).order_by(Attendance.date.desc()).all()
    
    # Format total_time as HH:MM:SS string
    result = []
    for attendance in attendance_records:
        total_time_str = None
        if attendance.total_time:
            total_seconds = int(attendance.total_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            total_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        result.append({
            "id": attendance.id,
            "user_id": attendance.user_id,
            "date": attendance.date.isoformat(),
            "total_time": total_time_str,
            "status": attendance.status
        })
    
    return result

@router.get("/attendance/date/{attendance_date}", response_model=list[AttendanceResponse])
@attendance_router.get("/date/{attendance_date}", response_model=list[AttendanceResponse])
def get_attendance_by_date(
    attendance_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get attendance records for a specific date (admin only)"""
    # Only admins can view attendance by date
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view attendance by date"
        )
    
    attendance_records = db.query(Attendance).filter(
        Attendance.date == attendance_date
    ).order_by(Attendance.user_id).all()
    
    # Format total_time as HH:MM:SS string
    result = []
    for attendance in attendance_records:
        total_time_str = None
        if attendance.total_time:
            total_seconds = int(attendance.total_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            total_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        result.append({
            "id": attendance.id,
            "user_id": attendance.user_id,
            "date": attendance.date.isoformat(),
            "total_time": total_time_str,
            "status": attendance.status
        })
    
    return result

@router.get("/attendance/today", response_model=AttendanceResponse)
@attendance_router.get("/today", response_model=AttendanceResponse)
def get_today_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's attendance record for current user"""
    today = date.today()
    attendance = db.query(Attendance).filter(
        and_(
            Attendance.user_id == current_user.id,
            Attendance.date == today
        )
    ).first()
    
    if not attendance:
        return {
            "id": 0,
            "user_id": current_user.id,
            "date": today.isoformat(),
            "total_time": None,
            "status": None
        }
    
    # Format total_time as HH:MM:SS string
    total_time_str = None
    if attendance.total_time:
        total_seconds = int(attendance.total_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        total_time_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    
    return {
        "id": attendance.id,
        "user_id": attendance.user_id,
        "date": attendance.date.isoformat(),
        "total_time": total_time_str,
        "status": attendance.status
    }

@router.post("/attendance/update-status")
@attendance_router.post("/update-status")
def update_attendance_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update attendance status based on total watch time (can be called at end of day)"""
    today = date.today()
    
    # Get all users who have attendance records for today
    attendance_records = db.query(Attendance).filter(
        Attendance.date == today
    ).all()
    
    updated_count = 0
    for attendance in attendance_records:
        if attendance.total_time and attendance.total_time.total_seconds() >= MINIMUM_ATTENDANCE_SECONDS:
            if attendance.status != "present":
                attendance.status = "present"
                updated_count += 1
    
    db.commit()
    
    return {
        "message": f"Updated {updated_count} attendance records to 'present' status",
        "date": today.isoformat()
    }
