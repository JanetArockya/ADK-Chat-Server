import React, { createContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';
import WebSocketService from '../services/websocket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

  // Load user on mount if token exists
  useEffect(() => {
    if (token && !user) {
      loadUser();
    }
  }, [token]);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authAPI.getMe();
      setUser(response.data);
      setError(null);
      // Connect WebSocket
      WebSocketService.connect(token);
    } catch (err) {
      setError(err.message);
      setToken(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const register = useCallback(async (email, username, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.register({ email, username, password });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      WebSocketService.connect(response.data.token);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAPI.login({ email, password });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      WebSocketService.connect(response.data.token);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      WebSocketService.disconnect();
    }
  }, []);

  const changePassword = useCallback(async (oldPassword, newPassword) => {
    try {
      setError(null);
      await authAPI.changePassword({ oldPassword, newPassword });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    try {
      setError(null);
      await authAPI.requestPasswordReset({ email });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const resetPassword = useCallback(async (token, newPassword) => {
    try {
      setError(null);
      await authAPI.resetPassword({ token, newPassword });
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      setError(null);
      await authAPI.deleteAccount();
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      WebSocketService.disconnect();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    register,
    login,
    logout,
    changePassword,
    requestPasswordReset,
    resetPassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
