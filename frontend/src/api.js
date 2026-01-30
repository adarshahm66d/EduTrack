import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

export const getCurrentUser = async (token) => {
    const response = await api.get('/auth/users/me', {
        params: { token },
    });
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

// Video Service API
export const getCourseVideos = async (courseId) => {
    const response = await api.get(`/videos/course/${courseId}`);
    return response.data;
};

export const addYouTubePlaylist = async (playlistUrl) => {
    const response = await api.post('/videos/youtube-playlist', {
        playlist_url: playlistUrl,
    });
    return response.data;
};

// Progress Tracking API
export const updateVideoProgress = async (courseId, videoId, watchTime) => {
    const response = await api.post('/videos/progress', {
        course_id: courseId,
        video_id: videoId,
        watch_time: watchTime,
    });
    return response.data;
};

export const getCourseProgress = async (courseId) => {
    const response = await api.get(`/videos/course/${courseId}/progress`);
    return response.data;
};

export default api;
