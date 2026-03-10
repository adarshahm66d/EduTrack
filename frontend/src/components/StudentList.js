import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllStudents, getCurrentUser, getAttendanceByDate } from '../api';
import Pagination from './Pagination';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({}); // Map of user_id -> attendance record
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const navigate = useNavigate();
    
    // Pagination and sorting state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortBy, setSortBy] = useState('attendance');
    const [sortOrder, setSortOrder] = useState('desc');
    const [paginationData, setPaginationData] = useState({
        total: 0,
        totalPages: 0
    });
    
    // Sort options cycle: attendance_desc -> attendance_asc -> created_at_desc -> created_at_asc -> attendance_desc
    const sortOptions = [
        { sortBy: 'attendance', sortOrder: 'desc', label: 'Attendance (High to Low)' },
        { sortBy: 'attendance', sortOrder: 'asc', label: 'Attendance (Low to High)' },
        { sortBy: 'created_at', sortOrder: 'desc', label: 'Member Since (Newest)' },
        { sortBy: 'created_at', sortOrder: 'asc', label: 'Member Since (Oldest)' }
    ];
    
    const [currentSortIndex, setCurrentSortIndex] = useState(0);
    
    // Sync currentSortIndex with sortBy and sortOrder
    useEffect(() => {
        const index = sortOptions.findIndex(
            opt => opt.sortBy === sortBy && opt.sortOrder === sortOrder
        );
        if (index !== -1) {
            setCurrentSortIndex(index);
        }
    }, [sortBy, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            
            const params = {
                page: currentPage,
                page_size: pageSize,
                sort_by: sortBy,
                sort_order: sortOrder
            };
            
            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }
            
            // Add attendance_date if sorting by attendance
            if (sortBy === 'attendance' && selectedDate) {
                params.attendance_date = selectedDate;
            }
            
            const data = await getAllStudents(params);
            
            // Handle paginated response
            if (data && data.items) {
                setStudents(data.items);
                setPaginationData({
                    total: data.total,
                    totalPages: data.total_pages
                });
            } else if (Array.isArray(data)) {
                // Fallback for non-paginated response
                setStudents(data);
                setPaginationData({
                    total: data.length,
                    totalPages: 1
                });
            } else {
                console.error('Invalid response format:', data);
                setError('Invalid response from server. Please try again.');
                setStudents([]);
                setPaginationData({ total: 0, totalPages: 0 });
            }
        } catch (err) {
            console.error('Failed to fetch students:', err);
            setError('Failed to load student list. Please try again.');
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            }
            setStudents([]);
            setPaginationData({ total: 0, totalPages: 0 });
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, sortBy, sortOrder, searchTerm, selectedDate, navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUser = async () => {
            try {
                const userData = await getCurrentUser();
                setUser(userData);

                // Redirect if not admin
                if (userData.role !== 'admin') {
                    navigate('/dashboard');
                    return;
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
                if (err.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    navigate('/login');
                }
            }
        };

        fetchUser();
    }, [navigate]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchStudents();
        }
    }, [fetchStudents, user]);

    useEffect(() => {
        // Fetch attendance for selected date
        if (user?.role === 'admin' && selectedDate) {
            const dateToFetch = selectedDate || new Date().toISOString().split('T')[0];
            fetchAttendanceForDate(dateToFetch);
        }
    }, [selectedDate, user]);
    
    // Reset to page 1 when search term changes
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm]);

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

    const fetchAttendanceForDate = async (date) => {
        try {
            setLoadingAttendance(true);
            const attendanceData = await getAttendanceByDate(date);
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
            setError('Failed to load attendance data. Please try again.');
        } finally {
            setLoadingAttendance(false);
        }
    };

    const handleDateChange = async (e) => {
        const newDate = e.target.value;
        setSelectedDate(newDate);
        await fetchAttendanceForDate(newDate);
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

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
    };

    const handleSortToggle = () => {
        // Cycle to next sort option
        const nextIndex = (currentSortIndex + 1) % sortOptions.length;
        setCurrentSortIndex(nextIndex);
        const nextSort = sortOptions[nextIndex];
        setSortBy(nextSort.sortBy);
        setSortOrder(nextSort.sortOrder);
        setCurrentPage(1);
    };
    
    const getCurrentSortLabel = () => {
        return sortOptions[currentSortIndex].label;
    };

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
                        <div className="date-filter-container">
                            <label htmlFor="attendance-date">Date: </label>
                            <input
                                type="date"
                                id="attendance-date"
                                value={selectedDate}
                                onChange={handleDateChange}
                                className="date-input"
                            />
                        </div>
                        <button
                            className="sort-toggle-btn"
                            onClick={handleSortToggle}
                            title="Click to cycle through sort options"
                        >
                            <span className="sort-label">Sort: {getCurrentSortLabel()}</span>
                            <span className="sort-icon">
                                {sortOrder === 'desc' ? '↓' : '↑'}
                            </span>
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {students.length === 0 && !loading ? (
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
                                        <th>
                                            Attendance ({new Date(selectedDate).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })})
                                        </th>
                                        <th>Status</th>
                                        <th>Member Since</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((student) => {
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
                                                    {loadingAttendance ? (
                                                        <span className="loading-text">Loading...</span>
                                                    ) : (
                                                        attendance?.total_time ? formatTime(attendance.total_time) : '0:00:00'
                                                    )}
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
                    {paginationData.totalPages > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={paginationData.totalPages}
                            onPageChange={handlePageChange}
                            pageSize={pageSize}
                            total={paginationData.total}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentList;
