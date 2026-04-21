import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ChatPage } from './pages/ChatPage';
import './styles/global.css';

// Protected Route Component
const ProtectedRoute = ({ element, isAuthenticated, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

// Public Route Component
const PublicRoute = ({ element, isAuthenticated }) => {
  return !isAuthenticated ? element : <Navigate to="/" replace />;
};

// App Routes Component
const AppRoutes = () => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, loading } = authContext || {};

  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={<PublicRoute element={<Login />} isAuthenticated={isAuthenticated} />}
      />
      <Route
        path="/register"
        element={<PublicRoute element={<Register />} isAuthenticated={isAuthenticated} />}
      />
      <Route
        path="/forgot-password"
        element={<PublicRoute element={<ForgotPassword />} isAuthenticated={isAuthenticated} />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute
            element={
              <ChatProvider>
                <ChatPage />
              </ChatProvider>
            }
            isAuthenticated={isAuthenticated}
            loading={loading}
          />
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
