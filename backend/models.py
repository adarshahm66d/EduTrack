from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "user"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    user_name = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String(50), default='student')

class Course(Base):
    __tablename__ = "course"
    
    id = Column(Integer, primary_key=True, index=True)
    course_title = Column(String(255), nullable=False)
    link = Column(Text)

class CourseVideo(Base):
    __tablename__ = "course_video"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    video_link = Column(Text)
