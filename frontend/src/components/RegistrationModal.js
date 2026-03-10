import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signup } from '../api';

const RegistrationModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        user_name: '',
        password: '',
        phone: '',
        date_of_birth: ''
    });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        // Validate password match
        if (formData.password !== confirmPassword) {
            setError('Passwords do not match. Please try again.');
            setLoading(false);
            return;
        }

        // Validate password length
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        // Validate phone number format (optional but if provided, should be valid)
        if (formData.phone && formData.phone.trim() && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
            setError('Please enter a valid phone number.');
            setLoading(false);
            return;
        }

        // Automatically detect role based on email
        const detectedRole = formData.email.toLowerCase().includes('admin') ? 'admin' : 'student';
        const signupData = {
            name: formData.name,
            email: formData.email,
            user_name: formData.user_name,
            password: formData.password,
            role: detectedRole,
            phone: formData.phone.trim() || null,
            date_of_birth: formData.date_of_birth || null
        };

        try {
            await signup(signupData);
            // Reset form
            setFormData({
                name: '',
                email: '',
                user_name: '',
                password: '',
                phone: '',
                date_of_birth: ''
            });
            setConfirmPassword('');
            onClose();
            // Show success message and navigate to login
            alert('Registration successful! Please login with your credentials.');
            navigate('/login');
        } catch (err) {
            console.error('Signup error:', err);
            if (err.response) {
                setError(err.response?.data?.detail || err.response?.data?.message || 'Registration failed. Please try again.');
            } else if (err.request) {
                setError('Cannot connect to server. Make sure the backend is running on http://localhost:8000');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                name: '',
                email: '',
                user_name: '',
                password: '',
                phone: '',
                date_of_birth: ''
            });
            setConfirmPassword('');
            setError('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Register for EduTrack</h2>
                    <button className="modal-close-btn" onClick={handleClose} disabled={loading}>
                        ×
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="registration-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email Address *</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="user_name">Username *</label>
                        <input
                            type="text"
                            id="user_name"
                            name="user_name"
                            value={formData.user_name}
                            onChange={handleChange}
                            required
                            placeholder="Choose a username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Enter your phone number (optional)"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="date_of_birth">Date of Birth</label>
                        <input
                            type="date"
                            id="date_of_birth"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password *</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Create a password (min 6 characters)"
                                minLength="6"
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
                        <label htmlFor="confirmPassword">Confirm Password *</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setError('');
                                }}
                                required
                                placeholder="Confirm your password"
                                minLength="6"
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

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={handleClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationModal;
