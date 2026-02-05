import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCourses, setExpandedCourses] = useState({});

    const navigate = useNavigate();

    const extractVideoId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    };

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getCourses();
            
            // Ensure data is an array
            if (!Array.isArray(data)) {
                console.error('Invalid response format:', data);
                setError('Invalid response from server. Please try again.');
                setCourses([]);
                return;
            }
            
            setCourses(data);
            
            // Only fetch thumbnails if there are courses
            if (data.length > 0) {
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
            } else {
                // No courses, clear thumbnails
                setCourseThumbnails({});
            }
            
            setError('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to load courses. Please check if the backend is running.';
            setError(errorMessage);
            setCourses([]);
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
            }
        };
        
        fetchUser();
        fetchCourses();
    }, [fetchCourses]);

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
        } finally {
            setAdding(false);
        }
    };

    const handleCourseClick = (courseId) => {
        navigate(`/course/${courseId}`);
    };

    const toggleCourseDetails = (courseId) => {
        setExpandedCourses((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(courseId)) {
                newSet.delete(courseId);
            } else {
                newSet.add(courseId);
            }
            return newSet;
        });
    };

    const getCourseDescription = (courseTitle) => {
        // Generate unique descriptions based on course title keywords
        const titleLower = courseTitle.toLowerCase();
        
        // Python-related - check for "python" first
        if (titleLower.includes('python')) {
            if (titleLower.includes('full course') || titleLower.includes('2025') || titleLower.includes('2026')) {
                return 'Complete Python programming course for 2025-26. Master Python from basics to advanced: variables, data types, OOP, file handling, web development, and data science. Perfect for beginners and intermediate learners.';
            }
            return 'Master Python programming from fundamentals to advanced topics. Learn syntax, data structures, object-oriented programming, and build real-world applications with hands-on projects.';
        }
        
        // Java-related - check specific patterns
        if (titleLower.includes('java')) {
            if (titleLower.includes('dsa') || (titleLower.includes('30 days') && titleLower.includes('placement'))) {
                return 'Intensive 30-day Java and Data Structures course designed for placement preparation. Master core Java concepts, algorithms, data structures, and problem-solving with practical coding examples and interview preparation.';
            }
            if (titleLower.includes('full stack') || titleLower.includes('developer')) {
                return 'Become a Full Stack Java Developer with this comprehensive course. Learn backend development with Spring Boot, databases, REST APIs, frontend integration, and build end-to-end applications from scratch.';
            }
            return 'Learn Java programming from scratch. Cover object-oriented programming, collections framework, multithreading, JDBC, and enterprise development with Spring framework.';
        }
        
        // C/C++ related - check specific patterns
        if (titleLower.includes('c++') || titleLower.includes('cpp') || (titleLower.includes('learn c++'))) {
            return 'Master C++ programming with step-by-step tutorials. Learn from basics to advanced concepts including OOP, STL containers, memory management, templates, and modern C++ features. Perfect for beginners.';
        }
        if (titleLower.includes('c programming for beginners') || (titleLower.includes('c programming') && titleLower.includes('beginner'))) {
            return 'Perfect for absolute beginners! Learn C programming fundamentals including variables, data types, control structures, functions, pointers, arrays, and file handling with practical examples and exercises.';
        }
        if (titleLower.includes('programming in c') && !titleLower.includes('beginner')) {
            return 'Complete introduction to C programming language. Understand programming fundamentals, syntax, memory management, data structures, and build your first C programs from scratch with hands-on practice.';
        }
        
        // React/JavaScript related - check specific patterns
        if (titleLower.includes('react')) {
            if (titleLower.includes('hindi') || titleLower.includes('tutorials in hindi')) {
                return 'React.js को हिंदी में सीखें! Master React fundamentals, hooks, components, state management, routing, and build modern web applications with step-by-step tutorials in Hindi.';
            }
            if (titleLower.includes('chai') || (titleLower.includes('react') && titleLower.includes('project'))) {
                return 'Learn React.js with hands-on projects and real-world examples. Build complete applications, understand component architecture, hooks, routing, context API, and modern React development practices.';
            }
            return 'Master React.js from basics to advanced. Learn functional components, hooks, context API, React Router, state management, and build interactive single-page applications.';
        }
        if (titleLower.includes('javascript')) {
            return 'Complete JavaScript course covering ES6+, async programming, promises, async/await, DOM manipulation, APIs, and modern JavaScript features. Build dynamic and interactive web applications.';
        }
        
        // HTML/CSS related
        if (titleLower.includes('html')) {
            return 'Learn HTML5 fundamentals and modern web development. Master semantic HTML, forms, multimedia elements, accessibility features, and create well-structured, responsive web pages.';
        }
        
        // Web Development
        if (titleLower.includes('web development') || titleLower.includes('web dev')) {
            return 'Full-stack web development course covering HTML, CSS, JavaScript, backend technologies, databases, APIs, and deployment. Build complete, production-ready web applications.';
        }
        
        // UX/UI Design
        if (titleLower.includes('ux') || titleLower.includes('design')) {
            return 'Learn UX/UI design principles, user research methodologies, wireframing, prototyping, design systems, and modern design tools. Create user-friendly, accessible interfaces.';
        }
        
        // Security
        if (titleLower.includes('security') || titleLower.includes('cyber')) {
            return 'Comprehensive cybersecurity course covering network security, ethical hacking, vulnerability assessment, encryption, penetration testing, and best practices for protecting systems and data.';
        }
        
        // Default: Generate a more unique description based on title
        const words = courseTitle.split(/\s+/).filter(w => w.length > 2);
        const mainTopic = words[0] || 'this subject';
        return `Dive deep into ${mainTopic} with this comprehensive course. Learn essential concepts, practical skills, and real-world applications through structured video tutorials designed for all skill levels.`;
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    // Filter courses based on search term
    const filteredCourses = courses.filter(course =>
        course.course_title.toLowerCase().includes(searchTerm.toLowerCase())
    );


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
                <div className="catalog-header-left">
                    <Link 
                        to="/dashboard" 
                        className="back-button"
                        title="Back to Dashboard"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        <span>Back</span>
                    </Link>
                    <h1>Course Catalog</h1>
                </div>
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
                    <p>Add a YouTube playlist to get started!</p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="empty-state">
                    <p>No courses found matching "{searchTerm}".</p>
                    <p>Try a different search term.</p>
                </div>
            ) : (
                <div className="courses-grid">
                    {filteredCourses.map((course) => {
                        const thumbnail = courseThumbnails[course.id] || null;
                        const isExpanded = expandedCourses.has(course.id);
                        const description = getCourseDescription(course.course_title);
                        return (
                            <div
                                key={course.id}
                                className={`course-card ${isExpanded ? 'expanded' : ''}`}
                            >
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
                                        <div 
                                            className="course-description"
                                            role="region" 
                                            aria-label="Course description"
                                        >
                                            <p>{description}</p>
                                        </div>
                                    )}
                                    <button
                                        className="btn-show-details"
                                        onClick={(e) => {
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
                                {user?.role !== 'admin' && (
                                    <div className="course-card-footer">
                                        <button
                                            className="btn-enroll"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCourseClick(course.id);
                                            }}
                                        >
                                            Start Course
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
