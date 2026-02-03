import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getCourses, getCourseVideos, getCourseRegistration, registerForCourse, getEnrollmentCount } from '../api';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [courseThumbnails, setCourseThumbnails] = useState({});
    const [courseRegistrations, setCourseRegistrations] = useState({});
    const [loading, setLoading] = useState(true);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [registeringCourseId, setRegisteringCourseId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [enrollmentCount, setEnrollmentCount] = useState({ enrolled_count: 0, max_enrollments: 3 });
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const extractVideoId = (url) => {
            if (!url) return null;

            // Try multiple patterns to extract video ID
            const patterns = [
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
                /[?&]v=([a-zA-Z0-9_-]{11})/,
                /youtu\.be\/([a-zA-Z0-9_-]{11})/,
                /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
            ];

            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match && match[1]) {
                    return match[1];
                }
            }

            return null;
        };

        const fetchData = async () => {
            try {
                const [userData, coursesData] = await Promise.all([
                    getCurrentUser(),
                    getCourses()
                ]);
                setUser(userData);
                setCourses(coursesData);

                // Fetch thumbnails for each course in parallel
                const thumbnailPromises = coursesData.map(async (course) => {
                    try {
                        const videos = await getCourseVideos(course.id);
                        if (videos && videos.length > 0 && videos[0].video_link) {
                            const videoId = extractVideoId(videos[0].video_link);
                            if (videoId) {
                                const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                                return {
                                    courseId: course.id,
                                    thumbnail: thumbnailUrl
                                };
                            } else {
                                console.warn(`Could not extract video ID from: ${videos[0].video_link}`);
                            }
                        } else {
                            console.warn(`No videos found for course ${course.id}`);
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

                // Fetch registration status for each course (only for students)
                if (userData.role === 'student') {
                    // Fetch enrollment count
                    try {
                        const enrollmentData = await getEnrollmentCount();
                        setEnrollmentCount(enrollmentData);
                    } catch (err) {
                        console.error('Error fetching enrollment count:', err);
                    }

                    const registrationPromises = coursesData.map(async (course) => {
                        try {
                            const registration = await getCourseRegistration(course.id);
                            return {
                                courseId: course.id,
                                enrolled: registration.enrolled
                            };
                        } catch (err) {
                            console.error(`Error fetching registration for course ${course.id}:`, err);
                            return { courseId: course.id, enrolled: false };
                        }
                    });

                    const registrationResults = await Promise.all(registrationPromises);
                    const registrationMap = {};
                    registrationResults.forEach(({ courseId, enrolled }) => {
                        registrationMap[courseId] = enrolled;
                    });

                    setCourseRegistrations(registrationMap);
                }
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
        // Dispatch event to update App.js token state
        window.dispatchEvent(new Event('tokenUpdated'));
        // Navigate to landing page
        navigate('/', { replace: true });
    };

    const toggleUserMenu = () => {
        setShowUserMenu(!showUserMenu);
    };

    const handleRegister = async (courseId, e) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            setRegisteringCourseId(courseId);
            await registerForCourse(courseId);
            // Update registration status
            setCourseRegistrations(prev => ({
                ...prev,
                [courseId]: true
            }));
            // Refresh enrollment count
            if (user?.role === 'student') {
                try {
                    const enrollmentData = await getEnrollmentCount();
                    setEnrollmentCount(enrollmentData);
                } catch (err) {
                    console.error('Error fetching enrollment count:', err);
                }
            }
        } catch (err) {
            console.error('Error registering for course:', err);
            const errorMessage = err.response?.data?.detail || 'Failed to register for course. Please try again.';
            alert(errorMessage);
        } finally {
            setRegisteringCourseId(null);
        }
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
                    {user?.role === 'student' && (
                        <>
                            <p className="dashboard-subtitle">Continue your learning journey</p>
                            <p className="enrollment-info">
                                Enrolled in {enrollmentCount.enrolled_count} of {enrollmentCount.max_enrollments} courses
                                {enrollmentCount.enrolled_count >= enrollmentCount.max_enrollments && (
                                    <span className="enrollment-limit-reached"> (Limit reached)</span>
                                )}
                            </p>
                        </>
                    )}
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

                    {!coursesLoading && courses.length > 0 && (
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

                    {!coursesLoading && courses.length === 0 && (
                        <div className="empty-message">
                            <p>No courses available at the moment.</p>
                            <p>Check back soon for new courses!</p>
                        </div>
                    )}

                    {!coursesLoading && courses.length > 0 && filteredCourses.length === 0 && (
                        <div className="empty-message">
                            <p>No courses found matching "{searchTerm}".</p>
                            <p>Try a different search term.</p>
                        </div>
                    )}

                    {!coursesLoading && filteredCourses.length > 0 && (
                        <div className="courses-grid">
                            {filteredCourses.map((course) => {
                                const thumbnail = courseThumbnails[course.id] || null;

                                return (
                                    <div key={course.id} className="course-card">
                                        <div className="course-thumbnail-wrapper">
                                            {thumbnail ? (
                                                <img
                                                    src={thumbnail}
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
                                                style={{ display: thumbnail ? 'none' : 'flex' }}
                                            >
                                                📚
                                            </div>
                                            <div className="play-overlay-dashboard">
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
                                                    <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.6)" />
                                                    <polygon points="10,8 16,12 10,16" fill="white" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="course-card-header">
                                            <h3 className="course-title">{course.course_title}</h3>
                                        </div>
                                        {user?.role === 'student' && (
                                            <div className="course-card-footer">
                                                {courseRegistrations[course.id] ? (
                                                    <Link to={`/course/${course.id}`} className="btn-enroll">
                                                        Start Course
                                                    </Link>
                                                ) : (
                                                    <button
                                                        className="btn-enroll"
                                                        onClick={(e) => handleRegister(course.id, e)}
                                                        disabled={
                                                            registeringCourseId === course.id ||
                                                            (user?.role === 'student' && enrollmentCount.enrolled_count >= enrollmentCount.max_enrollments)
                                                        }
                                                        title={
                                                            user?.role === 'student' && enrollmentCount.enrolled_count >= enrollmentCount.max_enrollments
                                                                ? 'You have reached the maximum enrollment limit of 3 courses'
                                                                : ''
                                                        }
                                                    >
                                                        {registeringCourseId === course.id ? 'Registering...' : 'Register'}
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
