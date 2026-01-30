import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCourses, addYouTubePlaylist } from '../api';
import './CourseCatalog.css';

const CourseCatalog = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [adding, setAdding] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const data = await getCourses();
            setCourses(data);
            setError('');
        } catch (err) {
            console.error('Error fetching courses:', err);
            setError('Failed to load courses. Please try again.');
        } finally {
            setLoading(false);
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
                <button 
                    className="add-course-btn"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Cancel' : '+ Add YouTube Playlist'}
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
                    {courses.map((course) => (
                        <div
                            key={course.id}
                            className="course-card"
                            onClick={() => handleCourseClick(course.id)}
                        >
                            <div className="course-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="9" y1="9" x2="15" y2="9"></line>
                                    <line x1="9" y1="15" x2="15" y2="15"></line>
                                </svg>
                            </div>
                            <h3 className="course-title">{course.course_title}</h3>
                            {course.link && (
                                <p className="course-link">
                                    <a 
                                        href={course.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        View on YouTube →
                                    </a>
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CourseCatalog;
