import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { login } from '../../api/authApi';
import { normalizeLoginResponse } from '../../utils/authResponse';
import { getEmailError, getPasswordError } from '../../utils/validation';
import { consumeSessionMessage } from '../../utils/authSessionMessage';
import './AuthPage.css';
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal';

export const Login = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [isFpOpen, setIsFpOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    const msg = consumeSessionMessage();
    if (msg) {
      setSessionMessage(msg);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: ''
    }));
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    const emailError = getEmailError(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = getPasswordError(formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const response = await login(formData.email, formData.password);
      const { accessToken, role } = normalizeLoginResponse(response);

      if (!accessToken) {
        setApiError('Login succeeded but no access token was returned.');
        return;
      }

      setToken(accessToken, role);

      // Route based on role
      if (role === 'Admin') {
        navigate('/admin/products', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      const msg = error?.message || error?.Message || 'Login failed. Please try again.';

      // Backend will return Unauthorized with message indicating unverified email.
      if (typeof msg === 'string' && msg.toLowerCase().includes('not verified')) {
        // Store email short-lived and navigate to verify flow
        try { sessionStorage.setItem('hotwatergas.verify.email', formData.email); } catch (e) {}
        navigate('/verify-email', { state: { email: formData.email }, replace: true });
        return;
      }

      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AuthLayout title="Login">
      {sessionMessage && (
        <div className="session-message-banner">
          {sessionMessage}
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        {apiError && <div className="error-banner">{apiError}</div>}

        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange}
          error={errors.email}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange}
          error={errors.password}
        />

        <div style={{ textAlign: 'right', marginTop: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setIsFpOpen(true)}
            className="forgot-password-link"
          >
            Forgot Password?
          </button>
        </div>

        <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </form>

      <div className="auth-footer">
        <p>
          Do not have an account? <Link to="/register" className="auth-link">Register here</Link>
        </p>
      </div>
      </AuthLayout>
      <ForgotPasswordModal
        isOpen={isFpOpen}
        onClose={() => setIsFpOpen(false)}
        onSuccess={() => setIsFpOpen(false)}
      />
    </>
  );
};
