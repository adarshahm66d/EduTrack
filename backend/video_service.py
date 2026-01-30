from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from models import CourseVideo, Course, VideoProgress, User
from schemas import CourseVideoResponse, YouTubePlaylistRequest, CourseResponse, VideoProgressRequest, VideoProgressResponse, CourseProgressResponse
from database import get_db
from auth import verify_token
import yt_dlp
import re

router = APIRouter(prefix="/videos", tags=["Videos"])

def get_current_user_id(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Get current user ID from authorization token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User ID not found in token"
            )
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

@router.get("/course/{course_id}", response_model=list[CourseVideoResponse])
def get_course_videos(course_id: int, db: Session = Depends(get_db)):
    """Get all videos for a specific course"""
    videos = db.query(CourseVideo).filter(CourseVideo.course_id == course_id).all()
    return videos

@router.post("/youtube-playlist", response_model=CourseResponse)
def add_youtube_playlist(playlist_data: YouTubePlaylistRequest, db: Session = Depends(get_db)):
    """Add a course from YouTube playlist URL"""
    try:
        playlist_url = playlist_data.playlist_url
        playlist_id_match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', playlist_url)
        
        if not playlist_id_match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid YouTube playlist URL"
            )
        
        playlist_id = playlist_id_match.group(1)
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                playlist_info = ydl.extract_info(playlist_url, download=False)
                
                if not playlist_info:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Could not extract playlist information"
                    )
                
                playlist_title = playlist_info.get('title', 'Untitled Playlist')
                
                new_course = Course(
                    course_title=playlist_title,
                    link=playlist_url
                )
                db.add(new_course)
                db.flush()
                
                entries = playlist_info.get('entries', [])
                
                if not entries:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No videos found in playlist"
                    )
                
                for entry in entries:
                    if entry:
                        video_title = entry.get('title', 'Untitled Video')
                        video_id = entry.get('id')
                        
                        if video_id:
                            video_url = f"https://www.youtube.com/watch?v={video_id}"
                        else:
                            webpage_url = entry.get('webpage_url') or entry.get('url') or ''
                            if 'youtube.com/watch' in webpage_url or 'youtu.be' in webpage_url:
                                video_url = webpage_url.split('&')[0].split('?si=')[0]
                            else:
                                continue
                        
                        new_video = CourseVideo(
                            course_id=new_course.id,
                            title=video_title,
                            video_link=video_url
                        )
                        db.add(new_video)
                
                db.commit()
                db.refresh(new_course)
                
                return new_course
                
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error extracting playlist: {str(e)}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing playlist: {str(e)}"
        )

@router.post("/progress", response_model=VideoProgressResponse)
def update_video_progress(
    progress_data: VideoProgressRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Update or create video watch progress"""
    existing_progress = db.query(VideoProgress).filter(
        VideoProgress.user_id == user_id,
        VideoProgress.course_id == progress_data.course_id,
        VideoProgress.video_id == progress_data.video_id
    ).first()
    
    if existing_progress:
        existing_progress.watch_time = max(existing_progress.watch_time, progress_data.watch_time)
    else:
        new_progress = VideoProgress(
            user_id=user_id,
            course_id=progress_data.course_id,
            video_id=progress_data.video_id,
            watch_time=progress_data.watch_time
        )
        db.add(new_progress)
        existing_progress = new_progress
    
    db.commit()
    db.refresh(existing_progress)
    
    return {
        "course_id": existing_progress.course_id,
        "video_id": existing_progress.video_id,
        "watch_time": existing_progress.watch_time,
        "last_updated": existing_progress.last_updated
    }

@router.get("/course/{course_id}/progress", response_model=CourseProgressResponse)
def get_course_progress(
    course_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get total watch progress for a course"""
    progress_records = db.query(VideoProgress).filter(
        VideoProgress.user_id == user_id,
        VideoProgress.course_id == course_id
    ).all()
    
    total_watch_time = sum(record.watch_time for record in progress_records)
    has_progress = total_watch_time >= 10  # 10 seconds threshold
    
    return {
        "course_id": course_id,
        "total_watch_time": total_watch_time,
        "has_progress": has_progress
    }

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "video-service"}
