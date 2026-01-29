import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourse, getCourseVideos } from '../api';
import VideoPlayer from './VideoPlayer';
import './CourseDetail.css';

const CourseDetail = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                </div>

                <div className="course-main">
                    <div className="video-section">
                        {selectedVideo && (
                            <div className="video-player-container">
                                <VideoPlayer
                                    videoId={extractVideoId(selectedVideo.video_link)}
                                    videoUrl={selectedVideo.video_link}
                                />
                                <div className="video-info">
                                    <h2 className="current-video-title">{selectedVideo.title}</h2>
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
                        <h3 className="video-list-title">Course Videos ({videos.length})</h3>
                        <div className="video-list">
                            {videos.map((video, index) => {
                                const videoId = extractVideoId(video.video_link);
                                const isSelected = selectedVideo && selectedVideo.id === video.id;
                                return (
                                    <div
                                        key={video.id}
                                        className={`video-item ${isSelected ? 'active' : ''}`}
                                        onClick={() => setSelectedVideo(video)}
                                    >
                                        <div className="video-item-number">{index + 1}</div>
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
