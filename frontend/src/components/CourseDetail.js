import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourse, getCourseVideos, getCurrentUser, getCourseRegistration, registerForCourse } from '../api';
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
    const [user, setUser] = useState(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [checkingRegistration, setCheckingRegistration] = useState(true);
    const [registering, setRegistering] = useState(false);

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                setLoading(true);
                setCheckingRegistration(true);
                
                // Get user info
                const userData = await getCurrentUser();
                setUser(userData);
                
                // Check registration if student
                if (userData.role === 'student') {
                    try {
                        const registration = await getCourseRegistration(courseId);
                        setIsRegistered(registration.enrolled);
                    } catch (err) {
                        console.error('Error checking registration:', err);
                        setIsRegistered(false);
                    }
                } else {
                    // Admin can always access
                    setIsRegistered(true);
                }
                
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
                setCheckingRegistration(false);
            }
        };

        fetchCourseData();
    }, [courseId]);
    
    const handleRegister = async () => {
        try {
            setRegistering(true);
            await registerForCourse(courseId);
            setIsRegistered(true);
        } catch (err) {
            console.error('Error registering for course:', err);
            alert(err.response?.data?.detail || 'Failed to register for course. Please try again.');
        } finally {
            setRegistering(false);
        }
    };

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

    // Show registration prompt for students who haven't registered
    if (user?.role === 'student' && !checkingRegistration && !isRegistered) {
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
                    </div>
                    <div style={{ textAlign: 'center', padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
                        <h2>Registration Required</h2>
                        <p style={{ marginBottom: '2rem', color: '#666' }}>
                            You need to register for this course before you can access the videos.
                        </p>
                        <button 
                            className="btn-enroll"
                            onClick={handleRegister}
                            disabled={registering}
                            style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}
                        >
                            {registering ? 'Registering...' : 'Register for Course'}
                        </button>
                    </div>
                </div>
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
