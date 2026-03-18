// ============================================================
// Axios Instance — API client with JWT interceptor
// ============================================================
import axios from 'axios';

const API = axios.create({
    baseURL: '/api',
    timeout: 30000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor: handle 401 (expired token)
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
