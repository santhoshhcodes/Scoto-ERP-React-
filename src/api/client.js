import axios from 'axios';
import { API_BASE_URL, BASE_IP_URL } from './endpoints';

/**
 * Axios HTTP Client for Scoto ERP API
 * Configured with base URL, headers, and interceptors for FastAPI backend
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

export const baseApi = axios.create({
  baseURL: BASE_IP_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach bearer auth token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('scoto_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified data unwrapping and error formatting
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMsg = 'An unexpected network error occurred.';

    if (error.response) {
      // Backend returned an error response
      const data = error.response.data;
      if (typeof data?.detail === 'string') {
        errorMsg = data.detail;
      } else if (Array.isArray(data?.detail)) {
        // FastAPI validation errors
        errorMsg = data.detail
          .map((d) => {
            const field = Array.isArray(d.loc)
              ? d.loc.filter((x) => x !== 'body').join('.')
              : '';
            return field ? `${field}: ${d.msg || d.message}` : (d.msg || d.message);
          })
          .join(', ');
      } else if (data?.message) {
        errorMsg = data.message;
      } else {
        errorMsg = `Server error (${error.response.status}): ${error.response.statusText}`;
      }
    } else if (error.request) {
      // Request made but no response received
      errorMsg = `Cannot connect to backend at ${API_BASE_URL}. Ensure the FastAPI server is running.`;
    } else if (error.message) {
      errorMsg = error.message;
    }

    console.error('[API Client Error]:', errorMsg, error);
    return Promise.reject(new Error(errorMsg));
  }
);

