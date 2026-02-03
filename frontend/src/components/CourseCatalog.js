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
    const [expandedCourses, setExpandedCourses] = useState(new Set());
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
            const errorMessage = err.response?.data?.detail || err.message || 'Failed to add playlist. Please check the URL and try again.';
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
                                        <div className="course-description" role="region" aria-label="Course description">
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
