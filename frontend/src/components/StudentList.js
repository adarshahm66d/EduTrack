import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllStudents, getCurrentUser } from '../api';
import './StudentList.css';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
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
                const [userData, studentsData] = await Promise.all([
                    getCurrentUser(),
                    getAllStudents()
                ]);
                setUser(userData);
                
                // Redirect if not admin
                if (userData.role !== 'admin') {
                    navigate('/dashboard');
                    return;
                }
                
                setStudents(studentsData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load student list. Please try again.');
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            } finally {
                setLoading(false);
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

    const filteredStudents = students.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        return (
            student.name.toLowerCase().includes(searchLower) ||
            student.email.toLowerCase().includes(searchLower) ||
            student.user_name.toLowerCase().includes(searchLower)
        );
    });

    if (loading) {
        return <div className="student-list-loading">Loading...</div>;
    }

    if (error && students.length === 0) {
        return (
            <div className="student-list-error">
                <p>{error}</p>
                <Link to="/admin" className="btn-back">Back to Admin Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="student-list">
            <nav className="student-list-nav">
                <div className="nav-container">
                    <Link to="/" className="logo-link">
                        <h1>EduTrack</h1>
                    </Link>
                    <div className="nav-right">
                        <Link to="/admin" className="nav-link">Admin Dashboard</Link>
                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
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

            <main className="student-list-main">
                <div className="student-list-header">
                    <h1>Student List</h1>
                    <p className="student-list-subtitle">
                        View and manage all registered students
                    </p>
                </div>

                <div className="student-list-content">
                    <div className="search-section">
                        <input
                            type="text"
                            placeholder="Search by name, email, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <div className="student-count">
                            {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                            {searchTerm && ` found`}
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {filteredStudents.length === 0 ? (
                        <div className="empty-state">
                            <p>{searchTerm ? 'No students found matching your search.' : 'No students registered yet.'}</p>
                        </div>
                    ) : (
                        <div className="students-table-container">
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Member Since</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id}>
                                            <td>{student.id}</td>
                                            <td className="student-name">{student.name}</td>
                                            <td className="student-email">{student.email}</td>
                                            <td className="student-username">{student.user_name}</td>
                                            <td>
                                                <span className={`role-badge role-${student.role}`}>
                                                    {student.role}
                                                </span>
                                            </td>
                                            <td className="student-date">
                                                {new Date(student.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentList;
