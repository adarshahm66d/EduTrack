import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../api';
import './Landing.css';

const Landing = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const data = await getCourses();
                setCourses(data);
            } catch (err) {
                setError('Failed to load courses. Please try again later.');
                console.error('Error fetching courses:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, []);

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
                                {courses.map((course) => (
                                    <div key={course.id} className="course-card">
                                        <div className="course-card-header">
                                            <div className="course-icon">📚</div>
                                            <h3 className="course-title">{course.course_title}</h3>
                                        </div>
                                        <div className="course-card-body">
                                            {course.link && (
                                                <a
                                                    href={course.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="course-link"
                                                >
                                                    View Course Details →
                                                </a>
                                            )}
                                        </div>
                                        <div className="course-card-footer">
                                            {token ? (
                                                <Link to={`/dashboard?course=${course.id}`} className="btn-enroll">
                                                    Enroll Now
                                                </Link>
                                            ) : (
                                                <Link to="/signup" className="btn-enroll">
                                                    Sign Up to Enroll
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <footer className="landing-footer">
                <div className="footer-content">
                    <p>&copy; 2024 EduTrack. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
