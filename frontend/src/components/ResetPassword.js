import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        token: '',
        new_password: '',
        confirm_password: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Get token from URL params if available
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            setFormData(prev => ({ ...prev, token: tokenFromUrl }));
        }
    }, [searchParams]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.new_password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (formData.new_password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            await resetPassword(formData.token, formData.new_password);
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 3000);
        } catch (err) {
            console.error('Reset password error:', err);
            if (err.response) {
                setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to reset password. Please try again.');
            } else if (err.request) {
                setError('Cannot connect to server. Make sure the backend is running on http://localhost:8000');
            } else {
                setError(err.message || 'Failed to reset password. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>Password Reset Successful</h2>
                    <div className="success-message">
                        <p>Your password has been reset successfully!</p>
                        <p>Redirecting to login page...</p>
                    </div>
                    <p className="auth-link">
                        <Link to="/login">Go to Login</Link>
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Reset Password</h2>
                <p className="auth-subtitle">
                    Enter your reset token and new password.
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="token">Reset Token</label>
                        <input
                            type="text"
                            id="token"
                            name="token"
                            value={formData.token}
                            onChange={handleChange}
                            required
                            placeholder="Enter your reset token"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="new_password">New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="new_password"
                                name="new_password"
                                value={formData.new_password}
                                onChange={handleChange}
                                required
                                placeholder="Enter your new password"
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm_password">Confirm New Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirm_password"
                                name="confirm_password"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                required
                                placeholder="Confirm your new password"
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>

                <p className="auth-link">
                    Remember your password? <Link to="/login">Login here</Link>
                </p>
                <p className="auth-link">
                    Need a new token? <Link to="/forgot-password">Request one here</Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPassword;
