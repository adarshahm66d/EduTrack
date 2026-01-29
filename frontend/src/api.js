import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

// Course Service API
export const getCourses = async () => {
    const response = await api.get('/courses');
    return response.data;
};

export const getCourse = async (courseId) => {
    const response = await api.get(`/courses/${courseId}`);
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

export default api;
