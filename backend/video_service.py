from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import CourseVideo, Course
from schemas import CourseVideoResponse, YouTubePlaylistRequest, CourseResponse
from database import get_db
import yt_dlp
import re

router = APIRouter(prefix="/videos", tags=["Videos"])

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

@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "video-service"}
