import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses, addYouTubePlaylist, getCourseVideos, getCurrentUser } from '../api';

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [courseThumbnails, setCourseThumbnails] = useState({});
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const navigate = useNavigate();

    const extractVideoId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getCourses();
            setCourses(data);
            
            // Fetch thumbnails for each course in parallel
            const thumbnailPromises = data.map(async (course) => {
                try {
                    const videos = await getCourseVideos(course.id);
                    if (videos && videos.length > 0 && videos[0].video_link) {
                        const videoId = extractVideoId(videos[0].video_link);
                        if (videoId) {
                            return {
                                courseId: course.id,
                                thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                            };
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching videos for course ${course.id}:`, err);
                }
                return { courseId: course.id, thumbnail: null };
            });
            
            const thumbnailResults = await Promise.all(thumbnailPromises);
            const thumbnailMap = {};
            thumbnailResults.forEach(({ courseId, thumbnail }) => {
                if (thumbnail) {
                    thumbnailMap[courseId] = thumbnail;
                }
            });
            
            setCourseThumbnails(thumbnailMap);
            setError('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const userData = await getCurrentUser();
                    setUser(userData);
                }
            } catch (err) {
                // User not logged in or token expired - that's okay for catalog
                console.log('User not authenticated');
            }
        };
        
        fetchUser();
        fetchCourses();
    }, [fetchCourses]);

    const handleAddPlaylist = async (e) => {
        e.preventDefault();
        if (!playlistUrl.trim()) {
            setError('Please enter a valid YouTube playlist URL');
            return;
        }

        try {
            setAdding(true);
            setError('');
            await addYouTubePlaylist(playlistUrl);
            setPlaylistUrl('');
            setShowAddForm(false);
            // Refresh the course list
            await fetchCourses();
        } catch (err) {
            console.error('Error adding playlist:', err);
            setError(err.response?.data?.detail || 'Failed to add playlist. Please check the URL and try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleCourseClick = (courseId) => {
        navigate(`/course/${courseId}`);
    };


    if (loading) {
        return (
            <div className="catalog-container">
                <div className="loading-spinner">Loading courses...</div>
            </div>
        );
    }

    return (
        <div className="catalog-container">
            <div className="catalog-header">
                <h1>Course Catalog</h1>
                {user?.role === 'admin' && (
                    <button 
                        className="add-course-btn"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? 'Cancel' : '+ Add Courses'}
                    </button>
                )}
            </div>

            {showAddForm && user?.role === 'admin' && (
                <div className="add-playlist-form">
                    <h3>Add Course from YouTube Playlist</h3>
                    <form onSubmit={handleAddPlaylist}>
                        <div className="form-group">
                            <label htmlFor="playlistUrl">YouTube Playlist URL</label>
                            <input
                                type="url"
                                id="playlistUrl"
                                value={playlistUrl}
                                onChange={(e) => setPlaylistUrl(e.target.value)}
                                placeholder="https://www.youtube.com/playlist?list=..."
                                required
                            />
                            <small className="form-hint">
                                Paste a YouTube playlist URL. All videos in the playlist will be added as course videos.
                            </small>
                        </div>
                        <button type="submit" className="submit-btn" disabled={adding}>
                            {adding ? 'Adding...' : 'Add Course'}
                        </button>
                    </form>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {courses.length === 0 ? (
                <div className="empty-state">
                    <p>No courses available yet.</p>
                    <p>Add a YouTube playlist to get started!</p>
                </div>
            ) : (
                <div className="courses-grid">
                    {courses.map((course) => {
                        const thumbnail = courseThumbnails[course.id] || null;
                        return (
                            <div
                                key={course.id}
                                className="course-card"
                                onClick={() => handleCourseClick(course.id)}
                            >
                                <div className="course-thumbnail-container">
                                    {thumbnail ? (
                                        <img 
                                            src={thumbnail} 
                                            alt={course.course_title}
                                            className="course-thumbnail"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="course-icon"
                                        style={{ display: thumbnail ? 'none' : 'flex' }}
                                    >
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="9" y1="9" x2="15" y2="9"></line>
                                            <line x1="9" y1="15" x2="15" y2="15"></line>
                                        </svg>
                                    </div>
                                    <div className="play-overlay">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                                            <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)"/>
                                            <polygon points="10,8 16,12 10,16" fill="white"/>
                                        </svg>
                                    </div>
                                </div>
                                <div className="course-card-content">
                                    <h3 className="course-title">{course.course_title}</h3>
                                    {course.link && (
                                        <div className="course-link-container">
                                            <button
                                                className="copy-link-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(course.link);
                                                    const btn = e.target;
                                                    const originalText = btn.textContent;
                                                    btn.textContent = 'Copied!';
                                                    setTimeout(() => {
                                                        btn.textContent = originalText;
                                                    }, 2000);
                                                }}
                                                title="Copy playlist link"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                                Copy Link
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
