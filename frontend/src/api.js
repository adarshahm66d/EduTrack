import axios from 'axios';

// RIGHT: Use the env var or default to the real URL string
const API_URL = process.env.REACT_APP_API_URL || 'https://edutrack-backend-163165605136.us-central1.run.app';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout - backend may be slow to respond');
        } else if (error.message === 'Network Error') {
            console.error('Network error - check if backend is running on', API_URL);
        }
        return Promise.reject(error);
    }
);

// Auth Service API
export const signup = async (userData) => {
    const response = await api.post('/auth/signup', userData);
    return response.data;
};

export const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('/auth/users/me');
    return response.data;
};

export const getAllStudents = async () => {
    const response = await api.get('/auth/users/students');
    return response.data;
};

// Course Service API
export const getCourses = async () => {
    const response = await api.get('/courses');
    return response.data;
};

export const getCourse = async (courseId) => {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
};

export const deleteCourse = async (courseId) => {
    const response = await api.delete(`/courses/${courseId}`);
    return response.data;
};

export const getCourseRegistration = async (courseId) => {
    const response = await api.get(`/courses/${courseId}/registration`);
    return response.data;
};

export const registerForCourse = async (courseId) => {
    const response = await api.post(`/courses/${courseId}/register`);
    return response.data;
};

// Video Service API
export const getCourseVideos = async (courseId) => {
    const response = await api.get(`/courses/${courseId}/videos`);
    return response.data;
};

export const addYouTubePlaylist = async (playlistUrl) => {
    // Use a longer timeout for playlist extraction (2 minutes)
    const response = await api.post('/videos/youtube-playlist', {
        playlist_url: playlistUrl,
    }, {
        timeout: 120000, // 2 minutes timeout for playlist extraction
    });
    return response.data;
};

// Progress Service API
export const trackProgress = async (progressData) => {
    const response = await api.post('/progress', progressData);
    return response.data;
};

export const getVideoProgress = async (videoId) => {
    const response = await api.get(`/progress/video/${videoId}`);
    return response.data;
};

// Attendance Service API (now part of progress service, but still available at /attendance/*)
export const getAttendanceByDate = async (date) => {
    const response = await api.get(`/attendance/date/${date}`);
    return response.data;
};

export const getUserAttendance = async (userId) => {
    const response = await api.get(`/attendance/user/${userId}`);
    return response.data;
};

export default api;
