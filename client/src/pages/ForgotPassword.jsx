import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useContext';
import { Button, Input, Toast } from '../components/Common';

export const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // email, confirm
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const { requestPasswordReset, resetPassword } = useAuth();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(email);
      setToast({ type: 'success', message: 'Reset link sent to your email' });
      setStep('confirm');
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to request reset' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!token) newErrors.token = 'Reset token is required';
    if (!newPassword) newErrors.newPassword = 'New password is required';
    else if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm password';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await resetPassword(token, newPassword);
      setToast({ type: 'success', message: 'Password reset successfully' });
      setTimeout(() => window.location.href = '/login', 2000);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Reset Password</h1>
          
          {step === 'email' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="your@email.com"
              />

              <Button type="submit" loading={loading} className="w-full">
                Send reset link
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter the reset token from your email and set a new password.
              </p>
              
              <Input
                label="Reset Token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                error={errors.token}
                placeholder="Token from email"
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={errors.newPassword}
                placeholder="••••••••"
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="••••••••"
              />

              <Button type="submit" loading={loading} className="w-full">
                Reset password
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-gray-300 pt-6 text-center">
            <Link to="/login" className="text-blue-600 hover:underline text-sm">
              Back to login
            </Link>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default ForgotPassword;
