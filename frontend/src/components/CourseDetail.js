import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourse, getCourseVideos, getCurrentUser, getCourseRegistration, registerForCourse, getVideoProgress, trackProgress } from '../api';

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
    const [videoProgress, setVideoProgress] = useState({}); // { videoId: { watchTime: seconds, percentage: number } }

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

                // Fetch progress for all videos
                if (videosData.length > 0 && userData.role === 'student') {
                    const progressPromises = videosData.map(async (video) => {
                        try {
                            const progressRecords = await getVideoProgress(video.id);
                            if (progressRecords && progressRecords.length > 0) {
                                // Sum all watch_time from all records
                                let totalSeconds = 0;
                                progressRecords.forEach(record => {
                                    if (record.watch_time) {
                                        const [hours, minutes, seconds] = record.watch_time.split(':').map(Number);
                                        totalSeconds += hours * 3600 + minutes * 60 + seconds;
                                    }
                                });
                                return { videoId: video.id, watchTime: totalSeconds };
                            }
                        } catch (err) {
                            console.error(`Error fetching progress for video ${video.id}:`, err);
                        }
                        return { videoId: video.id, watchTime: 0 };
                    });

                    const progressResults = await Promise.all(progressPromises);
                    const progressMap = {};
                    progressResults.forEach(({ videoId, watchTime }) => {
                        progressMap[videoId] = { watchTime };
                    });
                    setVideoProgress(progressMap);
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

    const formatTime = (seconds) => {
        if (!seconds || seconds === 0) return '';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

    // Track video progress when video ends
    useEffect(() => {
        if (selectedVideo) {
            // This will be handled by iframe events if needed
            // For now, we rely on the backend tracking
        }
    }, [selectedVideo]);

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
                <div className="course-page">
                    {selectedVideo ? (
                        <>
                            <div className="video-wrapper">
                                <iframe
                                    src={`https://www.youtube.com/embed/${extractVideoId(selectedVideo.video_link)}?enablejsapi=1&origin=${window.location.origin}`}
                                    title={selectedVideo.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="video-iframe"
                                ></iframe>
                            </div>

                            <div className="video-info">
                                <h1 className="video-title">{selectedVideo.title}</h1>
                                <p className="video-description">
                                    {course.course_title} - Video {selectedVideoIndex + 1} of {videos.length}
                                </p>
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
                        </>
                    ) : videos.length === 0 ? (
                        <div className="no-videos">
                            <p>No videos available for this course.</p>
                        </div>
                    ) : null}

                    <div className="playlist">
                        <h3 className="playlist-title">
                            Up Next: {course?.course_title || 'Course Videos'} ({videos.length})
                        </h3>
                        <div className="horizontal-scroll">
                            {videos
                                .filter((video) => {
                                    const matchesSearch = playlistSearch === '' || 
                                        video.title.toLowerCase().includes(playlistSearch.toLowerCase());
                                    return matchesSearch;
                                })
                                .map((video, index) => {
                                    const originalIndex = videos.indexOf(video);
                                    const videoId = extractVideoId(video.video_link);
                                    const isSelected = selectedVideo && selectedVideo.id === video.id;
                                    const progress = videoProgress[video.id] || { watchTime: 0 };
                                    const progressPercentage = progress.watchTime > 0 ? Math.min((progress.watchTime / 600) * 100, 100) : 0;
                                    
                                    return (
                                        <div
                                            key={video.id}
                                            className={`video-item ${isSelected ? 'active' : ''}`}
                                            onClick={() => handleVideoSelect(video, originalIndex)}
                                        >
                                            <div className="video-item-thumbnail-wrapper">
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
                                                    {progress.watchTime > 0 && (
                                                        <div className="video-progress-bar">
                                                            <div 
                                                                className="video-progress-fill" 
                                                                style={{ width: `${progressPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="video-playing-indicator">
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                                <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)"/>
                                                                <polygon points="10,8 16,12 10,16" fill="white"/>
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="video-item-number">{originalIndex + 1}</div>
                                                </div>
                                            </div>
                                            <div className="video-item-info">
                                                <h4 className="video-item-title">{video.title}</h4>
                                                {progress.watchTime > 0 && (
                                                    <div className="video-item-progress-text">
                                                        {formatTime(progress.watchTime)} watched
                                                    </div>
                                                )}
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
