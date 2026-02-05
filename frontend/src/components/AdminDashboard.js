import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getCourses, getCourseVideos, addYouTubePlaylist, deleteCourse } from '../api';

const AdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [courseThumbnails, setCourseThumbnails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [deletingCourseId, setDeletingCourseId] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const extractVideoId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [userData, coursesData] = await Promise.all([
                    getCurrentUser(),
                    getCourses()
                ]);
                
                // Check if user is admin
                if (userData.role !== 'admin') {
                    navigate('/dashboard');
                    return;
                }
                
                setUser(userData);
                setCourses(coursesData);

                // Fetch thumbnails for each course in parallel
                const thumbnailPromises = coursesData.map(async (course) => {
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
            } catch (err) {
                console.error('Failed to fetch data:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

    const fetchCourses = async () => {
        try {
            const data = await getCourses();
            setCourses(data);
            setError('');

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
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        }
    };

    const validatePlaylistUrl = (url) => {
        if (!url || !url.trim()) {
            return { valid: false, message: 'Please enter a YouTube playlist URL' };
        }
        
        const trimmedUrl = url.trim();
        
        // Check for YouTube playlist patterns
        const playlistPatterns = [
            /youtube\.com\/playlist\?list=[a-zA-Z0-9_-]+/i,
            /youtube\.com\/watch\?.*list=[a-zA-Z0-9_-]+/i,
            /youtu\.be\/.*\?list=[a-zA-Z0-9_-]+/i
        ];
        
        const isValid = playlistPatterns.some(pattern => pattern.test(trimmedUrl));
        
        if (!isValid) {
            return {
                valid: false,
                message: 'Please enter a valid YouTube playlist URL. Example: https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMH6PmYvJz5hNqDxWx'
            };
        }
        
        return { valid: true };
    };

    const handleAddPlaylist = async (e) => {
        e.preventDefault();
        
        const validation = validatePlaylistUrl(playlistUrl);
        if (!validation.valid) {
            setError(validation.message);
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
            let errorMessage = 'Failed to add playlist. Please check the URL and try again.';
            
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                // Provide more helpful error messages
                if (err.message.includes('403') || err.message.includes('Forbidden')) {
                    errorMessage = 'YouTube is blocking the request. Please ensure the playlist is public and try again in a few minutes.';
                } else if (err.message.includes('404') || err.message.includes('not found')) {
                    errorMessage = 'Playlist not found. Please verify the URL is correct and the playlist exists.';
                } else if (err.message.includes('private') || err.message.includes('unavailable')) {
                    errorMessage = 'The playlist is private or unavailable. Please ensure the playlist is public and accessible.';
                } else if (err.message.includes('timeout') || err.message.includes('ECONNABORTED')) {
                    errorMessage = 'Request timed out. The playlist may be very large. Please try again or use a smaller playlist.';
                } else {
                    errorMessage = `Error: ${err.message}. Please verify the playlist URL is correct.`;
                }
            }
            
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

    const handleDeleteCourse = async (courseId, courseTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${courseTitle}"? This will permanently remove the course and all its videos. This action cannot be undone.`)) {
            return;
        }

        try {
            setDeletingCourseId(courseId);
            setError('');
            await deleteCourse(courseId);
            // Refresh the course list
            await fetchCourses();
        } catch (err) {
            console.error('Error deleting course:', err);
            setError(err.response?.data?.detail || 'Failed to delete course. Please try again.');
        } finally {
            setDeletingCourseId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Dispatch event to update App.js token state
        window.dispatchEvent(new Event('tokenUpdated'));
        // Navigate to landing page
        navigate('/', { replace: true });
    };

    const toggleUserMenu = () => {
        setShowUserMenu(!showUserMenu);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Filter courses based on search term
    const filteredCourses = courses.filter(course =>
        course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showUserMenu && !event.target.closest('.user-menu-container')) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    if (loading) {
        return <div className="admin-dashboard-loading">Loading...</div>;
    }

    return (
        <div className="admin-dashboard">
            <nav className="admin-nav">
                <div className="nav-container">
                    <Link to="/" className="logo-link">
                        <h1>EduTrack Admin</h1>
                    </Link>
                    <div className="nav-right">
                        <Link to="/dashboard" className="nav-link">Course Dashboard</Link>
                        <Link to="/students" className="nav-link">Student List</Link>
                        <div className="user-menu-container">
                            <button className="user-menu-button" onClick={toggleUserMenu}>
                                <div className="user-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <span className="user-name">{user?.name || 'Admin'}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>
                            {showUserMenu && (
                                <div className="user-menu-dropdown">
                                    <div className="user-menu-header">
                                        <div className="user-avatar-large">
                                            {user?.name?.charAt(0).toUpperCase() || 'A'}
                                        </div>
                                        <div className="user-info-header">
                                            <h3>{user?.name}</h3>
                                            <p>{user?.email}</p>
                                            <span className="user-role-badge admin-badge">Admin</span>
                                        </div>
                                    </div>
                                    <div className="user-menu-footer">
                                        <button onClick={handleLogout} className="logout-button">
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className="admin-main">
                <div className="admin-header">
                    <h1>Admin Dashboard</h1>
                    <p className="admin-subtitle">Manage courses and content</p>
                </div>

                <div className="admin-content">
                    <section className="add-course-section">
                        <div className="section-header">
                            <h2>Add New Course</h2>
                            <button 
                                className="toggle-form-btn"
                                onClick={() => {
                                    setShowAddForm(!showAddForm);
                                    setError('');
                                }}
                            >
                                {showAddForm ? 'Cancel' : '+ Add Courses'}
                            </button>
                        </div>

                        {showAddForm && (
                            <div className="add-playlist-form">
                                <h3>Add Course from YouTube Playlist</h3>
                                <form onSubmit={handleAddPlaylist}>
                                    <div className="form-group">
                                        <label htmlFor="playlistUrl">YouTube Playlist URL</label>
                                        <input
                                            type="url"
                                            id="playlistUrl"
                                            value={playlistUrl}
                                            onChange={(e) => {
                                                setPlaylistUrl(e.target.value);
                                                setError(''); // Clear error when user types
                                            }}
                                            placeholder="https://www.youtube.com/playlist?list=PLrAXtmRdnEQy6nuLMH6PmYvJz5hNqDxWx"
                                            required
                                        />
                                        <small className="form-hint">
                                            <strong>Valid formats:</strong><br />
                                            • https://www.youtube.com/playlist?list=PLAYLIST_ID<br />
                                            • https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID<br />
                                            <em>Note: The playlist must be public and accessible.</em>
                                        </small>
                                    </div>
                                    <button type="submit" className="submit-btn" disabled={adding}>
                                        {adding ? 'Processing Playlist... This may take a minute' : 'Add Course'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}
                    </section>

                    <section className="courses-management-section">
                        <div className="section-header">
                            <h2>Course Catalog ({courses.length})</h2>
                            <p className="section-description">
                                All courses available to students
                            </p>
                        </div>

                        {courses.length > 0 && (
                            <div className="search-container">
                                <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search courses..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                                {searchTerm && (
                                    <button
                                        className="clear-search-btn"
                                        onClick={() => setSearchTerm('')}
                                        title="Clear search"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        )}

                        {courses.length === 0 ? (
                            <div className="empty-state">
                                <p>No courses available yet.</p>
                                <p>Add a YouTube playlist to create your first course!</p>
                            </div>
                        ) : filteredCourses.length === 0 ? (
                            <div className="empty-state">
                                <p>No courses found matching "{searchTerm}".</p>
                                <p>Try a different search term.</p>
                            </div>
                        ) : (
                            <div className="admin-courses-grid">
                                {filteredCourses.map((course) => {
                                    const thumbnail = courseThumbnails[course.id] || null;
                                    return (
                                    <div key={course.id} className="admin-course-card">
                                        <div className="course-card-header">
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
                                                📚
                                            </div>
                                        </div>
                                        <h3 className="course-title">{course.course_title}</h3>
                                        <div className="course-card-footer">
                                            <div className="course-card-actions">
                                                <Link to={`/course/${course.id}`} className="btn-view">
                                                    View Course
                                                </Link>
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDeleteCourse(course.id, course.course_title)}
                                                    disabled={deletingCourseId === course.id}
                                                    title="Delete course"
                                                >
                                                    {deletingCourseId === course.id ? (
                                                        'Deleting...'
                                                    ) : (
                                                        <>
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                                            </svg>
                                                            Delete
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
