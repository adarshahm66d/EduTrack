import React, { useEffect, useRef, useCallback } from 'react';
import { trackProgress } from '../api';

// Extract YouTube video ID from various URL formats
const extractVideoId = (videoIdOrUrl) => {
    if (!videoIdOrUrl) return null;

    // If it's already an 11-character ID, return it
    if (videoIdOrUrl.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(videoIdOrUrl)) {
        return videoIdOrUrl;
    }

    // Try to extract from YouTube URL
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = videoIdOrUrl.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

const VideoPlayer = ({ videoId, videoUrl, onVideoEnd, videoDbId }) => {
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const playStartTimeRef = useRef(null);
    const isPlayingRef = useRef(false);
    const totalWatchtimeRef = useRef(0);
    const videoDbIdRef = useRef(videoDbId);
    const playerInitializedRef = useRef(false);

    // Format time to HH:MM:SS
    const formatTime = useCallback((date) => {
        return date.toTimeString().split(' ')[0]; // Returns HH:MM:SS
    }, []);

    // Send progress to backend
    const sendProgress = useCallback(async (startTime, endTime, incrementalWatchtime = null) => {
        if (!videoDbIdRef.current) {
            return;
        }

        try {
            // Only send watchtime_seconds if we have incremental watchtime (on pause/end)
            // Don't send it on play start (it would be 0)
            const payload = {
                video_id: videoDbIdRef.current,
                start_time: startTime,
                end_time: endTime
            };

            if (incrementalWatchtime !== null && incrementalWatchtime > 0) {
                payload.watchtime_seconds = incrementalWatchtime;
            }

            await trackProgress(payload);
        } catch (error) {
            console.error('Error tracking progress:', error);
        }
    }, []);

    // Update ref when videoDbId changes
    useEffect(() => {
        videoDbIdRef.current = videoDbId;
        // Reset tracking when video changes
        if (playStartTimeRef.current) {
            const now = new Date();
            const watchtime = Math.floor((now - playStartTimeRef.current) / 1000);
            if (watchtime > 0) {
                sendProgress(formatTime(playStartTimeRef.current), formatTime(now), watchtime);
            }
            playStartTimeRef.current = null;
        }
        isPlayingRef.current = false;
        totalWatchtimeRef.current = 0;
    }, [videoDbId, sendProgress, formatTime]);

    // Use videoUrl if provided, otherwise use videoId
    const source = videoUrl || videoId;
    const extractedId = extractVideoId(source);

    // Load YouTube IFrame API
    useEffect(() => {
        // Check if YouTube API is already loaded
        if (window.YT && window.YT.Player) {
            return;
        }

        // Load YouTube IFrame API script
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Set up callback for when API is ready
        window.onYouTubeIframeAPIReady = () => {
            // API ready
        };

        return () => {
            // Cleanup
            if (window.onYouTubeIframeAPIReady) {
                delete window.onYouTubeIframeAPIReady;
            }
        };
    }, []);

    // Initialize YouTube player
    useEffect(() => {
        if (!extractedId) return;

        const initPlayer = () => {
            if (!window.YT || !window.YT.Player) {
                // Wait for API to load
                setTimeout(initPlayer, 100);
                return;
            }

            if (playerInitializedRef.current && playerRef.current) {
                // Player already initialized for this video
                return;
            }

            // Destroy existing player if any
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.warn('Error destroying existing player:', e);
                }
                playerRef.current = null;
            }

            if (!containerRef.current) {
                console.error('Container not found');
                return;
            }

            const containerId = `youtube-player-${extractedId}-${Date.now()}`;
            containerRef.current.id = containerId;

            try {
                playerRef.current = new window.YT.Player(containerId, {
                    videoId: extractedId,
                    playerVars: {
                        rel: 0,
                        modestbranding: 1,
                        enablejsapi: 1,
                        origin: window.location.origin
                    },
                    events: {
                        onReady: (event) => {
                            playerInitializedRef.current = true;
                        },
                        onStateChange: (event) => {
                            const state = event.data;
                            // 0 = ended, 1 = playing, 2 = paused, -1 = unstarted, 3 = buffering

                            if (state === 1 && !isPlayingRef.current) {
                                // Video started playing
                                const now = new Date();
                                playStartTimeRef.current = now;
                                isPlayingRef.current = true;

                                if (videoDbIdRef.current) {
                                    // Send start time only, no watchtime yet
                                    sendProgress(formatTime(now), null, null);
                                }
                            } else if (state === 2 && isPlayingRef.current) {
                                // Video paused
                                if (playStartTimeRef.current) {
                                    const now = new Date();
                                    const watchtime = Math.floor((now - playStartTimeRef.current) / 1000);

                                    if (watchtime > 0 && videoDbIdRef.current) {
                                        totalWatchtimeRef.current += watchtime;
                                        // Send incremental watchtime for this session
                                        sendProgress(formatTime(playStartTimeRef.current), formatTime(now), watchtime);
                                    }

                                    playStartTimeRef.current = null;
                                }
                                isPlayingRef.current = false;
                            } else if (state === 0) {
                                // Video ended
                                if (playStartTimeRef.current) {
                                    const now = new Date();
                                    const watchtime = Math.floor((now - playStartTimeRef.current) / 1000);
                                    totalWatchtimeRef.current += watchtime;

                                    if (videoDbIdRef.current) {
                                        // Send incremental watchtime for this session
                                        sendProgress(formatTime(playStartTimeRef.current), formatTime(now), watchtime);
                                    }

                                    playStartTimeRef.current = null;
                                }
                                isPlayingRef.current = false;
                                if (onVideoEnd) {
                                    onVideoEnd();
                                }
                            } else if (state === -1) {
                                isPlayingRef.current = false;
                            }
                        },
                        onError: (event) => {
                            console.error('YouTube player error:', event.data);
                        }
                    }
                });
            } catch (error) {
                console.error('Error initializing YouTube player:', error);
            }
        };

        // Wait a bit for container to be in DOM
        const timer = setTimeout(initPlayer, 500);

        return () => {
            clearTimeout(timer);
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) {
                    console.warn('Error destroying player:', e);
                }
                playerRef.current = null;
                playerInitializedRef.current = false;
            }
            // Send final progress when component unmounts
            if (playStartTimeRef.current && videoDbIdRef.current) {
                const now = new Date();
                const watchtime = Math.floor((now - playStartTimeRef.current) / 1000);
                if (watchtime > 0) {
                    sendProgress(formatTime(playStartTimeRef.current), formatTime(now), watchtime);
                }
            }
        };
    }, [extractedId, onVideoEnd, sendProgress, formatTime]);

    if (!extractedId) {
        return (
            <div className="video-player-error">
                <p>Invalid video URL. Please check the video link.</p>
                {source && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#666' }}>
                        Original URL: {source}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="video-player-wrapper">
            <div className="video-player-container" ref={containerRef}>
                {/* Player will be initialized here by YouTube API */}
            </div>
        </div>
    );
};

export default VideoPlayer;
