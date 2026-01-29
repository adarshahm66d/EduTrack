import React from 'react';
import './VideoPlayer.css';

const VideoPlayer = ({ videoId, videoUrl }) => {
    if (!videoId) {
        return (
            <div className="video-player-error">
                <p>Invalid video URL. Please check the video link.</p>
                {videoUrl && (
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#666' }}>
                        Original URL: {videoUrl}
                    </p>
                )}
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#666' }}>
                    Video ID: {videoId || 'Not found'}
                </p>
            </div>
        );
    }

    if (videoId.length !== 11 && !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return (
            <div className="video-player-error">
                <p>Invalid video ID format</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: '#666' }}>
                    Received: {videoId}
                </p>
            </div>
        );
    }

    return (
        <div className="video-player-wrapper">
            <div className="video-player-container">
                <iframe
                    className="video-iframe"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`}
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
