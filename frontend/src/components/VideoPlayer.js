import React, { useEffect, useRef } from 'react';

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

const VideoPlayer = ({ videoId, videoUrl, onVideoEnd }) => {
    const iframeRef = useRef(null);
    
    // Use videoUrl if provided, otherwise use videoId
    const source = videoUrl || videoId;
    const extractedId = extractVideoId(source);
    
    useEffect(() => {
        // Listen for YouTube player events
        const handleMessage = (event) => {
            if (event.origin !== 'https://www.youtube.com') return;
            
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'onStateChange') {
                    // 0 = ended, 1 = playing, 2 = paused
                    if (data.info === 0 && onVideoEnd) {
                        onVideoEnd();
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onVideoEnd]);
    
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
            <div className="video-player-container">
                <iframe
                    ref={iframeRef}
                    className="video-iframe"
                    src={`https://www.youtube.com/embed/${extractedId}?rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            </div>
        </div>
    );
};

export default VideoPlayer;
