import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (data) => api.post('/api/auth/register', data),
};

// Dashboard endpoints
export const dashboardAPI = {
  getStats: () => api.get('/api/stats'),
};

// Alerts endpoints
export const alertsAPI = {
  getAlerts: (params) => api.get('/api/alerts', { params }),
  searchAlerts: (searchParams) => api.post('/api/alerts/search', searchParams),
  deleteAlerts: (deleteParams) => api.post('/api/alerts/delete', deleteParams),
  exportAlerts: (format = 'json') => api.get(`/api/alerts/export?format=${format}`),
};

export default api;
