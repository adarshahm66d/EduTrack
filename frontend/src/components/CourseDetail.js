import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourse, getCourseVideos, getCurrentUser, getCourseRegistration, registerForCourse, getVideoProgress, trackProgress } from '../api';
import VideoPopup from './VideoPopup';

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
    
    // Popup system state
    const [showPopup, setShowPopup] = useState(false);
    const [popupType, setPopupType] = useState(null);
    const [popupTimer, setPopupTimer] = useState(null);
    const [isTrackingTime, setIsTrackingTime] = useState(false);
    const [watchStartTime, setWatchStartTime] = useState(null);
    const [popupStartTime, setPopupStartTime] = useState(null);
    const [totalWatchTime, setTotalWatchTime] = useState(0); // Accumulated watch time in seconds
    const [lastProgressUpdate, setLastProgressUpdate] = useState(null);
    
    const iframeRef = useRef(null);
    const youtubePlayerRef = useRef(null);

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

    // Load YouTube IFrame API
    useEffect(() => {
        if (!window.YT) {
            // Set up global callback
            window.onYouTubeIframeAPIReady = () => {
                // API is ready
            };
            
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // Initialize YouTube player when video changes
    useEffect(() => {
        if (!selectedVideo) return;

        const videoId = extractVideoId(selectedVideo.video_link);
        if (!videoId) return;

        // Clear existing popup timer
        if (popupTimer) {
            clearTimeout(popupTimer);
            setPopupTimer(null);
        }

        // Reset tracking state
        setIsTrackingTime(false);
        setTotalWatchTime(0);
        setWatchStartTime(null);
        setShowPopup(false);
        setPopupType(null);

        const initializePlayer = () => {
            const checkAndInit = () => {
                if (!window.YT || !window.YT.Player) {
                    // Wait for API to load
                    setTimeout(checkAndInit, 100);
                    return;
                }

                // Destroy existing player
                if (youtubePlayerRef.current) {
                    try {
                        youtubePlayerRef.current.destroy();
                    } catch (e) {
                        // Player already destroyed or doesn't exist
                    }
                }

                // Ensure container exists
                let container = document.getElementById('youtube-player-container');
                if (!container) {
                    const wrapper = document.querySelector('.video-wrapper');
                    if (wrapper) {
                        container = document.createElement('div');
                        container.id = 'youtube-player-container';
                        container.style.cssText = 'width: 100%; aspect-ratio: 16 / 9; position: relative;';
                        wrapper.innerHTML = '';
                        wrapper.appendChild(container);
                    } else {
                        setTimeout(checkAndInit, 100);
                        return;
                    }
                }

                // Create player div
                const playerDiv = document.createElement('div');
                playerDiv.id = 'youtube-player';
                container.innerHTML = '';
                container.appendChild(playerDiv);

                youtubePlayerRef.current = new window.YT.Player('youtube-player', {
                    videoId: videoId,
                    playerVars: {
                        enablejsapi: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: (event) => {
                            // Video is ready
                        },
                        onStateChange: (event) => {
                            // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
                            if (event.data === window.YT.PlayerState.PLAYING && !isTrackingTime && !showPopup) {
                                setIsTrackingTime(true);
                                setWatchStartTime(Date.now());
                                scheduleNextPopup();
                            } else if (event.data === window.YT.PlayerState.PAUSED && isTrackingTime && !showPopup) {
                                // Only pause tracking if not due to popup
                                const elapsed = Math.floor((Date.now() - watchStartTime) / 1000);
                                setTotalWatchTime(prev => prev + elapsed);
                                setIsTrackingTime(false);
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                // Video ended, save progress and move to next
                                if (isTrackingTime && watchStartTime) {
                                    const elapsed = Math.floor((Date.now() - watchStartTime) / 1000);
                                    const finalTime = totalWatchTime + elapsed;
                                    saveProgress(finalTime);
                                }
                                handleVideoEnd();
                            }
                        }
                    }
                });
            };

            checkAndInit();
        };

        initializePlayer();

        return () => {
            if (popupTimer) {
                clearTimeout(popupTimer);
            }
            if (youtubePlayerRef.current) {
                try {
                    youtubePlayerRef.current.destroy();
                } catch (e) {
                    console.log('Error destroying player');
                }
            }
        };
    }, [selectedVideo]);

    const scheduleNextPopup = () => {
        // Clear existing timer
        if (popupTimer) {
            clearTimeout(popupTimer);
        }

        const minMinutes = 5;
        const maxMinutes = 20;
        const randomMinutes = Math.random() * (maxMinutes - minMinutes) + minMinutes;
        const randomMs = randomMinutes * 1000;
        
        const timer = setTimeout(() => {
            if (youtubePlayerRef.current && youtubePlayerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING) {
                showRandomPopup();
            } else {
                // If video is not playing, reschedule
                scheduleNextPopup();
            }
        }, randomMs);
        
        setPopupTimer(timer);
    };

    // Track watch time every 30 seconds when video is playing
    useEffect(() => {
        if (!isTrackingTime || showPopup || !watchStartTime) return;

        const interval = setInterval(() => {
            if (isTrackingTime && watchStartTime && !showPopup) {
                const elapsed = Math.floor((Date.now() - watchStartTime) / 1000);
                const currentTotal = totalWatchTime + elapsed;
                saveProgress(currentTotal);
                setTotalWatchTime(currentTotal);
                setWatchStartTime(Date.now()); // Reset start time
            }
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [isTrackingTime, showPopup, watchStartTime, totalWatchTime]);

    const showRandomPopup = () => {
        const popupTypes = ['feedback', 'rating', 'captcha'];
        const randomType = popupTypes[Math.floor(Math.random() * popupTypes.length)];
        
        // Pause video
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.pauseVideo();
        }
        
        // Pause time tracking
        if (isTrackingTime && watchStartTime) {
            const elapsed = Math.floor((Date.now() - watchStartTime) / 1000);
            setTotalWatchTime(prev => prev + elapsed);
            setIsTrackingTime(false);
            setPopupStartTime(Date.now());
        }
        
        setPopupType(randomType);
        setShowPopup(true);
    };

    const handlePopupSubmit = (data) => {
        // Save popup response (you can send this to backend if needed)
        console.log('Popup submitted:', data);
        
        // Close popup
        setShowPopup(false);
        setPopupType(null);
        
        // Resume video
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.playVideo();
        }
        
        // Resume time tracking (don't count time while popup was shown)
        setIsTrackingTime(true);
        setWatchStartTime(Date.now());
        
        // Schedule next popup
        scheduleNextPopup();
    };

    const saveProgress = async (seconds) => {
        if (!selectedVideo || !user || user.role !== 'student' || seconds < 1) return;
        
        try {
            await trackProgress({
                video_id: selectedVideo.id,
                watchtime_seconds: seconds
            });
        } catch (err) {
            console.error('Error saving progress:', err);
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
                <div className="course-page">
                    {selectedVideo ? (
                        <>
                            <div className="video-wrapper">
                                <div id="youtube-player-container"></div>
                                {showPopup && (
                                    <VideoPopup
                                        type={popupType}
                                        onClose={() => {}} // Popup must be submitted, not closed
                                        onSubmit={handlePopupSubmit}
                                    />
                                )}
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
