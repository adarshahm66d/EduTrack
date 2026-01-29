import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const signup = async (userData) => {
    const response = await api.post('/signup', userData);
    return response.data;
};

export const login = async (credentials) => {
    const response = await api.post('/login', credentials);
    return response.data;
};

export const getCurrentUser = async (token) => {
    const response = await api.get('/users/me', {
        params: { token },
    });
    return response.data;
};

export default api;
