import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';
import { register } from '../../api/authApi';
import {
  getEmailError,
  getPasswordError,
  getConfirmPasswordError
} from '../../utils/validation';
import './AuthPage.css';

export const Register = () => {
  const navigate = useNavigate();
  const { setToken } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

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

    const confirmPasswordError = getConfirmPasswordError(
      formData.password,
      formData.confirmPassword
    );
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

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
      const response = await register(formData.email, formData.password);

      // Backend now requires email verification. Do not create an auth session.
      // Save the email in short-lived sessionStorage as a fallback for the verify page.
      try {
        sessionStorage.setItem('hotwatergas.verify.email', formData.email);
      } catch (e) {
        // ignore storage errors
      }

      // Navigate to verification page and pass email in location state
      navigate('/verify-email', { replace: true, state: { email: formData.email, message: response?.message } });
    } catch (error) {
      const msg = error?.message || error?.Message || 'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Register">
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

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
          error={errors.confirmPassword}
        />

        <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
          {isLoading ? 'Registering...' : 'Register'}
        </Button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account? <Link to="/login" className="auth-link">Login here</Link>
        </p>
      </div>
    </AuthLayout>
  );
};
