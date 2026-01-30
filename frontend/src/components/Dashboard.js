import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getCourses } from '../api';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coursesLoading, setCoursesLoading] = useState(true);
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
                setUser(userData);
                setCourses(coursesData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            } finally {
                setLoading(false);
                setCoursesLoading(false);
            }
        };

        fetchData();
    }, [navigate]);

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
        return <div className="dashboard-loading">Loading...</div>;
    }

    return (
        <div className="dashboard">
            <nav className="dashboard-nav">
                <div className="nav-container">
                    <Link to="/" className="logo-link">
                        <h1>EduTrack</h1>
                    </Link>
                    <div className="nav-right">
                        {user?.role === 'admin' && (
                            <Link to="/admin" className="nav-link">Admin Dashboard</Link>
                        )}
                        <div className="user-menu-container">
                            <button className="user-menu-button" onClick={toggleUserMenu}>
                                <div className="user-avatar">
                                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <span className="user-name">{user?.name || 'User'}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>
                            {showUserMenu && (
                                <div className="user-menu-dropdown">
                                    <div className="user-menu-header">
                                        <div className="user-avatar-large">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="user-info-header">
                                            <h3>{user?.name}</h3>
                                            <p>{user?.email}</p>
                                            <span className="user-role-badge">{user?.role}</span>
                                        </div>
                                    </div>
                                    <div className="user-menu-details">
                                        <div className="user-detail-item">
                                            <strong>Username:</strong>
                                            <span>{user?.user_name}</span>
                                        </div>
                                        <div className="user-detail-item">
                                            <strong>Role:</strong>
                                            <span>{user?.role}</span>
                                        </div>
                                        <div className="user-detail-item">
                                            <strong>Member since:</strong>
                                            <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
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

            <main className="dashboard-main">
                <div className="dashboard-header">
                    <h1>Welcome back, {user?.name}!</h1>
                    <p className="dashboard-subtitle">Continue your learning journey</p>
                </div>

                <section className="courses-section">
                    <div className="section-header-with-link">
                        <h2 className="section-title">Course Catalog</h2>
                        <Link to="/catalog" className="view-all-link">
                            View All Courses →
                        </Link>
                    </div>

                    {coursesLoading && (
                        <div className="loading-message">Loading courses...</div>
                    )}

                    {!coursesLoading && courses.length === 0 && (
                        <div className="empty-message">
                            <p>No courses available at the moment.</p>
                            <p>Check back soon for new courses!</p>
                        </div>
                    )}

                    {!coursesLoading && courses.length > 0 && (
                        <div className="courses-grid">
                            {courses.map((course) => {
                                const extractPlaylistId = (url) => {
                                    if (!url) return null;
                                    const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
                                    return match ? match[1] : null;
                                };
                                const playlistId = course.link ? extractPlaylistId(course.link) : null;
                                const playlistThumbnail = playlistId ? `https://img.youtube.com/vi_playlist/${playlistId}/mqdefault.jpg` : null;
                                
                                return (
                                    <div key={course.id} className="course-card">
                                        <div className="course-thumbnail-wrapper">
                                            {playlistThumbnail ? (
                                                <img 
                                                    src={playlistThumbnail} 
                                                    alt={course.course_title}
                                                    className="course-thumbnail-img"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div 
                                                className="course-icon"
                                                style={{ display: playlistThumbnail ? 'none' : 'flex' }}
                                            >
                                                📚
                                            </div>
                                            <div className="play-overlay-dashboard">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                                                    <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)"/>
                                                    <polygon points="10,8 16,12 10,16" fill="white"/>
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="course-card-header">
                                            <h3 className="course-title">{course.course_title}</h3>
                                        </div>
                                        <div className="course-card-footer">
                                            <Link to={`/course/${course.id}`} className="btn-enroll">
                                                Start Course
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
