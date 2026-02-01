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
            const newCourse = await addYouTubePlaylist(playlistUrl);
            setPlaylistUrl('');
            setShowAddForm(false);
            
            // Add the new course directly to the state immediately
            setCourses(prevCourses => {
                // Check if course already exists (avoid duplicates)
                const exists = prevCourses.some(c => c.id === newCourse.id);
                if (exists) {
                    return prevCourses;
                }
                return [newCourse, ...prevCourses];
            });

            // Fetch thumbnail for the new course
            try {
                const videos = await getCourseVideos(newCourse.id);
                if (videos && videos.length > 0 && videos[0].video_link) {
                    const videoId = extractVideoId(videos[0].video_link);
                    if (videoId) {
                        setCourseThumbnails(prev => ({
                            ...prev,
                            [newCourse.id]: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                        }));
                    }
                }
            } catch (thumbnailErr) {
                console.error('Error fetching thumbnail for new course:', thumbnailErr);
            }

            // Also refresh the course list as a backup to ensure consistency
            await fetchCourses();
        } catch (err) {
            console.error('Error adding playlist:', err);
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to add playlist. Please check the URL and try again.';
            setError(errorMessage);
            console.error('Full error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });
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
                            {adding ? 'Processing Playlist... This may take a minute' : 'Add Course'}
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
                                    <div className="course-link-container">
                                        <button
                                            className="course-details-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCourseClick(course.id);
                                            }}
                                            title="View course details"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                            Course Details
                                        </button>
                                    </div>
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
