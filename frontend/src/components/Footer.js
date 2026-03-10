import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="app-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>EduTrack</h3>
                    <p>Your comprehensive learning management system for tracking courses, progress, and attendance.</p>
                </div>
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/catalog">Course Catalog</Link></li>
                        <li><Link to="/dashboard">Dashboard</Link></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>Account</h4>
                    <ul>
                        <li><Link to="/login">Login</Link></li>
                        <li><Link to="/signup">Sign Up</Link></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>About</h4>
                    <p>EduTrack helps students and educators manage courses, track learning progress, and monitor attendance efficiently.</p>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {currentYear} EduTrack. All rights reserved.</p>
            </div>
        </footer>
    );
};

export default Footer;
