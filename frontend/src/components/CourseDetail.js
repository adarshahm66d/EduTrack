import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourse, getCourseVideos, getCurrentUser, getCourseRegistration, registerForCourse, getVideoProgress, trackProgress } from '../api';
import VideoPopup from './VideoPopup';

const CourseDetail = () => {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
    const [playlistSearch] = useState('');
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
    const [totalWatchTime, setTotalWatchTime] = useState(0); // Accumulated watch time in seconds
    const [hasPlayedToday, setHasPlayedToday] = useState(false); // Track if video has been played today
    const [hasPausedToday, setHasPausedToday] = useState(false); // Track if video has been paused today (first pause cycle complete)
    const [sessionStartTime, setSessionStartTime] = useState(null); // Store the start_time for current play session
    const youtubePlayerRef = useRef(null);

    // Refs to store latest values for YouTube player event handlers
    const isTrackingTimeRef = useRef(isTrackingTime);
    const showPopupRef = useRef(showPopup);
    const watchStartTimeRef = useRef(watchStartTime);
    const totalWatchTimeRef = useRef(totalWatchTime);
    const popupTimerRef = useRef(popupTimer);
    const scheduleNextPopupRef = useRef(null);
    const showRandomPopupRef = useRef(null);
    const handleVideoEndRef = useRef(null);
    const saveProgressRef = useRef(null);
    const hasPlayedTodayRef = useRef(false);
    const hasPausedTodayRef = useRef(false);
    const sessionStartTimeRef = useRef(null);
    const selectedVideoRef = useRef(null);

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

    const handleVideoSelect = useCallback((video, index) => {
        setSelectedVideo(video);
        setSelectedVideoIndex(index);
        // Scroll to top of video player
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleNextVideo = useCallback(() => {
        if (selectedVideoIndex < videos.length - 1) {
            const nextIndex = selectedVideoIndex + 1;
            handleVideoSelect(videos[nextIndex], nextIndex);
        }
    }, [selectedVideoIndex, videos, handleVideoSelect]);

    const handlePreviousVideo = () => {
        if (selectedVideoIndex > 0) {
            const prevIndex = selectedVideoIndex - 1;
            handleVideoSelect(videos[prevIndex], prevIndex);
        }
    };

    const handleVideoEnd = useCallback(() => {
        // Auto-play next video when current video ends
        if (selectedVideoIndex < videos.length - 1) {
            handleNextVideo();
        }
    }, [selectedVideoIndex, videos, handleNextVideo]);

    // Helper function to get current time in HH:MM:SS format
    const getCurrentTimeString = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    // Helper function to calculate seconds between two time strings (HH:MM:SS)
    const calculateTimeDifference = (startTime, endTime) => {
        const parseTime = (timeStr) => {
            const [hours, minutes, seconds] = timeStr.split(':').map(Number);
            return hours * 3600 + minutes * 60 + seconds;
        };
        const startSeconds = parseTime(startTime);
        const endSeconds = parseTime(endTime);

        // Handle case where end time is before start time (crosses midnight)
        // For same-day tracking, this shouldn't happen, but if it does, assume it's the next day
        if (endSeconds < startSeconds) {
            // Add 24 hours (86400 seconds) to end time
            return (endSeconds + 86400) - startSeconds;
        }

        return endSeconds - startSeconds;
    };

    const saveProgress = useCallback(async (mode, watchTimeSeconds = null) => {
        if (!selectedVideoRef.current || !user || user.role !== 'student') return;

        try {
            const progressData = {
                video_id: selectedVideoRef.current.id
            };

            if (mode === 'start_only') {
                // Only send start_time when video starts playing
                const currentTime = getCurrentTimeString();
                progressData.start_time = currentTime;
                // Update both state and ref immediately
                setSessionStartTime(currentTime);
                sessionStartTimeRef.current = currentTime;
            } else if (mode === 'pause_with_watchtime') {
                // Send end_time and watchtime_seconds when video is paused
                const startTime = sessionStartTimeRef.current;
                if (!startTime) {
                    return; // Need start_time to calculate
                }

                const endTime = getCurrentTimeString();
                progressData.end_time = endTime;

                // Calculate watch_time as difference between start_time and end_time
                if (watchTimeSeconds !== null && watchTimeSeconds > 0) {
                    progressData.watchtime_seconds = watchTimeSeconds;
                } else {
                    // Calculate from time strings
                    const watchSeconds = calculateTimeDifference(startTime, endTime);
                    if (watchSeconds > 0) {
                        progressData.watchtime_seconds = watchSeconds;
                    } else {
                        return; // Invalid time difference
                    }
                }

                // Clear session start time after pause
                setSessionStartTime(null);
                sessionStartTimeRef.current = null;
            }

            await trackProgress(progressData);
        } catch (err) {
            console.error('Error saving progress:', err);
        }
    }, [user]);

    const showRandomPopup = useCallback(() => {
        const popupTypes = ['feedback', 'rating', 'captcha'];
        const randomType = popupTypes[Math.floor(Math.random() * popupTypes.length)];

        // Save progress before pausing (same as regular pause)
        const startTime = sessionStartTimeRef.current;
        if (startTime) {
            const endTime = getCurrentTimeString();
            const watchSeconds = calculateTimeDifference(startTime, endTime);

            if (watchSeconds > 0) {
                saveProgressRef.current('pause_with_watchtime', watchSeconds);
            }
        }

        setIsTrackingTime(false);

        // Pause video
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.pauseVideo();
        }

        setPopupType(randomType);
        setShowPopup(true);
    }, []);

    const scheduleNextPopup = useCallback(() => {
        // Clear existing timer
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
        }

        const minMinutes = 5;
        const maxMinutes = 20;
        const randomMinutes = Math.random() * (maxMinutes - minMinutes) + minMinutes;
        const randomMs = randomMinutes * 1000;

        const timer = setTimeout(() => {
            if (youtubePlayerRef.current && youtubePlayerRef.current.getPlayerState() === window.YT.PlayerState.PLAYING) {
                showRandomPopupRef.current();
            } else {
                // If video is not playing, reschedule
                scheduleNextPopupRef.current();
            }
        }, randomMs);

        setPopupTimer(timer);
    }, []);

    // Update refs when state changes
    useEffect(() => {
        isTrackingTimeRef.current = isTrackingTime;
        showPopupRef.current = showPopup;
        watchStartTimeRef.current = watchStartTime;
        totalWatchTimeRef.current = totalWatchTime;
        popupTimerRef.current = popupTimer;
        scheduleNextPopupRef.current = scheduleNextPopup;
        showRandomPopupRef.current = showRandomPopup;
        handleVideoEndRef.current = handleVideoEnd;
        saveProgressRef.current = saveProgress;
        hasPlayedTodayRef.current = hasPlayedToday;
        hasPausedTodayRef.current = hasPausedToday;
        sessionStartTimeRef.current = sessionStartTime;
        selectedVideoRef.current = selectedVideo;
    }, [isTrackingTime, showPopup, watchStartTime, totalWatchTime, popupTimer, scheduleNextPopup, showRandomPopup, handleVideoEnd, saveProgress, hasPlayedToday, hasPausedToday, sessionStartTime, selectedVideo]);

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
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
            setPopupTimer(null);
        }

        // Save progress for previous video before switching (if tracking was active)
        const prevStartTime = sessionStartTimeRef.current;
        if (selectedVideoRef.current && isTrackingTimeRef.current && prevStartTime) {
            // If video was playing, treat it as a pause
            const endTime = getCurrentTimeString();
            const watchSeconds = calculateTimeDifference(prevStartTime, endTime);
            if (watchSeconds > 0) {
                saveProgressRef.current('pause_with_watchtime', watchSeconds);
            }
        }

        // Reset tracking state for new video
        setIsTrackingTime(false);
        setTotalWatchTime(0);
        setWatchStartTime(null);
        setShowPopup(false);
        setPopupType(null);
        setHasPlayedToday(false);
        setHasPausedToday(false);
        setSessionStartTime(null);

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
                            if (event.data === window.YT.PlayerState.PLAYING && !isTrackingTimeRef.current && !showPopupRef.current) {
                                setIsTrackingTime(true);
                                setWatchStartTime(Date.now());

                                // Save start_time when video starts playing
                                // First play: creates entry with start_time only
                                // Subsequent plays: updates start_time
                                saveProgressRef.current('start_only');

                                if (!hasPlayedTodayRef.current) {
                                    setHasPlayedToday(true);
                                }

                                scheduleNextPopupRef.current();
                            } else if (event.data === window.YT.PlayerState.PAUSED && isTrackingTimeRef.current && !showPopupRef.current) {
                                // Video paused - save end_time and watch_time
                                const startTime = sessionStartTimeRef.current;
                                if (startTime) {
                                    const endTime = getCurrentTimeString();
                                    const watchSeconds = calculateTimeDifference(startTime, endTime);

                                    if (watchSeconds > 0) {
                                        saveProgressRef.current('pause_with_watchtime', watchSeconds);

                                        // Mark that we've completed first pause cycle
                                        if (!hasPausedTodayRef.current) {
                                            setHasPausedToday(true);
                                        }
                                    }
                                }

                                setIsTrackingTime(false);
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                // Video ended, save progress and move to next
                                const startTime = sessionStartTimeRef.current;
                                if (startTime) {
                                    const endTime = getCurrentTimeString();
                                    const watchSeconds = calculateTimeDifference(startTime, endTime);

                                    if (watchSeconds > 0) {
                                        saveProgressRef.current('pause_with_watchtime', watchSeconds);
                                    }
                                }
                                handleVideoEndRef.current();
                            }
                        }
                    }
                });
            };

            checkAndInit();
        };

        initializePlayer();

        return () => {
            // Save progress when component unmounts or video changes
            if (selectedVideoRef.current && isTrackingTimeRef.current && sessionStartTimeRef.current) {
                const endTime = getCurrentTimeString();
                const watchSeconds = calculateTimeDifference(sessionStartTimeRef.current, endTime);
                if (watchSeconds > 0) {
                    saveProgressRef.current('pause_with_watchtime', watchSeconds);
                }
            }

            if (popupTimerRef.current) {
                clearTimeout(popupTimerRef.current);
            }
            if (youtubePlayerRef.current) {
                try {
                    youtubePlayerRef.current.destroy();
                } catch (e) {
                    // Player already destroyed or doesn't exist
                }
            }
        };
    }, [selectedVideo]);

    // Save progress when component unmounts (user navigates away)
    useEffect(() => {
        return () => {
            // Save progress when component unmounts
            if (selectedVideoRef.current && isTrackingTimeRef.current && sessionStartTimeRef.current) {
                const endTime = getCurrentTimeString();
                const watchSeconds = calculateTimeDifference(sessionStartTimeRef.current, endTime);
                if (watchSeconds > 0) {
                    saveProgressRef.current('pause_with_watchtime', watchSeconds);
                }
            }
        };
    }, []);


    const handlePopupSubmit = (data) => {
        // Save popup response (you can send this to backend if needed)

        // Close popup
        setShowPopup(false);
        setPopupType(null);

        // Resume video
        if (youtubePlayerRef.current) {
            youtubePlayerRef.current.playVideo();
        }

        // Resume time tracking - set new start_time when resuming after popup
        setIsTrackingTime(true);
        setWatchStartTime(Date.now());

        // Set new start_time for the resumed session
        const currentTime = getCurrentTimeString();
        setSessionStartTime(currentTime);
        sessionStartTimeRef.current = currentTime;
        saveProgressRef.current('start_only');

        // Schedule next popup
        scheduleNextPopupRef.current();
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
                                        onClose={() => { }} // Popup must be submitted, not closed
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
                                                                <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)" />
                                                                <polygon points="10,8 16,12 10,16" fill="white" />
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
