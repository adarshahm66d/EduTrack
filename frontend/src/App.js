import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './components/Landing';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
    const token = localStorage.getItem('token');

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" />} />
                    <Route path="/signup" element={!token ? <Signup /> : <Navigate to="/dashboard" />} />
                    <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
