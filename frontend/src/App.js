import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import CourseDetail from './components/CourseDetail';
import './App.css';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        // Listen for storage changes (when token is set in another component)
        const handleStorageChange = () => {
            setToken(localStorage.getItem('token'));
        };

        // Listen for custom event when login happens
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('tokenUpdated', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('tokenUpdated', handleStorageChange);
        };
    }, []);

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={!token ? <Login onLogin={() => setToken(localStorage.getItem('token'))} /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/signup" element={!token ? <Signup onSignup={() => setToken(localStorage.getItem('token'))} /> : <Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
                    <Route path="/course/:courseId" element={token ? <CourseDetail /> : <Navigate to="/login" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
