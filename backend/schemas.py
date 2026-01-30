from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    user_name: str
    password: str
    role: Optional[str] = "student"

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

class VideoProgressRequest(BaseModel):
    course_id: int
    video_id: int
    watch_time: int  # Time in seconds

class VideoProgressResponse(BaseModel):
    course_id: int
    video_id: int
    watch_time: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

class CourseProgressResponse(BaseModel):
    course_id: int
    total_watch_time: int  # Total watch time across all videos in seconds
    has_progress: bool  # True if user has watched 10+ seconds
    
    class Config:
        from_attributes = True
