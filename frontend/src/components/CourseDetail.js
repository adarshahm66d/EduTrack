import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourse, getCourseVideos, updateVideoProgress } from '../api';
import VideoPlayer from './VideoPlayer';
import './CourseDetail.css';

const CourseDetail = () => {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
    const [playlistSearch, setPlaylistSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const watchStartTimeRef = useRef(null);
    const progressIntervalRef = useRef(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setLoading(true);
                const [courseData, videosData] = await Promise.all([
                    getCourse(courseId),
                    getCourseVideos(courseId)
                ]);
                setCourse(courseData);
                setVideos(videosData);
                if (videosData.length > 0) {
                    setSelectedVideo(videosData[0]);
                    setSelectedVideoIndex(0);
                }
            } catch (err) {
                setError('Failed to load course. Please try again.');
                console.error('Error fetching course:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId]);

    const extractVideoId = (url) => {
        if (!url) return null;

        if (url.includes('googlevideo.com')) {
            console.warn('Direct playback URL detected, cannot extract video ID:', url);
            return null;
        }

        let match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) return match[1];

        if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
            return url.trim();
        }

        return null;
    };

    const handleVideoSelect = (video, index) => {
        setSelectedVideo(video);
        setSelectedVideoIndex(index);
        // Scroll to top of video player
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleNextVideo = () => {
        if (selectedVideoIndex < videos.length - 1) {
            const nextIndex = selectedVideoIndex + 1;
            handleVideoSelect(videos[nextIndex], nextIndex);
        }
    };

    const handlePreviousVideo = () => {
        if (selectedVideoIndex > 0) {
            const prevIndex = selectedVideoIndex - 1;
            handleVideoSelect(videos[prevIndex], prevIndex);
        }
    };

    const handleVideoEnd = () => {
        // Auto-play next video when current video ends
        if (selectedVideoIndex < videos.length - 1) {
            handleNextVideo();
        }
    };

    const handleProgressUpdate = async (courseId, videoId, watchTime) => {
        try {
            await updateVideoProgress(courseId, videoId, watchTime);
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    const handleVideoStart = () => {
        // Start tracking watch time when video starts playing
        watchStartTimeRef.current = Date.now();
        
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        
        progressIntervalRef.current = setInterval(() => {
            if (watchStartTimeRef.current && selectedVideo) {
                const elapsedSeconds = Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
                if (elapsedSeconds >= 10) {
                    // Update progress after 10 seconds
                    handleProgressUpdate(parseInt(courseId), selectedVideo.id, elapsedSeconds);
                }
            }
        }, 5000); // Check every 5 seconds
    };

    useEffect(() => {
        // Clean up interval on unmount
        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="course-detail-loading">
                <div className="loading-spinner">Loading course...</div>
            </div>
        );
    }

    if (error || !course) {
        return (
            <div className="course-detail-error">
                <p>{error || 'Course not found'}</p>
                <Link to="/dashboard" className="btn-back">Back to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="course-detail">
            <nav className="course-nav">
                <div className="nav-container">
                    <Link to="/dashboard" className="logo-link">
                        <h1>EduTrack</h1>
                    </Link>
                    <div className="nav-links">
                        <Link to="/dashboard" className="nav-link">Back to Dashboard</Link>
                    </div>
                </div>
            </nav>

            <div className="course-content">
                <div className="course-header">
                    <h1 className="course-title">{course.course_title}</h1>
                    {course.link && (
                        <p className="course-playlist-info">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="9"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            YouTube Playlist Course
                        </p>
                    )}
                </div>

                <div className="course-main">
                    <div className="video-section">
                        {selectedVideo && (
                            <div className="video-player-container">
                                <VideoPlayer
                                    videoId={extractVideoId(selectedVideo.video_link)}
                                    videoUrl={selectedVideo.video_link}
                                    onVideoEnd={handleVideoEnd}
                                    courseId={parseInt(courseId)}
                                    videoDbId={selectedVideo.id}
                                    onProgressUpdate={handleProgressUpdate}
                                    onVideoStart={handleVideoStart}
                                />
                                <div className="video-info">
                                    <div className="video-info-header">
                                        <h2 className="current-video-title">{selectedVideo.title}</h2>
                                        <div className="video-navigation">
                                            <button
                                                className="nav-video-btn"
                                                onClick={handlePreviousVideo}
                                                disabled={selectedVideoIndex === 0}
                                                title="Previous video"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="15 18 9 12 15 6"></polyline>
                                                </svg>
                                                Previous
                                            </button>
                                            <span className="video-counter">
                                                {selectedVideoIndex + 1} / {videos.length}
                                            </span>
                                            <button
                                                className="nav-video-btn"
                                                onClick={handleNextVideo}
                                                disabled={selectedVideoIndex === videos.length - 1}
                                                title="Next video"
                                            >
                                                Next
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {!selectedVideo && videos.length === 0 && (
                            <div className="no-videos">
                                <p>No videos available for this course.</p>
                            </div>
                        )}
                    </div>

                    <div className="video-list-section">
                        <div className="video-list-header">
                            <h3 className="video-list-title">Course Videos ({videos.length})</h3>
                            {videos.length > 5 && (
                                <div className="playlist-search">
                                    <input
                                        type="text"
                                        placeholder="Search videos..."
                                        value={playlistSearch}
                                        onChange={(e) => setPlaylistSearch(e.target.value)}
                                        className="playlist-search-input"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="video-list">
                            {videos
                                .filter((video) => 
                                    playlistSearch === '' || 
                                    video.title.toLowerCase().includes(playlistSearch.toLowerCase())
                                )
                                .map((video, index) => {
                                const originalIndex = videos.indexOf(video);
                                const videoId = extractVideoId(video.video_link);
                                const isSelected = selectedVideo && selectedVideo.id === video.id;
                                return (
                                    <div
                                        key={video.id}
                                        className={`video-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => handleVideoSelect(video, originalIndex)}
                                    >
                                        <div className="video-item-number">{originalIndex + 1}</div>
                                        <div className="video-item-thumbnail">
                                            {videoId ? (
                                                <img
                                                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                                    alt={video.title}
                                                    onError={(e) => {
                                                        e.target.src = 'https://via.placeholder.com/160x90?text=Video';
                                                    }}
                                                />
                                            ) : (
                                                <div className="thumbnail-placeholder">📹</div>
                                            )}
                                        </div>
                                        <div className="video-item-info">
                                            <h4 className="video-item-title">{video.title}</h4>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetail;
