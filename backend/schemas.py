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
