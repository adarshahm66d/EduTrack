from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    user_name: str
    password: str
    role: Optional[str] = "student"
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None  # Format: YYYY-MM-DD

class UserLogin(BaseModel):
    user_name: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    user_name: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class CourseResponse(BaseModel):
    id: int
    course_title: str
    link: Optional[str] = None
    
    class Config:
        from_attributes = True

class CourseVideoResponse(BaseModel):
    id: int
    course_id: int
    title: str
    video_link: Optional[str] = None
    
    class Config:
        from_attributes = True

class YouTubePlaylistRequest(BaseModel):
    playlist_url: str

class CourseRegistrationResponse(BaseModel):
    course_id: int
    enrolled: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ProgressRequest(BaseModel):
    video_id: int
    start_time: Optional[str] = None  # Time as string "HH:MM:SS"
    end_time: Optional[str] = None     # Time as string "HH:MM:SS"
    watchtime_seconds: Optional[int] = None  # Watchtime in seconds (converted to watch_time INTERVAL in DB)

class ProgressResponse(BaseModel):
    id: int
    user_id: int
    video_id: int
    date: str  # Date as string
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    watch_time: Optional[str] = None  # Interval as string (e.g., "00:05:30")
    
    class Config:
        from_attributes = True

class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    date: str  # Date as string
    total_time: Optional[str] = None  # Interval as string (e.g., "03:00:00")
    status: Optional[str] = None  # "in progress", "present", etc.
    
    class Config:
        from_attributes = True

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PasswordResetResponse(BaseModel):
    message: str
    reset_token: Optional[str] = None  # Only returned in development mode
