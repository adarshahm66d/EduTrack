import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllStudents, getCurrentUser, getAttendanceByDate } from '../api';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // Map of user_id -> attendance record
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

                // Fetch today's attendance
                const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
                try {
                    const attendanceData = await getAttendanceByDate(today);
                    // Create a map of user_id -> attendance record
                    const attendanceMapObj = {};
                    if (attendanceData && Array.isArray(attendanceData)) {
                        attendanceData.forEach(attendance => {
                            if (attendance && attendance.user_id) {
                                attendanceMapObj[attendance.user_id] = attendance;
                            }
                        });
                    }
                    setAttendanceMap(attendanceMapObj);
                } catch (attendanceErr) {
                    console.error('Failed to fetch attendance:', attendanceErr);
                    // Don't fail the whole page if attendance fetch fails
                }
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
        // Dispatch event to update App.js token state
        window.dispatchEvent(new Event('tokenUpdated'));
        // Navigate to landing page
        navigate('/', { replace: true });
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
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Username</th>
                                        <th>Role</th>
                                        <th>Today's Attendance</th>
                                        <th>Status</th>
                                        <th>Member Since</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => {
                                        const attendance = attendanceMap[student.id];
                                        const formatTime = (timeStr) => {
                                            if (!timeStr) return 'N/A';
                                            // Handle PostgreSQL INTERVAL format (HH:MM:SS or days HH:MM:SS)
                                            const parts = timeStr.split(':');
                                            if (parts.length === 3) {
                                                const hours = parseInt(parts[0]) || 0;
                                                const minutes = parseInt(parts[1]) || 0;
                                                const seconds = parseInt(parts[2]) || 0;
                                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                            }
                                            return timeStr;
                                        };

                                        return (
                                            <tr key={student.id}>
                                                <td className="student-name">{student.name}</td>
                                                <td className="student-email">{student.email}</td>
                                                <td className="student-username">{student.user_name}</td>
                                                <td>
                                                    <span className={`role-badge role-${student.role}`}>
                                                        {student.role}
                                                    </span>
                                                </td>
                                                <td className="attendance-time">
                                                    {attendance?.total_time ? formatTime(attendance.total_time) : '0:00:00'}
                                                </td>
                                                <td>
                                                    {(() => {
                                                        if (!attendance) {
                                                            return <span className="attendance-status attendance-none">Not Started</span>;
                                                        }
                                                        const status = attendance.status;
                                                        if (status && status.trim() !== '') {
                                                            const statusClass = status.toLowerCase().replace(/\s+/g, '-');
                                                            return (
                                                                <span className={`attendance-status attendance-${statusClass}`}>
                                                                    {status}
                                                                </span>
                                                            );
                                                        }
                                                        // If attendance exists but no status, show "In Progress"
                                                        return <span className="attendance-status attendance-in-progress">In Progress</span>;
                                                    })()}
                                                </td>
                                                <td className="student-date">
                                                    {new Date(student.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
