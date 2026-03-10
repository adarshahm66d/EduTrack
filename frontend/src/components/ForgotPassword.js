import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetToken, setResetToken] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setResetToken(null);

        try {
            const response = await forgotPassword(email);
            setSuccess(response.message);
            
            // In development, the token is returned
            if (response.reset_token) {
                setResetToken(response.reset_token);
            }
        } catch (err) {
            console.error('Forgot password error:', err);
            if (err.response) {
                setError(err.response?.data?.detail || err.response?.data?.message || 'Failed to process request. Please try again.');
            } else if (err.request) {
                setError('Cannot connect to server. Make sure the backend is running on http://localhost:8000');
            } else {
                setError(err.message || 'Failed to process request. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResetTokenClick = () => {
        if (resetToken) {
            navigate(`/reset-password?token=${resetToken}`);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Forgot Password</h2>
                <p className="auth-subtitle">
                    Enter your email address and we'll send you a password reset token.
                </p>
                
                {success && (
                    <div className="success-message">
                        <p>{success}</p>
                        {resetToken && (
                            <div className="reset-token-box">
                                <p><strong>Development Mode:</strong> Your reset token is:</p>
                                <div className="token-display">
                                    <code>{resetToken}</code>
                                </div>
                                <button
                                    type="button"
                                    className="token-link-btn"
                                    onClick={handleResetTokenClick}
                                >
                                    Use this token to reset password
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {error && <div className="error-message">{error}</div>}

                {!success && (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Enter your email address"
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Token'}
                        </button>
                    </form>
                )}

                <p className="auth-link">
                    Remember your password? <Link to="/login">Login here</Link>
                </p>
                <p className="auth-link">
                    Don't have an account? <Link to="/signup">Sign up here</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;
