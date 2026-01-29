import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({
        user_name: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await login(formData);
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('user', JSON.stringify(response.user));
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            if (err.response) {
                setError(err.response?.data?.detail || err.response?.data?.message || 'Login failed. Please try again.');
            } else if (err.request) {
                setError('Cannot connect to server. Make sure the backend is running on http://localhost:8000');
            } else {
                setError(err.message || 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login to EduTrack</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="user_name">Username</label>
                        <input
                            type="text"
                            id="user_name"
                            name="user_name"
                            value={formData.user_name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="auth-link">
                    Don't have an account? <Link to="/signup">Sign up here</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
