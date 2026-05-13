import axios from 'axios';
import axiosClient from './axiosClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5140';

/** Raw axios instance for logout (no interceptors to avoid circular dependencies). */
const rawAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export const login = async (email, password) => {
  try {
    const response = await axiosClient.post('/api/auth/login', {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const register = async (email, password) => {
  try {
    const response = await axiosClient.post('/api/auth/register', {
      email,
      password
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const verifyEmail = async (email, code) => {
  try {
    const response = await axiosClient.post('/api/auth/verify-email', {
      email,
      code
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const resendVerification = async (email) => {
  try {
    const response = await axiosClient.post('/api/auth/resend-verification', {
      email
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await axiosClient.post('/api/auth/forgot-password/request', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const verifyPasswordResetCode = async (email, code) => {
  try {
    const response = await axiosClient.post('/api/auth/forgot-password/verify', { email, code });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const resetPassword = async (email, resetToken, newPassword) => {
  try {
    const response = await axiosClient.post('/api/auth/forgot-password/reset', { email, resetToken, newPassword });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const logout = async () => {
  try {
    await rawAxios.post('/api/auth/logout');
  } catch {
    // Logout must not throw – the local session is cleared regardless of the server response.
  }
};
