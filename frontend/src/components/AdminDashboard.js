import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getCourses, addYouTubePlaylist, deleteCourse } from '../api';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const [deletingCourseId, setDeletingCourseId] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [userData, coursesData] = await Promise.all([
                    getCurrentUser(token),
                    getCourses()
                ]);
                
                // Check if user is admin
                if (userData.role !== 'admin') {
                    navigate('/dashboard');
                    return;
                }
                
                setUser(userData);
                setCourses(coursesData);
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
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        }
    };

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
        navigate('/login');
    };

    const toggleUserMenu = () => {
        setShowUserMenu(!showUserMenu);
    };

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
                                            onChange={(e) => setPlaylistUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/playlist?list=..."
                                            required
                                        />
                                        <small className="form-hint">
                                            Paste a YouTube playlist URL. All videos in the playlist will be added as course videos.
                                        </small>
                                    </div>
                                    <button type="submit" className="submit-btn" disabled={adding}>
                                        {adding ? 'Adding Course...' : 'Add Course'}
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

                        {courses.length === 0 ? (
                            <div className="empty-state">
                                <p>No courses available yet.</p>
                                <p>Add a YouTube playlist to create your first course!</p>
                            </div>
                        ) : (
                            <div className="admin-courses-grid">
                                {courses.map((course) => (
                                    <div key={course.id} className="admin-course-card">
                                        <div className="course-card-header">
                                            <div className="course-icon">📚</div>
                                            <h3 className="course-title">{course.course_title}</h3>
                                        </div>
                                        <div className="course-card-body">
                                            {course.link && (
                                                <div className="course-link-info">
                                                    <a 
                                                        href={course.link} 
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="playlist-link"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                            <polyline points="15 3 21 3 21 9"></polyline>
                                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                                        </svg>
                                                        View Playlist
                                                    </a>
                                                </div>
                                            )}
                                        </div>
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
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
