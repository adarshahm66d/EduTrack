import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourses, getCourseVideos } from '../api';

const Landing = () => {
    const [courses, setCourses] = useState([]);
    const [courseThumbnails, setCourseThumbnails] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedCourses, setExpandedCourses] = useState([]);

    const extractVideoId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    useEffect(() => {
        const fetchCourses = async () => {
            try {
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
            } catch (err) {
                setError('Failed to load courses. Please try again later.');
                console.error('Error fetching courses:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

    const toggleCourseDetails = (courseId) => {
        setExpandedCourses(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const getCourseDescription = (courseTitle) => {
        // Generate a default description based on course title
        const descriptions = {
            'JavaScript': 'Learn JavaScript from basics to advanced concepts. Master modern ES6+ features, DOM manipulation, async programming, and build real-world projects.',
            'C++': 'Master C++ programming with comprehensive tutorials covering object-oriented programming, data structures, algorithms, and advanced C++ features.',
            'HTML': 'Start your web development journey with HTML. Learn to create structured, semantic web pages and understand the foundation of modern web development.',
            'C Language': 'Learn the fundamentals of C programming language. Perfect for beginners to understand programming concepts, memory management, and system programming.',
            'Java': 'Comprehensive Java programming course covering OOP principles, collections framework, multithreading, and enterprise Java development.',
            'IT Security': 'Learn cybersecurity fundamentals, ethical hacking, network security, and best practices to protect systems and data from threats.'
        };

        return descriptions[courseTitle] || `Explore ${courseTitle} through comprehensive video tutorials. This course covers essential concepts and practical applications to help you master the subject.`;
    };

    const token = localStorage.getItem('token');

    return (
        <div className="landing">
            <nav className="landing-nav">
                <div className="nav-container">
                    <div className="logo">
                        <Link to="/" style={{ textDecoration: 'none' }}>
                            <h1>EduTrack</h1>
                        </Link>
                    </div>
                    <div className="nav-links">
                        {token ? (
                            <Link to="/dashboard" className="nav-link nav-link-primary">Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" className="nav-link">Login</Link>
                                <Link to="/signup" className="nav-link nav-link-primary">Sign Up</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            <main className="landing-main">
                <section className="hero-section">
                    <div className="hero-content">
                        <h1 className="hero-title">Welcome to EduTrack</h1>
                        <p className="hero-subtitle">
                            Discover and enroll in courses to advance your learning journey
                        </p>
                    </div>
                </section>

                <section className="courses-section">
                    <div className="courses-container">
                        <h2 className="section-title">Course Catalog</h2>

                        {loading && (
                            <div className="loading-message">Loading courses...</div>
                        )}

                        {error && (
                            <div className="error-message">{error}</div>
                        )}

                        {!loading && !error && courses.length === 0 && (
                            <div className="empty-message">
                                <p>No courses available at the moment.</p>
                                <p>Check back soon for new courses!</p>
                            </div>
                        )}

                        {!loading && !error && courses.length > 0 && (
                            <div className="courses-grid">
                                {courses.map((course) => {
                                    const isExpanded = expandedCourses.includes(course.id);
                                    const description = getCourseDescription(course.course_title);
                                    const thumbnail = courseThumbnails[course.id] || null;

                                    return (
                                        <div key={course.id} className={`course-card ${isExpanded ? 'expanded' : ''}`}>
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
                                            <div className="course-card-body">
                                                <h3 className="course-title">{course.course_title}</h3>
                                                {isExpanded && (
                                                    <div className="course-description" role="region" aria-label="Course description">
                                                        <p>{description}</p>
                                                    </div>
                                                )}
                                                <button
                                                    className="btn-show-details"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        toggleCourseDetails(course.id);
                                                    }}
                                                    aria-expanded={isExpanded}
                                                    aria-label={isExpanded ? 'Hide course details' : 'Show course details'}
                                                >
                                                    <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
                                                    <span className="details-arrow">
                                                        {isExpanded ? '▲' : '▼'}
                                                    </span>
                                                </button>
                                            </div>
                                            <div className="course-card-footer">
                                                {token ? (
                                                    <Link to={`/course/${course.id}`} className="btn-enroll">
                                                        View Course
                                                    </Link>
                                                ) : (
                                                    <Link to="/signup" className="btn-enroll">
                                                        Sign Up to Enroll
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="footer-content">
                    <p>&copy; 2026 EduTrack. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
