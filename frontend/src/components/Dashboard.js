import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api';
import './Dashboard.css';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUser = async () => {
            try {
                const userData = await getCurrentUser(token);
                setUser(userData);
            } catch (err) {
                console.error('Failed to fetch user:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) {
        return <div className="dashboard-loading">Loading...</div>;
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>Welcome to EduTrack</h1>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
            <div className="dashboard-content">
                {user && (
                    <div className="user-info">
                        <h2>User Information</h2>
                        <p><strong>Name:</strong> {user.name}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Username:</strong> {user.user_name}</p>
                        <p><strong>Role:</strong> {user.role}</p>
                        <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
