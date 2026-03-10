from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from sqlalchemy.orm import outerjoin
from datetime import datetime, timedelta, date
from typing import Optional
import secrets
from models import User, Attendance
from schemas import (
    UserSignup, UserLogin, UserResponse, Token, PaginatedResponse,
    ForgotPasswordRequest, ResetPasswordRequest, PasswordResetResponse
)
from database import get_db
from auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """Register a new user"""
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    existing_username = db.query(User).filter(User.user_name == user_data.user_name).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    if not user_data.role or user_data.role == "student":
        detected_role = "admin" if "admin" in user_data.email.lower() else "student"
    else:
        detected_role = user_data.role
    
    hashed_password = get_password_hash(user_data.password)
    
    # Parse date_of_birth if provided
    date_of_birth_obj = None
    if user_data.date_of_birth:
        try:
            date_of_birth_obj = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        user_name=user_data.user_name,
        password=hashed_password,
        role=detected_role,
        phone=user_data.phone,
        date_of_birth=date_of_birth_obj
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    user = db.query(User).filter(User.user_name == credentials.user_name).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.user_name, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/users/students", response_model=PaginatedResponse)
def get_all_students(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name, email, or username"),
    sort_by: Optional[str] = Query("id", description="Field to sort by (id, name, email, user_name, created_at, attendance)"),
    sort_order: Optional[str] = Query("asc", regex="^(asc|desc)$", description="Sort order"),
    attendance_date: Optional[str] = Query(None, description="Date for attendance sorting (YYYY-MM-DD)")
):
    """Get all students with pagination, sorting, and search"""
    query = db.query(User).filter(User.role == 'student')
    
    # Apply search filter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(User.name).like(search_term),
                func.lower(User.email).like(search_term),
                func.lower(User.user_name).like(search_term)
            )
        )
    
    # Handle attendance sorting - need to join with Attendance table
    if sort_by == "attendance":
        # Use provided date or default to today
        date_to_use = attendance_date
        if not date_to_use:
            date_to_use = datetime.utcnow().date().isoformat()
        
        try:
            attendance_date_obj = datetime.strptime(date_to_use, "%Y-%m-%d").date()
            # Join with Attendance table using outerjoin to include users without attendance
            query = query.outerjoin(
                Attendance,
                (Attendance.user_id == User.id) & (Attendance.date == attendance_date_obj)
            )
            # Sort by total_time (treat NULL as 0 seconds)
            if sort_order == "desc":
                query = query.order_by(
                    case(
                        (Attendance.total_time.is_(None), 0),
                        else_=func.extract('epoch', Attendance.total_time)
                    ).desc(),
                    User.id.asc()  # Secondary sort for consistency
                )
            else:
                query = query.order_by(
                    case(
                        (Attendance.total_time.is_(None), 0),
                        else_=func.extract('epoch', Attendance.total_time)
                    ).asc(),
                    User.id.asc()  # Secondary sort for consistency
                )
        except ValueError:
            # Invalid date format, fall back to created_at sorting
            if sort_order == "desc":
                query = query.order_by(User.created_at.desc())
            else:
                query = query.order_by(User.created_at.asc())
    else:
        # Apply other sorting options
        if sort_by == "name":
            if sort_order == "desc":
                query = query.order_by(User.name.desc())
            else:
                query = query.order_by(User.name.asc())
        elif sort_by == "email":
            if sort_order == "desc":
                query = query.order_by(User.email.desc())
            else:
                query = query.order_by(User.email.asc())
        elif sort_by == "user_name":
            if sort_order == "desc":
                query = query.order_by(User.user_name.desc())
            else:
                query = query.order_by(User.user_name.asc())
        elif sort_by == "created_at":
            if sort_order == "desc":
                query = query.order_by(User.created_at.desc())
            else:
                query = query.order_by(User.created_at.asc())
        else:  # Default to id
            if sort_order == "desc":
                query = query.order_by(User.id.desc())
            else:
                query = query.order_by(User.id.asc())
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    skip = (page - 1) * page_size
    students = query.offset(skip).limit(page_size).all()
    
    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    return {
        "items": students,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/users", response_model=list[UserResponse])
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    users = db.query(User).all()
    return users

@router.get("/users/me", response_model=UserResponse)
def get_current_user_endpoint(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

@router.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token"""
    user = db.query(User).filter(User.email == request.email).first()
    
    # Always return success message (security best practice - don't reveal if email exists)
    if not user:
        return {
            "message": "If an account with that email exists, a password reset token has been generated.",
            "reset_token": None
        }
    
    # Generate a secure random token
    reset_token = secrets.token_urlsafe(32)
    reset_token_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    # Store token in database
    user.reset_token = reset_token
    user.reset_token_expires = reset_token_expires
    db.commit()
    
    # In production, send token via email
    # For development, return the token (remove this in production)
    import os
    is_development = os.getenv("ENVIRONMENT", "development") == "development"
    
    return {
        "message": "Password reset token generated. Check your email for instructions.",
        "reset_token": reset_token if is_development else None
    }

@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a reset token"""
    # Validate password length
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Find user by reset token
    user = db.query(User).filter(User.reset_token == request.token).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token has expired
    if user.reset_token_expires and user.reset_token_expires < datetime.utcnow():
        # Clear expired token
        user.reset_token = None
        user.reset_token_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )
    
    # Update password
    user.password = get_password_hash(request.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    
    return {
        "message": "Password has been reset successfully. You can now login with your new password.",
        "reset_token": None
    }

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "auth-service"}
