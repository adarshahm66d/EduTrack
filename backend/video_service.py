from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models import CourseVideo, Course, User
from schemas import CourseVideoResponse, YouTubePlaylistRequest, CourseResponse
from database import get_db
from dependencies import get_current_user
import yt_dlp
import re

router = APIRouter(prefix="/videos", tags=["Videos"])


@router.post("/youtube-playlist", response_model=CourseResponse)
def add_youtube_playlist(
    playlist_data: YouTubePlaylistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a course from YouTube playlist URL (admin only)"""
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    try:
        playlist_url = playlist_data.playlist_url.strip()
        
        # Convert watch URL with list parameter to proper playlist URL
        playlist_id_match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', playlist_url)
        if playlist_id_match:
            playlist_id = playlist_id_match.group(1)
            # Convert to proper playlist URL format
            if 'youtube.com/watch' in playlist_url:
                playlist_url = f"https://www.youtube.com/playlist?list={playlist_id}"
        else:
            # Check if it's already a playlist URL
            if 'youtube.com/playlist' not in playlist_url:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid YouTube playlist URL. Please provide a playlist URL or a watch URL with a list parameter."
                )
            playlist_id_match = re.search(r'[?&]list=([a-zA-Z0-9_-]+)', playlist_url)
            if not playlist_id_match:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid YouTube playlist URL. Could not extract playlist ID."
                )
            playlist_id = playlist_id_match.group(1)
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Use flat extraction for faster processing
            'ignoreerrors': True,  # Continue even if some videos fail
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            'extractor_args': {
                'youtube': {
                    'player_client': ['android'],  # Use Android client which is less likely to be blocked
                }
            },
            'socket_timeout': 30,
            'retries': 3,  # Retry failed requests
        }
        
        # Try extraction with different options if first attempt fails
        playlist_info = None
        extraction_attempts = [
            ydl_opts,  # First attempt with Android client
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['ios']}}},  # Fallback to iOS client
            {**ydl_opts, 'extractor_args': {'youtube': {'player_client': ['web']}}},  # Fallback to web client
        ]
        
        last_error = None
        for attempt_opts in extraction_attempts:
            try:
                with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                    playlist_info = ydl.extract_info(playlist_url, download=False)
                    if playlist_info:
                        break
            except Exception as e:
                last_error = e
                # If it's a 403 error, try next method
                if '403' in str(e) or 'Forbidden' in str(e):
                    continue
                # For other errors, raise immediately
                raise
        
        if not playlist_info:
            if last_error and ('403' in str(last_error) or 'Forbidden' in str(last_error)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="YouTube is blocking the request. This may be temporary. Please try again in a few minutes, or ensure the playlist is public and accessible."
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not extract playlist information: {str(last_error) if last_error else 'Unknown error'}. Please verify the playlist URL is correct and the playlist is public."
            )
        
        try:
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
                    detail="No videos found in playlist. The playlist may be empty, private, or the URL may be incorrect."
                )
            
            for entry in entries:
                if entry:
                    # With extract_flat=True, we get basic info
                    video_title = entry.get('title', 'Untitled Video')
                    video_id = entry.get('id')
                    
                    # Try to get video URL from various sources
                    if video_id:
                        video_url = f"https://www.youtube.com/watch?v={video_id}"
                    else:
                        # Try to extract from URL or webpage_url
                        webpage_url = entry.get('webpage_url') or entry.get('url') or ''
                        if 'youtube.com/watch' in webpage_url or 'youtu.be' in webpage_url:
                            video_url = webpage_url.split('&')[0].split('?si=')[0]
                        else:
                            # Skip if we can't get a valid URL
                            continue
                    
                    # Only add if we have a valid video URL
                    if video_url:
                        new_video = CourseVideo(
                            course_id=new_course.id,
                            title=video_title,
                            video_link=video_url
                        )
                        db.add(new_video)
            
            db.commit()
            db.refresh(new_course)
            
            return new_course
            
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            error_msg = str(e)
            # Provide more user-friendly error messages
            if "Private video" in error_msg or "private" in error_msg.lower():
                detail = "The playlist is private or unavailable. Please ensure the playlist is public."
            elif "unavailable" in error_msg.lower() or "not found" in error_msg.lower():
                detail = "Playlist not found or unavailable. Please check the URL."
            elif "extract" in error_msg.lower() or "download" in error_msg.lower():
                detail = f"Error extracting playlist: {error_msg}. Please verify the playlist URL is correct."
            else:
                detail = f"Error processing playlist: {error_msg}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
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
